-- Mapa da igreja, etapas 4 a 6: presença da igreja x moradores (IBGE).
-- "1 pessoa da igreja a cada X moradores" por bairro, setor ou área, com a
-- leitura simples: falta igreja / somos fortes / na média da cidade.
-- Números de região contam todos com ponto (com ou sem nome no mapa);
-- região com 1 ou 2 pessoas devolve -1 ("menos de 3") para ninguém deduzir quem é.

create or replace function service.mapa_municipios(p_org uuid)
returns text[]
language sql stable security definer set search_path = service, public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select municipality_ibge as x from service.churches where organization_id = p_org and municipality_ibge is not null
    union select municipality_ibge from service.members where organization_id = p_org and municipality_ibge is not null
  ) t
$$;
revoke all on function service.mapa_municipios(uuid) from public, anon;
grant execute on function service.mapa_municipios(uuid) to authenticated;

create or replace function service.mapa_regioes(p_org uuid, p_nivel text default 'bairro')
returns table (codigo text, nome text, moradores integer, area_km2 numeric, pessoas integer, grupos integer, um_a_cada integer, leitura text, vezes numeric, geojson jsonb)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_recorte extensions.geometry;
  v_mun text[];
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  if p_nivel not in ('bairro', 'setor', 'area') then raise exception 'nivel_invalido'; end if;
  v_recorte := service.mapa_recorte(p_org);
  v_mun := service.mapa_municipios(p_org);
  return query
  with reg as (
    select b.codigo, b.nome, b.moradores, b.area_km2, b.geom from service.ibge_bairros b
     where p_nivel = 'bairro' and b.municipio_ibge = any(v_mun)
    union all
    select s.codigo, 'Setor ' || right(s.codigo, 4), s.moradores, s.area_km2, s.geom from service.ibge_setores s
     where p_nivel = 'setor' and s.municipio_ibge = any(v_mun)
    union all
    select a.id::text, a.nome,
           coalesce((select sum(s.moradores)::integer from service.ibge_setores s where extensions.st_intersects(a.geom, extensions.st_pointonsurface(s.geom))), 0),
           greatest(round((extensions.st_area(a.geom::extensions.geography) / 1e6)::numeric, 2), 0.01), a.geom
      from service.map_areas a where p_nivel = 'area' and a.organization_id = p_org
  ), dentro as (
    select r.* from reg r where v_recorte is null or extensions.st_intersects(v_recorte, r.geom)
  ), pts as (
    -- uma vez só: pessoas da igreja (dentro do recorte de quem pergunta)
    select extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326) as g
      from service.members m
     where m.organization_id = p_org and m.latitude is not null
       and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)))
  ), gps as (
    select extensions.st_setsrid(extensions.st_makepoint(g.longitude, g.latitude), 4326) as g
      from service.fellowship_groups g where g.organization_id = p_org and g.latitude is not null
  ), np as (
    select d.codigo, count(p.g)::integer as n from dentro d left join pts p on extensions.st_intersects(d.geom, p.g) group by d.codigo
  ), ng as (
    select d.codigo, count(q.g)::integer as n from dentro d left join gps q on extensions.st_intersects(d.geom, q.g) group by d.codigo
  ), cont as (
    select d.codigo, d.nome, d.moradores, d.area_km2, d.geom, coalesce(np.n, 0) as n, coalesce(ng.n, 0) as ng
      from dentro d left join np on np.codigo = d.codigo left join ng on ng.codigo = d.codigo
  ), media as (
    select case when sum(c.n) > 0 then sum(c.moradores)::numeric / sum(c.n) end as um_a_cada_cidade,
           percentile_cont(0.5) within group (order by c.moradores) as moradores_mediana
      from cont c where c.moradores > 0
  )
  -- 1 ou 2 pessoas: nada que permita deduzir o número (pessoas -1, sem "1 a cada")
  select c.codigo, c.nome, c.moradores, c.area_km2,
         case when c.n between 1 and 2 then -1 else c.n end,
         c.ng,
         case when c.n >= 3 then round(c.moradores::numeric / c.n)::integer end,
         case
           when m.um_a_cada_cidade is null or c.moradores = 0 then 'media'
           when c.n < 3 and c.moradores >= m.moradores_mediana then 'falta'
           when c.n < 3 then 'media'
           when c.moradores::numeric / c.n >= 2 * m.um_a_cada_cidade and c.moradores >= m.moradores_mediana then 'falta'
           when c.moradores::numeric / c.n <= m.um_a_cada_cidade / 1.5 then 'forte'
           else 'media'
         end,
         case when m.um_a_cada_cidade is null or c.n < 3 then null else round((c.moradores::numeric / c.n) / m.um_a_cada_cidade, 1) end,
         extensions.st_asgeojson(extensions.st_simplifypreservetopology(c.geom, 0.00015), 5)::jsonb
    from cont c cross join media m
   order by c.nome;
end $$;
revoke all on function service.mapa_regioes(uuid, text) from public, anon;
grant execute on function service.mapa_regioes(uuid, text) to authenticated;

-- média da cidade (para "a cidade tem 1 a cada X") e se há dado do IBGE
create or replace function service.mapa_cidade(p_org uuid)
returns table (municipios text[], tem_ibge boolean, tem_bairros boolean, moradores bigint, pessoas bigint, um_a_cada integer)
language plpgsql stable security definer set search_path = service, public as $$
declare v_mun text[];
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  v_mun := service.mapa_municipios(p_org);
  return query
  select v_mun,
         exists (select 1 from service.ibge_setores s where s.municipio_ibge = any(v_mun)),
         exists (select 1 from service.ibge_bairros b where b.municipio_ibge = any(v_mun)),
         (select coalesce(sum(s.moradores), 0) from service.ibge_setores s where s.municipio_ibge = any(v_mun)),
         (select count(*) from service.members m where m.organization_id = p_org and m.latitude is not null),
         (select case when count(*) > 0 then round(coalesce(sum(s.moradores), 0)::numeric / (select count(*) from service.members m where m.organization_id = p_org and m.latitude is not null))::integer end
            from service.ibge_setores s where s.municipio_ibge = any(v_mun));
end $$;
revoke all on function service.mapa_cidade(uuid) from public, anon;
grant execute on function service.mapa_cidade(uuid) to authenticated;

-- números ao vivo enquanto a área é montada (bairros ou desenho). Só dentro
-- do recorte de quem monta; menos de 3 pessoas volta -1; área pequena demais
-- (menos de 0,05 km²) é recusada, para ninguém contar uma casa só.
create or replace function service.mapa_area_previa(p_org uuid, p_bairros text[], p_geojson jsonb)
returns table (pessoas integer, moradores integer, grupos integer)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_geom extensions.geometry;
  v_recorte extensions.geometry;
  v_n integer;
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  if coalesce(array_length(p_bairros, 1), 0) > 0 then
    select extensions.st_union(b.geom) into v_geom from service.ibge_bairros b where b.codigo = any(p_bairros);
  elsif p_geojson is not null then
    v_geom := extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326));
    if extensions.st_npoints(v_geom) > 500 then raise exception 'area_complexa'; end if;
  end if;
  if v_geom is null then return query select 0, 0, 0; return; end if;
  v_recorte := service.mapa_recorte(p_org);
  if v_recorte is not null then v_geom := extensions.st_intersection(v_geom, v_recorte); end if;
  if extensions.st_isempty(v_geom) or extensions.st_area(v_geom::extensions.geography) < 50000 then return query select -1, 0, 0; return; end if;
  v_n := (select count(*) from service.members m where m.organization_id = p_org and m.latitude is not null and extensions.st_intersects(v_geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)))::integer;
  return query select
    case when v_n between 1 and 2 then -1 else v_n end,
    coalesce((select sum(s.moradores) from service.ibge_setores s where extensions.st_intersects(v_geom, extensions.st_pointonsurface(s.geom))), 0)::integer,
    (select count(*) from service.fellowship_groups g where g.organization_id = p_org and g.latitude is not null and extensions.st_intersects(v_geom, extensions.st_setsrid(extensions.st_makepoint(g.longitude, g.latitude), 4326)))::integer;
end $$;
revoke all on function service.mapa_area_previa(uuid, text[], jsonb) from public, anon;
grant execute on function service.mapa_area_previa(uuid, text[], jsonb) to authenticated;

-- bairros a partir dos setores importados (a malha 2022 traz o bairro de
-- cada setor). Só o script de importação chama.
create or replace function service.mapa_montar_bairros(p_municipio text, p_nomes jsonb)
returns integer
language plpgsql security definer set search_path = service, public as $$
declare n integer;
begin
  delete from service.ibge_bairros where municipio_ibge = p_municipio;
  insert into service.ibge_bairros (codigo, municipio_ibge, nome, moradores, area_km2, geom)
  select s.bairro_codigo, p_municipio, coalesce(p_nomes->>s.bairro_codigo, 'Bairro ' || right(s.bairro_codigo, 3)),
         sum(s.moradores)::integer, greatest(sum(s.area_km2), 0.01),
         extensions.st_multi(extensions.st_collectionextract(extensions.st_makevalid(extensions.st_union(s.geom)), 3))
    from service.ibge_setores s
   where s.municipio_ibge = p_municipio and s.bairro_codigo is not null
   group by s.bairro_codigo;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function service.mapa_montar_bairros(text, jsonb) from public, anon, authenticated;
grant execute on function service.mapa_montar_bairros(text, jsonb) to service_role;
