-- O4: presença e progresso são uma única gravação. O membro não recebe
-- permissão para escolher done_count/status diretamente em enrollments.
create or replace function service.guard_lesson_attendance()
returns trigger language plpgsql security definer set search_path = service, core, public as $$
declare row_org uuid; row_member uuid;
begin
  row_org := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  row_member := case when tg_op = 'DELETE' then old.member_id else new.member_id end;
  if auth.uid() is not null and (
    not core.can_access(row_org, 'service') or (
      not core.has_role(row_org, 'owner', 'master', 'pastor', 'lider')
      and not (row_member = any(service.my_members()))
    )
  ) then raise exception 'attendance_forbidden' using errcode = '42501'; end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' and (new.organization_id, new.member_id, new.course_id, new.lesson_id)
    is distinct from (old.organization_id, old.member_id, old.course_id, old.lesson_id) then
    raise exception 'attendance_identity_immutable' using errcode = '23514';
  end if;
  if not exists (
    select 1 from service.course_lessons l
    join service.course_modules m on m.id = l.module_id
    join service.courses c on c.id = m.course_id
    join service.members p on p.id = new.member_id
    where l.id = new.lesson_id and c.id = new.course_id
      and l.organization_id = new.organization_id and m.organization_id = new.organization_id
      and c.organization_id = new.organization_id and p.organization_id = new.organization_id
  ) then raise exception 'attendance_course_mismatch' using errcode = '23514'; end if;
  return new;
end $$;

create or replace function service.sync_lesson_progress()
returns trigger language plpgsql security definer set search_path = service, public as $$
declare
  row_org uuid; row_course uuid; row_member uuid; enrollment_id uuid;
  completed integer; total integer;
begin
  row_org := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  row_course := case when tg_op = 'DELETE' then old.course_id else new.course_id end;
  row_member := case when tg_op = 'DELETE' then old.member_id else new.member_id end;
  -- Serializa check-ins simultâneos de aulas diferentes da mesma matrícula.
  select id into enrollment_id from service.enrollments
    where organization_id = row_org and course_id = row_course and member_id = row_member for update;
  if enrollment_id is null then
    if tg_op = 'DELETE' then return old; end if;
    raise exception 'attendance_requires_enrollment' using errcode = '23514';
  end if;
  select count(*) into total from service.course_lessons l
    join service.course_modules m on m.id = l.module_id
    where m.course_id = row_course and m.organization_id = row_org and l.organization_id = row_org;
  select count(distinct a.lesson_id) into completed from service.lesson_attendance a
    join service.course_lessons l on l.id = a.lesson_id
    join service.course_modules m on m.id = l.module_id
    where a.organization_id = row_org and a.course_id = row_course and a.member_id = row_member
      and m.course_id = row_course and m.organization_id = row_org and l.organization_id = row_org;
  update service.enrollments set done_count = completed,
    status = case when total > 0 and completed >= total then 'concluido' else 'cursando' end
    where id = enrollment_id and (done_count, status) is distinct from
      (completed, case when total > 0 and completed >= total then 'concluido' else 'cursando' end);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

revoke all on function service.guard_lesson_attendance(), service.sync_lesson_progress() from public, anon, authenticated;
drop trigger if exists guard_lesson_attendance on service.lesson_attendance;
create trigger guard_lesson_attendance before insert or update or delete on service.lesson_attendance
  for each row execute function service.guard_lesson_attendance();
drop trigger if exists sync_lesson_progress on service.lesson_attendance;
create trigger sync_lesson_progress after insert or update or delete on service.lesson_attendance
  for each row execute function service.sync_lesson_progress();

-- Recupera somente progresso comprovado que ficou para trás. Não diminui
-- conclusões importadas/manualizadas nem atribui presença sem registro.
with counts as (
  select e.id, count(distinct a.lesson_id)::integer as completed,
    (select count(*) from service.course_lessons l join service.course_modules m on m.id = l.module_id
      where m.course_id = e.course_id and m.organization_id = e.organization_id
        and l.organization_id = e.organization_id)::integer as total
  from service.enrollments e
  join service.lesson_attendance a on a.course_id = e.course_id and a.member_id = e.member_id and a.organization_id = e.organization_id
  join service.course_lessons l on l.id = a.lesson_id and l.organization_id = e.organization_id
  join service.course_modules m on m.id = l.module_id and m.course_id = e.course_id and m.organization_id = e.organization_id
  group by e.id
)
update service.enrollments e set done_count = c.completed,
  status = case when c.total > 0 and c.completed >= c.total then 'concluido' else e.status end
from counts c where e.id = c.id and e.done_count < c.completed;

notify pgrst, 'reload schema';
