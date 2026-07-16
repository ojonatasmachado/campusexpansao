-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0037 · SERVICE — PÁGINA PÚBLICA DA IGREJA (link-in-bio)
-- Aditiva: só cria coluna/tabelas/policies novas, não altera nada existente.
--
-- Cada igreja ganha uma página pública (tipo Linktree) em /igreja/[slug], pra
-- colocar na bio do Instagram. slug mora na própria churches (precisa de índice
-- único e é lido sem login). A aparência (cores, template, bio, redes sociais)
-- mora em churches.settings.paginaCfg (mesmo jsonb de sempre, ver
-- 0005_service_foundation.sql:24) : é config leve, não precisa de tabela.
-- Links e posts do mural público, por outro lado, são listas que crescem e têm
-- ordenação/agendamento/publicação própria → tabelas dedicadas.
--
-- A leitura pública (visitante sem login) NUNCA passa pela RLS abaixo : ela
-- roda só no servidor via supabaseAdmin() (service_role, bypassa RLS). As
-- policies aqui protegem o CAMINHO AUTENTICADO (o editor em Configurações).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── slug público da igreja ──────────────────────────────────────────────────
-- citext = mesmo idioma de core.organizations.slug (0002) e
-- service.church_networks.slug (0028) : unicidade sem diferenciar
-- maiúscula/minúscula, sem precisar de trigger de normalização.
alter table service.churches
  add column slug citext unique,
  add constraint churches_slug_formato check (slug is null or slug ~ '^[a-z0-9-]{3,40}$');

comment on column service.churches.slug is 'Endereço da página pública : campusexpansao.com/igreja/{slug}. Aparência/conteúdo em settings.paginaCfg + church_links + church_page_posts.';

-- ── service.church_links ────────────────────────────────────────────────────
-- Os botões de link da página pública. Agendamento (starts_at/ends_at) deixa um
-- link de evento aparecer e sumir sozinho, sem a igreja precisar lembrar de tirar.
create table service.church_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  label            text not null,
  url              text not null,
  icon             text not null default 'link',
  group_label      text,
  starts_at        timestamptz,
  ends_at          timestamptz,
  position         integer not null default 0,
  active           boolean not null default true,
  click_count      integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table service.church_links is 'Links da página pública (link-in-bio) da igreja. click_count é só um espelho pra leitura rápida no editor; a contagem de verdade vem do log em church_page_views.';

create index on service.church_links (church_id, position);
create index on service.church_links (organization_id);

create trigger t_church_links_upd before update on service.church_links for each row execute function core.set_updated_at();

-- ── service.church_page_posts ───────────────────────────────────────────────
-- Mural de notícias/avisos PÚBLICOS da página. Diferente de service.announcements
-- e service.wall_posts (0006) : aqueles são pro membro logado, com RLS de
-- organização. Este é público, lido sem login via supabaseAdmin().
create table service.church_page_posts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  title            text not null,
  body             text,
  cover_url        text,
  published_at     timestamptz not null default now(),
  pinned           boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table service.church_page_posts is 'Notícia/aviso público exibido na página link-in-bio da igreja. Não confundir com service.announcements/wall_posts (mural interno do membro logado).';

create index on service.church_page_posts (church_id, published_at desc);
create index on service.church_page_posts (organization_id);

create trigger t_church_page_posts_upd before update on service.church_page_posts for each row execute function core.set_updated_at();

-- ── service.church_page_views ───────────────────────────────────────────────
-- Log append-only de visualização de página / clique em link. Append-only em vez
-- de UPDATE ... SET count = count + 1 pra não ter corrida de concorrência num
-- link popular; a contagem é agregada na hora de ler, no painel do editor.
create table service.church_page_views (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references service.churches(id) on delete cascade,
  link_id      uuid references service.church_links(id) on delete cascade,
  kind         text not null check (kind in ('view', 'click')),
  occurred_at  timestamptz not null default now()
);
comment on table service.church_page_views is 'Log append-only de view/click da página pública, gravado só pelo service_role (rota de tracking pública, sem login). Agregado na leitura, nunca via UPDATE de contador.';

create index on service.church_page_views (church_id, occurred_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table service.church_links enable row level security;
create policy svc_tenant on service.church_links
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));

alter table service.church_page_posts enable row level security;
create policy svc_tenant on service.church_page_posts
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));

-- camada ADMIN (config/identidade pública da igreja) : mesmo grupo de papéis que
-- já escreve em churches (0008_service_rls_roles.sql).
select service._apply_write_roles('church_links', array['owner', 'master', 'pastor']);
select service._apply_write_roles('church_page_posts', array['owner', 'master', 'pastor']);

-- church_page_views : só leitura autenticada (painel de estatísticas do editor).
-- Nenhuma policy de insert pra authenticated/anon de propósito : a escrita só
-- acontece via service_role (bypassa RLS), pela rota pública de tracking. Sem
-- isso, qualquer pessoa logada em qualquer organização poderia inflar/poluir a
-- contagem de outra igreja.
alter table service.church_page_views enable row level security;
create policy svc_church_page_views_select on service.church_page_views
  for select to authenticated
  using (
    church_id in (
      select id from service.churches where core.can_access(organization_id, 'service')
    )
  );

grant select, insert, update, delete on all tables in schema service to service_role;
