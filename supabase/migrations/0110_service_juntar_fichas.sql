-- 0110 · O11: juntar cadastros duplicados.
--
-- A secretaria vê os possíveis duplicados (mesmo telefone, e-mail ou nome, na
-- tela Pessoas) e decide. Nada é juntado sozinho. Uma "linha" da tela é uma
-- ficha de membro (service.members) e/ou um voluntário (service.people); juntar
-- leva tudo da linha que sai para a que fica:
--   - toda referência por chave estrangeira a people(id) e members(id), achada
--     no catálogo (tabela nova entra sozinha). Antes de mover, a linha que sai
--     é apagada onde já existe a mesma da que fica (mesma escala, mesmo curso,
--     mesma leitura): é o mesmo fato duas vezes;
--   - times (líder se um dos dois era, funções somadas) e cursos (o progresso
--     maior) são somados, não apagados;
--   - listas sem chave estrangeira (tags.leaders, attendees, assignees,
--     equipe, remind_to, publish_to);
--   - os campos vazios da ficha que fica são completados com os da que sai;
--   - o acesso ao app: se só uma tinha login, ele passa para a que fica. Se as
--     duas tinham logins diferentes, não junta ('duas_contas').
-- Os gatilhos que gravariam fatos falsos (trocou a escala, entrou no grupo,
-- saída do rol, aula concluída) ou barrariam a mudança (período fechado do
-- financeiro) ganham um WHEN que os pula enquanto a variável local da
-- transação service.juntando = '1'. Sem ALTER TABLE na hora de juntar: nada
-- de trava nas tabelas das outras igrejas. Uma cópia das fichas e das linhas
-- apagadas fica em service.juntadas (filhas apagadas em cascata não entram).
-- Tudo numa transação: se algo falhar, nada muda. Idempotente.

-- ── registro das junções ──────────────────────────────────────────────────────
create table if not exists service.juntadas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  fica_membro     uuid,
  fica_pessoa     uuid,
  sai_membro      uuid,
  sai_pessoa      uuid,
  copia           jsonb not null default '{}'::jsonb,
  por             uuid references core.users(id) on delete set null,
  em              timestamptz not null default now()
);
create index if not exists juntadas_org_idx on service.juntadas (organization_id, em desc);
alter table service.juntadas enable row level security;
drop policy if exists juntadas_ler on service.juntadas;
create policy juntadas_ler on service.juntadas for select using (service.can_secretaria(organization_id));
comment on table service.juntadas is 'O11: cada junção de fichas, com a cópia do que saiu. Só leitura; grava service.juntar_fichas.';

-- pares que a secretaria disse que não são a mesma pessoa (chaves da tela: m-<id> ou p-<id>, a menor primeiro)
create table if not exists service.duplicados_dispensados (
  organization_id uuid not null references core.organizations(id) on delete cascade,
  chave_a         text not null,
  chave_b         text not null,
  por             uuid references core.users(id) on delete set null,
  em              timestamptz not null default now(),
  primary key (organization_id, chave_a, chave_b),
  check (chave_a < chave_b)
);
alter table service.duplicados_dispensados enable row level security;
drop policy if exists dispensados_ler on service.duplicados_dispensados;
create policy dispensados_ler on service.duplicados_dispensados for select using (service.can_secretaria(organization_id));
drop policy if exists dispensados_gravar on service.duplicados_dispensados;
create policy dispensados_gravar on service.duplicados_dispensados for insert with check (service.can_secretaria(organization_id) and por = auth.uid());
drop policy if exists dispensados_apagar on service.duplicados_dispensados;
create policy dispensados_apagar on service.duplicados_dispensados for delete using (service.can_secretaria(organization_id));
grant select, insert, delete on service.duplicados_dispensados to authenticated;
grant select on service.juntadas to authenticated;

-- ── mover referências (genérico, pelo catálogo) ──────────────────────────────
-- Devolve as linhas apagadas (o mesmo fato nas duas fichas), para a cópia.
drop function if exists service._juntar_mover(regclass, uuid, uuid);
create function service._juntar_mover(p_alvo regclass, p_fica uuid, p_sai uuid)
returns jsonb
language plpgsql volatile security definer set search_path = service, public, pg_temp as $$
declare
  r_fk  record;
  r_ix  record;
  v_on  text;
  v_pred text;
  v_apagou jsonb;
  v_copia jsonb := '[]'::jsonb;
begin
  for r_fk in
    select c.conrelid::regclass as tabela, a.attname as coluna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = p_alvo and array_length(c.conkey, 1) = 1
  loop
    -- onde a que fica já tem a mesma linha, a da que sai é o mesmo fato: apaga
    for r_ix in
      select i.indexrelid, i.indkey, i.indpred
        from pg_index i
       where i.indrelid = r_fk.tabela and i.indisunique and i.indexprs is null
         and exists (select 1 from pg_attribute ia where ia.attrelid = i.indrelid and ia.attnum = any(i.indkey) and ia.attname = r_fk.coluna)
    loop
      select string_agg(format('d.%1$I is not distinct from k.%1$I', ia.attname), ' and ')
        into v_on
        from pg_attribute ia
       where ia.attrelid = r_fk.tabela and ia.attnum = any(r_ix.indkey) and ia.attname <> r_fk.coluna;
      v_pred := coalesce(pg_get_expr(r_ix.indpred, r_fk.tabela), 'true');
      execute format(
        'with apagadas as (delete from %1$s x where x.ctid in (select d.ctid from (select ctid, * from %1$s where %2$s) d join (select * from %1$s where %2$s) k on k.%3$I = $1 %4$s where d.%3$I = $2) returning to_jsonb(x) as linha)'
        || ' select coalesce(jsonb_agg(jsonb_build_object(''tabela'', %5$L, ''linha'', linha)), ''[]'') from apagadas',
        r_fk.tabela, v_pred, r_fk.coluna, case when v_on is null then '' else 'and ' || v_on end, r_fk.tabela::text)
      into v_apagou
      using p_fica, p_sai;
      v_copia := v_copia || v_apagou;
    end loop;
    execute format('update %1$s set %2$I = $1 where %2$I = $2', r_fk.tabela, r_fk.coluna) using p_fica, p_sai;
  end loop;
  return v_copia;
end $$;
revoke all on function service._juntar_mover(regclass, uuid, uuid) from public;

-- lista uuid[]: troca a que sai pela que fica, sem repetir, na mesma ordem
create or replace function service._juntar_lista(p_lista uuid[], p_fica uuid, p_sai uuid)
returns uuid[]
language sql immutable as $$
  select coalesce(array_agg(x order by o), '{}')
    from (select x, min(o) as o from unnest(array_replace(p_lista, p_sai, p_fica)) with ordinality as u(x, o) group by x) s;
$$;

-- gatilhos que não podem rodar durante a junção (tabela, gatilho); os que não existem são ignorados
create or replace function service._juntar_gatilhos_lista()
returns table (tabela regclass, gatilho name, def text)
language sql stable set search_path = pg_catalog, pg_temp as $$
  -- search_path vazio de service: a definição sai com o nome completo (service.tabela, service.funcao)
  select t.tgrelid::regclass, t.tgname, pg_get_triggerdef(t.oid)
    from pg_trigger t
    join (values
        ('service.roster_assignments', 'fato_trocou'),
        ('service.roster_assignments', 'resolve_roster_swap_request'),
        ('service.members', 'fato_grupo'),
        ('service.members', 'livro_rol'),
        ('service.members', 'livro_rol_saida'),
        ('service.members', 'proteger_consentimento'),
        ('service.enrollments', 'fato_aula'),
        ('service.lesson_attendance', 'guard_lesson_attendance'),
        ('service.kids_attendance', 't_kids_attendance_regras'),
        ('service.fin_transactions', 't_fin_tx_trava'),
        ('service.map_routes', 'map_routes_autor')
      ) as g(tabela, gatilho) on t.tgrelid = to_regclass(g.tabela) and t.tgname = g.gatilho
   where not t.tgisinternal;
$$;
revoke all on function service._juntar_gatilhos_lista() from public;

-- cada um ganha WHEN (service.juntando <> '1'), uma vez, aqui na migração
do $$
declare
  r record;
begin
  for r in select * from service._juntar_gatilhos_lista() where def not like '%service.juntando%' loop
    execute format('drop trigger %I on %s', r.gatilho, r.tabela);
    execute regexp_replace(r.def, ' EXECUTE FUNCTION ',
      $w$ WHEN (coalesce(current_setting('service.juntando', true), '') <> '1') EXECUTE FUNCTION $w$);
  end loop;
end $$;

-- liga a variável local da transação. Se uma migração futura recriar um
-- desses gatilhos sem o WHEN, cai no jeito antigo (desligar a tabela) para
-- nunca gravar fato falso.
drop function if exists service._juntar_gatilhos(boolean);
create function service._juntar_gatilhos(p_ligar boolean)
returns void
language plpgsql volatile security definer set search_path = service, public, pg_temp as $$
declare
  r record;
begin
  perform set_config('service.juntando', case when p_ligar then '' else '1' end, true);
  for r in select * from service._juntar_gatilhos_lista() where def not like '%service.juntando%' loop
    execute format('alter table %s %s trigger %I', r.tabela, case when p_ligar then 'enable' else 'disable' end, r.gatilho);
  end loop;
end $$;
revoke all on function service._juntar_gatilhos(boolean) from public;

-- ── prévia: o que a linha que sai leva ───────────────────────────────────────
create or replace function service.juntar_previa(p_org uuid, p_sai_membro uuid, p_sai_pessoa uuid, p_fica_pessoa uuid)
returns jsonb
language plpgsql stable security definer set search_path = service, public, pg_temp as $$
declare
  v_sai  service.people%rowtype;
  v_fica service.people%rowtype;
  v_sai_m uuid;
begin
  if not service.can_secretaria(p_org) then return jsonb_build_object('erro', 'nao_pode'); end if;
  -- duas fichas de membro com o mesmo voluntário: só a ficha de membro sai
  if p_sai_pessoa = p_fica_pessoa then p_sai_pessoa := null; end if;
  select * into v_sai from service.people where id = p_sai_pessoa and organization_id = p_org;
  select * into v_fica from service.people where id = p_fica_pessoa and organization_id = p_org;
  select id into v_sai_m from service.members where id = p_sai_membro and organization_id = p_org;
  return jsonb_build_object(
    'escalas',   (select count(*) from service.roster_assignments where person_id = v_sai.id),
    'times',     (select count(*) from service.person_ministries where person_id = v_sai.id),
    'historico', (select count(*) from service.timeline_events where member_id = v_sai_m),
    'cursos',    (select count(*) from service.enrollments where member_id = v_sai_m),
    'conversas', (select count(*) from service.chat_members where member_id = v_sai_m),
    'grupo',     (select g.name from service.members m join service.fellowship_groups g on g.id = m.group_id where m.id = v_sai_m),
    'login_sai', v_sai.user_id is not null,
    'login_fica', v_fica.user_id is not null,
    'duas_contas', v_sai.user_id is not null and v_fica.user_id is not null and v_sai.user_id <> v_fica.user_id
  );
end $$;
revoke all on function service.juntar_previa(uuid, uuid, uuid, uuid) from public;
grant execute on function service.juntar_previa(uuid, uuid, uuid, uuid) to authenticated;

-- ── juntar ───────────────────────────────────────────────────────────────────
-- Devolve 'ok' ou o motivo: 'nao_pode', 'invalido' (ids fora da igreja, iguais
-- ou nada para juntar), 'duas_contas'.
create or replace function service.juntar_fichas(p_org uuid, p_fica_membro uuid, p_fica_pessoa uuid, p_sai_membro uuid, p_sai_pessoa uuid)
returns text
language plpgsql volatile security definer set search_path = service, public, pg_temp as $$
declare
  mk service.members%rowtype;
  md service.members%rowtype;
  pk service.people%rowtype;
  pd service.people%rowtype;
  v_fica_m uuid := p_fica_membro;
  v_fica_p uuid := p_fica_pessoa;
  v_copia jsonb := '{}'::jsonb;
begin
  if not service.can_secretaria(p_org) then return 'nao_pode'; end if;
  -- duas fichas de membro com o mesmo voluntário: só a ficha de membro sai
  if p_sai_pessoa = p_fica_pessoa and p_sai_membro is distinct from p_fica_membro then p_sai_pessoa := null; end if;
  if p_sai_membro is null and p_sai_pessoa is null then return 'invalido'; end if;
  if p_fica_membro is null and p_fica_pessoa is null then return 'invalido'; end if;
  if p_sai_membro = p_fica_membro or p_sai_pessoa = p_fica_pessoa then return 'invalido'; end if;

  if p_fica_membro is not null then
    select * into mk from service.members where id = p_fica_membro and organization_id = p_org for update;
    if not found then return 'invalido'; end if;
  end if;
  if p_sai_membro is not null then
    select * into md from service.members where id = p_sai_membro and organization_id = p_org for update;
    if not found then return 'invalido'; end if;
  end if;
  if p_fica_pessoa is not null then
    select * into pk from service.people where id = p_fica_pessoa and organization_id = p_org for update;
    if not found then return 'invalido'; end if;
  end if;
  if p_sai_pessoa is not null then
    select * into pd from service.people where id = p_sai_pessoa and organization_id = p_org for update;
    if not found then return 'invalido'; end if;
  end if;
  if pk.user_id is not null and pd.user_id is not null and pk.user_id <> pd.user_id then return 'duas_contas'; end if;

  perform service._juntar_gatilhos(false);
  if md.id is not null then v_copia := v_copia || jsonb_build_object('membro', to_jsonb(md)); end if;
  if pd.id is not null then v_copia := v_copia || jsonb_build_object('pessoa', to_jsonb(pd)); end if;

  -- voluntário
  if pd.id is not null and pk.id is not null then
    update service.person_ministries k
       set is_leader = k.is_leader or d.is_leader,
           functions = (select coalesce(array_agg(distinct f), '{}') from unnest(coalesce(k.functions, '{}') || coalesce(d.functions, '{}')) f)
      from service.person_ministries d
     where k.person_id = pk.id and d.person_id = pd.id and d.ministry_id = k.ministry_id;
    -- mesma escala nas duas fichas: a confirmação vale
    update service.roster_assignments k set status = 'ok'
      from service.roster_assignments d
     where k.person_id = pk.id and d.person_id = pd.id and d.event_id = k.event_id
       and d.position_id is not distinct from k.position_id and d.status = 'ok' and k.status <> 'ok';
    update service.tags     set leaders   = service._juntar_lista(leaders, pk.id, pd.id)   where organization_id = p_org and pd.id = any(leaders);
    update service.meetings set attendees = service._juntar_lista(attendees, pk.id, pd.id) where organization_id = p_org and pd.id = any(attendees);
    update service.rehearsals set attendees = service._juntar_lista(attendees, pk.id, pd.id) where organization_id = p_org and pd.id = any(attendees);
    update service.cards    set assignees = service._juntar_lista(assignees, pk.id, pd.id) where organization_id = p_org and pd.id = any(assignees);
    if to_regclass('service.map_routes') is not null then
      update service.map_routes set equipe = service._juntar_lista(equipe, pk.id, pd.id) where organization_id = p_org and pd.id = any(equipe);
    end if;
    v_copia := jsonb_set(v_copia, '{apagadas}', coalesce(v_copia -> 'apagadas', '[]') || service._juntar_mover('service.people'::regclass, pk.id, pd.id));
    -- login e código de convite são únicos: saem da que sai antes de ir para a que fica
    update service.people set user_id = null, invite_code = null where id = pd.id;
    update service.people k set
      user_id     = coalesce(k.user_id, pd.user_id),
      invite_code = coalesce(k.invite_code, pd.invite_code),
      phone       = coalesce(nullif(k.phone, ''), pd.phone),
      email       = coalesce(k.email, pd.email),
      since_year  = least(k.since_year, pd.since_year),
      photo_url   = coalesce(k.photo_url, pd.photo_url),
      tags        = (select coalesce(array_agg(distinct t), '{}') from unnest(k.tags || pd.tags) t),
      meta        = coalesce(pd.meta, '{}'::jsonb) || coalesce(k.meta, '{}'::jsonb),
      availability = case when k.availability = '{}'::jsonb then pd.availability else k.availability end
     where k.id = pk.id;
    delete from service.people where id = pd.id;
  elsif pd.id is not null then
    v_fica_p := pd.id;
  end if;

  -- ficha de membro
  if md.id is not null and mk.id is not null then
    update service.enrollments k
       set done_count = greatest(k.done_count, d.done_count),
           status = case when 'concluido' in (k.status, d.status) then 'concluido' else k.status end
      from service.enrollments d
     where k.member_id = mk.id and d.member_id = md.id and d.course_id = k.course_id;
    update service.announcements set remind_to = service._juntar_lista(remind_to, mk.id, md.id) where organization_id = p_org and md.id = any(remind_to);
    update service.announcements set publish_to = service._juntar_lista(publish_to, mk.id, md.id) where organization_id = p_org and md.id = any(publish_to);
    v_copia := jsonb_set(v_copia, '{apagadas}', coalesce(v_copia -> 'apagadas', '[]') || service._juntar_mover('service.members'::regclass, mk.id, md.id));
    update service.members k set
      phone         = coalesce(nullif(k.phone, ''), md.phone),
      email         = coalesce(k.email, md.email),
      birth         = coalesce(nullif(k.birth, ''), md.birth),
      since_year    = least(k.since_year, md.since_year),
      first_contact = least(k.first_contact, md.first_contact),
      family        = coalesce(k.family, md.family),
      group_id      = coalesce(k.group_id, md.group_id),
      title_id      = coalesce(k.title_id, md.title_id),
      sex           = coalesce(k.sex, md.sex),
      marital_status = coalesce(k.marital_status, md.marital_status),
      text_size     = coalesce(k.text_size, md.text_size),
      situation     = case when 'membro' in (k.situation, md.situation) then 'membro' else k.situation end,
      journey       = (select coalesce(jsonb_agg(case when coalesce(jk -> i, 'null'::jsonb)::text in ('1', 'true') or coalesce(jd -> i, 'null'::jsonb)::text in ('1', 'true') then 1 else 0 end order by i), k.journey)
                         from (select case when jsonb_typeof(k.journey) = 'array' then k.journey else '[]'::jsonb end as jk,
                                      case when jsonb_typeof(md.journey) = 'array' then md.journey else '[]'::jsonb end as jd) j,
                              generate_series(0, greatest(jsonb_array_length(jk), jsonb_array_length(jd)) - 1) i)
     where k.id = mk.id;
    -- endereço e consentimento do mapa vão em bloco, para não misturar dois endereços
    if mk.postal_code is null and mk.street is null and (md.postal_code is not null or md.street is not null) then
      update service.members set
        postal_code = md.postal_code, street = md.street, street_number = md.street_number, complement = md.complement,
        neighborhood = md.neighborhood, city = md.city, state = md.state, country = md.country,
        municipality_ibge = md.municipality_ibge, latitude = md.latitude, longitude = md.longitude,
        geo_source = md.geo_source, geo_precision = md.geo_precision, geo_updated_at = md.geo_updated_at, address_data = md.address_data
       where id = mk.id;
    end if;
    if mk.map_consent_at is null and mk.map_consent_declined_at is null and (md.map_consent_at is not null or md.map_consent_declined_at is not null) then
      update service.members set
        map_consent_at = md.map_consent_at, map_consent_declined_at = md.map_consent_declined_at,
        map_consent_source = md.map_consent_source, map_consent_terms = md.map_consent_terms
       where id = mk.id;
    end if;
    delete from service.members where id = md.id;
  elsif md.id is not null then
    v_fica_m := md.id;
  end if;

  if v_fica_m is not null and v_fica_p is not null then
    update service.members set volunteer_id = v_fica_p where id = v_fica_m and volunteer_id is distinct from v_fica_p;
  end if;

  insert into service.juntadas (organization_id, fica_membro, fica_pessoa, sai_membro, sai_pessoa, copia, por)
  values (p_org, v_fica_m, v_fica_p, case when mk.id is not null then md.id end, case when pk.id is not null then pd.id end, v_copia, auth.uid());

  if v_fica_m is not null and (md.id is not null or pd.id is not null) then
    insert into service.timeline_events (organization_id, member_id, event_type, title, body, sort_key, when_label)
    values (p_org, v_fica_m, 'cadastro', 'Cadastros juntados',
            'Duas fichas da mesma pessoa viraram uma: histórico, escalas, grupos e acesso ficaram aqui.',
            to_char(current_date, 'YYYYMMDD')::bigint, to_char(current_date, 'DD/MM/YYYY'));
  end if;

  perform service._juntar_gatilhos(true);
  return 'ok';
end $$;
revoke all on function service.juntar_fichas(uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function service.juntar_fichas(uuid, uuid, uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
