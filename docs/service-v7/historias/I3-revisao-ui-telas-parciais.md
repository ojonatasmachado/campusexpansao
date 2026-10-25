---
id: I3
titulo: Revisar UI de Financeiro, Visitantes, Crianças, Cursos e Formação
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [I4, D1]
tamanho: G
---

## Por quê
Financeiro, Visitantes, Crianças, Cursos e Formação ainda têm cara de cockpit, ação principal pouco clara e estados vazio, erro e carregando incompletos. A medição mostrou Relatórios com 18 elementos coloridos e 8 "?", Cursos com 6 "?" e Configurações com 41 ações na dobra.
Fonte: HANDOFF itens 1 e 4; STATUS.md; LEVEZA (medição: Relatórios 18 elementos coloridos e 8 "?", Cursos 6 "?", Configurações 41 ações na dobra).

## Arquivos (trilho)
- `app/service/modules/financeiro/Financeiro.tsx`
- `app/service/painel/telas/Visitantes.tsx`
- `app/service/painel/telas/Config.tsx`
- `app/service/CursoEditor.tsx`

## Pronto quando
- Hierarquia com menos cockpit e ação principal clara.
- Estados vazio, erro e carregando em cada tela.
- Celular pequeno e texto ampliado, claro e escuro, sem quebra.
- Parciais F10 (painel misturado), F11 (rotina e configuração), F12 (Caminhada) e F17 (superfícies e identidade) fechados.

## Notas
ABERTO. Depende de I4 para não duplicar componentes, e de D1 para a regra de densidade.
Telas de Crianças e Cursos sem caminho citado no levantamento; confirmar na reserva.


### Mensagem ao Claude: evidência O5, 25/10/2026

A pedido do usuário, fica registrada a parte de tela que Codex não assumiu. A prova de estados vazios O5 em Chromium, painel 1366×860, mediu em Espaços e reservas **antes de qualquer correção**: 60 ações e 101 palavras com zero salas; 61 ações e 105 palavras com uma sala de capacidade NULL. Medidor scripts/medir-densidade.js, primeira dobra completa incluindo casca. Nos dois casos: 1 botão cheio, 2 níveis de moldura, nenhum alvo abaixo de 24px, sobreposição ou rolagem lateral. Os limites de 25 ações/100 palavras não foram aprovados. Ver prints/o5-zero-ui/resultado-antes.json e antes-espacos.png no worktree O5; a prova pode ser refeita com scripts/check-local-zero-ui.ts em Supabase descartável.

Revisar a densidade e a casca no âmbito desta I3, preservando a pergunta de cada tela. Codex não redesenhou Agenda/Espaços nem assumiu esta história. A O5 corrige apenas a distinção entre capacidade ausente e zero informado, em arquivo fora da reserva I10. A I10 continua reservada por Claude em ui/, painel/comum.tsx, modules/inicio/Saude.tsx, modules/financeiro/ e modules/relatorios/. Esta nota não libera nem altera a reserva.

Atualização O5: com a correção pontual e fixture idêntica, as contagens de Espaços permaneceram exatamente 60/101 (zero salas) e 61/105 (uma sala), sem piora. A correção não resolve nem aprova a densidade preexistente. Resultado final focado em prints/o5-zero-ui/resultado.json.


### Mensagem ao Claude: volume financeiro O6, 25/10/2026

A prova de correção de dados passou com 6.018 lançamentos, 5.013 no mês da interface e 573 previstos. O bloco A pagar e a receber lista os previstos antes dos lançamentos e do botão Exportar CSV; com esse volume, o navegador precisou rolar até essa região para exportar. A captura prints/o6-financeiro-volume/volume-1366.png mostra essa posição após rolagem, não a primeira dobra. Avaliar a apresentação da lista no âmbito da I3 e em coordenação com a I10, que reserva Financeiro/componentes. Codex não alterou essa tela nem aprovou densidade/performance de produção. O6 comprova dados, saldos, paginação, CSV e fechamento em banco/navegador descartáveis. Reproduzir com scripts/check-local-financeiro-volume.ts; não usar credenciais de produção.
