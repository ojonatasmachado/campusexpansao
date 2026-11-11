---
id: M5
titulo: Dar foco por teclado à região rolável do Mural
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-11
branch: historia/M5-mural-foco-teclado
depende: []
tamanho: P
---

## Por quê
O axe apontou em 20/10 uma região rolável do Mural do membro sem foco por teclado. Em membro/Mural.tsx:50 há tabIndex={-1} só no artigo, e a região rolável ainda não foi confirmada.
Fonte: AUDITORIA-UI-2026-10-20.md seção 4.

## Arquivos (trilho)
- `app/service/membro/Mural.tsx`
- `evolucoes/service_app/service-app.css` (somente foco da região do Mural)
- `docs/service-v7/historias/M5-mural-foco-teclado.md`
- `docs/service-v7/historias/screenshots/M5-*.png`

## Pronto quando
- Região rolável do Mural alcançável por teclado, depois de confirmada.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
