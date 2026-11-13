---
id: O8
titulo: Criar o pedido Quero fazer parte no app
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-12
branch: historia/O8-quero-fazer-parte
depende: []
tamanho: P
---

## Por quê
Quem frequenta e quer virar membro não tem como dizer isso pelo app; a trilha até virar membro existe, sem o pedido. Decisão D6 de 04/11, Onda 1 (MANIFESTO 2c.5). Fonte: JORNADAS_PONTE.md seção 1, "Membro no celular".

## Arquivos (trilho)
- `app/service/membro/Caminhada.tsx`
- `app/service/membro/Inicio.tsx`
- `app/service/modules/visitantes/manifest.ts`
- `supabase/migrations/0111_service_quero_fazer_parte.sql` (situação inicial do link, pedidos, funções)
- `app/service/modules/entrada/EntradaConfig.tsx` (quem entra pelo link: membro ou frequentador)
- `app/service/painel/telas/Visitantes.tsx` (pedidos para fazer parte)
- `app/service/lib/destinatario.ts` (tipo `fazer_parte`)
- `app/service/lib/server/carregar.ts` (pedido da pessoa e pedidos pendentes)
- `app/service/MobileApp.tsx` e `app/service/ServiceExactApp.tsx` (só passar dados e ações)
- `app/service/lib/internacional/mensagens/` (catálogos)
- `docs/service-v7/historias/screenshots/O8-*.png`
- `docs/service-v7/PENDENTES.md` (tirar a O8 da ordem)

## Pronto quando
- O membro ainda não membro vê "Quero fazer parte" uma vez, no lugar que responde à pergunta da aba (lei 2), e o pedido chega para quem acompanha a trilha.
- Quem pediu vê o estado: enviado, em conversa, concluído. Nada de "pedido recebido" sem responsável.
- Quem já é membro não vê o botão.
- Fotos em 390 e no painel de quem recebe.

## Notas
Começa pela lei 16. Conferir antes como `app/service/participar/` (entrada por código) se relaciona, para não criar duas portas.
