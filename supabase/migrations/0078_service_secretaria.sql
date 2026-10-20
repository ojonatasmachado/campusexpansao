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
