-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0023 · MOVE A LOJA PARA O SCHEMA `cex`
-- As 11 tabelas do site/admin/Studio nasceram em `public` (supabase/schema.sql,
-- anterior à arquitetura de 5 schemas). Isso contraria a lei do
-- HANDOFF - Banco de Dados: "Nada de tabela de negócio em public" e deixa o
-- schema `cex` (reservado desde 0001_foundation.sql) vazio à toa.
--
-- `ALTER TABLE ... SET SCHEMA` só move o namespace da tabela: constraints,
-- FKs, índices, triggers, policies de RLS e GRANTs já concedidos continuam
-- intactos (não há sequence própria aqui — toda PK usa gen_random_uuid() ou
-- texto). Não precisa recriar nada, só mover.
--
-- Pré-requisito (feito manualmente antes desta migration): `cex` adicionado
-- em Project Settings → API → Data API → Exposed schemas no painel Supabase,
-- senão o PostgREST rejeita qualquer request com Accept-Profile: cex.
-- ═══════════════════════════════════════════════════════════════════════════

alter table if exists public.admin_users         set schema cex;
alter table if exists public.estantes             set schema cex;
alter table if exists public.materiais            set schema cex;
alter table if exists public.material_translations set schema cex;
alter table if exists public.cursos               set schema cex;
alter table if exists public.mentorias            set schema cex;
alter table if exists public.studio_templates     set schema cex;
alter table if exists public.metric_events        set schema cex;
alter table if exists public.studio_user_drafts   set schema cex;
alter table if exists public.user_profiles        set schema cex;
alter table if exists public.compras              set schema cex;
