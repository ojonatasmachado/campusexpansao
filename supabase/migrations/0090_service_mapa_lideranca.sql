-- Mapa da igreja, etapas 3, 4 e 5 (docs/service-v7/mapa/PLANO.md, seção 4).
-- Quem vê o mapa e o quê; áreas desenhadas pela igreja; pontos das pessoas
-- já recortados no servidor. Nenhuma tela lê members.latitude direto: tudo
-- passa por estas funções, que aplicam o recorte da área, o consentimento e
-- o arredondamento (~100 m). Endereço nunca sai daqui.

-- ── IBGE, Censo 2022 (etapa 4): dados públicos, importados por município
-- (scripts/ibge/importar-malha.ts). Moradores = população residente.
create table if not exists service.ibge_setores (
  codigo text primary key,
  municipio_ibge text not null,
  bairro_codigo text,
  moradores integer not null default 0 check (moradores >= 0),
  domicilios integer,
  area_km2 numeric not null check (area_km2 > 0),
  geom extensions.geometry(MultiPolygon, 4326) not null,
  fonte text not null default 'ibge:censo:2022',
  ano integer not null default 2022
);
create index if not exists ibge_setores_mun_idx on service.ibge_setores (municipio_ibge);
create index if not exists ibge_setores_geom_idx on service.ibge_setores using gist (geom);

create table if not exists service.ibge_bairros (
  codigo text primary key,
  municipio_ibge text not null,
  nome text not null,
  moradores integer not null default 0 check (moradores >= 0),
  area_km2 numeric not null check (area_km2 > 0),
  geom extensions.geometry(MultiPolygon, 4326) not null,
  fonte text not null default 'ibge:censo:2022',
  ano integer not null default 2022
);
create index if not exists ibge_bairros_mun_idx on service.ibge_bairros (municipio_ibge);
create index if not exists ibge_bairros_geom_idx on service.ibge_bairros using gist (geom);

alter table service.ibge_setores enable row level security;
alter table service.ibge_bairros enable row level security;
revoke all on service.ibge_setores, service.ibge_bairros from anon;
grant select on service.ibge_setores, service.ibge_bairros to authenticated;
grant all on service.ibge_setores, service.ibge_bairros to service_role;
drop policy if exists ibge_setores_ler on service.ibge_setores;
create policy ibge_setores_ler on service.ibge_setores for select to authenticated using (true);
drop policy if exists ibge_bairros_ler on service.ibge_bairros;
create policy ibge_bairros_ler on service.ibge_bairros for select to authenticated using (true);

-- ── áreas (setores, regiões pastorais, áreas de alcance) ──
create table if not exists service.map_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 60),
  tipo text not null default 'setor' check (tipo in ('setor', 'regiao', 'alcance')),
  -- só os 8 acentos da paleta do mapa, nunca hex solto
  cor text not null default 'amber' check (cor in ('sand', 'wheat', 'amber', 'clay', 'terra', 'rust', 'cocoa', 'olive')),
  responsavel_id uuid references service.people(id) on delete set null,
  -- bairros (códigos IBGE) que formaram a área; vazio = desenhada à mão
  bairros text[] not null default '{}',
  geom extensions.geometry(MultiPolygon, 4326) not null,
  criado_por uuid references service.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists map_areas_org_idx on service.map_areas (organization_id);
create index if not exists map_areas_geom_idx on service.map_areas using gist (geom);

-- ── quem recebeu o mapa (além de master, owner e pastor, que veem tudo) ──
create table if not exists service.map_access (
  person_id uuid primary key references service.people(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  escopo text not null default 'cidade' check (escopo in ('cidade', 'area')),
  area_id uuid references service.map_areas(id) on delete cascade,
  detalhe text not null default 'pessoas' check (detalhe in ('pessoas', 'numeros')),
  pode_mesa boolean not null default true,
  pode_csv boolean not null default false,
  pode_editar boolean not null default false,
  liberado_por uuid references service.people(id) on delete set null,
  created_at timestamptz not null default now(),
  check (escopo = 'cidade' or area_id is not null)
);
create index if not exists map_access_org_idx on service.map_access (organization_id);
-- apagar a área apaga a liberação presa a ela (o check acima impede ficar sem área)
alter table service.map_access drop constraint if exists map_access_area_id_fkey;
alter table service.map_access add constraint map_access_area_id_fkey foreign key (area_id) references service.map_areas(id) on delete cascade;

-- ── o que a pessoa logada pode no mapa desta igreja ──
create or replace function service.mapa_acesso(p_org uuid)
returns table (pode boolean, total boolean, area_id uuid, detalhe text, pode_mesa boolean, pode_csv boolean, pode_editar boolean)
language plpgsql stable security definer set search_path = service, core, public as $$
declare a service.map_access%rowtype;
begin
  if core.has_role(p_org, 'owner', 'master', 'pastor') then
    return query select true, true, null::uuid, 'pessoas'::text, true, true, true;
    return;
  end if;
  select ma.* into a from service.map_access ma
    join service.people p on p.id = ma.person_id
   where ma.organization_id = p_org and p.user_id = auth.uid()
   limit 1;
  if not found then
    return query select false, false, null::uuid, null::text, false, false, false;
    return;
  end if;
  return query select true, a.escopo = 'cidade', case when a.escopo = 'area' then a.area_id end, a.detalhe, a.pode_mesa, a.pode_csv, a.pode_editar;
end $$;
revoke all on function service.mapa_acesso(uuid) from public, anon;
grant execute on function service.mapa_acesso(uuid) to authenticated;

-- recorte da pessoa logada: null = cidade inteira
create or replace function service.mapa_recorte(p_org uuid)
returns extensions.geometry
language sql stable security definer set search_path = service, public as $$
  select ar.geom from service.mapa_acesso(p_org) x join service.map_areas ar on ar.id = x.area_id
$$;
revoke all on function service.mapa_recorte(uuid) from public, anon;
grant execute on function service.mapa_recorte(uuid) to authenticated;

alter table service.map_areas enable row level security;
alter table service.map_access enable row level security;
revoke all on service.map_areas, service.map_access from anon;
grant select, insert, update, delete on service.map_areas, service.map_access to authenticated;

drop policy if exists map_areas_ler on service.map_areas;
create policy map_areas_ler on service.map_areas for select to authenticated
  using ((select pode from service.mapa_acesso(organization_id)));
-- áreas: só quem vê a cidade inteira e pode editar (um líder com área não
-- redesenha o próprio recorte); responsável tem de ser desta igreja
drop policy if exists map_areas_escrever on service.map_areas;
create policy map_areas_escrever on service.map_areas for all to authenticated
  using ((select x.total and x.pode_editar from service.mapa_acesso(organization_id) x))
  with check ((select x.total and x.pode_editar from service.mapa_acesso(organization_id) x)
    and (responsavel_id is null or exists (select 1 from service.people p where p.id = responsavel_id and p.organization_id = map_areas.organization_id)));

-- liberar o mapa: quem libera telas (master, pastor ou delegado)
drop policy if exists map_access_ler on service.map_access;
create policy map_access_ler on service.map_access for select to authenticated
  using (service.can_manage_grants(organization_id) or person_id = any(service.my_people()));
drop policy if exists map_access_escrever on service.map_access;
create policy map_access_escrever on service.map_access for all to authenticated
  using (service.can_manage_grants(organization_id))
  with check (service.can_manage_grants(organization_id)
    and exists (select 1 from service.people p where p.id = person_id and p.organization_id = map_access.organization_id)
    and (area_id is null or exists (select 1 from service.map_areas a where a.id = area_id and a.organization_id = map_access.organization_id)));

-- ── pontos das pessoas ──
-- Com nome: só quem aceitou o termo, e só se a liberação for "pessoas".
-- Sem nome: ponto anônimo, mas só onde há 3 ou mais anônimos na mesma
-- quadrícula de ~330 m; os outros só entram nos números da região.
create or replace function service.mapa_pessoas(p_org uuid)
returns table (id uuid, nome text, situacao text, grupo_id uuid, grupo text, latitude double precision, longitude double precision, anonimo boolean, desde text)
language plpgsql stable security definer set search_path = service, public as $$
declare
  x record;
  v_recorte extensions.geometry;
begin
  select * into x from service.mapa_acesso(p_org);
  if not x.pode then raise exception 'sem_acesso'; end if;
  if x.detalhe <> 'pessoas' then return; end if;
  v_recorte := service.mapa_recorte(p_org);
  return query
  with base as (
    select m.id, m.name, m.situation, m.group_id, g.name as gname, m.latitude, m.longitude, m.map_consent_at is not null as consentiu, coalesce(m.since_year, extract(year from m.created_at)::text) as desde
      from service.members m
      left join service.fellowship_groups g on g.id = m.group_id
     where m.organization_id = p_org
       and m.latitude is not null
       and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)))
  ), anon as (
    select b.*, count(*) over (partition by floor(b.latitude / 0.003), floor(b.longitude / 0.003)) as vizinhos
      from base b where not b.consentiu
  )
  select b.id, b.name, b.situation, b.group_id, b.gname, round(b.latitude::numeric, 3)::double precision, round(b.longitude::numeric, 3)::double precision, false, b.desde
    from base b where b.consentiu
  union all
  select null::uuid, null::text, a.situation, null::uuid, null::text, round(a.latitude::numeric, 3)::double precision, round(a.longitude::numeric, 3)::double precision, true, a.desde
    from anon a where a.vizinhos >= 3;
end $$;
revoke all on function service.mapa_pessoas(uuid) from public, anon;
grant execute on function service.mapa_pessoas(uuid) to authenticated;

-- totais para o painel: pessoas da igreja com e sem ponto, dentro do recorte
create or replace function service.mapa_totais(p_org uuid)
returns table (pessoas integer, com_ponto integer, com_nome integer, sem_grupo integer)
language plpgsql stable security definer set search_path = service, public as $$
declare v_recorte extensions.geometry;
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  v_recorte := service.mapa_recorte(p_org);
  return query
  select count(*)::integer,
         count(*) filter (where m.latitude is not null)::integer,
         count(*) filter (where m.latitude is not null and m.map_consent_at is not null)::integer,
         count(*) filter (where m.latitude is not null and m.group_id is null)::integer
    from service.members m
   where m.organization_id = p_org
     and (v_recorte is null or (m.latitude is not null and extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326))));
end $$;
revoke all on function service.mapa_totais(uuid) from public, anon;
grant execute on function service.mapa_totais(uuid) to authenticated;

-- áreas em GeoJSON para a tela (a coluna geometry não sai crua pelo REST)
create or replace function service.mapa_areas(p_org uuid)
returns table (id uuid, nome text, tipo text, cor text, responsavel_id uuid, responsavel text, bairros text[], geojson jsonb)
language plpgsql stable security definer set search_path = service, public as $$
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  return query
  select a.id, a.nome, a.tipo, a.cor, a.responsavel_id, p.name, a.bairros, extensions.st_asgeojson(a.geom, 6)::jsonb
    from service.map_areas a left join service.people p on p.id = a.responsavel_id
   where a.organization_id = p_org
   order by a.nome;
end $$;
revoke all on function service.mapa_areas(uuid) from public, anon;
grant execute on function service.mapa_areas(uuid) to authenticated;

-- salvar área: GeoJSON (desenho à mão) ou bairros (junta os polígonos do IBGE)
create or replace function service.mapa_salvar_area(p_org uuid, p_id uuid, p_nome text, p_tipo text, p_cor text, p_responsavel uuid, p_bairros text[], p_geojson jsonb)
returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_geom extensions.geometry;
  v_id uuid;
  v_eu uuid := (select p.id from service.people p where p.user_id = auth.uid() and p.organization_id = p_org limit 1);
begin
  if not (select x.total and x.pode_editar from service.mapa_acesso(p_org) x) then raise exception 'sem_acesso'; end if;
  if p_responsavel is not null and not exists (select 1 from service.people p where p.id = p_responsavel and p.organization_id = p_org) then raise exception 'responsavel_invalido'; end if;
  if coalesce(array_length(p_bairros, 1), 0) > 0 then
    select extensions.st_multi(extensions.st_union(b.geom)) into v_geom from service.ibge_bairros b where b.codigo = any(p_bairros);
  elsif p_geojson is not null then
    v_geom := extensions.st_multi(extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326)));
  end if;
  if v_geom is null or extensions.st_isempty(v_geom) then raise exception 'area_vazia'; end if;
  v_geom := extensions.st_multi(extensions.st_collectionextract(v_geom, 3));
  if p_id is null then
    insert into service.map_areas (organization_id, nome, tipo, cor, responsavel_id, bairros, geom, criado_por)
    values (p_org, trim(p_nome), p_tipo, p_cor, p_responsavel, coalesce(p_bairros, '{}'), v_geom, v_eu) returning id into v_id;
  else
    update service.map_areas set nome = trim(p_nome), tipo = p_tipo, cor = p_cor, responsavel_id = p_responsavel, bairros = coalesce(p_bairros, '{}'), geom = v_geom, updated_at = now()
     where id = p_id and organization_id = p_org returning id into v_id;
    if v_id is null then raise exception 'area_nao_encontrada'; end if;
  end if;
  return v_id;
end $$;
revoke all on function service.mapa_salvar_area(uuid, uuid, text, text, text, uuid, text[], jsonb) from public, anon;
grant execute on function service.mapa_salvar_area(uuid, uuid, text, text, text, uuid, text[], jsonb) to authenticated;
