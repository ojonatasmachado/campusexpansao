---
id: G17
titulo: Refazer o Onde e o aceite do mapa no app do membro
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-06
branch: historia/G17-membro-onde-aceite
depende: [G6]
tamanho: M
---

## Por quê
O Onde tem mapa pequeno com lista embaixo e o aceite fala em "sua célula", supondo o modelo da igreja.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P14, P15 e P16.

## Arquivos (trilho)
- `app/service/membro/Onde.tsx`
- `app/service/membro/AceiteMapa.tsx`
- `docs/service-v7/historias/G17-membro-onde-aceite.md`

## Pronto quando
- Onde com mapa cheio, filtros por cima e folha "Perto de você" (puxa para a lista toda, toca abre o detalhe).
- Detalhe com "Mandar mensagem para {nome}", "Quero participar" quando há vaga e "Como chegar".
- Aceite com os 3 pontos em ícone e texto pelo vocabulário ("seu {grupo}"; some se a igreja não usa grupos); "Concordo e continuar" e "Agora não".
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
