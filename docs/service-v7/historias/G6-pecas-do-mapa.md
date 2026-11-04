---
id: G6
titulo: Criar as peças do mapa na biblioteca
tipo: codigo
status: feita
quem: claude
desde: 2026-11-04
branch: historia/G6-pecas-do-mapa
depende: []
tamanho: M
---

## Por quê
A tela nova do mapa precisa de peças que a biblioteca ainda não tem: painel flutuante de camadas (e o trilho recolhido), linha de camada com interruptor e ícone que é o próprio marcador, barra de ferramentas, balão preso a um ponto do mapa, ícones novos e os marcadores novos (igreja em âmbar com silhueta, célula, lugar da igreja, selecionado). A Folha, a Janela, o Segmentado, o Interruptor e o avisar() já existem e são reaproveitados.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P1 e P6.

## Arquivos (trilho)
- `app/service/ui/PainelMapa.tsx`
- `app/service/ui/BarraFerramentas.tsx`
- `app/service/ui/Balao.tsx`
- `app/service/ui/biblioteca.css`
- `app/service/ui/README.md`
- `docs/service-v7/BIBLIOTECA.md`
- `app/service/lib/icons.tsx`
- `app/service/modules/mapa/estilo.ts`
- `app/service/modules/mapa/marcadores.ts`
- `app/service/modules/mapa/mapa.css`
- `scripts/check-service-componentes.ts`
- `app/service/demo/biblioteca`
- `docs/service-v7/historias/G6-pecas-do-mapa.md`

## Pronto quando
- Peças novas com ficha de entrada e linha na BIBLIOTECA, visíveis em /service/demo/biblioteca, no claro e no escuro.
- Balão abre a partir do ponto, vira para o outro lado perto da borda e fecha com Esc; painel recolhe no trilho de ícones com mola.
- Ícones novos no traço do conjunto do Service (camadas, concentração, moradores, presença, idade, comparar idades, criar área, rota, linha do tempo, marcar lugar, analisar, emergência, 3D, minha posição, ímã) e marcadores desenhados para o MapLibre.
- Cores do mapa só da paleta fixa; o âmbar `#D6A23E` fica reservado à igreja.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
04/11/2026, feita (claude). Peças `PainelMapa` (com `GrupoCamadas`, `LinhaCamada`, `TransparenciaCamada`, `EscalaTons`, `MarcaCamada`), `BarraFerramentas` (prop `desloc` para centrar no espaço livre ao lado do painel; ignorada abaixo de 860 px) e `Balao` (com `LinhaBalao`; encolhe e fica solto quando não cabe de nenhum lado), 18 ícones novos em `icons.tsx` e 6 marcadores em `modules/mapa/marcadores.ts`. Galeria viva: bloco E em /service/demo/biblioteca.
Verificado: typecheck 0 erros; eslint 0 erros (1 aviso proposital: `<img>` dos marcadores na galeria, SVG em data URL); `check-service-componentes` ok; lei 12 sem piora. Fotos em `screenshots/G6-1-claro-1366.jpg`, `G6-2-recolhido-balao-borda.jpg`, `G6-3-escuro-1366.jpg`, `G6-4-claro-390.jpg`: painel com grupos e interruptores, legenda da presença, balão no ponto, barra com Emergência separada, trilho recolhido, balão virando perto da borda, modo escuro e 390 px sem rolagem lateral. Esc fecha o balão; linhas de camada com `aria-checked`. As fotos mostraram três defeitos, corrigidos antes do PR: ícone de igreja cortado no quadradinho, barra cobrindo o painel e balão saindo do mapa em 390 px.
Fora desta história: densidade (lei 13) só nas telas que usam as peças (G7 em diante); regra no `check-service-componentes` contra `.mp-painel` à mão fica para a G7, que tira o markup antigo do mapa; testar com 4 cores de igreja ficou só na verde padrão (claro e escuro). Servidor de prova rodou no terminal, dentro do worktree, sem `.env.local` (o painel de prévia sobe no checkout principal e foi parado duas vezes antes de abrir página).
Revisão (subagente revisor) antes do PR: corrigidos foco e Esc do balão (efeito só ao abrir; Esc na fase de bolha, só com foco no balão e nada aberto por cima), barra que pulava na entrada (keyframe com `translate`), altura medida na largura final e reposição quando o contêiner muda (`ResizeObserver`), marcador que falha não derruba os outros, tons da presença movidos para a paleta do mapa (`mapa.css`, `--mapa-tom-1` a 5; arquivo entrou no trilho), nome falado da linha de camada só com o rótulo (detalhe vira descrição), `aria-pressed` explícito, grupo fechado com `hidden` e `alt` vazio nos marcadores da galeria. Fica para a G16: no celular, a barra que não é `fileira` passa por cima do painel em folha (a G16 usa `fileira` e a Folha).
04/11/2026, retorno do usuário: a fileira de marcadores com rótulo na galeria parecia uma legenda fixa e "ficou horrível". Tirada; os marcadores aparecem sobre o mapa da galeria, nas posições de exemplo (foto `G6-1` refeita; `G6-3` e `G6-4` ainda mostram a fileira antiga embaixo do mapa). Decisão para a G7: nada de legenda fixa no mapa; um link pequeno "Entenda o mapa" no rodapé do painel abre uma janela curta com os marcadores e as cores.
