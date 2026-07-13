-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0024 · CONVITE SEGURO PARA NOVOS ACESSOS DO ADMIN
-- Aditiva: coluna de senha vira opcional, + 2 colunas novas pro token de
-- configuração. Nada existente é removido ou reescrito.
--
-- Hoje o master digita a senha do novo mentor no formulário e precisa
-- repassar ela por fora (WhatsApp etc). Isso muda: o master cria o acesso
-- SEM senha, o servidor gera um link de configuração de uso único
-- (guardamos só o hash do token, nunca o token cru) que o master compartilha
-- com o mentor. O mentor abre o link e escolhe a própria senha — o master
-- nunca chega a saber qual é.
--
-- Login continua bloqueado enquanto password_hash for null (conta "pendente
-- de configuração"), ver guarda em loginAction (app/(site)/admin/actions.ts).
-- ═══════════════════════════════════════════════════════════════════════════

alter table cex.admin_users
  alter column password_salt drop not null,
  alter column password_hash drop not null,
  add column if not exists setup_token_hash text,
  add column if not exists setup_token_expires_at timestamptz;

-- único enquanto o token estiver ativo (pending), pra lookup direto por hash.
create unique index if not exists admin_users_setup_token_hash_idx
  on cex.admin_users (setup_token_hash)
  where setup_token_hash is not null;
