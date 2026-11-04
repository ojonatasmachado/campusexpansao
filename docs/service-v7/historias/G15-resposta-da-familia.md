---
id: G15
titulo: Deixar a família responder a emergência com um toque
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [G14]
tamanho: M
---

## Por quê
Hoje quem coordena marca à mão se a família está bem. Função nova decidida em 04/11: a mensagem da emergência traz "Estamos bem" e "Precisamos de ajuda", e a resposta muda a situação sozinha.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P13.

## Arquivos (trilho)
- `supabase/migrations/<próximo>_service_emergencia_resposta.sql`
- `app/service/modules/mapa/manifest.ts`
- `app/service/modules/mapa/Emergencia.tsx`
- `app/service/membro/Conversas.tsx`
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
