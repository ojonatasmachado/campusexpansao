-- G14: a emergência mostra cada família como um ponto no mapa, com a
-- situação e quem marcou; ao desenhar a área, famílias e pessoas contam ao vivo.

-- famílias: + ponto (média dos pontos da família, ~10 m) e quem marcou por último
drop function if exists service.mapa_emergencia_familias(uuid);
create or replace function service.mapa_emergencia_familias(p_id uuid)
returns table (chave text, nome text, pessoas integer, bairro text, contato_member_id uuid, telefone text, status text, atualizado_em timestamptz, membros jsonb, latitude double precision, longitude double precision, marcado_por text)
language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  -- quem abriu a lista (nomes e telefones), uma vez por minuto por pessoa
  if not exists (select 1 from service.map_emergency_log l where l.emergencia_id = p_id and l.acao = 'lista' and l.por = service.mapa_eu(e.organization_id) and l.em > now() - interval '1 minute') then
    insert into service.map_emergency_log (emergencia_id, acao, por) values (p_id, 'lista', service.mapa_eu(e.organization_id));
  end if;
  return query
  with dentro as (
    select m.*, coalesce(nullif(trim(m.family), ''), m.id::text) as k
      from service.members m
     where m.organization_id = e.organization_id and m.latitude is not null
       and extensions.st_intersects(e.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326))
  )
  select d.k,
         case when count(*) > 1 or nullif(trim(min(d.family)), '') is not null then 'Família ' || coalesce(nullif(trim(min(d.family)), ''), split_part(min(d.name), ' ', 2)) else min(d.name) end,
         count(*)::integer, min(d.neighborhood),
         (array_agg(d.id order by (d.phone is null), d.created_at))[1],
         (array_agg(d.phone order by (d.phone is null), d.created_at))[1],
         coalesce(f.status, 'sem_resposta'), f.atualizado_em,
         jsonb_agg(jsonb_build_object('id', d.id, 'nome', d.name) order by d.name),
         round(avg(d.latitude)::numeric, 4)::double precision,
         round(avg(d.longitude)::numeric, 4)::double precision,
         (select p.name from service.people p where p.id = f.atualizado_por)
    from dentro d left join service.map_emergency_families f on f.emergencia_id = p_id and f.chave = d.k
   group by d.k, f.status, f.atualizado_em, f.atualizado_por
   order by case coalesce(f.status, 'sem_resposta') when 'ajuda' then 0 when 'sem_resposta' then 1 else 2 end, 2;
end $$;
revoke all on function service.mapa_emergencia_familias(uuid) from public, anon;
grant execute on function service.mapa_emergencia_familias(uuid) to authenticated;

-- contagem ao vivo enquanto a área atingida é desenhada (só quem coordena)
create or replace function service.mapa_emergencia_previa(p_org uuid, p_geojson jsonb)
returns table (familias integer, pessoas integer)
language plpgsql stable security definer set search_path = service, public as $$
declare v_geom extensions.geometry;
begin
  if not service.mapa_coordena(p_org) then raise exception 'sem_acesso'; end if;
  v_geom := extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326));
  if extensions.st_npoints(v_geom) > 2000 then raise exception 'area_complexa'; end if;
  return query
  select count(distinct coalesce(nullif(trim(m.family), ''), m.id::text))::integer, count(*)::integer
    from service.members m
   where m.organization_id = p_org and m.latitude is not null
     and extensions.st_intersects(v_geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326));
end $$;
revoke all on function service.mapa_emergencia_previa(uuid, jsonb) from public, anon;
grant execute on function service.mapa_emergencia_previa(uuid, jsonb) to authenticated;
