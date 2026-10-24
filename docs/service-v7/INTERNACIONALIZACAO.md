# N1: contrato internacional do Service

## Decisão do usuário, 24/10/2026

Interface integral em pt-BR, en-US e es-ES. Uma moeda por igreja/rede: BRL, EUR ou USD, sem conversão automática, mistura de moedas ou reinterpretação de valores existentes. O locale da pessoa não escolhe país, fuso, moeda ou o idioma de conteúdo escrito pela igreja.

## Estado desta implementação

A N1 continua em andamento. A persistência e o contrato monetário passaram nos testes autenticados. O catálogo inicial de 22 mensagens valida infraestrutura, ICU e pseudolocalização; não representa tradução da interface inteira. O inventário inicial contém 3670 ocorrências, 2600 textos distintos em 182 arquivos, ainda sem todas as frases dinâmicas classificadas. Faltam integração das preferências nas telas e tradução/validação completas. Arquivos da I10 continuam reservados pelo Claude e não foram tocados.

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

Contrato estático: nove combinações locale/moeda, negativos e limites, datas civis inválidas/ano bissexto, mesmas chaves nos três catálogos iniciais, ICU válido, plural 0/1/2, rich text e preservação do nome da igreja na pseudolocalização. Os testes não substituem a captura de todas as telas traduzidas, que continua pendente.
