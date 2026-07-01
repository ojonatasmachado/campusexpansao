-- CE.X Service · 0010 · Corrige ambiguidade no bootstrap de igreja
-- A assinatura permanece igual. A função só evita conflito entre colunas SQL e
-- os nomes dos campos retornados por RETURNS TABLE.

create or replace function core.bootstrap_church_org(
  p_org_name text,
  p_city text default null,
  p_trial boolean default true
)
returns table (organization_id uuid, church_id uuid)
language plpgsql security definer set search_path = core, service, billing, public as $$
declare
  v_user_id uuid := auth.uid();
  v_created_org_id uuid;
  v_created_church_id uuid;
begin
  if v_user_id is null then
    raise exception 'bootstrap_church_org: sem usuário autenticado';
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

  insert into service.churches (organization_id, name, city, is_headquarters)
  values (v_created_org_id, p_org_name, p_city, true)
  returning id into v_created_church_id;

  return query select v_created_org_id, v_created_church_id;
end $$;

grant execute on function core.bootstrap_church_org(text, text, boolean) to authenticated;
