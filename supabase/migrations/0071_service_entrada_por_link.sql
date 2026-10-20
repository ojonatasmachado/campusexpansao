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
