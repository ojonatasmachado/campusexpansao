-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0007 · SEED de referência (só Service)
-- Dados NÃO transacionais que o app assume existir: o produto 'service', um plano
-- base e o catálogo de permissões (ações do MATRIZ_V2). Organizações, igrejas,
-- pessoas e a matriz papel→ação de cada org são criadas no cadastro, não aqui.
-- Idempotente (on conflict do nothing) — pode rodar de novo sem duplicar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Produto ──────────────────────────────────────────────────────────────────
insert into core.products (code, name) values
  ('service', 'CE.X Service')
on conflict (code) do nothing;

-- ── Plano base do Service ─────────────────────────────────────────────────────
insert into billing.plans (code, product_code, name, price_cents, currency, interval, active) values
  ('service_church', 'service', 'Service · Igreja', 0, 'BRL', 'month', true)
on conflict (code) do nothing;

-- ── Catálogo de permissões (ações do app do Service = ACOES_V2 do protótipo) ──
-- code = 'service.<acao>'. A matriz papel→ação (core.role_permissions) é semeada
-- POR ORGANIZAÇÃO no cadastro; aqui só registramos as ações liberáveis.
insert into core.permissions (code, product_code, label, category) values
  ('service.painel',      'service', 'Painel & relatórios',   'Visão'),
  ('service.membros',     'service', 'Membros',               'Pessoas'),
  ('service.voluntarios', 'service', 'Voluntários',           'Pessoas'),
  ('service.times',       'service', 'Times & ministérios',   'Pessoas'),
  ('service.visitantes',  'service', 'Visitantes',            'Pessoas'),
  ('service.decisoes',    'service', 'Decisões',              'Jornada'),
  ('service.batismos',    'service', 'Batismos',              'Jornada'),
  ('service.cursos',      'service', 'Cursos & trilhas',      'Jornada'),
  ('service.escala',      'service', 'Escalas',               'Operação'),
  ('service.cultos',      'service', 'Cultos & eventos',      'Operação'),
  ('service.comunica',    'service', 'Comunicação & push',    'Operação'),
  ('service.identidade',  'service', 'Identidade & ciclos',   'Igreja'),
  ('service.historia',    'service', 'Nossa história',        'Igreja'),
  ('service.igreja',      'service', 'Dados da igreja',       'Gestão'),
  ('service.permissoes',  'service', 'Papéis & permissões',   'Gestão'),
  ('service.rede',        'service', 'Rede (multi-igreja)',   'Gestão')
on conflict (code) do nothing;

-- ── Modelo de bootstrap de uma org nova (referência para a Edge Function) ──────
-- Ao criar uma organização de igreja, o backend deve:
--   1. inserir core.organizations (kind='church', owner_id = quem criou);
--   2. inserir core.memberships (owner_id, role='master', status='active');
--   3. inserir core.product_access (product='service', active=true)  [ou via billing];
--   4. semear core.role_permissions a partir da MATRIZ_V2:
--        master → todas as ações = true
--        pastor → todas = true, exceto 'service.rede'
--        lider  → painel, voluntarios, times, decisoes, escala, cultos, comunica
--        vol    → nenhuma (acesso via app do membro, fora da matriz)
--   5. inserir service.churches (is_headquarters=true) — a matriz.
-- Deixe esse fluxo numa função (ex.: core.bootstrap_church_org) chamada no signup.
