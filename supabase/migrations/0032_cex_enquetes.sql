-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0032 · SITE DE MATERIAIS — AVALIAÇÃO DE EXPERIÊNCIA (ENQUETES) +
-- RASTRO DE ACESSO A MATERIAL
-- Aditiva: só cria tabela/policy nova, não altera nada existente.
--
-- Mesmo desenho de 0031, só que no domínio `cex` (nunca reaproveitar a
-- mesma tabela pros dois produtos — ver HANDOFF Banco de Dados §0.2). Site
-- não tem conceito de organização: `respostas.user_id` referencia
-- `auth.users` direto, igual `cex.compras`/`cex.user_profiles`.
--
-- `cex.material_acessos` é infraestrutura nova que faltava (o HANDOFF
-- Avaliação de Experiência já listava isso como "em aberto"): sem ela não
-- existe sinal de "estante acessada" (segmentação `estante`) nem de "acabou
-- de baixar/abrir material" (disparo `posdownload`). Gravada quando
-- /perfil/[slug] renderiza pro dono da compra.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── cex.material_acessos ───────────────────────────────────────────────────
create table cex.material_acessos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  material_id  text not null references cex.materiais(id) on delete cascade,
  estante_key  text references cex.estantes(key) on delete set null,
  created_at   timestamptz not null default now()
);
comment on table cex.material_acessos is 'Um acesso = usuário abriu /perfil/[slug] de um material comprado. Sinal de "estante acessada" (segmentação) e de "pós-download" (disparo) da Avaliação de Experiência.';

create index on cex.material_acessos (user_id);
create index on cex.material_acessos (material_id);
create index on cex.material_acessos (estante_key);

alter table cex.material_acessos enable row level security;

drop policy if exists "usuario le seus acessos" on cex.material_acessos;
create policy "usuario le seus acessos" on cex.material_acessos
for select using (auth.uid() = user_id);

drop policy if exists "usuario grava seu acesso" on cex.material_acessos;
create policy "usuario grava seu acesso" on cex.material_acessos
for insert with check (auth.uid() = user_id);

-- ── cex.enquetes ────────────────────────────────────────────────────────────
create table cex.enquetes (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  status              text not null default 'ativa' check (status in ('ativa','pausada','encerrada')),
  segmentacao_modo    text not null default 'todos' check (segmentacao_modo in ('todos','papel','estante','lista')),
  segmentacao_valores text[] not null default '{}',
  disparo_modo        text not null default 'livre' check (disparo_modo in ('livre','periodica','posdownload','campanha')),
  ativo_como_livre    boolean not null default false,
  intervalo_dias      integer,
  emitida_em          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table cex.enquetes is 'Enquete/pulso do site de materiais. Global (sem tenant). Ver HANDOFF Avaliação de Experiência.';

-- ── cex.perguntas ───────────────────────────────────────────────────────────
create table cex.perguntas (
  id          uuid primary key default gen_random_uuid(),
  enquete_id  uuid not null references cex.enquetes(id) on delete cascade,
  ordem       integer not null default 0,
  tipo        text not null check (tipo in ('nota','texto','emoji','multipla','simnao')),
  texto       text not null default '',
  escala      integer check (escala in (5,10)),
  opcoes      text[],
  created_at  timestamptz not null default now()
);

-- ── cex.respostas ───────────────────────────────────────────────────────────
create table cex.respostas (
  id                  uuid primary key default gen_random_uuid(),
  enquete_id          uuid not null references cex.enquetes(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  papel               text not null default '',
  estantes_acessadas  text[] not null default '{}',
  data                date not null default current_date,
  created_at          timestamptz not null default now(),
  unique (enquete_id, user_id)
);
comment on table cex.respostas is 'Uma resposta = um usuário respondeu uma enquete inteira. unique(enquete_id,user_id): não responde a mesma enquete duas vezes.';

-- ── cex.respostas_perguntas ─────────────────────────────────────────────────
create table cex.respostas_perguntas (
  id            uuid primary key default gen_random_uuid(),
  resposta_id   uuid not null references cex.respostas(id) on delete cascade,
  pergunta_id   uuid not null references cex.perguntas(id) on delete cascade,
  valor         text not null,
  unique (resposta_id, pergunta_id)
);

-- ── cex.enquete_visto ────────────────────────────────────────────────────────
create table cex.enquete_visto (
  enquete_id  uuid not null references cex.enquetes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  visto_em    timestamptz not null default now(),
  primary key (enquete_id, user_id)
);

-- ── Índices ─────────────────────────────────────────────────────────────────
create index on cex.perguntas (enquete_id);
create index on cex.respostas (enquete_id);
create index on cex.respostas (user_id);
create index on cex.respostas_perguntas (resposta_id);
create index on cex.respostas_perguntas (pergunta_id);
create index on cex.enquete_visto (user_id);

-- ── updated_at trigger ─────────────────────────────────────────────────────
-- (mesma função core.set_updated_at(), já usada pelo Service; genérica o
-- suficiente pra qualquer schema com created_at/updated_at)
create trigger t_cex_enquetes_upd before update on cex.enquetes for each row execute function core.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table cex.enquetes            enable row level security;
alter table cex.perguntas           enable row level security;
alter table cex.respostas           enable row level security;
alter table cex.respostas_perguntas enable row level security;
alter table cex.enquete_visto       enable row level security;

-- enquetes/perguntas: globais, qualquer usuário autenticado do site lê; só
-- service_role escreve (admin central via supabaseAdmin(), bypassa RLS).
create policy "usuario le enquetes" on cex.enquetes
for select to authenticated using (true);

create policy "usuario le perguntas" on cex.perguntas
for select to authenticated using (true);

-- respostas / respostas_perguntas / enquete_visto: só o próprio usuário.
create policy "usuario le suas respostas" on cex.respostas
for select using (auth.uid() = user_id);
create policy "usuario grava sua resposta" on cex.respostas
for insert with check (auth.uid() = user_id);

create policy "usuario le suas respostas_perguntas" on cex.respostas_perguntas
for select using (resposta_id in (select id from cex.respostas where user_id = auth.uid()));
create policy "usuario grava suas respostas_perguntas" on cex.respostas_perguntas
for insert with check (resposta_id in (select id from cex.respostas where user_id = auth.uid()));

create policy "usuario le seu visto" on cex.enquete_visto
for select using (auth.uid() = user_id);
create policy "usuario grava seu visto" on cex.enquete_visto
for insert with check (auth.uid() = user_id);
