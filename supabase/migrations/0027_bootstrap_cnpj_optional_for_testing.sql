-- CE.X Service · 0027 · CNPJ volta a ser opcional (fase de teste controlado)
-- Pedido do usuário: nos testes atuais pode não existir uma igreja com CNPJ
-- ativo disponível. Mantém a validação de formato/unicidade QUANDO o CNPJ é
-- informado, mas não exige mais que venha preenchido. Reativar a exigência
-- (bastaria voltar o "if length <> 14 then raise exception") quando a
-- promoção das 500 igrejas for pra valer.

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

  v_cnpj_digits := nullif(regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g'), '');

  if v_cnpj_digits is not null then
    if length(v_cnpj_digits) <> 14 then
      raise exception 'bootstrap_church_org: CNPJ precisa ter 14 dígitos (ou deixe em branco)';
    end if;

    if exists (select 1 from service.churches where doc = v_cnpj_digits) then
      raise exception 'bootstrap_church_org: este CNPJ já está cadastrado em outra igreja';
    end if;
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

  insert into service.people (organization_id, church_id, user_id, name, email, status)
  select v_created_org_id, v_created_church_id, v_user_id,
         coalesce(u.full_name, split_part(u.email, '@', 1), 'Administrador'),
         u.email,
         'ativo'
  from core.users u
  where u.id = v_user_id;

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
