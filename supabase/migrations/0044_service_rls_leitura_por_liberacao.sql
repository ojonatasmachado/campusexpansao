-- CE.X Service · 0044 · Leitura por papel, time e liberação (Fase 3)
--
-- Até aqui a leitura do Service era "quem é da igreja lê tudo da igreja"
-- (svc_tenant, core.can_access). Um membro comum recebia a congregação
-- inteira, visitantes e a escala de todos os times. Esta migração soma
-- policies RESTRICTIVE de SELECT (AND com o svc_tenant) nas tabelas com dado
-- de pessoa:
--   · liderança (owner/master/pastor/lider) continua lendo tudo da igreja;
--   · liberação manual (service.person_grants, código da tela) abre a leitura
--     daquela área;
--   · módulo do time (ministries.app_modules: visitantes, kids) abre a área
--     pra quem está no time;
--   · fora disso, cada um lê o que é dele e do(s) time(s) dele.
-- Isolamento entre igrejas continua no svc_tenant. Escrita não muda aqui.
-- Teste de aceitação: scripts/check-local-rls.ts (Supabase local).
-- Idempotente.

-- ── helpers (security definer: leem people/person_ministries sem cair na
--    própria RLS dessas tabelas) ─────────────────────────────────────────────

create or replace function service.is_lead(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor', 'lider')
$$;

-- pessoas (service.people) do usuário logado
create or replace function service.my_people()
returns uuid[]
language sql stable security definer set search_path = service, public as $$
  select coalesce(array_agg(id), '{}') from service.people where user_id = auth.uid()
$$;

-- fichas de membro do usuário logado
create or replace function service.my_members()
returns uuid[]
language sql stable security definer set search_path = service, public as $$
  select coalesce(array_agg(m.id), '{}')
  from service.members m
  join service.people p on p.id = m.volunteer_id
  where p.user_id = auth.uid()
$$;

-- times em que o usuário logado está
create or replace function service.my_ministries()
returns uuid[]
language sql stable security definer set search_path = service, public as $$
  select coalesce(array_agg(distinct pm.ministry_id), '{}')
  from service.person_ministries pm
  join service.people p on p.id = pm.person_id
  where p.user_id = auth.uid()
$$;

-- ele mesmo + quem serve nos mesmos times
create or replace function service.my_teammates()
returns uuid[]
language sql stable security definer set search_path = service, public as $$
  select coalesce(array_agg(distinct x.id), '{}') from (
    select p.id from service.people p where p.user_id = auth.uid()
    union
    select pm.person_id from service.person_ministries pm
    where pm.ministry_id = any(service.my_ministries())
  ) x
$$;

-- liderança, ou alguma das liberações manuais pedidas
create or replace function service.can_read(p_org uuid, p_grants text[])
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select service.is_lead(p_org)
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org
          and p.user_id = auth.uid()
          and g.grant_code = any(p_grants)
      )
$$;

-- está num time que liberou o módulo no app (visitantes, kids)
create or replace function service.has_team_module(p_org uuid, p_module text)
returns boolean
language sql stable security definer set search_path = service, public as $$
  select exists (
    select 1 from service.person_ministries pm
    join service.people p on p.id = pm.person_id
    join service.ministries mi on mi.id = pm.ministry_id
    where pm.organization_id = p_org
      and p.user_id = auth.uid()
      and p_module = any(mi.app_modules)
  )
$$;

grant execute on function service.is_lead(uuid) to authenticated;
grant execute on function service.my_people() to authenticated;
grant execute on function service.my_members() to authenticated;
grant execute on function service.my_ministries() to authenticated;
grant execute on function service.my_teammates() to authenticated;
grant execute on function service.can_read(uuid, text[]) to authenticated;
grant execute on function service.has_team_module(uuid, text) to authenticated;

-- ── policies de leitura ───────────────────────────────────────────────────
-- "in (select unnest(fn()))" em vez de chamar fn() por linha: o Postgres
-- calcula a lista uma vez por consulta.

-- pessoas (voluntários/usuários)
drop policy if exists svc_r_scope on service.people;
create policy svc_r_scope on service.people as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['pessoas','membros','times'])
    or service.has_team_module(organization_id, 'kids')
    or id in (select unnest(service.my_teammates()))
  );

-- congregação
drop policy if exists svc_r_scope on service.members;
create policy svc_r_scope on service.members as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['membros','batismos'])
    or id in (select unnest(service.my_members()))
  );

-- vínculo pessoa ↔ time
drop policy if exists svc_r_scope on service.person_ministries;
create policy svc_r_scope on service.person_ministries as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['pessoas','times'])
    or ministry_id in (select unnest(service.my_ministries()))
  );

-- escala: a própria e a dos times dele
drop policy if exists svc_r_scope on service.roster_assignments;
create policy svc_r_scope on service.roster_assignments as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['pessoas','times'])
    or person_id in (select unnest(service.my_people()))
    or position_id in (
      select mp.id from service.ministry_positions mp
      where mp.ministry_id in (select unnest(service.my_ministries()))
    )
  );

-- presença em culto/evento
drop policy if exists svc_r_scope on service.event_attendance;
create policy svc_r_scope on service.event_attendance as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['pessoas','times'])
    or person_id in (select unnest(service.my_people()))
  );

-- visitantes e anotações: liderança, liberação ou time com módulo visitantes
drop policy if exists svc_r_scope on service.visitors;
create policy svc_r_scope on service.visitors as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['visitantes'])
    or service.has_team_module(organization_id, 'visitantes')
  );

drop policy if exists svc_r_scope on service.visitor_notes;
create policy svc_r_scope on service.visitor_notes as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['visitantes'])
    or service.has_team_module(organization_id, 'visitantes')
  );

-- decisões: liderança ou a própria
drop policy if exists svc_r_scope on service.decisions;
create policy svc_r_scope on service.decisions as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['membros','visitantes'])
    or member_id in (select unnest(service.my_members()))
  );

-- batismo
drop policy if exists svc_r_scope on service.baptism_candidates;
create policy svc_r_scope on service.baptism_candidates as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['batismos','membros'])
    or member_id in (select unnest(service.my_members()))
  );

-- cursos: matrícula e presença em aula
drop policy if exists svc_r_scope on service.enrollments;
create policy svc_r_scope on service.enrollments as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['cursos','membros'])
    or member_id in (select unnest(service.my_members()))
  );

drop policy if exists svc_r_scope on service.lesson_attendance;
create policy svc_r_scope on service.lesson_attendance as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['cursos','membros'])
    or member_id in (select unnest(service.my_members()))
  );

-- jornada: linha do tempo e pedidos
drop policy if exists svc_r_scope on service.timeline_events;
create policy svc_r_scope on service.timeline_events as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['membros'])
    or member_id in (select unnest(service.my_members()))
  );

drop policy if exists svc_r_scope on service.journey_change_requests;
create policy svc_r_scope on service.journey_change_requests as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['membros'])
    or member_id in (select unnest(service.my_members()))
  );

-- pedidos de oração: pastoral (liderança) ou o próprio
drop policy if exists svc_r_scope on service.prayer_requests;
create policy svc_r_scope on service.prayer_requests as restrictive for select to authenticated
  using (
    service.is_lead(organization_id)
    or member_id in (select unnest(service.my_members()))
  );

-- leitura de avisos e inscrição de push: só o próprio (e liderança)
drop policy if exists svc_r_scope on service.announcement_reads;
create policy svc_r_scope on service.announcement_reads as restrictive for select to authenticated
  using (service.is_lead(organization_id) or person_id in (select unnest(service.my_people())));

drop policy if exists svc_r_scope on service.push_subscriptions;
create policy svc_r_scope on service.push_subscriptions as restrictive for select to authenticated
  using (person_id in (select unnest(service.my_people())));

drop policy if exists svc_r_scope on service.enquete_visto;
create policy svc_r_scope on service.enquete_visto as restrictive for select to authenticated
  using (service.is_lead(organization_id) or person_id in (select unnest(service.my_people())));

drop policy if exists svc_r_scope on service.respostas;
create policy svc_r_scope on service.respostas as restrictive for select to authenticated
  using (service.is_lead(organization_id) or person_id in (select unnest(service.my_people())));

-- reuniões: liderança; ação de reunião também pra quem é o responsável
drop policy if exists svc_r_scope on service.meetings;
create policy svc_r_scope on service.meetings as restrictive for select to authenticated
  using (service.is_lead(organization_id));

drop policy if exists svc_r_scope on service.meeting_actions;
create policy svc_r_scope on service.meeting_actions as restrictive for select to authenticated
  using (service.is_lead(organization_id) or assignee_id in (select unnest(service.my_people())));

-- ensaios: dos times dele
drop policy if exists svc_r_scope on service.rehearsals;
create policy svc_r_scope on service.rehearsals as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['times'])
    or ministry_id is null
    or ministry_id in (select unnest(service.my_ministries()))
  );

-- quadros: gerais ou dos times dele; cards e comentários seguem o quadro
drop policy if exists svc_r_scope on service.boards;
create policy svc_r_scope on service.boards as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['times'])
    or ministry_id is null
    or ministry_id in (select unnest(service.my_ministries()))
  );

drop policy if exists svc_r_scope on service.cards;
create policy svc_r_scope on service.cards as restrictive for select to authenticated
  using (board_id in (select b.id from service.boards b));

drop policy if exists svc_r_scope on service.card_comments;
create policy svc_r_scope on service.card_comments as restrictive for select to authenticated
  using (card_id in (select c.id from service.cards c));

-- conversas: participante, ou conversa do time dele (liderança vê todas)
drop policy if exists svc_r_scope on service.chats;
create policy svc_r_scope on service.chats as restrictive for select to authenticated
  using (
    service.is_lead(organization_id)
    or ministry_id in (select unnest(service.my_ministries()))
    or id in (
      select cm.chat_id from service.chat_members cm
      where cm.member_id in (select unnest(service.my_members()))
    )
  );

drop policy if exists svc_r_scope on service.chat_members;
create policy svc_r_scope on service.chat_members as restrictive for select to authenticated
  using (chat_id in (select c.id from service.chats c));

drop policy if exists svc_r_scope on service.messages;
create policy svc_r_scope on service.messages as restrictive for select to authenticated
  using (chat_id in (select c.id from service.chats c));

-- kids: liderança, liberação, time com módulo kids, ou o responsável da criança
drop policy if exists svc_r_scope on service.child_guardians;
create policy svc_r_scope on service.child_guardians as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['kids'])
    or service.has_team_module(organization_id, 'kids')
    or guardian_person_id in (select unnest(service.my_people()))
  );

drop policy if exists svc_r_scope on service.children;
create policy svc_r_scope on service.children as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['kids'])
    or service.has_team_module(organization_id, 'kids')
    or id in (
      select g.child_id from service.child_guardians g
      where g.guardian_person_id in (select unnest(service.my_people()))
    )
  );

drop policy if exists svc_r_scope on service.kids_attendance;
create policy svc_r_scope on service.kids_attendance as restrictive for select to authenticated
  using (child_id in (select ch.id from service.children ch));

drop policy if exists svc_r_scope on service.kids_event_enrollments;
create policy svc_r_scope on service.kids_event_enrollments as restrictive for select to authenticated
  using (child_id in (select ch.id from service.children ch));

-- ── dados de contato da própria ficha ───────────────────────────────────────
-- A 0008 só deixa liderança editar service.members, então o membro nunca
-- conseguia salvar e-mail/aniversário/bairro no primeiro acesso nem no
-- perfil (falhava calado). Liberar UPDATE na ficha inteira deixaria ele
-- marcar a própria jornada sem aprovação; esta função mexe só nos campos de
-- contato e só na ficha dele.
drop function if exists service.update_my_member_contact(uuid, text, text, text, text);
create or replace function service.update_my_member_contact(
  p_member uuid,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_birth text default null,
  p_postal_code text default null,
  p_street text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null
)
returns boolean
language plpgsql security definer set search_path = service, public as $$
begin
  if not (p_member = any(service.my_members())) then
    return false;
  end if;
  update service.members set
    name = coalesce(nullif(trim(p_name), ''), name),
    email = coalesce(nullif(trim(p_email), ''), email),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    birth = coalesce(nullif(p_birth, ''), birth),
    postal_code = coalesce(nullif(regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g'), ''), postal_code),
    street = coalesce(nullif(p_street, ''), street),
    neighborhood = coalesce(nullif(p_neighborhood, ''), neighborhood),
    city = coalesce(nullif(p_city, ''), city),
    state = coalesce(nullif(p_state, ''), state),
    updated_at = now()
  where id = p_member;
  return found;
end $$;

grant execute on function service.update_my_member_contact(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
