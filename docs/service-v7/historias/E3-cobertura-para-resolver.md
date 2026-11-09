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
O trilho antigo citava Cobertura.tsx. No código atual, o resumo remanescente chama CoberturaResumo.tsx e só tem um consumidor também sem uso, MiniEvent. O Início ainda apresenta uma contagem semanal genérica e o menu Escalas a repete. A cobertura por time deve gerar uma linha por culto com falta no Para resolver, com o detalhe no Panorama.
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
- `.github/workflows/service.yml`
- `evolucoes/service_app/service-app.css`
- `app/service/ui/Segmentado.tsx`
- `app/service/ui/biblioteca.css`
- `app/service/painel/telas/Evento.tsx`
- `docs/service-v7/BIBLIOTECA.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/E3-*.png`

## Levantamento do trilho

Em origin/main d91e0a2, Próximos cultos já foi retirado do Início. MiniEvent, exportado em Inicio.tsx, não tem consumidores; é o único consumidor de CoberturaResumo.tsx. Escalas.tsx já não mostra cobertura na lista. FichaPessoa.tsx calcula a cobertura para EventDrawer, cujo detalhe vive em Panorama.tsx; esse caminho é preservado. O menu Escalas também repete o total de vagas no badge. A fila do Início ainda usa vagasDaSemana(), uma contagem genérica que será substituída por uma linha por culto nos próximos 14 dias. Não há colisão com outra reserva nos arquivos acrescentados ao trilho.

## Lei 16

- [Planning Center, Home](https://www.planningcenter.com/changelog/people/4412146262939-new-planning-center-home): o widget Schedule: team breakdown mostra na página inicial o estado das posições necessárias dos times liderados; a seleção de times é configurável. No [plano, Needed positions](https://help.planningcenter.com/en/142880-set-up-needed-positions.html), a contagem de vagas abre a seleção de pessoas.
- [ChurchSuite, Overview](https://support.churchsuite.com/article/300-viewing-multiple-rotas-in-a-single-report): da lista de escalas, Overview reúne datas e times, permite mostrar datas vazias e editar as escalas. A fonte não demonstra alerta de vaga na página inicial.
- [Elvanto, Dashboard](https://help.elvanto.com/hc/en-us/articles/19208177151127-How-to-Customize-Your-Elvanto-Dashboard): a entrada oferece widgets de próximos eventos e escala pessoal, filtrados pelo acesso. A lista documentada não apresenta um widget de vagas abertas.

Decisão funcional: antecipar no Início somente os cultos com falta, cada um com data e vagas por time; o detalhe e a resolução permanecem no Panorama. Não atribuímos aos concorrentes uma fila inicial que as fontes não comprovam.

## Jornada e decisão de construção

Começa no Início do painel, com Escalas ligado e permissão de escala. O registro fornece os módulos de painel.inicio.pendencias; o módulo Escalas produz entradas de ação com prioridade 80 e prazo, ordenadas por data. O recorte usa o fuso da igreja: hoje e os 13 dias seguintes, excluindo horários já iniciados. A conta reaproveita coberturaPorTime, o escopo do líder e os times do culto; quem recusou não preenche vaga. Sem falta, sem time, sem módulo ou sem permissão, não há linha de cobertura. Sem nenhuma pendência, a fila existente mostra Tudo em dia.

Cada linha usa Acao com linhaClasse(), título, apoio e uma ação. O clique abre o drawer com tab panorama, sem consultar outra API e sem escrever no banco. A carga e os erros de rede continuam sob a casca existente; não foi criado comportamento offline novo. O Panorama mantém a ação de abrir o time e editar a escala. O módulo não depende da resposta de outra pessoa para abrir o detalhe; o preenchimento depende do líder e das respostas dos escalados.

## Pronto quando
- A cobertura por time sai de Próximos cultos e da lista de Escalas.
- Cada culto com falta vira uma linha no Para resolver.

## Notas
ABERTO. Depende de E2.
Tamanho P a M.
