-- CE.X Service · 0112 · Financeiro, fase 4 (importar extrato)
--
-- Lote de importação (.ofx e .csv nesta fatia; .pdf fica para depois, exige
-- biblioteca nova de leitura de PDF, decisão do usuário). Os lançamentos
-- importados usam as colunas já previstas na 0073: import_batch_id (agora com
-- FK) e external_id (já com índice único por conta, criado na 0073 — é ele
-- quem impede importar o mesmo lançamento duas vezes).
--
-- Aditiva e idempotente. Não aplicar em produção sem revisão.

create table if not exists service.fin_import_batches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  account_id       uuid not null,
  format           text not null check (format in ('ofx', 'csv')),
  file_name        text not null check (length(trim(file_name)) between 1 and 200),
  total_rows       int not null default 0,
  imported_rows    int not null default 0,
  created_by       uuid references service.people(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, account_id) references service.fin_accounts (organization_id, id)
);
comment on table service.fin_import_batches is 'Financeiro fase 4: um lote por arquivo importado (.ofx ou .csv). imported_rows pode ser menor que total_rows quando linhas batem com lançamento já importado (external_id duplicado, ignoradas).';
create index if not exists fin_import_batches_conta_idx on service.fin_import_batches (account_id);

-- a 0073 já criou a coluna import_batch_id em fin_transactions, sem FK ("a migração
-- da fase cria a tabela e a FK"); a FK entra agora que a tabela existe.
-- "set null (import_batch_id)" só anula essa coluna; sem o column_list o Postgres
-- tentaria anular organization_id também, o que violaria o not null da tabela.
alter table service.fin_transactions drop constraint if exists fin_tx_import_batch_fk;
alter table service.fin_transactions
  add constraint fin_tx_import_batch_fk foreign key (organization_id, import_batch_id)
  references service.fin_import_batches (organization_id, id) on delete set null (import_batch_id);

-- ── RLS: mesmo padrão das demais tabelas do financeiro (0073) ───────────────
alter table service.fin_import_batches enable row level security;
drop policy if exists svc_tenant on service.fin_import_batches;
create policy svc_tenant on service.fin_import_batches for all to authenticated
  using (core.can_access(organization_id, 'service')) with check (core.can_access(organization_id, 'service'));
drop policy if exists svc_r_scope on service.fin_import_batches;
create policy svc_r_scope on service.fin_import_batches as restrictive for select to authenticated
  using (service.fin_can(organization_id, false));
drop policy if exists svc_w_ins on service.fin_import_batches;
create policy svc_w_ins on service.fin_import_batches as restrictive for insert to authenticated
  with check (service.fin_can(organization_id, true));
drop policy if exists svc_w_upd on service.fin_import_batches;
create policy svc_w_upd on service.fin_import_batches as restrictive for update to authenticated
  using (service.fin_can(organization_id, true)) with check (service.fin_can(organization_id, true));
drop policy if exists svc_w_del on service.fin_import_batches;
create policy svc_w_del on service.fin_import_batches as restrictive for delete to authenticated
  using (service.fin_can(organization_id, true));
grant select, insert, update, delete on service.fin_import_batches to authenticated;
drop trigger if exists t_audit on service.fin_import_batches;
create trigger t_audit after insert or update or delete on service.fin_import_batches
  for each row execute function audit.log_change('service');

-- ── grava o lote inteiro de uma vez (lote + lançamentos), ignorando o que já
-- foi importado antes (external_id repetido na mesma conta); devolve o id do
-- lote e quantas linhas realmente entraram, pra tela não inventar um número ──
create or replace function service.fin_importar_lote(
  p_org uuid, p_church uuid, p_conta uuid, p_formato text, p_arquivo text,
  -- cada linha já vem com categoria e fundo escolhidos na tela de revisão (o lançamento
  -- exige os dois, igual a qualquer lançamento manual: check de service.fin_transactions)
  p_linhas jsonb -- [{external_id, data, valor_cents, descricao, kind, category_id, fund_id}]
) returns table (batch_id uuid, imported_rows int)
language plpgsql security definer set search_path = service, public as $$
declare
  v_lote uuid;
  v_total int;
  v_gravados int;
  v_quem uuid;
begin
  if not service.fin_can(p_org, true) then raise exception 'sem_permissao'; end if;
  if not exists (select 1 from service.fin_accounts a where a.id = p_conta and a.organization_id = p_org) then
    raise exception 'conta_invalida';
  end if;
  if p_church is not null and not exists (select 1 from service.churches c where c.id = p_church and c.organization_id = p_org) then
    raise exception 'igreja_invalida';
  end if;
  v_total := jsonb_array_length(p_linhas);
  if v_total = 0 or v_total > 5000 then raise exception 'linhas_invalidas'; end if;
  -- toda linha com category_id precisa de uma categoria da própria organização, do mesmo
  -- kind da linha (entrada com categoria de despesa, ou de outra igreja, não é um erro de
  -- digitação qualquer: a função não confia só no que a tela já filtra).
  if exists (
    select 1 from jsonb_array_elements(p_linhas) as l
    where (l->>'category_id') is not null and not exists (
      select 1 from service.fin_categories c
      where c.id = (l->>'category_id')::uuid and c.organization_id = p_org and c.kind = (l->>'kind')
    )
  ) then raise exception 'categoria_invalida'; end if;

  v_quem := (select p.id from service.people p where p.id = any(service.my_people()) and p.organization_id = p_org order by p.id limit 1);

  insert into service.fin_import_batches (organization_id, account_id, format, file_name, total_rows, created_by)
  values (p_org, p_conta, p_formato, p_arquivo, v_total, v_quem)
  returning id into v_lote;

  insert into service.fin_transactions
    (organization_id, church_id, kind, occurred_on, amount_cents, account_id, category_id, fund_id, description, external_id, import_batch_id, created_by)
  select p_org, p_church,
    (l->>'kind')::text, (l->>'data')::date, (l->>'valor_cents')::bigint, p_conta,
    (l->>'category_id')::uuid, (l->>'fund_id')::uuid,
    left(coalesce(nullif(trim(l->>'descricao'), ''), 'Importado'), 140), l->>'external_id', v_lote, v_quem
  from jsonb_array_elements(p_linhas) as l
  where (l->>'kind') in ('entrada', 'despesa') and (l->>'valor_cents')::bigint > 0
    and (l->>'category_id') is not null and (l->>'fund_id') is not null
  on conflict (account_id, external_id) where external_id is not null do nothing;

  get diagnostics v_gravados = row_count;
  update service.fin_import_batches set imported_rows = v_gravados where id = v_lote;
  return query select v_lote, v_gravados;
end $$;
grant execute on function service.fin_importar_lote(uuid, uuid, uuid, text, text, jsonb) to authenticated;
