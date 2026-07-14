-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0028 · SERVICE — VENCIMENTO REAL DE TRIAL + BASE PRO PAINEL DE OPERAÇÃO
-- Aditiva: corrige um trigger existente (substitui a função, mesma tabela),
-- cria função + coluna novas, e tenta agendar um cron job. Nada existente é
-- removido.
--
-- Achado ao planejar o painel interno de controle das igrejas (owner do
-- CE.X): billing.sync_product_access() (0003_billing.sql) só reage a
-- status='active' (liga) ou status in ('canceled','expired') (desliga).
-- current_period_end é só uma data guardada — nada olhava pra ela. Resultado:
-- uma vez liberado, o acesso nunca vencia sozinho, e reativar um trial
-- (voltar status pra 'trialing' com data nova) também não reativava o
-- acesso, porque 'trialing' nunca foi tratado como status que liga.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) status='trialing' também liga o acesso, não só 'active' ──────────────
create or replace function billing.sync_product_access()
returns trigger language plpgsql security definer set search_path = core, billing, public as $$
begin
  if (new.status in ('active', 'trialing')) then
    insert into core.product_access (organization_id, product_code, active, source)
    values (
      new.organization_id,
      new.product_code,
      true,
      case when new.status = 'trialing' then 'trial' else 'billing' end
    )
    on conflict (organization_id, product_code)
      do update set
        active = true,
        source = case when new.status = 'trialing' then 'trial' else 'billing' end,
        updated_at = now();
  elsif (new.status in ('canceled', 'expired')) then
    update core.product_access
      set active = false, updated_at = now()
      where organization_id = new.organization_id and product_code = new.product_code;
  end if;
  return new;
end
$$;

-- ── 2) coluna livre pro motivo de uma extensão/presente manual ───────────────
alter table billing.subscriptions
  add column if not exists notes text;

-- ── 3) função que vence trial expirado (dispara o trigger acima sozinha) ─────
create or replace function billing.expire_trials()
returns void
language sql security definer set search_path = core, billing, public as $$
  update billing.subscriptions
  set status = 'expired'
  where status = 'trialing'
    and current_period_end is not null
    and current_period_end < now();
$$;
comment on function billing.expire_trials() is 'Vence subscriptions em trialing cujo current_period_end já passou. Rodar 1x/dia (ver agendamento abaixo).';

-- ── 4) agenda via pg_cron, com degradação graciosa ───────────────────────────
-- Em alguns projetos Supabase pg_cron precisa ser habilitado uma vez pela aba
-- Database > Extensions antes que "create extension" funcione aqui. Se isso
-- falhar, a migration não quebra (o resto acima já vale) — só avisa via
-- NOTICE, e o cron pode ser configurado manualmente depois.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron não pôde ser habilitado automaticamente (erro: %). Habilite pela aba Database > Extensions do painel Supabase e rode esta migration de novo, ou agende select billing.expire_trials() manualmente.', sqlerrm;
end
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'expire-service-trials';
    perform cron.schedule('expire-service-trials', '0 6 * * *', $sql$select billing.expire_trials()$sql$);
  else
    raise notice 'pg_cron indisponível: select billing.expire_trials() precisa ser agendado manualmente por ora.';
  end if;
end
$$;

-- ── 5) auditoria automática de qualquer extensão/presente/corte manual ───────
-- Mesmo trigger genérico de audit.log_change (0004_audit.sql), sem tabela
-- nova: toda mudança em billing.subscriptions (inclusive as feitas pelo
-- painel de operação) fica com diff antes/depois em audit.activity_log.
-- actor_id fica nulo quando a mudança vem do painel (roda via service-role,
-- fora de uma sessão Supabase Auth) — aceito por ora, um único operador.
create trigger t_audit after insert or update or delete on billing.subscriptions
  for each row execute function audit.log_change('service');

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÕES PRO PAINEL "OPERAÇÃO SERVICE" (app/(site)/admin)
-- billing não é schema exposto ao PostgREST (0003_billing.sql: "escrita é do
-- backend"), então o painel nunca lê/escreve billing.* direto pelo cliente
-- (nem com a service key) — passa sempre por RPC em core, como
-- core.bootstrap_church_org_v2 já faz pro caminho inverso (signup).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── resumo por organização: 1 round-trip, agregado em SQL (nada de puxar
-- linha a linha de service.people pro client contar). city/doc vêm da sede
-- (is_headquarters), não das filiais. login_count é core.memberships (quem
-- de fato tem conta pra logar), distinto de people_count (service.people
-- inclui cadastro sem login, ex.: responsável/criança do Kids) ─────────────
create or replace function core.service_org_summary()
returns table (
  organization_id    uuid,
  name               text,
  slug               citext,
  created_at         timestamptz,
  city               text,
  doc                text,
  church_count       bigint,
  people_count       bigint,
  login_count        bigint,
  sub_status         text,
  current_period_end timestamptz,
  provider_ref       text,
  notes              text
)
language sql stable security definer set search_path = core, service, billing, public as $$
  select
    o.id,
    o.name,
    o.slug,
    o.created_at,
    hq.city,
    hq.doc,
    coalesce(ch.church_count, 0),
    coalesce(pe.people_count, 0),
    coalesce(mb.login_count, 0),
    sub.status,
    sub.current_period_end,
    sub.provider_ref,
    sub.notes
  from core.organizations o
  left join lateral (
    select c.city, c.doc from service.churches c
    where c.organization_id = o.id and c.is_headquarters
    limit 1
  ) hq on true
  left join lateral (
    select count(*) as church_count from service.churches c where c.organization_id = o.id
  ) ch on true
  left join lateral (
    select count(*) as people_count from service.people p where p.organization_id = o.id
  ) pe on true
  left join lateral (
    select count(*) as login_count from core.memberships m where m.organization_id = o.id and m.status = 'active'
  ) mb on true
  left join lateral (
    select s.status, s.current_period_end, s.provider_ref, s.notes
    from billing.subscriptions s
    where s.organization_id = o.id and s.product_code = 'service'
    order by s.created_at desc
    limit 1
  ) sub on true
  where o.kind = 'church'
  order by o.created_at desc;
$$;

grant execute on function core.service_org_summary() to service_role;

-- ── histórico de extensões/presentes/cortes de uma organização, pro drawer
-- de detalhe do painel. audit.activity_log já grava organization_id
-- desnormalizado (0004_audit.sql), então não precisa de join com
-- billing.subscriptions pra filtrar por org ─────────────────────────────────
create or replace function core.service_org_history(p_organization_id uuid)
returns table (
  occurred_at timestamptz,
  action      text,
  before      jsonb,
  after       jsonb
)
language sql stable security definer set search_path = core, audit, public as $$
  select a.occurred_at, a.action, a.before, a.after
  from audit.activity_log a
  where a.organization_id = p_organization_id
    and a.schema_name = 'billing'
    and a.table_name = 'subscriptions'
  order by a.occurred_at desc
  limit 50;
$$;

grant execute on function core.service_org_history(uuid) to service_role;

-- ── estender/presentear: atualiza a subscription mais recente da org (ou cria
-- uma, se por algum motivo não existir) e volta status pra 'trialing' — o
-- trigger da seção 1 liga core.product_access sozinho ─────────────────────
create or replace function core.service_extend_trial(
  p_organization_id uuid,
  p_new_period_end  timestamptz,
  p_notes           text default null
)
returns void
language plpgsql security definer set search_path = core, service, billing, public as $$
declare
  v_sub_id  uuid;
  v_plan_id uuid;
begin
  select id into v_sub_id
  from billing.subscriptions
  where organization_id = p_organization_id and product_code = 'service'
  order by created_at desc
  limit 1;

  if v_sub_id is not null then
    update billing.subscriptions
    set status = 'trialing', current_period_end = p_new_period_end, notes = coalesce(p_notes, notes)
    where id = v_sub_id;
  else
    select id into v_plan_id from billing.plans where code = 'service_church';
    if v_plan_id is null then
      raise exception 'service_extend_trial: plano service_church não encontrado (ver 0007_seed_service.sql)';
    end if;
    insert into billing.subscriptions
      (organization_id, plan_id, product_code, status, provider, provider_ref, current_period_end, notes)
    values
      (p_organization_id, v_plan_id, 'service', 'trialing', 'manual', 'manual_grant', p_new_period_end, p_notes);
  end if;
end
$$;

grant execute on function core.service_extend_trial(uuid, timestamptz, text) to service_role;

-- ── encerrar acesso agora (ex.: abuso, cancelamento fora do fluxo normal) ────
create or replace function core.service_expire_org_now(p_organization_id uuid)
returns void
language sql security definer set search_path = core, service, billing, public as $$
  update billing.subscriptions
  set status = 'expired'
  where organization_id = p_organization_id and product_code = 'service';
$$;

grant execute on function core.service_expire_org_now(uuid) to service_role;
