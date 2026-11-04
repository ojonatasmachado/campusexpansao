---
id: E1
titulo: Reorganizar Escalas por time em tabela
tipo: codigo
status: reservada
quem: claude-opus
desde: 2026-11-04
branch: historia/E1-escalas-por-time
depende: [D1]
tamanho: G
---

## Por quê
A tela de Escalas ainda é por evento, com colunas por time, e o líder não cai direto no seu time. Falta a tabela função × culto, o seletor de time no topo e a remoção de "Como gerar" e "Pendências da semana".
Fonte: LEVEZA B (seção 3), MANIFESTO 2b.1, AUDITORIA-UI-2026-10-20.md seção 2 ("Escalas").

## Arquivos (trilho)
- `app/service/modules/escalas/Escalas.tsx` (refatorado: tabela função × culto por time)
- `app/service/modules/escalas/GerarPeriodo.tsx` (mantido, chamado via "Preencher automaticamente")
- `app/service/modules/escalas/CoberturaResumo.tsx` (E2: linha-resumo com link para Panorama; substituiu Cobertura.tsx)
- `app/service/modules/escalas/cobertura.ts` (cálculo de cobertura por time, mantido)
- `app/service/modules/escalas/candidatos.ts` (pool de candidatos, mantido)
- `app/service/ui/Tabela.tsx` (componente compartilhado, lei 17)
- `evolucoes/service_app/service-app.css` (CSS existente; novos estilos só em classes da tela ou biblioteca.css)

## Pronto quando
- Seletor de time no topo; líder abre direto no seu time.
- Tabela função × culto, com coluna de funções fixa; no celular, um culto por vez.
- Linha = vaga, com status pela cor.
- "Preencher automaticamente" absorve "Como gerar"; saem "Pendências da semana" e a linha de cobertura.
- `scripts/medir-densidade.js` mostra até 25 itens clicáveis e 90 palavras na dobra, 1 nível de moldura, sem sobreposição.

## Lei 16 · Mercado antes do desenho

**Voluts** (4,95★ em 6.680 avaliações, App Store 2026): organiza por **time**, não por culto. O líder escolhe o time no topo e vê as funções nas linhas e os cultos nas colunas. Cada célula é uma vaga; "Sem pessoa" já é o botão de escalar. Status só pela cor da célula (verde=confirmado, amarelo=pendente, vermelho=recusou, cinza=aberto). Duas ações no topo: publicar e preencher automaticamente. Legenda de uma linha com bolinhas, sem chips. Meta alcançada: ~22 itens clicáveis e ~60 palavras na dobra.

**Planning Center Services**: mesma estrutura (time por cima, cultos em colunas). Usa drag-and-drop para mover pessoas entre vagas e culto. O líder vê só seu time por padrão; gestão troca no topo. Ações em lote (confirmar todos, copiar escala do mês anterior) ficam na barra superior.

**Church Center (app do membro)**: mostra "Meus grupos" com ferramentas do líder dentro da aba (a aba M7 do manifesto 2c.1). Não mistura montagem e visualização.

**O que aplicar aqui:**
1. Seletor de time no topo; líder entra direto no seu (escopo já filtra).
2. Tabela função × culto: colunas fixas à esquerda, cultos do mês rolando.
3. Linha = vaga com status pela cor; vaga aberta é o botão de escalar.
4. Duas ações visíveis: "Publicar e avisar" (principal) e "Preencher automaticamente" (absorve "Como gerar").
5. Somem: linha de cobertura (vai para Panorama, lei 14), legenda em chips (vira bolinhas), "Pendências da semana" (vai para fila do Início).
6. Celular: um culto por vez com setas; tabela vira lista.

**Teste de pior caso:** 5 domingos no mês, 15 funções no time, nome longo (Dr. João Pedro da Silva Albuquerque Neto), 390px. Medir antes e depois.

## Notas
ABERTO, parcial: já existe o menu "Mais" com Escala extra, Delegar, QR e Baixar, e o botão "Publicar e avisar".
Hoje a tela tem esc-events, timesFechados, "Como gerar" em :511 e "Pendências da semana" em :634.
