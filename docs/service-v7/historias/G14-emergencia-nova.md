---
id: G14
titulo: Refazer a emergência com formas e situação no mapa
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-06
branch: historia/G14-emergencia-nova
depende: [G10]
tamanho: M
---

## Por quê
A emergência desenha a área só canto a canto e mostra a situação das famílias só na lista. Decisão: as ferramentas do Criar área, um ponto por família com a situação e a mensagem editável.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P12 e P13.

## Arquivos (trilho)
- `app/service/modules/mapa/Emergencia.tsx`
- `docs/service-v7/historias/G14-emergencia-nova.md`

## Pronto quando
- Área atingida com as mesmas formas e alças do G10; famílias e pessoas na área contam ao vivo.
- Cada família é um ponto por situação (sem resposta, está bem, precisa de ajuda) com balão: situação trocável, endereço com um toque e registro, ligar e mensagem.
- "Perguntar a quem não respondeu" abre prévia com o texto pronto e editável antes de enviar.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
