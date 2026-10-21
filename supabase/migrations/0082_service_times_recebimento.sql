-- Recebimento é explícito. Sem alterar pedidos anteriores nem incluir pessoas.
create or replace function service.request_to_serve(p_ministry uuid, p_note text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_member uuid;
  v_person uuid;
  v_org uuid;
  v_church uuid;
  v_ministry_name text;
  v_ministry_church uuid;
  v_aberto boolean;
  v_leader_member uuid;
  v_chat uuid;
begin
  select mi.organization_id, mi.name, mi.church_id, coalesce(mi.profile->'recebendoVoluntarios' = 'true'::jsonb, false) into v_org, v_ministry_name, v_ministry_church, v_aberto from service.ministries mi where mi.id = p_ministry;
  if v_org is null then return 'time_inexistente'; end if;
  select m.id, m.volunteer_id, m.church_id into v_member, v_person, v_church from service.members m
  where m.id = any(service.my_members()) and m.organization_id = v_org and m.church_id = v_ministry_church
  limit 1;
  if v_member is null then return 'sem_ficha'; end if;
  if v_person is null then return 'sem_ficha'; end if;
  if not v_aberto then return 'time_fechado'; end if;
  if not exists (
    select 1 from service.person_ministries pm
    join service.members lm on lm.volunteer_id = pm.person_id and lm.organization_id = v_org and lm.church_id = v_ministry_church
    where pm.ministry_id = p_ministry and pm.is_leader and lm.id <> v_member
  ) then return 'sem_lider_no_app'; end if;
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
  -- pedido repetido (já pendente): não manda a mensagem de novo
  if not found then return 'ok'; end if;

  -- conversa com o líder do time (se ele tiver ficha no app)
  select lm.id into v_leader_member
  from service.person_ministries pm
  join service.members lm on lm.volunteer_id = pm.person_id and lm.organization_id = v_org and lm.church_id = v_ministry_church
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

-- Só expõe IDs de oportunidades utilizáveis da igreja do próprio membro.
-- Não amplia a leitura de fichas, telefones ou vínculos de outras pessoas.
create or replace function service.times_recebendo_pedidos()
returns table(id uuid)
language sql stable security definer set search_path = service, public as $$
  select mi.id from service.ministries mi
  where mi.profile->'recebendoVoluntarios' = 'true'::jsonb
    and exists (select 1 from service.members me where me.id = any(service.my_members()) and me.church_id = mi.church_id and me.organization_id = mi.organization_id)
    and exists (
      select 1 from service.person_ministries pm
      join service.members lm on lm.volunteer_id = pm.person_id and lm.church_id = mi.church_id and lm.organization_id = mi.organization_id
      where pm.ministry_id = mi.id and pm.is_leader
    );
$$;
revoke all on function service.times_recebendo_pedidos() from public, anon;
grant execute on function service.times_recebendo_pedidos() to authenticated;

-- A política FOR ALL antiga também bloqueava SELECT do próprio pedido.
-- Mantém a escrita direta restrita à liderança, separada da leitura existente.
drop policy if exists svc_w_all on service.serve_requests;
drop policy if exists svc_w_insert on service.serve_requests;
create policy svc_w_insert on service.serve_requests as restrictive for insert to authenticated
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_update on service.serve_requests;
create policy svc_w_update on service.serve_requests as restrictive for update to authenticated
  using (service.is_lead(organization_id)) with check (service.is_lead(organization_id));
drop policy if exists svc_w_delete on service.serve_requests;
create policy svc_w_delete on service.serve_requests as restrictive for delete to authenticated
  using (service.is_lead(organization_id));
