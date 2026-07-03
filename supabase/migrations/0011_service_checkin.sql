-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0011 · SERVICE — CHECK-IN POR QR (token real + presença persistida)
-- Aditiva: só cria coluna/tabela nova, não altera nada existente.
--
-- service.events ganha o token do QR e o botão liga/desliga. A presença fica
-- numa tabela própria (service.event_attendance), separada de
-- roster_assignments, porque também precisa registrar presença EXTRA — gente
-- que apareceu sem estar escalada (mesmo modelo do protótipo: S.PRESENCA é
-- uma lista à parte da escala, não um campo dentro dela).
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.events
  add column checkin_token  text,
  add column checkin_active boolean not null default true;

create table service.event_attendance (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  event_id         uuid not null references service.events(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  checked_in_at    timestamptz not null default now(),
  via              text not null default 'qr' check (via in ('qr','manual')),
  is_extra         boolean not null default false,
  unique (event_id, person_id)
);
comment on table service.event_attendance is 'Presença confirmada num evento (QR ou manual). Separada de roster_assignments porque também guarda presença extra de quem não estava escalado.';

create index on service.event_attendance (event_id);

-- ── RLS — mesmo padrão base de 0006 (isolamento por tenant, sem restrição de
-- papel: qualquer membro da org, incluindo o próprio voluntário confirmando a
-- própria presença, camada "ABERTO" descrita em 0008) ────────────────────────
alter table service.event_attendance enable row level security;
create policy svc_tenant on service.event_attendance
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
