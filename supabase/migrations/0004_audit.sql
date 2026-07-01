-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0004 · SCHEMA audit
-- Logs, histórico de alterações e rastreabilidade. Uma tabela de log genérica +
-- trigger reutilizável que qualquer tabela de qualquer schema pode pendurar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── audit.activity_log ─────────────────────────────────────────────────────────
-- Log append-only. Guarda quem, o quê, onde, e o diff (antes/depois em jsonb).
-- organization_id fica desnormalizado para permitir RLS por tenant sem join.
create table audit.activity_log (
  id               bigint generated always as identity primary key,
  occurred_at      timestamptz not null default now(),
  actor_id         uuid references core.users(id) on delete set null,
  organization_id  uuid references core.organizations(id) on delete set null,
  product_code     text,                              -- 'service' | 'cex' | null (core/billing)
  schema_name      text not null,
  table_name       text not null,
  record_id        text,                              -- pk em texto (uuid/bigint/composto)
  action           text not null check (action in ('insert','update','delete')),
  before           jsonb,
  after            jsonb
);
comment on table audit.activity_log is 'Trilha append-only de alterações em qualquer schema. Diff antes/depois em jsonb.';

create index on audit.activity_log (organization_id, occurred_at desc);
create index on audit.activity_log (schema_name, table_name, record_id);
create index on audit.activity_log (actor_id, occurred_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER GENÉRICO DE AUDITORIA
-- Como usar numa tabela que tenha coluna organization_id:
--   create trigger t_audit after insert or update or delete on service.people
--     for each row execute function audit.log_change('service');
-- O 1º argumento é o product_code. A função descobre org_id/record_id sozinha.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function audit.log_change()
returns trigger language plpgsql security definer set search_path = audit, public as $$
declare
  v_product text := coalesce(tg_argv[0], null);
  v_org     uuid;
  v_rec     text;
  v_row     jsonb;
begin
  v_row := coalesce(to_jsonb(new), to_jsonb(old));

  -- organization_id desnormalizado quando a tabela tiver a coluna.
  if v_row ? 'organization_id' then
    v_org := (v_row ->> 'organization_id')::uuid;
  end if;

  -- record_id: usa 'id' se existir.
  if v_row ? 'id' then
    v_rec := v_row ->> 'id';
  end if;

  insert into audit.activity_log
    (actor_id, organization_id, product_code, schema_name, table_name, record_id, action, before, after)
  values (
    auth.uid(), v_org, v_product, tg_table_schema, tg_table_name, v_rec,
    lower(tg_op),
    case when tg_op in ('update','delete') then to_jsonb(old) else null end,
    case when tg_op in ('update','insert') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — o log é lido só por admins da própria org; escrita é sempre via trigger
-- (SECURITY DEFINER), nunca direta do cliente.
-- ═══════════════════════════════════════════════════════════════════════════
alter table audit.activity_log enable row level security;

create policy audit_read on audit.activity_log
  for select to authenticated
  using (
    organization_id in (select core.orgs_for_current_user())
    and core.has_role(organization_id, 'owner','master','pastor')
  );

-- Sem policy de INSERT/UPDATE/DELETE para authenticated: append-only vem só do trigger.
