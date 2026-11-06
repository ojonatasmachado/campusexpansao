---
id: G11
titulo: Levar rota, linha do tempo e marcar lugar para o painel
tipo: codigo
status: feita
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
- `app/service/modules/mapa/MapaIgreja.tsx`, `camadas.ts`, `contexto.ts`, `linguagem.ts`, `mapa.css`, `manifest.ts` (balão do lugar com editar, ocultar e excluir; fidelidade à P1)
- `app/service/ui/PainelMapa.tsx`, `app/service/ui/Balao.tsx`, `app/service/ui/biblioteca.css`, `docs/service-v7/BIBLIOTECA.md`, `app/service/ui/README.md` (`amostra`, `LotacaoBalao`, `NotaBalao`, classe `pm-ferramenta`)

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
2026-11-06, feita (claude): Traçar rota (P9) no painel da ferramenta com Voltar ao mapa: objetivos em pílulas, Paradas e Melhor ordem, saída fixa na sede, paradas que se reordenam arrastando (ou com as setas na alça), Percorrer a área, A pé ou Carro, resultado em cartão, Nome e Quando, equipe e as três saídas. Linha do tempo (P10): só números, sem frase de leitura; De perto acende os pontos de quem chegou, Cidade toda mostra bolhas "+N" por bairro; play anda pelo período; Último ano e Desde o começo. Marcar lugar (P11): tocar no mapa solta o marcador e abre o balão (nome, tipo em cartões, endereço opcional, observação); editar, ocultar e excluir no balão do lugar da tela principal, e "Mostrar os ocultos" nos Lugares da região. A pedido do usuário (05/11, "telas não fiéis ao canvas"), a tela principal foi conferida com a P1 e ajustada: nome da igreja acima do título, busca "Buscar pessoa, bairro ou lugar", "membros e novos", grupos sem detalhe, legenda da presença com as pontas da prancha (cortes 2.000, 1.000, 400, 100), "Áreas da igreja · N" com a cor de cada área, lugares como linhas recuadas, rodapé alinhado, balão do grupo com bloco de lotação e botão discreto, controles 3D, aproximar e afastar num cartão só. Densidade 1366×860 com scripts/medir-densidade.js (casca 24 ações): Traçar rota 39 ações e 103 palavras (antes 37 e 127), Linha do tempo 32 e 96 (antes 30 e 108, 1 sobreposição e 2 alvos pequenos), Marcar lugar 25 e 47 (antes 36 e 101), as duas primeiras FORA DA LEI com justificativa em mapa/manifest.ts; 390×844 Traçar rota 18 ações, 64 palavras, 0 sobreposições, 0 alvos pequenos. Fotos G11-0a a 0c (antes), G11-1 a G11-5. Revisão (subagente) corrigida antes do PR: salvar observação de lugar do OpenStreetMap sem nome, pontos da linha do tempo pelo mesmo corte de ano do servidor, link do app de mapas com até 11 pontos (saída, 9 no meio e a última) e aviso na mensagem, alça que mantém o foco e anuncia a posição, toque na alça sobe a parada (celular), arrasto que funciona no Firefox e não treme, melhor ordem sem perder parada incluída na espera, resposta antiga da linha do tempo descartada, erro de rota limpa o resultado e mostra a mensagem do servidor, "Mostrar os ocultos" que volta desligado, "1 pessoa chegou".
