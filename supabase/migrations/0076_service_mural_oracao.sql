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
