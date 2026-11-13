---
id: Q25
titulo: Botão de ajuda sai do canto flutuante e vai pra barra do topo (também no desktop)
tipo: codigo
status: feita
quem: claude
desde: 2026-11-13
branch: historia/Q25-ajuda-barra-desktop
depende: []
tamanho: P
---

## Por quê
Continuação da Q24 (parte 2, que ficou bloqueada esperando decisão do usuário). O botão
flutuante de ajuda (`?`, `position:fixed` no canto inferior direito) cobre conteúdo real em
várias telas do painel desktop (Pessoas, Financeiro, Configurações, Permissões), porque o app
rola a janela inteira e o botão fica sempre no mesmo lugar da tela, não do documento.

O usuário escolheu, entre 3 caminhos documentados na Q24: mover o "?" para a barra do topo
também no desktop (a variante `lugar="barra"` já existe no código e já é usada no celular).

## Arquivos (trilho)
- `docs/service-v7/historias/Q25-ajuda-barra-desktop.md`
- `evolucoes/service_app/service-app.css`
- `app/service/ServiceExactApp.tsx` (se precisar ajustar o uso do `<HelpFab>`)
- `app/service/HelpSystem.tsx` (se precisar ajustar `data-tour`/estilos)

## Pronto quando
- No painel desktop, o "?" aparece na barra do topo (como já é no celular), nunca mais
  flutuante cobrindo conteúdo.
- O passo do tour de onboarding que aponta pro botão de ajuda continua funcionando.
- `scripts/validar.sh` completo: TUDO PASSOU; testado ao vivo (servidor local) sem sobreposição
  nas telas antes afetadas (Pessoas, Financeiro, Configurações, Permissões).

## Notas
2026-11-13 (claude): feita. O usuário escolheu, entre os 3 caminhos da Q24, mover o "?" pra
barra do topo também no desktop.

**Mudanças:**
- `evolucoes/service_app/service-app.css`: `.help-fab-wrap.flutuante{display:none}` passou a
  valer em toda largura (antes só no celular); os estilos que eram só do
  `@media(max-width:740px)` para `.na-barra` (tamanho do botão, posição do menu) viraram globais.
  A regra `.top.search-open .help-fab-wrap.na-barra{display:none}` (específica da busca em tela
  cheia do celular) continua só no mobile.
- `app/service/ServiceExactApp.tsx`: removida a segunda instância de `<HelpFab>` (a que
  renderizava a variante flutuante fora do `<main>`) — ficava sempre escondida pelo CSS agora,
  então virou código morto puro (confirmado pelo `revisor`: mesmos `onTour`/`onSetup`, sem
  Coachmark própria, sem efeito colateral de existir fora do `<main>`). Também removida a classe
  `help-fab-reserve` do `className="main"`, que não tinha mais função.
- `app/service/ui/biblioteca.css`: removida a regra `.main.help-fab-reserve .content{padding-bottom:calc(96px + ...)}`.
  O `revisor` achou essa regra (eu tinha olhado só `service-app.css` na Q24 e não vi que havia
  uma segunda folha de estilo com uma regra mais específica fazendo a mesma reserva; sem essa
  remoção, a limpeza da Q25 em `service-app.css` não tinha efeito nenhum na tela, porque esta
  regra, mais específica, continuava valendo).
- `app/service/HelpSystem.tsx`: `lugar` default mudou de `"flutuante"` para `"barra"`; o
  atributo `data-tour="ajuda-fab"` (usado pelo tour de onboarding) passou a ir na variante
  "barra" (antes ia na flutuante, que não aparece mais em lugar nenhum).

**Testado ao vivo** (servidor local + Supabase local deste aparelho, nunca produção): Pessoas,
Financeiro, Configurações e Início, que tinham sobreposição real (`nSobre` 1 ou 2), agora dão
`nSobre: 0`. O botão de ajuda aparece na barra do topo, o clique abre o menu, o passo do tour
(`[data-tour="ajuda-fab"]`) acha e aponta pro elemento certo. `scripts/validar.sh` completo:
TUDO PASSOU. Revisado pelo `revisor` em duas rodadas (achou a regra duplicada em
`biblioteca.css`, que corrigi antes de fechar).

**Nota para quem olhar essa história depois:** isto fecha a Q24 por completo (parte 1: menu
lateral; parte 2: botão de ajuda). Qualquer tela do painel ainda acima do limite de 25 ações
(Pessoas, Financeiro, Configurações continuam um pouco acima mesmo com os dois fixes) é
densidade do CONTEÚDO de cada tela, não do menu nem do botão de ajuda — frente própria, tela a
tela, não aberta aqui.
