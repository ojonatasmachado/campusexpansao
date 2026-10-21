-- ASCII menos 48, conforme manual técnico da Receita. Sem mudar papéis,
-- permissões, trial, assinatura nem a opção vigente de não informar CNPJ.
create or replace function service.cnpj_valido(p text)
returns boolean language plpgsql immutable as $$
declare d text := upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')); n integer; i integer; soma integer; peso integer; resto integer; dv integer;
begin
  if d !~ '^[A-Z0-9]{12}[0-9]{2}$' or d ~ '^(\d)\1{13}$' then return false; end if;
  for n in 12..13 loop
    soma := 0; peso := 2;
    for i in reverse n..1 loop
      soma := soma + (ascii(substr(d, i, 1)) - 48) * peso;
      peso := case when peso = 9 then 2 else peso + 1 end;
    end loop;
    resto := soma % 11; dv := case when resto < 2 then 0 else 11 - resto end;
    if substr(d, n + 1, 1)::integer <> dv then return false; end if;
  end loop;
  return true;
end $$;

CREATE OR REPLACE FUNCTION core.bootstrap_church_org_v2(p_org_name text, p_cnpj text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_trial boolean DEFAULT true)
 RETURNS TABLE(organization_id uuid, church_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'service', 'billing', 'public'
AS $function$
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

  v_cnpj_digits := nullif(upper(regexp_replace(coalesce(p_cnpj, ''), '[^A-Za-z0-9]', '', 'g')), '');

  if v_cnpj_digits is not null then
    if not service.cnpj_valido(v_cnpj_digits) then
      raise exception 'bootstrap_church_org: Confira os 14 caracteres e os dígitos verificadores do CNPJ (ou deixe em branco)';
    end if;

    if exists (select 1 from service.churches where upper(regexp_replace(coalesce(doc, ''), '[^A-Za-z0-9]', '', 'g')) = v_cnpj_digits) then
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
           'service.comunica',
           'service.kids',
           'service.reunioes',
           'service.ensaios',
           'service.quadros',
           'service.conversas'
         )
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'membro', permissions.code, false
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

  v_plan_id := (select id from billing.plans where code = 'service_church');

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
end $function$

;
