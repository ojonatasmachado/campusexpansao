-- CE.X Service · 0046 · O app do membro evolui com a jornada (Fase 4)
--
-- No app, "Inscrever-se" num curso não fazia nada e "Quero me inscrever" no
-- batismo só mudava a tela. As tabelas só aceitam escrita da liderança
-- (0008), então as ações do membro passam por funções que conferem os
-- requisitos que a igreja definiu (service.requirements, 0043) no servidor:
--   · service.my_missing_requirements(): o que falta pro membro logado em
--     cada curso, time e no "Quero servir" (o app mostra o cadeado e o motivo);
--   · service.enroll_me(curso), service.request_baptism(turma);
--   · service.serve_requests + service.request_to_serve(time): pedido pra
--     entrar num time, aprovado pela liderança (service.review_serve_request).
-- Idempotente.

-- ── o que falta pro membro logado ────────────────────────────────────────────
create or replace function service.my_missing_requirements()
returns table (target_kind text, target_id uuid, req_kind text, req_ref text)
language sql stable security definer set search_path = service, public as $$
  select r.target_kind, r.target_id, r.req_kind, r.req_ref
  from service.members m
  cross join lateral (
    select distinct target_kind, target_id from service.requirements
    where organization_id = m.organization_id
  ) alvo
  cross join lateral service.missing_requirements(m.id, alvo.target_kind, alvo.target_id) r
  where m.id = any(service.my_members())
$$;
grant execute on function service.my_missing_requirements() to authenticated;

-- ── inscrição em curso ──────────────────────────────────────────────────────
create or replace function service.enroll_me(p_course uuid)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_member uuid;
  v_org uuid;
begin
  select c.organization_id into v_org from service.courses c where c.id = p_course;
  if v_org is null then return 'curso_inexistente'; end if;
  select m.id into v_member from service.members m
  where m.id = any(service.my_members()) and m.organization_id = v_org
  limit 1;
  if v_member is null then return 'sem_ficha'; end if;
  if exists (select 1 from service.missing_requirements(v_member, 'course', p_course)) then
    return 'faltam_requisitos';
  end if;
  insert into service.enrollments (organization_id, course_id, member_id, status)
  values (v_org, p_course, v_member, 'cursando')
  on conflict (course_id, member_id) do nothing;
  return 'ok';
end $$;
grant execute on function service.enroll_me(uuid) to authenticated;

-- ── inscrição no batismo ────────────────────────────────────────────────────
create or replace function service.request_baptism(p_class uuid)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_member uuid;
  v_org uuid;
  v_open boolean;
begin
  select b.organization_id, b.open_enrollment into v_org, v_open from service.baptism_classes b where b.id = p_class;
  if v_org is null then return 'turma_inexistente'; end if;
  if not coalesce(v_open, false) then return 'inscricoes_fechadas'; end if;
  select m.id into v_member from service.members m
  where m.id = any(service.my_members()) and m.organization_id = v_org
  limit 1;
  if v_member is null then return 'sem_ficha'; end if;
  if not exists (select 1 from service.baptism_candidates where class_id = p_class and member_id = v_member) then
    insert into service.baptism_candidates (organization_id, class_id, member_id) values (v_org, p_class, v_member);
  end if;
  return 'ok';
end $$;
grant execute on function service.request_baptism(uuid) to authenticated;

-- ── "Quero servir": pedido pra entrar num time ─────────────────────────────
create table if not exists service.serve_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  ministry_id      uuid not null references service.ministries(id) on delete cascade,
  status           text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  note             text,
  reviewed_by      uuid references service.people(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
comment on table service.serve_requests is 'Pedido do membro pra servir num time ("Quero servir"); a liderança aprova ou recusa.';
create unique index if not exists serve_requests_pendente_uniq on service.serve_requests (member_id, ministry_id) where status = 'pendente';
create index if not exists serve_requests_org_idx on service.serve_requests (organization_id, status);

alter table service.serve_requests enable row level security;
drop policy if exists svc_tenant on service.serve_requests;
create policy svc_tenant on service.serve_requests for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
-- leitura: liderança/quem cuida de times, ou o próprio pedido
drop policy if exists svc_r_scope on service.serve_requests;
create policy svc_r_scope on service.serve_requests as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['times','pessoas'])
    or member_id in (select unnest(service.my_members()))
  );
-- escrita direta só da liderança (o membro pede via request_to_serve)
drop policy if exists svc_w_all on service.serve_requests;
create policy svc_w_all on service.serve_requests as restrictive for all to authenticated
  using (service.is_lead(organization_id))
  with check (service.is_lead(organization_id));
grant select, insert, update, delete on service.serve_requests to authenticated;

create or replace function service.request_to_serve(p_ministry uuid, p_note text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_member uuid;
  v_person uuid;
  v_org uuid;
begin
  select mi.organization_id into v_org from service.ministries mi where mi.id = p_ministry;
  if v_org is null then return 'time_inexistente'; end if;
  select m.id, m.volunteer_id into v_member, v_person from service.members m
  where m.id = any(service.my_members()) and m.organization_id = v_org
  limit 1;
  if v_member is null then return 'sem_ficha'; end if;
  if v_person is null then return 'sem_ficha'; end if;
  if exists (
    select 1 from service.person_ministries where person_id = v_person and ministry_id = p_ministry
  ) then return 'ja_serve'; end if;
  if exists (select 1 from service.missing_requirements(v_member, 'serve', null))
     or exists (select 1 from service.missing_requirements(v_member, 'ministry', p_ministry)) then
    return 'faltam_requisitos';
  end if;
  insert into service.serve_requests (organization_id, member_id, ministry_id, note)
  values (v_org, v_member, p_ministry, nullif(trim(coalesce(p_note, '')), ''))
  on conflict (member_id, ministry_id) where status = 'pendente' do nothing;
  return 'ok';
end $$;
grant execute on function service.request_to_serve(uuid, text) to authenticated;

-- liderança aprova (entra no time) ou recusa
create or replace function service.review_serve_request(p_request uuid, p_approve boolean)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_req service.serve_requests%rowtype;
  v_person uuid;
  v_reviewer uuid;
begin
  select * into v_req from service.serve_requests where id = p_request;
  if v_req.id is null then return 'pedido_inexistente'; end if;
  if not service.is_lead(v_req.organization_id) then return 'sem_permissao'; end if;
  if v_req.status <> 'pendente' then return 'ja_revisado'; end if;
  select p.id into v_reviewer from service.people p
  where p.user_id = auth.uid() and p.organization_id = v_req.organization_id limit 1;

  if p_approve then
    select volunteer_id into v_person from service.members where id = v_req.member_id;
    if v_person is null then
      /* perdeu o vínculo com o app: fecha o pedido pra não travar um novo */
      update service.serve_requests set status = 'recusado', reviewed_by = v_reviewer, reviewed_at = now() where id = p_request;
      return 'sem_acesso_ao_app';
    end if;
    insert into service.person_ministries (person_id, ministry_id, organization_id, is_leader, functions)
    values (v_person, v_req.ministry_id, v_req.organization_id, false, '{}')
    on conflict (person_id, ministry_id) do nothing;
  end if;

  update service.serve_requests
  set status = case when p_approve then 'aprovado' else 'recusado' end,
      reviewed_by = v_reviewer, reviewed_at = now()
  where id = p_request;
  return 'ok';
end $$;
grant execute on function service.review_serve_request(uuid, boolean) to authenticated;
