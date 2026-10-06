-- Service v7 4.5 · o que o evento pede ao membro, valor e instruções, e as
-- confirmações de presença e inscrições feitas pelo app.
-- Só aviso (padrão), confirmar presença ou inscrição. O app não recebe nem
-- confirma pagamento: com valor, mostra o valor e as instruções da igreja.

alter table service.events add column if not exists pede text not null default 'aviso';
alter table service.events drop constraint if exists events_pede_check;
alter table service.events add constraint events_pede_check check (pede in ('aviso', 'presenca', 'inscricao'));
alter table service.events add column if not exists valor text;
alter table service.events add column if not exists instrucoes text;
comment on column service.events.pede is 'O que o evento pede ao membro: aviso (só informa), presenca (confirmar presença) ou inscricao.';
comment on column service.events.valor is 'Valor como a igreja escreve (ex. "R$ 50"). Só exibido; o app não recebe pagamento.';
comment on column service.events.instrucoes is 'Instruções da igreja para quem vai: chave PIX, prazo, contato.';

create table if not exists service.event_rsvps (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  event_id         uuid not null references service.events(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  kind             text not null check (kind in ('presenca', 'inscricao')),
  created_at       timestamptz not null default now(),
  unique (event_id, person_id)
);
comment on table service.event_rsvps is 'Presença confirmada ou inscrição num evento, feita pela própria pessoa no app (v7 4.5).';
create index if not exists event_rsvps_event_idx on service.event_rsvps (event_id);

alter table service.event_rsvps enable row level security;
drop policy if exists svc_tenant on service.event_rsvps;
create policy svc_tenant on service.event_rsvps for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
-- leitura: liderança ou a própria linha (igual às respostas do Mural, 0049)
drop policy if exists svc_r_scope on service.event_rsvps;
create policy svc_r_scope on service.event_rsvps as restrictive for select to authenticated
  using (service.is_lead(organization_id) or person_id in (select unnest(service.my_people())));
-- escrita direta só da liderança; a pessoa responde pela função abaixo
drop policy if exists svc_w_ins on service.event_rsvps;
create policy svc_w_ins on service.event_rsvps as restrictive for insert to authenticated
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_upd on service.event_rsvps;
create policy svc_w_upd on service.event_rsvps as restrictive for update to authenticated
  using (service.is_lead(organization_id))
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_del on service.event_rsvps;
create policy svc_w_del on service.event_rsvps as restrictive for delete to authenticated
  using (service.is_lead(organization_id));
grant select, insert, update, delete on service.event_rsvps to authenticated;

-- a pessoa confirma (p_vai = true) ou desfaz (false). O tipo vem do evento.
create or replace function service.respond_event(p_event uuid, p_vai boolean)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_pede text;
  v_person uuid;
begin
  select e.organization_id, e.pede into v_org, v_pede from service.events e where e.id = p_event;
  if v_org is null then return 'inexistente'; end if;
  if v_pede not in ('presenca', 'inscricao') then return 'nao_pede'; end if;
  select p.id into v_person from service.people p
  where p.id = any(service.my_people()) and p.organization_id = v_org limit 1;
  if v_person is null then return 'sem_ficha'; end if;
  if not coalesce(p_vai, false) then
    delete from service.event_rsvps where event_id = p_event and person_id = v_person;
    return 'ok';
  end if;
  insert into service.event_rsvps (organization_id, event_id, person_id, kind)
  values (v_org, p_event, v_person, v_pede)
  on conflict (event_id, person_id) do update set kind = excluded.kind, created_at = now();
  return 'ok';
end $$;
grant execute on function service.respond_event(uuid, boolean) to authenticated;
