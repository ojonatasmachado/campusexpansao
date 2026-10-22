---
id: E6
titulo: Verificar Escalas em 768px sem coluna cortada
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: P
---

## Por quê
Em 768px, Escalas mostra a terceira coluna cortada. O empilhamento só entra abaixo de 768px, e a auditoria apontou o corte.
Fonte: AUDITORIA-UI-2026-10-20.md seção 2 (Escalas), "Ordem recomendada" 4.

## Arquivos (trilho)
- `evolucoes/service_app/service-app.css`

## Pronto quando
- Escalas em 768px sem coluna cortada e sem rolagem lateral.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
O empilhamento está em @media (max-width:767px) em service-app.css:2642.
Pode ser resolvido de graça por E1; só reabrir se E1 não sair.
