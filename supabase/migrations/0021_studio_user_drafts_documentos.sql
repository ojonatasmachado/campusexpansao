-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0021 · STUDIO — RASCUNHO POR MENSAGEM + MÓDULO DOCUMENTOS
-- Aditiva: nova coluna, constraint de module ampliada, índice único trocado.
--
-- O editor de mensagem individual do comprador (Studio Documentos) agora
-- persiste o rascunho no banco, isolado por usuário + material + mensagem,
-- em vez de só no localStorage do navegador. Sem a coluna `mensagem`, um
-- material com várias mensagens colidiria no mesmo rascunho.
-- ═══════════════════════════════════════════════════════════════════════════

alter table studio_user_drafts
  add column if not exists mensagem text not null default '';

alter table studio_user_drafts
  drop constraint if exists studio_user_drafts_module_check;

alter table studio_user_drafts
  add constraint studio_user_drafts_module_check
  check (module in ('design', 'slides', 'documentos'));

drop index if exists studio_user_drafts_user_material_module_uidx;

create unique index if not exists studio_user_drafts_user_material_module_mensagem_uidx
  on studio_user_drafts(user_id, material_id, module, mensagem);
