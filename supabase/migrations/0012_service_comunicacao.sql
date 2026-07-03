-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0012 · SERVICE — RASTREIO DE LEITURA DE AVISOS
-- Aditiva: só cria tabela nova, não altera nada existente.
--
-- O protótipo (visitantes.jsx: VerQuemLeuBtn, painel "Alcance da semana") simula
-- a leitura sorteando uma fatia de S.PESSOAS. Aqui isso vira dado real: cada vez
-- que um voluntário abre um aviso no app (TabAvisos), gravamos uma leitura.
-- Chave em person_id (não member_id) porque é quem sempre existe no app do
-- voluntário — nem todo voluntário tem um registro em service.members.
-- ═══════════════════════════════════════════════════════════════════════════

create table service.announcement_reads (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  announcement_id  uuid not null references service.announcements(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  read_at          timestamptz not null default now(),
  unique (announcement_id, person_id)
);
comment on table service.announcement_reads is 'Confirmação real de leitura de um aviso por um voluntário (marcada ao abrir o aviso no app).';

create index on service.announcement_reads (announcement_id);
create index on service.announcement_reads (person_id);

-- ── RLS — mesmo padrão base de 0006 (isolamento por tenant, sem restrição de
-- papel: camada "ABERTO", o próprio voluntário grava a própria leitura) ───────
alter table service.announcement_reads enable row level security;
create policy svc_tenant on service.announcement_reads
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
