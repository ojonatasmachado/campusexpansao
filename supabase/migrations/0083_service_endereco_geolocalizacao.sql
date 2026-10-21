-- Consultas verificadas no servidor. Histórico da última resposta por chave,
-- sem leitura/escrita direta pelo navegador. Não faz chamadas HTTP no banco.
create table if not exists service.address_lookups (
  kind text not null check (kind in ('cep', 'cnpj')),
  lookup_key text not null,
  source text not null,
  data jsonb not null,
  raw jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (kind, lookup_key)
);
alter table service.address_lookups enable row level security;
revoke all on service.address_lookups from public, anon, authenticated;
grant all on service.address_lookups to service_role;

alter table service.churches add column if not exists country text;
alter table service.churches add column if not exists company_data jsonb not null default '{}'::jsonb;

do $$ declare t text; begin
  foreach t in array array['members', 'churches'] loop
    execute format('alter table service.%I add column if not exists latitude double precision', t);
    execute format('alter table service.%I add column if not exists longitude double precision', t);
    execute format('alter table service.%I add column if not exists street_number text', t);
    execute format('alter table service.%I add column if not exists complement text', t);
    execute format('alter table service.%I add column if not exists municipality_ibge text', t);
    execute format('alter table service.%I add column if not exists geo_source text', t);
    execute format('alter table service.%I add column if not exists geo_precision text', t);
    execute format('alter table service.%I add column if not exists geo_updated_at timestamptz', t);
    execute format('alter table service.%I add column if not exists address_data jsonb not null default ''{}''::jsonb', t);
    if not exists (select 1 from pg_constraint where conname = t || '_geo_pair') then
      execute format('alter table service.%I add constraint %I check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180))', t, t || '_geo_pair');
    end if;
  end loop;
end $$;

-- Abrange convite, perfil/RPC, configurações, assistente e bootstrap, sem
-- duplicar coordenadas em todos os formulários ou aceitar valores do cliente.
create or replace function service.trg_enriquecer_endereco()
returns trigger language plpgsql security definer set search_path = service, public as $$
declare
  v_data jsonb;
  v_raw jsonb;
  v_postal_data jsonb;
  v_postal_fetched timestamptz;
  v_fetched timestamptz;
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
  if v_changed then
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
  return new;
end $$;
revoke all on function service.trg_enriquecer_endereco() from public;
drop trigger if exists enriquecer_endereco on service.members;
create trigger enriquecer_endereco before insert or update of postal_code, country, street, neighborhood, city, state on service.members for each row execute function service.trg_enriquecer_endereco();
drop trigger if exists enriquecer_endereco on service.churches;
create trigger enriquecer_endereco before insert or update of postal_code, country, doc, address, neighborhood, city, state on service.churches for each row execute function service.trg_enriquecer_endereco();
