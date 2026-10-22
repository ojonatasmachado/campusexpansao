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
