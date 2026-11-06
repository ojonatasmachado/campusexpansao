---
id: G16
titulo: Ajustar o mapa do painel ao celular
tipo: codigo
status: reservada
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
