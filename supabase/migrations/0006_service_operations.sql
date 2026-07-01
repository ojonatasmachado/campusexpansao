-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0006 · SCHEMA service — OPERAÇÃO, JORNADA & COLABORAÇÃO
-- Cultos, escalas, visitantes, comunicação, decisões, batismos, trilhas internas,
-- salas, reuniões, ensaios, quadros, conversas. Fecha com a RLS de TODAS as
-- tabelas do schema service (bloco no fim).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── service.events ───────────────────────────────────────────────────────────
-- Cultos / eventos (o "CULTOS" do protótipo). tags = frentes exigidas.
create table service.events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  kind             text default 'Culto',
  weekday          text,
  event_date       date,
  time             text,
  slot             text,                    -- dom_m | dom_n | qua ...
  location         text,
  ministries       uuid[] not null default '{}',
  tags             text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.event_schedule_items ─────────────────────────────────────────────────
-- Cronograma (roteiro etapa a etapa) de um evento.
create table service.event_schedule_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  event_id         uuid not null references service.events(id) on delete cascade,
  time             text,
  duration_min     integer,
  item             text not null,
  ministry_id      uuid references service.ministries(id) on delete set null,
  person_id        uuid references service.people(id) on delete set null,
  category         text,                    -- louvor|oracao|admin|mensagem
  notes            text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ── service.setlist_songs ─────────────────────────────────────────────────────
-- Repertório do louvor por evento (ordem = sort_order).
create table service.setlist_songs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  event_id         uuid not null references service.events(id) on delete cascade,
  title            text not null,
  song_key         text,
  youtube          text,
  chart            text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ── service.roster_assignments ────────────────────────────────────────────────────
-- ESCALA: quem serve, em qual função, em qual evento. status: ok|wait|no.
create table service.roster_assignments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  event_id         uuid not null references service.events(id) on delete cascade,
  position_id      uuid not null references service.ministry_positions(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  status           text not null default 'wait' check (status in ('ok','wait','no')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (event_id, position_id, person_id)
);

-- ── service.visitors + notes ───────────────────────────────────────────────────
-- CRM de visitantes. stage: novo|contato|integrando|membro.
create table service.visitors (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  phone            text,
  stage            text not null default 'novo' check (stage in ('novo','contato','integrando','membro')),
  visited_on       text,
  responsible_id   uuid references service.people(id) on delete set null,
  due              text,
  due_status       text check (due_status in ('soon','ok','late')),
  reply_status     text check (reply_status in ('respondeu','sem_resposta')),
  origin           text,
  member_id        uuid references service.members(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.visitor_notes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  visitor_id       uuid not null references service.visitors(id) on delete cascade,
  happened_on      text,
  body             text not null,
  author           text,
  is_milestone     boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ── service.announcements (avisos) e service.wall_posts (mural) ─────────────────────
create table service.announcements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  title            text not null,
  audience         text,
  body             text,
  author           text,
  when_label       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.wall_posts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  author           text,
  audience         text,
  body             text not null,
  pinned           boolean not null default false,
  channels         text[] not null default '{}',   -- app, push
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.decisions (decisões/conversões) ─────────────────────────────────────
create table service.decisions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  phone            text,
  happened_on      text,
  kind             text check (kind in ('decisao','reconciliacao')),
  service_name     text,
  responsible_id   uuid references service.people(id) on delete set null,
  status           text not null default 'novo' check (status in ('novo','acompanhando','encaminhado')),
  member_id        uuid references service.members(id) on delete set null,
  age              integer,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.baptism_classes + candidates ────────────────────────────────────────
create table service.baptism_classes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  label            text not null,
  baptism_date     text,
  location         text,
  status           text check (status in ('aberta','preparacao','agendada','concluida')),
  pastor           text,
  notes            text,
  open_enrollment  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.baptism_candidates (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references service.baptism_classes(id) on delete cascade,
  member_id        uuid references service.members(id) on delete cascade,
  decision_id      uuid references service.decisions(id) on delete cascade,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  created_at       timestamptz not null default now(),
  check (member_id is not null or decision_id is not null)
);
create unique index baptism_candidates_class_member_uidx
  on service.baptism_candidates (class_id, member_id)
  where member_id is not null;
create unique index baptism_candidates_class_decision_uidx
  on service.baptism_candidates (class_id, decision_id)
  where decision_id is not null;

-- ── service.timeline_events (jornada da pessoa) ─────────────────────────────────
create table service.timeline_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  event_type       text not null,          -- decisao,batismo,curso,time,lider... (catálogo no app)
  title            text not null,
  body             text,
  by_whom          text,
  sort_key         bigint,                 -- AAAAMMDD para ordenação
  when_label       text,
  created_at       timestamptz not null default now()
);

-- ── service.courses (TRILHAS INTERNAS de discipulado) ──────────────────────────
-- ATENÇÃO: são os cursos INTERNOS do Service (Novos Convertidos, Fundamentos).
-- NÃO confundir com cex.courses (cursos comerciais vendidos no CE.X). Domínios
-- diferentes, tabelas diferentes — exatamente a regra "não misturar produtos".
create table service.courses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  kind             text check (kind in ('trilha','conteudo','presencial')),
  level            text,
  color            text default 'olive',
  description      text,
  category         text,                    -- grupo: entrada|discipulado|familia|lideranca
  prereqs          uuid[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.course_modules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  course_id        uuid not null references service.courses(id) on delete cascade,
  name             text not null,
  sort_order       integer not null default 0
);
create table service.course_lessons (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  module_id        uuid not null references service.course_modules(id) on delete cascade,
  name             text not null,
  duration         text,
  kind             text check (kind in ('video','texto','presencial')),
  sort_order       integer not null default 0
);
create table service.enrollments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  course_id        uuid not null references service.courses(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  done_count       integer not null default 0,
  status           text not null default 'cursando' check (status in ('cursando','concluido')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (course_id, member_id)
);

-- ── service.prayer_requests (pedidos do app do membro) ──────────────────────────
create table service.prayer_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  member_id        uuid references service.members(id) on delete set null,
  kind             text check (kind in ('oracao','falar_lider')),
  body             text not null,
  status           text not null default 'aberto' check (status in ('aberto','em_contato','resolvido')),
  is_private       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.rooms + reservations ────────────────────────────────────────────────
create table service.rooms (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  capacity         integer,
  location         text,
  resources        text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.reservations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  room_id          uuid not null references service.rooms(id) on delete cascade,
  title            text not null,
  kind             text default 'outro',
  reserved_date    date,
  start_time       text,
  end_time         text,
  source_type      text,                    -- ensaio|reuniao|culto|curso...
  source_id        uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.meetings + actions ──────────────────────────────────────────────────
create table service.meetings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  title            text not null,
  meeting_date     text,
  time             text,
  location         text,
  author_id        uuid references service.people(id) on delete set null,
  status           text not null default 'agendada' check (status in ('agendada','realizada')),
  ministries       uuid[] not null default '{}',
  attendees        uuid[] not null default '{}',
  agenda           jsonb not null default '[]',
  minutes          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.meeting_actions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  meeting_id       uuid not null references service.meetings(id) on delete cascade,
  description      text not null,
  assignee_id      uuid references service.people(id) on delete set null,
  status           text not null default 'pendente' check (status in ('pendente','andamento','feito')),
  created_at       timestamptz not null default now()
);

-- ── service.rehearsals (ensaios) ────────────────────────────────────────────────
create table service.rehearsals (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  ministry_id      uuid references service.ministries(id) on delete set null,
  title            text not null,
  kind             text default 'louvor',
  rehearsal_date   text,
  time             text,
  location         text,
  recurrence       text,
  audience         text,
  attendees        uuid[] not null default '{}',
  repertoire       jsonb not null default '[]',
  attachments      jsonb not null default '[]',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.boards + columns + cards + comments (Kanban) ────────────────────────
create table service.boards (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  scope            text default 'time' check (scope in ('time','geral')),
  ministry_id      uuid references service.ministries(id) on delete set null,
  description      text,
  columns          jsonb not null default '[]',  -- [{id,nome}]
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.cards (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  board_id         uuid not null references service.boards(id) on delete cascade,
  column_id        text not null,
  title            text not null,
  description      text,
  assignees        uuid[] not null default '{}',
  due              text,
  priority         text default 'media' check (priority in ('alta','media','baixa')),
  source_type      text,
  source_id        uuid,
  moved_days_ago   integer default 0,
  activity         jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.card_comments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  card_id          uuid not null references service.cards(id) on delete cascade,
  author           text,
  body             text not null,
  created_at       timestamptz not null default now()
);

-- ── service.chats + members + messages ───────────────────────────────────────────
create table service.chats (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  kind             text not null default 'dm' check (kind in ('time','grupo','dm')),
  ministry_id      uuid references service.ministries(id) on delete set null,
  name             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table service.chat_members (
  chat_id          uuid not null references service.chats(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  primary key (chat_id, member_id)
);
create table service.messages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  chat_id          uuid not null references service.chats(id) on delete cascade,
  sender_id        uuid references service.members(id) on delete set null,
  body             text not null,
  created_at       timestamptz not null default now()
);

-- ── Índices ─────────────────────────────────────────────────────────────────────
create index on service.events (organization_id, church_id);
create index on service.event_schedule_items (event_id, sort_order);
create index on service.setlist_songs (event_id, sort_order);
create index on service.roster_assignments (event_id);
create index on service.roster_assignments (person_id);
create index on service.roster_assignments (position_id);
create index on service.visitors (organization_id, church_id, stage);
create index on service.visitor_notes (visitor_id);
create index on service.decisions (organization_id, church_id, status);
create index on service.baptism_candidates (member_id);
create index on service.timeline_events (member_id, sort_key desc);
create index on service.courses (organization_id, church_id);
create index on service.course_modules (course_id, sort_order);
create index on service.course_lessons (module_id, sort_order);
create index on service.enrollments (course_id);
create index on service.enrollments (member_id);
create index on service.prayer_requests (organization_id, church_id, status);
create index on service.reservations (room_id, reserved_date);
create index on service.meetings (organization_id, church_id);
create index on service.meeting_actions (meeting_id);
create index on service.rehearsals (organization_id, church_id);
create index on service.cards (board_id, column_id);
create index on service.card_comments (card_id);
create index on service.chat_members (member_id);
create index on service.messages (chat_id, created_at);

-- ── updated_at triggers (tabelas com a coluna) ──────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'events','setlist_songs','roster_assignments','visitors','announcements',
    'wall_posts','decisions','baptism_classes','courses','enrollments',
    'prayer_requests','rooms','reservations','meetings','rehearsals',
    'boards','cards','chats'
  ]
  loop
    execute format(
      'create trigger t_%s_upd before update on service.%I for each row execute function core.set_updated_at();',
      t, t);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS DE TODO O SCHEMA service (fundação + operação)
-- Regra base (tenant + produto): a linha só é visível/editável se o usuário é
-- membro da org DONA da linha E essa org tem o produto 'service' liberado.
-- core.can_access() cobre os dois. Refinos por papel (lider só edita seu time)
-- ficam como policies ADICIONAIS na app; a lei de isolamento é esta.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    -- fundação (0005)
    'churches','church_identity','cycles','history_entries','ministerial_titles',
    'people','fellowship_groups','members','ministries','ministry_positions',
    'person_ministries','tags',
    -- operação (0006)
    'events','event_schedule_items','setlist_songs','roster_assignments',
    'visitors','visitor_notes','announcements','wall_posts','decisions',
    'baptism_classes','baptism_candidates','timeline_events','courses',
    'course_modules','course_lessons','enrollments','prayer_requests',
    'rooms','reservations','meetings','meeting_actions','rehearsals',
    'boards','cards','card_comments','chats','chat_members','messages'
  ]
  loop
    execute format('alter table service.%I enable row level security;', t);
    execute format($f$
      create policy svc_tenant on service.%I
        for all to authenticated
        using (core.can_access(organization_id, 'service'))
        with check (core.can_access(organization_id, 'service'));
    $f$, t);
  end loop;
end $$;
