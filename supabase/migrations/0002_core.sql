-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0002 · SCHEMA core
-- Só o que é COMPARTILHADO entre produtos: identidade, tenants, RBAC, acesso.
-- Nada de dado de negócio do Service ou do CE.X aqui.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── core.users ───────────────────────────────────────────────────────────────
-- Perfil da pessoa que faz login. 1:1 com auth.users (Supabase Auth é a fonte da
-- senha/sessão; aqui fica o perfil que os produtos leem). Compartilhado: o MESMO
-- usuário pode operar Service e comprar no CE.X.
create table core.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        citext unique,
  phone        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table core.users is 'Perfil global do usuário (1:1 com auth.users). Compartilhado entre produtos.';

-- ── core.products ─────────────────────────────────────────────────────────────
-- Catálogo dos produtos do ecossistema. Tabela de referência (semeada em 0008).
create table core.products (
  code        text primary key check (code in ('service','cex')),
  name        text not null,
  created_at  timestamptz not null default now()
);
comment on table core.products is 'Produtos do Campus (service, cex). Referência.';

-- ── core.organizations ─────────────────────────────────────────────────────────
-- O TENANT. Toda linha de negócio em service/cex/billing pendura em uma org.
-- Para o Service, uma org = uma conta de igreja (rede). Para o CE.X, uma org pode
-- ser o publisher (equipe CE.X) ou um comprador pessoa-jurídica.
create table core.organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         citext unique,
  kind         text not null default 'church' check (kind in ('church','publisher','buyer')),
  owner_id     uuid references core.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table core.organizations is 'Tenant do ecossistema. Raiz de isolamento de dados de todos os produtos.';

-- ── core.memberships ────────────────────────────────────────────────────────────
-- Vínculo usuário ↔ organização + papel. É a espinha dorsal do RBAC e do
-- isolamento multi-tenant (todas as policies partem daqui via orgs_for_current_user()).
-- role: papéis do Service (master/pastor/lider/vol) e da plataforma (cex_admin, owner).
create table core.memberships (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references core.users(id) on delete cascade,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  role             text not null default 'vol'
                     check (role in ('owner','master','pastor','lider','vol','cex_admin','cex_editor','viewer')),
  status           text not null default 'active' check (status in ('active','invited','suspended')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, organization_id)
);
comment on table core.memberships is 'Usuário ↔ organização + papel. Base do RBAC e da RLS multi-tenant.';

-- ── core.product_access ─────────────────────────────────────────────────────────
-- Quais produtos cada organização pode usar. Gravado por billing quando uma
-- assinatura fica ativa; lido por core.has_product_access() em toda policy.
create table core.product_access (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  product_code     text not null references core.products(code),
  active           boolean not null default true,
  granted_at       timestamptz not null default now(),
  source           text default 'billing' check (source in ('billing','manual','trial')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, product_code)
);
comment on table core.product_access is 'Liberação de produto por organização. Fonte da verdade do has_product_access().';

-- ── core.permissions / role_permissions ─────────────────────────────────────────
-- Matriz de permissões finas por papel (o "MATRIZ_V2" do protótipo). Fica em core
-- porque é regra de AUTORIZAÇÃO, compartilhável. As AÇÕES concretas (ex.: 'escala',
-- 'membros') são de produto, mas a matriz papel→ação é infraestrutura de acesso.
create table core.permissions (
  code        text primary key,          -- ex.: 'service.escala', 'service.membros', 'cex.catalogo'
  product_code text not null references core.products(code),
  label       text not null,
  category    text,
  created_at  timestamptz not null default now()
);
comment on table core.permissions is 'Catálogo de ações liberáveis por papel (matriz de permissões).';

create table core.role_permissions (
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  role             text not null,
  permission_code  text not null references core.permissions(code) on delete cascade,
  allowed          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (organization_id, role, permission_code)
);
comment on table core.role_permissions is 'Matriz papel→ação por organização (editável pelo Master).';

-- ── Índices ─────────────────────────────────────────────────────────────────────
create index on core.memberships (organization_id);
create index on core.memberships (user_id);
create index on core.product_access (organization_id);
create index on core.role_permissions (organization_id, role);
create index on core.organizations (owner_id);

-- ── updated_at ────────────────────────────────────────────────────────────────
create trigger t_users_upd        before update on core.users        for each row execute function core.set_updated_at();
create trigger t_orgs_upd         before update on core.organizations for each row execute function core.set_updated_at();
create trigger t_memberships_upd  before update on core.memberships  for each row execute function core.set_updated_at();
create trigger t_prodaccess_upd   before update on core.product_access for each row execute function core.set_updated_at();
create trigger t_roleperm_upd     before update on core.role_permissions for each row execute function core.set_updated_at();

-- ── Helpers de autorização que dependem das tabelas core.* ───────────────────
-- Ficam aqui porque Postgres valida as tabelas referenciadas ao criar funções SQL.
-- A 0001 cria apenas os schemas e helpers que não dependem de tabelas.
create or replace function core.orgs_for_current_user()
returns setof uuid
language sql stable security definer set search_path = core, public as $$
  select m.organization_id
  from core.memberships m
  where m.user_id = auth.uid()
    and m.status = 'active'
$$;

create or replace function core.is_member_of(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, public as $$
  select exists (
    select 1 from core.memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org
      and m.status = 'active'
  )
$$;

create or replace function core.has_role(p_org uuid, variadic p_roles text[])
returns boolean
language sql stable security definer set search_path = core, public as $$
  select exists (
    select 1 from core.memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org
      and m.status = 'active'
      and m.role = any(p_roles)
  )
$$;

create or replace function core.has_product_access(p_org uuid, p_product text)
returns boolean
language sql stable security definer set search_path = core, public as $$
  select exists (
    select 1 from core.product_access pa
    where pa.organization_id = p_org
      and pa.product_code = p_product
      and pa.active = true
  )
$$;

create or replace function core.can_access(p_org uuid, p_product text)
returns boolean
language sql stable security definer set search_path = core, public as $$
  select core.is_member_of(p_org) and core.has_product_access(p_org, p_product)
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════
alter table core.users            enable row level security;
alter table core.organizations    enable row level security;
alter table core.memberships      enable row level security;
alter table core.product_access   enable row level security;
alter table core.products         enable row level security;
alter table core.permissions      enable row level security;
alter table core.role_permissions enable row level security;

-- users: cada um lê/edita o próprio perfil; membros de uma org veem colegas da mesma org.
create policy users_self_rw on core.users
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_same_org_read on core.users
  for select to authenticated
  using (
    exists (
      select 1 from core.memberships me
      join core.memberships them on them.organization_id = me.organization_id
      where me.user_id = auth.uid() and them.user_id = core.users.id
        and me.status = 'active' and them.status = 'active'
    )
  );

-- organizations: só quem é membro enxerga; só owner/master edita.
create policy orgs_member_read on core.organizations
  for select to authenticated using (id in (select core.orgs_for_current_user()));
create policy orgs_admin_write on core.organizations
  for update to authenticated using (core.has_role(id, 'owner','master')) with check (core.has_role(id, 'owner','master'));

-- memberships: membro vê os vínculos da própria org; owner/master gerencia.
create policy memberships_read on core.memberships
  for select to authenticated using (organization_id in (select core.orgs_for_current_user()));
create policy memberships_admin_write on core.memberships
  for all to authenticated
  using (core.has_role(organization_id, 'owner','master'))
  with check (core.has_role(organization_id, 'owner','master'));

-- product_access: leitura por membros; escrita só pela plataforma/billing (service_role ignora RLS).
create policy prodaccess_read on core.product_access
  for select to authenticated using (organization_id in (select core.orgs_for_current_user()));

-- products / permissions: referência pública para quem está logado.
create policy products_read    on core.products    for select to authenticated using (true);
create policy permissions_read on core.permissions for select to authenticated using (true);

-- role_permissions: membros leem; master edita.
create policy roleperm_read on core.role_permissions
  for select to authenticated using (organization_id in (select core.orgs_for_current_user()));
create policy roleperm_write on core.role_permissions
  for all to authenticated
  using (core.has_role(organization_id, 'owner','master'))
  with check (core.has_role(organization_id, 'owner','master'));
