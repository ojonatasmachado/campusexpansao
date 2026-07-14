-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0030 · SERVICE — MÉTRICAS DO PAINEL DE OPERAÇÃO (cadastros, status,
-- churn/conversão)
-- Aditiva: só cria uma função nova. Agregado em SQL (jsonb), 1 round-trip,
-- mesmo raciocínio de custo de core.service_org_summary (0028): nada de
-- puxar linha a linha pro client somar.
--
-- "Churn" aqui é sobre TRIAL, não cobrança recorrente (os planos do Service
-- ainda têm price_cents=0, ver 0007_seed_service.sql) — é a fração de trials
-- que terminou em 'active' (converteu) vs 'expired'/'canceled' (não
-- converteu), entre os que já chegaram a um desfecho. Quem ainda está
-- trialing não entra nessa conta (não tem desfecho ainda).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function core.service_metrics()
returns jsonb
language sql stable security definer set search_path = core, service, billing, public as $$
  with weeks as (
    select generate_series(
      date_trunc('week', now()) - interval '11 weeks',
      date_trunc('week', now()),
      interval '1 week'
    ) as week_start
  ),
  signups as (
    select date_trunc('week', o.created_at) as week_start, count(*) as signups
    from core.organizations o
    where o.kind = 'church'
    group by 1
  ),
  latest_sub as (
    select distinct on (s.organization_id) s.organization_id, s.status, s.current_period_end
    from billing.subscriptions s
    where s.product_code = 'service'
    order by s.organization_id, s.created_at desc
  ),
  buckets as (
    select
      o.id,
      case
        when ls.status = 'active' then 'pago'
        when ls.status in ('expired', 'canceled') then 'expirado'
        when ls.status = 'trialing' and ls.current_period_end < now() then 'expirado'
        when ls.status = 'trialing' and ls.current_period_end < now() + interval '7 days' then 'vencendo'
        when ls.status = 'trialing' then 'trial'
        else 'sem_assinatura'
      end as bucket
    from core.organizations o
    left join latest_sub ls on ls.organization_id = o.id
    where o.kind = 'church'
  ),
  status_counts as (
    select
      count(*) filter (where bucket = 'pago')           as pago,
      count(*) filter (where bucket = 'trial')           as trial,
      count(*) filter (where bucket = 'vencendo')        as vencendo,
      count(*) filter (where bucket = 'expirado')        as expirado,
      count(*) filter (where bucket = 'sem_assinatura')  as sem_assinatura
    from buckets
  ),
  churn as (
    select
      count(*) filter (where ls.status = 'active') as converted,
      count(*) filter (where ls.status in ('expired', 'canceled')) as expired
    from core.organizations o
    join latest_sub ls on ls.organization_id = o.id
    where o.kind = 'church'
  )
  select jsonb_build_object(
    'signups_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week_start', w.week_start, 'count', coalesce(s.signups, 0)) order by w.week_start), '[]'::jsonb)
      from weeks w
      left join signups s on s.week_start = w.week_start
    ),
    'status_breakdown', (
      select jsonb_build_object(
        'pago', sc.pago,
        'trial', sc.trial,
        'vencendo', sc.vencendo,
        'expirado', sc.expirado,
        'sem_assinatura', sc.sem_assinatura
      )
      from status_counts sc
    ),
    'churn', (
      select jsonb_build_object(
        'converted', c.converted,
        'expired', c.expired,
        'resolved', c.converted + c.expired,
        'conversion_rate', case when (c.converted + c.expired) > 0 then round(100.0 * c.converted / (c.converted + c.expired), 1) else null end,
        'churn_rate', case when (c.converted + c.expired) > 0 then round(100.0 * c.expired / (c.converted + c.expired), 1) else null end
      )
      from churn c
    )
  );
$$;

grant execute on function core.service_metrics() to service_role;
