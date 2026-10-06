-- CE.X Service · 0053 · Destinatário em cadeia para pedidos do membro (v7 2.4 e 2.5)
--
-- O app procurava o líder do time na lista de membros que o próprio membro
-- consegue ler; pelas regras de leitura (0044) o membro não enxerga a ficha
-- do líder, então "Pedir troca" avisava "Não achamos o líder do time" e o
-- pedido de oração ficava sem destinatário. Estas funções resolvem no banco
-- quem recebe, em cadeia, e só devolvem quem tem login e ficha de membro
-- (para a conversa existir dos dois lados, service.start_dm de 0049).
--
-- Troca de escala: líder do time, depois a gestão da igreja (master, dono,
-- pastor). Não existe ainda "coordenação do ministério" no modelo de dados;
-- quando existir, entra entre os dois níveis.
-- Oração: quem lidera a intercessão (time com ícone/nome de intercessão ou
-- oração; sem líder, quem serve nele), depois a gestão.
-- Sem ninguém, a função não devolve linha e o app esconde a entrada.
--
-- service.swap_candidates: quem pode assumir a vaga (mesmo time, mesma
-- função, livre no horário e ainda não escalado no culto).
-- Idempotente.

create or replace function service.request_recipient(p_kind text, p_ministry uuid default null)
returns table (member_id uuid, name text, via text, ministry text)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_me uuid;
  v_org uuid;
  v_person uuid;
begin
  select m.id, m.organization_id, m.volunteer_id into v_me, v_org, v_person
  from service.members m
  where m.id = any(service.my_members())
  limit 1;
  if v_me is null then return; end if;

  if p_kind = 'troca' then
    return query
      select mb.id, mb.name, 'lider'::text, mi.name
      from service.person_ministries pm
      join service.ministries mi on mi.id = pm.ministry_id
      join service.people p on p.id = pm.person_id and p.user_id is not null
      join service.members mb on mb.volunteer_id = p.id and mb.organization_id = v_org
      where pm.organization_id = v_org and pm.is_leader and mb.id <> v_me
        and (case when p_ministry is not null then pm.ministry_id = p_ministry
                  else pm.ministry_id in (select x.ministry_id from service.person_ministries x where x.person_id = v_person) end)
      order by mb.name
      limit 1;
    if found then return; end if;
  elsif p_kind = 'oracao' then
    return query
      select mb.id, mb.name, 'intercessao'::text, mi.name
      from service.ministries mi
      join service.person_ministries pm on pm.ministry_id = mi.id
      join service.people p on p.id = pm.person_id and p.user_id is not null
      join service.members mb on mb.volunteer_id = p.id and mb.organization_id = v_org
      where mi.organization_id = v_org and mb.id <> v_me
        and (mi.icon in ('intercessao', 'oracao') or mi.name ~* '(interce|ora[cç][aã]o)')
      order by pm.is_leader desc, mb.name
      limit 1;
    if found then return; end if;
  else
    return;
  end if;

  -- gestão da igreja
  return query
    select mb.id, mb.name, 'gestao'::text, null::text
    from core.memberships ms
    join service.people p on p.user_id = ms.user_id and p.organization_id = ms.organization_id
    join service.members mb on mb.volunteer_id = p.id and mb.organization_id = ms.organization_id
    where ms.organization_id = v_org and ms.status = 'active' and ms.role in ('master', 'owner', 'pastor') and mb.id <> v_me
    order by array_position(array['master', 'owner', 'pastor'], ms.role), mb.name
    limit 1;
end $$;

revoke all on function service.request_recipient(text, uuid) from public;
grant execute on function service.request_recipient(text, uuid) to authenticated;

create or replace function service.swap_candidates(p_assignment uuid)
returns table (member_id uuid, name text)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_event uuid;
  v_position uuid;
  v_person uuid;
  v_ministry uuid;
  v_funcao text;
  v_slot text;
begin
  select r.organization_id, r.event_id, r.position_id, r.person_id into v_org, v_event, v_position, v_person
  from service.roster_assignments r
  where r.id = p_assignment and r.person_id in (select unnest(service.my_people()));
  if v_org is null then return; end if;

  select pos.ministry_id, pos.name into v_ministry, v_funcao from service.ministry_positions pos where pos.id = v_position;
  select e.slot into v_slot from service.events e where e.id = v_event;

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
      -- livre: não marcou que não pode nesse horário
      and coalesce(p.availability ->> coalesce(v_slot, ''), 'true') <> 'false'
      -- ainda não escalado neste culto
      and not exists (select 1 from service.roster_assignments o where o.event_id = v_event and o.person_id = p.id and o.status <> 'no')
    order by mb.name
    limit 5;
end $$;

revoke all on function service.swap_candidates(uuid) from public;
grant execute on function service.swap_candidates(uuid) to authenticated;
