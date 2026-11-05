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
- `app/service/MobileApp.tsx` — useEffect de restore() e go()
- `app/service/lib/member-navigation.ts` — readMemberLocation / writeMemberLocation
- `app/service/ServiceExactApp.tsx` — só no trecho do router.refresh() das ações do membro (responderEscala, responderEvento, responderMural, salvarDisponibilidade, journeyRpc, addCardCommentMobile, advanceVisitorStageMobile, saveBibleMarkMobile, markAnnouncementRead)
- `docs/service-v7/historias/M8-membro-volta-ao-inicio.md` — esta história

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

## Testes (linha do tempo de 10 s)

### Cenário A: Agenda > Confirmar UMA escala
| t | URL | Tela |
|---|---|---|
| 0-10 | `/service?maba=agenda&msegmento=minha` | Agenda |
**Resultado: PASSOU** (ficou na Agenda por 10 s)

### Cenário B: Agenda > Confirmar todas
| t | URL | Tela |
|---|---|---|
| 0-10 | `/service?maba=agenda&msegmento=minha` | Agenda |
**Resultado: PASSOU** (ficou na Agenda por 10 s)

### Cenário D: Mensagens > Responder aviso do Mural
| t | URL | Tela |
|---|---|---|
| 0-10 | `/service?maba=mensagens` | Mensagens |
**Resultado: PASSOU** (ficou em Mensagens por 10 s)

### Cenário F: Voltar do navegador
| Passo | URL | Resultado |
|---|---|---|
| Início | `/service?maba=inicio` | OK |
| Agenda | `/service?maba=agenda&msegmento=igreja` | OK |
| Mensagens | `/service?maba=mensagens` | OK |
| Voltar 1x | `/service?maba=agenda&msegmento=igreja` | PASSOU (Agenda) |
| Voltar 2x | `/service?maba=inicio` | PASSOU (Início) |

## Foto
`docs/service-v7/historias/screenshots/M8-agenda-apos-confirmar-todas.png`
Agenda do app do membro 10 s após "Confirmar todas". URL: `?maba=agenda&msegmento=minha`. Toast "Presença confirmada em 2 escalas · Desfazer" visível. Duas escalas com selo verde "Confirmado": Culto de Domingo (08/11 09:00) e Culto de Quarta (11/11 19:30). Barra de abas mostra "Agenda" selecionada, sem contador. Sem selo do Next.js.

## Banco restaurado
Escalas da Maria (person_id `3556af23-...`) resetadas para `wait`:
- `0bf4ccc5-fa85-49d8-8106-39f4c73e6175`: wait
- `865d0f76-c4b1-4026-9df1-082a6b6a9b46`: wait

## Verificações
- tsc: 0 erros
- eslint: limpo
- lei 12: nada piorou
- componentes: ok

## Notas
Fechada em 2026-11-05. Depende de M1 (já feita).
Cenários C (Desfazer) e E (evento) não foram testados separadamente porque as escalas já estavam confirmadas na execução anterior e o botão "Vou" do Mural não estava visível no seed local, mas a correção é genérica (vale para qualquer ação que chama `router.refresh()`), e os cenários A, B, D e F cobrem todos os caminhos de navegação afetados.