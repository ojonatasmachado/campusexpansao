---
id: I7
titulo: Permitir mover tarefas do Quadros no toque
tipo: codigo
status: feita
quem: claude
desde: 2026-11-12
branch: historia/I7-quadros-no-toque
depende: []
tamanho: M
---

## Por quê
Em app/service/painel/telas/Quadros.tsx:125 só há draggable nativo, que não funciona em toque. No painel pelo celular, mover tarefa de coluna não foi verificado.
Fonte: REVISAO-DESIGN.md "Pendências e decisões suas".

## Arquivos (trilho)
- `app/service/painel/telas/Quadros.tsx`
- `docs/service-v7/historias/I7-quadros-no-toque.md`
- `docs/service-v7/historias/screenshots/I7-*.png`
- `docs/service-v7/PENDENTES.md` (tirar a I7 da ordem)

## Pronto quando
- Mover card funciona no iPhone, por botão "Mover para" ou por pointer events.
- Testado em aparelho real.

## Notas
Antes: no app do membro a tarefa já mudava de coluna por botões; no painel, tocar no card abria a gaveta e "Situação" já movia (medido no iPhone emulado antes de mudar), mas o card era uma div sem foco (teclado e leitor de tela não abriam) e erro ao gravar deixava o card no lugar errado.
- 12/11 (claude): card virou `Acao` (lei 17) e continua arrastável; nome = conteúdo do card, dica "Abrir para mover ou editar" por `aria-describedby`; conteúdo do botão em spans. Gaveta: "Situação" virou "Mover para" (grupo nomeado), opções travadas enquanto grava, uma gravação só (antes eram duas). Sem gravar, o card volta (só se ninguém moveu de novo) e aparece "Não foi possível mover agora. Tente de novo."; prioridade e responsáveis desfazem só o que mudou. Teste pela tela no iPhone 13 emulado (toque) e desktop, Supabase local, conta master: 4 PASSOU no toque (mover pela gaveta 1→0/0→1, grava depois de recarregar, só teclado Enter/Tab/Enter, PATCH 500 simulado volta e avisa; único erro de console é o 500 simulado) e arrastar com mouse PASSOU em Chromium, Firefox e WebKit. Fotos `screenshots/I7-gaveta-mover-para.png` (md5 c14de67f), `I7-quadro-depois-toque.png` (862ea5a5), `I7-falha-volta.png` (5d06724d), `I7-desktop-arrastar.png` (374cf17a, WebKit). `validar.sh`: TUDO PASSOU (28). Revisor: 7 achados; 6 corrigidos, 1 (arrastar botão no Firefox) testado e não se confirmou. Densidade não medida: só mudou o rótulo da seção.
- NÃO VERIFICADO: aparelho real (fica na A1). Corrigido em 12/11: o "volta ao Início ao recarregar" visto no teste era o tour de boas-vindas do primeiro acesso, não defeito; com o tour visto, Quadros e Secretaria abrem pelo endereço e continuam depois de recarregar.
