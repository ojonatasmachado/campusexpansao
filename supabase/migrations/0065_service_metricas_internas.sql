-- Service v7 5.2 · Métricas internas (lei 11), calculadas no banco e lidas só
-- por dono e master. Tudo agregado: nenhuma métrica sobre uma pessoa.
--   semanas com participação: média de semanas com presença (check-in) por
--     pessoa que participou no período, sobre o total de semanas;
--   vagas cobertas 48h antes do culto: vagas pedidas pelas funções dos cultos
--     já passados que tinham alguém confirmado 48h antes do início;
--   minutos para fechar a escala: mediana, nos cultos com todas as vagas
--     preenchidas, entre a primeira e a última escalação;
--   visitantes contatados em 48h: visitantes do período com anotação de
--     contato até 48h depois da visita;
--   notificações desligadas: pessoas com acesso ao app sem nenhum aparelho
--     inscrito para receber aviso;
--   cartões: vistos, usados e dispensados (service.app_events, 0064).

create or replace function service.metricas_internas(p_org uuid, p_dias int default 90)
returns jsonb
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_ini date := (now() at time zone 'America/Sao_Paulo')::date - greatest(p_dias, 7) + 1;
  v_fim date := (now() at time zone 'America/Sao_Paulo')::date;
  v_semanas int := ceil(greatest(p_dias, 7) / 7.0);
  r jsonb;
begin
  if not core.has_role(p_org, 'owner', 'master') then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  with
  ev as (
    select e.id, e.event_date, e.ministries,
           ((e.event_date + coalesce(nullif(substring(e.time from '^\d{1,2}:\d{2}'), ''), '00:00')::time) at time zone 'America/Sao_Paulo') as inicio
    from service.events e
    where e.organization_id = p_org and e.event_date between v_ini and v_fim
  ),
  vagas as (
    select ev.id as event_id, ev.inicio, mp.id as position_id, greatest(mp.need_count, 1) as pede
    from ev
    join service.ministry_positions mp on mp.organization_id = p_org
    where cardinality(ev.ministries) = 0 or mp.ministry_id = any(ev.ministries)
  ),
  cobertura as (
    select v.event_id,
           sum(v.pede) as pedidas,
           sum(least(v.pede, (select count(*) from service.roster_assignments r
                              where r.event_id = v.event_id and r.position_id = v.position_id
                                and r.status = 'ok' and r.updated_at <= v.inicio - interval '48 hours'))) as cobertas,
           sum(least(v.pede, (select count(*) from service.roster_assignments r
                              where r.event_id = v.event_id and r.position_id = v.position_id and r.status <> 'no'))) as preenchidas
    from vagas v
    where v.inicio <= now()
    group by v.event_id
  ),
  fechamento as (
    select c.event_id,
           extract(epoch from (max(r.created_at) - min(r.created_at))) / 60 as minutos
    from cobertura c
    join service.roster_assignments r on r.event_id = c.event_id and r.status <> 'no'
    where c.pedidas > 0 and c.preenchidas >= c.pedidas
    group by c.event_id
  ),
  presenca as (
    select a.person_id, count(distinct date_trunc('week', e.event_date)) as semanas
    from service.event_attendance a
    join service.events e on e.id = a.event_id
    where a.organization_id = p_org and e.event_date between v_ini and v_fim
    group by a.person_id
  ),
  visit as (
    select v.id, (case when v.visited_on ~ '^\d{4}-\d{2}-\d{2}' then substring(v.visited_on from 1 for 10)::date else (v.created_at at time zone 'America/Sao_Paulo')::date end) as dia, v.created_at
    from service.visitors v
    where v.organization_id = p_org
      and (case when v.visited_on ~ '^\d{4}-\d{2}-\d{2}' then substring(v.visited_on from 1 for 10)::date else (v.created_at at time zone 'America/Sao_Paulo')::date end) between v_ini and v_fim
  ),
  app as (
    select p.id, exists (select 1 from service.push_subscriptions s where s.person_id = p.id) as com_push
    from service.people p
    where p.organization_id = p_org and p.user_id is not null
  ),
  cartoes as (
    select evento, count(*) as n from service.app_events
    where organization_id = p_org and created_at >= (v_ini::timestamp at time zone 'America/Sao_Paulo')
    group by evento
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('ini', v_ini, 'fim', v_fim, 'semanas', v_semanas),
    'participacao', jsonb_build_object(
      'pessoas', (select count(*) from presenca),
      'media_semanas', (select round(avg(semanas)::numeric, 1) from presenca)),
    'vagas48h', jsonb_build_object(
      'cultos', (select count(*) from cobertura where pedidas > 0),
      'pedidas', (select coalesce(sum(pedidas), 0) from cobertura),
      'cobertas', (select coalesce(sum(cobertas), 0) from cobertura)),
    'fechar_escala', jsonb_build_object(
      'cultos', (select count(*) from fechamento),
      'mediana_minutos', (select round(percentile_cont(0.5) within group (order by minutos)::numeric) from fechamento)),
    'visitantes48h', jsonb_build_object(
      'visitantes', (select count(*) from visit),
      'contatados', (select count(*) from visit
                     where exists (select 1 from service.visitor_notes n where n.visitor_id = visit.id
                                   and n.created_at <= (visit.dia::timestamp at time zone 'America/Sao_Paulo') + interval '48 hours'))),
    'notificacoes', jsonb_build_object(
      'com_app', (select count(*) from app),
      'sem_aviso', (select count(*) from app where not com_push)),
    'cartoes', coalesce((select jsonb_object_agg(evento, n) from cartoes), '{}'::jsonb)
  ) into r;
  return r;
end $$;
grant execute on function service.metricas_internas(uuid, int) to authenticated;
