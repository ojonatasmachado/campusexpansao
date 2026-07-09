-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0015 · SERVICE — INSCRIÇÕES DE PUSH (WEB PUSH)
-- Aditiva: só cria tabela nova, não altera nada existente.
--
-- Fase 23: o protótipo (evolucoes/service_app/pwa.jsx, sw.js) já deixava os
-- ganchos de push prontos (handler `push`/`notificationclick` no service
-- worker, toggle na tela de Perfil), mas nunca existiu backend real capaz de
-- enviar — o próprio comentário do sw.js do protótipo dizia "push real exige
-- backend". Esta tabela guarda a inscrição (endpoint + chaves) de cada
-- dispositivo; o envio de verdade usa a biblioteca `web-push` com chave
-- privada só em app/api/service/push/notify (nunca no client).
-- ═══════════════════════════════════════════════════════════════════════════

create table service.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  endpoint         text not null unique,
  p256dh           text not null,
  auth_key         text not null,
  created_at       timestamptz not null default now()
);
comment on table service.push_subscriptions is 'Inscrição Web Push (endpoint + chaves) de um voluntário, criada via /api/service/push/subscribe. Escrita real só pela rota server-side (service_role); o client nunca grava direto.';

create index on service.push_subscriptions (person_id);

-- ── RLS — mesmo padrão base de 0006/0012 (isolamento por tenant, camada
-- "ABERTO": a régua de "só a própria inscrição" é aplicada no código da rota,
-- que resolve person_id a partir da sessão, não do que o client manda) ───────
alter table service.push_subscriptions enable row level security;
create policy svc_tenant on service.push_subscriptions
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
