---
id: G11
titulo: Levar rota, linha do tempo e marcar lugar para o painel
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-06
branch: historia/G11-ferramentas-no-painel
depende: [G7]
tamanho: G
---

## Por quê
As ferramentas abrem hoje painéis próprios em lugares diferentes. Decisão: o painel da ferramenta ocupa o lugar das camadas, a linha do tempo mostra só números e Marcar lugar vira um balão.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P9, P10 e P11.

## Arquivos (trilho)
- `app/service/modules/mapa/Rota.tsx`
- `app/service/modules/mapa/LinhaDoTempo.tsx`
- `app/service/modules/mapa/Pontos.tsx`
- `docs/service-v7/historias/G11-ferramentas-no-painel.md`

## Pronto quando
- Traçar rota: objetivos em pílulas, paradas reordenáveis arrastando, melhor ordem, a pé ou carro, percorrer a área, equipe, enviar.
- Linha do tempo: sem frases de leitura; de perto os pontos de quem chegou acendem no play, com a cidade toda aparecem bolhas "+N" por bairro.
- Marcar lugar: tocar no mapa solta o marcador e abre o balão (nome, tipo, endereço opcional, observação); editar, ocultar e excluir no balão do lugar.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
