---
id: M7
titulo: Criar a aba Meus times para quem lidera
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-11
branch: historia/M7-aba-meus-times
depende: []
tamanho: G
---

## Por quê
O líder de time (ex.: louvor, recepção) precisa cuidar dos seus times no celular sem abrir o painel de gestão. Decisão D2 de 04/11 (MANIFESTO 2c.1, lei 1 revisada).

## Arquivos (trilho)
- `app/service/MobileApp.tsx`
- `app/service/modules/registry.ts`
- `app/service/modules/define.ts`
- `app/service/membro/MeusTimes.tsx` (novo)
- `app/service/modules/escalas/manifest.ts`

## Pronto quando
- A 5ª aba aparece só para quem lidera ao menos um time e some quando a pessoa deixa de liderar.
- Com um time, abre direto nele; com vários, uma linha por time, problemas primeiro.
- Dentro do time: próximo culto e quem confirmou, pessoas do time, pedidos de troca e aviso ao time.
- Cartões de líder no Início abrem o time certo dentro da aba.
- Nome da aba pelo vocabulário (lei 7), alvos de 44px, peças da BIBLIOTECA (lei 17).
- Fotos em 390 com líder de um time, líder de três times com nomes longos e membro sem time (sem a aba). Densidade da lei 13 com número e limite.

## Notas
Começa pela lei 16: ver como Church Center (Meus grupos) e um app de escala resolvem a tela do time.
Montar a escala do mês inteiro continua no painel.
