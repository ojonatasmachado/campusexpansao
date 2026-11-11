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
- `app/service/ServiceExactApp.tsx` (prop de reserva de rolagem só em Relatórios e Escalas)
- `docs/service-v7/historias/I5-ajuda-menos-repeticao.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/I5-*.png`

## Pronto quando
- Relatórios com menos "?" que a medição de 21/10 (8), e Cursos com menos que 6.
- Ajuda flutuante não cobre Escalas.

## Validação

Capturas 1366×860. Selo do Next oculto e animações paradas antes de cada foto. Os textos das duas ajudas de Relatórios foram abertos juntos na mesma captura; a ajuda do título mostra “cultos” e a da seção 01 é curta. Cursos foi capturado com a ajuda aberta e o rodapé “pessoas cursando agora” visível, sem repetição na ajuda. As ajudas explicam a seção em até duas frases e não enumeram cartões.

| Tela | Antes: ? | Depois: ? | __medir(24) antes | __medir(24) na foto depois | Limite 25 ações/100 palavras | Resultado |
|---|---:|---:|---|---|---|---|
| Relatórios | 12 | 4 | 37 ações, 121 palavras, fora | 33 ações, 153 palavras, fora | Acima por 8 ações e 53 palavras | Foto com ambas as ajudas abertas, texto de “cultos” substituído e uma única seta em “Ver panorama completo”. As ajudas não duplicam legenda de cartão. |
| Cursos | 6 | 2 | 35 ações, 98 palavras, fora | 31 ações, 111 palavras, fora | Acima por 6 ações e 11 palavras | Ajuda curta sobre a trilha e aulas; não repete “pessoas cursando agora”. |
| Escalas | 2 | 2 | 35 ações, 64 palavras, fora | 59 ações, 121 palavras, fora | Acima por 34 ações e 21 palavras | Cenário temporário com 15 funções, um culto no domingo e 15 alocações distribuídas por cinco pessoas locais. No fim da rolagem, o último “Escalar” ficou em x=732, y=630, 70×32. `elementFromPoint(767,646)` retornou o próprio botão `Escalar`; o botão de ajuda ficou abaixo à direita, sem cobrir conteúdo. Espaço final reservado: 86px mais a área segura. |

Fotos de antes, abertas: Relatórios `I5-antes-relatorios.png`, MD5 `c40c1e2de70e932237575fc1cd5bbcd4`; Cursos `I5-antes-cursos.png`, MD5 `0329d4056cc0ee62a5150eaf3f1a734e`; Escalas `I5-antes-escalas.png`, MD5 `169775297f519ed20f94da9b5984563e`. Fotos de depois, abertas e descritas: `I5-qa-depois-relatorios-ajudas.png`, MD5 `72ac0fb76f1973258508997092058ef1`; `I5-qa-depois-cursos.png`, MD5 `da1b2c1208c92093c5bf57faee26ca11`; fim de Relatórios `I5-qa-depois-relatorios-fim.png`, MD5 `2f73ed31d7a990bdaf2b9ef559d442fa`; fim de Escalas `I5-qa-depois-escalas-fim.png`, MD5 `f07bf787e1fcca0c05abf0b19f303611`. O Next não aparece nas fotos.

O dado temporário foi removido do banco local. Consulta final: 0 escalas, 0 culto, 0 funções e 0 time com os IDs criados.

Validação técnica: typecheck, ESLint dos arquivos tocados, check de componentes e contraste foram executados após a correção; resultados registrados no fechamento do branch.

## Notas

A ajuda flutuante mantém sua posição. Em Relatórios e Escalas, o conteúdo ganha espaço final pela prop do HelpFab e só em telas largas; a regra global de posição não muda. A linha I5 foi removida de PENDENTES, mantendo a linha I2.

`./node_modules/.bin/tsc --noEmit -p .` passou. ESLint nos quatro arquivos tocados terminou sem erros e com cinco warnings preexistentes de variáveis não usadas em Formacao.tsx e Relatorios.tsx. `npm exec --yes --package=tsx -- tsx scripts/check-service-componentes.ts` passou com `Componentes da biblioteca: ok`; `npm exec --yes --package=tsx -- tsx scripts/check-theme-contrast.ts` passou nas oito famílias e nos dois modos.
