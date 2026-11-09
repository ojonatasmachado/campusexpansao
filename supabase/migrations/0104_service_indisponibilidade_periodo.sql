-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0104 · E4 — INDISPONIBILIDADE POR PERÍODO E TIME
-- Atualiza swap_candidates() (0053) para respeitar as chaves novas de
-- people.availability: d:AAAA-MM-DD:periodo e d:AAAA-MM-DD:periodo:ministryId.
-- O período é derivado da hora do evento (<12 manhã, <18 tarde, >=18 noite).
-- Chaves antigas (d:AAAA-MM-DD, slot fixo) continuam valendo.
-- ═══════════════════════════════════════════════════════════════════════════

-- Recria também instalações locais com assinatura OUT divergente.
drop function if exists service.swap_candidates(uuid);

create function service.swap_candidates(p_assignment uuid)
returns table(member_id uuid, name text)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_event uuid;
  v_position uuid;
  v_person uuid;
  v_ministry uuid;
  v_funcao text;
  v_slot text;
  v_hora text;
  v_periodo text;
begin
  v_org := (select r.organization_id from service.roster_assignments r
            where r.id = p_assignment and r.person_id in (select unnest(service.my_people())));
  if v_org is null then return; end if;
  v_event := (select r.event_id from service.roster_assignments r where r.id = p_assignment);
  v_position := (select r.position_id from service.roster_assignments r where r.id = p_assignment);
  v_person := (select r.person_id from service.roster_assignments r where r.id = p_assignment);

  v_ministry := (select pos.ministry_id from service.ministry_positions pos where pos.id = v_position);
  v_funcao := (select pos.name from service.ministry_positions pos where pos.id = v_position);
  v_slot := (select e.slot from service.events e where e.id = v_event);
  v_hora := (select replace(e.time, 'h', ':') from service.events e where e.id = v_event);

  -- Deriva período da hora: antes de 12:00 → manha, antes de 18:00 → tarde, depois → noite
  if v_hora is not null and v_hora ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    if split_part(v_hora, ':', 1)::int < 12 then v_periodo := 'manha';
    elsif split_part(v_hora, ':', 1)::int < 18 then v_periodo := 'tarde';
    else v_periodo := 'noite';
    end if;
  end if;

  return query
    select mb.id, mb.name
    from service.person_ministries pm
    join service.people p on p.id = pm.person_id and p.user_id is not null
    join service.members mb on mb.volunteer_id = p.id and mb.organization_id = v_org
    where pm.ministry_id = v_ministry and pm.person_id <> v_person
      and coalesce(p.status, 'ativo') not in ('pausa', 'ferias')
      -- mesma função: marcada no time ou já escalada nela antes
      and (v_funcao = any(pm.functions)
           or exists (select 1 from service.roster_assignments h where h.person_id = p.id and h.position_id = v_position))
      -- livre: regras antigas (slot fixo e dia inteiro)
      and coalesce(p.availability ->> coalesce(v_slot, ''), 'true') <> 'false'
      and coalesce(p.availability ->> ('d:' || (select event_date::text from service.events where id = v_event)), 'true') <> 'false'
      -- livre: regras novas E4 (período e período+time)
      and (v_periodo is null or coalesce(p.availability ->> ('d:' || (select event_date::text from service.events where id = v_event) || ':' || v_periodo), 'true') <> 'false')
      and (v_periodo is null or v_ministry is null or coalesce(p.availability ->> ('d:' || (select event_date::text from service.events where id = v_event) || ':' || v_periodo || ':' || v_ministry::text), 'true') <> 'false')
      -- livre: dia inteiro por time
      and (v_ministry is null or coalesce(p.availability ->> ('d:' || (select event_date::text from service.events where id = v_event) || ':dia:' || v_ministry::text), 'true') <> 'false')
      -- ainda não escalado neste culto
      and not exists (select 1 from service.roster_assignments o where o.event_id = v_event and o.person_id = p.id and o.status <> 'no')
    order by mb.name
    limit 5;
end $$;

revoke all on function service.swap_candidates(uuid) from public;
grant execute on function service.swap_candidates(uuid) to authenticated;
