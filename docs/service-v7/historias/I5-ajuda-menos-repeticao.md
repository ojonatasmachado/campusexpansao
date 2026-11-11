---
id: I5
titulo: Reduzir repetição da ajuda e ajuda sem cobrir Escalas
tipo: codigo
status: reservada
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
- `app/service/painel/telas/Cursos.tsx`
- `app/service/painel/telas/Escalas.tsx`
- `app/service/painel/HelpSystem.tsx`
- `docs/service-v7/historias/I5-ajuda-menos-repeticao.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/I5-*.png`

## Pronto quando
- Relatórios com menos "?" que a medição de 21/10 (8), e Cursos com menos que 6.
- Ajuda flutuante não cobre Escalas.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Commits b776342 e ac3dca1 ("ajuda junto aos títulos") reduziram a repetição, mas a medição de 21/10 era anterior ou concorrente.
Medida a repetir: scripts/medir-densidade.js em Relatórios, Cursos e Escalas.
Trilho a definir na reserva.
