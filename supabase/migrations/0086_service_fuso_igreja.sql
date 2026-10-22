-- Datas/horas dos encontros continuam civis, sem reescrita de registros.
alter table service.churches add column if not exists time_zone text not null default 'America/Sao_Paulo';

create or replace function service.trg_validar_fuso_igreja()
returns trigger language plpgsql set search_path = pg_catalog, service as $$
begin
  if new.time_zone is null or not exists (select 1 from pg_timezone_names where name = new.time_zone) then
    raise exception 'Escolha um fuso horário válido.' using errcode = '22023';
  end if;
  return new;
end $$;
revoke all on function service.trg_validar_fuso_igreja() from public;
drop trigger if exists validar_fuso_igreja on service.churches;
create trigger validar_fuso_igreja before insert or update of time_zone on service.churches for each row execute function service.trg_validar_fuso_igreja();

-- Helpers internos. Não oferecem consulta de outras igrejas pelo navegador.
create or replace function service.church_time_zone(p_church uuid)
returns text language sql stable security definer set search_path = service, public as $$
  select coalesce((select c.time_zone from service.churches c where c.id = p_church), 'America/Sao_Paulo');
$$;
revoke all on function service.church_time_zone(uuid) from public, anon, authenticated;
grant execute on function service.church_time_zone(uuid) to service_role;

create or replace function service.organization_time_zone(p_org uuid)
returns text language sql stable security definer set search_path = service, public as $$
  select coalesce((select c.time_zone from service.churches c where c.organization_id = p_org order by c.is_headquarters desc, c.created_at, c.id limit 1), 'America/Sao_Paulo');
$$;
revoke all on function service.organization_time_zone(uuid) from public, anon, authenticated;
grant execute on function service.organization_time_zone(uuid) to service_role;


-- Rotinas existentes: mantém as autorizações, muda somente o relógio civil.

create or replace function service.kids_checkin_session(p_event uuid, p_child uuid)
returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_class uuid;
  v_date date;
  v_time text;
  v_now timestamp;
  v_session uuid;
  v_active boolean;
begin
  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  v_org := (select ch.organization_id from service.children ch
            where ch.id = p_child
              and exists (select 1 from service.child_guardians g
                          where g.child_id = ch.id and g.guardian_person_id in (select unnest(service.my_people()))));
  v_class := (select ch.class_id from service.children ch where ch.id = p_child and v_org is not null);
  if v_org is null or v_class is null then return null; end if;

  v_date := (select e.event_date from service.events e where e.id = p_event and e.organization_id = v_org);
  v_time := (select e.time from service.events e where e.id = p_event and e.organization_id = v_org);
  v_now := now() at time zone service.church_time_zone((select e.church_id from service.events e where e.id = p_event and e.organization_id = v_org));
  if v_date is null or v_date <> v_now::date then return null; end if;

  -- abre 60 minutos antes do culto (sem hora marcada: o dia todo)
  if v_time ~ '^\d{1,2}:\d{2}' and v_now < (v_date + substring(v_time from '^\d{1,2}:\d{2}')::time - interval '60 minutes') then
    return null;
  end if;

  v_session := (select s.id from service.kids_sessions s where s.event_id = p_event and s.class_id = v_class);

  if v_session is null then
    insert into service.kids_sessions (organization_id, event_id, class_id, checkin_token, checkin_active)
    values (v_org, p_event, v_class, md5(gen_random_uuid()::text), true)
    on conflict (event_id, class_id) do nothing;
    v_session := (select s.id from service.kids_sessions s where s.event_id = p_event and s.class_id = v_class);
  end if;
  v_active := (select s.checkin_active from service.kids_sessions s where s.id = v_session);

  if not coalesce(v_active, false) then return null; end if;
  return v_session;
end $$;

create or replace function service.visitante_autocadastro(
  p_slug        text,
  p_name        text,
  p_phone       text,
  p_email       text,
  p_heard_from  text,
  p_invited_by  text,
  p_interests   text[],
  p_consent     boolean
)
returns text
language plpgsql volatile security definer set search_path = service, public as $$
declare
  v_church   service.churches%rowtype;
  v_cfg      jsonb;
  v_name     text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_digits   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email    text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_heard    text := nullif(btrim(coalesce(p_heard_from, '')), '');
  v_invited  text := nullif(regexp_replace(btrim(coalesce(p_invited_by, '')), '\s+', ' ', 'g'), '');
  v_interest text[];
  v_resp     uuid;
  v_phone    text;
begin
  select * into v_church from service.churches where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then return 'fechado'; end if;

  v_cfg := coalesce(v_church.settings -> 'autocadastro', '{}'::jsonb);
  if coalesce((v_cfg ->> 'ativo')::boolean, false) is not true then return 'fechado'; end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then return 'nome'; end if;

  -- celular brasileiro com DDD (10 ou 11 dígitos), aceita +55 na frente
  if v_digits like '55%' and char_length(v_digits) in (12, 13) then v_digits := substr(v_digits, 3); end if;
  if char_length(v_digits) not in (10, 11) then return 'telefone'; end if;

  if v_email is not null and (char_length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then return 'email'; end if;
  if p_consent is not true then return 'consentimento'; end if;

  if v_heard is not null and v_heard not in ('instagram', 'amigo', 'passando', 'evento', 'outro') then v_heard := 'outro'; end if;
  v_invited := left(v_invited, 120);
  select coalesce(array_agg(distinct i), '{}') into v_interest
    from unnest(coalesce(p_interests, '{}')) i
   where i in ('conhecer', 'grupo', 'oracao', 'servir', 'batismo', 'criancas');

  if exists (
    select 1 from service.visitors
     where church_id = v_church.id and origin = 'QR/link'
       and created_at > now() - interval '10 minutes'
       and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits
  ) then return 'repetido'; end if;

  if (select count(*) from service.visitors
       where church_id = v_church.id and origin = 'QR/link'
         and created_at > now() - interval '10 minutes') >= 30 then return 'limite'; end if;

  -- responsável escolhido pela gestão, se ainda for alguém desta organização
  begin
    v_resp := nullif(v_cfg ->> 'responsavelId', '')::uuid;
  exception when others then v_resp := null;
  end;
  if v_resp is not null and not exists (
    select 1 from service.people where id = v_resp and organization_id = v_church.organization_id
  ) then v_resp := null; end if;

  v_phone := case char_length(v_digits)
    when 11 then format('(%s) %s %s-%s', substr(v_digits, 1, 2), substr(v_digits, 3, 1), substr(v_digits, 4, 4), substr(v_digits, 8, 4))
    else format('(%s) %s-%s', substr(v_digits, 1, 2), substr(v_digits, 3, 4), substr(v_digits, 7, 4))
  end;

  insert into service.visitors (
    organization_id, church_id, name, phone, email, stage, visited_on, origin,
    heard_from, invited_by, interests, consent_at, responsible_id, due, due_status
  ) values (
    v_church.organization_id, v_church.id, v_name, v_phone, v_email, 'novo',
    to_char((now() at time zone v_church.time_zone)::date, 'YYYY-MM-DD'), 'QR/link',
    v_heard, v_invited, v_interest, now(), v_resp, '1º contato', 'soon'
  );
  return 'ok';
end $$;

create or replace function service.metricas_internas(p_org uuid, p_dias int default 90)
returns jsonb
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_fuso text := service.organization_time_zone(p_org);
  v_ini date := (now() at time zone v_fuso)::date - greatest(p_dias, 7) + 1;
  v_fim date := (now() at time zone v_fuso)::date;
  v_semanas int := ceil(greatest(p_dias, 7) / 7.0);
  r jsonb;
begin
  if not core.has_role(p_org, 'owner', 'master') then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  r := (
  with
  ev as (
    select e.id, e.event_date, e.ministries,
           ((e.event_date + coalesce(nullif(substring(e.time from '^\d{1,2}:\d{2}'), ''), '00:00')::time) at time zone service.church_time_zone(e.church_id)) as inicio
    from service.events e
    where e.organization_id = p_org and e.event_date between v_ini and v_fim
  ),
  vagas as (
    select ev.id as event_id, ev.inicio, mp.id as position_id, greatest(mp.need_count, 1) as pede
    from ev
    join service.ministry_positions mp on mp.organization_id = p_org
    where cardinality(ev.ministries) = 0 or mp.ministry_id = any(ev.ministries)
  ),
  cobertura as (
    select v.event_id,
           sum(v.pede) as pedidas,
           sum(least(v.pede, (select count(*) from service.roster_assignments r
                              where r.event_id = v.event_id and r.position_id = v.position_id
                                and r.status = 'ok' and r.updated_at <= v.inicio - interval '48 hours'))) as cobertas,
           sum(least(v.pede, (select count(*) from service.roster_assignments r
                              where r.event_id = v.event_id and r.position_id = v.position_id and r.status <> 'no'))) as preenchidas
    from vagas v
    where v.inicio <= now()
    group by v.event_id
  ),
  fechamento as (
    select c.event_id,
           extract(epoch from (max(r.created_at) - min(r.created_at))) / 60 as minutos
    from cobertura c
    join service.roster_assignments r on r.event_id = c.event_id and r.status <> 'no'
    where c.pedidas > 0 and c.preenchidas >= c.pedidas
    group by c.event_id
  ),
  presenca as (
    select a.person_id, count(distinct date_trunc('week', e.event_date)) as semanas
    from service.event_attendance a
    join service.events e on e.id = a.event_id
    where a.organization_id = p_org and e.event_date between v_ini and v_fim
    group by a.person_id
  ),
  visit as (
    select v.id, service.church_time_zone(v.church_id) as fuso, (case when v.visited_on ~ '^\d{4}-\d{2}-\d{2}' then substring(v.visited_on from 1 for 10)::date else (v.created_at at time zone service.church_time_zone(v.church_id))::date end) as dia, v.created_at
    from service.visitors v
    where v.organization_id = p_org
      and (case when v.visited_on ~ '^\d{4}-\d{2}-\d{2}' then substring(v.visited_on from 1 for 10)::date else (v.created_at at time zone service.church_time_zone(v.church_id))::date end) between v_ini and v_fim
  ),
  app as (
    select p.id, exists (select 1 from service.push_subscriptions s where s.person_id = p.id) as com_push
    from service.people p
    where p.organization_id = p_org and p.user_id is not null
  ),
  cartoes as (
    select evento, count(*) as n from service.app_events
    where organization_id = p_org and created_at >= (v_ini::timestamp at time zone v_fuso)
    group by evento
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('ini', v_ini, 'fim', v_fim, 'semanas', v_semanas),
    'participacao', jsonb_build_object(
      'pessoas', (select count(*) from presenca),
      'media_semanas', (select round(avg(semanas)::numeric, 1) from presenca)),
    'vagas48h', jsonb_build_object(
      'cultos', (select count(*) from cobertura where pedidas > 0),
      'pedidas', (select coalesce(sum(pedidas), 0) from cobertura),
      'cobertas', (select coalesce(sum(cobertas), 0) from cobertura)),
    'fechar_escala', jsonb_build_object(
      'cultos', (select count(*) from fechamento),
      'mediana_minutos', (select round(percentile_cont(0.5) within group (order by minutos)::numeric) from fechamento)),
    'visitantes48h', jsonb_build_object(
      'visitantes', (select count(*) from visit),
      'contatados', (select count(*) from visit
                     where exists (select 1 from service.visitor_notes n where n.visitor_id = visit.id
                                   and n.created_at <= (visit.dia::timestamp at time zone visit.fuso) + interval '48 hours'))),
    'notificacoes', jsonb_build_object(
      'com_app', (select count(*) from app),
      'sem_aviso', (select count(*) from app where not com_push)),
    'cartoes', coalesce((select jsonb_object_agg(evento, n) from cartoes), '{}'::jsonb)
  ));
  return r;
end $$;

create or replace function service.trg_fato_serviu()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_nome text;
  v_dia date;
  v_funcao text;
begin
  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  v_nome := (select e.name from service.events e where e.id = new.event_id);
  v_dia := (select e.event_date from service.events e where e.id = new.event_id);
  v_funcao := (select coalesce(mp.name, mi.name)
               from service.roster_assignments r
               join service.ministry_positions mp on mp.id = r.position_id
               left join service.ministries mi on mi.id = mp.ministry_id
               where r.event_id = new.event_id and r.person_id = new.person_id and r.status <> 'no'
               limit 1);
  if v_funcao is null then return new; end if;  -- presença sem escala não é "serviu"
  perform service.gravar_fato(new.person_id, 'serviu', 'Serviu · ' || coalesce(v_nome, 'evento'), v_funcao,
                              coalesce(v_dia, (new.checked_in_at at time zone service.church_time_zone((select e.church_id from service.events e where e.id = new.event_id)))::date),
                              'evento:' || new.event_id);
  return new;
end $$;

create or replace function service.gravar_fato(p_person uuid, p_tipo text, p_titulo text, p_corpo text, p_dia date, p_ref text)
returns void
language plpgsql security definer set search_path = service, public as $$
begin
  insert into service.timeline_events (organization_id, member_id, event_type, title, body, sort_key, when_label, ref)
  select m.organization_id, m.id, p_tipo, p_titulo, p_corpo,
         to_char(coalesce(p_dia, (now() at time zone service.church_time_zone(m.church_id))::date), 'YYYYMMDD')::bigint,
         to_char(coalesce(p_dia, (now() at time zone service.church_time_zone(m.church_id))::date), 'DD/MM/YYYY'),
         p_ref
  from service.members m
  where m.volunteer_id = p_person
  on conflict (member_id, event_type, ref) where ref is not null do nothing;
end $$;

create or replace function service.trg_fato_trocou()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_nome text;
begin
  if new.person_id is not distinct from old.person_id then return new; end if;
  v_nome := (select e.name from service.events e where e.id = new.event_id);
  perform service.gravar_fato(old.person_id, 'trocou', 'Trocou a escala · ' || coalesce(v_nome, 'evento'), null,
                              (now() at time zone service.church_time_zone((select e.church_id from service.events e where e.id = new.event_id)))::date, 'vaga:' || new.id || ':' || new.person_id);
  return new;
end $$;

create or replace function service.trg_fato_aula()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_curso text;
  i int;
begin
  if coalesce(new.done_count, 0) <= coalesce(old.done_count, 0) then return new; end if;
  v_curso := (select c.name from service.courses c where c.id = new.course_id);
  for i in (coalesce(old.done_count, 0) + 1)..new.done_count loop
    insert into service.timeline_events (organization_id, member_id, event_type, title, body, sort_key, when_label, ref)
    values (new.organization_id, new.member_id, 'aula', 'Concluiu a aula ' || i, v_curso,
            to_char((now() at time zone service.church_time_zone((select m.church_id from service.members m where m.id = new.member_id)))::date, 'YYYYMMDD')::bigint, to_char((now() at time zone service.church_time_zone((select m.church_id from service.members m where m.id = new.member_id)))::date, 'DD/MM/YYYY'),
            'curso:' || new.course_id || ':' || i)
    on conflict (member_id, event_type, ref) where ref is not null do nothing;
  end loop;
  return new;
end $$;

create or replace function service.trg_fato_grupo()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_grupo text;
begin
  if new.group_id is null or new.group_id is not distinct from old.group_id then return new; end if;
  v_grupo := (select g.name from service.fellowship_groups g where g.id = new.group_id);
  insert into service.timeline_events (organization_id, member_id, event_type, title, sort_key, when_label, ref)
  values (new.organization_id, new.id, 'grupo', 'Entrou no grupo ' || coalesce(v_grupo, ''),
          to_char((now() at time zone service.church_time_zone(new.church_id))::date, 'YYYYMMDD')::bigint, to_char((now() at time zone service.church_time_zone(new.church_id))::date, 'DD/MM/YYYY'), 'grupo:' || new.group_id)
  on conflict (member_id, event_type, ref) where ref is not null do nothing;
  return new;
end $$;

create or replace function service.fin_fechar_mes(p_org uuid, p_mes text, p_notas text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_ini date;
  v_fim date;
  v_id uuid;
  v_pessoa uuid;
  v_totais jsonb;
begin
  if not service.fin_can(p_org, true) then return 'nao_pode'; end if;
  if p_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' then return 'mes_invalido'; end if;
  v_ini := (p_mes || '-01')::date;
  v_fim := (v_ini + interval '1 month - 1 day')::date;
  if v_ini > (now() at time zone service.organization_time_zone(p_org))::date then return 'mes_futuro'; end if;
  if service.fin_mes_fechado(p_org, v_ini) then return 'ja_fechado'; end if;
  select id into v_pessoa from service.people where user_id = auth.uid() and organization_id = p_org limit 1;

  v_totais := jsonb_build_object(
    'entradas_cents', coalesce((select sum(amount_cents) from fin_transactions where organization_id = p_org and status = 'realizado' and kind = 'entrada' and occurred_on between v_ini and v_fim), 0),
    'despesas_cents', coalesce((select sum(amount_cents) from fin_transactions where organization_id = p_org and status = 'realizado' and kind = 'despesa' and occurred_on between v_ini and v_fim), 0),
    'previstos_em_aberto', (select count(*) from fin_transactions where organization_id = p_org and status = 'previsto' and occurred_on between v_ini and v_fim),
    'por_categoria', coalesce((
      select jsonb_agg(jsonb_build_object('categoria', c.name, 'tipo', t.kind, 'total_cents', sum_t) order by t.kind, sum_t desc)
      from (select category_id, kind, sum(amount_cents) as sum_t from fin_transactions
            where organization_id = p_org and status = 'realizado' and kind <> 'transferencia' and occurred_on between v_ini and v_fim
            group by category_id, kind) t
      join fin_categories c on c.id = t.category_id), '[]'::jsonb),
    'saldo_contas', coalesce((
      select jsonb_agg(jsonb_build_object('conta', a.name, 'saldo_cents',
        a.opening_balance_cents
        + coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end) from fin_transactions t
                    where t.account_id = a.id and t.status = 'realizado' and t.occurred_on <= v_fim), 0)
        + coalesce((select sum(t.amount_cents) from fin_transactions t
                    where t.to_account_id = a.id and t.status = 'realizado' and t.occurred_on <= v_fim), 0)) order by a.sort_order, a.name)
      from fin_accounts a where a.organization_id = p_org), '[]'::jsonb),
    'saldo_fundos', coalesce((
      select jsonb_agg(jsonb_build_object('fundo', f.name, 'saldo_cents',
        coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end) from fin_transactions t
                  where t.fund_id = f.id and t.status = 'realizado' and t.kind <> 'transferencia' and t.occurred_on <= v_fim), 0)) order by f.sort_order, f.name)
      from fin_funds f where f.organization_id = p_org), '[]'::jsonb)
  );

  insert into fin_closings (organization_id, month, totals, notes, closed_by)
  values (p_org, p_mes, v_totais, nullif(trim(coalesce(p_notas, '')), ''), v_pessoa)
  returning id into v_id;

  perform set_config('svc.fin_fechando', '1', true);
  update fin_transactions set closing_id = v_id
   where organization_id = p_org and occurred_on between v_ini and v_fim;
  perform set_config('svc.fin_fechando', '', true);
  return 'ok';
end $$;

create or replace function service.verificar_carteirinha(p_codigo text)
returns jsonb
language sql stable security definer set search_path = service, public as $$
  select jsonb_build_object(
    'organizacao', c.organization_id,
    'nome', split_part(trim(m.name), ' ', 1)
            || case when position(' ' in trim(m.name)) > 0
                    then ' ' || left(regexp_replace(trim(m.name), '^.* ', ''), 1) || '.'
                    else '' end,
    'situacao', case
      when c.revogada_em is not null then 'revogada'
      when exists (select 1 from service.registros r where r.livro = 'rol' and r.member_id = m.id and r.saida is not null) then 'desligado'
      when c.validade < (now() at time zone service.church_time_zone(m.church_id))::date then 'vencida'
      else 'valida' end,
    'validade', c.validade
  )
  from service.carteirinhas c
  join service.members m on m.id = c.member_id
  where c.codigo = p_codigo and length(p_codigo) >= 16
  limit 1
$$;

create or replace function service.trg_livro_rol()
returns trigger
language plpgsql security definer set search_path = service, public as $$
begin
  if tg_op = 'INSERT' then
    insert into service.registros (organization_id, church_id, livro, data, nome, member_id)
    values (new.organization_id, new.church_id, 'rol', (coalesce(new.created_at, now()) at time zone service.church_time_zone(new.church_id))::date, new.name, new.id)
    on conflict do nothing;
    return new;
  end if;
  update service.registros
     set saida = coalesce(saida, (now() at time zone service.church_time_zone(old.church_id))::date), saida_motivo = coalesce(saida_motivo, 'Ficha removida')
   where livro = 'rol' and member_id = old.id;
  return old;
end $$;
