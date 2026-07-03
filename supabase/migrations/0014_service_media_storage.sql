-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0014 · SERVICE — UPLOAD DE MÍDIA (logo da igreja + foto de capítulo)
-- Aditiva: cria bucket/policies novos e uma coluna nova, não altera nada
-- existente.
--
-- Nenhum bucket de Storage existia no projeto até aqui. Bucket público
-- único (service-media) evita duplicar policy por tipo de mídia: o
-- primeiro segmento do caminho é o organization_id, então a RLS isola por
-- tenant sem precisar de coluna organization_id em storage.objects (que não
-- existe nessa tabela do Supabase). Mesmo papel ADMIN que já protege
-- service.churches/history_entries (0008_service_rls_roles.sql, camada
-- ADMIN) via core.has_role, reaproveitado aqui.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.churches
  add column logo_url text;

insert into storage.buckets (id, name, public)
values ('service-media', 'service-media', true)
on conflict (id) do nothing;

create policy svc_media_read on storage.objects
  for select
  using (bucket_id = 'service-media');

create policy svc_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'service-media'
    and core.has_role((storage.foldername(name))[1]::uuid, 'owner', 'master', 'pastor')
  );

create policy svc_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'service-media'
    and core.has_role((storage.foldername(name))[1]::uuid, 'owner', 'master', 'pastor')
  )
  with check (
    bucket_id = 'service-media'
    and core.has_role((storage.foldername(name))[1]::uuid, 'owner', 'master', 'pastor')
  );

create policy svc_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'service-media'
    and core.has_role((storage.foldername(name))[1]::uuid, 'owner', 'master', 'pastor')
  );
