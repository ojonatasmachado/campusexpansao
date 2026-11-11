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
- `docs/service-v7/historias/I5-ajuda-menos-repeticao.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/I5-*.png`

## Pronto quando
- Relatórios com menos "?" que a medição de 21/10 (8), e Cursos com menos que 6.
- Ajuda flutuante não cobre Escalas.

## Validação

Contagem de "?" visíveis inclui HelpDot e o botão flutuante visível. Antes foi capturado no HEAD reservado, antes das alterações.

| Tela | Antes: ? | Depois: ? | __medir(24) antes | __medir(24) depois | Resultado |
|---|---:|---:|---|---|---|
| Relatórios | 12 | 4 | 37 ações, 121 palavras | 33 ações, 117 palavras | Ajuda geral e uma por seção, menos 8 interrogações. |
| Cursos | 6 | 2 | 35 ações, 98 palavras | 31 ações, 94 palavras | Uma ajuda no título explica os quatro indicadores, menos 4 interrogações. |
| Escalas | 2 | sem alteração | 35 ações, 64 palavras | sem alteração | Sem mudança: uma ajuda de tela e uma flutuante. Conteúdo termina em y=414; botão flutuante em y=790–834, sem sobreposição. |

Capturas 1366×860, abertas e conferidas. Selo Next escondido e contagem visível zero. MD5: Relatórios antes `be5f9c67e96bff7a77292da092c19eb3`, depois `05f531c953e0a0f5d33c16291b69192e`; Cursos antes `0329d4056cc0ee62a5150eaf3f1a734e`, depois `c3bd4eb32b772c68509228b156c52c11`; Escalas antes `169775297f519ed20f94da9b5984563e`; sem foto de depois porque não houve alteração na tela. A captura do fim de Escalas é `007291dbaa48a5f8bdd4a816585ab051`.

Antes: Relatórios mostra ajudas em cartões; Cursos mostra interrogações nas métricas e no título; Escalas mostra tabela curta com botão flutuante no espaço inferior. Depois: Relatórios tem uma ajuda nos Números de base e outra na situação semanal; Cursos tem só a ajuda do título, aberta para exibir o texto agregado.

## Notas

Escalas já atendia à regra de uma ajuda por seção/tela e o botão flutuante não cobre conteúdo; não foi alterada. A ajuda “Operação conectada” foi agregada à ajuda da seção semanal. Trilho inclui Relatorios.tsx, Formacao.tsx, Escalas.tsx, HelpSystem.tsx inspecionado, história, PENDENTES e capturas. HelpSystem.tsx e Escalas.tsx não precisaram de mudança.

`npx tsc --noEmit -p .` e `npx eslint app/service/painel/telas/Relatorios.tsx app/service/painel/telas/Formacao.tsx` passaram (lint tem warnings preexistentes). `npm exec --yes --package=tsx -- tsx scripts/check-service-componentes.ts` passou com `Componentes da biblioteca: ok`; `scripts/check-theme-contrast.ts` passou para todas as famílias e modos.

PENDENTES não foi alterado porque o arquivo está simultaneamente reservado por M5, I5 e I2, conforme `npx tsx scripts/historias.ts`; a linha desta história precisa ser removida quando a colisão de reserva for resolvida.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Commits b776342 e ac3dca1 ("ajuda junto aos títulos") reduziram a repetição, mas a medição de 21/10 era anterior ou concorrente.
Medida a repetir: scripts/medir-densidade.js em Relatórios, Cursos e Escalas.
Trilho definido na reserva; arquivos inspecionados e capturas registrados acima.
