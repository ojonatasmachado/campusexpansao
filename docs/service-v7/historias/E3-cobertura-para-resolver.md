---
id: E3
titulo: Transformar cobertura em linha no Para resolver
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-09
branch: historia/E3-cobertura-para-resolver
depende: [E2]
tamanho: M
---

## Por quê
CoberturaResumo.tsx aparece em Próximos cultos; a lista de Escalas já encaminha o detalhe ao Panorama, contrariando a lei 14. A cobertura por time deve virar uma linha por culto com falta, no Para resolver.
Fonte: MANIFESTO.md 4.16 (rev. 22/10), decisão 12.

## Arquivos (trilho)
- `app/service/modules/escalas/CoberturaResumo.tsx`
- `app/service/painel/telas/Inicio.tsx`
- `app/service/painel/telas/Panorama.tsx`
- `app/service/modules/escalas/Escalas.tsx`
- `app/service/modules/escalas/manifest.ts`
- `app/service/modules/escalas/pendencias.ts`
- `app/service/modules/registry.ts`
- `app/service/ServiceExactApp.tsx`
- `scripts/check-service-cobertura.ts`

## Levantamento do trilho

Em origin/main d91e0a2, Próximos cultos já foi retirado do Início. MiniEvent, exportado em Inicio.tsx, não tem consumidores; é o único consumidor de CoberturaResumo.tsx. Escalas.tsx já não mostra cobertura na lista. FichaPessoa.tsx calcula a cobertura para EventDrawer, cujo detalhe vive em Panorama.tsx; esse caminho é preservado. A fila do Início ainda usa vagasDaSemana(), uma contagem genérica que será substituída por uma linha por culto nos próximos 14 dias. Não há colisão com outra reserva nos arquivos acrescentados ao trilho.

## Lei 16

- [Planning Center, Needed positions](https://help.planningcenter.com/en/142880-set-up-needed-positions.html): no plano, a aba Teams mostra quantas posições faltam e a contagem abre a seleção de pessoas. A fonte não demonstra uma fila de faltas na página inicial.
- [ChurchSuite, Overview](https://support.churchsuite.com/article/300-viewing-multiple-rotas-in-a-single-report): da lista de escalas, Overview reúne datas e times, permite mostrar datas vazias e editar as escalas. A fonte não demonstra alerta de vaga na página inicial.
- [Elvanto, Dashboard](https://help.elvanto.com/hc/en-us/articles/19208177151127-How-to-Customize-Your-Elvanto-Dashboard): a entrada oferece widgets de próximos eventos e escala pessoal, filtrados pelo acesso. A lista documentada não apresenta um widget de vagas abertas.

Decisão funcional: antecipar no Início somente os cultos com falta, cada um com data e vagas por time; o detalhe e a resolução permanecem no Panorama. Não atribuímos aos concorrentes uma fila inicial que as fontes não comprovam.

## Pronto quando
- A cobertura por time sai de Próximos cultos e da lista de Escalas.
- Cada culto com falta vira uma linha no Para resolver.

## Notas
ABERTO. Depende de E2.
Tamanho P a M.
