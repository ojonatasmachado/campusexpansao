-- Service v7 · migrações 0052 em diante, numa transação só.
-- Gerado por scripts/ci/pacote-producao.sh a partir de supabase/migrations/.
-- Rode inteiro no SQL Editor do Supabase. Se der erro, nada é gravado:
-- copie a mensagem e não rode de novo pela metade.

begin;

-- ═══ 0052_service_kids_checkin_app.sql ═══
-- CE.X Service · 0052 · Check-in da criança pelo app do responsável (v7 2.3)
--
-- Até aqui o check-in do responsável só existia pela rota do QR
-- (/service/kids-checkin?session=...), e a sessão da turma só nascia quando o
-- professor abria a tela de check-in no painel. No dia do culto o app mostra o
-- cartão de cada filho; a partir de 60 minutos antes do culto o responsável
-- faz o check-in ali mesmo.
--
-- Esta função devolve a sessão da turma da criança naquele culto, criando a
-- sessão se o professor ainda não abriu (a escrita direta em kids_sessions é
-- só da liderança, 0017). Confere: a pessoa logada é responsável pela
-- criança, a criança tem turma, o culto é hoje (horário de Brasília) e já
-- passou a hora de abrir. Sessão desligada pelo professor não reabre.
-- O registro da presença continua sendo o mesmo insert em kids_attendance
-- que a rota do QR já faz (app/service/lib/kids-checkin.ts).
-- Idempotente.

create or replace function service.kids_checkin_session(p_event uuid, p_child uuid)
returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_class uuid;
  v_date date;
  v_time text;
  v_now timestamp := (now() at time zone 'America/Sao_Paulo');
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

revoke all on function service.kids_checkin_session(uuid, uuid) from public;
grant execute on function service.kids_checkin_session(uuid, uuid) to authenticated;

-- ═══ 0053_service_destinatario_em_cadeia.sql ═══
-- CE.X Service · 0053 · Destinatário em cadeia para pedidos do membro (v7 2.4 e 2.5)
--
-- O app procurava o líder do time na lista de membros que o próprio membro
-- consegue ler; pelas regras de leitura (0044) o membro não enxerga a ficha
-- do líder, então "Pedir troca" avisava "Não achamos o líder do time" e o
-- pedido de oração ficava sem destinatário. Estas funções resolvem no banco
-- quem recebe, em cadeia, e só devolvem quem tem login e ficha de membro
-- (para a conversa existir dos dois lados, service.start_dm de 0049).
--
-- Troca de escala: líder do time, depois a gestão da igreja (master, dono,
-- pastor). Não existe ainda "coordenação do ministério" no modelo de dados;
-- quando existir, entra entre os dois níveis.
-- Oração: quem lidera a intercessão (time com ícone/nome de intercessão ou
-- oração; sem líder, quem serve nele), depois a gestão.
-- Sem ninguém, a função não devolve linha e o app esconde a entrada.
--
-- service.swap_candidates: quem pode assumir a vaga (mesmo time, mesma
-- função, livre no horário e ainda não escalado no culto).
-- Idempotente.

create or replace function service.request_recipient(p_kind text, p_ministry uuid default null)
returns table (member_id uuid, name text, via text, ministry text)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_me uuid;
  v_org uuid;
  v_person uuid;
begin
  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  v_me := (select m.id from service.members m where m.id = any(service.my_members()) order by m.id limit 1);
  v_org := (select m.organization_id from service.members m where m.id = v_me);
  v_person := (select m.volunteer_id from service.members m where m.id = v_me);
  if v_me is null then return; end if;

  if p_kind = 'troca' then
    return query
      select mb.id, mb.name, 'lider'::text, mi.name
      from service.person_ministries pm
      join service.ministries mi on mi.id = pm.ministry_id
      join service.people p on p.id = pm.person_id and p.user_id is not null
      join service.members mb on mb.volunteer_id = p.id and mb.organization_id = v_org
      where pm.organization_id = v_org and pm.is_leader and mb.id <> v_me
        and (case when p_ministry is not null then pm.ministry_id = p_ministry
                  else pm.ministry_id in (select x.ministry_id from service.person_ministries x where x.person_id = v_person) end)
      order by mb.name
      limit 1;
    if found then return; end if;
  elsif p_kind = 'oracao' then
    return query
      select mb.id, mb.name, 'intercessao'::text, mi.name
      from service.ministries mi
      join service.person_ministries pm on pm.ministry_id = mi.id
      join service.people p on p.id = pm.person_id and p.user_id is not null
      join service.members mb on mb.volunteer_id = p.id and mb.organization_id = v_org
      where mi.organization_id = v_org and mb.id <> v_me
        and (mi.icon in ('intercessao', 'oracao') or mi.name ~* '(interce|ora[cç][aã]o)')
      order by pm.is_leader desc, mb.name
      limit 1;
    if found then return; end if;
  else
    return;
  end if;

  -- gestão da igreja
  return query
    select mb.id, mb.name, 'gestao'::text, null::text
    from core.memberships ms
    join service.people p on p.user_id = ms.user_id and p.organization_id = ms.organization_id
    join service.members mb on mb.volunteer_id = p.id and mb.organization_id = ms.organization_id
    where ms.organization_id = v_org and ms.status = 'active' and ms.role in ('master', 'owner', 'pastor') and mb.id <> v_me
    order by array_position(array['master', 'owner', 'pastor'], ms.role), mb.name
    limit 1;
end $$;

revoke all on function service.request_recipient(text, uuid) from public;
grant execute on function service.request_recipient(text, uuid) to authenticated;

create or replace function service.swap_candidates(p_assignment uuid)
returns table (member_id uuid, name text)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_event uuid;
  v_position uuid;
  v_person uuid;
  v_ministry uuid;
  v_funcao text;
  v_slot text;
begin
  v_org := (select r.organization_id from service.roster_assignments r
            where r.id = p_assignment and r.person_id in (select unnest(service.my_people())));
  if v_org is null then return; end if;
  v_event := (select r.event_id from service.roster_assignments r where r.id = p_assignment);
  v_position := (select r.position_id from service.roster_assignments r where r.id = p_assignment);
  v_person := (select r.person_id from service.roster_assignments r where r.id = p_assignment);

  v_ministry := (select pos.ministry_id from service.ministry_positions pos where pos.id = v_position);
  v_funcao := (select pos.name from service.ministry_positions pos where pos.id = v_position);
  v_slot := (select e.slot from service.events e where e.id = v_event);

  return query
    select mb.id, mb.name
    from service.person_ministries pm
    join service.people p on p.id = pm.person_id and p.user_id is not null
    join service.members mb on mb.volunteer_id = p.id and mb.organization_id = v_org
    where pm.ministry_id = v_ministry and pm.person_id <> v_person
      and coalesce(p.status, 'ativo') not in ('pausa', 'ferias')
      -- mesma função: marcada no time ou já escalada nela antes
      and (v_funcao = any(pm.functions)
           or exists (select 1 from service.roster_assignments h where h.person_id = p.id and h.position_id = v_position))
      -- livre: não marcou que não pode nesse horário
      and coalesce(p.availability ->> coalesce(v_slot, ''), 'true') <> 'false'
      -- ainda não escalado neste culto
      and not exists (select 1 from service.roster_assignments o where o.event_id = v_event and o.person_id = p.id and o.status <> 'no')
    order by mb.name
    limit 5;
end $$;

revoke all on function service.swap_candidates(uuid) from public;
grant execute on function service.swap_candidates(uuid) to authenticated;

-- ═══ 0054_service_telefone_um_formato.sql ═══
-- v7 2.16 · Telefone guardado num formato só: "(11) 98000-1000".
-- Mesma regra de app/service/lib/telefone.ts: tira +55 e 0 na frente quando
-- sobra DDD + número (10 ou 11 dígitos) e formata. Qualquer outro valor fica
-- como foi digitado: nenhum dígito é jogado fora. Idempotente.

create or replace function service.formatar_telefone(p text)
returns text
language plpgsql
immutable
as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if p is null or btrim(p) = '' then
    return nullif(btrim(coalesce(p, '')), '');
  end if;
  if length(d) in (12, 13) and left(d, 2) = '55' then d := substr(d, 3); end if;
  if length(d) in (11, 12) and left(d, 1) = '0' then d := substr(d, 2); end if;
  if length(d) = 11 then
    return '(' || substr(d, 1, 2) || ') ' || substr(d, 3, 5) || '-' || substr(d, 8, 4);
  elsif length(d) = 10 then
    return '(' || substr(d, 1, 2) || ') ' || substr(d, 3, 4) || '-' || substr(d, 7, 4);
  end if;
  return btrim(p);
end;
$$;

create or replace function service.trg_formatar_telefone()
returns trigger
language plpgsql
as $$
begin
  new.phone := service.formatar_telefone(new.phone);
  return new;
end;
$$;

drop trigger if exists formatar_telefone on service.members;
create trigger formatar_telefone before insert or update of phone on service.members
  for each row execute function service.trg_formatar_telefone();

drop trigger if exists formatar_telefone on service.people;
create trigger formatar_telefone before insert or update of phone on service.people
  for each row execute function service.trg_formatar_telefone();

-- dados que já existem
update service.members set phone = service.formatar_telefone(phone)
  where phone is not null and phone is distinct from service.formatar_telefone(phone);
update service.people set phone = service.formatar_telefone(phone)
  where phone is not null and phone is distinct from service.formatar_telefone(phone);

-- ═══ 0055_service_modulos_por_igreja.sql ═══
-- ═══════════════════════════════════════════════════════════════════════════
-- 0055 · Service v7 · 4.1 · módulos ligados por igreja
--
-- O registro de módulos (app/service/modules/registry.ts) liga cada módulo pelo
-- padrão do seu manifesto (`liga`). A igreja só guarda as exceções:
--   modules_on  = módulos que o manifesto deixa desligados e a igreja ligou
--   modules_off = módulos que o manifesto liga e a igreja desligou
-- Assim um módulo novo entra ligado (ou não) pelo próprio manifesto, sem
-- precisar atualizar toda igreja. Mesmo desenho de ministries.app_modules
-- (0043): text[] com default vazio. Módulos essenciais (casca) ignoram o off.
-- A escrita segue a policy de update que já existe em service.churches.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.churches
  add column if not exists modules_on text[] not null default '{}',
  add column if not exists modules_off text[] not null default '{}';

comment on column service.churches.modules_on is 'Módulos do Service ligados nesta igreja além do padrão do manifesto (registry.ts).';
comment on column service.churches.modules_off is 'Módulos do Service desligados nesta igreja (o padrão do manifesto era ligado).';

-- ═══ 0056_service_vocabulario_igreja.sql ═══
-- ═══════════════════════════════════════════════════════════════════════════
-- 0056 · Service v7 · 4.13 · vocabulário da igreja (lei 7)
--
-- Quatro termos renomeáveis: caminhada, grupo, culto, voluntario. Cada um com
-- o nome da tela (até 24 caracteres) e o nome curto da barra (até 10):
--   { "caminhada": { "tela": "Jornada", "curto": "Jornada" } }
-- Só os termos diferentes do padrão são gravados (app/service/lib/vocabulario.ts).
-- Fica na igreja matriz, igual à marca do app. A escrita segue a policy de
-- update que já existe em service.churches.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.churches
  add column if not exists vocabulario jsonb not null default '{}'::jsonb;

comment on column service.churches.vocabulario is 'Nomes que a igreja dá aos termos do Service (caminhada, grupo, culto, voluntario): {tela (até 24), curto (até 10)}. Lido da matriz.';

-- ═══ 0057_service_tamanho_do_texto.sql ═══
-- ═══════════════════════════════════════════════════════════════════════════
-- 0057 · Service v7 · 4.9 · tamanho do texto no perfil da pessoa
--
-- Sete posições, como em Ajustes do iPhone: corpo de 14, 15, 16, 17, 19, 21 e
-- 23px (padrão na quarta, 17px). Guarda a posição (0 a 6), não o fator; o app
-- faz fator = corpo / 17 (app/service/lib/text-scale.ts). Nulo = a pessoa
-- nunca escolheu (o app usa o tamanho do sistema, quando o navegador informa).
-- A cópia no aparelho continua em localStorage.
-- Só a própria pessoa grava, pela RPC set_my_text_size (vale para todas as
-- fichas dela, uma por igreja). A leitura é pela my_text_size.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.members
  add column if not exists text_size smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_text_size_check') then
    alter table service.members add constraint members_text_size_check check (text_size is null or text_size between 0 and 6);
  end if;
end $$;

comment on column service.members.text_size is 'Tamanho do texto do app (posição 0 a 6: corpo 14, 15, 16, 17, 19, 21, 23px). Nulo = não escolheu.';

create or replace function service.set_my_text_size(p_size smallint)
returns integer
language plpgsql security definer set search_path = service, public as $$
declare
  v_count integer;
begin
  if p_size is not null and (p_size < 0 or p_size > 6) then
    raise exception 'tamanho fora da faixa (0 a 6)';
  end if;
  update service.members m
     set text_size = p_size
    from service.people p
   where m.volunteer_id = p.id
     and p.user_id = auth.uid();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function service.my_text_size()
returns smallint
language sql stable security definer set search_path = service, public as $$
  select m.text_size
    from service.members m
    join service.people p on p.id = m.volunteer_id
   where p.user_id = auth.uid()
     and m.text_size is not null
   order by m.created_at
   limit 1;
$$;

revoke all on function service.set_my_text_size(smallint) from public;
revoke all on function service.my_text_size() from public;
grant execute on function service.set_my_text_size(smallint) to authenticated;
grant execute on function service.my_text_size() to authenticated;

-- ═══ 0058_service_evento_pede.sql ═══
-- Service v7 4.5 · o que o evento pede ao membro, valor e instruções, e as
-- confirmações de presença e inscrições feitas pelo app.
-- Só aviso (padrão), confirmar presença ou inscrição. O app não recebe nem
-- confirma pagamento: com valor, mostra o valor e as instruções da igreja.

alter table service.events add column if not exists pede text not null default 'aviso';
alter table service.events drop constraint if exists events_pede_check;
alter table service.events add constraint events_pede_check check (pede in ('aviso', 'presenca', 'inscricao'));
alter table service.events add column if not exists valor text;
alter table service.events add column if not exists instrucoes text;
comment on column service.events.pede is 'O que o evento pede ao membro: aviso (só informa), presenca (confirmar presença) ou inscricao.';
comment on column service.events.valor is 'Valor como a igreja escreve (ex. "R$ 50"). Só exibido; o app não recebe pagamento.';
comment on column service.events.instrucoes is 'Instruções da igreja para quem vai: chave PIX, prazo, contato.';

create table if not exists service.event_rsvps (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  event_id         uuid not null references service.events(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  kind             text not null check (kind in ('presenca', 'inscricao')),
  created_at       timestamptz not null default now(),
  unique (event_id, person_id)
);
comment on table service.event_rsvps is 'Presença confirmada ou inscrição num evento, feita pela própria pessoa no app (v7 4.5).';
create index if not exists event_rsvps_event_idx on service.event_rsvps (event_id);

alter table service.event_rsvps enable row level security;
drop policy if exists svc_tenant on service.event_rsvps;
create policy svc_tenant on service.event_rsvps for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
-- leitura: liderança ou a própria linha (igual às respostas do Mural, 0049)
drop policy if exists svc_r_scope on service.event_rsvps;
create policy svc_r_scope on service.event_rsvps as restrictive for select to authenticated
  using (service.is_lead(organization_id) or person_id in (select unnest(service.my_people())));
-- escrita direta só da liderança; a pessoa responde pela função abaixo
drop policy if exists svc_w_ins on service.event_rsvps;
create policy svc_w_ins on service.event_rsvps as restrictive for insert to authenticated
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_upd on service.event_rsvps;
create policy svc_w_upd on service.event_rsvps as restrictive for update to authenticated
  using (service.is_lead(organization_id))
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_del on service.event_rsvps;
create policy svc_w_del on service.event_rsvps as restrictive for delete to authenticated
  using (service.is_lead(organization_id));
grant select, insert, update, delete on service.event_rsvps to authenticated;

-- a pessoa confirma (p_vai = true) ou desfaz (false). O tipo vem do evento.
create or replace function service.respond_event(p_event uuid, p_vai boolean)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_pede text;
  v_person uuid;
begin
  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  v_org := (select e.organization_id from service.events e where e.id = p_event);
  v_pede := (select e.pede from service.events e where e.id = p_event);
  if v_org is null then return 'inexistente'; end if;
  if v_pede not in ('presenca', 'inscricao') then return 'nao_pede'; end if;
  v_person := (select p.id from service.people p
               where p.id = any(service.my_people()) and p.organization_id = v_org limit 1);
  if v_person is null then return 'sem_ficha'; end if;
  if not coalesce(p_vai, false) then
    delete from service.event_rsvps where event_id = p_event and person_id = v_person;
    return 'ok';
  end if;
  insert into service.event_rsvps (organization_id, event_id, person_id, kind)
  values (v_org, p_event, v_person, v_pede)
  on conflict (event_id, person_id) do update set kind = excluded.kind, created_at = now();
  return 'ok';
end $$;
grant execute on function service.respond_event(uuid, boolean) to authenticated;

-- ═══ 0059_service_historico.sql ═══
-- Service v7 4.8 · Histórico (lei 10): fatos na linha do tempo da pessoa.
-- Sem gamificação: só fatos com data (serviu, trocou, concluiu aula, entrou
-- em grupo). Batismo, decisão e curso concluído já eram gravados pelo app.
-- Quem lê: a própria pessoa; o líder, quem está nos times que ele lidera;
-- gestão e pastores (owner, master, pastor), todos; e quem recebeu a
-- liberação "membros" explicitamente.

-- ── 1. referência para não gravar o mesmo fato duas vezes ─────────────────
alter table service.timeline_events add column if not exists ref text;
comment on column service.timeline_events.ref is 'Chave do fato que o gerou (ex. evento do check-in); evita duplicar o mesmo fato.';
create unique index if not exists timeline_events_fato_unico
  on service.timeline_events (member_id, event_type, ref) where ref is not null;

-- grava um fato para todas as fichas de membro de uma pessoa (people.id)
create or replace function service.gravar_fato(p_person uuid, p_tipo text, p_titulo text, p_corpo text, p_dia date, p_ref text)
returns void
language plpgsql security definer set search_path = service, public as $$
begin
  insert into service.timeline_events (organization_id, member_id, event_type, title, body, sort_key, when_label, ref)
  select m.organization_id, m.id, p_tipo, p_titulo, p_corpo,
         to_char(coalesce(p_dia, current_date), 'YYYYMMDD')::bigint,
         to_char(coalesce(p_dia, current_date), 'DD/MM/YYYY'),
         p_ref
  from service.members m
  where m.volunteer_id = p_person
  on conflict (member_id, event_type, ref) where ref is not null do nothing;
end $$;
revoke all on function service.gravar_fato(uuid, text, text, text, date, text) from public;

-- ── 2. serviu: check-in de quem estava na escala do evento ─────────────────
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
                              coalesce(v_dia, (new.checked_in_at at time zone 'America/Sao_Paulo')::date),
                              'evento:' || new.event_id);
  return new;
end $$;
drop trigger if exists fato_serviu on service.event_attendance;
create trigger fato_serviu after insert on service.event_attendance
  for each row execute function service.trg_fato_serviu();

-- ── 3. trocou: a vaga passou para outra pessoa ─────────────────────────────
create or replace function service.trg_fato_trocou()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare
  v_nome text;
begin
  if new.person_id is not distinct from old.person_id then return new; end if;
  v_nome := (select e.name from service.events e where e.id = new.event_id);
  perform service.gravar_fato(old.person_id, 'trocou', 'Trocou a escala · ' || coalesce(v_nome, 'evento'), null,
                              current_date, 'vaga:' || new.id || ':' || new.person_id);
  return new;
end $$;
drop trigger if exists fato_trocou on service.roster_assignments;
create trigger fato_trocou after update of person_id on service.roster_assignments
  for each row execute function service.trg_fato_trocou();

-- ── 4. concluiu aula: o número de aulas feitas subiu ───────────────────────
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
            to_char(current_date, 'YYYYMMDD')::bigint, to_char(current_date, 'DD/MM/YYYY'),
            'curso:' || new.course_id || ':' || i)
    on conflict (member_id, event_type, ref) where ref is not null do nothing;
  end loop;
  return new;
end $$;
drop trigger if exists fato_aula on service.enrollments;
create trigger fato_aula after update of done_count on service.enrollments
  for each row execute function service.trg_fato_aula();

-- ── 5. entrou em grupo ─────────────────────────────────────────────────────
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
          to_char(current_date, 'YYYYMMDD')::bigint, to_char(current_date, 'DD/MM/YYYY'), 'grupo:' || new.group_id)
  on conflict (member_id, event_type, ref) where ref is not null do nothing;
  return new;
end $$;
drop trigger if exists fato_grupo on service.members;
create trigger fato_grupo after update of group_id on service.members
  for each row execute function service.trg_fato_grupo();

-- ── 6. quem lê a história (lei 10) ─────────────────────────────────────────
-- membros que estão em algum time liderado por quem pergunta
create or replace function service.my_led_members()
returns uuid[]
language sql stable security definer set search_path = service, public as $$
  select coalesce(array_agg(distinct m.id), '{}')
  from service.person_ministries lider
  join service.people eu on eu.id = lider.person_id and eu.user_id = auth.uid()
  join service.person_ministries pm on pm.ministry_id = lider.ministry_id
  join service.members m on m.volunteer_id = pm.person_id
  where lider.is_leader
$$;
grant execute on function service.my_led_members() to authenticated;

create or replace function service.can_read_history(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor')
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org and p.user_id = auth.uid() and g.grant_code = 'membros'
      )
$$;
grant execute on function service.can_read_history(uuid) to authenticated;

drop policy if exists svc_r_scope on service.timeline_events;
create policy svc_r_scope on service.timeline_events as restrictive for select to authenticated
  using (
    service.can_read_history(organization_id)
    or member_id in (select unnest(service.my_members()))
    or member_id in (select unnest(service.my_led_members()))
  );

-- ═══ 0060_service_conversa_lida.sql ═══
-- Service v7 4.15 · Mensagens com não lidas: quando cada pessoa leu a conversa
-- pela última vez. Linhas que já existem contam como lidas agora (ninguém
-- recebe uma enxurrada de "não lidas" antigas no dia da atualização).

alter table service.chat_members add column if not exists last_read_at timestamptz not null default now();
comment on column service.chat_members.last_read_at is 'Até quando a pessoa leu a conversa; mensagens de outros depois disso contam como não lidas.';

-- a pessoa marca como lida só a própria linha (sem abrir update geral em chat_members)
create or replace function service.marcar_conversa_lida(p_chat uuid)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  n int;
begin
  update service.chat_members cm set last_read_at = now()
  where cm.chat_id = p_chat and cm.member_id = any(service.my_members());
  get diagnostics n = row_count;
  return case when n > 0 then 'ok' else 'fora' end;
end $$;
grant execute on function service.marcar_conversa_lida(uuid) to authenticated;

-- ═══ 0061_service_lista_de_cuidado.sql ═══
-- Service v7 4.17 · Lista de cuidado: quem está há semanas sem presença.
-- A lista é calculada no painel a partir da presença (check-in); aqui ficam
-- só as marcações de quem cuida: contato feito (ligação, mensagem, visita) e
-- ausência justificada (tira da lista por 30 dias). O membro nunca vê nada
-- disso: nem a marcação, nem o fato "contato" na própria história.

create table if not exists service.care_marks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  kind             text not null check (kind in ('contato', 'justificada')),
  via              text check (via in ('ligacao', 'mensagem', 'visita')),
  until            date,
  by_person        uuid references service.people(id) on delete set null,
  created_at       timestamptz not null default now()
);
comment on table service.care_marks is 'Lista de cuidado (v7 4.17): contato registrado ou ausência justificada. Só a liderança lê e escreve.';
create index if not exists care_marks_person_idx on service.care_marks (person_id, created_at desc);

alter table service.care_marks enable row level security;
drop policy if exists svc_tenant on service.care_marks;
create policy svc_tenant on service.care_marks for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
drop policy if exists svc_r_scope on service.care_marks;
create policy svc_r_scope on service.care_marks as restrictive for select to authenticated
  using (service.is_lead(organization_id));
drop policy if exists svc_w_ins on service.care_marks;
create policy svc_w_ins on service.care_marks as restrictive for insert to authenticated
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_upd on service.care_marks;
create policy svc_w_upd on service.care_marks as restrictive for update to authenticated
  using (service.is_lead(organization_id)) with check (service.is_lead(organization_id));
drop policy if exists svc_w_del on service.care_marks;
create policy svc_w_del on service.care_marks as restrictive for delete to authenticated
  using (service.is_lead(organization_id));
grant select, insert, update, delete on service.care_marks to authenticated;

-- registra a marcação e, no contato, o fato na história (lei 10)
create or replace function service.registrar_cuidado(p_person uuid, p_kind text, p_via text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_eu uuid;
  v_nome text;
begin
  -- := em vez de "select ... into" (o SQL Editor do Supabase quebra a outra forma)
  v_org := (select p.organization_id from service.people p where p.id = p_person);
  if v_org is null then return 'inexistente'; end if;
  if not service.is_lead(v_org) then return 'sem_permissao'; end if;
  if p_kind not in ('contato', 'justificada') then return 'invalido'; end if;
  if p_kind = 'contato' and coalesce(p_via, '') not in ('ligacao', 'mensagem', 'visita') then return 'invalido'; end if;
  v_eu := (select p.id from service.people p where p.id = any(service.my_people()) and p.organization_id = v_org order by p.id limit 1);
  v_nome := (select p.name from service.people p where p.id = v_eu);
  insert into service.care_marks (organization_id, person_id, kind, via, until, by_person)
  values (v_org, p_person, p_kind, case when p_kind = 'contato' then p_via end,
          case when p_kind = 'justificada' then current_date + 30 end, v_eu);
  if p_kind = 'contato' then
    perform service.gravar_fato(p_person, 'contato_cuidado',
      'Contato · ' || case p_via when 'ligacao' then 'ligação' when 'mensagem' then 'mensagem' else 'visita' end,
      v_nome, current_date, null);
  end if;
  return 'ok';
end $$;
grant execute on function service.registrar_cuidado(uuid, text, text) to authenticated;

-- a própria pessoa não vê o fato "contato" na sua história
drop policy if exists svc_r_scope on service.timeline_events;
create policy svc_r_scope on service.timeline_events as restrictive for select to authenticated
  using (
    service.can_read_history(organization_id)
    or (member_id in (select unnest(service.my_members())) and event_type <> 'contato_cuidado')
    or member_id in (select unnest(service.my_led_members()))
  );

-- ═══ 0062_service_lembrete_do_aviso.sql ═══
-- Service v7 4.18 · Lembrete do aviso só para quem não viu. Ao publicar, a
-- liderança escolhe "Lembrar quem não viu" em 24h, 48h ou numa data; o
-- agendador (rota /api/service/cron/lembretes) manda uma vez a notificação a
-- quem do público ainda não abriu (service.announcement_reads), fora do
-- silêncio das 22h às 7h.

alter table service.announcements add column if not exists remind_at timestamptz;
alter table service.announcements add column if not exists reminded_at timestamptz;
alter table service.announcements add column if not exists remind_to uuid[];
comment on column service.announcements.remind_at is 'Quando lembrar quem não viu (já fora do silêncio das 22h às 7h).';
comment on column service.announcements.reminded_at is 'Quando o lembrete foi enviado (uma vez por aviso).';
comment on column service.announcements.remind_to is 'Membros do público no momento da publicação (service.members.id).';
create index if not exists announcements_lembrete_idx on service.announcements (remind_at) where reminded_at is null and remind_at is not null;

-- ═══ 0063_service_destaque_da_igreja.sql ═══
-- Service v7 4.4 · Destaque da igreja: uma publicação do Mural pode ficar em
-- destaque no Início do app até uma data, com imagem (e texto alternativo) e
-- vídeo do YouTube ou do Instagram pelo link. Um destaque por vez: ao
-- destacar uma publicação nova, o painel encerra o destaque anterior.

alter table service.announcements add column if not exists highlight_until timestamptz;
alter table service.announcements add column if not exists image_url text;
alter table service.announcements add column if not exists image_alt text;
alter table service.announcements add column if not exists video_url text;
comment on column service.announcements.highlight_until is 'Em destaque no Início do app até este instante (v7 4.4).';
comment on column service.announcements.image_alt is 'Texto alternativo da imagem (leitor de tela).';
comment on column service.announcements.video_url is 'Link do YouTube ou do Instagram; o app incorpora pelo link.';
create index if not exists announcements_destaque_idx on service.announcements (church_id, highlight_until) where highlight_until is not null;

-- ═══ 0064_service_eventos_de_medicao.sql ═══
-- Service v7 5.1 · Medição padrão (lei 11): cada cartão emite card_shown,
-- card_acted e card_dismissed; cada aviso, notification_sent e
-- notification_opened. Sem identificar a pessoa (lei 10: nada de percentual
-- ou ranking sobre pessoas): só a igreja, o módulo, o tipo e a referência
-- (id do cartão ou categoria do aviso). Lido só por dono e master.

create table if not exists service.app_events (
  id               bigint generated always as identity primary key,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  evento           text not null check (evento in ('card_shown', 'card_acted', 'card_dismissed', 'notification_sent', 'notification_opened')),
  modulo           text,
  tipo             text,
  ref              text,
  created_at       timestamptz not null default now()
);
comment on table service.app_events is 'Eventos de medição do Service (lei 11), sem dado da pessoa.';
create index if not exists app_events_org_idx on service.app_events (organization_id, evento, created_at desc);

alter table service.app_events enable row level security;
drop policy if exists svc_tenant on service.app_events;
create policy svc_tenant on service.app_events for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
drop policy if exists svc_r_scope on service.app_events;
create policy svc_r_scope on service.app_events as restrictive for select to authenticated
  using (core.has_role(organization_id, 'owner', 'master'));
-- qualquer pessoa da igreja registra; ninguém altera nem apaga
drop policy if exists svc_w_upd on service.app_events;
create policy svc_w_upd on service.app_events as restrictive for update to authenticated using (false);
drop policy if exists svc_w_del on service.app_events;
create policy svc_w_del on service.app_events as restrictive for delete to authenticated using (false);
grant select, insert on service.app_events to authenticated;

-- ═══ 0065_service_metricas_internas.sql ═══
-- Service v7 5.2 · Métricas internas (lei 11), calculadas no banco e lidas só
-- por dono e master. Tudo agregado: nenhuma métrica sobre uma pessoa.
--   semanas com participação: média de semanas com presença (check-in) por
--     pessoa que participou no período, sobre o total de semanas;
--   vagas cobertas 48h antes do culto: vagas pedidas pelas funções dos cultos
--     já passados que tinham alguém confirmado 48h antes do início;
--   minutos para fechar a escala: mediana, nos cultos com todas as vagas
--     preenchidas, entre a primeira e a última escalação;
--   visitantes contatados em 48h: visitantes do período com anotação de
--     contato até 48h depois da visita;
--   notificações desligadas: pessoas com acesso ao app sem nenhum aparelho
--     inscrito para receber aviso;
--   cartões: vistos, usados e dispensados (service.app_events, 0064).

create or replace function service.metricas_internas(p_org uuid, p_dias int default 90)
returns jsonb
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_ini date := (now() at time zone 'America/Sao_Paulo')::date - greatest(p_dias, 7) + 1;
  v_fim date := (now() at time zone 'America/Sao_Paulo')::date;
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
           ((e.event_date + coalesce(nullif(substring(e.time from '^\d{1,2}:\d{2}'), ''), '00:00')::time) at time zone 'America/Sao_Paulo') as inicio
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
    select v.id, (case when v.visited_on ~ '^\d{4}-\d{2}-\d{2}' then substring(v.visited_on from 1 for 10)::date else (v.created_at at time zone 'America/Sao_Paulo')::date end) as dia, v.created_at
    from service.visitors v
    where v.organization_id = p_org
      and (case when v.visited_on ~ '^\d{4}-\d{2}-\d{2}' then substring(v.visited_on from 1 for 10)::date else (v.created_at at time zone 'America/Sao_Paulo')::date end) between v_ini and v_fim
  ),
  app as (
    select p.id, exists (select 1 from service.push_subscriptions s where s.person_id = p.id) as com_push
    from service.people p
    where p.organization_id = p_org and p.user_id is not null
  ),
  cartoes as (
    select evento, count(*) as n from service.app_events
    where organization_id = p_org and created_at >= (v_ini::timestamp at time zone 'America/Sao_Paulo')
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
                                   and n.created_at <= (visit.dia::timestamp at time zone 'America/Sao_Paulo') + interval '48 hours'))),
    'notificacoes', jsonb_build_object(
      'com_app', (select count(*) from app),
      'sem_aviso', (select count(*) from app where not com_push)),
    'cartoes', coalesce((select jsonb_object_agg(evento, n) from cartoes), '{}'::jsonb)
  ));
  return r;
end $$;
grant execute on function service.metricas_internas(uuid, int) to authenticated;

-- ═══ 0066_service_notificacoes_por_categoria.sql ═══
-- Service v7 5.3 · Notificação = ação (lei 9). A pessoa desliga categorias
-- (escala, mural, mensagens, caminhada); nada chega das 22h às 7h; o Mural
-- chega em resumo. O que não pode sair na hora entra numa fila que o
-- servidor esvazia depois (rota do agendador e a cada novo envio).

alter table service.people add column if not exists notif_off text[] not null default '{}';
alter table service.people drop constraint if exists people_notif_off_check;
alter table service.people add constraint people_notif_off_check
  check (notif_off <@ array['escala', 'mural', 'mensagens', 'caminhada']::text[]);
comment on column service.people.notif_off is 'Categorias de aviso que a pessoa desligou (lei 9).';

create or replace function service.my_notifications()
returns text[]
language sql stable security definer set search_path = service, public as $$
  select coalesce((select p.notif_off from service.people p where p.id = any(service.my_people()) limit 1), '{}')
$$;
grant execute on function service.my_notifications() to authenticated;

create or replace function service.set_my_notifications(p_off text[])
returns text
language plpgsql security definer set search_path = service, public as $$
begin
  if not (coalesce(p_off, '{}') <@ array['escala', 'mural', 'mensagens', 'caminhada']::text[]) then return 'invalido'; end if;
  update service.people set notif_off = coalesce(p_off, '{}') where id = any(service.my_people());
  return case when found then 'ok' else 'sem_ficha' end;
end $$;
grant execute on function service.set_my_notifications(text[]) to authenticated;

-- fila de avisos que esperam (silêncio ou resumo do Mural). Só o servidor
-- (service role) lê e escreve: RLS ligada sem regra para authenticated.
create table if not exists service.push_queue (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  categoria        text not null check (categoria in ('escala', 'mural', 'mensagens', 'caminhada')),
  title            text not null,
  body             text not null,
  url              text,
  send_after       timestamptz not null,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);
comment on table service.push_queue is 'Avisos esperando o fim do silêncio (22h às 7h) ou o resumo do Mural (lei 9).';
create index if not exists push_queue_pendentes_idx on service.push_queue (send_after) where sent_at is null;
alter table service.push_queue enable row level security;

-- ═══ 0067_service_aula_data_sala.sql ═══
-- CE.X Service · 0067 · Aula presencial/ao vivo com dia, hora e sala (v7 2.2)
-- A aula com data aparece na Agenda do aluno e no cartão do curso, com a
-- instrução da presença por QR. Aditiva e idempotente.
-- Era a 0051 no branch service-v7; renumerada porque o main já tem uma 0051
-- (bootstrap_lider_telas_v6). Independente das outras: pode rodar em qualquer ordem.

alter table service.course_lessons add column if not exists lesson_date date;
alter table service.course_lessons add column if not exists lesson_time text;
alter table service.course_lessons add column if not exists location text;

comment on column service.course_lessons.lesson_date is 'Dia da aula presencial/ao vivo (opcional). Com data, a aula aparece na Agenda de quem está matriculado.';
comment on column service.course_lessons.lesson_time is 'Hora da aula, "HH:MM" (opcional).';
comment on column service.course_lessons.location is 'Sala ou local da aula (opcional).';

-- ═══ 0068_service_imagem_do_mural.sql ═══
-- Service v7 4.4 · imagem do destaque do Mural. As regras do bucket
-- service-media (0014) só deixam dono, master e pastor enviar arquivo; o líder
-- que publica no Mural com imagem receberia erro. Esta regra soma (OR) e
-- libera para a liderança (is_lead: dono, master, pastor, líder) só a pasta
-- <organização>/mural/. Idempotente.

drop policy if exists svc_media_mural_insert on storage.objects;
create policy svc_media_mural_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'service-media'
    and (storage.foldername(name))[2] = 'mural'
    and service.is_lead((storage.foldername(name))[1]::uuid)
  );

commit;
