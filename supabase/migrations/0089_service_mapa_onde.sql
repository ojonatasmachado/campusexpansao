-- Mapa da igreja, etapa 2: "Onde" no app do membro (aba Agenda). Sede,
-- congregações e células são públicas para quem é da igreja: endereço,
-- horário, líder e vagas. Nada de pessoas aqui.

create or replace function service.mapa_locais_publicos(p_org uuid)
returns table (
  tipo text, id uuid, nome text, dia text, hora text,
  rua text, numero text, complemento text, bairro text, cidade text,
  latitude double precision, longitude double precision,
  lider_nome text, lider_member_id uuid, lugares integer, ocupados integer
)
language plpgsql stable security definer set search_path = service, public as $$
begin
  if not core.is_member_of(p_org) then raise exception 'sem_acesso'; end if;
  return query
    select case when c.is_headquarters then 'sede' else 'congregacao' end, c.id, c.name, null::text, null::text,
           c.address, c.street_number, c.complement, c.neighborhood, c.city,
           c.latitude, c.longitude, null::text, null::uuid, null::integer, null::integer
      from service.churches c
     where c.organization_id = p_org
  union all
    select 'grupo', g.id, g.name, g.weekday, g.time,
           g.street, g.street_number, g.complement, g.neighborhood, g.city,
           g.latitude, g.longitude,
           p.name,
           (select m.id from service.members m where m.organization_id = p_org and m.volunteer_id = g.leader_person_id order by m.created_at limit 1),
           g.capacity,
           (select count(*)::integer from service.members m where m.group_id = g.id)
      from service.fellowship_groups g
      left join service.people p on p.id = g.leader_person_id
     where g.organization_id = p_org;
end $$;
revoke all on function service.mapa_locais_publicos(uuid) from public, anon;
grant execute on function service.mapa_locais_publicos(uuid) to authenticated;
