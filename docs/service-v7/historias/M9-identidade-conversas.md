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
Prova anterior à correção, sessão autenticada de membro@teste.local: a consulta members?select=*&order=name devolveu somente Maria Membro (b98b8a47-69b9-4112-a392-60b0fa36d174), em 1255 ms. chat_members?select=* devolveu seis vínculos para as três conversas visíveis. A DM mais recente, 784ad353-7ae3-4e37-9320-29f77f550563, é kind dm, name null e tem Maria e e6b79690-17e5-40ec-b553-9a0f9064af19 (Marta Master). O id da líder chega em chatMembers, mas sua ficha não chega em members.

Causa: política restritiva svc_r_scope de service.members, criada na migração 0044_service_rls_leitura_por_liberacao.sql, linhas 128 a 134. Ela permite service.can_read para membros/batismos ou as fichas de service.my_members(); o membro sem liberação vê só a própria ficha. Em chat_members, svc_r_scope da mesma migração (linhas 293 a 295) permite os vínculos das conversas legíveis. O carregador lib/server/carregar.ts consulta members.select("*").order("name") e chat_members.select("*"); não há consulta de identidade mínima dos interlocutores. TabConversas encontra o id da líder e falha ao procurá-lo no conjunto restrito de fichas completas. Como name da DM é null, aparece Conversa/CO. No painel há ainda um defeito próprio: chatName() usa name/ministry, sem resolver a outra pessoa, mesmo quando a ficha é legível.

A foto original foi tirada e aberta antes de alterar o código: três linhas Conversa com CO. __medir(44): 11 ações/12, 74 palavras/80. MD5 81178a78f16c1df3dcd49ec481c43658. A autenticação funcionava; as primeiras navegações simultâneas falharam com statement timeout no carregador durante a compilação fria. Depois de isolar as consultas e terminar a compilação, a captura padrão passou. Nenhum erro foi usado como foto.

## Pronto quando
- Lista e título de conversa a dois usam nome e foto da outra pessoa, nos dois lados.
- O membro não recebe mais dados do líder além do nome e da foto necessários à identificação.
- Participante indisponível tem texto honesto, sem o fallback Conversa.
- Fotos antes/depois, conversa aberta e painel abertas e medidas; verificações e CI verdes.
- PR para main, sem merge, servidor encerrado e porta livre.

## Notas
Reservada por codex para diagnóstico e correção com evidências.
