-- CE.X Service · 0111 · Financeiro, fase 3 (orçamento por ministério)
--
-- Orçamento por categoria de despesa (cada categoria representa um ministério
-- ou área da igreja: Kids, Equipamentos, Missões e repasses...), num período
-- livre (mês, semestre, ano ou período customizado; por isso period_start/
-- period_end em vez de um enum, como o comentário da 0073 já previa:
-- "orçamento: tabela própria por categoria e mês, só lê daqui").
--
-- O realizado vem de fin_transactions, calculado por service.fin_orcamento;
-- sem FK nova em fin_transactions, sem retrabalho nas fases anteriores.
--
-- Aditiva e idempotente. Não aplicar em produção sem revisão.

create table if not exists service.fin_budgets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  category_id      uuid not null,
  period_start     date not null,
  period_end       date not null,
  amount_cents     bigint not null check (amount_cents >= 0 and amount_cents <= 100000000000),
  notes            text check (notes is null or length(notes) <= 280),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, category_id, period_start, period_end),
  foreign key (organization_id, category_id) references service.fin_categories (organization_id, id),
  check (period_end >= period_start)
);
comment on table service.fin_budgets is 'Financeiro fase 3: orçamento por categoria de despesa, num período (mês, semestre, ano ou livre). O realizado vem de fin_transactions, via service.fin_orcamento.';
create index if not exists fin_budgets_periodo_idx on service.fin_budgets (organization_id, period_start, period_end);
create index if not exists fin_budgets_categoria_idx on service.fin_budgets (category_id);

drop trigger if exists t_fin_budgets_upd on service.fin_budgets;
create trigger t_fin_budgets_upd before update on service.fin_budgets
  for each row execute function core.set_updated_at();

-- categoria do orçamento tem que ser de despesa (orçamento é plano de gasto, não de entrada)
create or replace function service.fin_budgets_check()
returns trigger language plpgsql set search_path = service, public as $$
begin
  if not exists (select 1 from service.fin_categories c where c.id = new.category_id and c.organization_id = new.organization_id and c.kind = 'despesa') then
    raise exception 'categoria_invalida';
  end if;
  return new;
end $$;
drop trigger if exists t_fin_budgets_check on service.fin_budgets;
create trigger t_fin_budgets_check before insert or update on service.fin_budgets
  for each row execute function service.fin_budgets_check();

-- ── RLS: mesmo padrão das demais tabelas do financeiro (0073) ───────────────
alter table service.fin_budgets enable row level security;
drop policy if exists svc_tenant on service.fin_budgets;
create policy svc_tenant on service.fin_budgets for all to authenticated
  using (core.can_access(organization_id, 'service')) with check (core.can_access(organization_id, 'service'));
drop policy if exists svc_r_scope on service.fin_budgets;
create policy svc_r_scope on service.fin_budgets as restrictive for select to authenticated
  using (service.fin_can(organization_id, false));
drop policy if exists svc_w_ins on service.fin_budgets;
create policy svc_w_ins on service.fin_budgets as restrictive for insert to authenticated
  with check (service.fin_can(organization_id, true));
drop policy if exists svc_w_upd on service.fin_budgets;
create policy svc_w_upd on service.fin_budgets as restrictive for update to authenticated
  using (service.fin_can(organization_id, true)) with check (service.fin_can(organization_id, true));
drop policy if exists svc_w_del on service.fin_budgets;
create policy svc_w_del on service.fin_budgets as restrictive for delete to authenticated
  using (service.fin_can(organization_id, true));
grant select, insert, update, delete on service.fin_budgets to authenticated;
drop trigger if exists t_audit on service.fin_budgets;
create trigger t_audit after insert or update or delete on service.fin_budgets
  for each row execute function audit.log_change('service');

-- ── orçado x realizado, por categoria, num período exato ────────────────────
-- devolve toda categoria de despesa ativa (ou, se já tem orçamento no período,
-- mesmo desativada depois: arquivar a categoria não pode esconder um orçamento
-- que já existe, sem jeito de ver ou excluir), com orçamento (id/amount_cents/
-- notes preenchidos) ou sem (null), sempre com o realizado do período.
create or replace function service.fin_orcamento(p_org uuid, p_inicio date, p_fim date)
returns table (category_id uuid, budget_id uuid, amount_cents bigint, notes text, realizado_cents bigint)
language sql stable security definer set search_path = service, public as $$
  select c.id, b.id, b.amount_cents, b.notes,
    coalesce((
      select sum(t.amount_cents) from service.fin_transactions t
      where t.category_id = c.id and t.organization_id = p_org
        and t.kind = 'despesa' and t.status = 'realizado' and t.occurred_on between p_inicio and p_fim
    ), 0)
  from service.fin_categories c
  left join service.fin_budgets b
    on b.organization_id = p_org and b.category_id = c.id and b.period_start = p_inicio and b.period_end = p_fim
  where c.organization_id = p_org and c.kind = 'despesa' and (c.active or b.id is not null) and service.fin_can(p_org, false)
  order by c.sort_order, c.name
$$;
grant execute on function service.fin_orcamento(uuid, date, date) to authenticated;
