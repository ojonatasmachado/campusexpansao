-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0031 · SERVICE — AVALIAÇÃO DE EXPERIÊNCIA (ENQUETES)
-- Aditiva: só cria tabela/policy nova, não altera nada existente.
--
-- Diferente do resto do Service, `enquetes`/`perguntas` NÃO carregam
-- organization_id: quem cria é a CE.X (admin central, cross-tenant — ver
-- HANDOFF Avaliação de Experiência §9, "admin dentro do Service" foi decidido
-- como o /admin interno da CE.X, mesmo dono de "Operação Service"), e a
-- enquete vale pra qualquer igreja cliente. Só `service_role` escreve nelas
-- (bypassa RLS); `authenticated` só lê.
--
-- `respostas`/`respostas_perguntas`/`enquete_visto` já são "linha de negócio"
-- normal do Service (quem respondeu, de qual organização) e seguem o padrão
-- svc_tenant de sempre, com o with check adicional de "só a própria pessoa"
-- (mesma régua adotada pra event_attendance/kids_attendance em 0008/0017,
-- só que aqui vale a pena travar no banco por ser resposta identificada).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── service.enquetes ───────────────────────────────────────────────────────
create table service.enquetes (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  status              text not null default 'ativa' check (status in ('ativa','pausada','encerrada')),
  segmentacao_modo    text not null default 'todos' check (segmentacao_modo in ('todos','papel','time','lista')),
  segmentacao_valores text[] not null default '{}',
  disparo_modo        text not null default 'livre' check (disparo_modo in ('livre','periodica','posescala','campanha')),
  ativo_como_livre    boolean not null default false,
  intervalo_dias      integer,
  horas_depois        integer,
  emitida_em          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table service.enquetes is 'Enquete/pulso do Service. Cross-tenant: criada pelo admin central da CE.X, vale pra qualquer igreja cliente. Ver HANDOFF Avaliação de Experiência.';

-- ── service.perguntas ──────────────────────────────────────────────────────
create table service.perguntas (
  id          uuid primary key default gen_random_uuid(),
  enquete_id  uuid not null references service.enquetes(id) on delete cascade,
  ordem       integer not null default 0,
  tipo        text not null check (tipo in ('nota','texto','emoji','multipla','simnao')),
  texto       text not null default '',
  escala      integer check (escala in (5,10)),
  opcoes      text[],
  created_at  timestamptz not null default now()
);

-- ── service.respostas ──────────────────────────────────────────────────────
create table service.respostas (
  id                uuid primary key default gen_random_uuid(),
  enquete_id        uuid not null references service.enquetes(id) on delete cascade,
  organization_id   uuid not null references core.organizations(id) on delete cascade,
  person_id         uuid not null references service.people(id) on delete cascade,
  papel             text not null,
  times_acessados   text[] not null default '{}',
  data              date not null default current_date,
  created_at        timestamptz not null default now(),
  unique (enquete_id, person_id)
);
comment on table service.respostas is 'Uma resposta = uma pessoa respondeu uma enquete inteira (todas as perguntas). unique(enquete_id,person_id): não responde a mesma enquete duas vezes.';

-- ── service.respostas_perguntas ────────────────────────────────────────────
create table service.respostas_perguntas (
  id                uuid primary key default gen_random_uuid(),
  resposta_id       uuid not null references service.respostas(id) on delete cascade,
  pergunta_id       uuid not null references service.perguntas(id) on delete cascade,
  organization_id   uuid not null references core.organizations(id) on delete cascade,
  valor             text not null,
  unique (resposta_id, pergunta_id)
);

-- ── service.enquete_visto (campanha/periódica: não repetir popup) ─────────
create table service.enquete_visto (
  enquete_id        uuid not null references service.enquetes(id) on delete cascade,
  person_id         uuid not null references service.people(id) on delete cascade,
  organization_id   uuid not null references core.organizations(id) on delete cascade,
  visto_em          timestamptz not null default now(),
  primary key (enquete_id, person_id)
);

-- ── Índices ─────────────────────────────────────────────────────────────────
create index on service.perguntas (enquete_id);
create index on service.respostas (enquete_id);
create index on service.respostas (organization_id);
create index on service.respostas (person_id);
create index on service.respostas_perguntas (resposta_id);
create index on service.respostas_perguntas (pergunta_id);
create index on service.respostas_perguntas (organization_id);
create index on service.enquete_visto (organization_id);
create index on service.enquete_visto (person_id);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create trigger t_enquetes_upd before update on service.enquetes for each row execute function core.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table service.enquetes            enable row level security;
alter table service.perguntas           enable row level security;
alter table service.respostas           enable row level security;
alter table service.respostas_perguntas enable row level security;
alter table service.enquete_visto       enable row level security;

-- enquetes/perguntas: globais (sem organization_id) — qualquer membro
-- autenticado do Service lê; só service_role escreve (admin central da CE.X
-- usa supabaseAdmin(), que bypassa RLS). Nenhuma policy de insert/update/
-- delete pra authenticated = escrita bloqueada por padrão.
create policy svc_enquetes_select on service.enquetes
  for select to authenticated
  using (true);

create policy svc_perguntas_select on service.perguntas
  for select to authenticated
  using (true);

-- respostas / respostas_perguntas / enquete_visto: svc_tenant padrão + só a
-- própria pessoa pode gravar sua resposta.
create policy svc_tenant on service.respostas
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (
    core.can_access(organization_id, 'service')
    and person_id in (select id from service.people where user_id = auth.uid())
  );

create policy svc_tenant on service.respostas_perguntas
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (
    core.can_access(organization_id, 'service')
    and resposta_id in (select id from service.respostas where person_id in (select id from service.people where user_id = auth.uid()))
  );

create policy svc_tenant on service.enquete_visto
  for all to authenticated
  using (core.can_access(organization_id, 'service'))
  with check (
    core.can_access(organization_id, 'service')
    and person_id in (select id from service.people where user_id = auth.uid())
  );
