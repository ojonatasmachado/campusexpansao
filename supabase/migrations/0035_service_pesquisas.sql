-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0035 · SERVICE — PESQUISAS DA IGREJA (pulso pós-escala e afins)
-- Aditiva: só cria tabela/policy nova, não altera nada existente.
--
-- Não confundir com service.enquetes/cex.enquetes (0031/0032): aquelas são
-- cross-tenant, criadas pela CE.X no /admin central, pra saber como está a
-- experiência de usar os PRODUTOS da CE.X (Service, site de materiais).
--
-- service.pesquisas é outra coisa: CADA IGREJA pesquisando a PRÓPRIA
-- congregação/voluntariado (ex.: pulso pós-escala). Por isso carrega
-- organization_id na própria pesquisa (não só na resposta) e tem RLS de
-- escrita real pra quem é dono da igreja — master, pastor e líder (não
-- vol) via core.has_role, mesma régua de core.role_permissions no
-- bootstrap. Gerido dentro do próprio Service (Configurações → Pesquisas),
-- nunca no /admin da CE.X.
--
-- Recorrência por escala: uma pesquisa 'posescala' pode ter
-- recorrente_por_escala=true, aí a mesma pessoa pode responder de novo a
-- cada escala nova que servir (pesquisas_respostas.event_id amarra a
-- resposta numa escala específica). Sem isso, unique(pesquisa_id,
-- person_id) trava resposta única pra sempre, igual campanha pontual.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── service.pesquisas ───────────────────────────────────────────────────────
create table service.pesquisas (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references core.organizations(id) on delete cascade,
  nome                   text not null,
  status                 text not null default 'ativa' check (status in ('ativa','pausada','encerrada')),
  segmentacao_modo       text not null default 'todos' check (segmentacao_modo in ('todos','papel','time')),
  segmentacao_valores    text[] not null default '{}',
  disparo_modo           text not null default 'posescala' check (disparo_modo in ('livre','periodica','posescala','campanha')),
  ativo_como_livre       boolean not null default false,
  intervalo_dias         integer,
  recorrente_por_escala  boolean not null default false,
  emitida_em             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
comment on table service.pesquisas is 'Pesquisa da própria igreja pra própria congregação/voluntariado (ex.: pulso pós-escala). Tenant-scoped, dono é a igreja. Não confundir com service.enquetes (cross-tenant, dono é a CE.X).';
comment on column service.pesquisas.recorrente_por_escala is 'Só relevante quando disparo_modo=posescala. true = a pessoa pode responder de novo a cada escala nova (respostas amarradas em event_id); false = responde uma vez só, igual campanha.';

-- ── service.pesquisas_perguntas ────────────────────────────────────────────
create table service.pesquisas_perguntas (
  id           uuid primary key default gen_random_uuid(),
  pesquisa_id  uuid not null references service.pesquisas(id) on delete cascade,
  ordem        integer not null default 0,
  tipo         text not null check (tipo in ('nota','texto','emoji','multipla','simnao')),
  texto        text not null default '',
  obrigatoria  boolean not null default true,
  escala       integer check (escala in (5,10)),
  opcoes       text[],
  created_at   timestamptz not null default now()
);

-- ── service.pesquisas_respostas ────────────────────────────────────────────
create table service.pesquisas_respostas (
  id                uuid primary key default gen_random_uuid(),
  pesquisa_id       uuid not null references service.pesquisas(id) on delete cascade,
  organization_id   uuid not null references core.organizations(id) on delete cascade,
  person_id         uuid not null references service.people(id) on delete cascade,
  papel             text not null default '',
  event_id          uuid references service.events(id) on delete set null,
  data              date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table service.pesquisas_respostas is 'Uma resposta = uma pessoa respondeu a pesquisa inteira. event_id preenchido só quando a pesquisa é recorrente_por_escala (amarra a resposta numa escala específica); nulo pras demais (resposta única pra sempre).';

-- unique(pesquisa_id,person_id) só quando NÃO é por escala; unique(pesquisa_id,person_id,event_id) quando é.
create unique index pesquisas_respostas_unica_geral on service.pesquisas_respostas (pesquisa_id, person_id) where event_id is null;
create unique index pesquisas_respostas_unica_por_escala on service.pesquisas_respostas (pesquisa_id, person_id, event_id) where event_id is not null;

-- ── service.pesquisas_respostas_perguntas ──────────────────────────────────
create table service.pesquisas_respostas_perguntas (
  id               uuid primary key default gen_random_uuid(),
  resposta_id      uuid not null references service.pesquisas_respostas(id) on delete cascade,
  pergunta_id      uuid not null references service.pesquisas_perguntas(id) on delete cascade,
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  valor            text not null,
  unique (resposta_id, pergunta_id)
);

-- ── Índices ─────────────────────────────────────────────────────────────────
create index on service.pesquisas (organization_id);
create index on service.pesquisas_perguntas (pesquisa_id);
create index on service.pesquisas_respostas (organization_id);
create index on service.pesquisas_respostas (person_id);
create index on service.pesquisas_respostas (pesquisa_id);
create index on service.pesquisas_respostas_perguntas (resposta_id);
create index on service.pesquisas_respostas_perguntas (pergunta_id);
create index on service.pesquisas_respostas_perguntas (organization_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
create trigger t_pesquisas_upd before update on service.pesquisas for each row execute function core.set_updated_at();
create trigger t_pesquisas_respostas_upd before update on service.pesquisas_respostas for each row execute function core.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table service.pesquisas                    enable row level security;
alter table service.pesquisas_perguntas          enable row level security;
alter table service.pesquisas_respostas          enable row level security;
alter table service.pesquisas_respostas_perguntas enable row level security;

-- pesquisas/perguntas: qualquer membro da igreja lê; só master/pastor/líder
-- escrevem (criar, editar, disparar campanha, mudar status) — vol não.
create policy svc_pesquisas_read on service.pesquisas
  for select to authenticated
  using (core.can_access(organization_id, 'service'));
create policy svc_pesquisas_write on service.pesquisas
  for insert to authenticated
  with check (core.has_role(organization_id, 'owner','master','pastor','lider'));
create policy svc_pesquisas_update on service.pesquisas
  for update to authenticated
  using (core.has_role(organization_id, 'owner','master','pastor','lider'))
  with check (core.has_role(organization_id, 'owner','master','pastor','lider'));
create policy svc_pesquisas_delete on service.pesquisas
  for delete to authenticated
  using (core.has_role(organization_id, 'owner','master','pastor','lider'));

create policy svc_pesquisas_perguntas_read on service.pesquisas_perguntas
  for select to authenticated
  using (pesquisa_id in (select id from service.pesquisas where core.can_access(organization_id, 'service')));
create policy svc_pesquisas_perguntas_write on service.pesquisas_perguntas
  for all to authenticated
  using (pesquisa_id in (select id from service.pesquisas where core.has_role(organization_id, 'owner','master','pastor','lider')))
  with check (pesquisa_id in (select id from service.pesquisas where core.has_role(organization_id, 'owner','master','pastor','lider')));

-- respostas/respostas_perguntas: qualquer pessoa da igreja grava/edita a
-- PRÓPRIA resposta (inclusive vol, é quem mais responde); master/pastor/
-- líder também leem as respostas de todo mundo, pra ver resultado.
create policy svc_pesquisas_respostas_select on service.pesquisas_respostas
  for select to authenticated
  using (
    core.can_access(organization_id, 'service')
    and (
      person_id in (select id from service.people where user_id = auth.uid())
      or core.has_role(organization_id, 'owner','master','pastor','lider')
    )
  );
create policy svc_pesquisas_respostas_write on service.pesquisas_respostas
  for insert to authenticated
  with check (
    core.can_access(organization_id, 'service')
    and person_id in (select id from service.people where user_id = auth.uid())
  );
create policy svc_pesquisas_respostas_update on service.pesquisas_respostas
  for update to authenticated
  using (person_id in (select id from service.people where user_id = auth.uid()))
  with check (person_id in (select id from service.people where user_id = auth.uid()));

create policy svc_pesquisas_respostas_perguntas_select on service.pesquisas_respostas_perguntas
  for select to authenticated
  using (
    resposta_id in (
      select id from service.pesquisas_respostas
      where person_id in (select id from service.people where user_id = auth.uid())
         or core.has_role(organization_id, 'owner','master','pastor','lider')
    )
  );
create policy svc_pesquisas_respostas_perguntas_write on service.pesquisas_respostas_perguntas
  for all to authenticated
  using (resposta_id in (select id from service.pesquisas_respostas where person_id in (select id from service.people where user_id = auth.uid())))
  with check (resposta_id in (select id from service.pesquisas_respostas where person_id in (select id from service.people where user_id = auth.uid())));

grant select, insert, update, delete on all tables in schema service to service_role;
