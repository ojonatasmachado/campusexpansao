-- Service v7 5.1 · Medição padrão (lei 11): cada cartão emite card_shown,
-- card_acted e card_dismissed; cada aviso, notification_sent e
-- notification_opened. Sem identificar a pessoa (lei 10: nada de percentual
-- ou ranking sobre pessoas): só a igreja, o módulo, o tipo e a referência
-- (id do cartão ou categoria do aviso). Lido só por dono e master.

create table if not exists service.app_events (
  id               bigint generated always as identity primary key,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  evento           text not null check (evento in ('card_shown', 'card_acted', 'card_dismissed', 'notification_sent', 'notification_opened')),
  modulo           text,
  tipo             text,
  ref              text,
  created_at       timestamptz not null default now()
);
comment on table service.app_events is 'Eventos de medição do Service (lei 11), sem dado da pessoa.';
create index if not exists app_events_org_idx on service.app_events (organization_id, evento, created_at desc);

alter table service.app_events enable row level security;
drop policy if exists svc_tenant on service.app_events;
create policy svc_tenant on service.app_events for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
drop policy if exists svc_r_scope on service.app_events;
create policy svc_r_scope on service.app_events as restrictive for select to authenticated
  using (core.has_role(organization_id, 'owner', 'master'));
-- qualquer pessoa da igreja registra; ninguém altera nem apaga
drop policy if exists svc_w_upd on service.app_events;
create policy svc_w_upd on service.app_events as restrictive for update to authenticated using (false);
drop policy if exists svc_w_del on service.app_events;
create policy svc_w_del on service.app_events as restrictive for delete to authenticated using (false);
grant select, insert on service.app_events to authenticated;
