-- CE.X Service · 0026 · CNPJ obrigatório no bootstrap + promoção das 500 primeiras
-- Função NOVA (bootstrap_church_org_v2), em vez de substituir a v1: o frontend
-- (BootstrapChurchForm.tsx) é atualizado para chamar a v2 no mesmo deploy, mas
-- como o deploy do site (Vercel) e desta migration não são atômicos entre si,
-- manter a v1 intacta evita que um onboarding em andamento quebre no meio da
-- janela de deploy. A v1 fica órfã, sem uso, e pode ser removida depois.
--
-- 1) service.churches.doc (CNPJ) passa a ser exigido e único no bootstrap: a
--    validação de existência/atividade do CNPJ acontece no app (BrasilAPI, ver
--    app/api/service/cnpj-lookup/route.ts) antes de chamar esta função; aqui é
--    só a garantia de banco (não nulo + sem duplicata).
-- 2) Sequência billing.church_signup_seq: as primeiras 500 organizações criadas
--    ganham 90 dias de trial; da 501ª em diante, 14 dias (padrão a ajustar
--    quando o Stripe entrar). Guardado em billing.subscriptions.current_period_end,
--    plano billing.plans('service_church') já semeado em 0007_seed_service.sql.

create sequence if not exists billing.church_signup_seq;

create or replace function core.bootstrap_church_org_v2(
  p_org_name    text,
  p_cnpj        text,
  p_email       text default null,
  p_phone       text default null,
  p_city        text default null,
  p_address     text default null,
  p_postal_code text default null,
  p_trial       boolean default true
)
returns table (organization_id uuid, church_id uuid)
language plpgsql security definer set search_path = core, service, billing, public as $$
declare
  v_user_id            uuid := auth.uid();
  v_created_org_id     uuid;
  v_created_church_id  uuid;
  v_cnpj_digits        text;
  v_signup_seq         bigint;
  v_trial_days         integer;
  v_plan_id            uuid;
begin
  if v_user_id is null then
    raise exception 'bootstrap_church_org: sem usuário autenticado';
  end if;

  v_cnpj_digits := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  if length(v_cnpj_digits) <> 14 then
    raise exception 'bootstrap_church_org: CNPJ é obrigatório e precisa ter 14 dígitos';
  end if;

  if exists (select 1 from service.churches where doc = v_cnpj_digits) then
    raise exception 'bootstrap_church_org: este CNPJ já está cadastrado em outra igreja';
  end if;

  insert into core.users (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into core.organizations (name, kind, owner_id)
  values (p_org_name, 'church', v_user_id)
  returning id into v_created_org_id;

  insert into core.memberships (user_id, organization_id, role, status)
  values (v_user_id, v_created_org_id, 'master', 'active');

  if p_trial then
    insert into core.product_access (organization_id, product_code, active, source)
    values (v_created_org_id, 'service', true, 'trial')
    on conflict on constraint product_access_organization_id_product_code_key
    do update set active = true, source = 'trial', updated_at = now();
  end if;

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'master', permissions.code, true
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'pastor', permissions.code, (permissions.code <> 'service.rede')
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'lider', permissions.code,
         permissions.code in (
           'service.painel',
           'service.voluntarios',
           'service.times',
           'service.decisoes',
           'service.escala',
           'service.cultos',
           'service.comunica'
         )
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'vol', permissions.code, false
  from core.permissions
  where permissions.product_code = 'service';

  insert into service.churches (organization_id, name, city, is_headquarters, doc, email, phone, address, postal_code)
  values (v_created_org_id, p_org_name, p_city, true, v_cnpj_digits, p_email, p_phone, p_address, p_postal_code)
  returning id into v_created_church_id;

  -- pessoa do master (mesma correção da 0025, mantida aqui porque a função foi
  -- substituída por inteiro nesta migration)
  insert into service.people (organization_id, church_id, user_id, name, email, status)
  select v_created_org_id, v_created_church_id, v_user_id,
         coalesce(u.full_name, split_part(u.email, '@', 1), 'Administrador'),
         u.email,
         'ativo'
  from core.users u
  where u.id = v_user_id;

  -- promoção: primeiras 500 organizações ganham 90 dias; demais, 14 dias
  v_signup_seq := nextval('billing.church_signup_seq');
  v_trial_days := case when v_signup_seq <= 500 then 90 else 14 end;

  select id into v_plan_id from billing.plans where code = 'service_church';

  if v_plan_id is not null then
    insert into billing.subscriptions (organization_id, plan_id, product_code, status, provider, provider_ref, current_period_end)
    values (
      v_created_org_id,
      v_plan_id,
      'service',
      'trialing',
      'manual',
      case when v_signup_seq <= 500 then 'promo_500' else 'trial_padrao' end,
      now() + (v_trial_days || ' days')::interval
    );
  end if;

  organization_id := v_created_org_id;
  church_id := v_created_church_id;
  return next;
end $$;

grant execute on function core.bootstrap_church_org_v2(text, text, text, text, text, text, text, boolean) to authenticated;
