---
id: Q2
titulo: Isolar e modernizar check-local-rls
tipo: infra
status: reservada
quem: codex
desde: 2026-10-22
branch: historia/Q2-isolar-check-local-rls
depende: []
tamanho: M
---

## Por quê
O script check-local-rls.ts faz reset destrutivo de requisitos e pedidos, e tem contrato desatualizado de "Quero servir". Ele falhou e não deve rodar no banco local compartilhado.
Fonte: HANDOFF item 7; CONTINUIDADE.md "Limitações"; implementacao/acessos/README.md.

## Arquivos (trilho)
- `scripts/check-local-rls.ts`

## Pronto quando
- Script roda em banco descartável, com limpeza em caso de falha.
- Contrato de "Quero servir" atualizado.
- Não roda no banco local compartilhado.

## Notas
ABERTO.
