# Service: revisão dos componentes com as skills da Vercel

Data: 20/10/2026. Referência local: `7ecf8d4`, com alterações simultâneas de outra sessão. Escopo: código atual e 21 capturas do demo em 390 e 1440px. Análise, sem alteração do produto.

## Conclusão de design

O Service tem uma base visual: Inter, cores por igreja, tokens de cantos, escala de texto e componentes de ajuda e formulário. Vários controles já estão padronizados. O acabamento fica irregular na composição das telas, na hierarquia entre tipos de cartões e na completude do comportamento dos componentes.

A recomendação é complementar o sistema existente com uma biblioteca de componentes do produto, contendo variantes semânticas, estados completos e exemplos de composição. Trocar cores ou aumentar o arredondamento de tudo não resolve esses problemas.

As skills `web-design-guidelines`, `vercel-react-best-practices` e `vercel-composition-patterns` foram aplicadas. As outras seis do repositório foram instaladas, mas não acionadas: esta tarefa não é implantação, análise de custos, React Native ou implementação de animações. As diretrizes foram consultadas na origem oficial: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md.

As regras do `AGENTS.md` continuam prevalecendo. Não adotei automaticamente recomendações genéricas que contrariem a fonte, a escala do Service, a personalização da igreja ou decisões explícitas do projeto.

## O que as medidas mostram

| Amostra | Altura | Fonte | Canto | Avaliação |
| --- | --- | --- | --- | --- |
| Campo do formulário no painel, celular | 44px | 16px | 8px | Base consistente |
| Campo de Configurações, celular | 44px | 16px | 8px | Mesma geometria, superfície contextual diferente |
| Seletor de aniversário no painel | 44px | 16px | 8px | Visual coerente; interação incompleta |
| Campo de dados do membro | 44 a 46px | 17px | 8px | Diferença de contexto e escala, não erro automático |
| Botão principal do painel no celular | 44px | 14px | 8px | Base consistente |
| Cartão de Configurações | Variável | Corpo de 13 a 16px | 14px | Padding de 24px |
| Cartão do membro | Variável | Escala do membro | 20px | Linguagem mais espaçosa, intencional |

As medidas são do CSS calculado, não apenas de valores encontrados no código. Estados cobertos por um formulário podem aparecer na lista bruta de medidas; a interpretação considera o componente visível na captura.

## Diagnóstico visual

### 1. Cartões precisam de funções mais claras

Times, indicadores, configurações e conteúdo usam superfícies muito parecidas. Em algumas telas, título, ícone, descrição, contagem e rodapé de cartão têm peso próximo. A pessoa precisa ler mais para distinguir resumo, item clicável e tarefa.

Direção: definir três padrões de superfície, reaproveitando os tokens existentes: seção de conteúdo; item que abre detalhe; ação que pede resposta. Cartões com a mesma função precisam repetir a mesma anatomia. Um cartão de time pode ter título e líder como informação principal; um indicador deve privilegiar valor, significado e período; uma ação deve tornar prazo e próximo passo imediatamente legíveis.

Evidência: `390-times.png`, `390-cursos-e-trilhas.png` e `390-membro-inicio.png` na pasta de capturas.

### 2. A composição ainda pesa mais que a hierarquia dos botões

Escalas reúne várias ações antes do trabalho principal. Os botões secundários têm enquadramento semelhante entre si, e boa parte do peso visual fica nas bordas e nos controles. No celular, a sequência de caixas pode dar impressão de formulário ou painel provisório.

Direção: fixar uma ação principal por contexto, agrupar ações secundárias relacionadas e reservar ações de risco para posição e estilo próprios. A definição deve incluir quando usar botão, link, menu de opções ou ação na linha. Essa decisão fica documentada no componente, não reinventada em cada tela.

### 3. Formulários têm geometria compartilhada, mas contratos diferentes

Novo membro, Dados da igreja e dados do membro já compartilham boa parte da geometria. O formulário genérico, porém, perde informações semânticas que formulários específicos preservam. Isso aparece no teclado, no preenchimento automático, no foco e na acessibilidade.

Direção: um contrato de campo com identificador, rótulo associado, tipo de dado, autocomplete, ajuda, estado inválido, mensagem de erro e estado de carregamento. Os componentes especializados de valor, pessoa, data e upload podem compor essa base. Não é necessário reduzir todos eles a uma configuração genérica gigante.

### 4. Detalhes funcionais incompletos prejudicam a sensação de acabamento

Na verificação do formulário Novo membro, clicar no rótulo não levou o foco ao campo. O calendário continuou aberto após Escape. Esses detalhes fazem o componente parecer menos consolidado mesmo quando o desenho está alinhado.

Direção: a definição de pronto de cada componente deve abranger mouse, toque, teclado, foco, retorno de foco, erro e sucesso. Apenas um estado estático bem desenhado é insuficiente para servir como padrão reutilizável.

### 5. A identidade editorial precisa ser traduzida para produto

O Brand Book é forte em capas, peças editoriais, slides e aplicações de marca. O Service precisa de exemplos equivalentes para ações, tabelas, formulários e cartões de trabalho. A ausência dessa camada deixa muito espaço para decisões locais.

Direção: acrescentar um capítulo de interface do Service e uma galeria viva com os componentes reais. Não aplicar tipografia de capa, marcas d'água ou ornamentação em toda tela administrativa. O reconhecimento pode vir de proporção, pesos, alinhamento, espaçamento e economia de destaque.

## Achados verificáveis por arquivo

### `app/service/painel/telas/ServiceModal.tsx`

- `app/service/painel/telas/ServiceModal.tsx:571`: rótulo visual sem `htmlFor`; clicar no primeiro rótulo manteve o foco no `DIV` do diálogo no teste.
- `app/service/painel/telas/ServiceModal.tsx:619`: a variante de janela repete o mesmo padrão de rótulo desacoplado.

### `app/service/painel/campos.tsx`

- `app/service/painel/campos.tsx:185`: campo genérico sempre retorna `input` textual; telefone e e-mail foram renderizados como `type="text"`, sem `name` nem `autocomplete` no teste.
- `app/service/painel/campos.tsx:29`: calendário não fecha com Escape; gatilho sem `aria-expanded` e `aria-controls`, confirmados no navegador.
- `app/service/painel/campos.tsx:125`: seletor customizado trata clique fora, mas não estabelece interação completa de seleção por teclado. Revisar Escape, setas, escolha e retorno do foco como contrato compartilhado.

### `app/service/painel/telas/Config.tsx`

- `app/service/painel/telas/Config.tsx:735`: rótulos dos dados da igreja não estão associados aos controles; o mesmo arquivo já tem formulários com `htmlFor`, mostrando duas implementações para o mesmo problema.

### `app/service/ServiceExactApp.tsx`

- `app/service/ServiceExactApp.tsx:207`: navegação do painel depende de estado local; a área escolhida não é representada na URL. Revisar links diretos, atualização e voltar do navegador sem alterar a casca prevista no manifesto.
- `app/service/ServiceExactApp.tsx:44`: as áreas são importadas estaticamente. A separação recente em arquivos é uma melhora real; avaliar carregamento sob demanda das áreas pesadas. Não medi impacto em bytes ou tempo, portanto isto é candidato de desempenho, não gargalo comprovado.

### `app/service/page.tsx`

- `app/service/page.tsx:1010`: consultas independentes a igrejas, pessoas, membros e outros dados começam em sequência; há um `Promise.all` posterior, mas a primeira parte ainda tem uma cadeia de esperas. Avaliar dependências reais antes de paralelizar.
- `app/service/page.tsx:1243`: mensagens são carregadas sem paginação explícita; o conjunto é enviado à aplicação cliente. Avaliar paginação por conversa e dados necessários à tela inicial.
- `app/service/page.tsx:1551`: a fronteira cliente recebe dados de muitas áreas ao entrar. Medir payload e carregamento por papel antes de alterar a estratégia.

## Arquitetura: o que já melhorou

A sessão concorrente dividiu `ServiceExactApp.tsx` e `MobileApp.tsx` em arquivos por área e aba. Nesta revisão, a casca tinha cerca de 1.219 linhas e a entrada do membro, 576. Não considerei válida a crítica anterior de que esses arquivos ainda tinham 10 mil e 4 mil linhas.

A próxima evolução é dar nomes e contratos estáveis às peças de interface. A organização por arquivos ajuda a manutenção, mas a consistência visual vem de componentes reutilizáveis com variantes claras e estados completos.

## Proposta de biblioteca do Service

| Família | Contrato que precisa ficar explícito |
| --- | --- |
| Botão | Principal, secundário, discreto e risco; tamanho por contexto; ícone; carregamento; foco |
| Campo | Rótulo associado, semântica do dado, ajuda, erro e preenchimento automático |
| Seletores | Mesma abertura, navegação por teclado, escolha, cancelamento e retorno do foco |
| Cartão | Variante de resumo, item ou ação; título, metadados, rodapé e ação previsíveis |
| Lista/tabela | Alinhamento, densidade, estado selecionado, vazio, carregamento e versão mobile |
| Cabeçalho | Título, contexto, contagem e uma ação principal; sem ações dispersas |
| Feedback | Estado vazio, erro, sucesso e confirmação com linguagem e posição consistentes |

Essa biblioteca pode começar pelos componentes atuais. Uma biblioteca externa acessível pode ser avaliada para os seletores se reduzir trabalho e risco; não recomendo trocar todo o produto de base sem uma comparação concreta.

## Ordem de trabalho recomendada

1. Definir e validar uma tela de referência, Pessoas com formulário e detalhe, em celular e desktop, nos dois temas.
2. Consolidar Button, Field e os seletores, cobrindo o comportamento completo.
3. Definir as variantes de cartões e a hierarquia de ações em Times e Escalas.
4. Migrar as demais telas para essas bases, preservando módulos, dados e permissões.
5. Publicar a galeria viva e o complemento do Brand Book junto do código correspondente.

## Evidências e limites

- Capturas e medidas: `prints/service-componentes-2026-10-20/`.
- Interações reproduzidas: `interacoes.json` nessa pasta.
- Fonte das skills inspecionada: `vercel-labs/agent-skills`, commit `063bee94c3f4df8453406c830b0a7df0f2860278`. Os nove `SKILL.md` instalados coincidem com essa cópia.
- O demo tem dados limitados; não é teste de todas as permissões, todos os temas, produção autenticada ou celular físico.
- Não houve alteração no produto, no Brand Book original, commit ou deploy nesta revisão.
