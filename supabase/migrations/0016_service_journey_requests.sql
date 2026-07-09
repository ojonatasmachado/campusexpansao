-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0016 · SERVICE — PEDIDOS DE MUDANÇA DE JORNADA
-- Aditiva: só cria tabela nova, não altera nada existente.
--
-- Fase 24: até aqui, só owner/master/pastor/lider (camada LEAD de 0008) tinham
-- qualquer permissão de escrita em service.members/service.timeline_events —
-- um voluntário comum não tinha NENHUM jeito de declarar a própria jornada
-- (útil pra igrejas que já têm membros com passado, de antes do sistema
-- existir). Esta tabela é o "pedido" que o próprio membro cria pra si mesmo;
-- líder/pastor/master aprova (grava de verdade em members/timeline_events)
-- ou rejeita. Líder continua com escrita direta na jornada de qualquer
-- pessoa, como já tinha antes — isto aqui não tira esse acesso, só abre um
-- caminho novo pro voluntário comum, que hoje não tinha nenhum.
--
-- É o "refinamento futuro" que o comentário da 0008 (linhas ~70-75) já
-- previa: RLS por linha amarrando auth.uid() → service.people.user_id.
-- ═══════════════════════════════════════════════════════════════════════════

create table service.journey_change_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  step             text not null check (step in ('decisao','batismo','curso','integracao','time')),
  event_date       text,
  note             text,
  requested_by     uuid not null references service.people(id) on delete cascade,
  status           text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  reviewed_by      uuid references service.people(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
comment on table service.journey_change_requests is 'Pedido do próprio membro pra marcar uma etapa da jornada com data real; líder/pastor/master aprova ou rejeita. Ao aprovar, grava de verdade em members.journey + timeline_events.';

-- só 1 pedido pendente por etapa por pessoa (evita duplicar solicitação)
create unique index on service.journey_change_requests (member_id, step) where status = 'pendente';
create index on service.journey_change_requests (organization_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table service.journey_change_requests enable row level security;

-- leitura aberta a qualquer membro autenticado da org (mesma régua de
-- roster_assignments, que todo voluntário já lê hoje) + isolamento de tenant
create policy svc_tenant on service.journey_change_requests
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));

-- restrictive: só cria pedido pra si mesmo (member_id que resolve pro
-- próprio usuário via people.user_id = auth.uid())
create policy jcr_insert_own on service.journey_change_requests
  as restrictive for insert to authenticated
  with check (
    member_id in (
      select m.id from service.members m
      join service.people p on p.id = m.volunteer_id
      where p.user_id = auth.uid()
    )
  );

-- restrictive: só líder+ aprova/rejeita/remove (a régua de "só o líder do
-- time/GC da pessoa" é aplicada na UI, igual ao escopo já usado em
-- Escalas/Kanban — RLS aqui só garante o piso mínimo de papel)
create policy jcr_review_lead on service.journey_change_requests
  as restrictive for update to authenticated
  using (core.has_role(organization_id, 'owner', 'master', 'pastor', 'lider'))
  with check (core.has_role(organization_id, 'owner', 'master', 'pastor', 'lider'));

create policy jcr_delete_lead on service.journey_change_requests
  as restrictive for delete to authenticated
  using (core.has_role(organization_id, 'owner', 'master', 'pastor', 'lider'));
