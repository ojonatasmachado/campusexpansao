-- G5 (MANIFESTO 2c.4, mapa/PLANO.md §7 item 4 e §10): pessoas do mesmo CEP
-- aparecem espalhadas perto do trecho da rua do CEP, dos dois lados, nunca em
-- cima da rua nem pelo bairro todo, e cada uma sempre no mesmo lugar.
--
-- O ponto guardado de cada pessoa é o centro do CEP (0087), nunca a casa. O
-- espalhamento é desenhado aqui, a partir desse centro e do id da pessoa, então
-- não revela nada além do CEP que já se mostrava.

-- Trecho da rua de cada CEP, calculado pelos endereços do CNEFE
-- (scripts/ibge/importar-cep-centros.ts): direção do trecho em radianos (0 é
-- leste, sentido anti-horário) e metade do comprimento em metros. Vazio quando
-- o CEP ainda não veio do CNEFE; abaixo de 12 m é prédio único.
alter table service.cep_centros
  add column if not exists eixo_angulo double precision,
  add column if not exists eixo_meia_m double precision check (eixo_meia_m is null or eixo_meia_m >= 0);

-- número fixo entre 0 e 1 a partir de um texto (mesma pessoa, mesmo número)
create or replace function service.mapa_sorteio(p_texto text)
returns double precision language sql immutable parallel safe set search_path = service, public as $$
  select ('x' || substr(md5(p_texto), 1, 8))::bit(32)::bigint / 4294967295.0;
$$;

-- Ponto de uma pessoa perto da rua do seu CEP.
-- Com o trecho conhecido: posição sorteada ao longo dele e de 7 a 16 m para um
-- dos lados. Prédio único (trecho abaixo de 12 m): fica no centro, como antes,
-- arredondado a 3 casas (~110 m), para não cravar o ponto no prédio.
-- Sem o trecho (CEP que não veio do CNEFE): um círculo pequeno, de 8 a 25 m,
-- para que as pessoas não fiquem umas em cima das outras.
create or replace function service.mapa_ponto_rua(p_lat double precision, p_lng double precision, p_id text, p_angulo double precision, p_meia double precision)
returns table (latitude double precision, longitude double precision)
language plpgsql immutable parallel safe set search_path = service, public as $$
declare
  h1 double precision := service.mapa_sorteio(p_id || ':t');
  h2 double precision := service.mapa_sorteio(p_id || ':l');
  h3 double precision := service.mapa_sorteio(p_id || ':o');
  dx double precision;
  dy double precision;
  t double precision;
  lado double precision;
  r double precision;
  ang double precision;
begin
  if p_meia is not null and p_meia < 12 then
    return query select round(p_lat::numeric, 3)::double precision, round(p_lng::numeric, 3)::double precision;
    return;
  end if;
  if p_meia is null or p_angulo is null then
    r := 8 + sqrt(h1) * 17;
    ang := 2 * pi() * h2;
    dx := r * cos(ang);
    dy := r * sin(ang);
  else
    t := (2 * h1 - 1) * p_meia;
    lado := case when h2 < 0.5 then -1 else 1 end;
    r := lado * (7 + h3 * 9);
    dx := t * cos(p_angulo) - r * sin(p_angulo);
    dy := t * sin(p_angulo) + r * cos(p_angulo);
  end if;
  return query select p_lat + dy / 111320.0, p_lng + dx / (111320.0 * cos(radians(p_lat)));
end $$;

-- 0090 + ponto perto da rua do CEP. As regras de quem aparece não mudam: com
-- nome só quem aceitou o termo e só com liberação "pessoas"; anônimo só onde há
-- 3 ou mais anônimos na mesma quadrícula de ~330 m (contada no centro do CEP).
-- O anônimo usa outro sorteio: quem retira o aceite não fica no mesmo lugar em
-- que aparecia com nome. Para o líder de área, o ponto espalhado também precisa
-- cair dentro da área (o espalhamento pode passar da borda).
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
    select m.id, m.name, m.situation, m.group_id, g.name as gname, m.latitude, m.longitude, m.map_consent_at is not null as consentiu,
           coalesce(m.since_year, extract(year from m.created_at)::text) as desde, c.eixo_angulo, c.eixo_meia_m
      from service.members m
      left join service.fellowship_groups g on g.id = m.group_id
      left join service.cep_centros c on c.cep = regexp_replace(coalesce(m.postal_code, ''), '\D', '', 'g')
     where m.organization_id = p_org
       and m.latitude is not null
       and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)))
  ), anon as (
    select b.*, count(*) over (partition by floor(b.latitude / 0.003), floor(b.longitude / 0.003)) as vizinhos
      from base b where not b.consentiu
  )
  select b.id, b.name, b.situation, b.group_id, b.gname, round(p.latitude::numeric, 5)::double precision, round(p.longitude::numeric, 5)::double precision, false, b.desde
    from base b cross join lateral service.mapa_ponto_rua(b.latitude, b.longitude, b.id::text, b.eixo_angulo, b.eixo_meia_m) p
   where b.consentiu
     and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(p.longitude, p.latitude), 4326)))
  union all
  select null::uuid, null::text, a.situation, null::uuid, null::text, round(p.latitude::numeric, 5)::double precision, round(p.longitude::numeric, 5)::double precision, true, a.desde
    from anon a cross join lateral service.mapa_ponto_rua(a.latitude, a.longitude, a.id::text || ':anon', a.eixo_angulo, a.eixo_meia_m) p
   where a.vizinhos >= 3
     and (v_recorte is null or extensions.st_intersects(v_recorte, extensions.st_setsrid(extensions.st_makepoint(p.longitude, p.latitude), 4326)));
end $$;
revoke all on function service.mapa_pessoas(uuid) from public, anon;
grant execute on function service.mapa_pessoas(uuid) to authenticated;
revoke all on function service.mapa_ponto_rua(double precision, double precision, text, double precision, double precision) from public, anon, authenticated;
revoke all on function service.mapa_sorteio(text) from public, anon, authenticated;
