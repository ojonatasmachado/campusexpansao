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
- Densidade dentro da lei 13: até 25 ações e 100 palavras na dobra (1366×860), um botão cheio, no máximo 2 níveis de moldura.
- Movimento de entrada/saída da fila respeita movimento reduzido.
- Pior caso testado: igreja sem pendências, 40 pendências, nomes longos, 390 px.

## Notas
- Skills obrigatórias: impeccable, ui-ux-pro-max, design:ux-copy, emil-design-eng, animate, dataviz, react-refactor, break-ui, web-design-guidelines, design:accessibility-review, review-animations, mobile-native.
- Cor só por variável do tema; Service é white-label.
- Merge só com OK do usuário.