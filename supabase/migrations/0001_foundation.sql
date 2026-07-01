-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0001 · FUNDAÇÃO
-- Extensões, os 5 schemas do ecossistema, funções-helper de RLS e grants.
-- Rode ANTES de qualquer outra migration. Nada de tabela de negócio aqui.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensões ────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- busca textual (nomes de pessoas/materiais)
create extension if not exists "citext";         -- e-mails case-insensitive

-- ── Os 5 schemas do ecossistema Campus ──────────────────────────────────────
-- core    → dados compartilhados entre produtos (identidade, tenants, RBAC, acesso).
-- service → produto Service (gestão de igrejas).
-- cex     → produto CE.X (loja de materiais).
-- billing → planos, assinaturas, faturas, pagamentos, liberações comerciais.
-- audit   → logs, histórico de alterações, rastreabilidade.
-- public  → NUNCA recebe tabela de negócio. Fica só para extensões/tipos padrão.
create schema if not exists core;
create schema if not exists service;
create schema if not exists cex;
create schema if not exists billing;
create schema if not exists audit;

comment on schema core    is 'Dados compartilhados entre produtos: usuários, organizações, papéis, permissões, acesso a produtos.';
comment on schema service is 'Produto Service (gestão de igrejas). Não mistura campos do CE.X.';
comment on schema cex     is 'Produto CE.X (loja de materiais/cursos). Não mistura campos do Service.';
comment on schema billing is 'Planos, assinaturas, faturas, pagamentos e liberações comerciais.';
comment on schema audit   is 'Logs, histórico de alterações e rastreabilidade.';

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPERS DE AUTORIZAÇÃO (base de TODA policy de RLS)
-- Vivem em core porque são compartilhados. STABLE + SECURITY DEFINER para poderem
-- ler core.* sem esbarrar na própria RLS ao serem chamados de dentro de policies.
-- ═══════════════════════════════════════════════════════════════════════════

-- Identidade do requisitante (Supabase Auth injeta em auth.uid()).
create or replace function core.current_user_id()
returns uuid language sql stable as $$
  select auth.uid()
$$;

-- Admin da plataforma CE.X (equipe interna) — claim no JWT app_metadata.platform_admin.
create or replace function core.is_platform_admin()
returns boolean
language sql stable as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'platform_admin')::boolean,
    false
  )
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER PADRÃO: updated_at automático
-- Toda tabela com updated_at pendura este trigger (ver migrations por schema).
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function core.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS DE SCHEMA
-- Os roles anon/authenticated podem "entrar" nos schemas; o acesso real é
-- decidido tabela a tabela por GRANT + RLS. service_role (backend) ignora RLS.
-- ═══════════════════════════════════════════════════════════════════════════
grant usage on schema core, service, cex, billing, audit to anon, authenticated, service_role;

-- Defaults: novas tabelas já nascem com os privilégios certos para os roles do PostgREST.
-- (A RLS ainda filtra linha a linha; sem policy, ninguém lê nada mesmo com o GRANT.)
alter default privileges in schema core    grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema service grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema cex     grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema billing grant select on tables to authenticated;
alter default privileges in schema audit   grant select on tables to authenticated;

-- Catálogo CE.X é público (site sem login lê materiais publicados): anon recebe SELECT.
-- O filtro "só publicado" fica na policy (ver 0006_cex.sql).
alter default privileges in schema cex grant select on tables to anon;

alter default privileges in schema core    grant usage, select on sequences to authenticated;
alter default privileges in schema service grant usage, select on sequences to authenticated;
alter default privileges in schema cex     grant usage, select on sequences to authenticated;
