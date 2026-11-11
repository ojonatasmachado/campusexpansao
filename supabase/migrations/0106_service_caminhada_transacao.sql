-- Caminhada: registro atômico do fato e da etapa, e aprovação sem duplicação.

create or replace function service.marcar_etapa_caminhada(
  p_member uuid,
  p_step text,
  p_date text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_index integer;
  v_title text;
  v_date date;
  v_church uuid;
  v_org uuid;
  v_timezone text;
begin
  v_index := case p_step
    when 'decisao' then 0
    when 'batismo' then 1
    when 'curso' then 2
    when 'integracao' then 3
    when 'time' then 4
    else null
  end;
  if v_index is null then
    raise exception 'Etapa da Caminhada inválida.' using errcode = '22023';
  end if;

  v_title := case p_step
    when 'decisao' then 'Decisão'
    when 'batismo' then 'Batismo nas águas'
    when 'curso' then 'Fundamentos'
    when 'integracao' then '{Grupo}'
    when 'time' then 'Servindo'
  end;
  v_date := case when nullif(p_date, '') is null then null else p_date::date end;

  update service.members as m
     set journey = (
       select pg_catalog.jsonb_agg(
         case when i = v_index then '1'::jsonb
              else coalesce(m.journey -> i, '0'::jsonb)
         end order by i
       )
       from pg_catalog.generate_series(0, 4) as gs(i)
     )
   where m.id = p_member
   returning m.organization_id, m.church_id into v_org, v_church;

  if not found then
    raise exception 'Membro não encontrado ou sem permissão para atualizar a jornada.' using errcode = '42501';
  end if;

  select coalesce(c.time_zone, 'America/Sao_Paulo') into v_timezone
    from service.churches as c
   where c.id = v_church;
  v_timezone := coalesce(v_timezone, 'America/Sao_Paulo');

  insert into service.timeline_events (
    organization_id, member_id, event_type, title, sort_key, when_label
  )
  values (
    v_org,
    p_member,
    p_step,
    v_title,
    pg_catalog.to_char(coalesce(v_date, (pg_catalog.now() at time zone v_timezone)::date), 'YYYYMMDD')::bigint,
    pg_catalog.to_char(coalesce(v_date, (pg_catalog.now() at time zone v_timezone)::date), 'DD/MM/YYYY')
  );

  return 'ok';
end;
$$;

create or replace function service.aprovar_pedido_caminhada(p_request uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_member uuid;
  v_step text;
  v_date text;
  v_status text;
  v_reviewer uuid;
  v_org uuid;
begin
  select r.member_id, r.organization_id into v_member, v_org
    from service.journey_change_requests as r
   where r.id = p_request;
  if not found then
    raise exception 'Pedido ausente ou sem permissão para aprovar.' using errcode = '42501';
  end if;

  select p.id into v_reviewer
    from service.people as p
   where p.user_id = auth.uid()
     and p.organization_id = v_org
   limit 1;
  if v_reviewer is null then
    raise exception 'Pessoa autenticada não encontrada nesta igreja.' using errcode = '42501';
  end if;

  -- A política svc_w_upd de members permite a função lider no tenant inteiro.
  -- A interface já restringe o líder ao próprio time; repetir esse escopo aqui
  -- impede que uma chamada direta à RPC amplie o acesso atual da interface.
  if not core.has_role(v_org, 'owner', 'master', 'pastor')
     and not exists (
       select 1
         from service.members as m
         left join service.fellowship_groups as g on g.id = m.group_id
        where m.id = v_member
          and (
            g.leader_person_id = v_reviewer
            or exists (
              select 1
                from service.person_ministries as target_pm
                join service.person_ministries as leader_pm
                  on leader_pm.ministry_id = target_pm.ministry_id
               where target_pm.person_id = m.volunteer_id
                 and target_pm.organization_id = v_org
                 and leader_pm.person_id = v_reviewer
                 and leader_pm.organization_id = v_org
                 and leader_pm.is_leader
            )
          )
     ) then
    raise exception 'Você não lidera o time desta pessoa.' using errcode = '42501';
  end if;

  update service.journey_change_requests as r
     set status = 'aprovado',
         reviewed_by = v_reviewer,
         reviewed_at = pg_catalog.now()
   where r.id = p_request
     and r.status = 'pendente'
  returning r.member_id, r.step, r.event_date into v_member, v_step, v_date;

  if not found then
    select r.status into v_status
      from service.journey_change_requests as r
     where r.id = p_request;
    if v_status is not null and v_status <> 'pendente' then
      return 'ja_revisado';
    end if;
    raise exception 'Pedido ausente ou sem permissão para aprovar.' using errcode = '42501';
  end if;

  perform service.marcar_etapa_caminhada(v_member, v_step, v_date);
  return 'ok';
end;
$$;

revoke all on function service.marcar_etapa_caminhada(uuid, text, text) from public;
revoke all on function service.aprovar_pedido_caminhada(uuid) from public;
grant execute on function service.marcar_etapa_caminhada(uuid, text, text) to authenticated;
grant execute on function service.aprovar_pedido_caminhada(uuid) to authenticated;
