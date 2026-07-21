-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0041 · CORRIGE GRANTS DE service_role EM core
--
-- Mesma lacuna que 0033 corrigiu em service/cex, mas em core: 0001_foundation.sql
-- só deu ALTER DEFAULT PRIVILEGES em core pra `authenticated`, nunca pra
-- `service_role` (ver comentário de 0033 : RPCs em core nunca sentiram isso
-- por serem `security definer`, mas escrita direta de tabela via
-- supabaseAdmin() sim).
--
-- Isso quebrava silenciosamente app/api/service/members/create-account/route.ts:
-- o upsert em core.memberships (criar o vínculo do voluntário na organização,
-- papel "vol") tomava "permission denied for table memberships" sem erro
-- checado, então a conta era criada mas sem vínculo nenhum com a igreja. No
-- próximo login, o voluntário caía em core.memberships vazio → service.churches
-- vazio (RLS) → redirecionado pra "Crie a igreja matriz" do onboarding em vez
-- do app do voluntário.
-- ═══════════════════════════════════════════════════════════════════════════

grant select, insert, update, delete on all tables in schema core to service_role;
grant usage, select on all sequences in schema core to service_role;

alter default privileges in schema core grant select, insert, update, delete on tables to service_role;
alter default privileges in schema core grant usage, select on sequences to service_role;
