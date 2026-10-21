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
