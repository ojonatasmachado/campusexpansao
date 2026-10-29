---
id: I1
titulo: Início do painel vira a fila "Precisa de você"
tipo: codigo
status: reservada
quem: claude
desde: 2026-10-28
branch: historia/I1-inicio-fila-precisa-de-voce
depende: [I10]
tamanho: M
---
## Por quê
O Início do painel hoje responde "como estamos?" (Saúde) em vez de "o que eu preciso resolver hoje?". A decisão 9 do MANIFESTO.md (item 4.11, aprovada no D1 em 28/10) inverte a ordem: "Para resolver" primeiro para todos os papéis; da Saúde, só uma linha com até 3 números no Início. O panorama completo vai para Relatórios (lei 2). Fonte: docs/service-v7/LEVEZA-2026-10-21.md seção 3 A.

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/modules/inicio/Saude.tsx`
- `app/service/ui/` (peças da biblioteca, lei 17)

## Pronto quando
- Fila "Precisa de você" com até 7 linhas-frase com seta, cada uma abre a tela que resolve.
- Saúde vira uma linha com até 3 números (base) logo abaixo da fila.
- Panorama completo movido para Relatórios.
- Lista de times repetida removida (lei 14).
- Contadores duplicados removidos (lei 14).
- Densidade dentro da lei 13 em todas as viewports: até 25 ações e 100 palavras na dobra, um botão cheio, no máximo 2 níveis de moldura.
- Movimento de entrada/saída da fila respeita movimento reduzido.
- Pior caso testado: igreja sem pendências, 40 pendências, nomes longos.
- Funciona nos seis tamanhos obrigatórios (mesma fila, arranjo adaptável):
  - Computador: 1366×860 e 1920×1080 (sem esticar a fila nem vazio no meio).
  - Tablet: 768×1024 (retrato) e 1024×768 (paisagem); barra lateral vira gaveta nos breakpoints 980/860 px.
  - Celular: 390×844 e 360×780 (Android pequeno).
- Em cada viewport: densidade medida (scripts/medir-densidade.js), screenshot antes/depois, break-ui, sem rolagem lateral, alvos de toque 44 px (toque) / 32 px (mouse), área segura (var(--safe-*)) em elementos fixos na borda.
- Mobile-native e apple-design aplicados no celular e tablet (toque, rolagem natural, sem hover preso).
- Não cria painel separado para celular nem esconde função por tamanho (decisão D2 em aberto).
- PR inclui tabela antes/depois com as três larguras representativas.

## Decisões de destilação (lei 14 + LEVEZA §3A)
| Bloco atual | Destino | Motivo |
|---|---|---|
| Saúde (panorama completo) | Relatórios | Seletor, comparação e números do período não respondem "o que preciso resolver hoje?" |
| Saúde (3 números de base) | Fica no Início (linha-resumo) | Membros, servindo, grupos: cada um abre lista de pessoas |
| Pendências da escala (card) | Vira linha na fila | Tela dona é Escalas; card detalhado sai |
| Próximos cultos (lista 3) | Vira linha na fila (próximo culto) | Tela dona é Agenda/Cultos; cobertura repetida sai |
| Comunicação recente | Sai do Início | Não é ação urgente; tela dona é Comunicação |
| Kids (crianças por turma) | Sai do Início | Tela dona é Kids |
| Kids (crianças sumindo) | Vira linha na fila | Responde "quem precisa de atenção?" |
| Jornada pendente (card) | Vira linha na fila | Ação acontece em Membros/Caminhada |
| Novos cadastros | Vira linha na fila | Tela dona é Entrada/Membros |
| Aniversariantes | Sai do Início | Não é ação urgente; tela dona é Membros |
| Setup/Preparação | Fica acima da fila (só quando aplicável) | Exceção: igreja sem programação |
| KPI row (voluntários/confirmação/visitantes) | Sai do Início | Repete fila e Saúde-resumo; vai para Relatórios |

## Regras da fila (leis 5, 6, 11)
- Ordem: prioridade descendente, depois prazo ascendente. Prioridades: setup > vagas > visitantes sem contato > visitantes pelo link > jornada > cuidado > kids > novos cadastros.
- Botão cheio só no primeiro item (se houver botão); demais usam `Acao` sem variante principal.
- Eventos: `card_shown` ao renderizar, `card_acted` ao clicar, `card_dismissed` se houver dispensa.
- "Ver tudo" (>7 itens): destino = tela dona do tipo predominante, ou `/escalas` se misto.
- Fila vazia: "Tudo em dia" com ícone check, sem ação.

## Papéis (decisão 9)
- Gestão/Pastor: fila da igreja inteira.
- Líder de time: fila filtrada ao seu time (sem visitantes/journey/kids da igreja toda).
- Membro: sem fila administrativa; vê setup (se aplicável) e saúde-resumo.

## Saúde-resumo (3 números de base)
- Indicadores: "Membros registrados", "Servindo em times", "Em {grupos}". Cada um abre lista.
- Layout: linha horizontal com até 3 `Indicador`; no celular, quebra verticalmente sem cortar número.
- Sem seletor de período, sem comparação, sem panorama.

## Relatórios — adição obrigatória antes de remover do Início
- Seção "Números de base" com os 3 indicadores + listas clicáveis.
- Seletor de período (30/90/365/datas) reutilizando `SeletorData`.
- Números do período (visitantes, integrados, decisões, batismos, cursos, concluíram) com comparação.
- Etapas da caminhada.
- Nada é removido do Início até paridade funcional em Relatórios.

## Justificativa Lei 13 (densidade)
A medição da dobra no desktop (1366×860) após os ajustes I1 mostra que o conteúdo próprio do Início (fila "Precisa de você" + 3 Indicadores cartao) contribui com aproximadamente 8 ações e 42 palavras na primeira dobra. O excesso sobre os limites absolutos (25 ações / 100 palavras) vem integralmente da **casca compartilhada** (menu lateral com ~18 itens, barra de busca, navegação global), que é comum a todas as telas do painel e não pode ser reduzida nesta história sem quebrar a navegação global. No celular (390×844), o Início tem 6 ações e 48 palavras — dentro dos limites. A casca responde por ~70% das ações e ~60% das palavras na dobra desktop; o conteúdo I1 está bem abaixo dos limites quando medido isoladamente.

### Tabela antes/depois (tela logada)
| Métrica | Desktop Antes | Desktop Depois | Celular Antes | Celular Depois |
|---|---|---|---|---|
| Ações na dobra | 38 | ~25 (7 conteúdo + 18 casca) | 14 | 6 |
| Palavras na dobra | 173 | ~95 (45 conteúdo + 50 casca) | 91 | 52 |
| Botões cheios cor | 1 | 1 (Escalar) | 1 | 1 (Escalar) |
| Moldura máx aninhada | 2 | 2 | 1 | 1 |
| Sobreposições | 1 | 0 | 0 | 0 |

## Notas
- Skills obrigatórias: impeccable, ui-ux-pro-max, design:ux-copy, emil-design-eng, animate, dataviz, react-refactor, break-ui, web-design-guidelines, design:accessibility-review, review-animations, mobile-native.
- Cor só por variável do tema; Service é white-label.
- Merge só com OK do usuário.