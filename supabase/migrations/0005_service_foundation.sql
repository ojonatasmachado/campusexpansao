-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0005 · SCHEMA service — FUNDAÇÃO
-- Produto Service (gestão de igrejas). Igrejas, pessoas, membros, ministérios,
-- grupos, identidade. TODA tabela pendura em organization_id (tenant) + church_id.
-- Nada de campo do CE.X aqui.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── service.churches ───────────────────────────────────────────────────────────
-- Congregações de uma organização (matriz + filiais). A org é o contrato/assinatura;
-- a church é a unidade física. Multi-congregação = várias churches na mesma org.
create table service.churches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  name             text not null,
  city             text,
  is_headquarters  boolean not null default false,
  doc              text,                    -- CNPJ
  founded_year     text,
  address          text,
  postal_code      text,
  email            citext,
  phone            text,
  accent           text default 'olive',    -- token da paleta quente (AGENTS.md §2)
  settings         jsonb not null default '{}',  -- ESCALA_CFG, GRUPOS_CFG, CONTATO_CFG, presets
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table service.churches is 'Congregação (matriz/filial) de uma organização. Unidade de escopo do Service.';

-- ── service.church_identity ─────────────────────────────────────────────────────
-- Missão, visão, propósito, versículo, valores. 1:1 com a igreja (campos opcionais).
create table service.church_identity (
  church_id    uuid primary key references service.churches(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  purpose      text,
  mission      text,
  vision       text,
  verse        text,
  values       jsonb not null default '[]',  -- [{ic,title,text}]
  updated_at   timestamptz not null default now()
);

-- ── service.cycles ──────────────────────────────────────────────────────────────
-- Ciclos / visão do ano (tema, versículo, objetivos, banner).
create table service.cycles (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  year             text not null,
  theme            text not null,
  verse            text,
  body             text,
  banner_url       text,
  objectives       jsonb not null default '[]',
  is_active        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.history_entries ──────────────────────────────────────────────────────
create table service.history_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  year             text,
  title            text not null,
  body             text,
  photo_url        text,
  link             text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.ministerial_titles ───────────────────────────────────────────────────
-- Títulos que a igreja define (Pastor, Diácono...). Lookup editável por igreja.
create table service.ministerial_titles (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ── service.people ────────────────────────────────────────────────────────────
-- VOLUNTÁRIOS (quem serve). Pode (ou não) estar ligado a um usuário logável
-- via user_id. Distinto de member: nem todo membro é voluntário.
create table service.people (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  user_id          uuid references core.users(id) on delete set null,  -- login opcional
  name             text not null,
  phone            text,
  email            citext,
  since_year       text,
  status           text not null default 'ativo' check (status in ('ativo','pausa','ferias')),
  engagement       integer,
  availability     jsonb not null default '{}',  -- { dom_m:true, dom_n:false, qua:true }
  tags             text[] not null default '{}', -- ids de service.tags (frentes)
  meta             jsonb not null default '{}',  -- recusasSeguidas, diasIndisponivel etc.
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table service.people is 'Voluntário (quem serve). user_id liga ao login quando existe.';

-- ── service.fellowship_groups ─────────────────────────────────────────────────────
-- GCs / células (nome do termo é configurável em churches.settings).
create table service.fellowship_groups (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  leader_person_id uuid references service.people(id) on delete set null,
  weekday          text,
  time             text,
  neighborhood     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.members ────────────────────────────────────────────────────────────
-- MEMBROS da congregação (≠ voluntário). volunteer_id liga ao voluntário quando serve.
create table service.members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  volunteer_id     uuid references service.people(id) on delete set null,
  group_id         uuid references service.fellowship_groups(id) on delete set null,
  title_id         uuid references service.ministerial_titles(id) on delete set null,
  name             text not null,
  phone            text,
  email            citext,
  birth            text,
  since_year       text,
  situation        text not null default 'membro' check (situation in ('membro','novo')),
  first_contact    text,                    -- AAAA-MM (regra "novo por 3 meses")
  neighborhood     text,
  family           text,
  journey          jsonb not null default '[]',  -- [Decisão,Batismo,Fundamentos,GC,Servindo] 0/1
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table service.members is 'Membro da congregação. volunteer_id o liga ao voluntário quando serve.';

-- ── service.ministries ────────────────────────────────────────────────────────
-- Times / ministérios (Louvor, Recepção, Kids...).
create table service.ministries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  icon             text default '◆',
  description      text,
  profile          jsonb not null default '{}',  -- TIMES_INFO: proposito, chegada, responsabilidades, aberto
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.ministry_positions ──────────────────────────────────────────────────
-- Funções de um ministério (Ministro, Vocal, Câmera...) + quantos precisam.
create table service.ministry_positions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  ministry_id      uuid not null references service.ministries(id) on delete cascade,
  name             text not null,
  need_count       integer not null default 1,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ── service.person_ministries ─────────────────────────────────────────────────────
-- Vínculo voluntário ↔ ministério, com flag de liderança.
create table service.person_ministries (
  person_id        uuid not null references service.people(id) on delete cascade,
  ministry_id      uuid not null references service.ministries(id) on delete cascade,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  is_leader        boolean not null default false,
  functions        text[] not null default '{}',
  created_at       timestamptz not null default now(),
  primary key (person_id, ministry_id)
);

-- ── service.tags ──────────────────────────────────────────────────────────────
-- Frentes / etiquetas livres (Jovens, Kids, Casais). lideres = ids de people.
create table service.tags (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  color            text default 'olive',
  leaders          uuid[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Índices ─────────────────────────────────────────────────────────────────────
create index on service.churches (organization_id);
create index on service.people (organization_id, church_id);
create index on service.people (user_id);
create index on service.people using gin (name gin_trgm_ops);
create index on service.members (organization_id, church_id);
create index on service.members (volunteer_id);
create index on service.members (group_id);
create index on service.ministries (organization_id, church_id);
create index on service.ministry_positions (ministry_id);
create index on service.person_ministries (ministry_id);
create index on service.person_ministries (organization_id);
create index on service.fellowship_groups (organization_id, church_id);
create index on service.cycles (church_id);
create index on service.history_entries (church_id, sort_order);
create index on service.tags (organization_id, church_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'churches','church_identity','cycles','history_entries','people',
    'members','fellowship_groups','ministries','tags'
  ]
  loop
    execute format(
      'create trigger t_%s_upd before update on service.%I for each row execute function core.set_updated_at();',
      t, t);
  end loop;
end $$;
