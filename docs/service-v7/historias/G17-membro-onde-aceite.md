---
id: G17
titulo: Refazer o Onde e o aceite do mapa no app do membro
tipo: codigo
status: feita
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
- `app/service/MobileApp.tsx`
- `app/service/modules/mapa/mapa.css`
- `app/service/modules/mapa/manifest.ts`
- `app/service/ui/biblioteca.css`
- `app/service/lib/termo-mapa.ts`
- `app/service/convite/ConviteForm.tsx`
- `app/service/lib/internacional/mensagens/*.json`
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
06/11/2026 (claude): Onde com o mapa até as abas, filtros por cima e a folha "Perto de você" (toque ou arraste na alça sobe para a lista toda; cada lugar mostra distância e vagas; tocar abre o detalhe com Mandar mensagem, Quero participar e Como chegar). Aceite com os 3 pontos em ícone; o grupo vem do vocabulário ("seu {grupo}") e some se o módulo de grupos está desligado; frases novas no catálogo pt, en e es. Densidade: Onde 14/39 (antes 14/29), justificada; aceite 3/57, dentro. Fotos G17-0 a G17-4. Revisão: altura medida pela área que rola (sem rolar atrás do mapa), créditos do mapa acima da folha, filtros visíveis e inertes com a folha aberta, enquadramento descontando a folha, alça com captura do ponteiro e aria-controls; os 3 pontos moram em pontosDoTermo (aceite e convite) com "o {grupo} de que você participa", sem "sua célula" fixo. O termo completo ainda fala em célula: mudar exige versão nova do termo.
