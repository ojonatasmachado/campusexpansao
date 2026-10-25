# N1: contrato internacional do Service

## Decisão do usuário, 24/10/2026

Interface integral em pt-BR, en-US e es-ES. Uma moeda por igreja/rede: BRL, EUR ou USD, sem conversão automática, mistura de moedas ou reinterpretação de valores existentes. O locale da pessoa não escolhe país, fuso, moeda ou o idioma de conteúdo escrito pela igreja.

## Estado desta implementação

A N1 continua em andamento. A persistência e o contrato monetário passaram nos testes autenticados. O primeiro lote contém 244 mensagens nos três idiomas, com integração parcial de Perfil e Configurações; não representa tradução da interface inteira. O inventário inicial contém 3670 ocorrências, 2600 textos distintos em 182 arquivos, ainda sem todas as frases dinâmicas classificadas. Faltam integração das preferências nas telas e tradução/validação completas. Arquivos da I10 continuam reservados pelo Claude e não foram tocados.

## Dados e validação

- `core.users.locale_code`: pt-BR, en-US ou es-ES. Padrão explícito pt-BR. RPCs `my_locale` e `set_my_locale` operam somente na própria conta. A restrição do banco também rejeita valores inválidos fora da RPC.
- `service.organization_preferences`: uma moeda por organization_id, porque contas e totais financeiros atravessam congregações da mesma rede. Leitura exige acesso ao Service. Escrita é pela RPC `set_organization_currency`, apenas dono, master ou pastor da rede com acesso ativo.
- `currency_locked` fica permanente depois de qualquer valor financeiro. Contas iniciais zeradas não travam a configuração. Apagar um lançamento não libera reinterpretação do histórico.
- Configuração e primeira gravação financeira bloqueiam a mesma linha. Um formulário declara `x-service-currency`; cliente antigo sem o cabeçalho significa BRL. Se a moeda mudou antes de salvar, a gravação falha em vez de atribuir outro significado aos centavos.
- Valores permanecem centavos inteiros. Os três códigos usam duas casas decimais. Pix/boleto não são disponibilizados como métodos em moeda estrangeira. Nenhum processamento de pagamento ou câmbio novo foi criado.
- A view `churches_with_preferences` usa security_invoker e mantém a RLS das tabelas. Dados legados são BRL. O tipo vem primeiro de app/lib/types.ts.

## Mensagens

A infraestrutura usa o núcleo estável `use-intl`, com configuração explícita de locale e mensagens por pedido/provider. Não há variável global mutável com o idioma de uma pessoa. Somente o catálogo escolhido é serializado para o cliente. Não modifica as rotas Q8 nem a renderização estática do site público.

As frases completas têm identidade estável e suportam argumentos, plural ICU e marcação rica. Conteúdo da igreja entra como argumento ou dado, nunca como chave para tradução automática. A pseudolocalização percorre o AST ICU e expande somente os trechos literais em cerca de 40%, mantendo argumentos, tags e seleções. Não é um locale gravável: a captura local ativa SERVICE_PSEUDO_LOCALE=1.

O núcleo fornece tradução e formatação com configuração por chamada/provider, sem depender de estado global. Referência: [documentação oficial de use-intl](https://next-intl.dev/docs/environments/core-library).

## Evidência disponível

37 casos autenticados passaram em banco descartável: valores padrão, locale individual, entradas inválidas, escrita direta, anônimo, papéis sem permissão, outra igreja, seleção prévia de moeda, contas zeradas, cliente antigo em moeda estrangeira, método regional, centavos preservados, trava permanente e concorrência da primeira gravação. Resultado local prints/n1-internacional/banco.json; log /tmp/cex-N1-banco.log. Projeto cex-rls-1ff5952ff3e1 descartado.

Contrato estático: nove combinações locale/moeda, negativos e limites, datas civis inválidas/ano bissexto, mesmas chaves nos três catálogos, ICU válido, plural 0/1/2, rich text e preservação do nome da igreja na pseudolocalização. Os testes não substituem a captura de todas as telas traduzidas, que continua pendente.

O preparador de JSX trabalha somente com texto literal da interface, mantém IDs, condições e valores de formulário, sinaliza frases mistas para revisão manual e recusa arquivos fora do trilho. Seu teste compara o HTML pt-BR original e preparado, inclusive entidades e interpolação, e verifica em inglês que o nome da pessoa não é traduzido mesmo quando coincide com uma mensagem. O extrator verifica chaves, mensagens ausentes, ICU e argumentos nos três idiomas. Termos personalizados pela igreja são preservados; somente os padrões recebem nomes por locale.

Preferência pessoal de idioma conectada ao Perfil com Campo/Selecao compartilhados e RPC própria. Só atualiza a interface depois de a gravação responder com o locale esperado; falha deixa o idioma atual e mostra tentativa novamente. O refresh do roteador preserva o estado do app. Esta ligação ainda aguarda teste autenticado no navegador e medição de densidade; não é prova de tela concluída.

## Continuidade para outro chat, 24/10/2026

A sessão foi encerrada a pedido do usuário. O trabalho completo não terminou: N1 permanece reservada, sem PR ou merge. Não marcar como feita nem saltar para F1.

### Pedido e ordem

Trabalhar somente nas histórias de bastidor, nesta ordem: Q6, Q1, Q2, Q3, Q5, Avatar/toast da BIBLIOTECA, Q10, O3, Q7, Q8, N1, F1, O4, O5, O6. Não assumir histórias E/I/M/G nem decisões D, que estão com Claude. Reservar cada história por push do branch historia/ID antes de código, em worktree isolado. Ler AGENTS.md e docs/service-v7/PENDENTES.md; ampliar o trilho em commit só da história antes de tocar caminhos novos e conferir as reservas vivas. Não mexer no checkout principal, que tem trabalho de outras frentes.

### Já entregue antes da N1

Q6 (PR14), Q1 (PR15), Q2 (PR16), Q3 (PR18), Q5 (PR19), Q10 (PR20), O3 (PR21), Q7 (PR22) e Q8 (PR23) foram integradas e seus deploys de produção verificados. Avatar/toast já haviam sido atendidos pelo Claude; não refazer. Último main usado como base desta frente: 8362ebae0724be2c1edce47d773de116b23e635e (Q8). Conferir origin/main ao retomar, sem sobrescrever trabalho local.

### Onde continuar

- Worktree: /Users/macbook/campusexpansao/.claude/worktrees/N1.
- Branch: historia/N1-locale-moeda. Reserva e trilho: docs/service-v7/historias/N1-fuso-idioma-moeda.md.
- Código parcial publicado no branch: 198ee38 (persistência/infraestrutura), 5cef543 (primeiro lote de mensagens e preferência de idioma), 543280d (trilho para teste UI), 406e3b4 (script e limites da prova). O commit desta nota acrescenta apenas documentação.
- Escolhas explícitas do usuário: interface INTEIRA em pt-BR, en-US, es-ES; BRL, EUR ou USD por igreja/rede. Sem câmbio, mistura de moedas ou mudança de significado de valores existentes. Não reduzir a entrega a formatos.
- node_modules deste worktree é independente do principal. use-intl/core estável, sem extração experimental. Playwright vem de tools/captura-service por createRequire em tempo de execução; não adicionar import estático ao build do app.

### Implementado e validado parcialmente

Migração 0096 com locale da conta, moeda da organização, permissões/RLS e bloqueio permanente da moeda depois de qualquer valor financeiro. Primeiro valor e alteração da configuração disputam a mesma linha. Clientes financeiros devem declarar x-service-currency; cabeçalho ausente significa BRL legado. 37 casos autenticados de banco passaram, inclusive concorrência e isolamento, com descarte do ambiente.

Infraestrutura de mensagens por pedido/provider, catálogos separados, ICU, rich text e pseudo por AST com expansão de cerca de 40%. Há 244 mensagens completas por idioma, 226 referenciadas no código e outras usadas como prova. Perfil e Configurações estão parcialmente traduzidos. Vocabulário padrão é localizado; termos personalizados e conteúdo da igreja são dados preservados. Extrator verifica chaves, ausências, ICU e argumentos. Preparador JSX preserva IDs, condições, valores, entidades e semântica de interpolação e separa frases mistas para revisão manual.

Perfil contém seleção pessoal de idioma com Campo/Selecao existentes, RPC set_my_locale, cookie restrito a /service e router.refresh depois do sucesso. Essa interação ainda NÃO passou na prova de navegador.

Typecheck e lint do lote 244 passaram antes de acrescentar o script UI. Contratos de internacionalização, leis 12/17 e 13 regressões das jornadas passaram. O último typecheck incluindo o script UI foi interrompido para liberar recursos; repetir e não tratá-lo como aprovado. Lint do script UI passou. Build da infraestrutura inicial passou, mas repetir build após concluir a integração.

### Próximos passos obrigatórios

1. A prova scripts/check-local-internacional-ui.ts foi destravada nesta retomada e passou com a conta canônica de membro, incluindo navegação e controle de texto. Ver a atualização ao fim desta seção para fixture, evidência e limites. Rodar verificações pesadas sequencialmente; não usar a conta master incompleta para esta prova de Perfil.
2. Concluir a tradução integral do Service. O inventário inicial encontrou 3670 ocorrências e 2600 textos distintos em 182 arquivos; 244 mensagens não representam cobertura completa. Faltam metadados fora de componentes, frases mistas, erros, peças compartilhadas, entradas de autenticação e formatação de datas/números. Traduzir frases completas; nunca aplicar tradução automática ao DOM ou a conteúdo das pessoas/igrejas.
3. Conectar configuração da moeda e o contrato de formatação/gravação ao financeiro, inclusive formulários e exportações. Ainda não existe essa integração completa. Não reinterpretar centavos legados, nem apenas trocar símbolo de BRL.
4. Capturar idiomas e pseudo em celular/painel, textos longos, densidade antes/depois, erros de console, alvos, contraste e rolagem lateral. Testar persistência, navegação e falhas autenticadas. Não apresentar testes sintéticos como aparelho/pessoa real.
5. Passar todos os checks exigidos, concluir a história, abrir PR, aguardar CI/preview, integrar somente o SHA verificado e acompanhar produção até READY. Só depois reservar F1, O4, O5 e O6, nessa ordem. O6 exige evidência real para a parte de famílias; não inventar validação humana.

### Convivência e ambientes

Na última consulta, I10 continuava reservada pelo Claude e bloqueava edições em app/service/ui/, app/service/painel/comum.tsx, app/service/modules/inicio/Saude.tsx, app/service/modules/financeiro/ e app/service/modules/relatorios/. Nenhum desses arquivos foi alterado pela N1. Conferir o estado vivo antes de tocar; não inferir liberação pela idade da reserva. Não usar subagentes sem autorização aplicável.

O usuário autorizou reinício gracioso do OrbStack quando necessário para destravar a API, sem reset, sem apagar volumes compartilhados e sem parada forçada. O reinício mais recente terminou com sucesso. Projeto da primeira tentativa: cex-rls-570b292ece84, removido explicitamente após reinício, sem contêineres ou volumes restantes. Segunda tentativa: cex-rls-d40073001ede, descartado pelo finally, sem contêineres restantes. Nenhum caso de UI passou nessas tentativas. Usar withDisposableSupabase e nunca produção ou instância compartilhada 54321. Não interromper processos de outra frente.

Logs locais: /tmp/cex-N1-idioma-browser.log, /tmp/cex-N1-idioma-browser-repeticao.log, /tmp/cex-N1-tsc-lote244.log, /tmp/cex-N1-lint-lote244.log. Notas adicionais em /tmp/cex-N1-continuidade-lote244.md, que podem desaparecer; esta seção no repositório é a continuidade durável.

Ao terminar a próxima sessão, entregar novamente ao usuário o contexto atualizado e um texto curto para abrir outro chat.


### Retomada N1 neste chat, 24/10/2026

As reservas remotas foram conferidas: I10 continua com Claude nos mesmos caminhos. O checkout principal e os arquivos reservados ficaram intactos. Não iniciar F1: N1 permanece aberta.

O novo lote leva os catálogos a 272 mensagens por idioma, com 255 referências literais extraídas do código. Inclui erros/retornos do Perfil, papel da pessoa, datas civis por locale, categorias de avisos com vocabulário preservado e cabeçalhos/retornos de Configurações. Tradução integral, autenticação, peças compartilhadas e integração financeira continuam pendentes.

A prova de navegador foi destravada com diagnóstico por captura: a conta master canônica entrava no primeiro acesso; a conta de membro ainda mostrava o consentimento do mapa. A fixture desta prova agora prepara só a conta membro@teste.local no banco descartável, com telefone e recusa do mapa já registrados. Não altera fixtures compartilhadas nem o produto para contornar esses fluxos.

Passaram sete casos autenticados em Chromium: pt-BR/en-US/es-ES em 390×844 e 1366×860, persistência após recarga, Perfil preservado, ausência de rolagem lateral e falha simulada da RPC mantendo o idioma anterior também após recarga. Nenhum pageerror observado. Projeto cex-rls-9933c49519fe descartado pelo finally. Log: /tmp/cex-N1-idioma-browser-preferencias-2.log. Capturas e resultado local em prints/n1-internacional-ui/. Não é validação de aparelho real nem de toda a interface traduzida.

A captura em inglês confirma resíduos em português na casca (Perfil, Início, Agenda, Mensagens) e no tamanho do texto. A densidade da primeira execução foi colhida antes do fim da entrada/hidratação em alguns casos, portanto não constitui comparação aprovada. O script agora espera o seletor, fontes e animações finitas antes de medir e volta ao topo da rolagem interna. O registro pt-BR-antes é a referência de idioma na mesma versão, não uma captura do código anterior ao lote.

Checks já aprovados nesta retomada: extrator, contrato de internacionalização/preparador JSX, leis 12/17 e os 13 contratos de regressão das jornadas. Lint sem erros, com dois avisos preexistentes de img em Config.tsx. Typecheck passou antes dos últimos ajustes do script; repetir junto da verificação final. Build e provas de pseudo/contraste integral ainda não são conclusão desta retomada.


### Evidência mais recente e próxima continuação

O lote seguinte ampliou o trilho, em commit só da história e push antes das edições (a9de4c9), para MobileApp.tsx, lib/text-scale.ts e TextSizeSlider.tsx. A reserva I10 foi conferida novamente e permanece intocada. Os catálogos agora têm 320 mensagens completas por idioma, 303 referências literais no código. Navegação fixa, Perfil, saudações, plural de avisos, prévia e nomes acessíveis do tamanho do texto foram localizados. Nomes de pessoa/igreja e vocabulário personalizado continuam argumentos, sem tradução. Frases com marcação usam rich text; não há tradução por DOM.

A prova final deste lote passou em cex-rls-278c2a8c54de, descartado: seis combinações de idioma/largura com recarga, cabeçalho do Perfil, quatro abas e aria-valuetext do slider, mais falha da RPC preservando pt-BR após recarga. Log /tmp/cex-N1-idioma-browser-navegacao.log; resultado em prints/n1-internacional-ui/resultado.json, executado em 2026-10-24T13:49:26Z. Captura en-US-390.png revisada: Home/Profile/Calendar/Messages/Journey e Default traduzidos, Maria Membro preservada. Não representa cobertura de todas as telas ou painel de gestão.

Densidade estabilizada, mesma versão em pt-BR versus outros idiomas: no membro a 390px, 10 ações, 40 a 58 palavras, até 2 molduras, nenhum alvo pequeno, sobreposição ou rolagem lateral. No app do membro a 1366px, 10 ações, 52 a 58 palavras, nenhum alvo pequeno/sobreposição/rolagem, mas 3 molduras já na referência pt-BR. Não aprovar o limite de molduras do desktop nem confundir esta tela com captura do painel. Pseudo, textos extremos, contraste real de todas as telas e prova de aparelho seguem pendentes na N1.

Próxima tarefa: continuar a tradução integral nos caminhos livres. Faltam subtítulos/metadados vindos dos manifestos, demais telas do membro, painel, erros compartilhados e entradas de autenticação. Antes de ampliar o trilho, consultar reservas e publicar a ampliação em commit só da história. A integração de moeda/formulários/exportações do Financeiro continua aguardando os caminhos da I10. Não iniciar F1 nem marcar N1 como feita.

Verificação final de tipos: tsc --noEmit passou. A primeira execução encontrou arquivos de tipos gerados pelo Next dev truncados; só .next/dev/types deste worktree foi removido e regenerado. O build inicial compilou e concluiu TypeScript, mas falhou por supabaseUrl ausente no ambiente, antes da coleta de /admin/studio/divulgacao. Build completo aprovado na repetição com variáveis fictícias do CI (log /tmp/cex-N1-build-ci-retomada.log); não confundir a tentativa inicial com falha de tipo do produto. Leis 12/17, contrato de internacionalização e contraste dos temas passaram após o lote de navegação.


### Mensagem para o Claude, solicitada pelo usuário em 24/10/2026

O usuário reafirmou a divisão original: histórias E/I/M/G e decisões D continuam com Claude; Codex pega apenas a fila de bastidor. Pediu expressamente deixar uma mensagem para Claude fazer a parte que Codex não conseguiu concluir. Esta é a mensagem durável. N1 ainda não está feita e não foi publicada em produção.

**Estado para retomar:** worktree `.claude/worktrees/N1`, branch `historia/N1-locale-moeda`. Ler o arquivo da história e conferir `scripts/historias.ts` antes de editar. A reserva da N1 continua com Codex; este registro não autoriza trabalho simultâneo no branch de outra frente. Coordenar a passagem da N1 antes de assumir o restante. Não mexer no checkout principal. O último lote salvo de autenticação é `92cae18`; os commits seguintes ampliam somente o trilho. O lote de convite/endereço desta retomada será salvo no mesmo branch após as verificações abaixo.

**O que a N1 já entrega:** preferência pessoal persistida, contrato de locale/moeda, trava monetária no banco, infraestrutura ICU/rich/pseudo e 433 mensagens completas por idioma (415 fontes literais usadas). Login, senha nova, página de convite, formulário de convite, CEP e consentimento estão conectados aos catálogos. Nomes e conteúdo de pessoas/igrejas continuam dados. O cabeçalho `x-service-locale` escolhe somente o idioma dos erros de convite e CEP. A preferência de idioma passa a cookie em `/`, removendo o cookie antigo em `/service`, para funcionar também em `/{slug}/entrar`; isso não torna o site público dependente do locale.

**O que falta o Claude fazer nas telas:**

1. Concluir a tradução da interface inteira em pt-BR, en-US e es-ES. São escolhas já feitas pelo usuário, não uma nova decisão D. Faltam os demais componentes em `app/service/membro/` (inclusive `Agenda.tsx`, `Onboarding.tsx`, `Inicio.tsx`, `Conversas.tsx`, `Caminhada.tsx`, `Cursos.tsx`, `Kids.tsx`, `Mural.tsx`, `Biblia.tsx`, `Visitantes.tsx`, `Onde.tsx` e os rótulos/validações em `comum.tsx`), metadados dos manifestos, componentes compartilhados em `app/service/ui/`, painel e erros restantes. Perfil/Configurações têm partes localizadas, mas não representam cobertura integral.
2. Usar `useTexto()`/`getTexto()` e frases completas com ICU/rich. Não traduzir DOM, nomes de pessoas, nomes de igreja, títulos dos eventos/cursos, mensagens das pessoas nem vocabulário personalizado. IDs, condições, status persistidos e layout ficam preservados. O preparador `scripts/internacional/preparar-jsx.ts` ajuda só com literais; revisar frases mistas, metadados e erros manualmente. Extrair e preencher os três catálogos, sem traduções vazias.
3. Resolver a convivência com a própria I10 antes de ligar a N1 a `ui/`, `painel/comum.tsx`, `modules/inicio/Saude.tsx`, `modules/financeiro/` e `modules/relatorios/`. São os caminhos ainda reservados por Claude. Codex não os editou.
4. Integrar moeda BRL/EUR/USD única por organização/rede: configuração autorizada, campos, visualização, totais e exportações. Consumir a moeda que vem do servidor; em escritas financeiras declarar `x-service-currency`. Cabeçalho ausente continua BRL legado. Não trocar somente símbolo, converter câmbio ou reinterpretar centavos. Depois de qualquer valor financeiro a moeda fica permanentemente travada. Ainda não há essa ligação completa nas telas. F1 (orçamento por ministério e importação OFX/CSV/PDF) continua não iniciada e é outra história.
5. Investigar a prova de estabilidade do controle de tamanho do texto. No teste de 24/10, em espanhol/390px, o botão `Listo` do diálogo `Tamaño del texto` foi encontrado, mas o Playwright não conseguiu estabilidade para clicar em 60 segundos. Sem pageerror. Captura local `prints/n1-internacional-ui/falha.png` e diagnóstico `falha.json`; log `/tmp/cex-N1-convite-ui-repeticao.log`. Não foi usado clique forçado nem alterado CSS para passar o teste. A execução anterior, antes do lote de convite, passou nos três idiomas. Separar causa de animação/layout/carga antes de aprovar.
6. Concluir capturas de celular e painel nos três idiomas e pseudo (expansão de cerca de 40%), pior caso de textos, erros de console, densidade antes/depois, contraste, alvos e rolagem lateral. A referência do membro em 1366px já tinha 3 molduras, acima da lei; ainda não aprovada. Não chamar captura de demo de validação de aparelho/pessoa real.
7. Só marcar N1 feita com toda a entrega e provas. Passar CI/build, abrir PR, aguardar preview/CI, integrar o SHA verificado e acompanhar produção até READY. Depois seguir F1, O4, O5 e O6; O6 exige famílias reais na parte Kids. As histórias anteriores da fila já foram publicadas; não refazer.

**Limite de autorização nesta retomada:** a revisão automática rejeitou o próximo comando de internacionalização em `Agenda.tsx`, `Onboarding.tsx` e `membro/comum.tsx` por considerar sobreposição com histórias M. O usuário respondeu para seguir a instrução original, sem liberar essas histórias para Codex, e pediu esta mensagem ao Claude. O comando rejeitado não executou; esses arquivos não receberam o novo lote planejado. O script temporário `/tmp/n1-member-base.py` foi removido sem execução; não faz parte da implementação aplicada.

**Verificação do lote atual:** tsc e lint passaram; contratos de internacionalização, endereço e geo/CPF passaram; leis 12/17 e contraste passaram. Primeira prova ampliada falhou na inicialização do Supabase (nenhum caso); segunda passou o Perfil em en-US/390px e parou na estabilidade em es-ES/390px antes de chegar aos novos casos de convite. Ambos os bancos descartáveis foram removidos. O modo `--so-entrada` foi acrescentado para verificar as novas rotas independentemente, com escopo explícito no resultado; consultar a atualização a seguir para o resultado, sem tratar essa prova como aprovação do Perfil completo. Ainda falta build deste lote e verificação final antes de qualquer PR.


**Resultado da prova isolada de entrada:** `--so-entrada` passou nos três idiomas em Chromium/390px: erros de login e ações correspondentes, mostrar senha, link de recuperação vencido, entrada temática com nome da igreja preservado, convite vencido, validação do convite válido e mensagens reais de validação das APIs de CEP/aceite com `x-service-locale`. Sem pageerror. Não houve aceite real de convite nem envio de e-mail. Projeto `cex-rls-abc2e9008281` descartado; log `/tmp/cex-N1-convite-so-entrada.log`. O resultado local `prints/n1-internacional-ui/resultado.json` declara `scope: entrada`, não aprovação do Perfil. Os 13 contratos de regressão também passaram após o lote.

**Fechamento verificável desta retomada:** typecheck final e build completo passaram (configuração fictícia em loopback 59999, sem produção); logs `/tmp/cex-N1-tsc-convite-final.log` e `/tmp/cex-N1-build-convite-final.log`. Lint final e `git diff --check` sem erros. O lote fica no branch N1, sem PR/merge/deploy, porque tradução integral, moeda no Financeiro e a prova completa de UI seguem pendentes.


### Avanço de bastidor após o handoff, 25/10/2026

A frente foi retomada a pedido do usuário e permaneceu na N1, respeitando a fila original. A reserva ampla `app/service/membro/` foi retirada: os arquivos Agenda/Onboarding/comum não foram editados e não devem impedir o Claude de executar suas histórias. I10 segue reservada pelo Claude. A mensagem anterior continua como contexto histórico; esta atualização substitui a informação de que a falha do Perfil permanece reproduzida.

O lote agora contém 492 mensagens completas por idioma, 474 referências literais usadas. Foram localizadas as respostas das APIs de CNPJ, entrada, convite, mapa e push, os adaptadores de erro de leitura/gravação e os retornos de falha das operações existentes na casca. As condições, permissões, IDs e status foram preservados. Não houve redesenho nem execução de histórias E/I/M/G.

A prova completa voltou a passar em Chromium: 13 grupos de verificações, incluindo pt-BR/en-US/es-ES em 390px e 1366px, preferências após recarga, migração do cookie para `/`, controle de texto, falha da RPC preservando idioma, entrada temática e erros das APIs. O script espera fontes e o fim das animações reais da folha antes do clique normal, sem `force`, sem mudar CSS e sem desativar animações. Projeto `cex-rls-c8c518a69a6d` descartado; log `/tmp/cex-N1-servidor-ui.log`; resultado local com `scope: perfil-e-entrada`. Continua sem representar cobertura integral do produto, aparelho real ou aprovação da moldura desktop já apontada.

Avisos automáticos agora têm um contrato explícito de texto, separado de conteúdo da igreja. Resumo do Mural e lembretes usam o idioma atual do destinatário, inclusive se a preferência muda enquanto espera na fila. Títulos e corpos escritos pela igreja não são traduzidos, mesmo se coincidirem com uma frase do sistema. A fila guarda `body_template` opcional, com valores permitidos no banco. A RPC `notification_locales` só é executável pelo servidor e recorta organização e pessoas; nenhuma conta autenticada ganha leitura de idiomas alheios. Falha na leitura de idioma ocorre antes da reserva das linhas, deixando os avisos disponíveis para outra execução. Publicações agendadas preservam o corpo informado e só usam template quando ele está vazio.

Banco real descartável: 42 casos passaram, incluindo os 37 anteriores de locale/moeda e cinco provas novas de autorização da leitura dos destinatários, isolamento e restrição do template. Projeto `cex-rls-c879642acc92` removido; log `/tmp/cex-N1-avisos-banco.log`. Testes de fila com envio simulado verificaram silêncio, idioma atualizado, resumo único, conteúdo preservado e falha sem consumir aviso; nenhum push externo foi enviado.

Typecheck, lint, contratos de internacionalização/avisos, leis 12/17 e build completo passaram no lote. Pacote SQL foi regenerado e conferido com a migração 0096 ainda não publicada. Build: `/tmp/cex-N1-build-servidor-final.log`. O trabalho continua no branch N1, sem PR/merge/deploy: faltam a integração integral nas telas e a moeda no Financeiro, com os limites de convivência registrados. A fila posterior F1/O4/O5/O6 permanece sem início.


### Adaptadores de arquivos, 25/10/2026

O lote seguinte leva os catálogos a 518 mensagens completas por idioma, 500 referências literais. Os adaptadores `uploadServiceImage` (quarto argumento), `uploadServicePrivateFile` (quinto), `lerArquivo`/`lerXlsx`/`textoIcs`/`baixarIcs` (segundo), `carregarExistentes` e `gravarImportacao` (terceiro) recebem `Text` opcional, com pt-BR como padrão compatível. `lerLinha` recebe o tradutor no quinto argumento, depois das opções. A gravação de logo da casca já passa o tradutor atual. Outros consumidores de tela devem passar `useTexto()` ao conectar sua tradução, inclusive os consumidores do Financeiro reservados pela I10.

Só erros e diagnósticos foram localizados. Parsers de data/planilha, cabeçalhos informados, nomes, status e demais valores persistidos não mudam com o idioma. A importação continua aceitando o formato de data já definido pelo arquivo, sem reinterpretá-lo como data americana. `CAMPOS`, `ROTULO_CAMPO`, `ESTADOS_CIVIS`, `MODELO` e motivos internos de duplicação ainda precisam de tratamento de apresentação pelo dono da tela; não traduzir esses IDs/valores na gravação.

Passaram: contrato nos três idiomas para leitura de CSV idêntica, valores normalizados/status iguais, diagnósticos com conteúdo inserido preservado, limite de 5.001/5.000 linhas com formatação local, erros de leitura/gravação de importação, instante do calendário e caminhos de upload público/privado com envio simulado sem rede. Também passaram os dez grupos existentes de planilha, o contrato de fusos, typecheck, lint, leis 12/17 e build final (`/tmp/cex-N1-build-arquivos-final.log`). Não houve teste com storage externo nem validação de todos os consumidores de tela.

As reservas foram consultadas novamente: I10 continua com Claude, incluindo Financeiro/Relatórios/componentes compartilhados. `origin/main` avançou para `02bbd31` (atualização automática de PWA) e foi incorporado à N1 pelo merge `6248a21`, sem conflitos. Os oito cenários de PWA e o typecheck passaram depois do merge. A frente não iniciou F1 nem O4/O5/O6 e não marcou N1 como feita. Continua pendente a integração integral nas telas e da moeda no Financeiro; os avanços de bastidor acima estão verificados e não exigem refazer a parte já entregue.


### Publicação parcial autorizada, 25/10/2026

O usuário pediu expressamente “coloque em produção o que é possível”. A entrega N1 foi dividida: a base de bastidor fica na N1; toda integração restante foi registrada na história N2, em PENDENTES.md, sem descartar os requisitos anteriores. Não foi assumida nenhuma história E/I/M/G do Claude.

A migração 0096 cria service.international_rollout com locale=false e currency=false. Nenhuma conta comum pode ler/gravar a tabela; a RPC international_enabled só expõe o estado booleano. Enquanto desligado, my_locale e a entrega de avisos retornam pt-BR, set_my_locale rejeita a troca, e set_organization_currency rejeita mudança de moeda. O servidor ignora cookies/cabeçalhos de idioma e o Perfil não exibe o seletor. Os valores existentes continuam BRL. Falha de consulta do rollout mantém a interface em pt-BR. A implementação futura só deve habilitar estes recursos por nova migração após concluir N2, nunca apenas ligar a tabela para expor a interface parcial.

Os testes de integração habilitam explicitamente os dois recursos somente em seus próprios bancos descartáveis. O modo --producao-parcial do teste de navegador preserva o estado desligado para testar o comportamento publicado. Os registros anteriores que dizem que não haveria entrega parcial descrevem a autorização anterior; este pedido mais recente autoriza a separação, sem afirmar tradução integral concluída.
