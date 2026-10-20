-- Service v7 4.18 · Lembrete do aviso só para quem não viu. Ao publicar, a
-- liderança escolhe "Lembrar quem não viu" em 24h, 48h ou numa data; o
-- agendador (rota /api/service/cron/lembretes) manda uma vez a notificação a
-- quem do público ainda não abriu (service.announcement_reads), fora do
-- silêncio das 22h às 7h.

alter table service.announcements add column if not exists remind_at timestamptz;
alter table service.announcements add column if not exists reminded_at timestamptz;
alter table service.announcements add column if not exists remind_to uuid[];
comment on column service.announcements.remind_at is 'Quando lembrar quem não viu (já fora do silêncio das 22h às 7h).';
comment on column service.announcements.reminded_at is 'Quando o lembrete foi enviado (uma vez por aviso).';
comment on column service.announcements.remind_to is 'Membros do público no momento da publicação (service.members.id).';
create index if not exists announcements_lembrete_idx on service.announcements (remind_at) where reminded_at is null and remind_at is not null;
