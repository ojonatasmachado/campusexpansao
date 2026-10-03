-- CE.X Service · 0049 · App do membro v6
--
-- Corrige duas coisas que o membro não conseguia fazer pelo app (o banco
-- bloqueava desde as regras de leitura da 0044 e de escrita da 0008):
--   1. confirmar ou recusar a própria escala;
--   2. começar uma conversa (falar com um líder, pedido de oração, pedir troca).
-- E acrescenta o que o app v6 precisa:
--   3. "Quando posso servir": a pessoa marca os cultos em que pode ser escalada;
--   4. Mural com "Vou / Não vou" nas publicações de evento;
--   5. "Quero servir" abre uma conversa com o líder do time;
--   6. curso pode ficar fora do app (não publicado).
-- Tudo passa por funções que conferem, no servidor, que a pessoa só mexe no
-- que é dela. Idempotente.

-- ── 1. responder a própria escala ───────────────────────────────────────────
create or replace function service.respond_my_assignment(p_assignment uuid, p_status text)
returns text
language plpgsql security definer set search_path = service, public as $$
begin
  if p_status not in ('ok', 'no', 'wait') then return 'status_invalido'; end if;
  update service.roster_assignments ra
  set status = p_status, updated_at = now()
  where ra.id = p_assignment
    and ra.person_id in (select unnest(service.my_people()));
  if not found then return 'nao_encontrada'; end if;
  return 'ok';
end $$;
grant execute on function service.respond_my_assignment(uuid, text) to authenticated;

-- ── 2. conversa direta com alguém da mesma igreja ──────────────────────────
-- Reaproveita a conversa que já existe entre os dois; manda a primeira
-- mensagem quando vier texto. Devolve o id da conversa.
create or replace function service.start_dm(p_target_member uuid, p_body text default null)
returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_me uuid;
  v_org uuid;
  v_church uuid;
  v_chat uuid;
begin
  select m.id, m.organization_id, m.church_id into v_me, v_org, v_church
  from service.members m
  join service.members t on t.organization_id = m.organization_id and t.id = p_target_member
  where m.id = any(service.my_members())
  limit 1;
  if v_me is null or v_me = p_target_member then return null; end if;

  select c.id into v_chat
  from service.chats c
  where c.kind = 'dm' and c.organization_id = v_org
    and exists (select 1 from service.chat_members a where a.chat_id = c.id and a.member_id = v_me)
    and exists (select 1 from service.chat_members b where b.chat_id = c.id and b.member_id = p_target_member)
  limit 1;

  if v_chat is null then
    insert into service.chats (organization_id, church_id, kind, name)
    values (v_org, v_church, 'dm', null)
    returning id into v_chat;
    insert into service.chat_members (organization_id, chat_id, member_id)
    values (v_org, v_chat, v_me), (v_org, v_chat, p_target_member);
  end if;

  if nullif(btrim(coalesce(p_body, '')), '') is not null then
    insert into service.messages (organization_id, chat_id, sender_id, body)
    values (v_org, v_chat, v_me, btrim(p_body));
  end if;
  return v_chat;
end $$;
grant execute on function service.start_dm(uuid, text) to authenticated;

-- ── 3. "Quando posso servir" ────────────────────────────────────────────────
-- availability é {chave_do_culto: true/false}; só a da própria pessoa.
create or replace function service.update_my_availability(p_availability jsonb)
returns text
language plpgsql security definer set search_path = service, public as $$
begin
  if jsonb_typeof(p_availability) <> 'object' then return 'invalido'; end if;
  update service.people
  set availability = p_availability, updated_at = now()
  where id in (select unnest(service.my_people()));
  return 'ok';
end $$;
grant execute on function service.update_my_availability(jsonb) to authenticated;

-- ── 4. Mural: publicação de evento com "Vou / Não vou" ─────────────────────
alter table service.announcements add column if not exists kind text not null default 'aviso';
do $$ begin
  alter table service.announcements add constraint announcements_kind_chk check (kind in ('aviso', 'evento', 'acao'));
exception when duplicate_object then null; end $$;

create table if not exists service.announcement_responses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  announcement_id  uuid not null references service.announcements(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  response         text not null check (response in ('vou', 'nao')),
  responded_at     timestamptz not null default now(),
  unique (announcement_id, person_id)
);
comment on table service.announcement_responses is 'Resposta "Vou / Não vou" a uma publicação de evento do Mural.';
alter table service.announcement_responses enable row level security;
drop policy if exists svc_tenant on service.announcement_responses;
create policy svc_tenant on service.announcement_responses for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
-- leitura: liderança ou a própria resposta (igual à leitura dos avisos)
drop policy if exists svc_r_scope on service.announcement_responses;
create policy svc_r_scope on service.announcement_responses as restrictive for select to authenticated
  using (service.is_lead(organization_id) or person_id in (select unnest(service.my_people())));
-- escrita direta só da liderança; a pessoa responde pela função abaixo
drop policy if exists svc_w_all on service.announcement_responses;
create policy svc_w_all on service.announcement_responses as restrictive for all to authenticated
  using (service.is_lead(organization_id))
  with check (service.is_lead(organization_id));
grant select, insert, update, delete on service.announcement_responses to authenticated;

create or replace function service.respond_announcement(p_announcement uuid, p_response text)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_person uuid;
begin
  select a.organization_id into v_org from service.announcements a where a.id = p_announcement;
  if v_org is null then return 'inexistente'; end if;
  select p.id into v_person from service.people p
  where p.id = any(service.my_people()) and p.organization_id = v_org limit 1;
  if v_person is null then return 'sem_ficha'; end if;
  if p_response is null then
    delete from service.announcement_responses where announcement_id = p_announcement and person_id = v_person;
    return 'ok';
  end if;
  if p_response not in ('vou', 'nao') then return 'invalido'; end if;
  insert into service.announcement_responses (organization_id, announcement_id, person_id, response)
  values (v_org, p_announcement, v_person, p_response)
  on conflict (announcement_id, person_id) do update set response = excluded.response, responded_at = now();
  return 'ok';
end $$;
grant execute on function service.respond_announcement(uuid, text) to authenticated;

-- ── 5. "Quero servir" já abre a conversa com o líder do time ───────────────
create or replace function service.request_to_serve(p_ministry uuid, p_note text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_member uuid;
  v_person uuid;
  v_org uuid;
  v_church uuid;
  v_ministry_name text;
  v_leader_member uuid;
  v_chat uuid;
begin
  select mi.organization_id, mi.name into v_org, v_ministry_name from service.ministries mi where mi.id = p_ministry;
  if v_org is null then return 'time_inexistente'; end if;
  select m.id, m.volunteer_id, m.church_id into v_member, v_person, v_church from service.members m
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

  -- conversa com o líder do time (se ele tiver ficha no app)
  select lm.id into v_leader_member
  from service.person_ministries pm
  join service.members lm on lm.volunteer_id = pm.person_id and lm.organization_id = v_org
  where pm.ministry_id = p_ministry and pm.is_leader and lm.id <> v_member
  limit 1;
  if v_leader_member is not null then
    select c.id into v_chat
    from service.chats c
    where c.kind = 'dm' and c.organization_id = v_org
      and exists (select 1 from service.chat_members a where a.chat_id = c.id and a.member_id = v_member)
      and exists (select 1 from service.chat_members b where b.chat_id = c.id and b.member_id = v_leader_member)
    limit 1;
    if v_chat is null then
      insert into service.chats (organization_id, church_id, kind, name)
      values (v_org, v_church, 'dm', null)
      returning id into v_chat;
      insert into service.chat_members (organization_id, chat_id, member_id)
      values (v_org, v_chat, v_member), (v_org, v_chat, v_leader_member);
    end if;
    insert into service.messages (organization_id, chat_id, sender_id, body)
    values (v_org, v_chat, v_member, 'Oi! Pedi para servir no time ' || v_ministry_name || '. Podemos conversar?');
  end if;
  return 'ok';
end $$;
grant execute on function service.request_to_serve(uuid, text) to authenticated;

-- ── 6. curso fora do app ────────────────────────────────────────────────────
alter table service.courses add column if not exists published boolean not null default true;
comment on column service.courses.published is 'false: o curso não aparece no app do membro (rascunho).';
