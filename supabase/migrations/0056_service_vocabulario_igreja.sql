-- ═══════════════════════════════════════════════════════════════════════════
-- 0056 · Service v7 · 4.13 · vocabulário da igreja (lei 7)
--
-- Quatro termos renomeáveis: caminhada, grupo, culto, voluntario. Cada um com
-- o nome da tela (até 24 caracteres) e o nome curto da barra (até 10):
--   { "caminhada": { "tela": "Jornada", "curto": "Jornada" } }
-- Só os termos diferentes do padrão são gravados (app/service/lib/vocabulario.ts).
-- Fica na igreja matriz, igual à marca do app. A escrita segue a policy de
-- update que já existe em service.churches.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.churches
  add column if not exists vocabulario jsonb not null default '{}'::jsonb;

comment on column service.churches.vocabulario is 'Nomes que a igreja dá aos termos do Service (caminhada, grupo, culto, voluntario): {tela (até 24), curto (até 10)}. Lido da matriz.';
