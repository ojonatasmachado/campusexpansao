-- CE.X Service · 0050 · Permissões com os nomes do menu e o papel Voluntário
--
-- 1. Crianças (service.kids já existia), Reuniões, Ensaios, Quadros e
--    Conversas ganham linha própria na matriz de permissões. Começam
--    liberadas para master, pastor e líder (igual a hoje, quando não tinham
--    linha e ficavam visíveis para toda a liderança).
-- 2. Papel "voluntario" na matriz: quem serve num time. Começa sem nenhuma
--    tela do painel (só o app). Quando o master libera uma tela para o papel,
--    o voluntário passa a ler os dados dela, igual a uma liberação feita
--    pessoa a pessoa em "Acessos por pessoa".
-- Idempotente.

insert into core.permissions (code, product_code, label, category) values
  ('service.reunioes', 'service', 'Reuniões', 'Ministério'),
  ('service.ensaios', 'service', 'Ensaios', 'Ministério'),
  ('service.quadros', 'service', 'Quadros', 'Gestão'),
  ('service.conversas', 'service', 'Conversas', 'Comunicação')
on conflict (code) do nothing;

-- mantém o comportamento de hoje: liderança vê essas telas
insert into core.role_permissions (organization_id, role, permission_code, allowed)
select o.id, r.role, p.code, true
from core.organizations o
cross join (values ('master'), ('pastor'), ('lider')) as r(role)
cross join (values ('service.reunioes'), ('service.ensaios'), ('service.quadros'), ('service.conversas'), ('service.kids')) as p(code)
on conflict (organization_id, role, permission_code) do nothing;

-- leitura: liderança, liberação pessoa a pessoa, ou tela liberada ao papel
-- Voluntário para quem serve num time desta organização
create or replace function service.can_read(p_org uuid, p_grants text[])
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select service.is_lead(p_org)
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org
          and p.user_id = auth.uid()
          and g.grant_code = any(p_grants)
      )
      or (
        exists (
          select 1 from core.role_permissions rp
          where rp.organization_id = p_org
            and rp.role = 'voluntario'
            and rp.allowed
            -- "pessoas" (liberação) é "voluntarios" na matriz
            and replace(rp.permission_code, 'service.', '') = any(
              array(select case g when 'pessoas' then 'voluntarios' else g end from unnest(p_grants) g)
            )
        )
        and exists (
          select 1 from service.person_ministries pm
          join service.people p on p.id = pm.person_id
          where p.user_id = auth.uid() and p.organization_id = p_org
        )
      )
$$;
