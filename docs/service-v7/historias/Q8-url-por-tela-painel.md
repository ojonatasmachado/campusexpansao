---
id: Q8
titulo: Criar endereço real por tela do painel
tipo: codigo
status: reservada
quem: codex
desde: 2026-10-24
branch: historia/Q8-endereco-painel
depende: []
tamanho: G
---

## Por quê
ServiceExactApp.tsx:215 guarda a rota em useState. Por isso não há links diretos, e voltar do navegador sai do painel. O FormScreen já grava uma entrada de histórico por formulário.
Fonte: PLANO_TELA_FORMULARIO.md seções 6 e 9; REVISAO-COMPONENTES (ServiceExactApp.tsx:207).

## Arquivos (trilho)
- `app/service/ServiceExactApp.tsx`

## Pronto quando
- Cada tela do painel tem endereço próprio.
- Link direto abre a tela.
- Voltar do navegador navega dentro do painel.
- Respeita o manifesto (casca estável, lei 1).

## Notas
ABERTO. Mexe na casca do painel, então precisa respeitar o manifesto.
