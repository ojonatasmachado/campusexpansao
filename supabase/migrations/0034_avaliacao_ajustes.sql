-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0034 · AVALIAÇÃO DE EXPERIÊNCIA — AJUSTES DE SEGMENTAÇÃO
-- Aditiva/corretiva sobre 0031/0032, a partir de feedback direto de uso:
--
-- - Service: só "todos" · "papel" · "time" (tira "lista" — nunca usado,
--   e-mail avulso não é bom eixo pra pulso cross-tenant).
-- - Site: só "todos" · "estante" (tira "papel" — cex.user_profiles.role é
--   texto livre, não dá pra confiar como eixo — e tira "lista" pelo mesmo
--   motivo do Service).
-- - "estante" no site passa a significar "comprou de", não "acessou/abriu"
--   (cex.material_acessos continua existindo só pro disparo pós-acesso).
--   Renomeia a coluna de snapshot pra refletir isso (sem dado real gravado
--   ainda, troca é de graça).
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.enquetes drop constraint enquetes_segmentacao_modo_check;
alter table service.enquetes add constraint enquetes_segmentacao_modo_check
  check (segmentacao_modo in ('todos','papel','time'));

alter table cex.enquetes drop constraint enquetes_segmentacao_modo_check;
alter table cex.enquetes add constraint enquetes_segmentacao_modo_check
  check (segmentacao_modo in ('todos','estante'));

alter table cex.respostas rename column estantes_acessadas to estantes_compradas;
comment on column cex.respostas.estantes_compradas is 'Snapshot das estantes com pelo menos uma compra liberada do usuário no momento da resposta (não é "acessou", é "comprou de").';
