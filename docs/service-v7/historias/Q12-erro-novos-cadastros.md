---
id: Q12
titulo: Mostrar falha ao carregar pedidos de conta
tipo: codigo
status: feita
quem: codex
desde: 2026-11-09
branch: historia/Q12-erro-novos-cadastros
depende: []
tamanho: P
---

## Por quê
NovosCadastros ignora o erro de entrada_pedidos e transforma falha em lista vazia. O bloco some do Para resolver e a gestão entende que não há pessoas esperando. Origem: seção 3 do PENDENTES.

## Arquivos (trilho)
- `app/service/modules/entrada/NovosCadastros.tsx`
- `app/service/modules/entrada/manifest.ts`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/Q12-erro-novos-cadastros.md`
- `docs/service-v7/historias/screenshots/Q12-*.png`

## Pronto quando
- Carregando, erro e vazio distinguíveis; vazio não mostra bloco.
- Erro mantém a linha Não conseguimos carregar os pedidos de conta com Tentar de novo.
- Nova tentativa pela tela recupera os pedidos.
- Consultas ignorando erro no mesmo arquivo corrigidas; outras do módulo registradas no PENDENTES.
- Peças da biblioteca; fotos de pendente, vazio e erro, medidas na mesma tela, abertas e com md5.
- Dados locais restaurados, checks e CI Service verdes; PR para main sem merge e porta livre.

## Causa e decisão
entrada_pedidos lia somente data e convertia data nula em []. O retorno antecipado por pedidos.length === 0 escondia falha e espera. A busca entrada_buscar_fichas repetia o problema, mostrando Nenhuma ficha sem login mesmo quando a consulta falhava.

Estados explícitos carregando, erro e pronto. Só pronto com lista vazia retorna null. O erro usa ErroEstado, anunciado com role alert, e Tentar de novo; a espera usa Carregando. Busca descarta resposta antiga após mudança do termo, informa falha no próprio lugar e permite nova tentativa. Criar ficha nova fica desativado enquanto a busca digitada está carregando ou com erro. Aprovar e recusar já tratavam erros retornados, e foram preservados. Entrada usa a peça compartilhada em vez do input direto.

Revisão do módulo: EntradaConfig trata error como cfg null, mas apresenta esse estado como falta de permissão; registrado no PENDENTES, sem alterar o arquivo. Não há outra consulta no módulo fora desses dois arquivos.

Jornada: gestão abre o Início do painel, confere pedidos pelo link e tenta novamente se a leitura falhar. Depende da função entrada_pedidos e da permissão de gestão. Sem conteúdo, não há bloco; sem rede/erro, há explicação e recuperação; sem permissão, o bloco continua limitado à gestão pela casca e pelo RPC. Nenhuma consulta, política ou migração foi alterada.

## Validação visual
Captura pelo mesmo método de tools/captura-service/foto.mjs: login real master@teste.local, localhost:3112, 1366×860, espera de texto visível e networkidle, tour fechado, selo Next escondido e conferido, fontes e animações concluídas. Scripts de teste fora do repositório. __medir(24) na mesma tela de cada foto, primeira dobra sem rolagem.

| Foto aberta | O que mostra | Ações / limite | Palavras / limite | MD5 |
|---|---|---|---|---|
| [Antes](screenshots/Q12-antes.png) | Erro simulado na versão anterior: bloco some sem aviso, embora exista pedido | 30 / 25 | 103 / 100 | 84ef82a693ef619779e4ebadc408eef5 |
| [Erro](screenshots/Q12-erro.png) | Novos cadastros com frase honesta e Tentar de novo | 31 / 25 | 115 / 100 | 5e06e19dac2e047a74000bc19dc710d1 |
| [Pendente](screenshots/Q12-pendente.png) | Após clique em Tentar de novo, Pedido de teste Q12 com Aprovar e Recusar | 33 / 25 | 131 / 100 | 3d3cf0b230e9f2f18918aa7f82513bb1 |
| [Vazio](screenshots/Q12-vazio.png) | Consulta bem-sucedida sem pedidos: sem bloco Novos cadastros | 30 / 25 | 103 / 100 | 40ed0c1661e9fc62a6464668d7acb18f |

Todas fora da lei de densidade. O erro acrescenta uma ação de recuperação e 12 palavras; pendente acrescenta três ações e 28 palavras ao antes (linha Revisar e Aprovar/Recusar já existentes). Justificativa no manifesto: mostrar a falha é necessário, e a I3 cobre a densidade herdada da casca. Não se esconderam controles ou textos para forçar a medida. Três molduras já existiam. Zero botões cheios na cor da igreja, sobreposições, rolagem lateral, textos abaixo de 12 px ou alvos abaixo de 24 px. Axe nas quatro fotos: zero violações e zero verificações incompletas de contraste.

Teste sem alterar o banco para provocar erro: interceptação da chamada entrada_pedidos no navegador retorna HTTP 503. Resposta retida confirmou Carregando pedidos de conta antes da falha. Clique em Tentar de novo liberou a chamada real, HTTP 200 com o pedido na tela. Busca de fichas: HTTP 503 não mostrou Nenhuma ficha e desativou Criar ficha nova; Tentar de novo recuperou HTTP 200 [] e o vazio verdadeiro. Nenhum pedido foi aprovado ou recusado.

## Banco e verificações
Pedido temporário criado por /private/tmp/Q12-fixture.sql: BEGIN, INSERT 0 1, COMMIT. Usou usuário local já confirmado, sem criar conta ou mudar senha. Remoção: DELETE 1. Snapshots de service.entry_requests antes/depois idênticos por cmp, SHA256 37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570. Sem aprovação, recusa ou mudança em outras tabelas do produto; sem migração e sem reset.

TypeScript, ESLint dos dois arquivos TS/TSX tocados, lei 12 estática, componentes, contrato de internacionalização e contraste dos temas: saída 0. Console na falha e recuperação: nenhum erro de execução ou console inesperado; somente os HTTP 503 provocados pela interceptação do próprio RPC. Leitor de tela e aparelho real não foram testados.

Servidor encerrado: lsof sem listener e bind localhost:3112 OK, porta livre.

## Notas
Feita em 09/11/2026 por codex: estados e recuperação dos dois carregamentos no arquivo testados pelos cliques, quatro fotos abertas, dados restaurados e porta livre. TypeScript, ESLint, lei 12 estática, componentes, contraste, internacionalização e build com saída 0. Densidade acima dos limites documentada; aparelho real e leitor de tela ficaram fora. PR para revisão, sem merge.
