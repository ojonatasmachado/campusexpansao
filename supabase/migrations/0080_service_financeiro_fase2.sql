-- CE.X Service · 0080 · Financeiro, fase 2
--
-- Contas fixas, campanhas com meta e fechamento do mês. Usa as colunas que a
-- fase 1 (0073) deixou prontas em fin_transactions: status 'previsto', due_on,
-- recurring_id, campaign_id e closing_id.
--
--   contas fixas   fin_recurring: o que se repete todo mês (aluguel, luz,
--                  repasse). fin_gerar_previstos cria os lançamentos "previstos"
--                  do mês, com vencimento; pagar é mudar o previsto para realizado.
--   campanhas      fin_campaigns: meta, fundo e prazo; a entrada aponta para a
--                  campanha e o progresso soma as entradas realizadas.
--   fechamento     fin_closings: retrato dos totais do mês. Mês fechado não aceita
--                  lançamento novo, edição nem exclusão (trava no banco); só dono,
--                  master e pastor reabrem.
-- Acesso igual ao da fase 1 (fin_can). Idempotente.

-- ── contas fixas ──────────────────────────────────────────────────────────────
create table if not exists service.fin_recurring (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid references service.churches(id) on delete set null,
  kind             text not null check (kind in ('entrada', 'despesa')),
  description      text not null check (length(trim(description)) between 1 and 140),
  amount_cents     bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  account_id       uuid not null,
  category_id      uuid not null,
  fund_id          uuid not null,
  method           text check (method in ('dinheiro', 'pix', 'cartao', 'transferencia', 'boleto')),
  supplier_name    text check (supplier_name is null or length(supplier_name) <= 120),
  day_of_month     smallint not null check (day_of_month between 1 and 31),
  starts_on        date not null default current_date,
  ends_on          date,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, account_id) references service.fin_accounts (organization_id, id),
  foreign key (organization_id, category_id) references service.fin_categories (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  check (ends_on is null or ends_on >= starts_on)
);
create index if not exists fin_recurring_org_idx on service.fin_recurring (organization_id, active);

-- ── campanhas ─────────────────────────────────────────────────────────────────
create table if not exists service.fin_campaigns (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid references service.churches(id) on delete set null,
  name             text not null check (length(trim(name)) between 1 and 80),
  description      text check (description is null or length(description) <= 500),
  goal_cents       bigint not null check (goal_cents > 0 and goal_cents <= 100000000000),
  fund_id          uuid,
  starts_on        date not null default current_date,
  ends_on          date,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  check (ends_on is null or ends_on >= starts_on)
);
create index if not exists fin_campaigns_org_idx on service.fin_campaigns (organization_id, active);

-- ── fechamento do mês ─────────────────────────────────────────────────────────
create table if not exists service.fin_closings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  month            text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  totals           jsonb not null default '{}',
  notes            text check (notes is null or length(notes) <= 1000),
  closed_by        uuid references service.people(id) on delete set null,
  closed_at        timestamptz not null default now(),
  reopened_by      uuid references service.people(id) on delete set null,
  reopened_at      timestamptz
);
-- um fechamento valendo por mês (reaberto fica como histórico)
create unique index if not exists fin_closings_mes on service.fin_closings (organization_id, month) where reopened_at is null;

-- ── ligações que a fase 1 deixou sem FK ────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fin_transactions_recurring_fk') then
    alter table service.fin_transactions add constraint fin_transactions_recurring_fk
      foreign key (recurring_id) references service.fin_recurring(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fin_transactions_campaign_fk') then
    alter table service.fin_transactions add constraint fin_transactions_campaign_fk
      foreign key (campaign_id) references service.fin_campaigns(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fin_transactions_closing_fk') then
    alter table service.fin_transactions add constraint fin_transactions_closing_fk
      foreign key (closing_id) references service.fin_closings(id) on delete set null;
  end if;
end $$;
-- um previsto por conta fixa e vencimento (gerar de novo não duplica)
create unique index if not exists fin_tx_previsto_unico on service.fin_transactions (recurring_id, due_on) where recurring_id is not null;
create index if not exists fin_tx_campaign_idx on service.fin_transactions (campaign_id) where campaign_id is not null;

-- ── RLS (mesmo contrato da fase 1) ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['fin_recurring', 'fin_campaigns', 'fin_closings'] loop
    execute format('alter table service.%I enable row level security', t);
    execute format('drop policy if exists svc_tenant on service.%I', t);
    execute format($f$create policy svc_tenant on service.%I for all to authenticated
      using (core.can_access(organization_id, 'service')) with check (core.can_access(organization_id, 'service'))$f$, t);
    execute format('drop policy if exists svc_r_scope on service.%I', t);
    execute format($f$create policy svc_r_scope on service.%I as restrictive for select to authenticated
      using (service.fin_can(organization_id, false))$f$, t);
    execute format('drop policy if exists svc_w_ins on service.%I', t);
    execute format('drop policy if exists svc_w_upd on service.%I', t);
    execute format('drop policy if exists svc_w_del on service.%I', t);
    if t = 'fin_closings' then
      -- fechamento só pelas funções abaixo (o retrato não se edita à mão)
      execute format($f$create policy svc_w_ins on service.%I as restrictive for insert to authenticated with check (false)$f$, t);
      execute format($f$create policy svc_w_upd on service.%I as restrictive for update to authenticated using (false)$f$, t);
      execute format($f$create policy svc_w_del on service.%I as restrictive for delete to authenticated using (false)$f$, t);
    else
      execute format($f$create policy svc_w_ins on service.%I as restrictive for insert to authenticated
        with check (service.fin_can(organization_id, true))$f$, t);
      execute format($f$create policy svc_w_upd on service.%I as restrictive for update to authenticated
        using (service.fin_can(organization_id, true)) with check (service.fin_can(organization_id, true))$f$, t);
      execute format($f$create policy svc_w_del on service.%I as restrictive for delete to authenticated
        using (service.fin_can(organization_id, true))$f$, t);
    end if;
    execute format('grant select, insert, update, delete on service.%I to authenticated', t);
    execute format('drop trigger if exists t_audit on service.%I', t);
    execute format($f$create trigger t_audit after insert or update or delete on service.%I
      for each row execute function audit.log_change('service')$f$, t);
  end loop;
end $$;

drop trigger if exists t_fin_recurring_upd on service.fin_recurring;
create trigger t_fin_recurring_upd before update on service.fin_recurring for each row execute function core.set_updated_at();
drop trigger if exists t_fin_campaigns_upd on service.fin_campaigns;
create trigger t_fin_campaigns_upd before update on service.fin_campaigns for each row execute function core.set_updated_at();

-- ── trava do mês fechado ──────────────────────────────────────────────────────
create or replace function service.fin_mes_fechado(p_org uuid, p_data date)
returns boolean
language sql stable security definer set search_path = service, public as $$
  select exists (select 1 from service.fin_closings c
                 where c.organization_id = p_org and c.reopened_at is null and c.month = to_char(p_data, 'YYYY-MM'))
$$;

create or replace function service.fin_tx_trava()
returns trigger language plpgsql security definer set search_path = service, public as $$
begin
  -- o próprio fechamento grava closing_id nos lançamentos do mês; chamadas do
  -- servidor (sem usuário: exclusão da igreja, rotinas) não passam pela trava
  if current_setting('svc.fin_fechando', true) = '1' or auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op in ('UPDATE', 'DELETE') and service.fin_mes_fechado(old.organization_id, old.occurred_on) then
    raise exception 'O mês de % está fechado. Peça para reabrir antes de mudar.', to_char(old.occurred_on, 'MM/YYYY') using errcode = '42501';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and service.fin_mes_fechado(new.organization_id, new.occurred_on) then
    raise exception 'O mês de % está fechado. Lance em outro mês ou peça para reabrir.', to_char(new.occurred_on, 'MM/YYYY') using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists t_fin_tx_trava on service.fin_transactions;
create trigger t_fin_tx_trava before insert or update or delete on service.fin_transactions
  for each row execute function service.fin_tx_trava();

-- ── previstos das contas fixas ────────────────────────────────────────────────
-- Cria, para o mês (YYYY-MM), um lançamento previsto por conta fixa ativa e
-- vigente. Dia 31 em mês curto vence no último dia. Gerar de novo não duplica.
create or replace function service.fin_gerar_previstos(p_org uuid, p_mes text)
returns integer
language plpgsql security definer set search_path = service, public as $$
declare
  v_ini date;
  v_fim date;
  v_n integer := 0;
  r service.fin_recurring;
  v_venc date;
  v_pessoa uuid;
begin
  if not service.fin_can(p_org, true) then return 0; end if;
  if p_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' then return 0; end if;
  v_ini := (p_mes || '-01')::date;
  v_fim := (v_ini + interval '1 month - 1 day')::date;
  if service.fin_mes_fechado(p_org, v_ini) then return 0; end if;
  select id into v_pessoa from service.people where user_id = auth.uid() and organization_id = p_org limit 1;
  for r in select * from service.fin_recurring
           where organization_id = p_org and active and starts_on <= v_fim and (ends_on is null or ends_on >= v_ini) loop
    v_venc := least(v_ini + (r.day_of_month - 1), v_fim);
    insert into service.fin_transactions (organization_id, church_id, kind, status, occurred_on, due_on, amount_cents,
      account_id, category_id, fund_id, method, description, supplier_name, recurring_id, created_by)
    values (p_org, r.church_id, r.kind, 'previsto', v_venc, v_venc, r.amount_cents,
      r.account_id, r.category_id, r.fund_id, r.method, r.description, r.supplier_name, r.id, v_pessoa)
    on conflict (recurring_id, due_on) where recurring_id is not null do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;
grant execute on function service.fin_gerar_previstos(uuid, text) to authenticated;

-- ── progresso das campanhas ──────────────────────────────────────────────────
create or replace function service.fin_campanhas_progresso(p_org uuid)
returns table (campaign_id uuid, arrecadado_cents bigint, lancamentos integer)
language sql stable security definer set search_path = service, public as $$
  select c.id,
         coalesce(sum(t.amount_cents) filter (where t.status = 'realizado' and t.kind = 'entrada'), 0)::bigint,
         count(t.id) filter (where t.status = 'realizado' and t.kind = 'entrada')::integer
  from service.fin_campaigns c
  left join service.fin_transactions t on t.campaign_id = c.id
  where c.organization_id = p_org and service.fin_can(p_org, false)
  group by c.id
$$;
grant execute on function service.fin_campanhas_progresso(uuid) to authenticated;

-- ── fechar e reabrir o mês ────────────────────────────────────────────────────
-- O retrato guarda: entradas e despesas por categoria, saldo de cada conta e de
-- cada fundo no último dia do mês, e quantos previstos ficaram em aberto.
create or replace function service.fin_fechar_mes(p_org uuid, p_mes text, p_notas text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_ini date;
  v_fim date;
  v_id uuid;
  v_pessoa uuid;
  v_totais jsonb;
begin
  if not service.fin_can(p_org, true) then return 'nao_pode'; end if;
  if p_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' then return 'mes_invalido'; end if;
  v_ini := (p_mes || '-01')::date;
  v_fim := (v_ini + interval '1 month - 1 day')::date;
  if v_ini > current_date then return 'mes_futuro'; end if;
  if service.fin_mes_fechado(p_org, v_ini) then return 'ja_fechado'; end if;
  select id into v_pessoa from service.people where user_id = auth.uid() and organization_id = p_org limit 1;

  v_totais := jsonb_build_object(
    'entradas_cents', coalesce((select sum(amount_cents) from fin_transactions where organization_id = p_org and status = 'realizado' and kind = 'entrada' and occurred_on between v_ini and v_fim), 0),
    'despesas_cents', coalesce((select sum(amount_cents) from fin_transactions where organization_id = p_org and status = 'realizado' and kind = 'despesa' and occurred_on between v_ini and v_fim), 0),
    'previstos_em_aberto', (select count(*) from fin_transactions where organization_id = p_org and status = 'previsto' and occurred_on between v_ini and v_fim),
    'por_categoria', coalesce((
      select jsonb_agg(jsonb_build_object('categoria', c.name, 'tipo', t.kind, 'total_cents', sum_t) order by t.kind, sum_t desc)
      from (select category_id, kind, sum(amount_cents) as sum_t from fin_transactions
            where organization_id = p_org and status = 'realizado' and kind <> 'transferencia' and occurred_on between v_ini and v_fim
            group by category_id, kind) t
      join fin_categories c on c.id = t.category_id), '[]'::jsonb),
    'saldo_contas', coalesce((
      select jsonb_agg(jsonb_build_object('conta', a.name, 'saldo_cents',
        a.opening_balance_cents
        + coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end) from fin_transactions t
                    where t.account_id = a.id and t.status = 'realizado' and t.occurred_on <= v_fim), 0)
        + coalesce((select sum(t.amount_cents) from fin_transactions t
                    where t.to_account_id = a.id and t.status = 'realizado' and t.occurred_on <= v_fim), 0)) order by a.sort_order, a.name)
      from fin_accounts a where a.organization_id = p_org), '[]'::jsonb),
    'saldo_fundos', coalesce((
      select jsonb_agg(jsonb_build_object('fundo', f.name, 'saldo_cents',
        coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end) from fin_transactions t
                  where t.fund_id = f.id and t.status = 'realizado' and t.kind <> 'transferencia' and t.occurred_on <= v_fim), 0)) order by f.sort_order, f.name)
      from fin_funds f where f.organization_id = p_org), '[]'::jsonb)
  );

  insert into fin_closings (organization_id, month, totals, notes, closed_by)
  values (p_org, p_mes, v_totais, nullif(trim(coalesce(p_notas, '')), ''), v_pessoa)
  returning id into v_id;

  perform set_config('svc.fin_fechando', '1', true);
  update fin_transactions set closing_id = v_id
   where organization_id = p_org and occurred_on between v_ini and v_fim;
  perform set_config('svc.fin_fechando', '', true);
  return 'ok';
end $$;
grant execute on function service.fin_fechar_mes(uuid, text, text) to authenticated;

create or replace function service.fin_reabrir_mes(p_org uuid, p_mes text)
returns text
language plpgsql security definer set search_path = core, service, public as $$
declare
  v_id uuid;
  v_pessoa uuid;
begin
  if not core.has_role(p_org, 'owner', 'master', 'pastor') then return 'nao_pode'; end if;
  select id into v_id from service.fin_closings where organization_id = p_org and month = p_mes and reopened_at is null;
  if v_id is null then return 'nao_fechado'; end if;
  select id into v_pessoa from service.people where user_id = auth.uid() and organization_id = p_org limit 1;
  update service.fin_closings set reopened_at = now(), reopened_by = v_pessoa where id = v_id;
  perform set_config('svc.fin_fechando', '1', true);
  update service.fin_transactions set closing_id = null where closing_id = v_id;
  perform set_config('svc.fin_fechando', '', true);
  return 'ok';
end $$;
grant execute on function service.fin_reabrir_mes(uuid, text) to authenticated;
