-- Storage privado usa fin_can sem a policy base de tenant das tabelas.
-- A liberação individual só vale com vínculo e produto ativos, inclusive ali.
create or replace function service.fin_can(p_org uuid, p_write boolean default false)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.can_access(p_org, 'service') and (
    core.has_role(p_org, 'owner', 'master', 'pastor')
    or exists (
      select 1 from service.person_grants g
      join service.people p on p.id = g.person_id
      where g.organization_id = p_org
        and p.user_id = auth.uid()
        and g.grant_code = any(case when p_write then array['financeiro.lancar'] else array['financeiro.ver', 'financeiro.lancar'] end)
    )
  )
$$;
grant execute on function service.fin_can(uuid, boolean) to authenticated;
