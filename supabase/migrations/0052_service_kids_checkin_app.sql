-- CE.X Service · 0052 · Check-in da criança pelo app do responsável (v7 2.3)
--
-- Até aqui o check-in do responsável só existia pela rota do QR
-- (/service/kids-checkin?session=...), e a sessão da turma só nascia quando o
-- professor abria a tela de check-in no painel. No dia do culto o app mostra o
-- cartão de cada filho; a partir de 60 minutos antes do culto o responsável
-- faz o check-in ali mesmo.
--
-- Esta função devolve a sessão da turma da criança naquele culto, criando a
-- sessão se o professor ainda não abriu (a escrita direta em kids_sessions é
-- só da liderança, 0017). Confere: a pessoa logada é responsável pela
-- criança, a criança tem turma, o culto é hoje (horário de Brasília) e já
-- passou a hora de abrir. Sessão desligada pelo professor não reabre.
-- O registro da presença continua sendo o mesmo insert em kids_attendance
-- que a rota do QR já faz (app/service/lib/kids-checkin.ts).
-- Idempotente.

create or replace function service.kids_checkin_session(p_event uuid, p_child uuid)
returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_class uuid;
  v_date date;
  v_time text;
  v_now timestamp := (now() at time zone 'America/Sao_Paulo');
  v_session uuid;
  v_active boolean;
begin
  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  v_org := (select ch.organization_id from service.children ch
            where ch.id = p_child
              and exists (select 1 from service.child_guardians g
                          where g.child_id = ch.id and g.guardian_person_id in (select unnest(service.my_people()))));
  v_class := (select ch.class_id from service.children ch where ch.id = p_child and v_org is not null);
  if v_org is null or v_class is null then return null; end if;

  v_date := (select e.event_date from service.events e where e.id = p_event and e.organization_id = v_org);
  v_time := (select e.time from service.events e where e.id = p_event and e.organization_id = v_org);
  if v_date is null or v_date <> v_now::date then return null; end if;

  -- abre 60 minutos antes do culto (sem hora marcada: o dia todo)
  if v_time ~ '^\d{1,2}:\d{2}' and v_now < (v_date + substring(v_time from '^\d{1,2}:\d{2}')::time - interval '60 minutes') then
    return null;
  end if;

  v_session := (select s.id from service.kids_sessions s where s.event_id = p_event and s.class_id = v_class);

  if v_session is null then
    insert into service.kids_sessions (organization_id, event_id, class_id, checkin_token, checkin_active)
    values (v_org, p_event, v_class, md5(gen_random_uuid()::text), true)
    on conflict (event_id, class_id) do nothing;
    v_session := (select s.id from service.kids_sessions s where s.event_id = p_event and s.class_id = v_class);
  end if;
  v_active := (select s.checkin_active from service.kids_sessions s where s.id = v_session);

  if not coalesce(v_active, false) then return null; end if;
  return v_session;
end $$;

revoke all on function service.kids_checkin_session(uuid, uuid) from public;
grant execute on function service.kids_checkin_session(uuid, uuid) to authenticated;
