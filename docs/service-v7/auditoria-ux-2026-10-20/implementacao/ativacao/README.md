# Ativação por um primeiro resultado útil

20/10/2026. Continuação da direção editorial aprovada. Escopo desta etapa: primeiro encontro, retomada, correção, times opcionais e distinção entre convite, acesso e liderança. Implementação dentro do módulo Configuração existente, sem novas rotas ou migrações.

## O que mudou

O pastor começa com um encontro individual: nome, data completa, horário livre e local. Não precisa escolher um dos oito horários antigos nem criar times para disponibilizar a programação. Uma prévia explica o que aparecerá na agenda do membro. A criação usa o comportamento informativo, sem exigir confirmação de presença.

Repetição é opcional. Parte da data e do horário escolhidos, repete semanalmente até uma data explícita e informa a quantidade antes de criar. O limite é de 60 encontros; períodos maiores são recusados com orientação, sem truncar silenciosamente. Datas impossíveis, datas passadas, horário já passado hoje, nome vazio e local vazio não produzem lote.

Após criar, o assistente guarda o ID do encontro como ponto de retomada. Um novo login reconhece o resultado e oferece continuidade, sem pedir recadastro. “Continuar depois” também salva o rascunho do encontro que ainda não foi disponibilizado. Falhas ao salvar o ponto de retomada são exibidas, sem afirmar que o encontro deixou de existir.

É possível escolher um encontro válido já existente na mesma igreja. Uma nova tentativa com os mesmos dados reconhece o registro existente; tentativas do mesmo formulário mantêm seus IDs, e o insert usa conflito por ID sem sobrescrever dados. Isso protege retomadas comuns e respostas perdidas. Não constitui garantia de unicidade entre duas abas criando simultaneamente o mesmo evento: isso exigiria um contrato de idempotência compartilhado ou uma restrição de banco adequada ao domínio.

O primeiro encontro criado no fluxo pode ter nome, data, horário e local ajustados mantendo o ID. Um encontro selecionado que perdeu seus dados pode ser revisado. O fluxo não altera pedidos de presença, inscrições ou equipe. Encontros com sala vinculada são recusados nesse ajuste rápido, com orientação para verificar a reserva; não se move uma reserva silenciosamente.

Times passam a ser uma etapa opcional depois do encontro disponível. A rotina confere o time e suas funções já existentes antes de completar um modelo. Se uma função falha durante a criação de um time novo, a recuperação se limita àquele time; não apaga o encontro nem desfaz times já concluídos. A interface explica a pendência e permite continuar com a programação preservada.

A etapa Pessoas explica que abrir uma mensagem pronta no WhatsApp não comprova envio nem aceite. O convite não concede papel de liderança nem vincula a um time. O cadastro reconhece números brasileiros em formatos usuais e recusa ambiguidades entre pessoas. Se a geração do acesso falha, uma nova tentativa pode reutilizar o cadastro em vez de inserir outra pessoa. Falha de rede ou janela bloqueada gera orientação de recuperação. Nenhum papel ou permissão é promovido automaticamente.

A conclusão verifica novamente no banco se o encontro pertence à igreja e tem nome, data, horário e local utilizáveis. Sem esse resultado, o assistente permanece pendente e volta à preparação. Convidar alguém continua opcional e não é marcado como feito se não aconteceu. A conclusão abre a agenda; aceite de convite, definição de líder e escala continuam sendo estados separados.

O Início mantém “Continuar preparação” enquanto há trabalho iniciado. A criação de um time não dispara mais o tour antigo sobre a configuração guiada. A ajuda manual continua disponível.

## Verificações

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit --pretty false` | Passou |
| ESLint dos arquivos desta etapa | Sem erros; dois avisos preexistentes de diretivas dispensáveis em ServiceExactApp |
| `npx tsx scripts/check-service-ativacao.ts` | Passou: encontro individual, horário livre, série, virada de ano, dados inválidos e continuidade sem tour concorrente |
| `npx tsx scripts/check-service-convite-recovery.ts` | Passou: rede indisponível, janela bloqueada, acesso existente e permissão recusada; respostas simuladas, sem rede externa |
| `npx tsx scripts/check-service-lei12.ts` | Parte estática passou, sem piorar a base; não substitui inspeção de tela |
| `git diff --check` | Passou |
| Build de produção | `next build --webpack` passou em cópia temporária do código, com configuração Supabase exclusivamente local |
| Visual | Telas inspecionadas em 320, 390 e 1440px, em Chromium controlado |
| Primeiro resultado | Gestão criou um encontro individual sexta-feira, às 19:17, com endereço explícito; membro comum de outra conta abriu o mesmo encontro |
| Retomada | Novo login reconheceu o encontro e preservou o ponto de continuidade |
| Correção | Horário passou a 19:27 e endereço foi corrigido; banco confirmou o mesmo ID e apenas um encontro |
| Time opcional | Recepção e suas duas funções criadas depois do encontro; evento preservado |
| Conclusão sem resultado | Local removido somente no registro de teste; o fluxo recusou conclusão e permaneceu pendente |
| Rascunho | Nome, data, horário e local reapareceram após sair e entrar, sem criar um evento novo |
| Repetir a criação | Nova tentativa com os mesmos dados reutilizou o ID existente; banco confirmou um único registro |

O build manteve avisos já presentes de middleware e dependências Supabase no Edge Runtime. Não foram alterados para ampliar o escopo desta tarefa. A cópia de build usa app real copiado e assets/bibliotecas compartilhados; o servidor de desenvolvimento do workspace não foi substituído pelo build.

As capturas ficam em `capturas/`, com contexto, ações e hashes no manifesto. Dois cenários inicialmente falharam porque o tour cobria o assistente. A causa foi corrigida e os cenários de rascunho repetidos com sucesso; as tentativas incompletas continuam identificadas no manifesto.

## Dados e limites

O teste entre contas usou uma conta temporária de membro em uma igreja local sem programação, com backup das configurações. Evento, time, funções, pessoa, membro, vínculo e usuário temporários foram removidos. As configurações originais e os IDs de eventos anteriores foram conferidos após restauração. Sessões e instrumentação técnica de teste podem permanecer no ambiente local. Nenhum dado de produção foi escrito e nenhum convite, mensagem, pagamento ou notificação externa foi enviado.

Falhas de rede e popup no convite foram simuladas; entrega no WhatsApp e aceite real não foram executados. O caminho de falha parcial de modelos foi revisado no código, mas não houve injeção de falha no banco para cada etapa. A série foi validada por testes de planejamento; a gravação real exercitada pela interface foi de encontro individual.

Continuam no plano: adoção completa pelo líder e suas permissões, demais jornadas operacionais, telefone/endereço/fuso internacionais e teste do teclado/zoom em Safari real. Não houve aprovação automática de papéis, alteração do AGENTS.md, commit, push ou deploy.
