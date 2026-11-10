---
id: M9
titulo: Identificar a outra pessoa nas conversas a dois
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-09
branch: historia/M9-identidade-conversas
depende: []
tamanho: M
---

## Por quê
Em Mensagens, conversas a dois aparecem como Conversa e avatar CO em vez de nome e foto da outra pessoa. O mesmo fallback afeta o título aberto e a lista do painel. O diagnóstico deve provar quais participantes e perfis chegam ao membro antes da correção.

## Arquivos (trilho)
- `app/service/membro/Conversas.tsx`
- `app/service/MobileApp.tsx`
- `app/service/painel/telas/Conversas.tsx`
- `app/service/page.tsx`
- `app/service/ServiceExactApp.tsx`
- `app/service/painel/tipos.ts`
- `app/service/lib/server/carregar.ts`
- `app/service/lib/server/tipos.ts`
- `app/service/membro/tipos.ts`
- `app/service/modules/conversas/identidade.ts`
- `supabase/migrations/0105_service_chat_identidades.sql`
- `docs/service-v7/producao.sql`
- `scripts/check-service-chat-identidade.ts`
- `.github/workflows/service.yml`
- `docs/service-v7/historias/screenshots/M9-*.png`
- `docs/service-v7/PENDENTES.md`

## Causa
Em investigação. Registrar consulta, dados recebidos com o login do membro e, se aplicável, política RLS e migração responsáveis antes de corrigir.

## Pronto quando
- Lista e título de conversa a dois usam nome e foto da outra pessoa, nos dois lados.
- O membro não recebe mais dados do líder além do nome e da foto necessários à identificação.
- Participante indisponível tem texto honesto, sem o fallback Conversa.
- Fotos antes/depois, conversa aberta e painel abertas e medidas; verificações e CI verdes.
- PR para main, sem merge, servidor encerrado e porta livre.

## Notas
Reservada por codex para diagnóstico e correção com evidências.
