-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0036 · SERVICE — BÍBLIA (leitura, marcação e anotação do membro)
-- Aditiva: só cria tabela/policy nova, não altera nada existente.
--
-- O texto da Bíblia (ACF) NÃO mora no banco : é estático, igual pra todo
-- mundo, servido como asset em public/bible/acf.json e lido direto pelo
-- app (cacheado offline via service worker do PWA). Aqui só fica o que É
-- da pessoa : suas marcações coloridas e anotações por versículo.
--
-- 100% privado por decisão do usuário : nem líder, nem pastor, nem master
-- enxergam a marcação/anotação de outra pessoa. Diferente de
-- service.pesquisas_respostas (0035), que a liderança pode ver como
-- acompanhamento. Aqui é o diário de leitura da pessoa com Deus.
-- ═══════════════════════════════════════════════════════════════════════════

create table service.bible_marks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  version          text not null default 'acf' check (version in ('acf')),
  book             text not null,
  chapter          integer not null check (chapter > 0),
  verse            integer not null check (verse > 0),
  color            text check (color in ('sand','wheat','amber','clay','terra','rust','cocoa','olive')),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (color is not null or coalesce(note, '') <> '')
);
comment on table service.bible_marks is 'Marcação (cor) e/ou anotação de um versículo, por pessoa. 100% privado : só a própria pessoa lê ou escreve, nem liderança tem acesso.';
comment on column service.bible_marks.book is 'Abreviação do livro igual ao JSON estático em public/bible/acf.json (ex.: gn, jo, ap).';

create unique index bible_marks_unica on service.bible_marks (person_id, version, book, chapter, verse);
create index on service.bible_marks (organization_id);
create index on service.bible_marks (person_id);

create trigger t_bible_marks_upd before update on service.bible_marks for each row execute function core.set_updated_at();

-- ── RLS : só a própria pessoa, sempre ──────────────────────────────────────
alter table service.bible_marks enable row level security;

create policy svc_bible_marks_select on service.bible_marks
  for select to authenticated
  using (
    core.can_access(organization_id, 'service')
    and person_id in (select id from service.people where user_id = auth.uid())
  );
create policy svc_bible_marks_write on service.bible_marks
  for insert to authenticated
  with check (
    core.can_access(organization_id, 'service')
    and person_id in (select id from service.people where user_id = auth.uid())
  );
create policy svc_bible_marks_update on service.bible_marks
  for update to authenticated
  using (person_id in (select id from service.people where user_id = auth.uid()))
  with check (person_id in (select id from service.people where user_id = auth.uid()));
create policy svc_bible_marks_delete on service.bible_marks
  for delete to authenticated
  using (person_id in (select id from service.people where user_id = auth.uid()));

grant select, insert, update, delete on all tables in schema service to service_role;
