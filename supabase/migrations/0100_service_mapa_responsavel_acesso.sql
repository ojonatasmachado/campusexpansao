-- G10: o responsável de uma área vê o mapa só daquela área, pessoas uma a
-- uma, sem precisar de liberação. A liberação feita pelo pastor em "Quem vê
-- o mapa" (map_access) sempre vence: pode ampliar, mudar ou tirar ('nenhum').
-- Só pastor e administração (owner, master, pastor) veem e gravam o
-- responsável. PLANO.md §10.

-- 'nenhum' = o pastor tirou o acesso (inclusive o automático de responsável)
alter table service.map_access drop constraint if exists map_access_escopo_check;
alter table service.map_access add constraint map_access_escopo_check check (escopo in ('cidade', 'area', 'nenhum'));
alter table service.map_access drop constraint if exists map_access_check;
alter table service.map_access add constraint map_access_check check (escopo <> 'area' or area_id is not null);

-- ── o que a pessoa logada pode no mapa desta igreja ──
create or replace function service.mapa_acesso(p_org uuid)
returns table (pode boolean, total boolean, area_id uuid, detalhe text, pode_mesa boolean, pode_csv boolean, pode_editar boolean)
language plpgsql stable security definer set search_path = service, core, public as $$
declare
  a service.map_access%rowtype;
  v_area uuid;
begin
  if core.has_role(p_org, 'owner', 'master', 'pastor') then
    return query select true, true, null::uuid, 'pessoas'::text, true, true, true;
    return;
  end if;
  select ma.* into a from service.map_access ma
    join service.people p on p.id = ma.person_id
   where ma.organization_id = p_org and p.user_id = auth.uid()
   limit 1;
  if found then
    if a.escopo = 'nenhum' then
      return query select false, false, null::uuid, null::text, false, false, false;
      return;
    end if;
    return query select true, a.escopo = 'cidade', case when a.escopo = 'area' then a.area_id end, a.detalhe, a.pode_mesa, a.pode_csv, a.pode_editar;
    return;
  end if;
  -- responsável de área: só a área (a mais antiga como referência; o recorte junta todas)
  select ar.id into v_area from service.map_areas ar
    join service.people p on p.id = ar.responsavel_id
   where ar.organization_id = p_org and p.user_id = auth.uid()
   order by ar.created_at, ar.id
   limit 1;
  if v_area is null then
    return query select false, false, null::uuid, null::text, false, false, false;
    return;
  end if;
  return query select true, false, v_area, 'pessoas'::text, true, false, false;
end $$;
revoke all on function service.mapa_acesso(uuid) from public, anon;
grant execute on function service.mapa_acesso(uuid) to authenticated;

-- recorte da pessoa logada: null = cidade inteira. Liberação do pastor:
-- a área dela. Responsável sem liberação: todas as áreas que ele cuida.
create or replace function service.mapa_recorte(p_org uuid)
returns extensions.geometry
language sql stable security definer set search_path = service, public as $$
  select case
    when x.area_id is null then null
    when exists (select 1 from service.map_access ma join service.people p on p.id = ma.person_id
                  where ma.organization_id = p_org and p.user_id = auth.uid())
      then (select ar.geom from service.map_areas ar where ar.id = x.area_id)
    else (select extensions.st_multi(extensions.st_union(ar.geom)) from service.map_areas ar
            join service.people p on p.id = ar.responsavel_id
           where ar.organization_id = p_org and p.user_id = auth.uid())
  end
  from service.mapa_acesso(p_org) x
$$;
revoke all on function service.mapa_recorte(uuid) from public, anon;
grant execute on function service.mapa_recorte(uuid) to authenticated;

-- ── o responsável só aparece para pastor e administração ──
-- Leitura direta da tabela sem a coluna; escrita só pela função abaixo
-- (apagar continua direto, pela política map_areas_escrever).
revoke select, insert, update on service.map_areas from authenticated;
grant select (id, organization_id, nome, tipo, cor, bairros, geom, criado_por, created_at, updated_at) on service.map_areas to authenticated;

create or replace function service.mapa_areas(p_org uuid)
returns table (id uuid, nome text, tipo text, cor text, responsavel_id uuid, responsavel text, bairros text[], geojson jsonb)
language plpgsql stable security definer set search_path = service, core, public as $$
declare v_gestao boolean := core.has_role(p_org, 'owner', 'master', 'pastor');
begin
  if not (select pode from service.mapa_acesso(p_org)) then raise exception 'sem_acesso'; end if;
  return query
  select a.id, a.nome, a.tipo, a.cor,
         case when v_gestao then a.responsavel_id end,
         case when v_gestao then p.name end,
         a.bairros, extensions.st_asgeojson(a.geom, 6)::jsonb
    from service.map_areas a left join service.people p on p.id = a.responsavel_id
   where a.organization_id = p_org
   order by a.nome;
end $$;
revoke all on function service.mapa_areas(uuid) from public, anon;
grant execute on function service.mapa_areas(uuid) to authenticated;

-- salvar área: quem não é pastor nem administração não muda o responsável
-- (na área nova fica sem; na existente fica o que estava)
create or replace function service.mapa_salvar_area(p_org uuid, p_id uuid, p_nome text, p_tipo text, p_cor text, p_responsavel uuid, p_bairros text[], p_geojson jsonb)
returns uuid
language plpgsql security definer set search_path = service, core, public as $$
declare
  v_geom extensions.geometry;
  v_id uuid;
  v_resp uuid := p_responsavel;
  v_eu uuid := (select p.id from service.people p where p.user_id = auth.uid() and p.organization_id = p_org limit 1);
begin
  if not (select x.total and x.pode_editar from service.mapa_acesso(p_org) x) then raise exception 'sem_acesso'; end if;
  if not core.has_role(p_org, 'owner', 'master', 'pastor') then
    v_resp := (select a.responsavel_id from service.map_areas a where a.id = p_id and a.organization_id = p_org);
  end if;
  if v_resp is not null and not exists (select 1 from service.people p where p.id = v_resp and p.organization_id = p_org) then raise exception 'responsavel_invalido'; end if;
  if coalesce(array_length(p_bairros, 1), 0) > 0 then
    select extensions.st_multi(extensions.st_union(b.geom)) into v_geom from service.ibge_bairros b where b.codigo = any(p_bairros);
  elsif p_geojson is not null then
    v_geom := extensions.st_multi(extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326)));
  end if;
  if v_geom is null or extensions.st_isempty(v_geom) then raise exception 'area_vazia'; end if;
  v_geom := extensions.st_multi(extensions.st_collectionextract(v_geom, 3));
  if p_id is null then
    insert into service.map_areas (organization_id, nome, tipo, cor, responsavel_id, bairros, geom, criado_por)
    values (p_org, trim(p_nome), p_tipo, p_cor, v_resp, coalesce(p_bairros, '{}'), v_geom, v_eu) returning id into v_id;
  else
    update service.map_areas set nome = trim(p_nome), tipo = p_tipo, cor = p_cor, responsavel_id = v_resp, bairros = coalesce(p_bairros, '{}'), geom = v_geom, updated_at = now()
     where id = p_id and organization_id = p_org returning id into v_id;
    if v_id is null then raise exception 'area_nao_encontrada'; end if;
  end if;
  return v_id;
end $$;
revoke all on function service.mapa_salvar_area(uuid, uuid, text, text, text, uuid, text[], jsonb) from public, anon;
grant execute on function service.mapa_salvar_area(uuid, uuid, text, text, text, uuid, text[], jsonb) to authenticated;

-- ── o menu "Mapa da igreja" do responsável ──
-- O menu aparece com a liberação "mapa" (person_grants). Ela acompanha o
-- responsável: entra quando ele passa a cuidar de uma área (se o pastor não
-- tirou o acesso dele) e sai quando deixa de cuidar de todas, a não ser que o
-- pastor tenha liberado o mapa por conta própria (linha em map_access).
create or replace function service.trg_map_areas_responsavel()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare v_novo uuid; v_velho uuid;
begin
  v_novo := case when tg_op in ('INSERT', 'UPDATE') then new.responsavel_id end;
  v_velho := case when tg_op in ('UPDATE', 'DELETE') then old.responsavel_id end;
  if v_novo is not null and v_novo is distinct from v_velho
     and not exists (select 1 from service.map_access ma where ma.person_id = v_novo and ma.escopo = 'nenhum') then
    insert into service.person_grants (organization_id, person_id, grant_code)
    values (new.organization_id, v_novo, 'mapa')
    on conflict (person_id, grant_code) do nothing;
  end if;
  if v_velho is not null and v_velho is distinct from v_novo
     and not exists (select 1 from service.map_access ma where ma.person_id = v_velho)
     and not exists (select 1 from service.map_areas ar where ar.responsavel_id = v_velho and ar.id <> coalesce(new.id, old.id)) then
    delete from service.person_grants where person_id = v_velho and grant_code = 'mapa';
  end if;
  return null;
end $$;
revoke all on function service.trg_map_areas_responsavel() from public, anon, authenticated;
drop trigger if exists map_areas_responsavel on service.map_areas;
create trigger map_areas_responsavel after insert or update of responsavel_id or delete on service.map_areas
  for each row execute function service.trg_map_areas_responsavel();

-- responsáveis que já existem
insert into service.person_grants (organization_id, person_id, grant_code)
select distinct ar.organization_id, ar.responsavel_id, 'mapa'
  from service.map_areas ar
 where ar.responsavel_id is not null
   and not exists (select 1 from service.map_access ma where ma.person_id = ar.responsavel_id and ma.escopo = 'nenhum')
on conflict (person_id, grant_code) do nothing;

-- ── prévia da área: os números ao vivo do Criar área ──
-- Igual à 0091, com o filtro pela caixa do desenho (usa o índice gist dos
-- setores). Sem ele, cada arraste percorria todos os setores do país e
-- estourava o tempo do banco.
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
    coalesce((select sum(s.moradores) from service.ibge_setores s where s.geom operator(extensions.&&) v_geom and extensions.st_intersects(v_geom, extensions.st_pointonsurface(s.geom))), 0)::integer,
    (select count(*) from service.fellowship_groups g where g.organization_id = p_org and g.latitude is not null and extensions.st_intersects(v_geom, extensions.st_setsrid(extensions.st_makepoint(g.longitude, g.latitude), 4326)))::integer;
end $$;
revoke all on function service.mapa_area_previa(uuid, text[], jsonb) from public, anon;
grant execute on function service.mapa_area_previa(uuid, text[], jsonb) to authenticated;

-- ── as áreas que a pessoa logada vê (para a máscara e o "Você vê só...") ──
-- Liberação do pastor: a área dela. Responsável sem liberação: todas as que
-- cuida (o mesmo que o recorte junta). Cidade inteira: nenhuma linha.
create or replace function service.mapa_minhas_areas(p_org uuid)
returns setof uuid
language plpgsql stable security definer set search_path = service, public as $$
declare v_area uuid;
begin
  select x.area_id into v_area from service.mapa_acesso(p_org) x;
  if v_area is null then return; end if;
  if exists (select 1 from service.map_access ma join service.people p on p.id = ma.person_id
              where ma.organization_id = p_org and p.user_id = auth.uid()) then
    return next v_area;
    return;
  end if;
  return query select ar.id from service.map_areas ar
    join service.people p on p.id = ar.responsavel_id
   where ar.organization_id = p_org and p.user_id = auth.uid()
   order by ar.created_at, ar.id;
end $$;
revoke all on function service.mapa_minhas_areas(uuid) from public, anon;
grant execute on function service.mapa_minhas_areas(uuid) to authenticated;
