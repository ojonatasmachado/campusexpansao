-- CE.X Service · 0073 · Financeiro, fase 1
--
-- Contas (caixa, banco), categorias de entrada e de despesa, fundos (geral e
-- designados), lançamentos (entrada, despesa, transferência entre contas) e
-- contagem de oferta do culto (quem contou e quem conferiu, duas pessoas).
--
-- Quem acessa: dono, master e pastor sempre. Qualquer outra pessoa só com
-- liberação pessoa a pessoa (service.person_grants):
--   financeiro.ver     lê tudo do financeiro
--   financeiro.lancar  lê e lança (contas, categorias, fundos, lançamentos)
-- Líder e voluntário NÃO entram pelo papel: dízimo individual é dado
-- sensível (lei 10). Só dono, master e pastor dão essas liberações.
--
-- Valores sempre em centavos (bigint), nunca numeric/float.
--
-- Pronto para as fases seguintes sem retrabalho (colunas já existem, nulas):
--   contas fixas / contas a pagar  status 'previsto', due_on, recurring_id
--   campanhas                      campaign_id
--   fechamento do mês              reconciled_at, closing_id
--   importar extrato               import_batch_id, external_id (único por conta)
--   orçamento                      tabela própria por categoria e mês, só lê daqui
--
-- Aditiva e idempotente. Não aplicar em produção sem revisão.

-- ── permissão ───────────────────────────────────────────────────────────────
create or replace function service.fin_can(p_org uuid, p_write boolean default false)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor')
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org
          and p.user_id = auth.uid()
          and g.grant_code = any(case when p_write then array['financeiro.lancar'] else array['financeiro.ver', 'financeiro.lancar'] end)
      )
$$;
grant execute on function service.fin_can(uuid, boolean) to authenticated;

-- só dono, master e pastor dão ou tiram liberação do financeiro
drop policy if exists pg_fin_ins on service.person_grants;
create policy pg_fin_ins on service.person_grants as restrictive for insert to authenticated
  with check (grant_code not like 'financeiro.%' or core.has_role(organization_id, 'owner', 'master', 'pastor'));
drop policy if exists pg_fin_del on service.person_grants;
create policy pg_fin_del on service.person_grants as restrictive for delete to authenticated
  using (grant_code not like 'financeiro.%' or core.has_role(organization_id, 'owner', 'master', 'pastor'));

-- ── tabelas ─────────────────────────────────────────────────────────────────
create table if not exists service.fin_accounts (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references core.organizations(id) on delete cascade,
  church_id              uuid references service.churches(id) on delete set null,
  name                   text not null check (length(trim(name)) between 1 and 60),
  kind                   text not null default 'banco' check (kind in ('caixa', 'banco')),
  institution            text,
  opening_balance_cents  bigint not null default 0,
  opening_date           date,
  active                 boolean not null default true,
  sort_order             int not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id, id)
);
comment on table service.fin_accounts is 'Financeiro: onde o dinheiro está (caixa em espécie, conta no banco). Saldo = abertura + lançamentos realizados.';

create table if not exists service.fin_categories (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  kind             text not null check (kind in ('entrada', 'despesa')),
  name             text not null check (length(trim(name)) between 1 and 60),
  -- código fixo das categorias iniciais (dizimo, oferta...), para relatório e oferta
  system_code      text,
  parent_id        uuid references service.fin_categories(id) on delete set null,
  active           boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  unique (organization_id, id)
);
comment on table service.fin_categories is 'Financeiro: categorias de entrada e de despesa. parent_id deixa subcategoria pronta.';
create unique index if not exists fin_categories_code_idx on service.fin_categories (organization_id, system_code) where system_code is not null;

create table if not exists service.fin_funds (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 60),
  description      text,
  -- designado: dinheiro que só pode ir para o fim dele (missões, construção)
  designated       boolean not null default false,
  is_default       boolean not null default false,
  active           boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  unique (organization_id, id)
);
comment on table service.fin_funds is 'Financeiro: fundos. Um geral (is_default) e os designados.';
create unique index if not exists fin_funds_default_idx on service.fin_funds (organization_id) where is_default;

create table if not exists service.fin_offering_counts (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references core.organizations(id) on delete cascade,
  church_id           uuid references service.churches(id) on delete set null,
  event_id            uuid references service.events(id) on delete set null,
  counted_on          date not null,
  fund_id             uuid not null,
  category_id         uuid not null,
  cash_cents          bigint not null default 0 check (cash_cents >= 0),
  pix_cents           bigint not null default 0 check (pix_cents >= 0),
  card_cents          bigint not null default 0 check (card_cents >= 0),
  counted_by          uuid references service.members(id) on delete set null,
  counted_by_name     text not null,
  verified_by         uuid references service.members(id) on delete set null,
  verified_by_name    text not null,
  note                text,
  created_by          uuid references service.people(id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  foreign key (organization_id, category_id) references service.fin_categories (organization_id, id),
  check (counted_by is null or verified_by is null or counted_by <> verified_by),
  check (cash_cents + pix_cents + card_cents > 0)
);
comment on table service.fin_offering_counts is 'Financeiro: contagem da oferta do culto. Duas pessoas diferentes; cada forma vira um lançamento.';

create table if not exists service.fin_transactions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references core.organizations(id) on delete cascade,
  church_id              uuid references service.churches(id) on delete set null,
  kind                   text not null check (kind in ('entrada', 'despesa', 'transferencia')),
  status                 text not null default 'realizado' check (status in ('realizado', 'previsto')),
  occurred_on            date not null,
  due_on                 date,
  amount_cents           bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  account_id             uuid not null,
  to_account_id          uuid,
  category_id            uuid,
  fund_id                uuid,
  method                 text check (method in ('dinheiro', 'pix', 'cartao', 'transferencia', 'boleto')),
  description            text not null check (length(trim(description)) between 1 and 140),
  contributor_member_id  uuid references service.members(id) on delete set null,
  supplier_name          text check (supplier_name is null or length(supplier_name) <= 120),
  attachment_path        text,
  offering_count_id      uuid references service.fin_offering_counts(id) on delete cascade,
  -- fases seguintes (sem FK por enquanto; a migração da fase cria a tabela e a FK)
  recurring_id           uuid,
  campaign_id            uuid,
  import_batch_id        uuid,
  external_id            text,
  reconciled_at          timestamptz,
  closing_id             uuid,
  created_by             uuid references service.people(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  foreign key (organization_id, account_id) references service.fin_accounts (organization_id, id),
  foreign key (organization_id, to_account_id) references service.fin_accounts (organization_id, id),
  foreign key (organization_id, category_id) references service.fin_categories (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  check (
    (kind = 'transferencia' and to_account_id is not null and to_account_id <> account_id and category_id is null and contributor_member_id is null)
    or (kind <> 'transferencia' and to_account_id is null and category_id is not null and fund_id is not null)
  ),
  check (kind = 'entrada' or contributor_member_id is null)
);
comment on table service.fin_transactions is 'Financeiro: lançamentos em centavos. Transferência é uma linha só (de account_id para to_account_id).';
create index if not exists fin_tx_org_date_idx on service.fin_transactions (organization_id, occurred_on desc);
create index if not exists fin_tx_account_idx on service.fin_transactions (account_id);
create index if not exists fin_tx_to_account_idx on service.fin_transactions (to_account_id) where to_account_id is not null;
create index if not exists fin_tx_contributor_idx on service.fin_transactions (contributor_member_id) where contributor_member_id is not null;
create unique index if not exists fin_tx_external_idx on service.fin_transactions (account_id, external_id) where external_id is not null;

-- contribuinte da mesma igreja
create or replace function service.fin_tx_check()
returns trigger language plpgsql set search_path = service, public as $$
begin
  if new.contributor_member_id is not null and not exists (
    select 1 from service.members m where m.id = new.contributor_member_id and m.organization_id = new.organization_id
  ) then
    raise exception 'contribuinte de outra igreja';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists t_fin_tx_check on service.fin_transactions;
create trigger t_fin_tx_check before insert or update on service.fin_transactions
  for each row execute function service.fin_tx_check();

drop trigger if exists t_fin_accounts_upd on service.fin_accounts;
create trigger t_fin_accounts_upd before update on service.fin_accounts
  for each row execute function core.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['fin_accounts', 'fin_categories', 'fin_funds', 'fin_offering_counts', 'fin_transactions'] loop
    execute format('alter table service.%I enable row level security', t);
    execute format('drop policy if exists svc_tenant on service.%I', t);
    execute format($f$create policy svc_tenant on service.%I for all to authenticated
      using (core.can_access(organization_id, 'service')) with check (core.can_access(organization_id, 'service'))$f$, t);
    execute format('drop policy if exists svc_r_scope on service.%I', t);
    execute format($f$create policy svc_r_scope on service.%I as restrictive for select to authenticated
      using (service.fin_can(organization_id, false))$f$, t);
    execute format('drop policy if exists svc_w_ins on service.%I', t);
    execute format($f$create policy svc_w_ins on service.%I as restrictive for insert to authenticated
      with check (service.fin_can(organization_id, true))$f$, t);
    execute format('drop policy if exists svc_w_upd on service.%I', t);
    execute format($f$create policy svc_w_upd on service.%I as restrictive for update to authenticated
      using (service.fin_can(organization_id, true)) with check (service.fin_can(organization_id, true))$f$, t);
    execute format('drop policy if exists svc_w_del on service.%I', t);
    execute format($f$create policy svc_w_del on service.%I as restrictive for delete to authenticated
      using (service.fin_can(organization_id, true))$f$, t);
    execute format('grant select, insert, update, delete on service.%I to authenticated', t);
    -- auditoria: toda alteração vai para audit.activity_log (dono, master e pastor leem)
    execute format('drop trigger if exists t_audit on service.%I', t);
    execute format($f$create trigger t_audit after insert or update or delete on service.%I
      for each row execute function audit.log_change('service')$f$, t);
  end loop;
end $$;

-- ── conjunto inicial (na primeira vez que alguém com acesso abre a tela) ────
create or replace function service.fin_preparar(p_org uuid)
returns void
language plpgsql security definer set search_path = service, public as $$
begin
  if not service.fin_can(p_org, false) then return; end if;
  if not exists (select 1 from service.fin_categories where organization_id = p_org) then
    insert into service.fin_categories (organization_id, kind, name, system_code, sort_order) values
      (p_org, 'entrada', 'Dízimos', 'dizimo', 1),
      (p_org, 'entrada', 'Ofertas', 'oferta', 2),
      (p_org, 'entrada', 'Ofertas de missões', 'missoes', 3),
      (p_org, 'entrada', 'Eventos e inscrições', 'eventos', 4),
      (p_org, 'entrada', 'Doações', 'doacoes', 5),
      (p_org, 'entrada', 'Rendimentos', 'rendimentos', 6),
      (p_org, 'entrada', 'Outras entradas', 'outras_entradas', 7),
      (p_org, 'despesa', 'Aluguel', 'aluguel', 1),
      (p_org, 'despesa', 'Energia', 'energia', 2),
      (p_org, 'despesa', 'Água', 'agua', 3),
      (p_org, 'despesa', 'Internet e telefone', 'internet', 4),
      (p_org, 'despesa', 'Prebenda e salários', 'pessoal', 5),
      (p_org, 'despesa', 'Encargos e impostos', 'encargos', 6),
      (p_org, 'despesa', 'Manutenção e limpeza', 'manutencao', 7),
      (p_org, 'despesa', 'Material de consumo', 'consumo', 8),
      (p_org, 'despesa', 'Som, mídia e equipamentos', 'equipamentos', 9),
      (p_org, 'despesa', 'Missões e repasses', 'repasses', 10),
      (p_org, 'despesa', 'Ação social', 'acao_social', 11),
      (p_org, 'despesa', 'Eventos', 'eventos_desp', 12),
      (p_org, 'despesa', 'Tarifas bancárias', 'tarifas', 13),
      (p_org, 'despesa', 'Outras despesas', 'outras_despesas', 14)
    on conflict do nothing;
  end if;
  if not exists (select 1 from service.fin_funds where organization_id = p_org) then
    insert into service.fin_funds (organization_id, name, designated, is_default, sort_order) values
      (p_org, 'Geral', false, true, 1),
      (p_org, 'Missões', true, false, 2),
      (p_org, 'Construção', true, false, 3),
      (p_org, 'Ação social', true, false, 4);
  end if;
  if not exists (select 1 from service.fin_accounts where organization_id = p_org) then
    insert into service.fin_accounts (organization_id, name, kind, sort_order)
    values (p_org, 'Caixa da igreja', 'caixa', 1);
  end if;
end $$;
grant execute on function service.fin_preparar(uuid) to authenticated;

-- ── saldos (sem trazer todo o histórico para o navegador) ───────────────────
create or replace function service.fin_saldos(p_org uuid)
returns table (account_id uuid, saldo_cents bigint)
language sql stable security definer set search_path = service, public as $$
  select a.id,
    a.opening_balance_cents
    + coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end)
                from service.fin_transactions t
                where t.account_id = a.id and t.status = 'realizado'), 0)
    + coalesce((select sum(t.amount_cents) from service.fin_transactions t
                where t.to_account_id = a.id and t.status = 'realizado'), 0)
  from service.fin_accounts a
  where a.organization_id = p_org and service.fin_can(p_org, false)
$$;
grant execute on function service.fin_saldos(uuid) to authenticated;

create or replace function service.fin_saldos_fundos(p_org uuid)
returns table (fund_id uuid, saldo_cents bigint)
language sql stable security definer set search_path = service, public as $$
  select f.id,
    coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end)
              from service.fin_transactions t
              where t.fund_id = f.id and t.status = 'realizado' and t.kind <> 'transferencia'), 0)
  from service.fin_funds f
  where f.organization_id = p_org and service.fin_can(p_org, false)
$$;
grant execute on function service.fin_saldos_fundos(uuid) to authenticated;

-- ── nomes para contribuinte e contagem ──────────────────────────────────────
-- O tesoureiro pode não ter acesso à tela Pessoas; aqui vê só id e nome.
create or replace function service.fin_pessoas(p_org uuid)
returns table (id uuid, name text, eu boolean)
language sql stable security definer set search_path = service, public as $$
  select m.id, m.name,
    (m.volunteer_id = any(service.my_people()) or m.id = any(service.my_members()))
  from service.members m
  where m.organization_id = p_org and service.fin_can(p_org, false)
  order by m.name
$$;
grant execute on function service.fin_pessoas(uuid) to authenticated;

-- ── contagem de oferta: grava a contagem e os lançamentos de uma vez ────────
create or replace function service.fin_registrar_oferta(
  p_org uuid, p_church uuid, p_data date, p_event uuid, p_fund uuid, p_category uuid,
  p_conta_dinheiro uuid, p_conta_digital uuid,
  p_dinheiro bigint, p_pix bigint, p_cartao bigint,
  p_contou uuid, p_conferiu uuid, p_obs text default null
) returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_id uuid;
  v_eu uuid;
  v_contou text;
  v_conferiu text;
  v_desc text;
begin
  if not service.fin_can(p_org, true) then raise exception 'sem_permissao'; end if;
  if p_contou is null or p_conferiu is null or p_contou = p_conferiu then raise exception 'duas_pessoas'; end if;
  if coalesce(p_dinheiro, 0) < 0 or coalesce(p_pix, 0) < 0 or coalesce(p_cartao, 0) < 0 then raise exception 'valor_invalido'; end if;
  if coalesce(p_dinheiro, 0) + coalesce(p_pix, 0) + coalesce(p_cartao, 0) <= 0 then raise exception 'valor_invalido'; end if;
  if coalesce(p_dinheiro, 0) > 0 and p_conta_dinheiro is null then raise exception 'conta'; end if;
  if coalesce(p_pix, 0) + coalesce(p_cartao, 0) > 0 and p_conta_digital is null then raise exception 'conta'; end if;
  v_contou := (select m.name from service.members m where m.id = p_contou and m.organization_id = p_org);
  v_conferiu := (select m.name from service.members m where m.id = p_conferiu and m.organization_id = p_org);
  if v_contou is null or v_conferiu is null then raise exception 'pessoa'; end if;
  v_eu := (select p.id from service.people p where p.id = any(service.my_people()) and p.organization_id = p_org order by p.id limit 1);
  v_desc := coalesce('Oferta · ' || (select e.name from service.events e where e.id = p_event and e.organization_id = p_org), 'Oferta do culto');

  insert into service.fin_offering_counts
    (organization_id, church_id, event_id, counted_on, fund_id, category_id, cash_cents, pix_cents, card_cents,
     counted_by, counted_by_name, verified_by, verified_by_name, note, created_by)
  values (p_org, p_church, p_event, p_data, p_fund, p_category, coalesce(p_dinheiro, 0), coalesce(p_pix, 0), coalesce(p_cartao, 0),
     p_contou, v_contou, p_conferiu, v_conferiu, nullif(trim(coalesce(p_obs, '')), ''), v_eu)
  returning id into v_id;

  insert into service.fin_transactions
    (organization_id, church_id, kind, occurred_on, amount_cents, account_id, category_id, fund_id, method, description, offering_count_id, created_by)
  select p_org, p_church, 'entrada', p_data, x.valor, x.conta, p_category, p_fund, x.forma, v_desc, v_id, v_eu
  from (values
    (coalesce(p_dinheiro, 0), p_conta_dinheiro, 'dinheiro'),
    (coalesce(p_pix, 0), p_conta_digital, 'pix'),
    (coalesce(p_cartao, 0), p_conta_digital, 'cartao')
  ) as x(valor, conta, forma)
  where x.valor > 0;

  return v_id;
end $$;
grant execute on function service.fin_registrar_oferta(uuid, uuid, date, uuid, uuid, uuid, uuid, uuid, bigint, bigint, bigint, uuid, uuid, text) to authenticated;

-- ── comprovantes: bucket privado, lido só por quem tem acesso ───────────────
insert into storage.buckets (id, name, public)
values ('service-finance', 'service-finance', false)
on conflict (id) do nothing;

-- caminho: <organization_id>/<arquivo>
create or replace function service.fin_can_path(p_name text, p_write boolean)
returns boolean
language plpgsql stable security definer set search_path = service, public as $$
declare v_org uuid;
begin
  begin
    v_org := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return service.fin_can(v_org, p_write);
end $$;
grant execute on function service.fin_can_path(text, boolean) to authenticated;

drop policy if exists fin_files_read on storage.objects;
create policy fin_files_read on storage.objects for select to authenticated
  using (bucket_id = 'service-finance' and service.fin_can_path(name, false));
drop policy if exists fin_files_ins on storage.objects;
create policy fin_files_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'service-finance' and service.fin_can_path(name, true));
drop policy if exists fin_files_upd on storage.objects;
create policy fin_files_upd on storage.objects for update to authenticated
  using (bucket_id = 'service-finance' and service.fin_can_path(name, true));
drop policy if exists fin_files_del on storage.objects;
create policy fin_files_del on storage.objects for delete to authenticated
  using (bucket_id = 'service-finance' and service.fin_can_path(name, true));
