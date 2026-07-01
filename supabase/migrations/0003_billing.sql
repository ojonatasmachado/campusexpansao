-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0003 · SCHEMA billing
-- Planos, assinaturas, faturas, pagamentos e liberações comerciais.
-- É billing que ATIVA core.product_access (via trigger/edge function). O acesso
-- funcional continua sendo decidido em core; billing é o "porquê comercial".
-- ═══════════════════════════════════════════════════════════════════════════

-- ── billing.plans ────────────────────────────────────────────────────────────
-- Catálogo de planos vendáveis, cada um amarrado a um produto do core.
create table billing.plans (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  product_code  text not null references core.products(code),
  name          text not null,
  price_cents   integer not null default 0,
  currency      text not null default 'BRL',
  interval      text not null default 'month' check (interval in ('month','year','one_time')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table billing.plans is 'Planos vendáveis por produto (Service mensal/anual; CE.X compra avulsa).';

-- ── billing.subscriptions ─────────────────────────────────────────────────────
-- Assinatura de uma organização a um plano. Quando status='active', dispara a
-- liberação em core.product_access (ver trigger no fim deste arquivo).
create table billing.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references core.organizations(id) on delete cascade,
  plan_id           uuid not null references billing.plans(id),
  product_code      text not null references core.products(code),
  status            text not null default 'trialing'
                      check (status in ('trialing','active','past_due','canceled','expired')),
  provider          text default 'hotmart' check (provider in ('hotmart','stripe','manual')),
  provider_ref      text,
  current_period_end timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table billing.subscriptions is 'Assinatura org↔plano. Ativa liberação de produto no core.';

-- ── billing.invoices ──────────────────────────────────────────────────────────
create table billing.invoices (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  subscription_id  uuid references billing.subscriptions(id) on delete set null,
  amount_cents     integer not null,
  currency         text not null default 'BRL',
  status           text not null default 'open' check (status in ('open','paid','void','uncollectible')),
  due_at           timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table billing.invoices is 'Faturas emitidas para uma organização.';

-- ── billing.payments ──────────────────────────────────────────────────────────
create table billing.payments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  invoice_id       uuid references billing.invoices(id) on delete set null,
  amount_cents     integer not null,
  currency         text not null default 'BRL',
  method           text,
  provider         text default 'hotmart',
  provider_ref     text,
  status           text not null default 'succeeded' check (status in ('succeeded','failed','refunded','pending')),
  paid_at          timestamptz,
  created_at       timestamptz not null default now()
);
comment on table billing.payments is 'Pagamentos recebidos (webhook Hotmart/Stripe).';

-- ── billing.entitlements ────────────────────────────────────────────────────────
-- Liberações comerciais AVULSAS. Caso central do CE.X: comprou o material X no
-- Hotmart → ganha direito de download. Aponta para cex.materials por id, mas NÃO
-- guarda campos do CE.X: só a chave e o direito. Domínio comercial, não de catálogo.
create table billing.entitlements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references core.organizations(id) on delete cascade,
  user_id          uuid references core.users(id) on delete set null,
  product_code     text not null references core.products(code),
  item_type        text not null check (item_type in ('material','course','mentorship','event','plan')),
  item_id          uuid not null,               -- id em cex.* (sem FK cross-schema rígida: domínios separados)
  provider         text default 'hotmart',
  provider_ref     text,
  active           boolean not null default true,
  granted_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table billing.entitlements is 'Direito comercial avulso (ex.: comprou um material CE.X no Hotmart). Guarda só a chave, não o conteúdo.';

-- ── Índices ─────────────────────────────────────────────────────────────────────
create index on billing.subscriptions (organization_id);
create index on billing.subscriptions (status);
create index on billing.invoices (organization_id);
create index on billing.payments (organization_id);
create index on billing.entitlements (organization_id);
create index on billing.entitlements (user_id);
create index on billing.entitlements (item_type, item_id);

-- ── updated_at ────────────────────────────────────────────────────────────────
create trigger t_plans_upd    before update on billing.plans         for each row execute function core.set_updated_at();
create trigger t_subs_upd     before update on billing.subscriptions for each row execute function core.set_updated_at();
create trigger t_inv_upd      before update on billing.invoices      for each row execute function core.set_updated_at();
create trigger t_ent_upd      before update on billing.entitlements  for each row execute function core.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- SINCRONIA billing → core.product_access
-- Assinatura ativa/expira → liga/desliga o acesso ao produto no core.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function billing.sync_product_access()
returns trigger language plpgsql security definer set search_path = core, billing, public as $$
begin
  if (new.status = 'active') then
    insert into core.product_access (organization_id, product_code, active, source)
    values (new.organization_id, new.product_code, true, 'billing')
    on conflict (organization_id, product_code)
      do update set active = true, source = 'billing', updated_at = now();
  elsif (new.status in ('canceled','expired')) then
    update core.product_access
      set active = false, updated_at = now()
      where organization_id = new.organization_id and product_code = new.product_code;
  end if;
  return new;
end
$$;

create trigger t_subs_sync_access
  after insert or update of status on billing.subscriptions
  for each row execute function billing.sync_product_access();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — billing é sensível: authenticated só LÊ o da própria org; escrita é do
-- backend (service_role, que ignora RLS via webhooks de pagamento).
-- ═══════════════════════════════════════════════════════════════════════════
alter table billing.plans         enable row level security;
alter table billing.subscriptions enable row level security;
alter table billing.invoices      enable row level security;
alter table billing.payments      enable row level security;
alter table billing.entitlements  enable row level security;

create policy plans_read on billing.plans for select to authenticated, anon using (active = true);

create policy subs_read on billing.subscriptions
  for select to authenticated using (organization_id in (select core.orgs_for_current_user()));
create policy invoices_read on billing.invoices
  for select to authenticated
  using (organization_id in (select core.orgs_for_current_user()) and core.has_role(organization_id,'owner','master','pastor'));
create policy payments_read on billing.payments
  for select to authenticated
  using (organization_id in (select core.orgs_for_current_user()) and core.has_role(organization_id,'owner','master','pastor'));

-- entitlements: a org vê os seus; o usuário também vê os direitos pessoais dele.
create policy entitlements_read on billing.entitlements
  for select to authenticated
  using (organization_id in (select core.orgs_for_current_user()) or user_id = auth.uid());
