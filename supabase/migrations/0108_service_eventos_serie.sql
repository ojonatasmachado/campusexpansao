-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0108 · O10 · CULTO OU EVENTO QUE SE REPETE
-- Cada encontro continua sendo uma linha de service.events (escala, presença e
-- confirmações seguem por event_id). A série só junta as linhas:
--   series_id   mesmo valor em todos os encontros criados juntos
--   series_rule como se repete (semanal, quinzenal, mensal)
-- Encontro editado sozinho continua na série (mostra que pertence a ela).
-- Só acrescenta: versões antigas do app seguem lendo e gravando sem estas colunas.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.events add column if not exists series_id uuid;
alter table service.events add column if not exists series_rule text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_series_rule_check') then
    alter table service.events add constraint events_series_rule_check
      check (series_rule is null or series_rule in ('semanal', 'quinzenal', 'mensal'));
  end if;
end $$;

create index if not exists events_series_idx on service.events (organization_id, series_id, event_date)
  where series_id is not null;
