-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0038 · SERVICE — FOTO PEQUENA POR LINK DA PÁGINA PÚBLICA
-- Aditiva: só cria coluna nova, não altera nada existente.
--
-- Além do ícone (church_links.icon), a igreja pode subir uma foto pequena
-- pro link (ex.: foto do pastor num link de "Fale com a gente", capa de um
-- episódio específico). Quando preenchida, a foto substitui o ícone na
-- renderização pública (ver app/igreja/[slug]/templates/*.tsx).
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.church_links
  add column image_url text;

comment on column service.church_links.image_url is 'Foto pequena do link (opcional). Quando presente, substitui o ícone na página pública.';
