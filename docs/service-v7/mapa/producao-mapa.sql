-- Service v7 · migrações 0087 em diante, numa transação só.
-- Gerado por scripts/ci/pacote-producao.sh a partir de supabase/migrations/.
-- Rode inteiro no SQL Editor do Supabase. Se der erro, nada é gravado:
-- copie a mensagem e não rode de novo pela metade.

begin;

-- ═══ 0087_service_mapa_base.sql ═══
-- Mapa da igreja, etapa 1 (docs/service-v7/mapa/PLANO.md).
-- PostGIS para recorte por área no servidor; ponto geográfico gerado das
-- coordenadas que a 0083 já grava; consentimento do membro para aparecer
-- com o nome no mapa; centros de CEP do CNEFE 2022 (IBGE) como fonte
-- principal de coordenada, antes da BrasilAPI.

create extension if not exists postgis with schema extensions;

-- ponto gerado: ninguém escreve, sai de latitude/longitude
do $$ declare t text; begin
  foreach t in array array['members', 'churches'] loop
    if not exists (select 1 from information_schema.columns where table_schema = 'service' and table_name = t and column_name = 'geo') then
      execute format('alter table service.%I add column geo extensions.geography(Point, 4326) generated always as (case when latitude is not null and longitude is not null then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography end) stored', t);
    end if;
    execute format('create index if not exists %I on service.%I using gist (geo)', t || '_geo_idx', t);
  end loop;
end $$;

-- Consentimento: aceite do termo (convite, app ou perfil). Recusa também
-- fica gravada, pra não perguntar de novo. Sem aceite a pessoa aparece no
-- mapa da liderança só como ponto sem nome.
alter table service.members add column if not exists map_consent_at timestamptz;
alter table service.members add column if not exists map_consent_declined_at timestamptz;
alter table service.members add column if not exists map_consent_source text;
alter table service.members add column if not exists map_consent_terms text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'members_map_consent_source') then
    alter table service.members add constraint members_map_consent_source check (map_consent_source is null or map_consent_source in ('convite', 'app', 'perfil'));
  end if;
end $$;

-- Centro de cada CEP: média das coordenadas dos endereços do CNEFE 2022
-- (scripts/ibge/importar-cep-centros.ts). Dado público, mas só o servidor lê.
create table if not exists service.cep_centros (
  cep text primary key check (cep ~ '^\d{8}$'),
  municipio_ibge text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  enderecos integer not null check (enderecos > 0),
  fonte text not null default 'ibge:cnefe:2022',
  atualizado_em timestamptz not null default now()
);
create index if not exists cep_centros_municipio_idx on service.cep_centros (municipio_ibge);
alter table service.cep_centros enable row level security;
revoke all on service.cep_centros from public, anon, authenticated;
grant all on service.cep_centros to service_role;

-- CEP que a BrasilAPI não achou: o job de reserva só tenta de novo depois
-- de 30 dias (app/lib/service-geocodificar.ts).
create table if not exists service.cep_falhas (
  cep text primary key check (cep ~ '^\d{8}$'),
  tentado_em timestamptz not null default now()
);
alter table service.cep_falhas enable row level security;
revoke all on service.cep_falhas from public, anon, authenticated;
grant all on service.cep_falhas to service_role;

-- 0083 + centro de CEP do CNEFE quando a consulta não trouxe coordenada.
-- O resto do endereço continua vindo só da consulta (o CNEFE aqui só dá o ponto).
create or replace function service.trg_enriquecer_endereco()
returns trigger language plpgsql security definer set search_path = service, public as $$
declare
  v_data jsonb;
  v_raw jsonb;
  v_postal_data jsonb;
  v_postal_fetched timestamptz;
  v_fetched timestamptz;
  v_centro service.cep_centros%rowtype;
  v_postal text := regexp_replace(coalesce(new.postal_code, ''), '\D', '', 'g');
  v_changed boolean := false;
  v_nacional boolean := coalesce(trim(new.country), '') = '' or lower(trim(new.country)) in ('brasil', 'brazil', 'br');
begin
  if tg_op = 'UPDATE' then
    v_changed := new.postal_code is distinct from old.postal_code or new.country is distinct from old.country;
  end if;
  if tg_table_name = 'churches' then
    select data, raw, fetched_at into v_data, v_raw, v_fetched
    from service.address_lookups where kind = 'cnpj' and lookup_key = upper(regexp_replace(coalesce(new.doc, ''), '[^A-Za-z0-9]', '', 'g'));
    if found then
      new.company_data := (v_raw - 'qsa') || jsonb_build_object('lookupSource', 'brasilapi:cnpj:v1', 'fetchedAt', v_fetched);
      if regexp_replace(coalesce(v_data->>'postalCode', ''), '\D', '', 'g') <> v_postal then v_data := null; end if;
    elsif tg_op = 'UPDATE' and new.doc is distinct from old.doc then
      new.company_data := '{}'::jsonb;
    end if;
  end if;
  if not v_nacional then v_data := null; end if;
  if v_nacional and v_data is null and v_postal ~ '^\d{8}$' then
    select data, fetched_at into v_data, v_fetched from service.address_lookups where kind = 'cep' and lookup_key = v_postal;
  end if;
  if v_nacional and v_data is not null and tg_table_name = 'churches' then
    select data, fetched_at into v_postal_data, v_postal_fetched from service.address_lookups where kind = 'cep' and lookup_key = v_postal;
    if v_postal_data->>'latitude' is not null and ((v_data->>'latitude') is null or v_postal_fetched > v_fetched) then
      v_data := v_data || jsonb_build_object('latitude', v_postal_data->'latitude', 'longitude', v_postal_data->'longitude', 'geoSource', v_postal_data->'geoSource', 'geoPrecision', v_postal_data->'geoPrecision');
      v_fetched := greatest(v_fetched, v_postal_fetched);
    end if;
  end if;
  -- Outro país e CEP sem consulta não herdam coordenadas antigas.
  new.latitude := nullif(v_data->>'latitude', '')::double precision;
  new.longitude := nullif(v_data->>'longitude', '')::double precision;
  new.geo_source := v_data->>'geoSource';
  new.geo_precision := v_data->>'geoPrecision';
  new.geo_updated_at := case when v_data is not null then v_fetched else null end;
  if v_data is not null and nullif(trim(new.country), '') is null then new.country := v_data->>'country'; end if;
  new.address_data := coalesce(v_data, '{}'::jsonb) || jsonb_build_object('country', new.country, 'postalCode', new.postal_code, 'lookupAt', case when v_data is not null then v_fetched else null end);
  new.municipality_ibge := v_data->>'municipalityIbge';
  -- grupo: número e complemento são digitados junto com o CEP (0088)
  if v_changed and tg_table_name <> 'fellowship_groups' then
    new.street_number := null;
    new.complement := null;
  end if;
  if v_data is not null then
    new.street_number := coalesce(nullif(v_data->>'streetNumber', ''), new.street_number);
    new.complement := coalesce(nullif(v_data->>'complement', ''), new.complement);
    if nullif(trim(new.neighborhood), '') is null or (tg_op = 'UPDATE' and v_changed and new.neighborhood is not distinct from old.neighborhood) then new.neighborhood := v_data->>'neighborhood'; end if;
    if nullif(trim(new.city), '') is null or (tg_op = 'UPDATE' and v_changed and new.city is not distinct from old.city) then new.city := v_data->>'city'; end if;
    if nullif(trim(new.state), '') is null or (tg_op = 'UPDATE' and v_changed and new.state is not distinct from old.state) then new.state := v_data->>'state'; end if;
    if tg_table_name = 'churches' then
      if nullif(trim(new.address), '') is null then new.address := concat_ws(', ', v_data->>'street', v_data->>'streetNumber', v_data->>'complement'); end if;
    else
      if nullif(trim(new.street), '') is null then new.street := v_data->>'street'; end if;
    end if;
  end if;
  -- CNEFE: fonte principal do ponto. Vale também quando a consulta trouxe
  -- coordenada, porque o centro dos endereços do CEP é mais fiel que o da API.
  if v_nacional and v_postal ~ '^\d{8}$' then
    select * into v_centro from service.cep_centros where cep = v_postal;
    if found then
      new.latitude := v_centro.latitude;
      new.longitude := v_centro.longitude;
      new.geo_source := v_centro.fonte;
      new.geo_precision := 'postal_code';
      new.geo_updated_at := v_centro.atualizado_em;
      new.municipality_ibge := coalesce(new.municipality_ibge, v_centro.municipio_ibge);
    end if;
  end if;
  return new;
end $$;
revoke all on function service.trg_enriquecer_endereco() from public;

-- Aceite ou recusa do próprio membro (app e perfil). O convite grava pelo
-- servidor, na rota de aceite.
create or replace function service.mapa_consentimento(p_member_id uuid, p_aceita boolean, p_origem text, p_termo text)
returns void language plpgsql security definer set search_path = service, public as $$
begin
  if p_origem not in ('app', 'perfil') then raise exception 'origem_invalida'; end if;
  if coalesce(trim(p_termo), '') = '' then raise exception 'termo_obrigatorio'; end if;
  perform set_config('service.mapa_consentimento', '1', true);
  update service.members m
     set map_consent_at = case when p_aceita then now() else null end,
         map_consent_declined_at = case when p_aceita then null else now() end,
         map_consent_source = p_origem,
         map_consent_terms = p_termo
   where m.id = p_member_id
     and m.volunteer_id in (select p.id from service.people p where p.user_id = auth.uid());
  if not found then raise exception 'sem_acesso'; end if;
end $$;
revoke all on function service.mapa_consentimento(uuid, boolean, text, text) from public, anon;
grant execute on function service.mapa_consentimento(uuid, boolean, text, text) to authenticated;

-- O aceite é da pessoa: ninguém da liderança grava nem apaga por ela pela
-- ficha. Só a função acima (o próprio membro) ou o servidor (aceite do
-- convite, com a chave de serviço) mudam estas colunas; o resto é ignorado.
create or replace function service.trg_proteger_consentimento()
returns trigger language plpgsql set search_path = service, public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or coalesce(current_setting('service.mapa_consentimento', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.map_consent_at := null; new.map_consent_declined_at := null; new.map_consent_source := null; new.map_consent_terms := null;
  else
    new.map_consent_at := old.map_consent_at; new.map_consent_declined_at := old.map_consent_declined_at;
    new.map_consent_source := old.map_consent_source; new.map_consent_terms := old.map_consent_terms;
  end if;
  return new;
end $$;
drop trigger if exists proteger_consentimento on service.members;
create trigger proteger_consentimento before insert or update of map_consent_at, map_consent_declined_at, map_consent_source, map_consent_terms on service.members for each row execute function service.trg_proteger_consentimento();

-- ═══ 0088_service_grupos_local.sql ═══
-- Mapa da igreja, etapa 1: local e lotação das células (grupos). O local do
-- grupo é sempre público para os membros da igreja ("Onde", etapa 2). As
-- colunas de endereço são as mesmas de members/churches (0083), pra reusar
-- o mesmo trigger de enriquecimento pelo CEP.

alter table service.fellowship_groups add column if not exists country text;
alter table service.fellowship_groups add column if not exists postal_code text;
alter table service.fellowship_groups add column if not exists street text;
alter table service.fellowship_groups add column if not exists street_number text;
alter table service.fellowship_groups add column if not exists complement text;
alter table service.fellowship_groups add column if not exists city text;
alter table service.fellowship_groups add column if not exists state text;
alter table service.fellowship_groups add column if not exists latitude double precision;
alter table service.fellowship_groups add column if not exists longitude double precision;
alter table service.fellowship_groups add column if not exists municipality_ibge text;
alter table service.fellowship_groups add column if not exists geo_source text;
alter table service.fellowship_groups add column if not exists geo_precision text;
alter table service.fellowship_groups add column if not exists geo_updated_at timestamptz;
alter table service.fellowship_groups add column if not exists address_data jsonb not null default '{}'::jsonb;
-- quantas pessoas cabem; vazio = sem limite
alter table service.fellowship_groups add column if not exists capacity integer;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fellowship_groups_geo_pair') then
    alter table service.fellowship_groups add constraint fellowship_groups_geo_pair check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fellowship_groups_capacity') then
    alter table service.fellowship_groups add constraint fellowship_groups_capacity check (capacity is null or capacity between 1 and 500);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'service' and table_name = 'fellowship_groups' and column_name = 'geo') then
    alter table service.fellowship_groups add column geo extensions.geography(Point, 4326) generated always as (case when latitude is not null and longitude is not null then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography end) stored;
  end if;
end $$;
create index if not exists fellowship_groups_geo_idx on service.fellowship_groups using gist (geo);

-- número e complemento são do grupo (a casa que recebe), não vêm do CEP
drop trigger if exists enriquecer_endereco on service.fellowship_groups;
create trigger enriquecer_endereco before insert or update of postal_code, country, street, neighborhood, city, state on service.fellowship_groups for each row execute function service.trg_enriquecer_endereco();

-- Recalcula o ponto de quem tem um destes CEPs (depois de importar centros
-- do CNEFE ou de uma consulta nova da BrasilAPI). Só o servidor chama.
create or replace function service.mapa_reprocessar_ceps(p_ceps text[])
returns integer language plpgsql security definer set search_path = service, public as $$
declare n integer := 0; k integer;
begin
  update service.members set postal_code = postal_code where regexp_replace(coalesce(postal_code, ''), '\D', '', 'g') = any(p_ceps);
  get diagnostics k = row_count; n := n + k;
  update service.churches set postal_code = postal_code where regexp_replace(coalesce(postal_code, ''), '\D', '', 'g') = any(p_ceps);
  get diagnostics k = row_count; n := n + k;
  update service.fellowship_groups set postal_code = postal_code where regexp_replace(coalesce(postal_code, ''), '\D', '', 'g') = any(p_ceps);
  get diagnostics k = row_count; n := n + k;
  return n;
end $$;
revoke all on function service.mapa_reprocessar_ceps(text[]) from public, anon, authenticated;
grant execute on function service.mapa_reprocessar_ceps(text[]) to service_role;

-- ═══ 0089_service_mapa_onde.sql ═══
-- Mapa da igreja, etapa 2: "Onde" no app do membro (aba Agenda). Sede,
-- congregações e células são públicas para quem é da igreja: endereço,
-- horário, líder e vagas. Nada de pessoas aqui.

create or replace function service.mapa_locais_publicos(p_org uuid)
returns table (
  tipo text, id uuid, nome text, dia text, hora text,
  rua text, numero text, complemento text, bairro text, cidade text,
  latitude double precision, longitude double precision,
  lider_nome text, lider_member_id uuid, lugares integer, ocupados integer
)
language plpgsql stable security definer set search_path = service, public as $$
begin
  if not core.is_member_of(p_org) then raise exception 'sem_acesso'; end if;
  return query
    select case when c.is_headquarters then 'sede' else 'congregacao' end, c.id, c.name, null::text, null::text,
           c.address, c.street_number, c.complement, c.neighborhood, c.city,
           c.latitude, c.longitude, null::text, null::uuid, null::integer, null::integer
      from service.churches c
     where c.organization_id = p_org
  union all
    select 'grupo', g.id, g.name, g.weekday, g.time,
           g.street, g.street_number, g.complement, g.neighborhood, g.city,
           g.latitude, g.longitude,
           p.name,
           (select m.id from service.members m where m.organization_id = p_org and m.volunteer_id = g.leader_person_id order by m.created_at limit 1),
           g.capacity,
           (select count(*)::integer from service.members m where m.group_id = g.id)
      from service.fellowship_groups g
      left join service.people p on p.id = g.leader_person_id
     where g.organization_id = p_org;
end $$;
revoke all on function service.mapa_locais_publicos(uuid) from public, anon;
grant execute on function service.mapa_locais_publicos(uuid) to authenticated;

-- ═══ 0090_service_mapa_lideranca.sql ═══
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

-- ═══ 0091_service_mapa_regioes.sql ═══
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

-- ═══ 0092_service_mapa_ferramentas.sql ═══
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

commit;
