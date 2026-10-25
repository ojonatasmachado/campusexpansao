---
id: O6
titulo: Verificar Financeiro com volume e saldos
tipo: verificacao
status: feita
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
- Financeiro com milhares de lançamentos em banco real descartável: saldos, paginação, CSV, fechamento e isolamento verificados.
- Parte original de Kids com famílias reais preservada explicitamente na O7, sem alegar que fixtures validam participantes reais.

## Notas
ABERTO. Trilho a definir na reserva.

25/10: O5 publicada pelo PR26, SHA 282064c, produção concluída. Reserva O6 para verificar Financeiro com milhares de lançamentos em banco/navegador descartáveis, sem editar modules/financeiro/ reservado pela I10. A prova com famílias reais não pode ser substituída por fixtures: será mantida explicitamente como pendência própria. Usuário autorizou publicar o possível e deixar o que depende do Claude documentado; reservado também o registro do impedimento da F1, sem implementá-la ou reservar seus arquivos.

Trilho documental ampliado apenas para registrar na I3 a observação da lista de previstos com volume, sem editar tela ou assumir I3/I10.


25/10, entrega verificada: 16 grupos passaram no projeto cex-rls-19387a288136, descartado. Foram 6.018 lançamentos sintéticos em dois meses, três contas (com negativos), dois fundos e previstos. RPCs de contas/fundos conferidas independentemente em centavos; membro sem permissão e outra igreja receberam zero dados. Na interface real, os 5.013 registros do mês vieram em seis páginas [1000,1000,1000,1000,1000,13], sem perda/duplicação. Indicadores e saldos por conta/fundo conferiram, com previstos excluídos do realizado. CSV baixado pela interface preservou todos os registros, centavos, sinais protegidos contra fórmula, aspas, separador e quebra de linha. Fechamento e snapshot exatos; alteração após fechar recusada com 42501 e registro preservado. Sem erro de console ou rolagem lateral.

Evidência local: prints/o6-financeiro-volume/resultado.json, volume.csv e volume-1366.png; log /tmp/cex-O6-volume-validado.log. O relatório declara realFamiliesTested=false. A captura é a região da exportação após rolagem, não a primeira dobra. O tempo local inclui ambiente de desenvolvimento e não é benchmark de produção. O Financeiro não foi alterado. Observação de ergonomia com 573 previstos registrada na I3 para Claude, sem assumir arquivos da I10.

Duas tentativas anteriores corrigiram o próprio verificador: a primeira concatenava visual e sr-only do indicador; a segunda tratava Tabela como array em vez de {cabecalho, linhas}. Leitura CSV independente também confirmou os 5.013 registros e a proteção de fórmula existente. Produto e componentes não foram alterados para passar. Lint e typecheck passaram antes da execução final. O app é o mesmo do build da O5 (282064c); CI/build serão exigidos novamente no PR desta entrega documental e de verificação. F1 aguarda I10 e recebeu mensagem para Claude; N2/I3 mantêm o restante de interface. O7 conserva a prova com famílias reais.
