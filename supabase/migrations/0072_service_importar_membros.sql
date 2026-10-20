-- ═══════════════════════════════════════════════════════════════════════════
-- 0072 · Service v7 · jornada "Importar membros por planilha"
--
-- A importação grava nas mesmas tabelas do cadastro manual (service.members
-- e service.timeline_events), em lotes, pelo painel. Esta migração só abre
-- espaço para o que a planilha traz e a ficha ainda não guardava:
--
--   sex             masculino | feminino (nulo = não informado)
--   marital_status  solteiro | casado | uniao_estavel | divorciado | separado | viuvo
--   imported_at     quando a ficha entrou por planilha. Serve para a lista
--                   não marcar como "Novo" quem já era da igreja e só foi
--                   importado agora (app/service/lib/pessoas.ts, ehNovo).
--
-- O fato "importado" na linha do tempo usa a service.timeline_events como
-- está (event_type é texto livre; o catálogo fica em app/service/lib/historico.ts).
-- Sem mudança de RLS: quem pode cadastrar membro pode importar.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.members
  add column if not exists sex            text,
  add column if not exists marital_status text,
  add column if not exists imported_at    timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_sex_check') then
    alter table service.members add constraint members_sex_check
      check (sex is null or sex in ('masculino','feminino'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'members_marital_status_check') then
    alter table service.members add constraint members_marital_status_check
      check (marital_status is null or marital_status in ('solteiro','casado','uniao_estavel','divorciado','separado','viuvo'));
  end if;
end $$;

comment on column service.members.sex is 'Sexo informado (masculino, feminino). Nulo = não informado.';
comment on column service.members.marital_status is 'Estado civil: solteiro, casado, uniao_estavel, divorciado, separado, viuvo.';
comment on column service.members.imported_at is 'Quando a ficha entrou pela importação de planilha. Nulo = cadastro manual ou pelo app.';

