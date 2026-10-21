-- Mapa da igreja, etapas 6 a 10: mesa de trabalho (com registro de CSV),
-- pontos de interesse, rotas, emergência (com registro de quem abriu cada
-- endereço) e linha do tempo. Tudo passa por mapa_acesso() (0090).

-- ── mesa de trabalho: pessoas das regiões escolhidas ──
-- Nome só de quem aceitou o termo; os outros entram só na contagem.
create or replace function service.mapa_mesa_pessoas(p_org uuid, p_codigos text[], p_nivel text default 'bairro')
returns table (id uuid, nome text, situacao text, grupo text, regiao text, ministerios text[], serve boolean, km_sede numeric, desde text)
language plpgsql stable security definer set search_path = service, public as $$
declare
  x record;
  v_recorte extensions.geometry;
  v_sede extensions.geometry;
begin
  select * into x from service.mapa_acesso(p_org);
  if not x.pode or not x.pode_mesa then raise exception 'sem_acesso'; end if;
  if x.detalhe <> 'pessoas' then return; end if;
  v_recorte := service.mapa_recorte(p_org);
  select extensions.st_setsrid(extensions.st_makepoint(c.longitude, c.latitude), 4326) into v_sede
    from service.churches c where c.organization_id = p_org and c.is_headquarters and c.latitude is not null limit 1;
  return query
  with reg as (
    select b.codigo, b.nome, b.geom from service.ibge_bairros b where p_nivel = 'bairro' and b.codigo = any(p_codigos)
    union all select s.codigo, 'Setor ' || right(s.codigo, 4), s.geom from service.ibge_setores s where p_nivel = 'setor' and s.codigo = any(p_codigos)
    union all select a.id::text, a.nome, a.geom from service.map_areas a where p_nivel = 'area' and a.organization_id = p_org and a.id::text = any(p_codigos)
  )
  select m.id, m.name, m.situation, g.name, r.nome,
         coalesce((select array_agg(distinct mi.name) from service.person_ministries pm join service.ministries mi on mi.id = pm.ministry_id where pm.person_id = m.volunteer_id), '{}'),
         exists (select 1 from service.person_ministries pm where pm.person_id = m.volunteer_id),
         case when v_sede is null then null else round((extensions.st_distance(v_sede::extensions.geography, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)::extensions.geography) / 1000)::numeric, 1) end,
         coalesce(m.since_year, extract(year from m.created_at)::text)
    from service.members m
    join reg r on extensions.st_intersects(r.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326))
    left join service.fellowship_groups g on g.id = m.group_id
   where m.organization_id = p_org and m.latitude is not null and m.map_consent_at is not null
     and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)))
   order by r.nome, m.name;
end $$;
revoke all on function service.mapa_mesa_pessoas(uuid, text[], text) from public, anon;
grant execute on function service.mapa_mesa_pessoas(uuid, text[], text) to authenticated;

-- registro de cada CSV baixado (quem, quando, o que, quantas linhas)
create table if not exists service.map_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  person_id uuid references service.people(id) on delete set null,
  partes text[] not null,
  regioes text[] not null default '{}',
  linhas integer not null default 0,
  created_at timestamptz not null default now()
);
alter table service.map_exports enable row level security;
revoke all on service.map_exports from anon, authenticated;
grant all on service.map_exports to service_role;

create or replace function service.mapa_registrar_csv(p_org uuid, p_partes text[], p_regioes text[], p_linhas integer)
returns void language plpgsql security definer set search_path = service, public as $$
begin
  if not (select pode_csv from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  insert into service.map_exports (organization_id, person_id, partes, regioes, linhas)
  values (p_org, (select p.id from service.people p where p.user_id = auth.uid() and p.organization_id = p_org limit 1), p_partes, coalesce(p_regioes, '{}'), greatest(p_linhas, 0));
end $$;
revoke all on function service.mapa_registrar_csv(uuid, text[], text[], integer) from public, anon;
grant execute on function service.mapa_registrar_csv(uuid, text[], text[], integer) to authenticated;

-- ── pontos de interesse ──
-- OpenStreetMap: cache por município e categoria, atualizado todo mês pelo
-- cron (app/lib/service-mapa-osm.ts). Manuais e ocultos ficam em map_points.
create table if not exists service.map_osm_cache (
  municipio_ibge text not null,
  categoria text not null check (categoria in ('igrejas', 'onibus', 'escolas', 'saude')),
  dados jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (municipio_ibge, categoria)
);
alter table service.map_osm_cache enable row level security;
revoke all on service.map_osm_cache from anon, authenticated;
grant all on service.map_osm_cache to service_role;

create table if not exists service.map_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 80),
  categoria text not null check (categoria in ('igrejas', 'onibus', 'escolas', 'saude', 'igreja_acao', 'igreja_casa', 'igreja_parceiro', 'igreja_encontro')),
  origem text not null default 'manual' check (origem in ('manual', 'osm')),
  osm_id text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  endereco text,
  observacao text check (observacao is null or length(observacao) <= 500),
  oculto boolean not null default false,
  criado_por uuid references service.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, osm_id)
);
create index if not exists map_points_org_idx on service.map_points (organization_id);
alter table service.map_points enable row level security;
revoke all on service.map_points from anon;
grant select, insert, update, delete on service.map_points to authenticated;
drop policy if exists map_points_ler on service.map_points;
create policy map_points_ler on service.map_points for select to authenticated using ((select pode from service.mapa_acesso(organization_id)));
drop policy if exists map_points_escrever on service.map_points;
create policy map_points_escrever on service.map_points for all to authenticated
  using ((select pode_editar from service.mapa_acesso(organization_id)))
  with check ((select pode_editar from service.mapa_acesso(organization_id)));

create or replace function service.mapa_pontos(p_org uuid)
returns table (id text, nome text, categoria text, origem text, latitude double precision, longitude double precision, endereco text, observacao text, oculto boolean, ponto_id uuid)
language plpgsql stable security definer set search_path = service, public as $$
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  return query
  select 'osm:' || (e->>'osm_id'), e->>'nome', c.categoria, 'osm', (e->>'lat')::double precision, (e->>'lng')::double precision, null::text, mp.observacao, coalesce(mp.oculto, false), mp.id
    from service.map_osm_cache c
    cross join lateral jsonb_array_elements(c.dados) e
    left join service.map_points mp on mp.organization_id = p_org and mp.osm_id = e->>'osm_id'
   where c.municipio_ibge = any(service.mapa_municipios(p_org))
  union all
  select 'm:' || mp.id::text, mp.nome, mp.categoria, 'manual', mp.latitude, mp.longitude, mp.endereco, mp.observacao, mp.oculto, mp.id
    from service.map_points mp where mp.organization_id = p_org and mp.origem = 'manual';
end $$;
revoke all on function service.mapa_pontos(uuid) from public, anon;
grant execute on function service.mapa_pontos(uuid) to authenticated;

-- municípios com mapa em uso (para o job mensal do OpenStreetMap)
create or replace function service.mapa_municipios_ativos()
returns table (municipio_ibge text, oeste double precision, sul double precision, leste double precision, norte double precision)
language sql stable security definer set search_path = service, public as $$
  select m.municipality_ibge, min(m.longitude) - 0.05, min(m.latitude) - 0.05, max(m.longitude) + 0.05, max(m.latitude) + 0.05
    from service.members m where m.municipality_ibge is not null and m.latitude is not null
   group by m.municipality_ibge
$$;
revoke all on function service.mapa_municipios_ativos() from public, anon, authenticated;
grant execute on function service.mapa_municipios_ativos() to service_role;

-- ── rotas ──
create table if not exists service.map_routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 80),
  objetivo text not null check (objetivo in ('visita', 'oracao', 'panfletagem', 'som', 'outro')),
  paradas jsonb not null default '[]'::jsonb,
  ruas_da_area boolean not null default false,
  como text not null default 'pe' check (como in ('pe', 'carro')),
  quando timestamptz,
  equipe uuid[] not null default '{}',
  trajeto jsonb,
  distancia_km numeric,
  duracao_min integer,
  criado_por uuid references service.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists map_routes_org_idx on service.map_routes (organization_id);
alter table service.map_routes enable row level security;
revoke all on service.map_routes from anon;
grant select, insert, update, delete on service.map_routes to authenticated;
-- rota guarda nomes de paradas (na visita, pessoas): só quem criou e quem
-- vê a cidade inteira leem; a equipe tem de ser desta igreja
create or replace function service.trg_map_routes_autor()
returns trigger language plpgsql security definer set search_path = service, public as $$
begin
  if tg_op = 'INSERT' then new.criado_por := (select p.id from service.people p where p.user_id = auth.uid() and p.organization_id = new.organization_id limit 1); end if;
  if tg_op = 'UPDATE' then new.criado_por := old.criado_por; new.updated_at := now(); end if;
  return new;
end $$;
drop trigger if exists map_routes_autor on service.map_routes;
create trigger map_routes_autor before insert or update on service.map_routes for each row execute function service.trg_map_routes_autor();
drop policy if exists map_routes_ler on service.map_routes;
create policy map_routes_ler on service.map_routes for select to authenticated
  using ((select x.pode from service.mapa_acesso(organization_id) x) and (criado_por = any(service.my_people()) or (select x.total from service.mapa_acesso(organization_id) x)));
drop policy if exists map_routes_escrever on service.map_routes;
create policy map_routes_escrever on service.map_routes for all to authenticated
  using ((select x.pode from service.mapa_acesso(organization_id) x) and (criado_por = any(service.my_people()) or (select x.total from service.mapa_acesso(organization_id) x)))
  with check ((select x.pode from service.mapa_acesso(organization_id) x)
    and not exists (select 1 from unnest(equipe) e where not exists (select 1 from service.people p where p.id = e and p.organization_id = map_routes.organization_id)));

-- equipe da rota: ficha (member) de cada pessoa, para mandar a mensagem
create or replace function service.mapa_fichas_de(p_org uuid, p_people uuid[])
returns table (person_id uuid, member_id uuid)
language plpgsql stable security definer set search_path = service, public as $$
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  return query select distinct on (m.volunteer_id) m.volunteer_id, m.id from service.members m
    where m.organization_id = p_org and m.volunteer_id = any(p_people) order by m.volunteer_id, m.created_at;
end $$;
revoke all on function service.mapa_fichas_de(uuid, uuid[]) from public, anon;
grant execute on function service.mapa_fichas_de(uuid, uuid[]) to authenticated;

-- ── emergência ──
-- Só quem coordena (mapa inteiro e pode editar: master, owner, pastor ou
-- liberação equivalente). O endereço só abre aqui, e cada abertura fica gravada.
create table if not exists service.map_emergencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 1 and 80),
  geom extensions.geometry(MultiPolygon, 4326) not null,
  status text not null default 'aberta' check (status in ('aberta', 'encerrada')),
  aberta_por uuid references service.people(id) on delete set null,
  aberta_em timestamptz not null default now(),
  encerrada_por uuid references service.people(id) on delete set null,
  encerrada_em timestamptz
);
create table if not exists service.map_emergency_families (
  emergencia_id uuid not null references service.map_emergencies(id) on delete cascade,
  chave text not null,
  status text not null default 'sem_resposta' check (status in ('sem_resposta', 'bem', 'ajuda')),
  nota text check (nota is null or length(nota) <= 200),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references service.people(id) on delete set null,
  primary key (emergencia_id, chave)
);
create table if not exists service.map_emergency_log (
  id uuid primary key default gen_random_uuid(),
  emergencia_id uuid not null references service.map_emergencies(id) on delete cascade,
  acao text not null check (acao in ('lista', 'csv')),
  por uuid references service.people(id) on delete set null,
  em timestamptz not null default now()
);
create table if not exists service.map_address_reveals (
  id uuid primary key default gen_random_uuid(),
  emergencia_id uuid not null references service.map_emergencies(id) on delete cascade,
  member_id uuid not null references service.members(id) on delete cascade,
  revelado_por uuid references service.people(id) on delete set null,
  revelado_em timestamptz not null default now()
);
alter table service.map_emergencies enable row level security;
alter table service.map_emergency_families enable row level security;
alter table service.map_address_reveals enable row level security;
alter table service.map_emergency_log enable row level security;
revoke all on service.map_emergencies, service.map_emergency_families, service.map_address_reveals, service.map_emergency_log from anon, authenticated;
grant all on service.map_emergencies, service.map_emergency_families, service.map_address_reveals, service.map_emergency_log to service_role;

create or replace function service.mapa_coordena(p_org uuid)
returns boolean language sql stable security definer set search_path = service, public as $$
  select coalesce((select x.total and x.pode_editar from service.mapa_acesso(p_org) x), false)
$$;
revoke all on function service.mapa_coordena(uuid) from public, anon;
grant execute on function service.mapa_coordena(uuid) to authenticated;

create or replace function service.mapa_eu(p_org uuid)
returns uuid language sql stable security definer set search_path = service, public as $$
  select p.id from service.people p where p.user_id = auth.uid() and p.organization_id = p_org limit 1
$$;

create or replace function service.mapa_emergencia_abrir(p_org uuid, p_titulo text, p_geojson jsonb)
returns uuid language plpgsql security definer set search_path = service, public as $$
declare v_id uuid; v_geom extensions.geometry;
begin
  if not service.mapa_coordena(p_org) then raise exception 'sem_acesso'; end if;
  v_geom := extensions.st_multi(extensions.st_collectionextract(extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326)), 3));
  if v_geom is null or extensions.st_isempty(v_geom) then raise exception 'area_vazia'; end if;
  -- área atingida, não a cidade: até 30 km²
  if extensions.st_area(v_geom::extensions.geography) > 30e6 then raise exception 'area_grande'; end if;
  insert into service.map_emergencies (organization_id, titulo, geom, aberta_por) values (p_org, trim(p_titulo), v_geom, service.mapa_eu(p_org)) returning id into v_id;
  return v_id;
end $$;

create or replace function service.mapa_emergencias(p_org uuid)
returns table (id uuid, titulo text, status text, aberta_em timestamptz, encerrada_em timestamptz, geojson jsonb)
language plpgsql stable security definer set search_path = service, public as $$
begin
  if not service.mapa_coordena(p_org) then raise exception 'sem_acesso'; end if;
  return query select e.id, e.titulo, e.status, e.aberta_em, e.encerrada_em, extensions.st_asgeojson(e.geom, 6)::jsonb
    from service.map_emergencies e where e.organization_id = p_org order by e.aberta_em desc limit 20;
end $$;

-- famílias na área: agrupa por members.family (sem família = a pessoa)
create or replace function service.mapa_emergencia_familias(p_id uuid)
returns table (chave text, nome text, pessoas integer, bairro text, contato_member_id uuid, telefone text, status text, atualizado_em timestamptz, membros jsonb)
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
         jsonb_agg(jsonb_build_object('id', d.id, 'nome', d.name) order by d.name)
    from dentro d left join service.map_emergency_families f on f.emergencia_id = p_id and f.chave = d.k
   group by d.k, f.status, f.atualizado_em
   order by case coalesce(f.status, 'sem_resposta') when 'ajuda' then 0 when 'sem_resposta' then 1 else 2 end, 2;
end $$;

create or replace function service.mapa_emergencia_status(p_id uuid, p_chave text, p_status text, p_nota text default null)
returns void language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  if e.status <> 'aberta' then raise exception 'encerrada'; end if;
  if p_status not in ('sem_resposta', 'bem', 'ajuda') then raise exception 'status_invalido'; end if;
  -- a chave tem de ser de alguém que mora na área
  if not exists (select 1 from service.members m where m.organization_id = e.organization_id and m.latitude is not null
      and coalesce(nullif(trim(m.family), ''), m.id::text) = p_chave
      and extensions.st_intersects(e.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326))) then raise exception 'fora_da_area'; end if;
  insert into service.map_emergency_families (emergencia_id, chave, status, nota, atualizado_por) values (p_id, p_chave, p_status, p_nota, service.mapa_eu(e.organization_id))
  on conflict (emergencia_id, chave) do update set status = excluded.status, nota = coalesce(excluded.nota, service.map_emergency_families.nota), atualizado_em = now(), atualizado_por = excluded.atualizado_por;
end $$;

-- endereço: só com a emergência aberta, só de quem está na área, e grava antes de devolver
create or replace function service.mapa_revelar_endereco(p_id uuid, p_member_id uuid)
returns table (rua text, numero text, complemento text, bairro text, cidade text, cep text)
language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype; m service.members%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  if e.status <> 'aberta' then raise exception 'encerrada'; end if;
  select * into m from service.members where id = p_member_id and organization_id = e.organization_id;
  if not found or m.latitude is null or not extensions.st_intersects(e.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)) then raise exception 'fora_da_area'; end if;
  insert into service.map_address_reveals (emergencia_id, member_id, revelado_por) values (p_id, p_member_id, service.mapa_eu(e.organization_id));
  return query select m.street, m.street_number, m.complement, m.neighborhood, m.city, m.postal_code;
end $$;

create or replace function service.mapa_emergencia_aberturas(p_id uuid)
returns table (member_id uuid, quem text, quando timestamptz)
language plpgsql stable security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  return query select r.member_id, p.name, r.revelado_em from service.map_address_reveals r left join service.people p on p.id = r.revelado_por where r.emergencia_id = p_id order by r.revelado_em desc;
end $$;

create or replace function service.mapa_emergencia_registrar_csv(p_id uuid)
returns void language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  insert into service.map_emergency_log (emergencia_id, acao, por) values (p_id, 'csv', service.mapa_eu(e.organization_id));
end $$;

create or replace function service.mapa_emergencia_encerrar(p_id uuid)
returns void language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  update service.map_emergencies set status = 'encerrada', encerrada_em = now(), encerrada_por = service.mapa_eu(e.organization_id) where id = p_id;
end $$;

do $$ declare f text; begin
  foreach f in array array['mapa_emergencia_abrir(uuid, text, jsonb)', 'mapa_emergencias(uuid)', 'mapa_emergencia_familias(uuid)', 'mapa_emergencia_status(uuid, text, text, text)', 'mapa_revelar_endereco(uuid, uuid)', 'mapa_emergencia_aberturas(uuid)', 'mapa_emergencia_encerrar(uuid)', 'mapa_emergencia_registrar_csv(uuid)', 'mapa_eu(uuid)'] loop
    execute format('revoke all on function service.%s from public, anon', f);
    execute format('grant execute on function service.%s to authenticated', f);
  end loop;
end $$;

-- ── linha do tempo ──
-- Entrada na igreja: ano de "membro desde" (1º de janeiro) ou a data do cadastro.
-- Usa o endereço de hoje (o Service não guarda mudança de endereço).
create or replace function service.mapa_entrada(m service.members)
returns date language sql immutable as $$
  select case when m.since_year ~ '^\d{4}$' then make_date(m.since_year::int, 1, 1) else m.created_at::date end
$$;

create or replace function service.mapa_crescimento(p_org uuid, p_de date, p_ate date, p_nivel text default 'bairro')
returns table (codigo text, nome text, antes integer, novos integer, latitude double precision, longitude double precision)
language plpgsql stable security definer set search_path = service, public as $$
declare v_recorte extensions.geometry; v_mun text[];
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  v_recorte := service.mapa_recorte(p_org);
  v_mun := service.mapa_municipios(p_org);
  return query
  with reg as (
    select b.codigo, b.nome, b.geom from service.ibge_bairros b where p_nivel = 'bairro' and b.municipio_ibge = any(v_mun)
    union all select s.codigo, 'Setor ' || right(s.codigo, 4), s.geom from service.ibge_setores s where p_nivel = 'setor' and s.municipio_ibge = any(v_mun)
  ), pts as (
    select service.mapa_entrada(m) as entrada, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326) as g
      from service.members m where m.organization_id = p_org and m.latitude is not null
       and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)))
  )
  -- 1 ou 2 viram -1 ("menos de 3"): ninguém deduz quem entrou e quando
  select r.codigo, r.nome,
         (case when count(p.g) filter (where p.entrada <= p_de) between 1 and 2 then -1 else count(p.g) filter (where p.entrada <= p_de) end)::integer,
         (case when count(p.g) filter (where p.entrada > p_de and p.entrada <= p_ate) between 1 and 2 then -1 else count(p.g) filter (where p.entrada > p_de and p.entrada <= p_ate) end)::integer,
         extensions.st_y(extensions.st_pointonsurface(r.geom)), extensions.st_x(extensions.st_pointonsurface(r.geom))
    from reg r left join pts p on extensions.st_intersects(r.geom, p.g)
   where v_recorte is null or extensions.st_intersects(v_recorte, r.geom)
   group by r.codigo, r.nome, r.geom
   order by 4 desc, 2;
end $$;
revoke all on function service.mapa_crescimento(uuid, date, date, text) from public, anon;
grant execute on function service.mapa_crescimento(uuid, date, date, text) to authenticated;

-- total acumulado por mês, para o gráfico da linha do tempo
create or replace function service.mapa_crescimento_serie(p_org uuid)
returns table (mes date, total integer)
language plpgsql stable security definer set search_path = service, public as $$
declare v_recorte extensions.geometry;
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  v_recorte := service.mapa_recorte(p_org);
  return query
  with e as (
    select date_trunc('month', service.mapa_entrada(m))::date as mes from service.members m
     where m.organization_id = p_org and m.latitude is not null
       and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)))
  ), meses as (
    select generate_series(coalesce((select min(e.mes) from e), date_trunc('month', now())::date), date_trunc('month', now())::date, interval '1 month')::date as mes
  )
  select ms.mes, (select count(*) from e where e.mes <= ms.mes)::integer from meses ms order by ms.mes;
end $$;
revoke all on function service.mapa_crescimento_serie(uuid) from public, anon;
grant execute on function service.mapa_crescimento_serie(uuid) to authenticated;
