-- Service v7 4.4 · imagem do destaque do Mural. As regras do bucket
-- service-media (0014) só deixam dono, master e pastor enviar arquivo; o líder
-- que publica no Mural com imagem receberia erro. Esta regra soma (OR) e
-- libera para a liderança (is_lead: dono, master, pastor, líder) só a pasta
-- <organização>/mural/. Idempotente.

drop policy if exists svc_media_mural_insert on storage.objects;
create policy svc_media_mural_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'service-media'
    and (storage.foldername(name))[2] = 'mural'
    and service.is_lead((storage.foldername(name))[1]::uuid)
  );
