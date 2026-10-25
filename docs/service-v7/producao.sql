-- Service v7 · migrações 0051 em diante, numa transação só.
-- Gerado por scripts/ci/pacote-producao.sh a partir de supabase/migrations/.
-- Rode inteiro no SQL Editor do Supabase. Se der erro, nada é gravado:
-- copie a mensagem e não rode de novo pela metade.

begin;

-- ═══ 0051_service_bootstrap_lider_telas_v6.sql ═══
-- CE.X Service · 0051 · Igreja nova já nasce com as telas do S51 para o líder
--
-- A 0050 ligou Crianças, Reuniões, Ensaios, Quadros e Conversas para a
-- liderança das igrejas que já existiam. Mas as funções que criam uma igreja
-- gravam "desligado" para o líder em toda permissão fora de uma lista fixa,
-- então uma igreja nova nasceria com o líder sem essas cinco telas. Aqui as
-- duas funções são refeitas iguais às atuais, só com a lista maior.
-- Variáveis preenchidas com := (o SQL Editor do Supabase confunde a outra forma com criação de
-- tabela e quebra a função). Idempotente.

CREATE OR REPLACE FUNCTION core.bootstrap_church_org(p_org_name text, p_city text DEFAULT NULL::text, p_trial boolean DEFAULT true)
 RETURNS TABLE(organization_id uuid, church_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'service', 'billing', 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_created_org_id uuid;
  v_created_church_id uuid;
  v_user_name text;
  v_user_email text;
begin
  if v_user_id is null then
    raise exception 'bootstrap_church_org: sem usuário autenticado';
  end if;

  insert into core.users (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into core.organizations (name, kind, owner_id)
  values (p_org_name, 'church', v_user_id)
  returning id into v_created_org_id;

  insert into core.memberships (user_id, organization_id, role, status)
  values (v_user_id, v_created_org_id, 'master', 'active');

  if p_trial then
    insert into core.product_access (organization_id, product_code, active, source)
    values (v_created_org_id, 'service', true, 'trial')
    on conflict on constraint product_access_organization_id_product_code_key
    do update set active = true, source = 'trial', updated_at = now();
  end if;

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'master', permissions.code, true
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'pastor', permissions.code, (permissions.code <> 'service.rede')
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'lider', permissions.code,
         permissions.code in (
           'service.painel',
           'service.voluntarios',
           'service.times',
           'service.decisoes',
           'service.escala',
           'service.cultos',
           'service.comunica',
           'service.kids',
           'service.reunioes',
           'service.ensaios',
           'service.quadros',
           'service.conversas'
         )
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'vol', permissions.code, false
  from core.permissions
  where permissions.product_code = 'service';

  insert into service.churches (organization_id, name, city, is_headquarters)
  values (v_created_org_id, p_org_name, p_city, true)
  returning id into v_created_church_id;

  v_user_name := (select coalesce(u.full_name, split_part(u.email, '@', 1)) from core.users u where u.id = v_user_id);
  v_user_email := (select u.email from core.users u where u.id = v_user_id);

  insert into service.people (organization_id, church_id, user_id, name, email, status)
  values (v_created_org_id, v_created_church_id, v_user_id, coalesce(v_user_name, 'Administrador'), v_user_email, 'ativo');

  return query select v_created_org_id, v_created_church_id;
end $function$

;
CREATE OR REPLACE FUNCTION core.bootstrap_church_org_v2(p_org_name text, p_cnpj text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_trial boolean DEFAULT true)
 RETURNS TABLE(organization_id uuid, church_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'service', 'billing', 'public'
AS $function$
declare
  v_user_id            uuid := auth.uid();
  v_created_org_id     uuid;
  v_created_church_id  uuid;
  v_cnpj_digits        text;
  v_signup_seq         bigint;
  v_trial_days         integer;
  v_plan_id            uuid;
begin
  if v_user_id is null then
    raise exception 'bootstrap_church_org: sem usuário autenticado';
  end if;

  v_cnpj_digits := nullif(regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g'), '');

  if v_cnpj_digits is not null then
    if length(v_cnpj_digits) <> 14 then
      raise exception 'bootstrap_church_org: CNPJ precisa ter 14 dígitos (ou deixe em branco)';
    end if;

    if exists (select 1 from service.churches where doc = v_cnpj_digits) then
      raise exception 'bootstrap_church_org: este CNPJ já está cadastrado em outra igreja';
    end if;
  end if;

  insert into core.users (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into core.organizations (name, kind, owner_id)
  values (p_org_name, 'church', v_user_id)
  returning id into v_created_org_id;

  insert into core.memberships (user_id, organization_id, role, status)
  values (v_user_id, v_created_org_id, 'master', 'active');

  if p_trial then
    insert into core.product_access (organization_id, product_code, active, source)
    values (v_created_org_id, 'service', true, 'trial')
    on conflict on constraint product_access_organization_id_product_code_key
    do update set active = true, source = 'trial', updated_at = now();
  end if;

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'master', permissions.code, true
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'pastor', permissions.code, (permissions.code <> 'service.rede')
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'lider', permissions.code,
         permissions.code in (
           'service.painel',
           'service.voluntarios',
           'service.times',
           'service.decisoes',
           'service.escala',
           'service.cultos',
           'service.comunica',
           'service.kids',
           'service.reunioes',
           'service.ensaios',
           'service.quadros',
           'service.conversas'
         )
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'membro', permissions.code, false
  from core.permissions
  where permissions.product_code = 'service';

  insert into service.churches (organization_id, name, city, is_headquarters, doc, email, phone, address, postal_code)
  values (v_created_org_id, p_org_name, p_city, true, v_cnpj_digits, p_email, p_phone, p_address, p_postal_code)
  returning id into v_created_church_id;

  insert into service.people (organization_id, church_id, user_id, name, email, status)
  select v_created_org_id, v_created_church_id, v_user_id,
         coalesce(u.full_name, split_part(u.email, '@', 1), 'Administrador'),
         u.email,
         'ativo'
  from core.users u
  where u.id = v_user_id;

  v_signup_seq := nextval('billing.church_signup_seq');
  v_trial_days := case when v_signup_seq <= 500 then 90 else 14 end;

  v_plan_id := (select id from billing.plans where code = 'service_church');

  if v_plan_id is not null then
    insert into billing.subscriptions (organization_id, plan_id, product_code, status, provider, provider_ref, current_period_end)
    values (
      v_created_org_id,
      v_plan_id,
      'service',
      'trialing',
      'manual',
      case when v_signup_seq <= 500 then 'promo_500' else 'trial_padrao' end,
      now() + (v_trial_days || ' days')::interval
    );
  end if;

  organization_id := v_created_org_id;
  church_id := v_created_church_id;
  return next;
end $function$

;

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

-- ═══ 0070_service_visitante_autocadastro.sql ═══
-- 0070 · Visitante se cadastra sozinho por QR ou link (/[slug]/visita).
--
-- A gestão liga o autocadastro em Visitantes › QR e link. Fica em
-- service.churches.settings.autocadastro = { ativo: boolean, responsavelId?: uuid }.
-- A página pública não lê nada do banco pelo navegador: o servidor monta a
-- página (service role) e o envio passa só por service.visitante_autocadastro,
-- security definer, que valida tudo e grava o visitante como "novo" com
-- origem "QR/link". Nenhuma leitura nova para anon.

-- ── colunas novas em service.visitors ─────────────────────────────────────────
alter table service.visitors add column if not exists email       text;
alter table service.visitors add column if not exists heard_from  text;
alter table service.visitors add column if not exists invited_by  text;
alter table service.visitors add column if not exists interests   text[] not null default '{}';
alter table service.visitors add column if not exists consent_at  timestamptz;

comment on column service.visitors.heard_from is 'Como a pessoa conheceu a igreja (autocadastro): instagram, amigo, passando, evento, outro.';
comment on column service.visitors.invited_by is 'Quem convidou, em texto livre (autocadastro).';
comment on column service.visitors.interests  is 'Interesses marcados no autocadastro: conhecer, grupo, oracao, servir, batismo, criancas.';
comment on column service.visitors.consent_at is 'Quando a pessoa aceitou o uso dos dados para contato (LGPD).';

-- limite contra abuso: busca rápida dos envios recentes por igreja
create index if not exists visitors_autocadastro_idx
  on service.visitors (church_id, created_at desc) where origin = 'QR/link';

-- ── RPC pública ──────────────────────────────────────────────────────────────
-- Retorna 'ok' ou o motivo: 'fechado' (igreja não existe ou autocadastro
-- desligado), 'nome', 'telefone', 'email', 'consentimento', 'repetido'
-- (mesmo telefone nos últimos 10 minutos), 'limite' (mais de 30 envios na
-- igreja nos últimos 10 minutos).
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
    to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD'), 'QR/link',
    v_heard, v_invited, v_interest, now(), v_resp, '1º contato', 'soon'
  );
  return 'ok';
end $$;

revoke all on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean) from public;
grant execute on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean) to anon, authenticated;

-- ═══ 0071_service_entrada_por_link.sql ═══
-- CE.X Service · 0071 · Entrar na igreja por link ou código, com aprovação
--
-- Cada igreja (organização) tem um link e um código únicos
-- (/service/participar/<código>), com QR. Quem abre cria a própria conta
-- (e-mail obrigatório) e vira um pedido de entrada. A regra da igreja diz o
-- que acontece depois: "aprovar" (padrão: a gestão confere cada pedido no
-- Início do painel) ou "direto" (entra como membro base no primeiro login).
--
-- Segurança
-- · Código de 8 caracteres de um alfabeto de 31 (sem 0/O/1/I/L), gerado com
--   gen_random_uuid (aleatório forte): cerca de 8,5 × 10^11 combinações.
--   "Gerar outro" troca o código e o antigo para de valer na hora.
-- · Tabelas sem policy pra anon/authenticated: só o servidor (service role)
--   e as funções abaixo (security definer) leem e escrevem.
-- · Aprovar nunca liga a conta a uma pessoa já cadastrada sozinho: só a
--   gestão escolhe a ficha, e só ficha sem login (sem takeover).
-- · Pedido de conta com e-mail não confirmado não aparece na fila.
-- · Membership suspensa não é reativada por pedido.
-- Idempotente.

-- ── tabelas ─────────────────────────────────────────────────────────────────
create table if not exists service.entry_links (
  organization_id  uuid primary key references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  code             text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{8}$'),
  rule             text not null default 'aprovar' check (rule in ('aprovar','direto')),
  updated_by       uuid references core.users(id) on delete set null,
  updated_at       timestamptz not null default now()
);
comment on table service.entry_links is 'Link/código único de entrada da igreja e a regra (aprovar ou direto). Só o servidor e as funções entrada_* acessam.';

create table if not exists service.entry_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  user_id          uuid not null references core.users(id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 120),
  email            text not null,
  phone            text,
  status           text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  auto             boolean not null default false,
  member_id        uuid references service.members(id) on delete set null,
  decided_by       uuid references core.users(id) on delete set null,
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);
comment on table service.entry_requests is 'Pedido de entrada pelo link da igreja. auto = criado com a regra "direto" (ativa no primeiro login).';
create unique index if not exists entry_requests_aberto on service.entry_requests (organization_id, user_id) where status = 'pendente';
create index if not exists entry_requests_org_idx on service.entry_requests (organization_id, status, created_at);
create index if not exists entry_requests_user_idx on service.entry_requests (user_id, created_at desc);

alter table service.entry_links enable row level security;
alter table service.entry_requests enable row level security;
revoke all on service.entry_links from anon, authenticated;
revoke all on service.entry_requests from anon, authenticated;
grant all on service.entry_links to service_role;
grant all on service.entry_requests to service_role;

-- ── auxiliares (sem grant: só as funções abaixo chamam) ────────────────────
create or replace function service._entrada_gestao(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor')
$$;
revoke all on function service._entrada_gestao(uuid) from public, anon, authenticated;

create or replace function service._entrada_codigo()
returns text
language plpgsql volatile security definer set search_path = service, public as $$
declare
  v_alfa constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; -- 31 sinais, sem 0 O 1 I L
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    -- bytes 0..5 e 9..10 do uuid v4 são aleatórios (6 a 8 têm versão/variante)
    for i in 0..7 loop
      v_code := v_code || substr(v_alfa, 1 + (get_byte(v_bytes, case when i < 6 then i else i + 4 end) % 31), 1);
    end loop;
    exit when not exists (select 1 from service.entry_links where code = v_code);
  end loop;
  return v_code;
end $$;
revoke all on function service._entrada_codigo() from public, anon, authenticated;

-- linha da igreja (cria na primeira vez, na matriz)
create or replace function service._entrada_link(p_org uuid)
returns service.entry_links
language plpgsql security definer set search_path = service, public as $$
declare
  v service.entry_links;
  v_church uuid;
begin
  select * into v from service.entry_links where organization_id = p_org;
  if found then return v; end if;
  select id into v_church from service.churches
   where organization_id = p_org
   order by is_headquarters desc nulls last, created_at
   limit 1;
  if v_church is null then return null; end if;
  insert into service.entry_links (organization_id, church_id, code)
  values (p_org, v_church, service._entrada_codigo())
  on conflict (organization_id) do nothing;
  select * into v from service.entry_links where organization_id = p_org;
  return v;
end $$;
revoke all on function service._entrada_link(uuid) from public, anon, authenticated;

-- ── Configurações (gestão) ─────────────────────────────────────────────────
create or replace function service.entrada_config(p_org uuid)
returns jsonb
language plpgsql security definer set search_path = service, core, public as $$
declare
  v service.entry_links;
begin
  if not service._entrada_gestao(p_org) then return null; end if;
  v := service._entrada_link(p_org);
  if v is null then return null; end if;
  return jsonb_build_object('code', v.code, 'rule', v.rule, 'updated_at', v.updated_at);
end $$;

create or replace function service.entrada_novo_codigo(p_org uuid)
returns text
language plpgsql security definer set search_path = service, core, public as $$
declare
  v_code text;
begin
  if not service._entrada_gestao(p_org) then return null; end if;
  perform service._entrada_link(p_org);
  v_code := service._entrada_codigo();
  update service.entry_links set code = v_code, updated_by = auth.uid(), updated_at = now()
   where organization_id = p_org;
  return v_code;
end $$;

create or replace function service.entrada_regra(p_org uuid, p_rule text)
returns text
language plpgsql security definer set search_path = service, core, public as $$
begin
  if not service._entrada_gestao(p_org) then return 'nao_pode'; end if;
  if p_rule not in ('aprovar', 'direto') then return 'invalida'; end if;
  perform service._entrada_link(p_org);
  update service.entry_links set rule = p_rule, updated_by = auth.uid(), updated_at = now()
   where organization_id = p_org;
  return 'ok';
end $$;

-- ── Fila de pedidos (gestão) ───────────────────────────────────────────────
-- Fichas sem login que podem ser a mesma pessoa: mesmo e-mail, mesmo
-- telefone (8 últimos dígitos) ou mesmo nome.
create or replace function service._entrada_parecidos(p_org uuid, p_name text, p_email text, p_phone text)
returns jsonb
language sql stable security definer set search_path = service, public as $$
  select coalesce(jsonb_agg(x order by x->>'name'), '[]'::jsonb) from (
    select jsonb_build_object('id', m.id, 'name', m.name, 'phone', m.phone, 'email', m.email) as x
    from service.members m
    left join service.people p on p.id = m.volunteer_id
    where m.organization_id = p_org
      and (m.volunteer_id is null or p.user_id is null)
      and (
        (m.email is not null and lower(m.email) = lower(p_email))
        or (length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 8
            and right(regexp_replace(coalesce(m.phone, ''), '\D', '', 'g'), 8) = right(regexp_replace(p_phone, '\D', '', 'g'), 8))
        or lower(btrim(m.name)) = lower(btrim(p_name))
      )
    limit 4
  ) s
$$;
revoke all on function service._entrada_parecidos(uuid, text, text, text) from public, anon, authenticated;

create or replace function service.entrada_pedidos(p_org uuid)
returns jsonb
language plpgsql stable security definer set search_path = service, core, auth, public as $$
begin
  if not service._entrada_gestao(p_org) then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'name', r.name, 'email', r.email, 'phone', r.phone, 'created_at', r.created_at,
      'parecidos', service._entrada_parecidos(p_org, r.name, r.email, r.phone)
    ) order by r.created_at)
    from service.entry_requests r
    join auth.users u on u.id = r.user_id
    where r.organization_id = p_org
      and r.status = 'pendente'
      and u.email_confirmed_at is not null
  ), '[]'::jsonb);
end $$;

-- busca de ficha sem login pra ligar (quando a sugestão não acertou)
create or replace function service.entrada_buscar_fichas(p_org uuid, p_q text)
returns jsonb
language plpgsql stable security definer set search_path = service, core, public as $$
begin
  if not service._entrada_gestao(p_org) or char_length(btrim(coalesce(p_q, ''))) < 2 then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(x order by x->>'name') from (
      select jsonb_build_object('id', m.id, 'name', m.name, 'phone', m.phone, 'email', m.email) as x
      from service.members m
      left join service.people p on p.id = m.volunteer_id
      where m.organization_id = p_org
        and (m.volunteer_id is null or p.user_id is null)
        and m.name ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%'
      order by m.name
      limit 8
    ) s
  ), '[]'::jsonb);
end $$;

-- ── Ativar um pedido (interno) ─────────────────────────────────────────────
-- p_member: ficha existente (sem login) que a gestão escolheu ligar.
create or replace function service._entrada_ativar(p_req uuid, p_member uuid, p_by uuid)
returns text
language plpgsql security definer set search_path = service, core, public as $$
declare
  r service.entry_requests;
  m service.members;
  v_person uuid;
  v_member uuid;
begin
  select * into r from service.entry_requests where id = p_req for update;
  if not found then return 'nao_achou'; end if;
  if r.status <> 'pendente' then return 'ja_decidido'; end if;

  select id into v_person from service.people
   where user_id = r.user_id and organization_id = r.organization_id
   limit 1;

  if p_member is not null then
    select * into m from service.members where id = p_member and organization_id = r.organization_id for update;
    if not found then return 'ficha_invalida'; end if;
    if m.volunteer_id is not null then
      if v_person is not null and v_person <> m.volunteer_id then return 'ficha_invalida'; end if;
      if v_person is null then
        update service.people set user_id = r.user_id, email = coalesce(email, r.email), phone = coalesce(phone, r.phone)
         where id = m.volunteer_id and user_id is null
        returning id into v_person;
        if v_person is null then return 'ficha_invalida'; end if;
      end if;
    else
      if v_person is null then
        insert into service.people (organization_id, church_id, user_id, name, phone, email, status)
        values (r.organization_id, m.church_id, r.user_id, m.name, coalesce(m.phone, r.phone), r.email, 'ativo')
        returning id into v_person;
      elsif exists (select 1 from service.members x where x.volunteer_id = v_person) then
        return 'ficha_invalida';
      end if;
      update service.members set volunteer_id = v_person, email = coalesce(email, r.email), phone = coalesce(phone, r.phone)
       where id = m.id;
    end if;
    v_member := m.id;
    -- o convite individual dessa ficha deixa de valer: a pessoa já entrou
    update service.member_invites set used_at = now() where member_id = m.id and used_at is null;
  else
    if v_person is null then
      insert into service.people (organization_id, church_id, user_id, name, phone, email, status)
      values (r.organization_id, r.church_id, r.user_id, r.name, r.phone, r.email, 'ativo')
      returning id into v_person;
    end if;
    select id into v_member from service.members where volunteer_id = v_person limit 1;
    if v_member is null then
      insert into service.members (organization_id, church_id, volunteer_id, name, email, phone, situation, journey)
      values (r.organization_id, r.church_id, v_person, r.name, r.email, r.phone, 'membro', '[0,0,0,0,0]'::jsonb)
      returning id into v_member;
    end if;
  end if;

  -- membro base; quem já tinha papel mantém o dele; suspenso continua suspenso
  insert into core.memberships (user_id, organization_id, role, status)
  values (r.user_id, r.organization_id, 'membro', 'active')
  on conflict (user_id, organization_id) do update set status = 'active'
   where core.memberships.status = 'invited';

  update service.entry_requests
     set status = 'aprovado', member_id = v_member, decided_by = p_by, decided_at = now()
   where id = r.id;
  return 'ok';
end $$;
revoke all on function service._entrada_ativar(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function service.entrada_aprovar(p_req uuid, p_member uuid default null)
returns text
language plpgsql security definer set search_path = service, core, public as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from service.entry_requests where id = p_req;
  if v_org is null or not service._entrada_gestao(v_org) then return 'nao_pode'; end if;
  return service._entrada_ativar(p_req, p_member, auth.uid());
end $$;

create or replace function service.entrada_recusar(p_req uuid)
returns text
language plpgsql security definer set search_path = service, core, public as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from service.entry_requests where id = p_req;
  if v_org is null or not service._entrada_gestao(v_org) then return 'nao_pode'; end if;
  update service.entry_requests set status = 'recusado', decided_by = auth.uid(), decided_at = now()
   where id = p_req and status = 'pendente';
  return case when found then 'ok' else 'ja_decidido' end;
end $$;

-- ── Quem pediu (a própria pessoa, logada) ──────────────────────────────────
-- Devolve o pedido mais recente. Com a regra "direto" ainda valendo, ativa
-- aqui: só depois de logar (e-mail confirmado), nunca ligando a ficha alheia.
create or replace function service.entrada_minha()
returns jsonb
language plpgsql security definer set search_path = service, core, public as $$
declare
  r service.entry_requests;
  v_rule text;
  v_status text;
begin
  if auth.uid() is null then return null; end if;
  select * into r from service.entry_requests where user_id = auth.uid() order by created_at desc limit 1;
  if not found then return null; end if;
  v_status := r.status;
  if r.status = 'pendente' and r.auto then
    select rule into v_rule from service.entry_links where organization_id = r.organization_id;
    if v_rule = 'direto' and service._entrada_ativar(r.id, null, null) = 'ok' then
      v_status := 'aprovado';
    end if;
  end if;
  return jsonb_build_object(
    'status', v_status,
    'church', (select name from service.churches where id = r.church_id),
    'created_at', r.created_at
  );
end $$;

grant execute on function service.entrada_config(uuid) to authenticated;
grant execute on function service.entrada_novo_codigo(uuid) to authenticated;
grant execute on function service.entrada_regra(uuid, text) to authenticated;
grant execute on function service.entrada_pedidos(uuid) to authenticated;
grant execute on function service.entrada_buscar_fichas(uuid, text) to authenticated;
grant execute on function service.entrada_aprovar(uuid, uuid) to authenticated;
grant execute on function service.entrada_recusar(uuid) to authenticated;
grant execute on function service.entrada_minha() to authenticated;
revoke execute on function service.entrada_config(uuid) from anon, public;
revoke execute on function service.entrada_novo_codigo(uuid) from anon, public;
revoke execute on function service.entrada_regra(uuid, text) from anon, public;
revoke execute on function service.entrada_pedidos(uuid) from anon, public;
revoke execute on function service.entrada_buscar_fichas(uuid, text) from anon, public;
revoke execute on function service.entrada_aprovar(uuid, uuid) from anon, public;
revoke execute on function service.entrada_recusar(uuid) from anon, public;
revoke execute on function service.entrada_minha() from anon, public;

-- ═══ 0072_service_importar_membros.sql ═══
-- ═══════════════════════════════════════════════════════════════════════════
-- 0072 · Service v7 · jornada "Importar membros por planilha"
--
-- A importação grava nas mesmas tabelas do cadastro manual (service.members
-- e service.timeline_events), em lotes, pelo painel. Esta migração só abre
-- espaço para o que a planilha traz e a ficha ainda não guardava:
--
--   sex             masculino | feminino (nulo = não informado)
--   marital_status  solteiro | casado | uniao_estavel | divorciado | separado | viuvo
--   imported_at     quando a ficha entrou por planilha. Serve para a lista
--                   não marcar como "Novo" quem já era da igreja e só foi
--                   importado agora (app/service/lib/pessoas.ts, ehNovo).
--
-- O fato "importado" na linha do tempo usa a service.timeline_events como
-- está (event_type é texto livre; o catálogo fica em app/service/lib/historico.ts).
-- Sem mudança de RLS: quem pode cadastrar membro pode importar.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.members
  add column if not exists sex            text,
  add column if not exists marital_status text,
  add column if not exists imported_at    timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_sex_check') then
    alter table service.members add constraint members_sex_check
      check (sex is null or sex in ('masculino','feminino'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'members_marital_status_check') then
    alter table service.members add constraint members_marital_status_check
      check (marital_status is null or marital_status in ('solteiro','casado','uniao_estavel','divorciado','separado','viuvo'));
  end if;
end $$;

comment on column service.members.sex is 'Sexo informado (masculino, feminino). Nulo = não informado.';
comment on column service.members.marital_status is 'Estado civil: solteiro, casado, uniao_estavel, divorciado, separado, viuvo.';
comment on column service.members.imported_at is 'Quando a ficha entrou pela importação de planilha. Nulo = cadastro manual ou pelo app.';


-- ═══ 0073_service_financeiro.sql ═══
-- CE.X Service · 0073 · Financeiro, fase 1
--
-- Contas (caixa, banco), categorias de entrada e de despesa, fundos (geral e
-- designados), lançamentos (entrada, despesa, transferência entre contas) e
-- contagem de oferta do culto (quem contou e quem conferiu, duas pessoas).
--
-- Quem acessa: dono, master e pastor sempre. Qualquer outra pessoa só com
-- liberação pessoa a pessoa (service.person_grants):
--   financeiro.ver     lê tudo do financeiro
--   financeiro.lancar  lê e lança (contas, categorias, fundos, lançamentos)
-- Líder e voluntário NÃO entram pelo papel: dízimo individual é dado
-- sensível (lei 10). Só dono, master e pastor dão essas liberações.
--
-- Valores sempre em centavos (bigint), nunca numeric/float.
--
-- Pronto para as fases seguintes sem retrabalho (colunas já existem, nulas):
--   contas fixas / contas a pagar  status 'previsto', due_on, recurring_id
--   campanhas                      campaign_id
--   fechamento do mês              reconciled_at, closing_id
--   importar extrato               import_batch_id, external_id (único por conta)
--   orçamento                      tabela própria por categoria e mês, só lê daqui
--
-- Aditiva e idempotente. Não aplicar em produção sem revisão.

-- ── permissão ───────────────────────────────────────────────────────────────
create or replace function service.fin_can(p_org uuid, p_write boolean default false)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor')
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org
          and p.user_id = auth.uid()
          and g.grant_code = any(case when p_write then array['financeiro.lancar'] else array['financeiro.ver', 'financeiro.lancar'] end)
      )
$$;
grant execute on function service.fin_can(uuid, boolean) to authenticated;

-- só dono, master e pastor dão ou tiram liberação do financeiro
drop policy if exists pg_fin_ins on service.person_grants;
create policy pg_fin_ins on service.person_grants as restrictive for insert to authenticated
  with check (grant_code not like 'financeiro.%' or core.has_role(organization_id, 'owner', 'master', 'pastor'));
drop policy if exists pg_fin_del on service.person_grants;
create policy pg_fin_del on service.person_grants as restrictive for delete to authenticated
  using (grant_code not like 'financeiro.%' or core.has_role(organization_id, 'owner', 'master', 'pastor'));

-- ── tabelas ─────────────────────────────────────────────────────────────────
create table if not exists service.fin_accounts (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references core.organizations(id) on delete cascade,
  church_id              uuid references service.churches(id) on delete set null,
  name                   text not null check (length(trim(name)) between 1 and 60),
  kind                   text not null default 'banco' check (kind in ('caixa', 'banco')),
  institution            text,
  opening_balance_cents  bigint not null default 0,
  opening_date           date,
  active                 boolean not null default true,
  sort_order             int not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id, id)
);
comment on table service.fin_accounts is 'Financeiro: onde o dinheiro está (caixa em espécie, conta no banco). Saldo = abertura + lançamentos realizados.';

create table if not exists service.fin_categories (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  kind             text not null check (kind in ('entrada', 'despesa')),
  name             text not null check (length(trim(name)) between 1 and 60),
  -- código fixo das categorias iniciais (dizimo, oferta...), para relatório e oferta
  system_code      text,
  parent_id        uuid references service.fin_categories(id) on delete set null,
  active           boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  unique (organization_id, id)
);
comment on table service.fin_categories is 'Financeiro: categorias de entrada e de despesa. parent_id deixa subcategoria pronta.';
create unique index if not exists fin_categories_code_idx on service.fin_categories (organization_id, system_code) where system_code is not null;

create table if not exists service.fin_funds (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 60),
  description      text,
  -- designado: dinheiro que só pode ir para o fim dele (missões, construção)
  designated       boolean not null default false,
  is_default       boolean not null default false,
  active           boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  unique (organization_id, id)
);
comment on table service.fin_funds is 'Financeiro: fundos. Um geral (is_default) e os designados.';
create unique index if not exists fin_funds_default_idx on service.fin_funds (organization_id) where is_default;

create table if not exists service.fin_offering_counts (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references core.organizations(id) on delete cascade,
  church_id           uuid references service.churches(id) on delete set null,
  event_id            uuid references service.events(id) on delete set null,
  counted_on          date not null,
  fund_id             uuid not null,
  category_id         uuid not null,
  cash_cents          bigint not null default 0 check (cash_cents >= 0),
  pix_cents           bigint not null default 0 check (pix_cents >= 0),
  card_cents          bigint not null default 0 check (card_cents >= 0),
  counted_by          uuid references service.members(id) on delete set null,
  counted_by_name     text not null,
  verified_by         uuid references service.members(id) on delete set null,
  verified_by_name    text not null,
  note                text,
  created_by          uuid references service.people(id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  foreign key (organization_id, category_id) references service.fin_categories (organization_id, id),
  check (counted_by is null or verified_by is null or counted_by <> verified_by),
  check (cash_cents + pix_cents + card_cents > 0)
);
comment on table service.fin_offering_counts is 'Financeiro: contagem da oferta do culto. Duas pessoas diferentes; cada forma vira um lançamento.';

create table if not exists service.fin_transactions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references core.organizations(id) on delete cascade,
  church_id              uuid references service.churches(id) on delete set null,
  kind                   text not null check (kind in ('entrada', 'despesa', 'transferencia')),
  status                 text not null default 'realizado' check (status in ('realizado', 'previsto')),
  occurred_on            date not null,
  due_on                 date,
  amount_cents           bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  account_id             uuid not null,
  to_account_id          uuid,
  category_id            uuid,
  fund_id                uuid,
  method                 text check (method in ('dinheiro', 'pix', 'cartao', 'transferencia', 'boleto')),
  description            text not null check (length(trim(description)) between 1 and 140),
  contributor_member_id  uuid references service.members(id) on delete set null,
  supplier_name          text check (supplier_name is null or length(supplier_name) <= 120),
  attachment_path        text,
  offering_count_id      uuid references service.fin_offering_counts(id) on delete cascade,
  -- fases seguintes (sem FK por enquanto; a migração da fase cria a tabela e a FK)
  recurring_id           uuid,
  campaign_id            uuid,
  import_batch_id        uuid,
  external_id            text,
  reconciled_at          timestamptz,
  closing_id             uuid,
  created_by             uuid references service.people(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  foreign key (organization_id, account_id) references service.fin_accounts (organization_id, id),
  foreign key (organization_id, to_account_id) references service.fin_accounts (organization_id, id),
  foreign key (organization_id, category_id) references service.fin_categories (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  check (
    (kind = 'transferencia' and to_account_id is not null and to_account_id <> account_id and category_id is null and contributor_member_id is null)
    or (kind <> 'transferencia' and to_account_id is null and category_id is not null and fund_id is not null)
  ),
  check (kind = 'entrada' or contributor_member_id is null)
);
comment on table service.fin_transactions is 'Financeiro: lançamentos em centavos. Transferência é uma linha só (de account_id para to_account_id).';
create index if not exists fin_tx_org_date_idx on service.fin_transactions (organization_id, occurred_on desc);
create index if not exists fin_tx_account_idx on service.fin_transactions (account_id);
create index if not exists fin_tx_to_account_idx on service.fin_transactions (to_account_id) where to_account_id is not null;
create index if not exists fin_tx_contributor_idx on service.fin_transactions (contributor_member_id) where contributor_member_id is not null;
create unique index if not exists fin_tx_external_idx on service.fin_transactions (account_id, external_id) where external_id is not null;

-- contribuinte da mesma igreja
create or replace function service.fin_tx_check()
returns trigger language plpgsql set search_path = service, public as $$
begin
  if new.contributor_member_id is not null and not exists (
    select 1 from service.members m where m.id = new.contributor_member_id and m.organization_id = new.organization_id
  ) then
    raise exception 'contribuinte de outra igreja';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists t_fin_tx_check on service.fin_transactions;
create trigger t_fin_tx_check before insert or update on service.fin_transactions
  for each row execute function service.fin_tx_check();

drop trigger if exists t_fin_accounts_upd on service.fin_accounts;
create trigger t_fin_accounts_upd before update on service.fin_accounts
  for each row execute function core.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['fin_accounts', 'fin_categories', 'fin_funds', 'fin_offering_counts', 'fin_transactions'] loop
    execute format('alter table service.%I enable row level security', t);
    execute format('drop policy if exists svc_tenant on service.%I', t);
    execute format($f$create policy svc_tenant on service.%I for all to authenticated
      using (core.can_access(organization_id, 'service')) with check (core.can_access(organization_id, 'service'))$f$, t);
    execute format('drop policy if exists svc_r_scope on service.%I', t);
    execute format($f$create policy svc_r_scope on service.%I as restrictive for select to authenticated
      using (service.fin_can(organization_id, false))$f$, t);
    execute format('drop policy if exists svc_w_ins on service.%I', t);
    execute format($f$create policy svc_w_ins on service.%I as restrictive for insert to authenticated
      with check (service.fin_can(organization_id, true))$f$, t);
    execute format('drop policy if exists svc_w_upd on service.%I', t);
    execute format($f$create policy svc_w_upd on service.%I as restrictive for update to authenticated
      using (service.fin_can(organization_id, true)) with check (service.fin_can(organization_id, true))$f$, t);
    execute format('drop policy if exists svc_w_del on service.%I', t);
    execute format($f$create policy svc_w_del on service.%I as restrictive for delete to authenticated
      using (service.fin_can(organization_id, true))$f$, t);
    execute format('grant select, insert, update, delete on service.%I to authenticated', t);
    -- auditoria: toda alteração vai para audit.activity_log (dono, master e pastor leem)
    execute format('drop trigger if exists t_audit on service.%I', t);
    execute format($f$create trigger t_audit after insert or update or delete on service.%I
      for each row execute function audit.log_change('service')$f$, t);
  end loop;
end $$;

-- ── conjunto inicial (na primeira vez que alguém com acesso abre a tela) ────
create or replace function service.fin_preparar(p_org uuid)
returns void
language plpgsql security definer set search_path = service, public as $$
begin
  if not service.fin_can(p_org, false) then return; end if;
  if not exists (select 1 from service.fin_categories where organization_id = p_org) then
    insert into service.fin_categories (organization_id, kind, name, system_code, sort_order) values
      (p_org, 'entrada', 'Dízimos', 'dizimo', 1),
      (p_org, 'entrada', 'Ofertas', 'oferta', 2),
      (p_org, 'entrada', 'Ofertas de missões', 'missoes', 3),
      (p_org, 'entrada', 'Eventos e inscrições', 'eventos', 4),
      (p_org, 'entrada', 'Doações', 'doacoes', 5),
      (p_org, 'entrada', 'Rendimentos', 'rendimentos', 6),
      (p_org, 'entrada', 'Outras entradas', 'outras_entradas', 7),
      (p_org, 'despesa', 'Aluguel', 'aluguel', 1),
      (p_org, 'despesa', 'Energia', 'energia', 2),
      (p_org, 'despesa', 'Água', 'agua', 3),
      (p_org, 'despesa', 'Internet e telefone', 'internet', 4),
      (p_org, 'despesa', 'Prebenda e salários', 'pessoal', 5),
      (p_org, 'despesa', 'Encargos e impostos', 'encargos', 6),
      (p_org, 'despesa', 'Manutenção e limpeza', 'manutencao', 7),
      (p_org, 'despesa', 'Material de consumo', 'consumo', 8),
      (p_org, 'despesa', 'Som, mídia e equipamentos', 'equipamentos', 9),
      (p_org, 'despesa', 'Missões e repasses', 'repasses', 10),
      (p_org, 'despesa', 'Ação social', 'acao_social', 11),
      (p_org, 'despesa', 'Eventos', 'eventos_desp', 12),
      (p_org, 'despesa', 'Tarifas bancárias', 'tarifas', 13),
      (p_org, 'despesa', 'Outras despesas', 'outras_despesas', 14)
    on conflict do nothing;
  end if;
  if not exists (select 1 from service.fin_funds where organization_id = p_org) then
    insert into service.fin_funds (organization_id, name, designated, is_default, sort_order) values
      (p_org, 'Geral', false, true, 1),
      (p_org, 'Missões', true, false, 2),
      (p_org, 'Construção', true, false, 3),
      (p_org, 'Ação social', true, false, 4);
  end if;
  if not exists (select 1 from service.fin_accounts where organization_id = p_org) then
    insert into service.fin_accounts (organization_id, name, kind, sort_order)
    values (p_org, 'Caixa da igreja', 'caixa', 1);
  end if;
end $$;
grant execute on function service.fin_preparar(uuid) to authenticated;

-- ── saldos (sem trazer todo o histórico para o navegador) ───────────────────
create or replace function service.fin_saldos(p_org uuid)
returns table (account_id uuid, saldo_cents bigint)
language sql stable security definer set search_path = service, public as $$
  select a.id,
    a.opening_balance_cents
    + coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end)
                from service.fin_transactions t
                where t.account_id = a.id and t.status = 'realizado'), 0)
    + coalesce((select sum(t.amount_cents) from service.fin_transactions t
                where t.to_account_id = a.id and t.status = 'realizado'), 0)
  from service.fin_accounts a
  where a.organization_id = p_org and service.fin_can(p_org, false)
$$;
grant execute on function service.fin_saldos(uuid) to authenticated;

create or replace function service.fin_saldos_fundos(p_org uuid)
returns table (fund_id uuid, saldo_cents bigint)
language sql stable security definer set search_path = service, public as $$
  select f.id,
    coalesce((select sum(case when t.kind = 'entrada' then t.amount_cents else -t.amount_cents end)
              from service.fin_transactions t
              where t.fund_id = f.id and t.status = 'realizado' and t.kind <> 'transferencia'), 0)
  from service.fin_funds f
  where f.organization_id = p_org and service.fin_can(p_org, false)
$$;
grant execute on function service.fin_saldos_fundos(uuid) to authenticated;

-- ── nomes para contribuinte e contagem ──────────────────────────────────────
-- O tesoureiro pode não ter acesso à tela Pessoas; aqui vê só id e nome.
create or replace function service.fin_pessoas(p_org uuid)
returns table (id uuid, name text, eu boolean)
language sql stable security definer set search_path = service, public as $$
  select m.id, m.name,
    (m.volunteer_id = any(service.my_people()) or m.id = any(service.my_members()))
  from service.members m
  where m.organization_id = p_org and service.fin_can(p_org, false)
  order by m.name
$$;
grant execute on function service.fin_pessoas(uuid) to authenticated;

-- ── contagem de oferta: grava a contagem e os lançamentos de uma vez ────────
create or replace function service.fin_registrar_oferta(
  p_org uuid, p_church uuid, p_data date, p_event uuid, p_fund uuid, p_category uuid,
  p_conta_dinheiro uuid, p_conta_digital uuid,
  p_dinheiro bigint, p_pix bigint, p_cartao bigint,
  p_contou uuid, p_conferiu uuid, p_obs text default null
) returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_id uuid;
  v_eu uuid;
  v_contou text;
  v_conferiu text;
  v_desc text;
begin
  if not service.fin_can(p_org, true) then raise exception 'sem_permissao'; end if;
  if p_contou is null or p_conferiu is null or p_contou = p_conferiu then raise exception 'duas_pessoas'; end if;
  if coalesce(p_dinheiro, 0) < 0 or coalesce(p_pix, 0) < 0 or coalesce(p_cartao, 0) < 0 then raise exception 'valor_invalido'; end if;
  if coalesce(p_dinheiro, 0) + coalesce(p_pix, 0) + coalesce(p_cartao, 0) <= 0 then raise exception 'valor_invalido'; end if;
  if coalesce(p_dinheiro, 0) > 0 and p_conta_dinheiro is null then raise exception 'conta'; end if;
  if coalesce(p_pix, 0) + coalesce(p_cartao, 0) > 0 and p_conta_digital is null then raise exception 'conta'; end if;
  v_contou := (select m.name from service.members m where m.id = p_contou and m.organization_id = p_org);
  v_conferiu := (select m.name from service.members m where m.id = p_conferiu and m.organization_id = p_org);
  if v_contou is null or v_conferiu is null then raise exception 'pessoa'; end if;
  v_eu := (select p.id from service.people p where p.id = any(service.my_people()) and p.organization_id = p_org order by p.id limit 1);
  v_desc := coalesce('Oferta · ' || (select e.name from service.events e where e.id = p_event and e.organization_id = p_org), 'Oferta do culto');

  insert into service.fin_offering_counts
    (organization_id, church_id, event_id, counted_on, fund_id, category_id, cash_cents, pix_cents, card_cents,
     counted_by, counted_by_name, verified_by, verified_by_name, note, created_by)
  values (p_org, p_church, p_event, p_data, p_fund, p_category, coalesce(p_dinheiro, 0), coalesce(p_pix, 0), coalesce(p_cartao, 0),
     p_contou, v_contou, p_conferiu, v_conferiu, nullif(trim(coalesce(p_obs, '')), ''), v_eu)
  returning id into v_id;

  insert into service.fin_transactions
    (organization_id, church_id, kind, occurred_on, amount_cents, account_id, category_id, fund_id, method, description, offering_count_id, created_by)
  select p_org, p_church, 'entrada', p_data, x.valor, x.conta, p_category, p_fund, x.forma, v_desc, v_id, v_eu
  from (values
    (coalesce(p_dinheiro, 0), p_conta_dinheiro, 'dinheiro'),
    (coalesce(p_pix, 0), p_conta_digital, 'pix'),
    (coalesce(p_cartao, 0), p_conta_digital, 'cartao')
  ) as x(valor, conta, forma)
  where x.valor > 0;

  return v_id;
end $$;
grant execute on function service.fin_registrar_oferta(uuid, uuid, date, uuid, uuid, uuid, uuid, uuid, bigint, bigint, bigint, uuid, uuid, text) to authenticated;

-- ── comprovantes: bucket privado, lido só por quem tem acesso ───────────────
insert into storage.buckets (id, name, public)
values ('service-finance', 'service-finance', false)
on conflict (id) do nothing;

-- caminho: <organization_id>/<arquivo>
create or replace function service.fin_can_path(p_name text, p_write boolean)
returns boolean
language plpgsql stable security definer set search_path = service, public as $$
declare v_org uuid;
begin
  begin
    v_org := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return service.fin_can(v_org, p_write);
end $$;
grant execute on function service.fin_can_path(text, boolean) to authenticated;

drop policy if exists fin_files_read on storage.objects;
create policy fin_files_read on storage.objects for select to authenticated
  using (bucket_id = 'service-finance' and service.fin_can_path(name, false));
drop policy if exists fin_files_ins on storage.objects;
create policy fin_files_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'service-finance' and service.fin_can_path(name, true));
drop policy if exists fin_files_upd on storage.objects;
create policy fin_files_upd on storage.objects for update to authenticated
  using (bucket_id = 'service-finance' and service.fin_can_path(name, true));
drop policy if exists fin_files_del on storage.objects;
create policy fin_files_del on storage.objects for delete to authenticated
  using (bucket_id = 'service-finance' and service.fin_can_path(name, true));

-- ═══ 0074_service_escala_periodo.sql ═══
-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0074 · Escala de um período inteiro: rascunho
-- A escala montada para 1 a 12 meses é gravada como rascunho: a liderança vê
-- e ajusta, a pessoa escalada só vê depois de "Publicar e avisar".
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.roster_assignments
  add column if not exists rascunho boolean not null default false;

comment on column service.roster_assignments.rascunho is
  'true: escala ainda não publicada (montada pelo período). Só a liderança e quem lidera o time leem; ao publicar vira false.';

create index if not exists roster_assignments_rascunho_idx
  on service.roster_assignments (event_id) where rascunho;

-- Leitura do rascunho: restritiva, soma com svc_r_scope (0044). Linha publicada
-- passa direto; rascunho só para quem tem liberação de pessoas/times (inclui
-- master, pastor e líder) ou lidera o time da função.
drop policy if exists svc_r_rascunho on service.roster_assignments;
create policy svc_r_rascunho on service.roster_assignments as restrictive for select to authenticated
  using (
    not rascunho
    or service.can_read(organization_id, array['pessoas','times'])
    or position_id in (
      select mp.id from service.ministry_positions mp
      join service.person_ministries pm on pm.ministry_id = mp.ministry_id and pm.is_leader
      where pm.person_id in (select unnest(service.my_people()))
    )
  );

-- ═══ 0075_service_mural_rascunho_agendado.sql ═══
-- Service v7 · jornada "Boletim da semana" e Mural completo: rascunho,
-- agendamento e urgência na publicação.
--
-- status:
--   publicado  no ar (padrão, como tudo que já existe)
--   rascunho   salvo sem publicar; só a liderança vê no painel
--   agendado   entra no ar em publish_at; o agendador de hora em hora
--              (rota /api/service/cron/lembretes, o mesmo do lembrete da 0062)
--              publica e manda a notificação a publish_to, fora do silêncio
--              das 22h às 7h.
-- Ao entrar no ar (publicar agora, publicar o rascunho ou pelo agendador),
-- created_at passa a ser a hora da publicação: o Mural e o app ordenam e
-- mostram "há 2h" por ele.
--
-- urgent: só muda o destaque no Mural e a prioridade do cartão no Início do
-- app (lei 5). Não fura o silêncio nem a escolha de quem desligou o Mural.
--
-- remind_hours: lembrete "em 24h/48h" escolhido num rascunho ou agendamento;
-- o remind_at é calculado quando a publicação entra no ar.

alter table service.announcements add column if not exists status text not null default 'publicado';
do $$ begin
  alter table service.announcements add constraint announcements_status_chk check (status in ('publicado', 'rascunho', 'agendado'));
exception when duplicate_object then null; end $$;
alter table service.announcements add column if not exists publish_at timestamptz;
alter table service.announcements add column if not exists publish_to uuid[];
alter table service.announcements add column if not exists publish_push boolean not null default true;
alter table service.announcements add column if not exists urgent boolean not null default false;
alter table service.announcements add column if not exists remind_hours smallint;
do $$ begin
  alter table service.announcements add constraint announcements_agendado_chk check (status <> 'agendado' or publish_at is not null);
exception when duplicate_object then null; end $$;

comment on column service.announcements.status is 'publicado (no ar), rascunho (só a liderança vê) ou agendado (entra no ar em publish_at).';
comment on column service.announcements.publish_at is 'Quando a publicação agendada entra no ar.';
comment on column service.announcements.publish_to is 'Membros do público no momento do agendamento (service.members.id), para a notificação.';
comment on column service.announcements.publish_push is 'Manda notificação no app ao entrar no ar.';
comment on column service.announcements.urgent is 'Urgente: destaque no Mural e prioridade maior do cartão no Início do app.';
comment on column service.announcements.remind_hours is 'Lembrete relativo (24 ou 48) escolhido antes de publicar; vira remind_at ao entrar no ar.';

create index if not exists announcements_agendado_idx on service.announcements (publish_at) where status = 'agendado';

-- Rascunho e agendado não chegam ao membro: só a liderança lê.
-- (Restritiva: soma com AND à regra base de organização da 0006.)
drop policy if exists svc_r_no_ar on service.announcements;
create policy svc_r_no_ar on service.announcements as restrictive for select to authenticated
  using (status = 'publicado' or service.is_lead(organization_id));

-- ═══ 0076_service_mural_oracao.sql ═══
-- CE.X Service · 0076 · Mural de oração
--
-- service.prayer_requests existia desde 0006 e nunca foi usada: o pedido de
-- oração do app ia só como conversa para quem cuida da intercessão. Agora o
-- membro escolhe quem vê:
--   · 'intercessao': só quem cuida da intercessão (continua indo também como
--     conversa, pelo app);
--   · 'mural': o mural de oração da igreja (a congregação do membro).
-- E pode pedir em anônimo: o nome some para todos, menos para quem cuida.
--
-- Quem cuida (service.cuida_oracao): gestão (dono, master, pastor), quem tem
-- a permissão 'service.oracao' no papel ou liberada pessoa a pessoa, e quem
-- serve no time de intercessão (mesma regra de 0053).
--
-- Privacidade:
--   · membro comum nunca lê a tabela inteira: lê só o que é dele (RLS) e o
--     mural pela função service.prayer_wall, que não devolve member_id e
--     esconde o nome do anônimo;
--   · escrita direta só para quem cuida; o membro escreve pelas funções
--     (pedir, orei, respondido, tirar do mural);
--   · "orei" vira número só para quem pediu (sem ranking, lei 10).
-- Idempotente. Não aplicar em produção antes do merge no service-v7.

-- ── colunas novas ───────────────────────────────────────────────────────────
alter table service.prayer_requests add column if not exists audience text not null default 'intercessao';
alter table service.prayer_requests add column if not exists anonymous boolean not null default false;
alter table service.prayer_requests add column if not exists category text not null default 'outro';
alter table service.prayer_requests add column if not exists answered_at timestamptz;
alter table service.prayer_requests add column if not exists testimony text;
alter table service.prayer_requests add column if not exists moderation text not null default 'ativo';
alter table service.prayer_requests add column if not exists moderated_by uuid references service.people(id) on delete set null;
alter table service.prayer_requests add column if not exists moderated_at timestamptz;

alter table service.prayer_requests drop constraint if exists prayer_requests_audience_check;
alter table service.prayer_requests add constraint prayer_requests_audience_check check (audience in ('intercessao', 'mural'));
alter table service.prayer_requests drop constraint if exists prayer_requests_category_check;
alter table service.prayer_requests add constraint prayer_requests_category_check
  check (category in ('saude', 'familia', 'trabalho', 'espiritual', 'gratidao', 'outro'));
alter table service.prayer_requests drop constraint if exists prayer_requests_moderation_check;
alter table service.prayer_requests add constraint prayer_requests_moderation_check check (moderation in ('ativo', 'oculto', 'arquivado'));
alter table service.prayer_requests drop constraint if exists prayer_requests_body_len;
alter table service.prayer_requests add constraint prayer_requests_body_len check (char_length(body) between 1 and 1000);
alter table service.prayer_requests drop constraint if exists prayer_requests_testimony_len;
alter table service.prayer_requests add constraint prayer_requests_testimony_len check (testimony is null or char_length(testimony) <= 500);

comment on column service.prayer_requests.audience is 'Quem vê: intercessao (só quem cuida) ou mural (a congregação).';
comment on column service.prayer_requests.anonymous is 'No mural, o nome fica escondido de todos menos de quem cuida da intercessão.';
comment on column service.prayer_requests.moderation is 'ativo, oculto (sai do mural, quem pediu ainda vê) ou arquivado.';

create index if not exists prayer_requests_mural_idx on service.prayer_requests (church_id, audience, moderation, created_at desc);
create index if not exists prayer_requests_member_idx on service.prayer_requests (member_id);

-- ── "orei": uma marca por pessoa por pedido ─────────────────────────────────
create table if not exists service.prayer_prayed (
  prayer_id        uuid not null references service.prayer_requests(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (prayer_id, member_id)
);
comment on table service.prayer_prayed is 'Mural de oração: quem orou por um pedido. Só vira número para quem pediu.';
create index if not exists prayer_prayed_member_idx on service.prayer_prayed (member_id);

-- ── permissão nova na matriz (Configurações › Permissões) ───────────────────
insert into core.permissions (code, product_code, label, category)
values ('service.oracao', 'service', 'Pedidos de oração', 'Comunicação')
on conflict (code) do nothing;

-- ── quem cuida da intercessão ───────────────────────────────────────────────
create or replace function service.cuida_oracao(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor')
      or exists (
        select 1 from core.memberships ms
        join core.role_permissions rp
          on rp.organization_id = ms.organization_id and rp.role = ms.role
         and rp.permission_code = 'service.oracao' and rp.allowed
        where ms.organization_id = p_org and ms.user_id = auth.uid() and ms.status = 'active'
      )
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org and p.user_id = auth.uid() and g.grant_code = 'oracao'
      )
      or exists (
        select 1 from service.person_ministries pm
        join service.ministries mi on mi.id = pm.ministry_id
        join service.people p on p.id = pm.person_id
        where mi.organization_id = p_org and p.user_id = auth.uid()
          and (mi.icon in ('intercessao', 'oracao') or mi.name ~* '(interce|ora[cç][aã]o)')
      )
$$;
revoke all on function service.cuida_oracao(uuid) from public;
grant execute on function service.cuida_oracao(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- prayer_requests: leitura direta só de quem cuida ou do próprio pedido.
-- (0044 abria para toda a liderança; líder de outro time não lê mais.)
drop policy if exists svc_r_scope on service.prayer_requests;
create policy svc_r_scope on service.prayer_requests as restrictive for select to authenticated
  using (service.cuida_oracao(organization_id) or member_id in (select unnest(service.my_members())));
drop policy if exists svc_w_ins on service.prayer_requests;
create policy svc_w_ins on service.prayer_requests as restrictive for insert to authenticated
  with check (service.cuida_oracao(organization_id));
drop policy if exists svc_w_upd on service.prayer_requests;
create policy svc_w_upd on service.prayer_requests as restrictive for update to authenticated
  using (service.cuida_oracao(organization_id)) with check (service.cuida_oracao(organization_id));
drop policy if exists svc_w_del on service.prayer_requests;
create policy svc_w_del on service.prayer_requests as restrictive for delete to authenticated
  using (service.cuida_oracao(organization_id));

alter table service.prayer_prayed enable row level security;
drop policy if exists svc_tenant on service.prayer_prayed;
create policy svc_tenant on service.prayer_prayed for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
drop policy if exists svc_r_scope on service.prayer_prayed;
create policy svc_r_scope on service.prayer_prayed as restrictive for select to authenticated
  using (service.cuida_oracao(organization_id) or member_id in (select unnest(service.my_members())));
-- escrita só pelas funções abaixo
drop policy if exists svc_w_ins on service.prayer_prayed;
create policy svc_w_ins on service.prayer_prayed as restrictive for insert to authenticated with check (false);
drop policy if exists svc_w_upd on service.prayer_prayed;
create policy svc_w_upd on service.prayer_prayed as restrictive for update to authenticated using (false) with check (false);
drop policy if exists svc_w_del on service.prayer_prayed;
create policy svc_w_del on service.prayer_prayed as restrictive for delete to authenticated using (false);
grant select, insert, update, delete on service.prayer_prayed to authenticated;

-- ── ficha de membro do usuário logado nesta igreja (organização) ────────────
create or replace function service._eu_membro(p_org uuid)
returns uuid
language sql stable security definer set search_path = service, public as $$
  select m.id from service.members m
  where m.id = any(service.my_members()) and m.organization_id = p_org
  order by m.id limit 1
$$;
revoke all on function service._eu_membro(uuid) from public;

-- ── pedir oração ────────────────────────────────────────────────────────────
-- devolve o id do pedido; erro com mensagem curta quando não pode
create or replace function service.prayer_create(p_org uuid, p_body text, p_audience text, p_anonymous boolean, p_category text)
returns uuid
language plpgsql security definer set search_path = service, public as $$
declare
  v_me uuid;
  v_church uuid;
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  v_me := service._eu_membro(p_org);
  if v_me is null or not core.can_access(p_org, 'service') then raise exception 'sem_ficha'; end if;
  if char_length(v_body) = 0 or char_length(v_body) > 1000 then raise exception 'texto_invalido'; end if;
  if coalesce(p_audience, '') not in ('intercessao', 'mural') then raise exception 'publico_invalido'; end if;
  if coalesce(p_category, 'outro') not in ('saude', 'familia', 'trabalho', 'espiritual', 'gratidao', 'outro') then raise exception 'categoria_invalida'; end if;
  -- freio contra excesso: até 10 pedidos por dia
  if (select count(*) from service.prayer_requests r where r.member_id = v_me and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'limite_diario';
  end if;
  v_church := (select m.church_id from service.members m where m.id = v_me);
  insert into service.prayer_requests (organization_id, church_id, member_id, kind, body, audience, anonymous, category, is_private)
  values (p_org, v_church, v_me, 'oracao', v_body, p_audience, coalesce(p_anonymous, false), coalesce(p_category, 'outro'), p_audience = 'intercessao')
  returning id into v_id;
  return v_id;
end $$;
revoke all on function service.prayer_create(uuid, text, text, boolean, text) from public;
grant execute on function service.prayer_create(uuid, text, text, boolean, text) to authenticated;

-- ── o mural, como o membro vê ───────────────────────────────────────────────
-- pedidos do mural da congregação (ativos, dos últimos 120 dias) + os meus
-- (menos os arquivados). Sem member_id; nome nulo no anônimo; número de
-- "orei" só nos meus.
create or replace function service.prayer_wall(p_org uuid)
returns table (
  id uuid, body text, category text, author text, is_mine boolean, audience text, anonymous boolean,
  hidden boolean, prayed_count integer, i_prayed boolean, answered_at timestamptz, testimony text, created_at timestamptz
)
language plpgsql stable security definer set search_path = service, public as $$
declare
  v_me uuid;
  v_church uuid;
begin
  v_me := service._eu_membro(p_org);
  if v_me is null or not core.can_access(p_org, 'service') then return; end if;
  v_church := (select m.church_id from service.members m where m.id = v_me);
  return query
    select r.id, r.body, r.category,
           case when r.anonymous then null else m.name end,
           r.member_id = v_me,
           r.audience, r.anonymous,
           r.moderation <> 'ativo',
           case when r.member_id = v_me then (select count(*)::int from service.prayer_prayed x where x.prayer_id = r.id) end,
           exists (select 1 from service.prayer_prayed x where x.prayer_id = r.id and x.member_id = v_me),
           r.answered_at, r.testimony, r.created_at
    from service.prayer_requests r
    left join service.members m on m.id = r.member_id
    where r.organization_id = p_org
      and coalesce(r.kind, 'oracao') = 'oracao'
      and (
        (r.member_id = v_me and r.moderation <> 'arquivado')
        or (r.church_id = v_church and r.audience = 'mural' and r.moderation = 'ativo' and r.created_at > now() - interval '120 days')
      )
    order by r.created_at desc
    limit 200;
end $$;
revoke all on function service.prayer_wall(uuid) from public;
grant execute on function service.prayer_wall(uuid) to authenticated;

-- ── orei / desfazer ─────────────────────────────────────────────────────────
create or replace function service.prayer_pray(p_id uuid, p_on boolean default true)
returns boolean
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_me uuid;
begin
  v_org := (select r.organization_id from service.prayer_requests r where r.id = p_id);
  if v_org is null then return false; end if;
  v_me := service._eu_membro(v_org);
  if v_me is null or not core.can_access(v_org, 'service') then return false; end if;
  -- só nos pedidos que a pessoa enxerga no mural (ou nos dela)
  if not exists (
    select 1 from service.prayer_requests r
    where r.id = p_id
      and (r.member_id = v_me or (r.audience = 'mural' and r.moderation = 'ativo'
           and r.church_id = (select m.church_id from service.members m where m.id = v_me)))
  ) then return false; end if;
  if coalesce(p_on, true) then
    insert into service.prayer_prayed (prayer_id, member_id, organization_id) values (p_id, v_me, v_org)
    on conflict do nothing;
  else
    delete from service.prayer_prayed where prayer_id = p_id and member_id = v_me;
  end if;
  return true;
end $$;
revoke all on function service.prayer_pray(uuid, boolean) from public;
grant execute on function service.prayer_pray(uuid, boolean) to authenticated;

-- ── quem pediu: respondido (com testemunho) e tirar do mural ────────────────
create or replace function service.prayer_answer(p_id uuid, p_answered boolean, p_testimony text default null)
returns boolean
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
  v_t text := nullif(btrim(coalesce(p_testimony, '')), '');
begin
  v_org := (select r.organization_id from service.prayer_requests r where r.id = p_id);
  if v_org is null or service._eu_membro(v_org) is distinct from (select r.member_id from service.prayer_requests r where r.id = p_id) then return false; end if;
  if char_length(coalesce(v_t, '')) > 500 then raise exception 'texto_invalido'; end if;
  update service.prayer_requests
     set answered_at = case when p_answered then coalesce(answered_at, now()) end,
         testimony = case when p_answered then v_t end,
         status = case when p_answered then 'resolvido' else 'aberto' end
   where id = p_id;
  return true;
end $$;
revoke all on function service.prayer_answer(uuid, boolean, text) from public;
grant execute on function service.prayer_answer(uuid, boolean, text) to authenticated;

create or replace function service.prayer_withdraw(p_id uuid, p_on boolean default true)
returns boolean
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
begin
  v_org := (select r.organization_id from service.prayer_requests r where r.id = p_id);
  if v_org is null or service._eu_membro(v_org) is distinct from (select r.member_id from service.prayer_requests r where r.id = p_id) then return false; end if;
  -- quem pediu só arquiva o que está ativo (e desfaz o próprio arquivar); não desfaz moderação
  update service.prayer_requests
     set moderation = case when p_on then 'arquivado' else 'ativo' end, moderated_at = now(), moderated_by = null
   where id = p_id and (case when p_on then moderation = 'ativo' else moderation = 'arquivado' and moderated_by is null end);
  return found;
end $$;
revoke all on function service.prayer_withdraw(uuid, boolean) from public;
grant execute on function service.prayer_withdraw(uuid, boolean) to authenticated;

-- ── painel: lista e moderação (quem cuida) ──────────────────────────────────
create or replace function service.prayer_admin_list(p_org uuid)
returns table (
  id uuid, church_id uuid, member_id uuid, author text, body text, category text, audience text, anonymous boolean,
  moderation text, prayed_count integer, answered_at timestamptz, testimony text, created_at timestamptz, moderated_at timestamptz
)
language plpgsql stable security definer set search_path = service, public as $$
begin
  if not service.cuida_oracao(p_org) then return; end if;
  return query
    select r.id, r.church_id, r.member_id, m.name, r.body, r.category, r.audience, r.anonymous, r.moderation,
           (select count(*)::int from service.prayer_prayed x where x.prayer_id = r.id),
           r.answered_at, r.testimony, r.created_at, r.moderated_at
    from service.prayer_requests r
    left join service.members m on m.id = r.member_id
    where r.organization_id = p_org and coalesce(r.kind, 'oracao') = 'oracao'
    order by r.created_at desc
    limit 500;
end $$;
revoke all on function service.prayer_admin_list(uuid) from public;
grant execute on function service.prayer_admin_list(uuid) to authenticated;

create or replace function service.prayer_moderate(p_id uuid, p_state text)
returns boolean
language plpgsql security definer set search_path = service, public as $$
declare
  v_org uuid;
begin
  v_org := (select r.organization_id from service.prayer_requests r where r.id = p_id);
  if v_org is null or not service.cuida_oracao(v_org) then return false; end if;
  if p_state not in ('ativo', 'oculto', 'arquivado') then return false; end if;
  update service.prayer_requests
     set moderation = p_state, moderated_at = now(),
         moderated_by = (select p.id from service.people p where p.id = any(service.my_people()) and p.organization_id = v_org order by p.id limit 1)
   where id = p_id;
  return true;
end $$;
revoke all on function service.prayer_moderate(uuid, text) from public;
grant execute on function service.prayer_moderate(uuid, text) to authenticated;

-- ═══ 0078_service_secretaria.sql ═══
-- Service v7 · Secretaria: livros de registro e carteirinha de membro.
--
-- · Livros (service.registros): Batismos, Casamentos, Apresentação de
--   crianças e Rol de membros, cada um com número sequencial por igreja.
--   O livro de Batismos é alimentado pelos fatos da história (timeline_events
--   'batismo'), e o Rol pelas fichas de membro: ninguém digita duas vezes.
--   Folha e livro físico são opcionais (igreja que já tem livro de papel).
-- · Carteirinha (service.carteirinhas): código aleatório no QR; a verificação
--   pública (verificar_carteirinha) mostra só igreja, nome abreviado,
--   situação e validade.
-- · Preparado para depois: modelos de documento, documentos emitidos e
--   anexos da ficha (certidões). Só as tabelas; a tela vem depois.
-- · Quem usa: dono, master e pastor (o pastor pode ser desligado na matriz)
--   e quem recebeu a liberação "secretaria" (Acessos por pessoa).
-- Idempotente.

-- ── 1. permissão ───────────────────────────────────────────────────────────
insert into core.permissions (code, product_code, label, category) values
  ('service.secretaria', 'service', 'Secretaria', 'Gestão')
on conflict (code) do nothing;

create or replace function service.can_secretaria(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master')
      or (core.has_role(p_org, 'pastor') and not exists (
            select 1 from core.role_permissions rp
            where rp.organization_id = p_org and rp.role = 'pastor'
              and rp.permission_code = 'service.secretaria' and not rp.allowed))
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org and p.user_id = auth.uid() and g.grant_code = 'secretaria'
      )
$$;
grant execute on function service.can_secretaria(uuid) to authenticated;

-- ── 2. livros ──────────────────────────────────────────────────────────────
create table if not exists service.registros (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  livro            text not null check (livro in ('batismo', 'casamento', 'apresentacao', 'rol')),
  numero           integer not null,
  livro_fisico     text,
  folha            text,
  data             date not null,
  -- quem consta no registro, gravado no momento (o livro não muda se a ficha mudar de nome)
  nome             text not null,
  member_id        uuid references service.members(id) on delete set null,
  child_id         uuid references service.children(id) on delete set null,
  fato_id          uuid references service.timeline_events(id) on delete set null,
  oficiante        text,
  local            text,
  -- casamento: {noivo:{nome,member_id}, noiva:{nome,member_id}, testemunhas:[nome]}
  -- apresentacao: {nascimento, pais}
  -- rol: {forma} (batismo, transferência, aclamação...)
  dados            jsonb not null default '{}',
  saida            date,
  saida_motivo     text,
  observacao       text,
  created_by       uuid references service.people(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (church_id, livro, numero),
  check (saida is null or livro = 'rol')
);
comment on table service.registros is 'Livros da secretaria (batismo, casamento, apresentação, rol), número sequencial por igreja e livro.';
create unique index if not exists registros_fato_uidx on service.registros (fato_id) where fato_id is not null;
create unique index if not exists registros_rol_membro_uidx on service.registros (member_id) where livro = 'rol' and member_id is not null;
create index if not exists registros_livro_idx on service.registros (church_id, livro, data);

-- número sequencial: o próximo da igreja naquele livro, sem buraco por corrida
create or replace function service.trg_registro_numero()
returns trigger
language plpgsql security definer set search_path = service, public as $$
begin
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtext('registro:' || new.church_id || ':' || new.livro));
    new.numero := coalesce((select max(r.numero) from service.registros r
                            where r.church_id = new.church_id and r.livro = new.livro), 0) + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists registro_numero on service.registros;
create trigger registro_numero before insert or update on service.registros
  for each row execute function service.trg_registro_numero();

-- batismo: cada fato 'batismo' entra no livro uma vez por pessoa
create or replace function service.registrar_batismo(p_fato uuid)
returns void
language plpgsql security definer set search_path = service, public as $$
declare
  f service.timeline_events%rowtype;
  m service.members%rowtype;
  v_dia date;
  v_pastor text;
  v_local text;
begin
  select * into f from service.timeline_events where id = p_fato;
  if f.id is null or f.event_type <> 'batismo' then return; end if;
  select * into m from service.members where id = f.member_id;
  if m.id is null then return; end if;
  if exists (select 1 from service.registros r where r.livro = 'batismo' and r.member_id = m.id) then return; end if;
  v_dia := coalesce(to_date(nullif(f.sort_key, 0)::text, 'YYYYMMDD'), f.created_at::date);
  -- a turma de batismo concluída dá oficiante e local
  select c.pastor, c.location into v_pastor, v_local
  from service.baptism_candidates bc
  join service.baptism_classes c on c.id = bc.class_id
  where bc.member_id = m.id and c.status = 'concluida'
  order by (c.baptism_date = to_char(v_dia, 'YYYY-MM-DD')) desc, c.updated_at desc
  limit 1;
  insert into service.registros (organization_id, church_id, livro, data, nome, member_id, fato_id, oficiante, local)
  values (m.organization_id, m.church_id, 'batismo', v_dia, m.name, m.id, f.id, nullif(v_pastor, ''), nullif(v_local, ''))
  on conflict (fato_id) where fato_id is not null do nothing;
end $$;
revoke all on function service.registrar_batismo(uuid) from public;

create or replace function service.trg_livro_batismo()
returns trigger
language plpgsql security definer set search_path = service, public as $$
begin
  if new.event_type = 'batismo' then perform service.registrar_batismo(new.id); end if;
  return new;
end $$;
drop trigger if exists livro_batismo on service.timeline_events;
create trigger livro_batismo after insert on service.timeline_events
  for each row execute function service.trg_livro_batismo();

-- rol: toda ficha de membro entra no rol; ao apagar a ficha, o registro fica com a saída
create or replace function service.trg_livro_rol()
returns trigger
language plpgsql security definer set search_path = service, public as $$
begin
  if tg_op = 'INSERT' then
    insert into service.registros (organization_id, church_id, livro, data, nome, member_id)
    values (new.organization_id, new.church_id, 'rol', coalesce(new.created_at, now())::date, new.name, new.id)
    on conflict do nothing;
    return new;
  end if;
  update service.registros
     set saida = coalesce(saida, current_date), saida_motivo = coalesce(saida_motivo, 'Ficha removida')
   where livro = 'rol' and member_id = old.id;
  return old;
end $$;
drop trigger if exists livro_rol on service.members;
create trigger livro_rol after insert on service.members
  for each row execute function service.trg_livro_rol();
drop trigger if exists livro_rol_saida on service.members;
create trigger livro_rol_saida before delete on service.members
  for each row execute function service.trg_livro_rol();

-- o que já existe entra nos livros, na ordem das datas
do $$
declare r record;
begin
  for r in select id from service.timeline_events where event_type = 'batismo' order by sort_key nulls last, created_at loop
    perform service.registrar_batismo(r.id);
  end loop;
  for r in select * from service.members m
           where not exists (select 1 from service.registros x where x.livro = 'rol' and x.member_id = m.id)
           order by m.created_at loop
    insert into service.registros (organization_id, church_id, livro, data, nome, member_id)
    values (r.organization_id, r.church_id, 'rol', r.created_at::date, r.name, r.id)
    on conflict do nothing;
  end loop;
end $$;

-- ── 3. carteirinha ─────────────────────────────────────────────────────────
create table if not exists service.carteirinhas (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  -- vai no QR; 128 bits aleatórios, não é o id da ficha
  codigo           text not null unique default replace(gen_random_uuid()::text, '-', ''),
  validade         date not null,
  emitida_em       timestamptz not null default now(),
  emitida_por      uuid references service.people(id) on delete set null,
  revogada_em      timestamptz
);
comment on table service.carteirinhas is 'Carteirinha de membro emitida; o código do QR leva à verificação pública mínima.';
create index if not exists carteirinhas_membro_idx on service.carteirinhas (member_id, emitida_em desc);

-- verificação pública: sem login, só o mínimo para conferir
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
      when c.validade < current_date then 'vencida'
      else 'valida' end,
    'validade', c.validade
  )
  from service.carteirinhas c
  join service.members m on m.id = c.member_id
  where c.codigo = p_codigo and length(p_codigo) >= 16
  limit 1
$$;
revoke all on function service.verificar_carteirinha(text) from public;
grant execute on function service.verificar_carteirinha(text) to anon, authenticated;

-- ── 4. preparado para depois: documentos por modelo e anexos ───────────────
create table if not exists service.documento_modelos (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid references service.churches(id) on delete cascade,
  nome             text not null,
  -- declaracao, carta_transferencia, certificado_batismo, certificado_casamento, outro
  tipo             text not null default 'outro',
  -- texto com marcadores {nome}, {data_batismo}, {igreja}... preenchidos ao emitir
  corpo            text not null default '',
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table service.documento_modelos is 'Modelos de documento da secretaria (declaração, carta de transferência, certificado). Tela vem depois.';

create table if not exists service.documentos (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  modelo_id        uuid references service.documento_modelos(id) on delete set null,
  member_id        uuid references service.members(id) on delete set null,
  registro_id      uuid references service.registros(id) on delete set null,
  titulo           text not null,
  -- texto final, congelado na emissão
  conteudo         text not null,
  emitido_em       timestamptz not null default now(),
  emitido_por      uuid references service.people(id) on delete set null
);
comment on table service.documentos is 'Documento emitido a partir de um modelo, com o texto congelado.';

create table if not exists service.pessoa_anexos (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  nome             text not null,
  -- certidao_nascimento, certidao_casamento, carta_transferencia, documento, outro
  tipo             text not null default 'outro',
  caminho          text not null,
  bytes            integer,
  created_by       uuid references service.people(id) on delete set null,
  created_at       timestamptz not null default now()
);
comment on table service.pessoa_anexos is 'Anexos da ficha (certidões etc.), caminho no Storage. Tela vem depois.';

-- ── 5. RLS: só a secretaria lê e escreve ───────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['registros', 'carteirinhas', 'documento_modelos', 'documentos', 'pessoa_anexos'] loop
    execute format('alter table service.%I enable row level security', t);
    execute format('drop policy if exists svc_tenant on service.%I', t);
    execute format('create policy svc_tenant on service.%I for all to authenticated using (core.can_access(organization_id, ''service'')) with check (core.can_access(organization_id, ''service''))', t);
    execute format('drop policy if exists svc_r_scope on service.%I', t);
    execute format('create policy svc_r_scope on service.%I as restrictive for select to authenticated using (service.can_secretaria(organization_id))', t);
    execute format('drop policy if exists svc_w_ins on service.%I', t);
    execute format('create policy svc_w_ins on service.%I as restrictive for insert to authenticated with check (service.can_secretaria(organization_id))', t);
    execute format('drop policy if exists svc_w_upd on service.%I', t);
    execute format('create policy svc_w_upd on service.%I as restrictive for update to authenticated using (service.can_secretaria(organization_id)) with check (service.can_secretaria(organization_id))', t);
    execute format('drop policy if exists svc_w_del on service.%I', t);
    execute format('create policy svc_w_del on service.%I as restrictive for delete to authenticated using (service.can_secretaria(organization_id))', t);
    execute format('grant select, insert, update, delete on service.%I to authenticated', t);
  end loop;
end $$;

-- livro é registro: rol e batismo não se apagam pela tela (só casamento e apresentação lançados à mão)
drop policy if exists svc_w_del_livro on service.registros;
create policy svc_w_del_livro on service.registros as restrictive for delete to authenticated
  using (livro in ('casamento', 'apresentacao'));

-- ═══ 0079_service_kids_escrita.sql ═══
-- CE.X Service · 0079 · Kids: quem pode escrever vínculo, ficha e presença da criança
--
-- Até aqui a leitura do Kids era restrita (0044), mas a escrita em children,
-- child_guardians e kids_attendance só exigia ser da igreja (svc_tenant, 0017).
-- Um membro que soubesse o id de uma criança de outra família conseguia se
-- cadastrar como responsável dela e, a partir daí, ver a criança, apagar a
-- presença e pedir a retirada (scripts/check-local-kids.ts).
--
-- Agora:
--   equipe do Kids (liderança, leitura do Kids liberada, time com o módulo Kids):
--     faz tudo, inclusive confirmar a retirada;
--   responsável principal: edita os vínculos e pode apagar a ficha;
--   qualquer responsável: edita a ficha, faz o check-in e, se pode buscar,
--     pede a retirada (não confirma a retirada: isso é da equipe);
--   primeiro vínculo: quem acabou de cadastrar o próprio filho vira o primeiro
--     responsável (só a própria pessoa, só em criança sem responsável).
--   Vínculo e presença sempre da mesma igreja da criança e da sessão.
-- Cadastrar uma criança nova continua aberto a quem é da igreja (o
-- responsável cadastra o filho pelo app). Idempotente.

-- ── funções (security definer: leem as tabelas sem passar pela RLS delas) ─────
create or replace function service.kids_equipe(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select service.is_lead(p_org)
      or service.can_read(p_org, array['kids'])
      or service.has_team_module(p_org, 'kids')
$$;

create or replace function service.kids_responsavel(p_child uuid)
returns boolean
language sql stable security definer set search_path = service, public as $$
  select exists (select 1 from service.child_guardians g
                 where g.child_id = p_child and g.guardian_person_id = any (service.my_people()))
$$;

create or replace function service.kids_principal(p_child uuid)
returns boolean
language sql stable security definer set search_path = service, public as $$
  select exists (select 1 from service.child_guardians g
                 where g.child_id = p_child and g.is_primary and g.guardian_person_id = any (service.my_people()))
$$;

create or replace function service.kids_pode_buscar(p_child uuid)
returns boolean
language sql stable security definer set search_path = service, public as $$
  select exists (select 1 from service.child_guardians g
                 where g.child_id = p_child and g.can_pickup and g.guardian_person_id = any (service.my_people()))
$$;

create or replace function service.kids_sem_responsavel(p_child uuid)
returns boolean
language sql stable security definer set search_path = service, public as $$
  select not exists (select 1 from service.child_guardians g where g.child_id = p_child)
$$;

create or replace function service.kids_org(p_child uuid)
returns uuid
language sql stable security definer set search_path = service, public as $$
  select organization_id from service.children where id = p_child
$$;

grant execute on function service.kids_equipe(uuid), service.kids_responsavel(uuid), service.kids_principal(uuid),
  service.kids_pode_buscar(uuid), service.kids_sem_responsavel(uuid), service.kids_org(uuid) to authenticated;

-- ── vínculo de responsável ────────────────────────────────────────────────────
drop policy if exists svc_w_ins on service.child_guardians;
create policy svc_w_ins on service.child_guardians as restrictive for insert to authenticated
  with check (
    organization_id = service.kids_org(child_id)
    and (
      service.kids_equipe(organization_id)
      or service.kids_principal(child_id)
      or (service.kids_sem_responsavel(child_id) and guardian_person_id = any (service.my_people()))
    )
  );

drop policy if exists svc_w_upd on service.child_guardians;
create policy svc_w_upd on service.child_guardians as restrictive for update to authenticated
  using (service.kids_equipe(organization_id) or service.kids_principal(child_id))
  with check (organization_id = service.kids_org(child_id) and (service.kids_equipe(organization_id) or service.kids_principal(child_id)));

drop policy if exists svc_w_del on service.child_guardians;
create policy svc_w_del on service.child_guardians as restrictive for delete to authenticated
  using (service.kids_equipe(organization_id) or service.kids_principal(child_id) or guardian_person_id = any (service.my_people()));

-- leitura: o responsável vê todos os responsáveis dos próprios filhos. Antes só
-- via o próprio vínculo (0044): adicionar co-responsável pelo app gravava, mas a
-- tela não lia a linha nova e mostrava erro, e a lista ficava vazia.
drop policy if exists svc_r_scope on service.child_guardians;
create policy svc_r_scope on service.child_guardians as restrictive for select to authenticated
  using (
    service.can_read(organization_id, array['kids'])
    or service.has_team_module(organization_id, 'kids')
    or guardian_person_id = any (service.my_people())
    or service.kids_responsavel(child_id)
  );

-- ── ficha da criança ──────────────────────────────────────────────────────────
drop policy if exists svc_w_upd on service.children;
create policy svc_w_upd on service.children as restrictive for update to authenticated
  using (service.kids_equipe(organization_id) or service.kids_responsavel(id))
  with check (service.kids_equipe(organization_id) or service.kids_responsavel(id));

drop policy if exists svc_w_del on service.children;
create policy svc_w_del on service.children as restrictive for delete to authenticated
  using (service.kids_equipe(organization_id) or service.kids_principal(id));

-- ── presença (check-in e pedido de retirada) ──────────────────────────────────
drop policy if exists svc_w_ins on service.kids_attendance;
create policy svc_w_ins on service.kids_attendance as restrictive for insert to authenticated
  with check (organization_id = service.kids_org(child_id) and (service.kids_equipe(organization_id) or service.kids_responsavel(child_id)));

drop policy if exists svc_w_upd on service.kids_attendance;
create policy svc_w_upd on service.kids_attendance as restrictive for update to authenticated
  using (service.kids_equipe(organization_id) or service.kids_responsavel(child_id))
  with check (organization_id = service.kids_org(child_id) and (service.kids_equipe(organization_id) or service.kids_responsavel(child_id)));

drop policy if exists svc_w_del on service.kids_attendance;
create policy svc_w_del on service.kids_attendance as restrictive for delete to authenticated
  using (service.kids_equipe(organization_id));

-- o responsável só faz check-in e pede retirada (se pode buscar); confirmar a
-- retirada é da equipe. A sessão tem de ser da mesma igreja. Chamadas do
-- servidor (sem usuário) não passam por aqui.
create or replace function service.kids_attendance_regras()
returns trigger
language plpgsql security definer set search_path = service, public as $$
begin
  if not exists (select 1 from service.kids_sessions s where s.id = new.session_id and s.organization_id = new.organization_id) then
    raise exception 'sessão de outra igreja' using errcode = '42501';
  end if;
  if auth.uid() is null or service.kids_equipe(new.organization_id) then
    return new;
  end if;
  if new.status not in ('presente', 'retirada_pendente') then
    raise exception 'só a equipe do Kids confirma a retirada' using errcode = '42501';
  end if;
  if new.status = 'retirada_pendente'
     and (tg_op = 'INSERT' or old.status is distinct from 'retirada_pendente')
     and not service.kids_pode_buscar(new.child_id) then
    raise exception 'este responsável não está autorizado a buscar a criança' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.picked_up_confirmed_by is not null or new.picked_up_at is not null or new.picked_up_via is not null then
      raise exception 'só a equipe do Kids confirma a retirada' using errcode = '42501';
    end if;
  elsif new.picked_up_confirmed_by is distinct from old.picked_up_confirmed_by
     or new.picked_up_at is distinct from old.picked_up_at
     or new.picked_up_via is distinct from old.picked_up_via then
    raise exception 'só a equipe do Kids confirma a retirada' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists t_kids_attendance_regras on service.kids_attendance;
create trigger t_kids_attendance_regras before insert or update on service.kids_attendance
  for each row execute function service.kids_attendance_regras();

-- ═══ 0080_service_financeiro_fase2.sql ═══
-- CE.X Service · 0080 · Financeiro, fase 2
--
-- Contas fixas, campanhas com meta e fechamento do mês. Usa as colunas que a
-- fase 1 (0073) deixou prontas em fin_transactions: status 'previsto', due_on,
-- recurring_id, campaign_id e closing_id.
--
--   contas fixas   fin_recurring: o que se repete todo mês (aluguel, luz,
--                  repasse). fin_gerar_previstos cria os lançamentos "previstos"
--                  do mês, com vencimento; pagar é mudar o previsto para realizado.
--   campanhas      fin_campaigns: meta, fundo e prazo; a entrada aponta para a
--                  campanha e o progresso soma as entradas realizadas.
--   fechamento     fin_closings: retrato dos totais do mês. Mês fechado não aceita
--                  lançamento novo, edição nem exclusão (trava no banco); só dono,
--                  master e pastor reabrem.
-- Acesso igual ao da fase 1 (fin_can). Idempotente.

-- ── contas fixas ──────────────────────────────────────────────────────────────
create table if not exists service.fin_recurring (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid references service.churches(id) on delete set null,
  kind             text not null check (kind in ('entrada', 'despesa')),
  description      text not null check (length(trim(description)) between 1 and 140),
  amount_cents     bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  account_id       uuid not null,
  category_id      uuid not null,
  fund_id          uuid not null,
  method           text check (method in ('dinheiro', 'pix', 'cartao', 'transferencia', 'boleto')),
  supplier_name    text check (supplier_name is null or length(supplier_name) <= 120),
  day_of_month     smallint not null check (day_of_month between 1 and 31),
  starts_on        date not null default current_date,
  ends_on          date,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, account_id) references service.fin_accounts (organization_id, id),
  foreign key (organization_id, category_id) references service.fin_categories (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  check (ends_on is null or ends_on >= starts_on)
);
create index if not exists fin_recurring_org_idx on service.fin_recurring (organization_id, active);

-- ── campanhas ─────────────────────────────────────────────────────────────────
create table if not exists service.fin_campaigns (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid references service.churches(id) on delete set null,
  name             text not null check (length(trim(name)) between 1 and 80),
  description      text check (description is null or length(description) <= 500),
  goal_cents       bigint not null check (goal_cents > 0 and goal_cents <= 100000000000),
  fund_id          uuid,
  starts_on        date not null default current_date,
  ends_on          date,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, fund_id) references service.fin_funds (organization_id, id),
  check (ends_on is null or ends_on >= starts_on)
);
create index if not exists fin_campaigns_org_idx on service.fin_campaigns (organization_id, active);

-- ── fechamento do mês ─────────────────────────────────────────────────────────
create table if not exists service.fin_closings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  month            text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  totals           jsonb not null default '{}',
  notes            text check (notes is null or length(notes) <= 1000),
  closed_by        uuid references service.people(id) on delete set null,
  closed_at        timestamptz not null default now(),
  reopened_by      uuid references service.people(id) on delete set null,
  reopened_at      timestamptz
);
-- um fechamento valendo por mês (reaberto fica como histórico)
create unique index if not exists fin_closings_mes on service.fin_closings (organization_id, month) where reopened_at is null;

-- ── ligações que a fase 1 deixou sem FK ────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fin_transactions_recurring_fk') then
    alter table service.fin_transactions add constraint fin_transactions_recurring_fk
      foreign key (recurring_id) references service.fin_recurring(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fin_transactions_campaign_fk') then
    alter table service.fin_transactions add constraint fin_transactions_campaign_fk
      foreign key (campaign_id) references service.fin_campaigns(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fin_transactions_closing_fk') then
    alter table service.fin_transactions add constraint fin_transactions_closing_fk
      foreign key (closing_id) references service.fin_closings(id) on delete set null;
  end if;
end $$;
-- um previsto por conta fixa e vencimento (gerar de novo não duplica)
create unique index if not exists fin_tx_previsto_unico on service.fin_transactions (recurring_id, due_on) where recurring_id is not null;
create index if not exists fin_tx_campaign_idx on service.fin_transactions (campaign_id) where campaign_id is not null;

-- ── RLS (mesmo contrato da fase 1) ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['fin_recurring', 'fin_campaigns', 'fin_closings'] loop
    execute format('alter table service.%I enable row level security', t);
    execute format('drop policy if exists svc_tenant on service.%I', t);
    execute format($f$create policy svc_tenant on service.%I for all to authenticated
      using (core.can_access(organization_id, 'service')) with check (core.can_access(organization_id, 'service'))$f$, t);
    execute format('drop policy if exists svc_r_scope on service.%I', t);
    execute format($f$create policy svc_r_scope on service.%I as restrictive for select to authenticated
      using (service.fin_can(organization_id, false))$f$, t);
    execute format('drop policy if exists svc_w_ins on service.%I', t);
    execute format('drop policy if exists svc_w_upd on service.%I', t);
    execute format('drop policy if exists svc_w_del on service.%I', t);
    if t = 'fin_closings' then
      -- fechamento só pelas funções abaixo (o retrato não se edita à mão)
      execute format($f$create policy svc_w_ins on service.%I as restrictive for insert to authenticated with check (false)$f$, t);
      execute format($f$create policy svc_w_upd on service.%I as restrictive for update to authenticated using (false)$f$, t);
      execute format($f$create policy svc_w_del on service.%I as restrictive for delete to authenticated using (false)$f$, t);
    else
      execute format($f$create policy svc_w_ins on service.%I as restrictive for insert to authenticated
        with check (service.fin_can(organization_id, true))$f$, t);
      execute format($f$create policy svc_w_upd on service.%I as restrictive for update to authenticated
        using (service.fin_can(organization_id, true)) with check (service.fin_can(organization_id, true))$f$, t);
      execute format($f$create policy svc_w_del on service.%I as restrictive for delete to authenticated
        using (service.fin_can(organization_id, true))$f$, t);
    end if;
    execute format('grant select, insert, update, delete on service.%I to authenticated', t);
    execute format('drop trigger if exists t_audit on service.%I', t);
    execute format($f$create trigger t_audit after insert or update or delete on service.%I
      for each row execute function audit.log_change('service')$f$, t);
  end loop;
end $$;

drop trigger if exists t_fin_recurring_upd on service.fin_recurring;
create trigger t_fin_recurring_upd before update on service.fin_recurring for each row execute function core.set_updated_at();
drop trigger if exists t_fin_campaigns_upd on service.fin_campaigns;
create trigger t_fin_campaigns_upd before update on service.fin_campaigns for each row execute function core.set_updated_at();

-- ── trava do mês fechado ──────────────────────────────────────────────────────
create or replace function service.fin_mes_fechado(p_org uuid, p_data date)
returns boolean
language sql stable security definer set search_path = service, public as $$
  select exists (select 1 from service.fin_closings c
                 where c.organization_id = p_org and c.reopened_at is null and c.month = to_char(p_data, 'YYYY-MM'))
$$;

create or replace function service.fin_tx_trava()
returns trigger language plpgsql security definer set search_path = service, public as $$
begin
  -- o próprio fechamento grava closing_id nos lançamentos do mês; chamadas do
  -- servidor (sem usuário: exclusão da igreja, rotinas) não passam pela trava
  if current_setting('svc.fin_fechando', true) = '1' or auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op in ('UPDATE', 'DELETE') and service.fin_mes_fechado(old.organization_id, old.occurred_on) then
    raise exception 'O mês de % está fechado. Peça para reabrir antes de mudar.', to_char(old.occurred_on, 'MM/YYYY') using errcode = '42501';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and service.fin_mes_fechado(new.organization_id, new.occurred_on) then
    raise exception 'O mês de % está fechado. Lance em outro mês ou peça para reabrir.', to_char(new.occurred_on, 'MM/YYYY') using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists t_fin_tx_trava on service.fin_transactions;
create trigger t_fin_tx_trava before insert or update or delete on service.fin_transactions
  for each row execute function service.fin_tx_trava();

-- ── previstos das contas fixas ────────────────────────────────────────────────
-- Cria, para o mês (YYYY-MM), um lançamento previsto por conta fixa ativa e
-- vigente. Dia 31 em mês curto vence no último dia. Gerar de novo não duplica.
create or replace function service.fin_gerar_previstos(p_org uuid, p_mes text)
returns integer
language plpgsql security definer set search_path = service, public as $$
declare
  v_ini date;
  v_fim date;
  v_n integer := 0;
  r service.fin_recurring;
  v_venc date;
  v_pessoa uuid;
begin
  if not service.fin_can(p_org, true) then return 0; end if;
  if p_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' then return 0; end if;
  v_ini := (p_mes || '-01')::date;
  v_fim := (v_ini + interval '1 month - 1 day')::date;
  if service.fin_mes_fechado(p_org, v_ini) then return 0; end if;
  select id into v_pessoa from service.people where user_id = auth.uid() and organization_id = p_org limit 1;
  for r in select * from service.fin_recurring
           where organization_id = p_org and active and starts_on <= v_fim and (ends_on is null or ends_on >= v_ini) loop
    v_venc := least(v_ini + (r.day_of_month - 1), v_fim);
    insert into service.fin_transactions (organization_id, church_id, kind, status, occurred_on, due_on, amount_cents,
      account_id, category_id, fund_id, method, description, supplier_name, recurring_id, created_by)
    values (p_org, r.church_id, r.kind, 'previsto', v_venc, v_venc, r.amount_cents,
      r.account_id, r.category_id, r.fund_id, r.method, r.description, r.supplier_name, r.id, v_pessoa)
    on conflict (recurring_id, due_on) where recurring_id is not null do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;
grant execute on function service.fin_gerar_previstos(uuid, text) to authenticated;

-- ── progresso das campanhas ──────────────────────────────────────────────────
create or replace function service.fin_campanhas_progresso(p_org uuid)
returns table (campaign_id uuid, arrecadado_cents bigint, lancamentos integer)
language sql stable security definer set search_path = service, public as $$
  select c.id,
         coalesce(sum(t.amount_cents) filter (where t.status = 'realizado' and t.kind = 'entrada'), 0)::bigint,
         count(t.id) filter (where t.status = 'realizado' and t.kind = 'entrada')::integer
  from service.fin_campaigns c
  left join service.fin_transactions t on t.campaign_id = c.id
  where c.organization_id = p_org and service.fin_can(p_org, false)
  group by c.id
$$;
grant execute on function service.fin_campanhas_progresso(uuid) to authenticated;

-- ── fechar e reabrir o mês ────────────────────────────────────────────────────
-- O retrato guarda: entradas e despesas por categoria, saldo de cada conta e de
-- cada fundo no último dia do mês, e quantos previstos ficaram em aberto.
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
  if v_ini > current_date then return 'mes_futuro'; end if;
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
grant execute on function service.fin_fechar_mes(uuid, text, text) to authenticated;

create or replace function service.fin_reabrir_mes(p_org uuid, p_mes text)
returns text
language plpgsql security definer set search_path = core, service, public as $$
declare
  v_id uuid;
  v_pessoa uuid;
begin
  if not core.has_role(p_org, 'owner', 'master', 'pastor') then return 'nao_pode'; end if;
  select id into v_id from service.fin_closings where organization_id = p_org and month = p_mes and reopened_at is null;
  if v_id is null then return 'nao_fechado'; end if;
  select id into v_pessoa from service.people where user_id = auth.uid() and organization_id = p_org limit 1;
  update service.fin_closings set reopened_at = now(), reopened_by = v_pessoa where id = v_id;
  perform set_config('svc.fin_fechando', '1', true);
  update service.fin_transactions set closing_id = null where closing_id = v_id;
  perform set_config('svc.fin_fechando', '', true);
  return 'ok';
end $$;
grant execute on function service.fin_reabrir_mes(uuid, text) to authenticated;

-- ═══ 0081_service_contato_internacional.sql ═══
-- País informado no aceite; legado sem país não é reclassificado.
alter table service.members add column if not exists country text;

-- Preserva letras, espaços e hífen em códigos postais. Mesma assinatura,
-- autorização por my_members e regra de preservar dados opcionais vazios.
create or replace function service.update_my_member_contact(
  p_member uuid,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_birth text default null,
  p_postal_code text default null,
  p_street text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null
)
returns boolean
language plpgsql security definer set search_path = service, public as $$
begin
  if not (p_member = any(service.my_members())) then
    return false;
  end if;
  if length(trim(p_postal_code)) > 32 then
    raise exception 'Código postal deve ter até 32 caracteres.' using errcode = '22001';
  end if;
  update service.members set
    name = coalesce(nullif(trim(p_name), ''), name),
    email = coalesce(nullif(trim(p_email), ''), email),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    birth = coalesce(nullif(p_birth, ''), birth),
    postal_code = coalesce(nullif(trim(p_postal_code), ''), postal_code),
    street = coalesce(nullif(p_street, ''), street),
    neighborhood = coalesce(nullif(p_neighborhood, ''), neighborhood),
    city = coalesce(nullif(p_city, ''), city),
    state = coalesce(nullif(p_state, ''), state),
    updated_at = now()
  where id = p_member;
  return found;
end $$;

grant execute on function service.update_my_member_contact(uuid, text, text, text, text, text, text, text, text, text) to authenticated;

-- Sem reescrever dados legados: país já perdido não pode ser inferido.
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
  -- Um país explícito não brasileiro deve sobreviver ao trigger.
  if left(btrim(p), 1) = '+' and left(btrim(p), 3) <> '+55' then
    return btrim(p);
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

-- ═══ 0082_service_times_recebimento.sql ═══
-- Recebimento é explícito. Sem alterar pedidos anteriores nem incluir pessoas.
create or replace function service.request_to_serve(p_ministry uuid, p_note text default null)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  v_member uuid;
  v_person uuid;
  v_org uuid;
  v_church uuid;
  v_ministry_name text;
  v_ministry_church uuid;
  v_aberto boolean;
  v_leader_member uuid;
  v_chat uuid;
begin
  select mi.organization_id, mi.name, mi.church_id, coalesce(mi.profile->'recebendoVoluntarios' = 'true'::jsonb, false) into v_org, v_ministry_name, v_ministry_church, v_aberto from service.ministries mi where mi.id = p_ministry;
  if v_org is null then return 'time_inexistente'; end if;
  select m.id, m.volunteer_id, m.church_id into v_member, v_person, v_church from service.members m
  where m.id = any(service.my_members()) and m.organization_id = v_org and m.church_id = v_ministry_church
  limit 1;
  if v_member is null then return 'sem_ficha'; end if;
  if v_person is null then return 'sem_ficha'; end if;
  if not v_aberto then return 'time_fechado'; end if;
  if not exists (
    select 1 from service.person_ministries pm
    join service.members lm on lm.volunteer_id = pm.person_id and lm.organization_id = v_org and lm.church_id = v_ministry_church
    where pm.ministry_id = p_ministry and pm.is_leader and lm.id <> v_member
  ) then return 'sem_lider_no_app'; end if;
  if exists (
    select 1 from service.person_ministries where person_id = v_person and ministry_id = p_ministry
  ) then return 'ja_serve'; end if;
  if exists (select 1 from service.missing_requirements(v_member, 'serve', null))
     or exists (select 1 from service.missing_requirements(v_member, 'ministry', p_ministry)) then
    return 'faltam_requisitos';
  end if;
  insert into service.serve_requests (organization_id, member_id, ministry_id, note)
  values (v_org, v_member, p_ministry, nullif(trim(coalesce(p_note, '')), ''))
  on conflict (member_id, ministry_id) where status = 'pendente' do nothing;
  -- pedido repetido (já pendente): não manda a mensagem de novo
  if not found then return 'ok'; end if;

  -- conversa com o líder do time (se ele tiver ficha no app)
  select lm.id into v_leader_member
  from service.person_ministries pm
  join service.members lm on lm.volunteer_id = pm.person_id and lm.organization_id = v_org and lm.church_id = v_ministry_church
  where pm.ministry_id = p_ministry and pm.is_leader and lm.id <> v_member
  limit 1;
  if v_leader_member is not null then
    select c.id into v_chat
    from service.chats c
    where c.kind = 'dm' and c.organization_id = v_org
      and exists (select 1 from service.chat_members a where a.chat_id = c.id and a.member_id = v_member)
      and exists (select 1 from service.chat_members b where b.chat_id = c.id and b.member_id = v_leader_member)
    limit 1;
    if v_chat is null then
      insert into service.chats (organization_id, church_id, kind, name)
      values (v_org, v_church, 'dm', null)
      returning id into v_chat;
      insert into service.chat_members (organization_id, chat_id, member_id)
      values (v_org, v_chat, v_member), (v_org, v_chat, v_leader_member);
    end if;
    insert into service.messages (organization_id, chat_id, sender_id, body)
    values (v_org, v_chat, v_member, 'Oi! Pedi para servir no time ' || v_ministry_name || '. Podemos conversar?');
  end if;
  return 'ok';
end $$;
grant execute on function service.request_to_serve(uuid, text) to authenticated;

-- Só expõe IDs de oportunidades utilizáveis da igreja do próprio membro.
-- Não amplia a leitura de fichas, telefones ou vínculos de outras pessoas.
create or replace function service.times_recebendo_pedidos()
returns table(id uuid)
language sql stable security definer set search_path = service, public as $$
  select mi.id from service.ministries mi
  where mi.profile->'recebendoVoluntarios' = 'true'::jsonb
    and exists (select 1 from service.members me where me.id = any(service.my_members()) and me.church_id = mi.church_id and me.organization_id = mi.organization_id)
    and exists (
      select 1 from service.person_ministries pm
      join service.members lm on lm.volunteer_id = pm.person_id and lm.church_id = mi.church_id and lm.organization_id = mi.organization_id
      where pm.ministry_id = mi.id and pm.is_leader
    );
$$;
revoke all on function service.times_recebendo_pedidos() from public, anon;
grant execute on function service.times_recebendo_pedidos() to authenticated;

-- A política FOR ALL antiga também bloqueava SELECT do próprio pedido.
-- Mantém a escrita direta restrita à liderança, separada da leitura existente.
drop policy if exists svc_w_all on service.serve_requests;
drop policy if exists svc_w_insert on service.serve_requests;
create policy svc_w_insert on service.serve_requests as restrictive for insert to authenticated
  with check (service.is_lead(organization_id));
drop policy if exists svc_w_update on service.serve_requests;
create policy svc_w_update on service.serve_requests as restrictive for update to authenticated
  using (service.is_lead(organization_id)) with check (service.is_lead(organization_id));
drop policy if exists svc_w_delete on service.serve_requests;
create policy svc_w_delete on service.serve_requests as restrictive for delete to authenticated
  using (service.is_lead(organization_id));

-- ═══ 0083_service_endereco_geolocalizacao.sql ═══
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

-- ═══ 0084_service_documento_opcional.sql ═══
-- Documento voluntário, separado das listas de pessoas e das fichas públicas.
create table if not exists service.member_documents (
  member_id uuid primary key references service.members(id) on delete cascade,
  cpf text check (cpf is null or cpf ~ '^\d{11}$'),
  updated_at timestamptz not null default now()
);
alter table service.member_documents enable row level security;
revoke all on service.member_documents from public, anon, authenticated;
grant all on service.member_documents to service_role;

create or replace function service.my_member_cpf(p_member uuid)
returns text language plpgsql stable security definer set search_path = service, public as $$
begin
  if not (p_member = any(service.my_members())) then return null; end if;
  return (select cpf from service.member_documents where member_id = p_member);
end $$;

create or replace function service.save_my_member_cpf(p_member uuid, p_cpf text)
returns text language plpgsql security definer set search_path = service, public as $$
declare d text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'); n integer; i integer; soma integer; resto integer;
begin
  if not (p_member = any(service.my_members())) then return 'sem_ficha'; end if;
  if d <> '' then
    if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return 'cpf_invalido'; end if;
    for n in 9..10 loop
      soma := 0;
      for i in 1..n loop soma := soma + substr(d, i, 1)::integer * (n + 2 - i); end loop;
      resto := soma % 11;
      if substr(d, n + 1, 1)::integer <> (case when resto < 2 then 0 else 11 - resto end) then return 'cpf_invalido'; end if;
    end loop;
  end if;
  insert into service.member_documents(member_id, cpf) values (p_member, nullif(d, ''))
  on conflict (member_id) do update set cpf = excluded.cpf, updated_at = now();
  return 'ok';
end $$;
revoke all on function service.my_member_cpf(uuid) from public, anon;
revoke all on function service.save_my_member_cpf(uuid, text) from public, anon;
grant execute on function service.my_member_cpf(uuid) to authenticated;
grant execute on function service.save_my_member_cpf(uuid, text) to authenticated;

-- ═══ 0085_service_cnpj_alfanumerico.sql ═══
-- ASCII menos 48, conforme manual técnico da Receita. Sem mudar papéis,
-- permissões, trial, assinatura nem a opção vigente de não informar CNPJ.
create or replace function service.cnpj_valido(p text)
returns boolean language plpgsql immutable as $$
declare d text := upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')); n integer; i integer; soma integer; peso integer; resto integer; dv integer;
begin
  if d !~ '^[A-Z0-9]{12}[0-9]{2}$' or d ~ '^(\d)\1{13}$' then return false; end if;
  for n in 12..13 loop
    soma := 0; peso := 2;
    for i in reverse n..1 loop
      soma := soma + (ascii(substr(d, i, 1)) - 48) * peso;
      peso := case when peso = 9 then 2 else peso + 1 end;
    end loop;
    resto := soma % 11; dv := case when resto < 2 then 0 else 11 - resto end;
    if substr(d, n + 1, 1)::integer <> dv then return false; end if;
  end loop;
  return true;
end $$;

CREATE OR REPLACE FUNCTION core.bootstrap_church_org_v2(p_org_name text, p_cnpj text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_trial boolean DEFAULT true)
 RETURNS TABLE(organization_id uuid, church_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'service', 'billing', 'public'
AS $function$
declare
  v_user_id            uuid := auth.uid();
  v_created_org_id     uuid;
  v_created_church_id  uuid;
  v_cnpj_digits        text;
  v_signup_seq         bigint;
  v_trial_days         integer;
  v_plan_id            uuid;
begin
  if v_user_id is null then
    raise exception 'bootstrap_church_org: sem usuário autenticado';
  end if;

  v_cnpj_digits := nullif(upper(regexp_replace(coalesce(p_cnpj, ''), '[^A-Za-z0-9]', '', 'g')), '');

  if v_cnpj_digits is not null then
    if not service.cnpj_valido(v_cnpj_digits) then
      raise exception 'bootstrap_church_org: Confira os 14 caracteres e os dígitos verificadores do CNPJ (ou deixe em branco)';
    end if;

    if exists (select 1 from service.churches where upper(regexp_replace(coalesce(doc, ''), '[^A-Za-z0-9]', '', 'g')) = v_cnpj_digits) then
      raise exception 'bootstrap_church_org: este CNPJ já está cadastrado em outra igreja';
    end if;
  end if;

  insert into core.users (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into core.organizations (name, kind, owner_id)
  values (p_org_name, 'church', v_user_id)
  returning id into v_created_org_id;

  insert into core.memberships (user_id, organization_id, role, status)
  values (v_user_id, v_created_org_id, 'master', 'active');

  if p_trial then
    insert into core.product_access (organization_id, product_code, active, source)
    values (v_created_org_id, 'service', true, 'trial')
    on conflict on constraint product_access_organization_id_product_code_key
    do update set active = true, source = 'trial', updated_at = now();
  end if;

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'master', permissions.code, true
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'pastor', permissions.code, (permissions.code <> 'service.rede')
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'lider', permissions.code,
         permissions.code in (
           'service.painel',
           'service.voluntarios',
           'service.times',
           'service.decisoes',
           'service.escala',
           'service.cultos',
           'service.comunica',
           'service.kids',
           'service.reunioes',
           'service.ensaios',
           'service.quadros',
           'service.conversas'
         )
  from core.permissions
  where permissions.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_created_org_id, 'membro', permissions.code, false
  from core.permissions
  where permissions.product_code = 'service';

  insert into service.churches (organization_id, name, city, is_headquarters, doc, email, phone, address, postal_code)
  values (v_created_org_id, p_org_name, p_city, true, v_cnpj_digits, p_email, p_phone, p_address, p_postal_code)
  returning id into v_created_church_id;

  insert into service.people (organization_id, church_id, user_id, name, email, status)
  select v_created_org_id, v_created_church_id, v_user_id,
         coalesce(u.full_name, split_part(u.email, '@', 1), 'Administrador'),
         u.email,
         'ativo'
  from core.users u
  where u.id = v_user_id;

  v_signup_seq := nextval('billing.church_signup_seq');
  v_trial_days := case when v_signup_seq <= 500 then 90 else 14 end;

  v_plan_id := (select id from billing.plans where code = 'service_church');

  if v_plan_id is not null then
    insert into billing.subscriptions (organization_id, plan_id, product_code, status, provider, provider_ref, current_period_end)
    values (
      v_created_org_id,
      v_plan_id,
      'service',
      'trialing',
      'manual',
      case when v_signup_seq <= 500 then 'promo_500' else 'trial_padrao' end,
      now() + (v_trial_days || ' days')::interval
    );
  end if;

  organization_id := v_created_org_id;
  church_id := v_created_church_id;
  return next;
end $function$

;

-- ═══ 0086_service_fuso_igreja.sql ═══
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

-- ═══ 0093_ci_migracao_automatica.sql ═══
-- Marco da migração automática (docs/service-v7/MIGRACOES.md): a primeira
-- migração aplicada em produção pelo workflow Produção, sem SQL Editor.
-- Inofensiva: só troca o comentário do schema.
comment on schema service is 'Produto Service (gestão de igrejas). Não mistura campos do CE.X. Migrações aplicadas pelo workflow Produção.';

-- ═══ 0094_service_push_acesso.sql ═══
-- Inscrições de push são escritas pelas rotas autenticadas com service_role.
-- SELECT continua limitado à própria pessoa pela policy de 0044.
-- Sem esta revogação, svc_tenant permitia forjar inscrição de outra pessoa.
revoke insert, update, delete on service.push_subscriptions from anon, authenticated;
grant insert, update, delete on service.push_subscriptions to service_role;

-- ═══ 0095_service_financeiro_acesso.sql ═══
-- Storage privado usa fin_can sem a policy base de tenant das tabelas.
-- A liberação individual só vale com vínculo e produto ativos, inclusive ali.
create or replace function service.fin_can(p_org uuid, p_write boolean default false)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.can_access(p_org, 'service') and (
    core.has_role(p_org, 'owner', 'master', 'pastor')
    or exists (
      select 1 from service.person_grants g
      join service.people p on p.id = g.person_id
      where g.organization_id = p_org
        and p.user_id = auth.uid()
        and g.grant_code = any(case when p_write then array['financeiro.lancar'] else array['financeiro.ver', 'financeiro.lancar'] end)
    )
  )
$$;
grant execute on function service.fin_can(uuid, boolean) to authenticated;

-- ═══ 0096_service_locale_currency.sql ═══
-- N1: locale da conta e moeda única da rede. Valores legados permanecem BRL.
-- Sem câmbio: a moeda não muda depois do primeiro valor financeiro.

-- A base pode ser publicada antes das telas. Somente uma migração futura,
-- com a integração completa verificada, deve liberar cada recurso.
create table if not exists service.international_rollout (
  feature text primary key check (feature in ('locale', 'currency')),
  enabled boolean not null default false
);
insert into service.international_rollout(feature) values ('locale'), ('currency') on conflict do nothing;
alter table service.international_rollout enable row level security;
revoke all on service.international_rollout from public, anon, authenticated;
grant all on service.international_rollout to service_role;
create or replace function service.international_enabled(p_feature text)
returns boolean language sql stable security definer set search_path = service, public as $$
  select coalesce((select enabled from service.international_rollout where feature = p_feature), false);
$$;
revoke all on function service.international_enabled(text) from public;
grant execute on function service.international_enabled(text) to anon, authenticated, service_role;

alter table core.users add column if not exists locale_code text not null default 'pt-BR';
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'core.users'::regclass and conname = 'users_locale_code_check') then
    alter table core.users add constraint users_locale_code_check check (locale_code in ('pt-BR', 'en-US', 'es-ES'));
  end if;
end $$;

create or replace function service.my_locale()
returns text language sql stable security definer set search_path = core, public as $$
  select case when service.international_enabled('locale') then coalesce((select locale_code from core.users where id = auth.uid()), 'pt-BR') else 'pt-BR' end;
$$;
create or replace function service.set_my_locale(p_locale text)
returns text language plpgsql security definer set search_path = core, public as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = '42501'; end if;
  if p_locale is null or p_locale not in ('pt-BR', 'en-US', 'es-ES') then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;
  if not service.international_enabled('locale') then raise exception 'locale_not_available' using errcode = '42501'; end if;
  update core.users set locale_code = p_locale where id = auth.uid();
  if not found then raise exception 'user_not_found' using errcode = '42501'; end if;
  return p_locale;
end $$;
revoke all on function service.my_locale(), service.set_my_locale(text) from public, anon;
grant execute on function service.my_locale(), service.set_my_locale(text) to authenticated;

create table if not exists service.organization_preferences (
  organization_id uuid primary key references core.organizations(id) on delete cascade,
  currency_code text not null default 'BRL' check (currency_code in ('BRL', 'EUR', 'USD')),
  currency_locked boolean not null default false
);
comment on table service.organization_preferences is 'Preferências da rede Service. Moeda única para totais financeiros por organization_id.';
alter table service.organization_preferences enable row level security;
drop policy if exists organization_preferences_read on service.organization_preferences;
create policy organization_preferences_read on service.organization_preferences for select to authenticated
  using (core.can_access(organization_id, 'service'));
revoke all on service.organization_preferences from public, anon, authenticated;
grant select on service.organization_preferences to authenticated;
grant all on service.organization_preferences to service_role;

insert into service.organization_preferences (organization_id, currency_locked)
select distinct c.organization_id,
  exists (select 1 from service.fin_transactions t where t.organization_id = c.organization_id)
  or exists (select 1 from service.fin_accounts a where a.organization_id = c.organization_id and a.opening_balance_cents <> 0)
  or exists (select 1 from service.fin_recurring r where r.organization_id = c.organization_id)
  or exists (select 1 from service.fin_campaigns k where k.organization_id = c.organization_id)
  or exists (select 1 from service.fin_offering_counts o where o.organization_id = c.organization_id)
from service.churches c on conflict (organization_id) do nothing;

create or replace function service.ensure_organization_preferences()
returns trigger language plpgsql security definer set search_path = service, public as $$
begin
  insert into service.organization_preferences (organization_id) values (new.organization_id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists t_organization_preferences on service.churches;
create trigger t_organization_preferences after insert on service.churches
  for each row execute function service.ensure_organization_preferences();

create or replace function service.set_organization_currency(p_org uuid, p_currency text)
returns text language plpgsql security definer set search_path = core, service, public as $$
declare pref service.organization_preferences;
begin
  if auth.uid() is null or not core.can_access(p_org, 'service') or not core.has_role(p_org, 'owner', 'master', 'pastor') then
    raise exception 'currency_forbidden' using errcode = '42501';
  end if;
  if p_currency is null or p_currency not in ('BRL', 'EUR', 'USD') then
    raise exception 'invalid_currency' using errcode = '22023';
  end if;
  insert into service.organization_preferences (organization_id) values (p_org) on conflict do nothing;
  -- O primeiro valor financeiro trava a mesma linha, serializando as duas operações.
  select * into strict pref from service.organization_preferences where organization_id = p_org for update;
  if pref.currency_code = p_currency then return p_currency; end if;
  if not service.international_enabled('currency') then raise exception 'currency_not_available' using errcode = '42501'; end if;
  if pref.currency_locked then raise exception 'currency_locked' using errcode = '23514'; end if;
  update service.organization_preferences set currency_code = p_currency where organization_id = p_org;
  return p_currency;
end $$;
revoke all on function service.set_organization_currency(uuid, text) from public, anon;
grant execute on function service.set_organization_currency(uuid, text) to authenticated;

create or replace function service.fin_guard_currency()
returns trigger language plpgsql security definer set search_path = service, public as $$
declare
  code text;
  expected text;
  meaningful boolean;
begin
  meaningful := tg_table_name <> 'fin_accounts' or coalesce((to_jsonb(new)->>'opening_balance_cents')::bigint, 0) <> 0;
  if not meaningful then return new; end if;
  if auth.uid() is not null and not service.fin_can(new.organization_id, true) then
    raise exception 'currency_forbidden' using errcode = '42501';
  end if;
  insert into service.organization_preferences (organization_id) values (new.organization_id) on conflict do nothing;
  select currency_code into strict code from service.organization_preferences where organization_id = new.organization_id for update;
  if auth.uid() is not null then
    -- Clientes antigos só interpretavam BRL. Em outra moeda, precisam declarar
    -- explicitamente a moeda que estava no formulário, não apenas mandar centavos.
    expected := coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-service-currency', 'BRL');
    if expected <> code then raise exception 'currency_changed' using errcode = '23514'; end if;
    if code <> 'BRL' and (
      (tg_table_name = 'fin_transactions' and to_jsonb(new)->>'method' in ('pix', 'boleto'))
      or (tg_table_name = 'fin_recurring' and to_jsonb(new)->>'method' in ('pix', 'boleto'))
      or (tg_table_name = 'fin_offering_counts' and coalesce((to_jsonb(new)->>'pix_cents')::bigint, 0) > 0)
    ) then raise exception 'payment_method_unavailable' using errcode = '23514'; end if;
  end if;
  update service.organization_preferences set currency_locked = true where organization_id = new.organization_id;
  return new;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['fin_accounts', 'fin_transactions', 'fin_recurring', 'fin_campaigns', 'fin_offering_counts'] loop
    execute format('drop trigger if exists t_fin_currency on service.%I', table_name);
    execute format('create trigger t_fin_currency before insert or update on service.%I for each row execute function service.fin_guard_currency()', table_name);
  end loop;
end $$;

-- A view preserva a RLS das duas tabelas. A aplicação não escolhe moeda por congregação.
create or replace view service.churches_with_preferences with (security_invoker = true) as
  select c.*, coalesce(p.currency_code, 'BRL') as currency_code, coalesce(p.currency_locked, false) as currency_locked
  from service.churches c left join service.organization_preferences p on p.organization_id = c.organization_id;
revoke all on service.churches_with_preferences from public, anon;
grant select on service.churches_with_preferences to authenticated, service_role;
revoke all on function service.ensure_organization_preferences(), service.fin_guard_currency() from public, anon, authenticated;
-- A fila guarda a identidade explícita do texto automático para resolver o idioma
-- no momento do envio. Títulos/corpos escritos pela igreja continuam intocados.
alter table service.push_queue add column if not exists body_template text;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'service.push_queue'::regclass and conname = 'push_queue_body_template_check') then
    alter table service.push_queue add constraint push_queue_body_template_check
      check (body_template is null or body_template in ('mural-novo', 'mural-lembrete'));
  end if;
end $$;

-- Só a entrega do servidor pode ler idiomas de outras pessoas. O recorte da
-- organização e da lista é obrigatório mesmo com credencial de serviço.
create or replace function service.notification_locales(p_org uuid, p_people uuid[])
returns table(person_id uuid, locale_code text)
language sql stable security definer set search_path = core, service, public as $$
  select p.id, case when service.international_enabled('locale') then coalesce(u.locale_code, 'pt-BR') else 'pt-BR' end
  from service.people p left join core.users u on u.id = p.user_id
  where p.organization_id = p_org and p.id = any(p_people);
$$;
revoke all on function service.notification_locales(uuid, uuid[]) from public, anon, authenticated;
grant execute on function service.notification_locales(uuid, uuid[]) to service_role;

notify pgrst, 'reload schema';

commit;
