# Proposta: capítulo de interface do Service no Brand Book

Status: proposta baseada na revisão de 20/10/2026. Não altera o Brand Book original nem substitui o `AGENTS.md`.

## Objetivo

Transformar a identidade CE.X em um padrão verificável de componentes do produto. O Brand Book atual explica marca e composição editorial; este complemento deve explicar o desenho e o comportamento da interface usada diariamente.

## 1. Corrigir divergências da documentação atual

No arquivo `brand/CEX Brand Book v3.2 - Standalone (2).html`, revisar:

- Seção 01, texto de apresentação do logo: ainda descreve CE regular e X leve em itálico, enquanto a especificação técnica da própria seção e o `AGENTS.md` determinam peso 700 para CE e .X, sem itálico.
- Seção 02, área de proteção: ainda define a unidade por um X itálico. Usar a forma oficial atual do logo.
- Seção 05: separar expressamente a escala editorial da escala da interface. Caption de peça gráfica não determina o tamanho de leitura de um painel ou do app.
- Referências de componentes e exemplos: apontar para os tokens e regras canônicas do repositório. Não criar uma segunda paleta num documento paralelo.

O arquivo é um HTML standalone com conteúdo incorporado. A revisão editorial deve alcançar o conteúdo efetivamente exibido, não apenas o invólucro externo.

## 2. Explicitar as três aplicações da identidade

| Aplicação | Direção |
| --- | --- |
| Marca e conteúdo editorial CE.X | Composição, paleta e linguagem da marca conforme as leis atuais |
| Produto Service | Inter, estrutura e componentes CE.X; cores, neutros, logo e nome da igreja conforme as exceções do projeto |
| Canvas e página pública da igreja | Liberdade de identidade da igreja dentro dos escopos já autorizados |

A fonte, a estrutura e a qualidade dos componentes sustentam a identidade do Service mesmo quando a igreja escolhe uma cor diferente do oliva. A regra de personalização não deve ficar escondida apenas na documentação técnica.

## 3. Escala tipográfica de produto

Documentar as escalas existentes, sem introduzir uma terceira:

- Painel: 12, 13, 14, 16, 20 e 32.
- App do membro: 13, 15, 17, 20 e 28.
- Caixa alta e mono apenas nos usos autorizados pelo manifesto; não transformar todo rótulo em sobretítulo.
- Mostrar exemplos de título, nome da pessoa, descrição, metadado, preço/valor e erro, com os respectivos papéis.
- Mostrar o comportamento com tamanho de texto ampliado e conteúdo longo.

A diferença de escala entre painel e membro é intencional. As variações dentro do mesmo contexto precisam ter significado definido.

## 4. Anatomia dos componentes

Cada componente deve ter uma ficha com finalidade, estrutura, variantes, estados, medidas e referência ao código.

### Botões

Definir principal, secundário, discreto e risco; uso de ícone; largura cheia; estado ocupado; foco; desabilitado; ação no rodapé e ação na linha. Identificar uma ação de maior destaque por contexto. Registrar as exceções autorizadas, como o estado ligado dos interruptores.

### Campos e seletores

Definir posição e associação do rótulo, ajuda, erro, valor preenchido, obrigatório, edição, somente leitura e carregamento. Padronizar abertura, escolha, Escape e retorno do foco nos seletores. Mostrar teclado apropriado para telefone, e-mail e número.

### Cartões

Definir variantes semânticas:

- Resumo: valor, significado e período.
- Item: identificação, informação principal e acesso ao detalhe.
- Ação: situação, contexto, prazo e próximo passo.

A moldura pode compartilhar tokens, mas o conteúdo de cada variante precisa responder a uma pergunta clara. Usar exemplos reais de Pessoas, Times, Escalas e Mural.

### Listas e tabelas

Definir densidade, alinhamento de números, quebra de nomes, informação secundária, seleção, ações por linha e apresentação mobile. O exemplo deve incluir nome longo, dado ausente e lista vazia.

### Diálogos e formulários

Definir quando usar janela, gaveta ou tela de formulário; comportamento ao cancelar, alterações não salvas, foco, teclado e área segura. Preservar o `FormScreen` já adotado para formulários longos.

## 5. Tokens com função explícita

Documentar o papel dos tokens já usados para espaço, canto, borda e superfície. O sistema atual contém cantos de 8px nos controles, 14px em superfícies do painel e 20px em cartões do membro. Essas diferenças precisam estar ligadas a contextos, não parecer escolhas soltas.

Mostrar exemplos de distância entre campos, grupos e seções. Definir quais superfícies precisam de borda e quais podem se separar por espaço ou tom. Evitar várias molduras com o mesmo peso numa única tela.

O documento referencia os tokens do código; não duplica suas definições como outra fonte de verdade.

## 6. Responsividade e qualidade

Cada ficha deve apresentar versão de painel e membro quando aplicável, além dos estados de foco e texto ampliado. As verificações mínimas incluem 320, 390, 768 e 1440px, tema claro e escuro e teclado.

Respeitar as metas do projeto para toque, área segura, contraste e escala do texto. Mostrar que conteúdo longo quebra ou é resumido de maneira deliberada, sem usar overflow oculto como solução para perda de informação.

## 7. Páginas de referência

O capítulo deve conter poucas telas completas construídas com os componentes reais:

1. Pessoas: busca, filtros, lista e detalhe.
2. Novo membro: formulário, ajuda, erro e confirmação.
3. Escalas: estado inicial, seleção e resposta.
4. Início do membro: ação principal, ações secundárias e fila vazia.
5. Configurações: índice e edição, nos dois temas.

Essas páginas passam a ser referências de revisão. Novas telas são comparadas com elas antes de serem publicadas.

## 8. Como manter o padrão

A galeria deve importar os mesmos componentes usados no produto. Cada ficha informa a implementação e os tokens consumidos. Uma mudança no componente atualiza a galeria e as telas que o reutilizam.

Os exemplos precisam cobrir vazio, carregando, erro, sucesso, selecionado, desabilitado e conteúdo longo quando esses estados existirem. A aparência e o comportamento fazem parte do mesmo contrato.

## Resultado esperado

Um agente ou desenvolvedor deve conseguir construir uma tela nova escolhendo componentes e composições existentes, com poucas decisões visuais locais. O Brand Book continua cuidando da identidade ampla; o capítulo do Service traduz essa identidade em escolhas concretas de produto.
