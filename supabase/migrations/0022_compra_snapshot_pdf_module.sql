-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0022 · SNAPSHOT DE COMPRA + MÓDULO PDF DO STUDIO
-- Aditiva: coluna nova, constraint ampliada, bucket de Storage novo.
--
-- O roteiro/PDF que o comprador vê passa a ser congelado no momento da
-- compra (contents_snapshot), pra edições futuras do mentor não afetarem
-- quem já comprou. E o leitor de PDF (Studio) passa a ter rascunho de
-- comprador persistido no banco, igual ao editor de Documentos (0021).
-- ═══════════════════════════════════════════════════════════════════════════

alter table compras
  add column if not exists contents_snapshot jsonb;

alter table studio_user_drafts
  drop constraint if exists studio_user_drafts_module_check;

alter table studio_user_drafts
  add constraint studio_user_drafts_module_check
  check (module in ('design', 'slides', 'documentos', 'pdf'));

insert into storage.buckets (id, name, public)
values ('materiais-media', 'materiais-media', true)
on conflict (id) do nothing;

-- Leitura pública (arquivos gerados a partir de conteúdo publicado); toda
-- escrita passa por rota server-side com supabaseAdmin() (service role
-- bypassa RLS), então não há policy de insert/update/delete aqui.
create policy materiais_media_read on storage.objects
  for select
  using (bucket_id = 'materiais-media');
