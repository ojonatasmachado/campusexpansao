---
id: I7
titulo: Permitir mover tarefas do Quadros no toque
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
Em app/service/painel/telas/Quadros.tsx:125 só há draggable nativo, que não funciona em toque. No painel pelo celular, mover tarefa de coluna não foi verificado.
Fonte: REVISAO-DESIGN.md "Pendências e decisões suas".

## Arquivos (trilho)
- `app/service/painel/telas/Quadros.tsx`

## Pronto quando
- Mover card funciona no iPhone, por botão "Mover para" ou por pointer events.
- Testado em aparelho real.

## Notas
ABERTO. No app do membro, a tarefa já muda de coluna por botões.
