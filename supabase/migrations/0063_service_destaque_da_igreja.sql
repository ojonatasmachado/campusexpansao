-- Service v7 4.4 · Destaque da igreja: uma publicação do Mural pode ficar em
-- destaque no Início do app até uma data, com imagem (e texto alternativo) e
-- vídeo do YouTube ou do Instagram pelo link. Um destaque por vez: ao
-- destacar uma publicação nova, o painel encerra o destaque anterior.

alter table service.announcements add column if not exists highlight_until timestamptz;
alter table service.announcements add column if not exists image_url text;
alter table service.announcements add column if not exists image_alt text;
alter table service.announcements add column if not exists video_url text;
comment on column service.announcements.highlight_until is 'Em destaque no Início do app até este instante (v7 4.4).';
comment on column service.announcements.image_alt is 'Texto alternativo da imagem (leitor de tela).';
comment on column service.announcements.video_url is 'Link do YouTube ou do Instagram; o app incorpora pelo link.';
create index if not exists announcements_destaque_idx on service.announcements (church_id, highlight_until) where highlight_until is not null;
