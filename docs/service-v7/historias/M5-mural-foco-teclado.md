---
id: M5
titulo: Dar foco por teclado à região rolável do Mural
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: P
---

## Por quê
O axe apontou em 20/10 uma região rolável do Mural do membro sem foco por teclado. Em membro/Mural.tsx:50 há tabIndex={-1} só no artigo, e a região rolável ainda não foi confirmada.
Fonte: AUDITORIA-UI-2026-10-20.md seção 4.

## Arquivos (trilho)
- `app/service/membro/Mural.tsx`

## Pronto quando
- Região rolável do Mural alcançável por teclado, depois de confirmada.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
