---
id: G14
titulo: Refazer a emergência com formas e situação no mapa
tipo: codigo
status: feita
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
- `app/service/modules/mapa/AreaDesenhada.tsx`
- `app/service/modules/mapa/posicao.ts`
- `app/service/modules/mapa/CriarArea.tsx`
- `app/service/modules/mapa/MapaIgreja.tsx`
- `app/service/modules/mapa/contexto.ts`
- `app/service/modules/mapa/mapa.css`
- `app/service/modules/mapa/manifest.ts`
- `supabase/migrations/0102_service_mapa_emergencia_pontos.sql`
- `docs/service-v7/producao.sql`
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
06/11/2026 (claude): a área atingida usa a mesma barra e o mesmo desenho do Criar área (extraídos para AreaDesenhada.tsx; o balão preso ao ponto virou usePosicaoNoMapa em posicao.ts). Migração 0102: ponto de cada família (média, ~10 m) e quem marcou; mapa_emergencia_previa conta famílias e pessoas ao vivo. Balão da família com situação trocável, endereço com registro, Ligar e Mensagem; prévia editável antes de perguntar. Densidade P12 32/98 (antes 27/85) e P13 com a família aberta 42/163, justificadas no manifesto. Fotos G14-0 a G14-3.
