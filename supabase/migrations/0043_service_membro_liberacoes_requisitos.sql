-- CE.X Service · 0043 · Papel membro, liberações manuais, requisitos e aceite
--
-- Idempotente: pode rodar de novo se uma execução anterior parou no meio.
--
-- Fase 2 do novo modelo de acesso (ver memória "service_access_model_decisions"):
--   1. papel base passa a ser 'membro'. 'vol' é extinto: ser voluntário é
--      consequência de estar em um time (service.person_ministries), não papel.
--   2. service.person_grants: liberação manual de uma tela/módulo pra uma
--      pessoa, concedida por quem tem autoridade. Substitui
--      people.meta.extraAccess e churches.settings.acessoDelegados.
--   3. ministries.app_modules: módulos extras que os membros do time veem no
--      app (visitantes, kids). Recepção e Kids viram times normais; o app para
--      de adivinhar pelo nome do time.
--   4. service.requirements: requisitos que a PRÓPRIA igreja define pra se
--      inscrever num curso, entrar num time ou pedir pra servir. Requisito pode
--      ser etapa da jornada, curso concluído ou presença em evento (check-in).
--      Substitui courses.prereqs (migrado aqui; coluna fica até a Fase 4).
--   5. aceite de convite: conta que já existia entra na igreja como 'invited'
--      e só vira 'active' quando a pessoa aceita (core.accept_membership).

-- ── 1. papel membro ───────────────────────────────────────────────────────────
alter table core.memberships drop constraint if exists memberships_role_check;
update core.memberships set role = 'membro' where role = 'vol';
alter table core.memberships
  add constraint memberships_role_check
  check (role in ('owner','master','pastor','lider','membro','cex_admin','cex_editor','viewer'));
alter table core.memberships alter column role set default 'membro';

update core.role_permissions rp set role = 'membro'
where rp.role = 'vol'
  and not exists (
    select 1 from core.role_permissions x
    where x.organization_id = rp.organization_id and x.role = 'membro' and x.permission_code = rp.permission_code
  );
delete from core.role_permissions where role = 'vol';

-- ── 2. liberações manuais ─────────────────────────────────────────────────────
-- grant_code = id de tela do painel (ex: 'membros', 'visitantes', 'marca'),
-- módulo do app (ex: 'app.kids') ou 'acessos.delegar' (pode liberar pra outros).
create table if not exists service.person_grants (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  grant_code       text not null,
  granted_by       uuid references service.people(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (person_id, grant_code)
);
comment on table service.person_grants is 'Liberação manual de tela/módulo pra uma pessoa, dada por quem tem autoridade.';
create index if not exists person_grants_org_idx on service.person_grants (organization_id);

-- quem pode liberar: master/pastor, ou quem recebeu 'acessos.delegar'
create or replace function service.can_manage_grants(p_org uuid)
returns boolean
language sql stable security definer set search_path = core, service, public as $$
  select core.has_role(p_org, 'owner', 'master', 'pastor')
      or exists (
        select 1 from service.person_grants g
        join service.people p on p.id = g.person_id
        where g.organization_id = p_org
          and g.grant_code = 'acessos.delegar'
          and p.user_id = auth.uid()
      )
$$;

alter table service.person_grants enable row level security;

drop policy if exists svc_tenant on service.person_grants;
create policy svc_tenant on service.person_grants
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));

-- só master/pastor/delegado liberam; delegar a outros só master/owner
drop policy if exists pg_write_ins on service.person_grants;
create policy pg_write_ins on service.person_grants
  as restrictive for insert to authenticated
  with check (
    service.can_manage_grants(organization_id)
    and (grant_code <> 'acessos.delegar' or core.has_role(organization_id, 'owner', 'master'))
  );
drop policy if exists pg_write_del on service.person_grants;
create policy pg_write_del on service.person_grants
  as restrictive for delete to authenticated
  using (
    service.can_manage_grants(organization_id)
    and (grant_code <> 'acessos.delegar' or core.has_role(organization_id, 'owner', 'master'))
  );
-- leitura: cada um vê as próprias liberações; quem gerencia vê todas
drop policy if exists pg_read on service.person_grants;
create policy pg_read on service.person_grants
  as restrictive for select to authenticated
  using (
    service.can_manage_grants(organization_id)
    or person_id in (select p.id from service.people p where p.user_id = auth.uid())
  );
drop policy if exists pg_no_update on service.person_grants;
create policy pg_no_update on service.person_grants
  as restrictive for update to authenticated
  using (false);

grant select, insert, delete on service.person_grants to authenticated;

-- migra people.meta.extraAccess
insert into service.person_grants (organization_id, person_id, grant_code)
select p.organization_id, p.id, x.code
from service.people p
cross join lateral jsonb_array_elements_text(coalesce(p.meta->'extraAccess', '[]'::jsonb)) as x(code)
on conflict (person_id, grant_code) do nothing;

-- migra churches.settings.acessoDelegados
insert into service.person_grants (organization_id, person_id, grant_code)
select c.organization_id, p.id, 'acessos.delegar'
from service.churches c
cross join lateral jsonb_array_elements_text(coalesce(c.settings->'acessoDelegados', '[]'::jsonb)) as d(person_id)
join service.people p on p.id::text = d.person_id and p.organization_id = c.organization_id
on conflict (person_id, grant_code) do nothing;

update service.people set meta = meta - 'extraAccess' where meta ? 'extraAccess';
update service.churches set settings = settings - 'acessoDelegados' where settings ? 'acessoDelegados';

-- ── 3. módulos do time no app ─────────────────────────────────────────────────
alter table service.ministries
  add column if not exists app_modules text[] not null default '{}'
  check (app_modules <@ array['visitantes','kids']::text[]);
comment on column service.ministries.app_modules is 'Módulos extras que os membros do time veem no app (visitantes, kids).';

-- backfill a partir da regra antiga (nome do time), só pra não perder o que já funcionava
update service.ministries set app_modules = array_append(app_modules, 'visitantes')
where name ~* 'recep' and not ('visitantes' = any(app_modules));
update service.ministries set app_modules = array_append(app_modules, 'kids')
where name ~* '(kids|infantil)' and not ('kids' = any(app_modules));

-- ── 4. requisitos definidos pela igreja ───────────────────────────────────────
-- target: o que exige (curso, time, ou o "Quero servir" da igreja).
-- req: o que é exigido. req_ref = chave da etapa da jornada
-- (decisao|batismo|curso|integracao|time), ou id do curso/evento.
-- Vários requisitos no mesmo alvo somam (precisa cumprir todos).
create table if not exists service.requirements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  target_kind      text not null check (target_kind in ('course','ministry','serve')),
  target_id        uuid,
  req_kind         text not null check (req_kind in ('journey','course','event')),
  req_ref          text not null,
  created_at       timestamptz not null default now(),
  check ((target_kind = 'serve') = (target_id is null)),
  check (req_kind <> 'journey' or req_ref in ('decisao','batismo','curso','integracao','time'))
);
comment on table service.requirements is 'Pré-requisitos definidos pela igreja pra curso, time ou "Quero servir".';
create unique index if not exists requirements_uniq
  on service.requirements (organization_id, target_kind, coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid), req_kind, req_ref);
create index if not exists requirements_target_idx on service.requirements (organization_id, target_kind, target_id);

alter table service.requirements enable row level security;

drop policy if exists svc_tenant on service.requirements;
create policy svc_tenant on service.requirements
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));

-- escrita só líder+ (mesma régua da camada de liderança da 0008, escrita
-- direto aqui: o helper service._apply_write_roles pode não existir no banco)
drop policy if exists svc_w_ins on service.requirements;
create policy svc_w_ins on service.requirements as restrictive for insert to authenticated
  with check (core.has_role(organization_id, 'owner', 'master', 'pastor', 'lider'));
drop policy if exists svc_w_upd on service.requirements;
create policy svc_w_upd on service.requirements as restrictive for update to authenticated
  using (core.has_role(organization_id, 'owner', 'master', 'pastor', 'lider'))
  with check (core.has_role(organization_id, 'owner', 'master', 'pastor', 'lider'));
drop policy if exists svc_w_del on service.requirements;
create policy svc_w_del on service.requirements as restrictive for delete to authenticated
  using (core.has_role(organization_id, 'owner', 'master', 'pastor', 'lider'));

grant select, insert, update, delete on service.requirements to authenticated;

-- troca o conjunto de requisitos de um alvo numa transação só (apagar e
-- gravar juntos: se falhar, nada muda). security invoker: vale o RLS acima.
create or replace function service.set_requirements(p_org uuid, p_target_kind text, p_target_id uuid, p_reqs jsonb)
returns void
language plpgsql security invoker set search_path = service, public as $$
begin
  delete from service.requirements
  where organization_id = p_org
    and target_kind = p_target_kind
    and target_id is not distinct from p_target_id;

  insert into service.requirements (organization_id, target_kind, target_id, req_kind, req_ref)
  select p_org, p_target_kind, p_target_id, r->>'kind', r->>'ref'
  from jsonb_array_elements(coalesce(p_reqs, '[]'::jsonb)) as r;
end $$;

grant execute on function service.set_requirements(uuid, text, uuid, jsonb) to authenticated;

-- migra courses.prereqs
insert into service.requirements (organization_id, target_kind, target_id, req_kind, req_ref)
select c.organization_id, 'course', c.id, 'course', pre::text
from service.courses c
cross join lateral unnest(c.prereqs) as pre
where exists (select 1 from service.courses x where x.id = pre)
on conflict do nothing;

-- migra ministries.profile.preRequisitos (ids de curso guardados no jsonb do time)
insert into service.requirements (organization_id, target_kind, target_id, req_kind, req_ref)
select mi.organization_id, 'ministry', mi.id, 'course', pre.course_id
from service.ministries mi
cross join lateral jsonb_array_elements_text(coalesce(mi.profile->'preRequisitos', '[]'::jsonb)) as pre(course_id)
where exists (select 1 from service.courses x where x.id::text = pre.course_id)
on conflict do nothing;
update service.ministries set profile = profile - 'preRequisitos' where profile ? 'preRequisitos';

-- Requisitos que um membro ainda NÃO cumpre pra um alvo. Vazio = liberado.
-- Fonte única: o app lê daqui (Fase 4) e o RLS usa (Fase 3).
create or replace function service.missing_requirements(p_member uuid, p_target_kind text, p_target_id uuid)
returns setof service.requirements
language sql stable security definer set search_path = service, public as $$
  select r.*
  from service.requirements r
  join service.members m on m.id = p_member and m.organization_id = r.organization_id
  where core.can_access(r.organization_id, 'service')
    and r.target_kind = p_target_kind
    and r.target_id is not distinct from p_target_id
    and not (
      case r.req_kind
        when 'journey' then coalesce((
          m.journey ->> (array_position(array['decisao','batismo','curso','integracao','time'], r.req_ref) - 1)
        )::int, 0) = 1
        when 'course' then exists (
          select 1 from service.enrollments e
          where e.member_id = m.id and e.course_id::text = r.req_ref and e.status = 'concluido'
        )
        when 'event' then m.volunteer_id is not null and exists (
          select 1 from service.event_attendance a
          where a.person_id = m.volunteer_id and a.event_id::text = r.req_ref
        )
        else false
      end
    )
$$;

grant execute on function service.missing_requirements(uuid, text, uuid) to authenticated;

-- ── 5. aceite de convite ──────────────────────────────────────────────────────
-- convites pendentes do usuário logado (membership 'invited' ainda não enxerga
-- a org pelo RLS, por isso security definer)
create or replace function core.my_pending_invites()
returns table (organization_id uuid, church_name text)
language sql stable security definer set search_path = core, service, public as $$
  select m.organization_id,
         coalesce((select c.name from service.churches c
                   where c.organization_id = m.organization_id
                   order by c.is_headquarters desc, c.created_at limit 1), o.name)
  from core.memberships m
  join core.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid() and m.status = 'invited'
$$;

create or replace function core.accept_membership(p_org uuid)
returns boolean
language plpgsql security definer set search_path = core, public as $$
begin
  update core.memberships set status = 'active', updated_at = now()
  where user_id = auth.uid() and organization_id = p_org and status = 'invited';
  return found;
end $$;

-- recusar: apaga só o convite pendente do próprio usuário
create or replace function core.decline_membership(p_org uuid)
returns boolean
language plpgsql security definer set search_path = core, public as $$
begin
  delete from core.memberships
  where user_id = auth.uid() and organization_id = p_org and status = 'invited';
  return found;
end $$;

grant execute on function core.my_pending_invites() to authenticated;
grant execute on function core.decline_membership(uuid) to authenticated;
grant execute on function core.accept_membership(uuid) to authenticated;

-- ── bootstrap: papel base 'membro' no lugar de 'vol' ──────────────────────────
-- (mesmo corpo da 0027, só troca 'vol' por 'membro' na matriz)
create or replace function core.bootstrap_church_org_v2(
  p_org_name    text,
  p_cnpj        text,
  p_email       text default null,
  p_phone       text default null,
  p_city        text default null,
  p_address     text default null,
  p_postal_code text default null,
  p_trial       boolean default true
)
returns table (organization_id uuid, church_id uuid)
language plpgsql security definer set search_path = core, service, billing, public as $$
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
           'service.comunica'
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

  select id into v_plan_id from billing.plans where code = 'service_church';

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
end $$;

grant execute on function core.bootstrap_church_org_v2(text, text, text, text, text, text, text, boolean) to authenticated;
