-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0009 · BOOTSTRAP — signup e criação de igreja
-- Dois gatilhos do ciclo de vida:
--   1) Novo login no Supabase Auth  → espelha em core.users.
--   2) core.bootstrap_church_org()  → cria a organização (tenant), o vínculo
--      master, libera o produto 'service', semeia a matriz de permissões
--      (MATRIZ_V2) e cria a igreja matriz. Tudo numa transação.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) auth.users → core.users ─────────────────────────────────────────────────
create or replace function core.handle_new_user()
returns trigger language plpgsql security definer set search_path = core, public as $$
begin
  insert into core.users (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(core.users.full_name, excluded.full_name);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function core.handle_new_user();

-- ── 2) core.bootstrap_church_org ────────────────────────────────────────────────
-- Chamada pelo app logo após o cadastro do dono. O chamador (auth.uid()) vira o
-- master da nova org. Retorna { organization_id, church_id }.
--
--   select * from core.bootstrap_church_org('Igreja Central', 'São Paulo · SP');
--
-- SECURITY DEFINER: escreve em core/service/billing sem esbarrar na própria RLS.
create or replace function core.bootstrap_church_org(
  p_org_name    text,
  p_city        text default null,
  p_trial       boolean default true   -- true = libera 'service' sem passar por billing
)
returns table (organization_id uuid, church_id uuid)
language plpgsql security definer set search_path = core, service, billing, public as $$
declare
  v_uid   uuid := auth.uid();
  v_org   uuid;
  v_church uuid;
begin
  if v_uid is null then
    raise exception 'bootstrap_church_org: sem usuário autenticado';
  end if;

  -- garante o perfil (caso o trigger de signup ainda não tenha rodado)
  insert into core.users (id) values (v_uid) on conflict (id) do nothing;

  -- 1. organização (tenant)
  insert into core.organizations (name, kind, owner_id)
  values (p_org_name, 'church', v_uid)
  returning id into v_org;

  -- 2. vínculo do dono como master
  insert into core.memberships (user_id, organization_id, role, status)
  values (v_uid, v_org, 'master', 'active');

  -- 3. liberação do produto 'service' (trial direto; ou billing ativa depois)
  if p_trial then
    insert into core.product_access (organization_id, product_code, active, source)
    values (v_org, 'service', true, 'trial')
    on conflict (organization_id, product_code) do update set active = true;
  end if;

  -- 4. matriz de permissões (MATRIZ_V2) para os 4 papéis, a partir do catálogo
  --    master → tudo; pastor → tudo menos 'service.rede'; lider → subset; vol → nada
  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_org, 'master', p.code, true
  from core.permissions p where p.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_org, 'pastor', p.code, (p.code <> 'service.rede')
  from core.permissions p where p.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_org, 'lider', p.code,
         p.code in ('service.painel','service.voluntarios','service.times',
                    'service.decisoes','service.escala','service.cultos','service.comunica')
  from core.permissions p where p.product_code = 'service';

  insert into core.role_permissions (organization_id, role, permission_code, allowed)
  select v_org, 'vol', p.code, false
  from core.permissions p where p.product_code = 'service';

  -- 5. igreja matriz
  insert into service.churches (organization_id, name, city, is_headquarters)
  values (v_org, p_org_name, p_city, true)
  returning id into v_church;

  organization_id := v_org;
  church_id := v_church;
  return next;
end $$;

-- Deixa o app (usuário logado) chamar a função.
grant execute on function core.bootstrap_church_org(text, text, boolean) to authenticated;
