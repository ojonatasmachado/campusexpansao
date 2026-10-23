---
id: I9
titulo: Biblioteca, bloco C (avatar, etapas, tabela com seleção)
tipo: codigo
status: reservada
quem: claude
desde: 2026-10-22
branch: historia/I9-biblioteca-avatar-etapas
depende: [I4]
tamanho: M
---

## Por quê
Avatar tem 5 definições; etapas e linha do tempo têm 4 estruturas; a tabela da prancha 3 (seleção com barra de ações em lote) não existe.
Fonte: canvas "Service, direção visual" (claude.ai/artifact/JNpxaXTN3uVPmvdLCgcdMb), pranchas 3 e 6; docs/service-v7/BIBLIOTECA.md.

## Arquivos (trilho)
- `app/service/ui/`
- `app/service/painel/ui.tsx`, `app/service/membro/comum.tsx`, `CheckIn.tsx`, `CursoDrawer.tsx`, `AulaCheckin.tsx`

## Pronto quando
- Avatar e Etapas únicos em app/service/ui, cópias removidas.
- Tabela com seleção e barra em lote em uma tela de referência (Pessoas).

## Notas
Mesmo método do I4: peça em app/service/ui, visual em biblioteca.css, galeria em /service/demo/biblioteca, troca tela a tela, regra no scripts/check-service-componentes.ts.
