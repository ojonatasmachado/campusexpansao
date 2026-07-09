-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0017 · SERVICE — ÁREA KIDS
-- Aditiva: só cria tabela/coluna/policy nova, não altera nada existente.
--
-- Cadastro de criança + responsáveis (N:N, com grau de parentesco e
-- autorização própria pra retirar), sessão Kids por turma por culto (mesmo
-- padrão de checkin_token/checkin_active de 0011/0013, mas 1 sessão por
-- turma+evento em vez de 1 por evento), check-in/checkout com estado
-- intermediário de "retirada pendente" (o professor só libera depois de
-- confirmar visualmente quem retirou), e eventos infantis com inscrição
-- (mesmo espírito de baptism_classes.open_enrollment).
--
-- Responsável = uma linha em service.people (é o único FK que auth.uid()
-- alcança no domínio Service, ver 0016). Walk-in sem cadastro cria um
-- people sem user_id na hora, igual visitante que ainda não logou.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── service.kids_classes (turma) ──────────────────────────────────────────────
create table service.kids_classes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  name             text not null,
  min_age_months   integer,
  max_age_months   integer,
  room_id          uuid references service.rooms(id) on delete set null,
  capacity         integer,
  accent           text default 'wheat',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table service.kids_classes is 'Turma do ministério infantil (Berçário, Maternal...). Faixa etária sugere a turma da criança; ajustável.';

-- ── service.children (ficha da criança) ───────────────────────────────────────
create table service.children (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  class_id         uuid references service.kids_classes(id) on delete set null,
  name             text not null,
  birth            date,
  photo_url        text,
  allergies        text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── service.child_guardians (N:N criança ↔ responsável) ───────────────────────
create table service.child_guardians (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references core.organizations(id) on delete cascade,
  child_id            uuid not null references service.children(id) on delete cascade,
  guardian_person_id  uuid not null references service.people(id) on delete cascade,
  relationship        text,
  can_pickup          boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (child_id, guardian_person_id)
);
comment on table service.child_guardians is 'Vínculo criança↔responsável, N:N. relationship é livre (mãe/pai/avó/tio...). can_pickup: autorização própria pra retirar.';

-- ── service.kids_sessions (1 turma rodando num culto, QR próprio) ─────────────
create table service.kids_sessions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  event_id         uuid not null references service.events(id) on delete cascade,
  class_id         uuid not null references service.kids_classes(id) on delete cascade,
  checkin_token    text,
  checkin_active   boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (event_id, class_id)
);

-- ── service.kids_attendance (check-in/checkout por criança por sessão) ────────
create table service.kids_attendance (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references core.organizations(id) on delete cascade,
  session_id               uuid not null references service.kids_sessions(id) on delete cascade,
  child_id                 uuid not null references service.children(id) on delete cascade,
  status                   text not null default 'presente' check (status in ('presente','retirada_pendente','retirado')),
  dropped_off_by           uuid references service.people(id) on delete set null,
  dropped_off_at           timestamptz not null default now(),
  dropped_off_via          text not null default 'qr' check (dropped_off_via in ('qr','manual')),
  pickup_requested_by      uuid references service.people(id) on delete set null,
  pickup_requested_at      timestamptz,
  picked_up_by             uuid references service.people(id) on delete set null,
  picked_up_confirmed_by   uuid references service.people(id) on delete set null,
  picked_up_at             timestamptz,
  picked_up_via            text check (picked_up_via in ('qr','manual')),
  notes                    text,
  created_at               timestamptz not null default now(),
  unique (session_id, child_id)
);
comment on table service.kids_attendance is 'Presença de uma criança numa sessão Kids. Checkout só fecha (status=retirado) depois de picked_up_confirmed_by, o professor que comparou visualmente.';

-- ── service.kids_events (evento infantil com inscrição) ───────────────────────
create table service.kids_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  church_id        uuid not null references service.churches(id) on delete cascade,
  title            text not null,
  description      text,
  event_date       text,
  time             text,
  location         text,
  capacity         integer,
  open_enrollment  boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table service.kids_event_enrollments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  kids_event_id    uuid not null references service.kids_events(id) on delete cascade,
  child_id         uuid not null references service.children(id) on delete cascade,
  enrolled_by      uuid references service.people(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (kids_event_id, child_id)
);

-- ── Índices ─────────────────────────────────────────────────────────────────────
create index on service.kids_classes (organization_id, church_id);
create index on service.children (organization_id, church_id);
create index on service.children (class_id);
create index on service.children using gin (name gin_trgm_ops);
create index on service.child_guardians (organization_id);
create index on service.child_guardians (guardian_person_id);
create index on service.kids_sessions (organization_id);
create index on service.kids_sessions (event_id);
create index on service.kids_attendance (organization_id);
create index on service.kids_attendance (session_id);
create index on service.kids_attendance (child_id);
create index on service.kids_events (organization_id, church_id);
create index on service.kids_event_enrollments (kids_event_id);
create index on service.kids_event_enrollments (child_id);

-- ── updated_at triggers ────────────────────────────────────────────────────────
create trigger t_kids_classes_upd before update on service.kids_classes for each row execute function core.set_updated_at();
create trigger t_children_upd     before update on service.children     for each row execute function core.set_updated_at();
create trigger t_kids_events_upd  before update on service.kids_events  for each row execute function core.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────────
alter table service.kids_classes           enable row level security;
alter table service.children               enable row level security;
alter table service.child_guardians        enable row level security;
alter table service.kids_sessions          enable row level security;
alter table service.kids_attendance        enable row level security;
alter table service.kids_events            enable row level security;
alter table service.kids_event_enrollments enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'kids_classes','children','child_guardians','kids_sessions',
    'kids_attendance','kids_events','kids_event_enrollments'
  ]
  loop
    execute format(
      'create policy svc_tenant on service.%I for all to authenticated using (core.can_access(organization_id, ''service'')) with check (core.can_access(organization_id, ''service''));',
      t);
  end loop;
end $$;

-- ADMIN: estrutura da turma, mesmo nível de rooms/ministries.
select service._apply_write_roles('kids_classes', array['owner','master','pastor']);

-- LEAD: decisão de liderança (criar evento infantil, abrir sessão/QR do culto).
select service._apply_write_roles('kids_events', array['owner','master','pastor','lider']);
select service._apply_write_roles('kids_sessions', array['owner','master','pastor','lider']);

-- ABERTO (children, child_guardians, kids_attendance, kids_event_enrollments):
-- só a policy svc_tenant acima, sem restrictive de papel. Responsável cadastra
-- o próprio filho, professor (pode ser só 'vol') faz check-in/checkout e
-- cadastro de visitante na hora — mesma régua já aceita pelo projeto pra
-- event_attendance/lesson_attendance/journey_change_requests (ver 0008 linhas
-- ~70-75: o refinamento fino de "só o meu filho" fica pra UI, não RLS).

-- ── Permissão nova: service.kids ──────────────────────────────────────────────
insert into core.permissions (code, product_code, label, category) values
  ('service.kids', 'service', 'Kids', 'Pessoas')
on conflict (code) do nothing;

-- Backfill pra organizações que já existem (bootstrap só roda pra orgs novas).
insert into core.role_permissions (organization_id, role, permission_code, allowed)
select o.id, 'master', 'service.kids', true
from core.organizations o
on conflict (organization_id, role, permission_code) do nothing;

insert into core.role_permissions (organization_id, role, permission_code, allowed)
select o.id, 'pastor', 'service.kids', true
from core.organizations o
on conflict (organization_id, role, permission_code) do nothing;

insert into core.role_permissions (organization_id, role, permission_code, allowed)
select o.id, 'lider', 'service.kids', true
from core.organizations o
on conflict (organization_id, role, permission_code) do nothing;

insert into core.role_permissions (organization_id, role, permission_code, allowed)
select o.id, 'vol', 'service.kids', false
from core.organizations o
on conflict (organization_id, role, permission_code) do nothing;

-- Estende o líder pra orgs NOVAS (mesma assinatura de 0010, só acrescenta
-- 'service.kids' na lista hardcoded do papel líder).
create or replace function core.bootstrap_church_org(
  p_org_name text,
  p_city text default null,
  p_trial boolean default true
)
returns table (organization_id uuid, church_id uuid)
language plpgsql security definer set search_path = core, service, billing, public as $$
declare
  v_user_id uuid := auth.uid();
  v_created_org_id uuid;
  v_created_church_id uuid;
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
           'service.kids'
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

  return query select v_created_org_id, v_created_church_id;
end $$;

grant execute on function core.bootstrap_church_org(text, text, boolean) to authenticated;

-- ── Storage: prefixo {org}/kids/... liberado pra qualquer membro da org ───────
-- O bucket service-media (0014) só permite insert/update/delete pra
-- owner/master/pastor (foi desenhado só pra logo da igreja e foto de
-- capítulo). Foto de criança/responsável é ABERTO (mesma régua acima), então
-- entra como policy adicional (permissiva, soma por OR com a existente),
-- restrita ao prefixo /kids/ pra não afrouxar o resto do bucket.
create policy svc_media_kids_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'service-media'
    and (storage.foldername(name))[2] = 'kids'
    and core.can_access((storage.foldername(name))[1]::uuid, 'service')
  );

create policy svc_media_kids_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'service-media'
    and (storage.foldername(name))[2] = 'kids'
    and core.can_access((storage.foldername(name))[1]::uuid, 'service')
  )
  with check (
    bucket_id = 'service-media'
    and (storage.foldername(name))[2] = 'kids'
    and core.can_access((storage.foldername(name))[1]::uuid, 'service')
  );

create policy svc_media_kids_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'service-media'
    and (storage.foldername(name))[2] = 'kids'
    and core.can_access((storage.foldername(name))[1]::uuid, 'service')
  );
