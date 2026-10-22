---
id: E1
titulo: Reorganizar Escalas por time em tabela
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [D1]
tamanho: G
---

## Por quê
A tela de Escalas ainda é por evento, com colunas por time, e o líder não cai direto no seu time. Falta a tabela função × culto, o seletor de time no topo e a remoção de "Como gerar" e "Pendências da semana".
Fonte: LEVEZA B (seção 3), MANIFESTO 2b.1, AUDITORIA-UI-2026-10-20.md seção 2 ("Escalas").

## Arquivos (trilho)
- `app/service/modules/escalas/Escalas.tsx`
- `app/service/modules/escalas/GerarPeriodo.tsx`
- `app/service/modules/escalas/Cobertura.tsx`
- `app/service/modules/escalas/cobertura.ts`
- `app/service/modules/escalas/candidatos.ts`
- `evolucoes/service_app/service-app.css`

## Pronto quando
- Seletor de time no topo; líder abre direto no seu time.
- Tabela função × culto, com coluna de funções fixa; no celular, um culto por vez.
- Linha = vaga, com status pela cor.
- "Preencher automaticamente" absorve "Como gerar"; saem "Pendências da semana" e a linha de cobertura.
- `scripts/medir-densidade.js` mostra até 25 itens clicáveis e 90 palavras na dobra, 1 nível de moldura, sem sobreposição.

## Notas
ABERTO, parcial: já existe o menu "Mais" com Escala extra, Delegar, QR e Baixar, e o botão "Publicar e avisar".
Hoje a tela tem esc-events, timesFechados, "Como gerar" em :511 e "Pendências da semana" em :634.
