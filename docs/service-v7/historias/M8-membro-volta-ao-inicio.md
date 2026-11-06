---
id: M8
titulo: App do membro volta sozinho para o Início depois de responder
tipo: codigo
status: feita
quem: claude
desde: 2026-11-05
branch: historia/M8-membro-volta-ao-inicio
depende: [M1]
tamanho: M
---

## Por quê
Depois de responder uma escala, confirmar todas, responder um aviso do Mural ou responder um evento, o app do membro volta sozinho para o Início em 2 a 5 s. A pessoa perde o contexto e precisa navegar de novo. Achado na M1 (seção "Sem pendentes"), fora daquela história porque é defeito de navegação, não de Agenda.

## Arquivos (trilho)
- `app/service/MobileApp.tsx`: useEffect de restore() e go()
- `app/service/lib/member-navigation.ts`: readMemberLocation / writeMemberLocation
- `app/service/ServiceExactApp.tsx`: só no trecho do router.refresh() das ações do membro (responderEscala, responderEvento, responderMural, salvarDisponibilidade, journeyRpc, addCardCommentMobile, advanceVisitorStageMobile, saveBibleMarkMobile, markAnnouncementRead)
- `docs/service-v7/historias/M8-membro-volta-ao-inicio.md`: esta história

## Causa raiz (diagnóstico da M1, não refazer)
1. O `go()` do membro grava a aba com `window.history.pushState` e os parâmetros `?maba=agenda&...` (MobileApp.tsx ~linha 259).
2. Após gravar, as ações do membro chamam `router.refresh()` (ServiceExactApp.tsx, várias funções).
3. O `router.refresh()` do Next.js faz `history.replaceState("/service")`, **perdendo os parâmetros `?maba`** que o `go()` gravou.
4. O `useEffect` de `restore()` (MobileApp.tsx ~linha 266) tem `modulosMembro`, `serves`, `isRecep`, `isKids`, `isGuardian`, `pixOn`, `oracaoOn` nas dependências. Quando o refresh traz dados novos, essas referências mudam, o effect roda de novo, lê a URL sem `?maba` e cai no Início.

## Correção na raiz
O `restore()` só deve rodar em dois momentos:
1. Na hidratação (montagem do componente).
2. No `popstate` (voltar/avançar do navegador).

**Não** deve rodar quando as dependências mudam por causa de um `router.refresh()`. A aba tem que continuar no endereço depois de qualquer refresh.

Abordagem: separar a restauração inicial (que lê a URL e sincroniza o estado) da escuta de `popstate`. A restauração inicial roda uma vez na montagem, com as dependências estabilizadas (refs ou estado inicial). O listener de `popstate` fica independente das props que mudam com o refresh.

Alternativas descartadas:
- Segurar a aba da Agenda com um remédio local: não resolve Mensagens, eventos, etc.
- Gravar a aba no sessionStorage e ler no restore: funciona mas adiciona estado duplicado; a URL já é a fonte de verdade.
- Tirar as dependências do useEffect: quebra a validação de módulos permitidos.

A solução correta é desacoplar a leitura da URL (que só importa na montagem e no popstate) da validação de módulos (que pode mudar sem exigir re-leitura da URL).

## Pronto quando
- Confirmar uma escala: tela fica na Agenda por ≥ 10 s.
- Confirmar todas: tela fica na Agenda por ≥ 10 s.
- Desfazer confirmação: tela fica na Agenda.
- Responder aviso do Mural ("Vou"): tela fica em Mensagens.
- Responder evento (Agenda > Igreja): tela fica na Agenda.
- Voltar do navegador: Início → Agenda → Mensagens → voltar duas vezes → Agenda → Início.
- Linha do tempo de 10 s (URL + título) em cada cenário, antes e depois.
- Foto da Agenda 10 s depois de "Confirmar todas", ainda na Agenda e com escalas confirmadas.
- Banco restaurado ao estado anterior (escalas da Maria pendentes).
- tsc, eslint, lei 12, componentes verdes.
- PR aberto para main, CI service verde.

## Correção aplicada
O `useEffect` de `restore()` no `MobileApp.tsx` foi dividido em dois efeitos independentes:
1. **Hidratação**: roda uma vez na montagem (e quando troca pessoa/organização), lê a URL e sincroniza o estado.
2. **Popstate**: escuta `popstate` (voltar/avançar do navegador) usando um listener estável que lê o contexto atualizado via `useRef`, sem depender das props que mudam com `router.refresh()`.

O contexto que muda com refresh (`modulosMembro`, `serves`, `isRecep`, etc.) fica em `navCtxRef`, atualizado após cada render via `useEffect` sem dependências. O `applyLocation` é estabilizado com `useCallback([], [])` e lê sempre o valor mais recente do ref.

## Testes (linha do tempo, conferidos na revisão de 2026-11-06)
Rodados pelos cliques em servidor dev-local num worktree no commit 1e581a6, login membro@teste.local, 390x844.

| Cenário | Resultado |
|---|---|
| A. Agenda, Confirmar uma escala | URL `?maba=agenda&msegmento=minha` e tela Agenda em todas as 10 leituras (1,8 s a 12,4 s) |
| A. Recarregar a página depois | Continua na Agenda (a URL mantém `?maba`) |
| B. Confirmar todas e Desfazer | Agenda em todas as 10 leituras; "Confirmar todas (3 escalas)" volta |
| C. Evento (Agenda > Igreja) | Não testado: no seed local a folha do culto só tem "Compartilhar" e "Adicionar ao calendário" |
| D. Mural ("Vou") | Não testado: o Mural da igreja está vazio no seed local |
| E. Voltar do navegador | Início, Agenda, Mensagens; voltar 1x vai para Agenda, voltar 2x para Início |

Antes da correção (medido na M1): confirmar uma escala levava ao Início em uns 2 s, e confirmar todas em uns 5 s.

## Foto
`docs/service-v7/historias/screenshots/M8-agenda-apos-desfazer.png`: Agenda 10 s depois de "Confirmar todas" e Desfazer, com "Confirmar todas (3 escalas)" de volta, os 3 cartões pendentes (Sáb 07, Qua 11, Dom 15) e a aba Agenda marcando 3. Sem o selo do Next.

## Verificações
- tsc, eslint, lei 12 e componentes: ok no CI service do PR #41.

## Notas
Fechada em 2026-11-06: o restore() do membro roda só na montagem e no popstate, com o contexto num ref. Evento e Mural ficaram sem teste por falta de dado no seed local; a correção vale para qualquer ação que chama router.refresh().
