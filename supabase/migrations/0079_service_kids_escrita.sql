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
