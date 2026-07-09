-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0019 · SERVICE — LOCAL DE EVENTO SEMPRE É UM ESPAÇO CADASTRADO
-- Aditiva: só cria coluna nova, não altera nada existente.
--
-- Local de culto/evento, ensaio, turma de batismo e evento Kids deixa de ser
-- texto livre : passa a apontar pra service.rooms (mesmo padrão que
-- service.reservations e service.kids_classes já usam), pra sempre ter
-- capacidade conhecida. service.meetings já linkava a sala via
-- service.reservations (source_type='reuniao'), não precisa de coluna nova.
--
-- service.rooms.allows_meetings: sala pode ser inadequada pra reunião de
-- adultos por natureza (ex: Berçário). O seletor de sala filtra por essa
-- flag em culto/ensaio/batismo/reunião; evento Kids NÃO filtra (é
-- justamente o contexto onde uma sala infantil faz sentido).
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.rooms
  add column allows_meetings boolean not null default true;

alter table service.events
  add column room_id uuid references service.rooms(id) on delete set null;

alter table service.kids_events
  add column room_id uuid references service.rooms(id) on delete set null;

alter table service.rehearsals
  add column room_id uuid references service.rooms(id) on delete set null;

alter table service.baptism_classes
  add column room_id uuid references service.rooms(id) on delete set null;
