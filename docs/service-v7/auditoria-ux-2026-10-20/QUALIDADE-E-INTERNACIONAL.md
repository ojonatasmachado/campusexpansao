# Qualidade, mobile, acessibilidade e expansão internacional

Data: 20/10/2026. Análise estática do código local, complementando a observação visual conduzida no relatório principal. Nenhum arquivo do aplicativo, configuração ou dado foi alterado nesta investigação. Uma referência `arquivo:linha` aponta a versão local examinada, não uma promessa sobre produção.

## Conclusão

O Service já tem bases relevantes de acessibilidade e personalização. O principal risco internacional é funcional: a entrada exige endereço brasileiro, o tempo é interpretado como Brasília e alguns contatos recebem o prefixo brasileiro automaticamente. Traduzir os rótulos não resolve essas rupturas. No mobile, já existem correções para campos de toque e áreas seguras; o relato de zoom exige teste real da combinação teclado, escala do app e navegador. Não foi reproduzido neste levantamento estático.

As recomendações da skill ui-ux-pro-max foram consultadas com duas buscas focadas: `mobile input zoom keyboard` (tipos de campo, teclado e rótulos visíveis) e `error summary validation` (resumo focalizável, anúncio e associação dos erros aos campos). Foram conferidas contra o código, sem aceitar uma recomendação genérica como prova de defeito.

## 1. Entrada internacional bloqueada por uma pergunta secundária

**Confirmado no código, prioridade alta antes de vender fora do Brasil.**

O convite exige oito dígitos no CEP antes de criar o acesso (`app/service/convite/ConviteForm.tsx:28`). `CepInput` remove caracteres não numéricos, limita a oito dígitos e consulta `/api/service/cep-lookup` (`app/service/CepInput.tsx:7`, `:25`, `:61`). Um código postal português ou alfanumérico não tem representação correta nesse caminho. A interface explica que a igreja usa a informação para saber a região (`ConviteForm.tsx:93`), mas a transforma em condição de entrada.

**Ruptura entre personas:** o pastor envia o convite certo; o membro que mora fora não consegue concluir com seu endereço real. O problema pode atingir também brasileiro no exterior, sem que a igreja esteja sediada fora do Brasil.

**Proposta:** concluir identidade e vínculo antes de pedir endereço. País/endereço devem seguir a política da igreja e ser progressivos, com possibilidade de não informar quando não essenciais. País não deve ser inferido só do idioma. Se a primeira versão continuar só Brasil, explicitar o alcance comercial sem prometer internacionalização concluída. Confirmar também a validação da API antes da implementação; mudar apenas o campo visual não basta.

O CNPJ no cadastro inicial já é opcional (`app/service/onboarding/BootstrapChurchForm.tsx:99-103`), portanto não é correto apresentar CNPJ obrigatório como defeito atual. Configurações ainda usam rótulos CNPJ e CEP (`app/service/painel/telas/Config.tsx:355`, `:363`): revisar junto com país, não inventar equivalentes fiscais universais.

**Aceitação:** membro com endereço brasileiro, português e sem código postal conclui convite conforme política; dados de endereço nunca são adulterados para satisfazer máscara brasileira; indisponibilidade de lookup permite entrada manual; servidor e cliente aplicam o mesmo contrato.

## 2. Igreja fora de Brasília pode receber uma realidade temporal errada

**Confirmado no código, impacto alto.**

`todayISO`, saudação, hora atual e classificação de evento futuro usam `America/Sao_Paulo` (`app/service/lib/date.ts:48`, `:67`, `:73`, `:78-84`). O check-in Kids também fixa esse fuso (`app/service/lib/kids-checkin.ts:26`; `app/service/membro/Kids.tsx:548`). O arquivo de calendário escreve `DTSTART;TZID=America/Sao_Paulo` e `DTEND` com o mesmo fuso (`app/service/lib/ics.ts:19`). O tipo `EventoIcs` nem recebe fuso (`:7`).

**Consequência:** a igreja pode cadastrar 19h em seu horário local e exportar um compromisso interpretado como 19h em São Paulo. “Hoje”, saudação e elegibilidade temporal também podem divergir da realidade local. Isso importa dentro do Brasil, que tem mais de um fuso, antes mesmo da tradução.

**Proposta:** país e fuso IANA como configuração da igreja, com valor inicial sugerido e confirmado. Separar dia de calendário, hora local da igreja e instante UTC. Eventos precisam preservar a intenção temporal; quando o membro estiver em outro fuso, mostrar claramente o horário da igreja e a conversão quando útil. Testar horário de verão nos países que o adotam. Não converter silenciosamente datas civis como nascimento.

**Aceitação:** o mesmo evento conserva o instante esperado no app, no painel e no calendário externo em São Paulo, Manaus e Lisboa; eventos perto da meia-noite mantêm o dia correto; mudança de horário de verão tem comportamento especificado; silêncio das notificações tem fuso explicitamente definido.

## 3. Convites por WhatsApp podem apontar para outro país

**Confirmado no código, prioridade alta para expansão.**

O formatador trata qualquer número de dez ou onze dígitos como brasileiro (`app/service/lib/telefone.ts:16-21`). Embora preserve números de outros comprimentos, isso não distingue países com comprimentos equivalentes. O convite adiciona `55` a números de até onze dígitos (`app/service/painel/comum.tsx:268`). Visitantes constroem `wa.me/55...` (`app/service/painel/telas/Visitantes.tsx:50`), e aniversários também montam prefixo brasileiro (`app/service/modules/aniversarios/aniversarios.ts:149`).

**Proposta:** contrato de telefone internacional normalizado com código de país explícito, apresentação local e utilitário único para links de contato. Migrar sem reinterpretar números existentes sem contexto. Distinguir número inválido, número ausente e número que apenas não possui WhatsApp.

**Aceitação:** telefone +351, +1 e +55 gera o destino correto em convite, visitante e aniversário; nenhuma remoção de prefixo perde identidade; os três fluxos reutilizam o mesmo resolvedor.

## 4. Idioma é uma camada diferente de vocabulário da igreja

**Confirmado, preparação estrutural necessária.**

O documento raiz declara `pt-BR` (`app/layout.tsx:28`). Dias da semana e saudações são strings portuguesas (`app/service/lib/date.ts:51`, `:68`), e há `pt-BR` direto nas telas, ordenação, números e histórico. `plural()` aplica singular/plural português (`app/service/lib/plural.ts:11`); `pluralTermo()` deriva plurais por regras portuguesas (`app/service/lib/vocabulario.ts:71-94`). Renomear quatro termos da igreja é útil, mas não traduz frases nem resolve gramática estrangeira.

Financeiro apresenta valores com `R$` e separadores brasileiros (`app/service/modules/financeiro/dinheiro.ts:7-17`). Pix é uma capacidade especificamente brasileira, com configuração e entrada próprias (`app/service/modules/contribuir/manifest.ts:17`; `app/service/modules/contribuir/pix.ts:115`). Deve existir como capacidade regional, não ser substituído por um nome genérico que prometa um pagamento inexistente.

**Proposta:** separar locale da pessoa, país/fuso/moeda da igreja e vocabulário denominacional. Mensagens traduzíveis completas com pluralização, interpolação e contexto; não montar frases por concatenação de palavras traduzidas. Definir quais países entram primeiro antes de escolher soluções fiscais/pagamento. Rodar pseudolocalização com expansão de 30% a 50%, nomes de igreja longos e diferentes regras de plural. Não prometer suporte RTL sem projeto e teste específicos.

**Aceitação:** toda interface troca no idioma escolhido; idioma do HTML acompanha; nenhuma data ou moeda muda de significado; conteúdos escritos pela igreja preservam idioma original; alterações de termo continuam funcionando em cada idioma suportado.

## 5. Zoom ao escrever: proteção existe, mas escala geométrica merece investigação

**Relato do usuário ainda não reproduzido em dispositivo real.**

O viewport permite zoom e não usa `maximumScale`/`userScalable=false` (`app/service/layout.tsx:19-24`): preservar isso. Há regras para fontes de campos em toque (`evolucoes/service_app/service-app.css:2321`, `:2541`) e uma correção adicional para campos sem classes conhecidas (`:3300-3304`). Não afirmar que a aplicação inteira ainda usa campos de 14px em toque olhando só a primeira definição: a folha atual concatena versões e as regras posteriores importam.

Ao mesmo tempo, o texto do membro é escalado por `zoom` no cabeçalho, conteúdo e onboarding (`service-app.css:2751`), e folhas também recebem zoom (`:2938`). O fator varia de 14/17 a 23/17 (`app/service/lib/text-scale.ts:16-22`). O campo com token de 17px pode ocupar visualmente cerca de 14px na menor escala; isso não prova como o Safari decide seu zoom automático. Pode também reduzir geometricamente um alvo base de 44px. É necessário medir o tamanho efetivo de campo e alvo, não só o valor declarado de `font-size` ou `min-height`.

**Proposta para validar:** instrumentar `visualViewport.scale`, altura visível, posição do foco, retângulo do campo e CTA antes/durante/depois do teclado. Comparar Safari aba e PWA, escala mínima/padrão/máxima e tamanho de fonte do sistema. Avaliar escala tipográfica sem zoom geométrico como alternativa técnica apenas após prova. Nunca desabilitar o zoom do usuário para esconder o problema.

**Aceitação:** focar campo não deixa viewport ampliado ou deslocado ao fechar teclado; texto digitado e CTA continuam acessíveis; pinch zoom permanece disponível; orientação e foco preservam conteúdo; alvos efetivos atendem a regra em todas as escalas.

## 6. Área segura não garante comportamento correto com teclado

**Base positiva confirmada; cobertura por teclado pendente.**

Há `viewportFit: cover`, variáveis de área segura em barras, folhas e toasts (`service-app.css:2570-2600`, `:2671`, `:2938`), overscroll contido (`:3309-3310`) e alturas dinâmicas (`:3313-3314`). Isso é melhor do que corrigir cada tela isoladamente.

O chat usa `height:calc(100dvh - 230px)` (`:3314`). Altura dinâmica sozinha não prova que o compositor continua visível com todos os teclados, navegadores e tamanhos de texto. A folha combina max-height percentual, overflow e zoom (`:2938`), outra interação a testar. Não foi encontrado neste recorte um controlador central de `visualViewport`; sua ausência não é, por si só, defeito.

**Aceitação:** testar mensagem longa, campos no fim de formulário e modal em paisagem; teclado não encobre campo ativo, erro ou ação principal; após fechar, não sobra espaço vazio nem posição de scroll inválida.

## 7. Campo postal específico escapou da acessibilidade do formulário genérico

**Confirmado no código, correção focal.**

`CepInput` não recebe `id`, `aria-label`, `aria-labelledby` ou `aria-describedby`, e seu campo não tem rótulo interno (`app/service/CepInput.tsx:22`, `:54-65`). No convite, o rótulo é `span` dentro de `div`, não `label` associado (`ConviteForm.tsx:90-93`). O placeholder não substitui nome acessível. Lookup e erro são divs sem região de anúncio ou associação ao campo (`CepInput.tsx:67-68`).

O convite anuncia erro geral com `role=alert` (`ConviteForm.tsx:96`), o que é positivo, mas não expõe campo inválido ou ligação entre mensagem e campo. A validação sequencial exige nova submissão para descobrir o próximo erro (`:25-28`). A chamada assíncrona tem `try/finally` sem `catch` (`:31-58`): falha de rede pode sair sem converter a exceção em mensagem visível. Não foi provocada falha de rede neste levantamento.

**Proposta:** estender o componente compartilhado com nome, descrição, invalidade e estado de consulta. Validar todos os campos na submissão e levar ao primeiro erro ou resumo com links, preservando dados. Testar queda de rede e recuperação. Não substituir todos os erros por toasts.

**Base já corrigida:** auditoria anterior registra nomes acessíveis no `FField`; não reapresentar aquela falha genérica como atual. FormScreen já tem diálogo nomeado, inércia, retorno de foco, `role=alert`, informação de campos faltantes e aviso de descarte (`app/service/painel/form/FormScreen.tsx:110-120`, `:149-155`, `:165`, `:183`, `:195`). Seu erro usa scroll, não foco programático (`:150`); a evolução deve completar essa base.

## 8. Marcadores e fundos: distinguir intenção de inconsistência

**Causa exata do bullet branco ainda depende da observação visual.**

A folha ativa não é um conjunto de arquivos v2/v3/v6 importados separadamente: é uma concatenação documentada em `service-app.css:1-3`. O primeiro `.chip::before` cria um ponto de 5px (`:175`). Mais abaixo, ele vira máscara de ícone 12px com `currentColor` (`:2690-2691`); variantes definem check, relógio, x ou mais (`:2692-2699`). A variante neutra esconde o marcador deliberadamente (`:2700`). Portanto, ausência de ponto em chip neutro pode ser regra vigente, não falha de render.

Um `.chip` sem variante pode cair no fallback `--st-ic:none`, formando um quadrado com cor atual, e classes de outros sistemas podem coexistir. Isso é hipótese a conferir no elemento exato, com estilos computados e screenshot. Não atribuir automaticamente todo ponto branco a marcador de `ul`: neste recorte não foi encontrada regra global que comprove essa causa.

**Proposta:** inventário visual de estado, categoria, novidade, contagem e item de lista. Cada um deve ter significado próprio, com palavra e ícone quando for estado. Remover apenas decoração sem função. Exibir biblioteca de estados nos dois modos e em todas as famílias de neutros; conferir placeholders, loading, sem dados e sem permissão.

## 9. Contraste de tokens passa; contraste percebido e semântica ainda importam

**Verificado por execução:** `npx tsx scripts/check-theme-contrast.ts` concluiu sem falhas nesta análise. O script cobre oito famílias, acentos predefinidos ajustados e estados. `accentText` verifica fundo, card e superfície elevada a 4,5:1 (`app/service/lib/theme.ts:119-125`); `--accent-fill` preserva a cor da igreja e estados têm paleta própria. Não propor novamente corrigir o verde fixo como se essa separação não existisse.

Entretanto, as réguas aceitam 2,2:1 para `subtle` descrito como legenda/placeholder, 1,25:1 para borda e 1,05:1 para superfície de card (`theme.ts:88-90`). O teste comprova cumprimento dessas réguas, não conformidade integral da tela. Texto informativo ativo não deve usar o passe de uma legenda fraca como autorização para baixa legibilidade; o contorno essencial de um controle precisa ser avaliado como controle, não como borda decorativa.

**Proposta:** estabelecer tokens semânticos de texto informativo, placeholder, desabilitado, borda decorativa e contorno essencial; medir pares reais depois de opacidade/mix, não somente paleta. A identidade entre dois fundos muito próximos pode ser tecnicamente válida e continuar ruim para hierarquia. Testar separação por espaço, agrupamento e título, sem depender de aumentar a saturação.

## 10. Navegação e permissões: acesso correto não garante orientação

**Estrutura observada; impacto requer percursos com papéis reais.**

A navegação do membro usa estado local `tab`, `sub` e `go()` (`app/service/MobileApp.tsx:83-84`, `:212-222`); neste componente não há sincronização com histórico do navegador. Consequências potenciais: recarregar pode perder localização, compartilhar tela interna não identifica contexto, e Voltar do Android/navegador pode sair em vez de voltar um nível. Validar pelo runtime, não assumir cada consequência como reproduzida.

A matriz combina papel, time, liberações por pessoa e rotas restritas (`app/service/modules/registry.ts:138-167`). Pessoas com mesmo nome de papel podem ver experiências diferentes, legitimamente. A regra de esconder entradas sem dependência evita botão morto, mas pode tornar uma função impossível de descobrir ou seu desaparecimento inexplicável para quem a configura.

**Proposta:** membro vê apenas o que pode usar; gestor autorizado vê a condição de ativação, responsável e próximo passo no contexto de configuração. Não exibir informação restrita para explicar acesso. Diferenciar módulo desligado, conteúdo ausente, ação fora do prazo e permissão insuficiente. Guardar destino pretendido ao reautenticar. Cada rota negada precisa de saída útil, sem virar denúncia de segurança ou alegação de falha de autorização.

## Plano de aceitação transversal

1. **Matriz de contextos:** igreja nova, igreja com poucos dados e igreja ativa; pastor acumulando funções, gestor, líder com escopo e membro sem time/com time; módulos desligados/ligados; modo claro/escuro; texto mínimo/padrão/máximo.
2. **Dispositivos reais:** iPhone Safari e PWA; Android Chrome e PWA; desktop teclado. Registrar modelo, versão, orientação, viewport e escala do sistema. Não usar emulação desktop para fechar bug exclusivo de teclado Safari.
3. **Campos:** login, convite, código de entrada, CEP, data, telefone, busca, conversa, pedido de oração, evento e formulário de gestão. Foco no primeiro e último campo; teclado aberto; erro; preenchimento automático; colar; rede indisponível; retorno.
4. **Leitores de tela:** VoiceOver/TalkBack anunciam nome, valor, estado e erro; ordem acompanha a leitura; modal contém foco e volta ao acionador; controles de ícone têm nome; mensagem de sucesso não exige localizar um toast visual.
5. **Layout:** 320, 390, 768 e desktop; texto máximo e palavras longas; medir recortes dos filhos além do scrollWidth global. `overflow-x:clip` não deve fazer o teste passar enquanto esconde conteúdo.
6. **Interação:** alvo efetivo de 44px no toque em todas as escalas; espaço entre ações; foco visível; ações durante loading não duplicam operação; cancelamento preserva intenção; desfazer funciona onde oferecido.
7. **Internacional:** país separado de idioma, telefones +55/+351/+1, códigos postais numéricos e alfanuméricos, fuso de São Paulo/Manaus/Lisboa, moeda explícita, datas próximas à meia-noite e mudança sazonal. Não ativar um recurso regional sem infraestrutura correspondente.
8. **Evidência:** screenshot antes/depois e durante teclado; vídeo para zoom/transição; medidas computadas, erro de console e registro do resultado. Registrar “não testado” em vez de completar a matriz por inferência.

## Adendos propostos ao AGENTS.md, sujeitos à aprovação

- Contrato de jornada: uma tarefa declara início, resultado, dependências entre personas, recuperação e estados sem conteúdo, sem permissão e sem rede.
- Contrato internacional: locale da pessoa e país/fuso/moeda da igreja são explícitos; telefone e código postal não assumem Brasil; capacidades regionais declaram disponibilidade.
- Contrato mobile: tamanho de campo e alvo é medido após escala; teclado não encobre foco/CTA; proibir desabilitar zoom do usuário como correção.
- Contrato de feedback: erro deve ser recuperável, associado ao campo quando aplicável e anunciado; ação sem resultado precisa ter confirmação e caminho de recuperação.
- Contrato semântico de cor: texto ativo mínimo 4,5:1, salvo texto grande; contorno essencial e indicador de foco avaliados separadamente; paleta aprovada não substitui medição da composição.
- Contrato de descoberta: esconder entrada inviável para o membro, mas explicar ao gestor autorizado o que falta para disponibilizar a experiência.

Esses adendos não foram aplicados. Exigem decisão sobre produto e compatibilidade com as regras atuais antes de implementação.

## Complemento crítico: o primeiro evento usa uma data sem ano

**Defeito de contrato confirmado no código; rejeição da gravação não foi provocada para preservar dados. Prioridade imediata.** O percurso visual do relatório principal encontrou “Data” abrindo seletor de dia/mês, começando em janeiro quando vazio. A confirmação estática é direta: `DatePicker` usa mês inicial zero (`app/service/painel/campos.tsx:55`) e devolve `d + " " + DP_MESES[mes].toLowerCase()` (`:66`), sem ano. Todo `FField type=date` usa esse componente (`:234`).

Novo evento declara data e hora sem `req:true` (`app/service/painel/telas/Agenda.tsx:41`). `ServiceModal` envia o texto escolhido diretamente para `events.event_date` (`app/service/painel/telas/ServiceModal.tsx:159-165`). A coluna é `date`, não texto (`supabase/migrations/0006_service_operations.sql:17`), e não há conversão antes do insert. Assim, uma seleção “20 out” não possui contrato explícito de data civil com ano para o banco; sem data o insert usa `null`, permitido no schema. Não se deve depender da interpretação implícita do banco para um evento real.

**Ruptura:** pastor tenta criar primeiro evento, é convidado a informar quando, mas recebe um controle incapaz de selecionar o ano e um fluxo que pode aceitar ausência de data. Isso afeta descoberta na agenda, reserva de espaço, escala e percepção de aplicativo vazio.

**Proposta:** distinguir `data civil completa` (ISO AAAA-MM-DD), `dia/mês recorrente` e `hora` no contrato de campos. O seletor completo deve começar no mês atual da igreja e permitir ano, teclado e datas válidas. Exigir data/hora em publicação de evento com horário, ou declarar explicitamente rascunho e dia inteiro. Não tornar todo campo “date” igual sem revisar consumidores como aniversário e Kids.

**Aceitação:** selecionar evento no ano atual e seguinte gera ISO completo; fevereiro respeita ano bissexto; editar reabre o dia correto; agenda mostra o evento após salvar; sala é reservada no mesmo dia; nenhum evento publicado desaparece por data ausente. Verificar resposta real do banco com dados descartáveis antes de fechar a correção.
