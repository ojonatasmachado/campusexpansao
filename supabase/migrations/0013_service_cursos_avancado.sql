-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0013 · SERVICE — CURSOS: PERSISTÊNCIA REAL + CHECK-IN DE AULA
-- Aditiva: só cria coluna/tabela nova, não altera nada existente.
--
-- O CursoEditor já tinha UI completa pra divulgação, materiais, link de aula
-- e prova, mas essas colunas nunca existiram em service.courses/
-- course_lessons — o editor descartava esse conteúdo a cada salvamento.
-- Também falta o check-in de aula presencial por QR (mesmo padrão de
-- 0011_service_checkin.sql, mas por aula em vez de por evento, e ligado a
-- service.enrollments/service.members em vez de roster/people).
--
-- Achado de quebra: o editor sempre ofereceu "Ao vivo" como tipo de aula
-- (AULA_TIPOS em CursoEditor.tsx), mas o check de 0006 só permitia
-- ('video','texto','presencial') — salvar uma aula "ao vivo" sempre violou
-- a constraint. Corrigido junto, já que o check-in por QR vale pra
-- presencial e ao vivo.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.courses
  add column divulgacao text,
  add column materiais  jsonb not null default '[]',
  add column modalidade text;

alter table service.course_lessons
  add column link           text,
  add column conteudo       text,
  add column prova          jsonb,
  add column min_acertos    integer not null default 0,
  add column checkin_token  text,
  add column checkin_active boolean not null default true;

alter table service.course_lessons
  drop constraint course_lessons_kind_check,
  add constraint course_lessons_kind_check check (kind in ('video','texto','presencial','ao_vivo'));

create table service.lesson_attendance (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  course_id        uuid not null references service.courses(id) on delete cascade,
  lesson_id        uuid not null references service.course_lessons(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  checked_in_at    timestamptz not null default now(),
  via              text not null default 'qr' check (via in ('qr','manual')),
  unique (lesson_id, member_id)
);
comment on table service.lesson_attendance is 'Presença confirmada numa aula presencial/ao vivo (QR ou manual). Alimenta o done_count real de service.enrollments.';

create index on service.lesson_attendance (lesson_id);
create index on service.lesson_attendance (course_id, member_id);

-- ── RLS — mesmo padrão de 0011 (isolamento por tenant, sem restrição de
-- papel: o próprio aluno confirma a própria presença) ────────────────────────
alter table service.lesson_attendance enable row level security;
create policy svc_tenant on service.lesson_attendance
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
