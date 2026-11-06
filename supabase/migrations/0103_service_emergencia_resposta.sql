-- G15: a pergunta da emergência chega à família com "Estamos bem" e
-- "Precisamos de ajuda"; o toque grava a resposta e a situação muda sozinha
-- no painel. Quem coordena ainda corrige à mão, e tudo fica registrado
-- (fonte e quem). PLANO.md §10, prancha P13.

-- de onde veio a situação: da coordenação (à mão) ou da família (resposta)
alter table service.map_emergency_families add column if not exists fonte text not null default 'coordenacao';
alter table service.map_emergency_families drop constraint if exists map_emergency_families_fonte_check;
alter table service.map_emergency_families add constraint map_emergency_families_fonte_check check (fonte in ('coordenacao', 'familia'));
alter table service.map_emergency_families add column if not exists respondido_por uuid references service.members(id) on delete set null;

-- cada pergunta enviada: a mensagem na conversa com a família
create table if not exists service.map_emergency_asks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  emergencia_id uuid not null references service.map_emergencies(id) on delete cascade,
  chave text not null,
  member_id uuid not null references service.members(id) on delete cascade,
  message_id uuid not null references service.messages(id) on delete cascade,
  perguntado_por uuid references service.people(id) on delete set null,
  -- a resposta de quem recebeu (cada toque fica guardado aqui)
  resposta text check (resposta is null or resposta in ('bem', 'ajuda')),
  respondido_em timestamptz,
  created_at timestamptz not null default now()
);
alter table service.map_emergency_asks add column if not exists resposta text check (resposta is null or resposta in ('bem', 'ajuda'));
alter table service.map_emergency_asks add column if not exists respondido_em timestamptz;
create index if not exists map_emergency_asks_msg_idx on service.map_emergency_asks (message_id);
create index if not exists map_emergency_asks_emerg_idx on service.map_emergency_asks (emergencia_id);
alter table service.map_emergency_asks enable row level security;
revoke all on service.map_emergency_asks from anon, authenticated;
-- leitura e escrita só pelas funções abaixo

-- perguntar a uma família (quem coordena): manda a mensagem e guarda a pergunta
create or replace function service.mapa_emergencia_perguntar(p_id uuid, p_chave text, p_member uuid, p_body text)
returns uuid language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype; v_chat uuid; v_me uuid; v_msg uuid;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  if e.status <> 'aberta' then raise exception 'encerrada'; end if;
  if nullif(btrim(coalesce(p_body, '')), '') is null or length(p_body) > 500 then raise exception 'texto_invalido'; end if;
  -- o destinatário tem de ser da família e morar na área
  if not exists (select 1 from service.members m where m.id = p_member and m.organization_id = e.organization_id and m.latitude is not null
      and coalesce(nullif(trim(m.family), ''), m.id::text) = p_chave
      and extensions.st_intersects(e.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326))) then raise exception 'fora_da_area'; end if;
  v_chat := service.start_dm(p_member, null);
  if v_chat is null then raise exception 'sem_ficha'; end if;
  select m.id into v_me from service.members m where m.id = any(service.my_members()) and m.organization_id = e.organization_id limit 1;
  insert into service.messages (organization_id, chat_id, sender_id, body) values (e.organization_id, v_chat, v_me, btrim(p_body)) returning id into v_msg;
  insert into service.map_emergency_asks (organization_id, emergencia_id, chave, member_id, message_id, perguntado_por)
  values (e.organization_id, p_id, p_chave, p_member, v_msg, service.mapa_eu(e.organization_id));
  return v_msg;
end $$;
revoke all on function service.mapa_emergencia_perguntar(uuid, text, uuid, text) from public, anon;
grant execute on function service.mapa_emergencia_perguntar(uuid, text, uuid, text) to authenticated;

-- perguntar a todas as famílias sem resposta de uma vez (cada membro da
-- família recebe; devolve quantas famílias receberam ao menos uma mensagem)
create or replace function service.mapa_emergencia_perguntar_todas(p_id uuid, p_body text)
returns integer language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype; r record; v_n integer := 0; v_ultima text := null; v_ok boolean;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  if e.status <> 'aberta' then raise exception 'encerrada'; end if;
  for r in
    select m.id, coalesce(nullif(trim(m.family), ''), m.id::text) as k
      from service.members m
      left join service.map_emergency_families f on f.emergencia_id = p_id and f.chave = coalesce(nullif(trim(m.family), ''), m.id::text)
     where m.organization_id = e.organization_id and m.latitude is not null
       and extensions.st_intersects(e.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326))
       and coalesce(f.status, 'sem_resposta') = 'sem_resposta'
     order by 2
  loop
    v_ok := true;
    begin
      perform service.mapa_emergencia_perguntar(p_id, r.k, r.id, p_body);
    exception when others then v_ok := false;
    end;
    if v_ok and r.k is distinct from v_ultima then v_n := v_n + 1; v_ultima := r.k; end if;
  end loop;
  return v_n;
end $$;
revoke all on function service.mapa_emergencia_perguntar_todas(uuid, text) from public, anon;
grant execute on function service.mapa_emergencia_perguntar_todas(uuid, text) to authenticated;

-- as perguntas que chegaram para mim (app do membro): a mensagem, se ainda
-- vale e o que a família respondeu
drop function if exists service.mapa_minhas_perguntas();
create or replace function service.mapa_minhas_perguntas()
returns table (message_id uuid, aberta boolean, resposta text, minha boolean)
language sql stable security definer set search_path = service, public as $$
  select a.message_id, e.status = 'aberta',
         coalesce(a.resposta, case when f.fonte = 'familia' then f.status end),
         a.resposta is not null
    from service.map_emergency_asks a
    join service.map_emergencies e on e.id = a.emergencia_id
    left join service.map_emergency_families f on f.emergencia_id = a.emergencia_id and f.chave = a.chave
   where a.member_id = any(service.my_members())
$$;
revoke all on function service.mapa_minhas_perguntas() from public, anon;
grant execute on function service.mapa_minhas_perguntas() to authenticated;

-- a família responde com um toque. A chave e a área são as de agora (a
-- família pode ter mudado); um "bem" não apaga um "ajuda" já registrado,
-- e cada toque fica guardado na pergunta.
create or replace function service.mapa_emergencia_responder(p_message uuid, p_status text)
returns void language plpgsql security definer set search_path = service, public as $$
declare a service.map_emergency_asks%rowtype; e service.map_emergencies%rowtype; v_chave text;
begin
  if p_status not in ('bem', 'ajuda') then raise exception 'status_invalido'; end if;
  select * into a from service.map_emergency_asks where message_id = p_message and member_id = any(service.my_members()) limit 1;
  if not found then raise exception 'sem_acesso'; end if;
  select * into e from service.map_emergencies where id = a.emergencia_id;
  if e.status <> 'aberta' then raise exception 'encerrada'; end if;
  select coalesce(nullif(trim(m.family), ''), m.id::text) into v_chave from service.members m
   where m.id = a.member_id and m.latitude is not null
     and extensions.st_intersects(e.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326));
  if v_chave is null then raise exception 'fora_da_area'; end if;
  update service.map_emergency_asks set resposta = p_status, respondido_em = now() where id = a.id;
  insert into service.map_emergency_families (emergencia_id, chave, status, fonte, respondido_por, atualizado_por)
  values (a.emergencia_id, v_chave, p_status, 'familia', a.member_id, null)
  on conflict (emergencia_id, chave) do update set status = excluded.status, fonte = 'familia', respondido_por = excluded.respondido_por, atualizado_por = null, atualizado_em = now()
   where service.map_emergency_families.status <> 'ajuda' or excluded.status = 'ajuda';
end $$;
revoke all on function service.mapa_emergencia_responder(uuid, text) from public, anon;
grant execute on function service.mapa_emergencia_responder(uuid, text) to authenticated;

-- correção à mão: a fonte volta a ser a coordenação
create or replace function service.mapa_emergencia_status(p_id uuid, p_chave text, p_status text, p_nota text default null)
returns void language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  if e.status <> 'aberta' then raise exception 'encerrada'; end if;
  if p_status not in ('sem_resposta', 'bem', 'ajuda') then raise exception 'status_invalido'; end if;
  if not exists (select 1 from service.members m where m.organization_id = e.organization_id and m.latitude is not null
      and coalesce(nullif(trim(m.family), ''), m.id::text) = p_chave
      and extensions.st_intersects(e.geom, extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326))) then raise exception 'fora_da_area'; end if;
  insert into service.map_emergency_families (emergencia_id, chave, status, nota, atualizado_por, fonte) values (p_id, p_chave, p_status, p_nota, service.mapa_eu(e.organization_id), 'coordenacao')
  on conflict (emergencia_id, chave) do update set status = excluded.status, nota = coalesce(excluded.nota, service.map_emergency_families.nota), atualizado_em = now(), atualizado_por = excluded.atualizado_por, fonte = 'coordenacao', respondido_por = null;
end $$;

-- famílias: + de onde veio a situação
drop function if exists service.mapa_emergencia_familias(uuid);
create or replace function service.mapa_emergencia_familias(p_id uuid)
returns table (chave text, nome text, pessoas integer, bairro text, contato_member_id uuid, telefone text, status text, atualizado_em timestamptz, membros jsonb, latitude double precision, longitude double precision, marcado_por text, fonte text)
language plpgsql security definer set search_path = service, public as $$
declare e service.map_emergencies%rowtype;
begin
  select * into e from service.map_emergencies where id = p_id;
  if not found or not service.mapa_coordena(e.organization_id) then raise exception 'sem_acesso'; end if;
  if e.status <> 'aberta' then raise exception 'encerrada'; end if;
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
         jsonb_agg(jsonb_build_object('id', d.id, 'nome', d.name) order by d.name),
         round(avg(d.latitude)::numeric, 3)::double precision,
         round(avg(d.longitude)::numeric, 3)::double precision,
         (select p.name from service.people p where p.id = f.atualizado_por),
         f.fonte
    from dentro d left join service.map_emergency_families f on f.emergencia_id = p_id and f.chave = d.k
   group by d.k, f.status, f.atualizado_em, f.atualizado_por, f.fonte
   order by case coalesce(f.status, 'sem_resposta') when 'ajuda' then 0 when 'sem_resposta' then 1 else 2 end, 2;
end $$;
revoke all on function service.mapa_emergencia_familias(uuid) from public, anon;
grant execute on function service.mapa_emergencia_familias(uuid) to authenticated;
