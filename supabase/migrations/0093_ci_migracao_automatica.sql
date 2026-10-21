-- Marco da migração automática (docs/service-v7/MIGRACOES.md): a primeira
-- migração aplicada em produção pelo workflow Produção, sem SQL Editor.
-- Inofensiva: só troca o comentário do schema.
comment on schema service is 'Produto Service (gestão de igrejas). Não mistura campos do CE.X. Migrações aplicadas pelo workflow Produção.';
