---
id: I5
titulo: Reduzir repetição da ajuda e ajuda sem cobrir Escalas
tipo: codigo
status: feita
quem: codex
desde: 2026-11-11
branch: historia/I5-ajuda-menos-repeticao
depende: []
tamanho: P
---

## Por quê
A ajuda "?" aparece demais em Relatórios, Cursos e Escalas, e a ajuda flutuante cobre parte de Escalas.
Fonte: LEVEZA D.

## Arquivos (trilho)
- `app/service/painel/telas/Relatorios.tsx`
- `app/service/painel/telas/Formacao.tsx` (cursos)
- `app/service/modules/escalas/Escalas.tsx`
- `app/service/HelpSystem.tsx`
- `app/service/ServiceExactApp.tsx` (classe da coluna principal com espaço para a ajuda flutuante)
- `app/service/ui/biblioteca.css`
- `docs/service-v7/historias/I5-ajuda-menos-repeticao.md`
- `docs/service-v7/historias/screenshots/I5-*.png`

## Pronto quando
- Relatórios com menos "?" que a medição de 21/10 (8), e Cursos com menos que 6.
- Ajuda flutuante não cobre Escalas.

## Validação

Capturas 1366×860. Selo do Next oculto e animações paradas antes de cada foto. Os textos das duas ajudas de Relatórios foram abertos juntos na mesma captura; a ajuda do título mostra “cultos” e a da seção 01 é curta. Cursos foi capturado com a ajuda aberta e o rodapé “pessoas cursando agora” visível, sem repetição na ajuda. As ajudas explicam a seção em até duas frases e não enumeram cartões.

| Tela | Antes: ? | Depois: ? | __medir(24) antes | __medir(24) na foto depois | Limite 25 ações/100 palavras | Resultado |
|---|---:|---:|---|---|---|---|
| Relatórios | 12 | 4 | 37 ações, 121 palavras, fora | 23 ações, 137 palavras, fora | Dentro em ações, acima por 37 palavras | Foto refeita no fim real da rolagem: `window.scrollY` 2254 de 2254; cartão “Como o Service está funcionando” inteiro visível, menu lateral inteiro. Ajuda de título e seção 01 mostram o texto solicitado, com `{grupos}` resolvido como “grupos”; seção 02 também foi aberta. |
| Cursos | 6 | 2 | 35 ações, 98 palavras, fora | 31 ações, 111 palavras, fora | Acima por 6 ações e 11 palavras | Ajuda curta sobre a trilha e aulas; não repete “pessoas cursando agora”. |
| Escalas | 2 | 2 | 35 ações, 64 palavras, fora | 65 ações, 136 palavras, fora | Acima por 40 ações e 36 palavras | Fixture local com 15 funções e 15 escalas distribuídas por cinco pessoas. Fim real: `window.scrollY` 413 de 413; último “Escalar” em x=732, y=716, 70×32, inteiro visível. `elementFromPoint` no centro do “?” retorna o botão flutuante; o botão de escala também recebe o hit no seu centro. Sidebar inteira até Configurações. |

Fotos de antes, abertas: Relatórios `I5-antes-relatorios.png`, MD5 `c40c1e2de70e932237575fc1cd5bbcd4`; Cursos `I5-antes-cursos.png`, MD5 `0329d4056cc0ee62a5150eaf3f1a734e`; Escalas `I5-antes-escalas.png`, MD5 `169775297f519ed20f94da9b5984563e`. Fotos de depois, abertas e descritas: `I5-qa-depois-cursos.png`, MD5 `da1b2c1208c92093c5bf57faee26ca11`; fim real de Relatórios `I5-qa-depois-relatorios-fim.png`, MD5 `84a9e3470e3887e31e04af8fa79b809c`; fim de Escalas `I5-qa-depois-escalas-fim.png`, MD5 `d531e2d1b970895fe957b5ca0e9d0c72`; ajuda do título `I5-qa-ajuda-relatorios-1.png`, MD5 `f486b53230fa6af889f55596a91e76c3`; seção 01 `I5-qa-ajuda-relatorios-2.png`, MD5 `eb32316bf1b3a54aae281b0cc4091ec2`; seção 02 `I5-qa-ajuda-relatorios-3.png`, MD5 `594c6b76e0e4eb0b3f39bb0583419469`. A seção 02 mostra o texto solicitado e foi medida em 27 ações e 141 palavras, acima por 2 ações e 41 palavras. Nas duas rotas, o centro do “?” em `(1248,812)` retorna o próprio `<button class="help-fab">`; em Escalas, `elementFromPoint(767,732)` retorna o último botão “Escalar”; a sidebar termina no fim da viewport. `window.scrollY` atingiu o máximo nas duas rotas. `document.body` tem `paddingBottom: 0px`; a reserva fica em `.main .content` (96px incluindo área segura), e não no body. O screenshot de Escalas mostra a coluna do domingo sem sobreposição. O Next não aparece nas capturas.

As capturas foram abertas e mostram o último Escalar inteiro ao fim da coluna de domingo, o cartão final de Relatórios por inteiro e a sidebar até Configurações. As capturas foram feitas com o fixture local de 15 funções. Limpeza confirmada em 127.0.0.1:54321: `{"deleted":{"assignments":15,"event":1,"positions":15,"ministry":1},"remaining":{"assignments":0,"event":0,"positions":0,"ministry":0}}`.

Validação nesta revisão: `npx tsc --noEmit -p .` e ESLint passaram; ESLint reportou 1 warning preexistente em `Relatorios.tsx:76` (`membrosDelta` não usado). `scripts/check-service-componentes.ts`, `scripts/check-theme-contrast.ts` (oito famílias, dois modos) e `scripts/check-service-lei12.ts` passaram. Playwright não iniciou Chromium nesta revisão (`MachPortRendezvousServer ... Permission denied (1100)`); as fotos finais existentes foram abertas e inspecionadas.

## Notas

A ajuda flutuante mantém sua posição. A coluna de conteúdo recebe reserva inferior em todas as rotas do painel; `document.body` não recebe padding. A linha I5 foi removida de PENDENTES, mantendo a linha I2.

`./node_modules/.bin/tsc --noEmit -p .` passou. ESLint nos quatro arquivos tocados terminou sem erros e com cinco warnings preexistentes de variáveis não usadas em Formacao.tsx e Relatorios.tsx. `npm exec --yes --package=tsx -- tsx scripts/check-service-componentes.ts` passou com `Componentes da biblioteca: ok`; `npm exec --yes --package=tsx -- tsx scripts/check-theme-contrast.ts` passou nas oito famílias e nos dois modos.
