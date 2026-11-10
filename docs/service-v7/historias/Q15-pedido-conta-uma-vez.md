---
id: Q15
titulo: Pedido de conta uma vez só no Início do painel
tipo: codigo
status: feita
quem: codex
desde: 2026-11-10
branch: historia/Q15-pedido-conta-uma-vez
depende: []
tamanho: P
---

## Por quê
O Início da gestão repete pedidos de conta: uma linha no Para resolver e o bloco NovosCadastros logo abaixo. A linha só rola a página. A lei 14 pede uma informação em um lugar.

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/modules/entrada/NovosCadastros.tsx`
- `app/service/modules/entrada/usePedidosConta.ts`
- `docs/service-v7/historias/Q15-pedido-conta-uma-vez.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/Q15-*.png`

## Decisão
Decisão do usuário: fica só a linha no Para resolver. Revisar → abre uma folha existente da biblioteca com pedidos e Aprovar/Recusar. O bloco sai da página. Uma única leitura compartilhada abastece linha e folha. Só master/pastor vê essa função. Não alterar a Caminhada; registrar duplicação se confirmada.

## Pronto quando
- Linha e folha usam os mesmos pedidos, sem consulta duplicada.
- Carregando, erro com Tentar de novo e pronto preservados da Q12.
- Aprovar/recusar atualiza a linha imediatamente; último pedido remove a linha e fila vazia mostra Tudo em dia.
- Folha, Linha e Botao existentes; componentes e checks do Service aprovados.
- Pedidos criados pelo fluxo real local de participar, ou bloqueio comprovado. Nada de reset ou produção.
- Cinco fotos abertas, MD5 e medidas de antes/depois com limites explícitos.
- Caminhada inspecionada, pendência registrada se houver duplicação.
- História feita, pendência removida, PR para main, CI verde e porta livre, sem merge.

## Jornada
Gestão abre Início, vê a linha de pedidos, toca Revisar e resolve dentro da folha. Depende do link de entrada, de pedidos pendentes e da permissão de gestão. Sem conteúdo, a linha some; sem rede, há erro com nova tentativa; sem permissão, linha e folha não são oferecidas.

## Construção
usePedidosConta é a única fonte de entrada_pedidos. O Início carrega para master/pastor e calcula a linha pelo tamanho da própria lista, sem depender de NovosCadastros montado. A folha recebe os dados, carregar e remover; abrir não consulta outra vez. A promessa em andamento é compartilhada também no efeito duplo do Strict Mode, sem cache global; o teste interceptou uma única chamada inicial. A geração da carga descarta resposta antiga e o escopo impede exibir dados da organização anterior. Aprovar/recusar remove o pedido da lista compartilhada após sucesso. Sem pedidos, linha ausente; folha aberta vazia mostra Nenhum pedido pendente. Fora da preparação, o fallback Tudo em dia permanece para quando a fila toda estiver vazia. Durante a preparação inicial, Para resolver só aparece se a fila tiver itens, evitando tanto esconder pedidos quanto contradizer o guia com um estado Tudo em dia.

NovosCadastros usa Gaveta larga, Linha e Botao/BotaoIcone da biblioteca. Preserva busca de ficha, confirmação de recusa, aviso por avisar, erro e nova tentativa. Sem CSS novo, nova peça, migração ou mudança de política. Não sobrou onPedidosChange, entrada-fila ou id novos-cadastros nos dois consumidores; entrada_pedidos aparece apenas no hook.

## Validação visual
Servidor npm run dev:local -- --port 3115 no worktree Q15, Supabase 127.0.0.1:54321. Cookie de login sb-127-auth-token, sem projeto de produção. Cinco fotos novas por tools/captura-service/foto.mjs, com destinos adicionados em memória por loader/hooks em /private/tmp. Ferramenta original intacta; nenhuma dependência nova. Login pelo formulário, localhost, networkidle e texto visível, tour fechado, selo Next escondido e conferido, fontes e animações concluídas, retorno ao topo e __medir(24) imediatamente antes da foto. Todas abertas e descritas.

| Foto aberta | Descrição | Ações / limite | Palavras / limite | Classificação | MD5 |
|---|---|---|---|---|---|
| [Antes, main](screenshots/Q15-antes.png) | Linha com 2 pedidos e bloco Novos cadastros repetem os dois pedidos e suas ações. Inicio.tsx e NovosCadastros.tsx conferidos idênticos ao origin/main antes da captura | 35 / 25 | 146 / 100 | fora da lei | 0279a104947fd0f251b8bb3e2121dddb |
| [Depois](screenshots/Q15-depois.png) | Só a linha com 2 pedidos e Revisar; sem bloco na página | 31 / 25 | 112 / 100 | fora da lei | 2a7b03e1c9b6b3a8cec34f73dcafec49 |
| [Folha aberta](screenshots/Q15-folha.png) | Gaveta com Ana e Bruno, cada um com Aprovar/Recusar | 5 / 25 | 30 / 100 | dentro | d829e92a298bd6bb547080b69dd36ac5 |
| [Após aprovar Ana](screenshots/Q15-aprovado.png) | Linha muda de 2 para 1 pedido; aviso confirma que Ana pode entrar no app | 31 / 25 | 120 / 100 | fora da lei | 323ce577cebbe3e4d5c6d2f895d883ef |
| [Após último pedido](screenshots/Q15-ultimo.png) | Após recusar Bruno, linha ausente; permanecem as duas pendências reais de cobertura | 30 / 25 | 105 / 100 | fora da lei | d9b17bc9554149fa2446e937712c1f76 |

Antes/depois: menos 4 ações e 34 palavras. A casca continua acima de 25/100 e com três molduras; a Q15 não a apresenta como aprovada integralmente pela lei 13. A justificativa herdada da densidade do Início consta no manifesto de entrada (Q12); I3 continua tratando densidade. Sem recorte CSS para forçar números. Todas as medidas sem sobreposição, alvo abaixo de 24 px ou rolagem lateral. Na folha, medidor considera apenas o diálogo; não soma a página sob o véu.

## Fluxo real e dados locais
Antes: service.entry_requests com zero pedidos. Pelo formulário /service/participar/7WKB93KC, preenchidos nome, telefone, e-mail e senha nova para q15.ana@teste.local e q15.bruno@teste.local. POST /api/service/entrada: 200, estado pendente nas duas respostas. SELECT confirmou dois pedidos pendentes. Não houve INSERT por script nem troca de senha existente.

Revisar abriu a folha com zero consultas adicionais. Pela tela: Aprovar Ana, Não tem: criar ficha nova, entrada_aprovar respondeu ok, contagem mudou 2 → 1 sem reload da página; depois Recusar Bruno, Recusar pedido, entrada_recusar respondeu ok, folha vazia e linha removida imediatamente. Nenhuma outra pendência foi apagada para forçar Tudo em dia.

Limpeza restrita aos e-mails Q15: BEGIN; DELETE 2 pedidos; DELETE 1 ficha; DELETE 1 pessoa; DELETE 2 auth.users; COMMIT. Depois: pedidos=0, contas_q15=0, fichas_da_igreja=156. Sem reset, supabase start ou mudança de personalização.

## Caminhada
Duplicação confirmada por leitura de Inicio.tsx: a key jornada resume journeyRequests e rola até caminhada-pendente, que repete a lista com Aprovar/Rejeitar. Nenhum trecho dessa função foi corrigido; acrescentada uma linha na seção 3 do PENDENTES. A linha do pedido de conta duplicado foi retirada.

## Verificações
Reserva publicada no commit f8b7bdef6, só da história, imediatamente após criar o worktree a partir de origin/main (93d9f26aa). Quadro de reservas consultado por scripts/historias.ts; nenhuma dependência nova de produto ou arquivo fora do trilho.


TypeScript final (`npx tsc --noEmit -p .`): saída vazia, exit=0. O primeiro passe encontrou um import de plural removido por engano durante a extração; restaurado e execução completa final aprovada. ESLint dos três arquivos de produto: saída vazia, exit=0. Componentes: Componentes da biblioteca: ok. Testes da captura: 26 pass, 0 fail. Lei 12 estática, contraste dos temas e gráficos, todos os contratos enumerados em service.yml e diff do pacote de produção: exit=0. Build local com env local/fictício: exit=0. Migrações e chat_identidades.sql serão validados no Postgres isolado do CI, sem aplicar migrações no banco compartilhado local.

Teste de estados pela tela, sem banco falso: pedido RPC retido para mostrar linha/esqueleto carregando, resposta 503 interceptada para mostrar erro, retirada da interceptação e clique em Tentar de novo para recuperar a resposta real. Estado vazio visível na folha e Esc fechando. Como lider@teste.local: consultas entrada_pedidos=0, linha=0, folha=0. Auditoria da folha vazia ainda aberta: zero violações Axe, uma verificação de contraste incompleta, nenhum texto abaixo de 12 px ou alvo abaixo de 24 px, sem rolagem lateral. Não se afirma contraste integralmente auditado de todas as cinco fotos; os temas passaram no check estático. Não houve teste em aparelho real ou leitor de tela.

Servidor encerrado depois dos testes. `lsof -nP -iTCP:3115 -sTCP:LISTEN`: nenhum listener. Teste de bind: bind localhost:3115 OK, porta livre. `git diff --check`: sem saída.

## Crítica e limites
A linha agora leva à decisão, em vez de só rolar a página. A folha separa acompanhar de executar e a carga compartilhada impede divergência entre contagem e lista. O caso exercitado incluiu dois pedidos reais, a escolha de ficha nova, recusa confirmada, falha de rede e recuperação; não se ensaiou volume grande de pedidos. A casca continua densa, e a lista de Caminhada continua duplicada, registrada como trabalho separado. A aprovação mantém router.refresh para atualizar os demais dados; a contagem de pedidos muda localmente antes disso.

## Notas
Feita em 10/11/2026 por codex: decisão construída com hook único e Gaveta existente; cinco fotos recapturadas, abertas e medidas; aprovação e recusa reais, erro/recuperação e líder sem acesso testados; dados de teste removidos; checks locais aprovados e porta livre. Densidade herdada, contraste incompleto e ausência de teste em aparelho/leitor de tela registrados. PR para main e CI do HEAD serão conferidos na entrega, sem merge.

## Referências funcionais (lei 16)
A decisão de interface já veio do usuário; as fontes servem só para conferir a função. Planning Center separa o aviso de pedidos pendentes do lugar onde são revisados: https://www.planningcenter.com/changelog/people/request-access-to-lists-workflows-and-forms . ChurchSuite mantém inscrições pendentes até alguém autorizado ativar ou remover a pessoa: https://support.churchsuite.com/article/53-adding-people-to-small-groups . Aplicação nesta história: resumo no Início, decisão na folha, item resolvido sai da fila. Nenhum material visual de terceiros no git.


## Revisão do PR #58: fila vazia na preparação

Pedido do usuário: durante ativando, só renderizar Para resolver quando houver itens. A correção acrescenta `if (ativando) return null` depois do ramo que renderiza filas não vazias e antes do estado Tudo em dia. Nenhum título ou estado vazio aparece na preparação sem itens; fora da preparação, o fluxo permanece igual. Nenhum outro código de produto mudou nesta revisão.

Prova numa organização local separada, criada por conta nova de teste e bootstrap_church_org_v2: Igreja Preparação Q15, org `126830d5-06ce-4345-8cc9-dcfa6f66d914`, church `595b1350-f056-4144-aa49-0b8880ddd470`. Sem cultos/eventos ou outros itens de fila. Nenhuma alteração de senha existente. Servidor `npm run dev:local -- --port 3115`, Supabase `127.0.0.1:54321`; login apresentou cookie sb-127-auth-token. Scripts e loader de foto.mjs fora do git.

| Foto aberta, 1366×860 | Conteúdo conferido | Ações / limite | Palavras / limite | Classificação | MD5 |
|---|---|---|---|---|---|
| [Preparação sem pedidos](screenshots/Q15-preparacao-sem-pedidos.png) | Comece por aqui e guia da fase 1; zero título Para resolver, zero Tudo em dia e zero linhas de fila | 25 / 25 | 114 / 100 | fora da lei | 6c94acad1a418b99edc91915a507c810 |
| [Preparação com um pedido](screenshots/Q15-preparacao-com-pedido.png) | Comece por aqui e Para resolver com somente a linha 1 pedido de conta pendente, Revisar →; sem bloco Novos cadastros ou Tudo em dia | 26 / 25 | 125 / 100 | fora da lei | bdec42a17176eafd54222e1bc1981edf |

Fotos novas pelo foto.mjs com extensão de destinos somente em memória, abertas antes de usar; __medir(24) no mesmo quadro, tour fechado, selo Next oculto, networkidle e conteúdo esperado visível, retorno ao topo antes de medir/fotografar. Nenhuma sobreposição, alvo abaixo de 24 px ou rolagem lateral; duas molduras. A densidade da preparação continua acima de 25/100, registrada sem recortar conteúdo para forçar medida.

Entre as fotos, q15.preparacao.pedido@teste.local preencheu o formulário real `/service/participar/JKX5E8SP`. POST /api/service/entrada respondeu 200 e estado pendente. A conta gestora q15.preparacao.gestao@teste.local só pertenceu à organização temporária; a igreja principal não foi usada nem modificada no teste.

Limpeza: o primeiro DELETE da organização sofreu rollback por FK da auditoria durante o cascade. A segunda transação removeu filhos temporários antes da organização, sem desligar triggers, e concluiu COMMIT. Depois: organizacoes_fixture=0, contas_fixture=0, pedidos_fixture=0. Nenhum reset ou migração no banco local.

Prova da principal intacta: snapshots de contagem e hash do conteúdo de todas as tabelas/views core/service com organization_id da principal, mais a própria core.organizations. `cmp` antes/depois sem diferenças. SHA256 de ambos: `4cd085f86166d81c78b715ff761fd15dadfb548c7d96c6806a45855954ee2f9c`.

Checks desta revisão: `npx tsc --noEmit -p .`, ESLint de Inicio.tsx, lei 12 estática, componentes, contraste dos temas/gráficos, todos os contratos do service.yml e pacote de produção: exit=0. Captura: 26 pass, 0 fail. Build, migrações e SQL ficam também no CI do novo HEAD, aguardado até encerrar antes da entrega. Servidor encerrado; lsof sem listener e bind localhost:3115 OK, porta livre. Sem merge.
