-- Service v7 4.8 · Histórico (lei 10): fatos na linha do tempo da pessoa.
-- Sem gamificação: só fatos com data (serviu, trocou, concluiu aula, entrou
-- em grupo). Batismo, decisão e curso concluído já eram gravados pelo app.
-- Quem lê: a própria pessoa; o líder, quem está nos times que ele lidera;
-- gestão e pastores (owner, master, pastor), todos; e quem recebeu a
-- liberação "membros" explicitamente.

-- ── 1. referência para não gravar o mesmo fato duas vezes ─────────────────
alter table service.timeline_events add column if not exists ref text;
comment on column service.timeline_events.ref is 'Chave do fato que o gerou (ex. evento do check-in); evita duplicar o mesmo fato.';
create unique index if not exists timeline_events_fato_unico
  on service.timeline_events (member_id, event_type, ref) where ref is not null;

-- grava um fato para todas as fichas de membro de uma pessoa (people.id)
create or replace function service.gravar_fato(p_person uuid, p_tipo text, p_titulo text, p_corpo text, p_dia date, p_ref text)
returns void
language plpgsql security definer set search_path = service, public as $$
begin
  insert into service.timeline_events (organization_id, member_id, event_type, title, body, sort_key, when_label, ref)
  select m.organization_id, m.id, p_tipo, p_titulo, p_corpo,
         to_char(coalesce(p_dia, current_date), 'YYYYMMDD')::bigint,
         to_char(coalesce(p_dia, current_date), 'DD/MM/YYYY'),
         p_ref
  from service.members m
  where m.volunteer_id = p_person
  on conflict (member_id, event_type, ref) where ref is not null do nothing;
end $$;
revoke all on function service.gravar_fato(uuid, text, text, text, date, text) from public;

-- ── 2. serviu: check-in de quem estava na escala do evento ─────────────────
create or replace function service.trg_fato_serviu()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_ev record;
  v_funcao text;
begin
  select e.name, e.event_date into v_ev from service.events e where e.id = new.event_id;
  select coalesce(mp.name, mi.name) into v_funcao
  from service.roster_assignments r
  join service.ministry_positions mp on mp.id = r.position_id
  left join service.ministries mi on mi.id = mp.ministry_id
  where r.event_id = new.event_id and r.person_id = new.person_id and r.status <> 'no'
  limit 1;
  if v_funcao is null then return new; end if;  -- presença sem escala não é "serviu"
  perform service.gravar_fato(new.person_id, 'serviu', 'Serviu · ' || coalesce(v_ev.name, 'evento'), v_funcao,
                              coalesce(v_ev.event_date, (new.checked_in_at at time zone 'America/Sao_Paulo')::date),
                              'evento:' || new.event_id);
  return new;
end $$;
drop trigger if exists fato_serviu on service.event_attendance;
create trigger fato_serviu after insert on service.event_attendance
  for each row execute function service.trg_fato_serviu();

-- ── 3. trocou: a vaga passou para outra pessoa ─────────────────────────────
create or replace function service.trg_fato_trocou()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_ev record;
begin
  if new.person_id is not distinct from old.person_id then return new; end if;
  select e.name, e.event_date into v_ev from service.events e where e.id = new.event_id;
  perform service.gravar_fato(old.person_id, 'trocou', 'Trocou a escala · ' || coalesce(v_ev.name, 'evento'), null,
                              current_date, 'vaga:' || new.id || ':' || new.person_id);
  return new;
end $$;
drop trigger if exists fato_trocou on service.roster_assignments;
create trigger fato_trocou after update of person_id on service.roster_assignments
  for each row execute function service.trg_fato_trocou();

-- ── 4. concluiu aula: o número de aulas feitas subiu ───────────────────────
create or replace function service.trg_fato_aula()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_curso text;
  i int;
begin
  if coalesce(new.done_count, 0) <= coalesce(old.done_count, 0) then return new; end if;
  select c.name into v_curso from service.courses c where c.id = new.course_id;
  for i in (coalesce(old.done_count, 0) + 1)..new.done_count loop
    insert into service.timeline_events (organization_id, member_id, event_type, title, body, sort_key, when_label, ref)
    values (new.organization_id, new.member_id, 'aula', 'Concluiu a aula ' || i, v_curso,
            to_char(current_date, 'YYYYMMDD')::bigint, to_char(current_date, 'DD/MM/YYYY'),
            'curso:' || new.course_id || ':' || i)
    on conflict (member_id, event_type, ref) where ref is not null do nothing;
  end loop;
  return new;
end $$;
drop trigger if exists fato_aula on service.enrollments;
create trigger fato_aula after update of done_count on service.enrollments
  for each row execute function service.trg_fato_aula();

-- ── 5. entrou em grupo ─────────────────────────────────────────────────────
create or replace function service.trg_fato_grupo()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_grupo text;
begin
  if new.group_id is null or new.group_id is not distinct from old.group_id then return new; end if;
  select g.name into v_grupo from service.fellowship_groups g where g.id = new.group_id;
  insert into service.timeline_events (organization_id, member_id, event_type, title, sort_key, when_label, ref)
  values (new.organization_id, new.id, 'grupo', 'Entrou no grupo ' || coalesce(v_grupo, ''),
          to_char(current_date, 'YYYYMMDD')::bigint, to_char(current_date, 'DD/MM/YYYY'), 'grupo:' || new.group_id)
  on conflict (member_id, event_type, ref) where ref is not null do nothing;
  return new;
end $$;
drop trigger if exists fato_grupo on service.members;
create trigger fato_grupo after update of group_id on service.members
  for each row execute function service.trg_fato_grupo();

-- ── 6. quem lê a história (lei 10) ─────────────────────────────────────────
-- membros que estão em algum time liderado por quem pergunta
create or replace function service.my_led_members()
returns uuid[]
language sql stable security definer set search_path = service, public as $$
  select coalesce(array_agg(distinct m.id), '{}')
  from service.person_ministries lider
  join service.people eu on eu.id = lider.person_id and eu.user_id = auth.uid()
  join service.person_ministries pm on pm.ministry_id = lider.ministry_id
  join service.members m on m.volunteer_id = pm.person_id
  where lider.is_leader
$$;
grant execute on function service.my_led_members() to authenticated;

create or replace function service.can_read_history(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor')
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org and p.user_id = auth.uid() and g.grant_code = 'membros'
      )
$$;
grant execute on function service.can_read_history(uuid) to authenticated;

drop policy if exists svc_r_scope on service.timeline_events;
create policy svc_r_scope on service.timeline_events as restrictive for select to authenticated
  using (
    service.can_read_history(organization_id)
    or member_id in (select unnest(service.my_members()))
    or member_id in (select unnest(service.my_led_members()))
  );
