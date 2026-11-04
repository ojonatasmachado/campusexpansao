---
id: E1
titulo: Reorganizar Escalas por time em tabela
tipo: codigo
status: feita
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
- `app/service/modules/escalas/manifest.ts` (justificativa de densidade, lei 13)
- `evolucoes/service_app/service-app.css` (CSS existente; novos estilos só em classes da tela ou biblioteca.css)

## Pronto quando
- Seletor de time no topo; líder abre direto no seu time.
- Tabela função × culto, com coluna de funções fixa; no celular, um culto por vez.
- Linha = vaga, com status pela cor.
- "Preencher automaticamente" absorve "Como gerar"; saem "Pendências da semana" e a linha de cobertura.
- `scripts/medir-densidade.js` mostra até 25 itens clicáveis e 90 palavras na dobra, 1 nível de moldura, sem sobreposição.

## Lei 16 · Mercado antes do desenho

**Voluts** (App Store, Gileade Sistemas, 48 avaliações em 11/2026): o líder monta a escala pelo celular evitando conflito de disponibilidade; o voluntário vê a agenda, pede troca e faz check-in. A descrição da loja não mostra a grade da tela, então a organização por time em tabela vem do Planning Center.

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
2026-11-04, conferência (claude): tabela função × culto por time, seletor de time, "Preencher automaticamente" no lugar de "Como gerar", celular com um culto por vez. Corrigido na conferência: fotos (as primeiras eram a tela de erro do Next), Selo com texto em cada vaga, botão dentro de botão em "Escalar", legenda que repetia a cor (lei 14), tabela cortada na borda (agora rola, com a coluna da função fixa), setas de 18px no celular, scripts e dependências de trabalho fora do commit. Densidade com scripts/medir-densidade.js, time Louvor: 1366×860 tem 54 ações (limite 25) e 106 palavras (limite 90), FORA DA LEI; antes, no main, 47 ações, 208 palavras e 3 molduras. A casca (menu, busca, avatar) soma 23 das 54. 390×844: 15 ações (limite 12), 31 palavras, FORA DA LEI nas ações. Sem alvo pequeno, sobreposição, rolagem lateral nem erro de console. Decisão do usuário em 04/11: aceitar com justificativa no manifesto (escalas/manifest.ts, campo densidade). E6 (768px) não foi fotografada e segue no PENDENTES.

ABERTO, parcial: já existe o menu "Mais" com Escala extra, Delegar, QR e Baixar, e o botão "Publicar e avisar".
Hoje a tela tem esc-events, timesFechados, "Como gerar" em :511 e "Pendências da semana" em :634.
