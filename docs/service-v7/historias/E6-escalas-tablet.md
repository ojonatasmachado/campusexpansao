---
id: E6
titulo: Verificar Escalas em 768px sem coluna cortada
tipo: codigo
status: feita
quem: claude-opus
desde: 2026-11-04
branch: historia/E6-escalas-tablet
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
2026-11-04 (claude): resolvida pela E1. Abaixo de 860px a tabela vira um culto por vez com setas. Foto E6-escala-768.png, time Louvor, aberta por cliques: nenhuma célula cortada, sem rolagem lateral, sem erro de console. Densidade em 768×1024: 16 ações (limite 25), 36 palavras (limite 100), 1 moldura; em 820×1180, 17 e 40. Ajuste: tirada a borda dupla sob as setas (service-app.css, só no bloco de Escalas).
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
O empilhamento está em @media (max-width:767px) em service-app.css:2642.
Pode ser resolvido de graça por E1; só reabrir se E1 não sair.
