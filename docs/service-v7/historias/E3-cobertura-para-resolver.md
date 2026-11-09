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

## Pronto quando
- A cobertura por time sai de Próximos cultos e da lista de Escalas.
- Cada culto com falta vira uma linha no Para resolver.

## Notas
ABERTO. Depende de E2.
Tamanho P a M.
