---
id: M9
titulo: Identificar a outra pessoa nas conversas a dois
tipo: codigo
status: feita
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
- `app/service/modules/conversas/conversas.css`
- `app/service/modules/conversas/manifest.ts`
- `supabase/migrations/0105_service_chat_identidades.sql`
- `docs/service-v7/producao.sql`
- `scripts/check-service-chat-identidade.ts`
- `.github/workflows/service.yml`
- `supabase/tests/chat_identidades.sql`
- `docs/service-v7/historias/screenshots/M9-*.png`
- `docs/service-v7/PENDENTES.md`

## Causa
Prova anterior à correção, sessão autenticada de membro@teste.local: a consulta members?select=*&order=name devolveu somente Maria Membro (b98b8a47-69b9-4112-a392-60b0fa36d174), em 1255 ms. chat_members?select=* devolveu seis vínculos para as três conversas visíveis. A DM mais recente, 784ad353-7ae3-4e37-9320-29f77f550563, é kind dm, name null e tem Maria e e6b79690-17e5-40ec-b553-9a0f9064af19 (Marta Master). O id da líder chega em chatMembers, mas sua ficha não chega em members.

Causa: política restritiva svc_r_scope de service.members, criada na migração 0044_service_rls_leitura_por_liberacao.sql, linhas 128 a 134. Ela permite service.can_read para membros/batismos ou as fichas de service.my_members(); o membro sem liberação vê só a própria ficha. Em chat_members, svc_r_scope da mesma migração (linhas 293 a 295) permite os vínculos das conversas legíveis. O carregador lib/server/carregar.ts consulta members.select("*").order("name") e chat_members.select("*"); não há consulta de identidade mínima dos interlocutores. TabConversas encontra o id da líder e falha ao procurá-lo no conjunto restrito de fichas completas. Como name da DM é null, aparece Conversa/CO. No painel há ainda um defeito próprio: chatName() usa name/ministry, sem resolver a outra pessoa, mesmo quando a ficha é legível.

As props reais de TabConversas também foram inspecionadas no navegador, antes da correção: members tem somente Maria, chatMembers tem seis vínculos e chats tem três DMs, confirmando os resultados da API.

A foto original foi tirada e aberta antes de alterar o código: três linhas Conversa com CO. __medir(44): 11 ações/12, 74 palavras/80. MD5 81178a78f16c1df3dcd49ec481c43658. A autenticação funcionava; as primeiras navegações simultâneas falharam com statement timeout no carregador durante a compilação fria. Depois de isolar as consultas e terminar a compilação, a captura padrão passou. Nenhum erro foi usado como foto.

## Correção e contrato de privacidade

A migração 0105 cria service.chat_identidades(), SECURITY DEFINER com search_path vazio, sem parâmetro que permita escolher pessoa ou conversa alheia. Retorna apenas chat_id, member_id, name e photo_url. Exige auth.uid(), acesso ativo ao produto na organização e participação via my_chats(). Os joins conferem a organização de conversa, vínculo, membro e foto. PUBLIC e anon não executam; authenticated executa. Nenhuma política de members ou people foi ampliada.

O carregador consulta a projeção em paralelo e acrescenta somente name/photo_url aos vínculos já legíveis. members permanece restrito à ficha da Maria. A consulta foi verificada com a mesma sessão: seis identidades para as três conversas, incluindo Marta e Lucas, e a lista de members continua com apenas Maria. Não foram fabricadas fichas completas nem usado service_role no carregamento.

Uma função compartilhada em modules/conversas/identidade.ts resolve lista, título aberto e painel. A casca guarda o id aberto, não um nome que pode ficar desatualizado. A foto vem da projeção mínima; sem foto usa as iniciais reais. DM sem exatamente uma outra pessoa identificável mostra Pessoa indisponível, inclusive quando existe nome antigo na conversa. Grupos e canais preservam seus nomes, com Grupo sem nome ou Time indisponível quando necessário.

Jornada: começa em Mensagens ou Conversas, chega à DM por clique e identifica com quem a pessoa fala. Depende somente de participar da conversa e de existir o registro da outra pessoa. Sem conteúdo, mantém Nenhuma mensagem ainda; sem interlocutor, Pessoa indisponível; sem autorização, não há projeção; erro de leitura segue o erro da casca. Não foi criado fluxo novo nem peça visual nova: usa Avatar/Av, Acao, Entrada e as peças existentes da BIBLIOTECA. O contraste e a reserva de espaço para ajuda foram ajustados somente no painel de Conversas, sem mudar classes globais.

## Pronto quando
- Lista e título de conversa a dois usam nome e foto da outra pessoa, nos dois lados.
- O membro não recebe mais dados do líder além do nome e da foto necessários à identificação.
- Participante indisponível tem texto honesto, sem o fallback Conversa.
- Fotos antes/depois, conversa aberta e painel abertas e medidas; verificações e CI verdes.
- PR para main, sem merge, servidor encerrado e porta livre.

## Fotos e medição

Login pelo formulário, localhost:3109, tour fechado e selo Next conferido oculto. Antes e depois com foto.mjs; aberta, painel e caso indisponível pelo mesmo método, em script fora do repositório. Todas as imagens foram abertas. __medir(44) no app 390×844 (limites 12 ações/80 palavras), __medir(24) no painel 1366×860 (25/100), sempre na mesma tela da foto.

| Foto | Vista conferida | Ações / limite | Palavras / limite | MD5 |
|---|---|---:|---:|---|
| [Antes](screenshots/M9-antes.png) | Três DMs como Conversa e avatar CO | 11 / 12 | 74 / 80 | 81178a78f16c1df3dcd49ec481c43658 |
| [Depois](screenshots/M9-depois.png) | Marta Master, Lucas Líder e Marta Master; imagem da outra pessoa | 11 / 12 | 77 / 80 | b1751ce24c3f832a68a0b060f80e2c8e |
| [Aberta](screenshots/M9-aberta.png) | Clique na DM: título Marta Master no topo | 9 / 12 | 32 / 80 | 4d31ceb3af4c2783be8581dfd6ee67c4 |
| [Painel](screenshots/M9-painel.png) | master: Maria Membro na lista e no título, imagem dela no cabeçalho | 39 / 25 | 317 / 100 | dd367efaae813782487205d5dbcf58fe |
| [Indisponível](screenshots/M9-indisponivel.png) | DM de teste com só Maria no vínculo: título Pessoa indisponível | 7 / 12 | 12 / 80 | 2fb39301a8fe51fc93751dd5c6e6e672 |

As contas do seed não tinham foto. Dois PNGs existentes e diferentes foram usados temporariamente como imagens de teste, não como fotos reais: logo-teste.png para Marta, icon-192.png para Maria. O navegador conferiu a URL correta da imagem no avatar em cada lado; as imagens foram desfeitas depois. O caso indisponível foi uma conversa temporária com um único participante, equivalente ao vínculo restante após remoção da outra pessoa. Nenhuma senha foi alterada; as imagens de teste foram restauradas.

Crítica: nomes reais acrescentam três palavras na lista do membro, sem aumentar ações e mantendo os limites. O painel segue fora da lei 13: 39 ações, 317 palavras, três molduras e dois botões cheios (um desativado), com justificativa no manifesto de Conversas. Não se ocultou lista ou texto para alterar a medida. As fotos finais não têm alvos abaixo de 24 px, sobreposições ou rolagem lateral. No painel, a seleção tinha dois textos a 4,45:1 e a ajuda cruzava campo/Enviar; o ajuste local removeu as reprovações de contraste e as duas sobreposições. O axe final do painel teve zero violações, com quatro verificações de contraste incompletas. Na conversa aberta e no caso indisponível, o axe aponta o h1 da casca fora de landmark e uma verificação incompleta de contraste; não foi alterada a estrutura global da casca. Não se testou aparelho real ou leitor de tela.

## Verificações e banco

O teste SQL supabase/tests/chat_identidades.sql usa fixtures dentro de transação e ROLLBACK. Passou no banco local: identidade com nome/foto, ficha privada ainda oculta, somente participantes, master sem acesso à conversa alheia, isolamento entre organizações, sessão sem usuário, anon sem execute e membro suspenso. O papel usado é membro, conforme a migração 0043. O contrato TS cobre os dois lados, foto, removido, nome antigo, ambiguidade, grupo e canal. Ambos entram no CI Service; o teste SQL roda no banco descartável v7ci depois das migrações.

Apenas 0105 foi aplicada no banco local; pacote producao.sql regenerado e conferido. Restauração dos dados visuais: DELETE 1, UPDATE 1 + UPDATE 1 (fotos e timestamps), UPDATE 30 (marcadores de leitura); trigger de timestamp reativado. Snapshots canônicos de pessoas/fotos, conversas, participantes/leituras e mensagens idênticos antes/depois (cmp sem diferenças). SHA256 cc328ac59fa7c8f753ecba2e137a6ea11fc2bbbb6f5eb95611b4ac4f3fc550fb. A migração permanece aplicada; não houve reset.

Servidor encerrado: lsof sem listener e bind localhost:3109 OK, porta livre. TypeScript, ESLint dos arquivos tocados, lei 12, componentes, contraste, contrato de identidade e build final: saída 0. O teste SQL de isolamento também passou com ROLLBACK.

O primeiro CI apontou a tradução ausente de Pessoa indisponível. A fonte e os três catálogos foram completados; o contrato de internacionalização foi executado novamente.

## Notas
Feita em 09/11/2026 por codex: causa provada antes da correção, identidade mínima autorizada nos dois lados, fallback honesto, cinco fotos abertas, testes e build locais aprovados, dados restaurados e servidor encerrado; PR para revisão, sem merge.
