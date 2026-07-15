-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0033 · CORRIGE GRANTS DE service_role EM service/cex
--
-- 0001_foundation.sql só deu ALTER DEFAULT PRIVILEGES pra `authenticated`
-- (e `anon` em `cex`), nunca pra `service_role`. Tabelas antigas funcionam
-- porque ganharam GRANT amplo uma vez, manualmente, quando o schema foi
-- exposto no painel do Supabase (ver comentário em 0023) — mas isso não
-- vale pra tabela nova nenhuma, só pro que já existia naquele momento.
-- `service.enquetes`/`cex.enquetes` (0031/0032) bateram nisso: supabaseAdmin()
-- (service_role) tomou "permission denied" ao tentar ler, mesmo RLS não
-- entrando no caminho (service_role bypassa RLS, mas GRANT é uma camada
-- separada). RPCs em `core`/`billing` nunca sentiram isso por serem
-- `security definer` (rodam como dono da função, não como quem chamou).
--
-- Corrige as tabelas que já existem hoje em `service`/`cex` e garante que
-- toda tabela nova daqui pra frente já nasce com o grant certo.
-- ═══════════════════════════════════════════════════════════════════════════

grant select, insert, update, delete on all tables in schema service to service_role;
grant select, insert, update, delete on all tables in schema cex     to service_role;
grant usage, select on all sequences in schema service to service_role;
grant usage, select on all sequences in schema cex     to service_role;

alter default privileges in schema service grant select, insert, update, delete on tables to service_role;
alter default privileges in schema cex     grant select, insert, update, delete on tables to service_role;
alter default privileges in schema service grant usage, select on sequences to service_role;
alter default privileges in schema cex     grant usage, select on sequences to service_role;
