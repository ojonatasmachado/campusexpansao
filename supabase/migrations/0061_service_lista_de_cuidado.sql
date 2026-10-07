-- Service v7 4.17 · Lista de cuidado: quem está há semanas sem presença.
-- A lista é calculada no painel a partir da presença (check-in); aqui ficam
-- só as marcações de quem cuida: contato feito (ligação, mensagem, visita) e
-- ausência justificada (tira da lista por 30 dias). O membro nunca vê nada
-- disso: nem a marcação, nem o fato "contato" na própria história.

create table if not exists service.care_marks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  kind             text not null check (kind in ('contato', 'justificada')),
  via              text check (via in ('ligacao', 'mensagem', 'visita')),
  until            date,
  by_person        uuid references service.people(id) on delete set null,
  created_at       timestamptz not null default now()
);
comment on table service.care_marks is 'Lista de cuidado (v7 4.17): contato registrado ou ausência justificada. Só a liderança lê e escreve.';
create index if not exists care_marks_person_idx on service.care_marks (person_id, created_at desc);

alter table service.care_marks enable row level security;
drop policy if exists svc_tenant on service.care_marks;
create policy svc_tenant on service.care_marks for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
drop policy if exists svc_r_scope on service.care_marks;
create policy svc_r_scope on service.care_marks as restrictive for select to authenticated
  using (service.is_lead(organization_id));
drop policy if exists svc_w_ins on service.care_marks;
create policy svc_w_ins on service.care_marks as restrictive for insert to authenticated
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_upd on service.care_marks;
create policy svc_w_upd on service.care_marks as restrictive for update to authenticated
  using (service.is_lead(organization_id)) with check (service.is_lead(organization_id));
drop policy if exists svc_w_del on service.care_marks;
create policy svc_w_del on service.care_marks as restrictive for delete to authenticated
  using (service.is_lead(organization_id));
grant select, insert, update, delete on service.care_marks to authenticated;

-- registra a marcação e, no contato, o fato na história (lei 10)
create or replace function service.registrar_cuidado(p_person uuid, p_kind text, p_via text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_eu uuid;
  v_nome text;
begin
  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  v_org := (select p.organization_id from service.people p where p.id = p_person);
  if v_org is null then return 'inexistente'; end if;
  if not service.is_lead(v_org) then return 'sem_permissao'; end if;
  if p_kind not in ('contato', 'justificada') then return 'invalido'; end if;
  if p_kind = 'contato' and coalesce(p_via, '') not in ('ligacao', 'mensagem', 'visita') then return 'invalido'; end if;
  v_eu := (select p.id from service.people p where p.id = any(service.my_people()) and p.organization_id = v_org order by p.id limit 1);
  v_nome := (select p.name from service.people p where p.id = v_eu);
  insert into service.care_marks (organization_id, person_id, kind, via, until, by_person)
  values (v_org, p_person, p_kind, case when p_kind = 'contato' then p_via end,
          case when p_kind = 'justificada' then current_date + 30 end, v_eu);
  if p_kind = 'contato' then
    perform service.gravar_fato(p_person, 'contato_cuidado',
      'Contato · ' || case p_via when 'ligacao' then 'ligação' when 'mensagem' then 'mensagem' else 'visita' end,
      v_nome, current_date, null);
  end if;
  return 'ok';
end $$;
grant execute on function service.registrar_cuidado(uuid, text, text) to authenticated;

-- a própria pessoa não vê o fato "contato" na sua história
drop policy if exists svc_r_scope on service.timeline_events;
create policy svc_r_scope on service.timeline_events as restrictive for select to authenticated
  using (
    service.can_read_history(organization_id)
    or (member_id in (select unnest(service.my_members())) and event_type <> 'contato_cuidado')
    or member_id in (select unnest(service.my_led_members()))
  );
