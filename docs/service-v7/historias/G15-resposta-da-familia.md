---
id: G15
titulo: Deixar a família responder a emergência com um toque
tipo: codigo
status: feita
quem: claude
desde: 2026-11-06
branch: historia/G15-resposta-da-familia
depende: [G14]
tamanho: M
---

## Por quê
Hoje quem coordena marca à mão se a família está bem. Função nova decidida em 04/11: a mensagem da emergência traz "Estamos bem" e "Precisamos de ajuda", e a resposta muda a situação sozinha.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P13.

## Arquivos (trilho)
- `supabase/migrations/0103_service_emergencia_resposta.sql`
- `app/service/modules/mapa/manifest.ts`
- `app/service/modules/mapa/Emergencia.tsx`
- `app/service/membro/Conversas.tsx`
- `app/service/ui/biblioteca.css`
- `app/service/modules/mapa/mapa.css`
- `docs/service-v7/producao.sql`
- `docs/service-v7/historias/G15-resposta-da-familia.md`

## Pronto quando
- A família recebe a pergunta com os dois botões; tocar grava a resposta e a situação muda no painel sem recarregar.
- A lista mostra "respondeu às HH:MM" ou "marcado por {nome}".
- Quem coordena ainda pode corrigir à mão; tudo registrado. Cartão e aviso seguem o contrato de módulos (leis 5, 9 e 11).
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
06/11/2026 (claude): migração 0103 com map_emergency_asks (cada pergunta é uma mensagem registrada), fonte da situação (coordenação ou família) e as funções perguntar, minhas perguntas e responder. Na conversa do membro a pergunta traz "Estamos bem" e "Precisamos de ajuda"; o toque grava e a lista do painel muda sozinha (recarga a cada 15 s), com "respondeu às HH:MM" ou "marcado por {nome}". A pergunta vai para todos da família. Aviso declarado no manifesto (Mensagens, cartão pedido). Testado de ponta a ponta no local: Marta perguntou, Lucas respondeu no app, o painel mudou sem recarregar. Densidade da lista: 37 ações e 133 palavras (casca 24). Fotos G15-1 a G15-3.
