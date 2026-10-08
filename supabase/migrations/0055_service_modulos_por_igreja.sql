-- ═══════════════════════════════════════════════════════════════════════════
-- 0055 · Service v7 · 4.1 · módulos ligados por igreja
--
-- O registro de módulos (app/service/modules/registry.ts) liga cada módulo pelo
-- padrão do seu manifesto (`liga`). A igreja só guarda as exceções:
--   modules_on  = módulos que o manifesto deixa desligados e a igreja ligou
--   modules_off = módulos que o manifesto liga e a igreja desligou
-- Assim um módulo novo entra ligado (ou não) pelo próprio manifesto, sem
-- precisar atualizar toda igreja. Mesmo desenho de ministries.app_modules
-- (0043): text[] com default vazio. Módulos essenciais (casca) ignoram o off.
-- A escrita segue a policy de update que já existe em service.churches.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.churches
  add column if not exists modules_on text[] not null default '{}',
  add column if not exists modules_off text[] not null default '{}';

comment on column service.churches.modules_on is 'Módulos do Service ligados nesta igreja além do padrão do manifesto (registry.ts).';
comment on column service.churches.modules_off is 'Módulos do Service desligados nesta igreja (o padrão do manifesto era ligado).';
