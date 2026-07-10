-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0020 · SERVICE — RESPONSÁVEL PRINCIPAL DA CRIANÇA
-- Aditiva: só cria coluna nova, não altera nada existente.
--
-- Quem cadastra a criança pelo app do membro (área Kids, self-service) vira
-- o responsável PRINCIPAL. Só ele pode adicionar outros membros/pessoas
-- como co-responsáveis depois — regra aplicada na UI (RLS de
-- child_guardians continua ABERTO, mesmo padrão de 0017 : o refinamento
-- fino de "só o principal edita" não é forçado no banco, é convenção de UI,
-- igual outras régua já registradas pra este produto).
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.child_guardians
  add column is_primary boolean not null default false;
