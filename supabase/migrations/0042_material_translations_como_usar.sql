-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0042 · CAMPO "SOBRE A SÉRIE" TRADUZIDO
-- Aditiva: coluna nova em material_translations.
--
-- A landing page ganha uma seção "Sobre a série" (como_usar) com o texto
-- completo da apresentação (problema, objetivo, resultado esperado, uso
-- responsável). Esse campo já existia em materiais, mas material_translations
-- não tinha coluna equivalente — sem isso a seção sempre mostraria a versão
-- em português mesmo pro visitante em inglês/espanhol.
-- ═══════════════════════════════════════════════════════════════════════════

alter table material_translations
  add column if not exists como_usar text not null default '';
