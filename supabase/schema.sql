-- ── CE.X · Schema Supabase ────────────────────────────────────────────────────
-- Rode este arquivo no SQL Editor do seu projeto Supabase (uma vez).

create extension if not exists pgcrypto;

-- Estantes
create table if not exists estantes (
  key          text primary key,
  label        text not null,
  familia      text not null check (familia in ('ministrar', 'liderar')),
  accent       text not null,
  faixa_etaria text not null default '',
  status       text not null default 'visible' check (status in ('visible', 'hidden')),
  ord          integer not null default 0,
  created_at   timestamptz default now()
);

-- Materiais
create table if not exists materiais (
  id           text primary key,
  familia      text not null check (familia in ('ministrar', 'liderar')),
  estante      text not null references estantes(key) on delete set null,
  model        text not null check (model in ('A','B','C','D')),
  etiqueta     text not null default '',
  titulo       text not null,
  code         text,
  big          text,
  big_label    text,
  promessa     text not null default '',
  mensagens    integer,
  paginas      integer not null default 0,
  formatos     text[] not null default '{}',
  preco        text not null default '',
  hotmart_url  text not null default '',
  hotmart_product_id text,
  hotmart_offer_id text,
  colecoes     text[] not null default '{}',
  pra_quem     text not null default '',
  conteudo     text[] not null default '{}',
  como_usar    text not null default '',
  faq          jsonb not null default '[]',
  status       text not null default 'Publicado',
  created_at   timestamptz default now()
);

alter table materiais add column if not exists hotmart_product_id text;
alter table materiais add column if not exists hotmart_offer_id text;

-- Cursos
create table if not exists cursos (
  slug         text primary key,
  num          text not null,
  nivel        text not null check (nivel in ('fundacao','lideranca','multiplicacao')),
  title        text not null,
  desc_text    text not null default '',
  dur          text not null default '',
  promessa     text not null default '',
  pra_quem     text not null default '',
  ementa       jsonb not null default '[]',
  formato      text not null default '',
  mentor       text not null default '',
  mentor_bio   text not null default '',
  depoimento   jsonb not null default '{}',
  turma        text not null default '',
  status       text not null default 'Publicado',
  created_at   timestamptz default now()
);

-- RLS: habilitado, acesso público por enquanto (apertar depois com service_role)
alter table estantes  enable row level security;
alter table materiais enable row level security;
alter table cursos    enable row level security;

-- Policies: leitura pública, escrita via service_role (backend)
create policy "leitura pública estantes"  on estantes  for select using (true);
create policy "leitura pública materiais" on materiais for select using (true);
create policy "leitura pública cursos"    on cursos    for select using (true);

-- Perfis dos usuários
create table if not exists user_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text not null default '',
  church_name     text not null default '',
  phone           text not null default '',
  state           text not null default '',
  city            text not null default '',
  church_address  text not null default '',
  role            text not null default '',
  ministry_area   text not null default '',
  denomination    text not null default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists user_profiles_email_idx on user_profiles(lower(email));
create index if not exists user_profiles_state_idx on user_profiles(state);
create index if not exists user_profiles_role_idx on user_profiles(role);
create index if not exists user_profiles_church_name_idx on user_profiles(church_name);

alter table user_profiles enable row level security;

drop policy if exists "usuario le seu perfil" on user_profiles;
create policy "usuario le seu perfil" on user_profiles
for select using (auth.uid() = user_id);

drop policy if exists "usuario cria seu perfil" on user_profiles;
create policy "usuario cria seu perfil" on user_profiles
for insert with check (auth.uid() = user_id);

drop policy if exists "usuario atualiza seu perfil" on user_profiles;
create policy "usuario atualiza seu perfil" on user_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Compras liberadas pela Hotmart
create table if not exists compras (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  buyer_email         text not null,
  material_id         text not null references materiais(id) on delete cascade,
  status              text not null default 'Liberado' check (status in ('Liberado','Pendente','Cancelado','Reembolsado')),
  source              text not null default 'hotmart',
  hotmart_transaction text unique,
  hotmart_product_id  text,
  raw_payload         jsonb not null default '{}',
  purchased_at        timestamptz default now(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists compras_user_id_idx on compras(user_id);
create index if not exists compras_buyer_email_idx on compras(lower(buyer_email));
create index if not exists compras_material_id_idx on compras(material_id);

alter table compras enable row level security;

drop policy if exists "usuario le suas compras" on compras;
create policy "usuario le suas compras" on compras
for select using (
  auth.uid() = user_id
  or lower(buyer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
