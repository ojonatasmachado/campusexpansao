---
id: O6
titulo: Testar Kids com famílias reais e Financeiro com volume
tipo: verificacao
status: reservada
quem: codex
desde: 2026-10-25
branch: historia/O6-financeiro-volume
depende: []
tamanho: M
---

## Por quê
O Kids ainda não foi testado com famílias reais, e o Financeiro ainda não foi testado com dados volumosos e saldos.
Fonte: AUDITORIA-UI-2026-10-20.md "Limites".

## Arquivos (trilho)
- `docs/service-v7/historias/O6-kids-familias-financeiro-volume.md`

- `scripts/check-local-financeiro-volume.ts`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/O7-kids-familias-reais.md`
- `docs/service-v7/historias/F1-financeiro-fases-3-4.md`

- `docs/service-v7/historias/I3-revisao-ui-telas-parciais.md`

## Pronto quando
- Kids testado com famílias reais.
- Financeiro testado com dados volumosos e saldos.

## Notas
ABERTO. Trilho a definir na reserva.

25/10: O5 publicada pelo PR26, SHA 282064c, produção concluída. Reserva O6 para verificar Financeiro com milhares de lançamentos em banco/navegador descartáveis, sem editar modules/financeiro/ reservado pela I10. A prova com famílias reais não pode ser substituída por fixtures: será mantida explicitamente como pendência própria. Usuário autorizou publicar o possível e deixar o que depende do Claude documentado; reservado também o registro do impedimento da F1, sem implementá-la ou reservar seus arquivos.

Trilho documental ampliado apenas para registrar na I3 a observação da lista de previstos com volume, sem editar tela ou assumir I3/I10.
