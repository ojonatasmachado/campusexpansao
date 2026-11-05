---
id: G7
titulo: Refazer a tela principal do mapa
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-05
branch: historia/G7-tela-principal-mapa
depende: [G6]
tamanho: G
---

## Por quê
A tela principal ainda tem as visões prontas ("Onde falta igreja", "Células e cobertura"), o "Comece por aqui", o menu Ferramentas escondido e o painel lateral de detalhe. O usuário decidiu camadas que se somam, barra de ferramentas visível, balão no ponto e nenhum aviso automático.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P1 (claro e escuro).

## Arquivos (trilho)
- `app/service/modules/mapa/MapaIgreja.tsx`
- `app/service/modules/mapa/MapaBase.tsx`
- `app/service/modules/mapa/camadas.ts`
- `app/service/modules/mapa/linguagem.ts`
- `app/service/modules/mapa/mapa.css`
- `docs/service-v7/historias/G7-tela-principal-mapa.md`

## Pronto quando
- Saem: as 4 visões, o "Comece por aqui", o anel de alerta de 2 km, o painel da direita e todo texto que conclui "falta igreja".
- Painel de camadas com os 4 grupos e os nomes do PLANO §10; camadas somam, cada uma com transparência; grupos só aparecem se a igreja usa grupos.
- Barra de ferramentas embaixo com Emergência à parte (só para quem coordena); balão com tudo ao tocar pessoa, sede, grupo, bairro ou área.
- 3D, aproximar e afastar no canto; rodapé "Nenhum endereço aparece no mapa" com "N pessoas sem CEP" e "Quem vê o mapa".
- Funciona no tema claro e no escuro da igreja.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
