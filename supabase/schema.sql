-- ── CE.X · Schema Supabase ────────────────────────────────────────────────────
-- Rode este arquivo no SQL Editor do seu projeto Supabase (uma vez).

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
  colecoes     text[] not null default '{}',
  pra_quem     text not null default '',
  conteudo     text[] not null default '{}',
  como_usar    text not null default '',
  faq          jsonb not null default '[]',
  status       text not null default 'Publicado',
  created_at   timestamptz default now()
);

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
