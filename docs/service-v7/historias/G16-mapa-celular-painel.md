---
id: G16
titulo: Ajustar o mapa do painel ao celular
tipo: codigo
status: feita
quem: claude
desde: 2026-11-06
branch: historia/G16-mapa-celular-painel
depende: [G7]
tamanho: M
---

## Por quê
No celular, camadas e balão precisam virar folhas que sobem e a barra de ferramentas uma fileira rolável.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P2, P3 e P4.

## Arquivos (trilho)
- `app/service/modules/mapa/mapa.css`
- `app/service/modules/mapa/MapaIgreja.tsx`
- `docs/service-v7/historias/G16-mapa-celular-painel.md`
- `app/service/ui/Balao.tsx`, `app/service/ui/biblioteca.css`, `docs/service-v7/BIBLIOTECA.md`, `app/service/ui/README.md` (prop `folha` do Balão)
- `app/service/modules/mapa/camadas.ts` (camada da minha posição), `app/service/modules/mapa/manifest.ts` (densidade no celular)

## Pronto quando
- Botão Camadas abre a folha das camadas; tocar num ponto sobe a folha do balão; fundo escurece e fecha ao tocar fora.
- Barra de ferramentas rolável com Emergência no fim; 3D e minha posição à direita.
- Testado em 390 px e respeitando a área segura; alvos de 44 px.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
2026-11-06, feita (claude): no celular (até 860 px) a busca e o botão Camadas ficam no topo; Camadas abre uma Folha com os mesmos grupos e o rodapé do painel; tocar num ponto abre o balão como Folha (prop `folha` do Balão); fundo escurece e tocar fora ou arrastar a alça fecha. Barra em fileira que rola com Emergência no fim; à direita 3D e Minha posição (localização do aparelho, só no aparelho; sem permissão, aviso dizendo como liberar). Alvos de 44 px; o "i" dos créditos do mapa ganhou área de toque de 44 px; o painel do computador não pisca mais antes da troca. 390×844 com scripts/medir-densidade.js: 14 ações (limite 12, FORA DA LEI, justificativa em mapa/manifest.ts; casca 4), 11 palavras, 0 sobreposições, 0 alvos pequenos; antes 18 ações e 1 sobreposição (G7-6). Computador sem mudança (balão preso, 3D, aproximar e afastar). Fotos G16-1 a G16-4; a posição do sucesso foi simulada no navegador de teste, que nega a localização. Revisão (subagente) corrigida antes do PR: enquadramento sem margem do painel no celular, "i" dos créditos de volta ao canto, alça das folhas sem rolagem lateral, fechar das folhas, sugestões e links do rodapé com 44 px, folha de camadas que não reabre sozinha, Minha posição com estado de procura.
