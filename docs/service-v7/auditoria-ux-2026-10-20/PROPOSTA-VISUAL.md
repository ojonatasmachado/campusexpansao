# Duas direções para o Service

Propostas de investigação, sem implementação no aplicativo. Artefato: [propostas.html](propostas.html). Dados, pessoas e igreja são fictícios. O HTML contém Inter incorporada do Brand Book, estilos e comportamento local, sem bibliotecas ou requisições externas.

## O que comparar

A comparação mantém tarefas e dados iguais. Troque a direção e mantenha jornada, quantidade de atividade, tema e texto. A proposta A usa texto, espaço e divisórias como estrutura. A proposta B usa o encontro como âncora, data destacada e sequência temporal. Não se trata de trocar cor ou raio de borda: o ponto de entrada e o ritmo da leitura mudam.

A hipótese preferida é A como base da linguagem, com a clareza temporal de B para compromissos. Precisa ser validada antes de fechar: pessoas podem reconhecer encontros mais rapidamente em B; pessoas com pouca atividade podem sentir mais acolhimento e menos cobrança em A.

| Cenário | Mesma tarefa nas duas propostas | Critério de comparação |
|---|---|---|
| Membro, pouca atividade | Descobrir o próximo culto e seu local | Entende que não precisa confirmar presença? |
| Membro, muita atividade | Responder à escala e encontrar a próxima reunião | Identifica primeiro a obrigação pessoal? |
| Membro, sem atividade | Entender que não há pendência nem programação publicada | Distingue ausência de dados de erro ou falta de acesso? |
| Gestão, pouca/muita atividade | Resolver uma vaga e acompanhar visitantes | Reconhece responsável, urgência e resultado? |
| Gestão, sem atividade | Preparar o primeiro evento | Consegue começar sem conhecer todos os módulos? |
| Pastor, primeira igreja | Informar nome, país e fuso | Entende por que esses dados são necessários? |
| Gestão, primeiro evento | Informar quando, onde e forma de participação | Entende quem verá o evento antes de publicar? |

## Relação com a implementação atual

- `app/service/membro/Inicio.tsx:365`: o estado de fila vazia diz “Quando a liderança precisar de você, aparece aqui.” É uma mensagem funcional, mas define a presença da pessoa no app sobretudo como disponibilidade para solicitações. A proposta preserva “Tudo em dia” e explica ausência de resposta pendente, distinguindo esse estado da vida comunitária.
- `app/service/membro/Inicio.tsx:384`: a zona “Da igreja” já existe. A recomendação é torná-la legível e útil com dados existentes, sem inventar feed e sem criar uma obrigação de publicar notícias para o aplicativo parecer vivo.
- `app/service/membro/Inicio.tsx:388`: sem evento, o aplicativo explica que os próximos cultos e eventos aparecerão ali. A proposta amplia a clareza do estado, mas não promete informações de contato sem destinatário ou conteúdo confirmado.
- `app/service/membro/Inicio.tsx:399`: oração aparece em outro cartão depois da agenda. É útil, mas o acúmulo de superfícies pode enfraquecer a hierarquia. Deve manter entrada contextual e destinatário válido, sem competir com toda tarefa na primeira dobra.
- `app/service/painel/telas/Inicio.tsx:333`: diferenciação de início por papel já está prevista. Fortalecer essa estrutura é preferível a criar outro painel paralelo. A proposta apresentada é a visão de gestão; a visão de líder deve ter o mesmo padrão, restrito ao time.
- `app/service/onboarding/BootstrapChurchForm.tsx:141`: o primeiro campo é CNPJ. Embora opcional, antecipa burocracia brasileira para um produto internacional. A proposta começa por identidade e contexto local. Não remove necessidades fiscais: sugere deslocar dados institucionais para o momento em que forem necessários.
- `app/service/onboarding/BootstrapChurchForm.tsx:200`: cidade usa exemplo “São Paulo · SP”. País, subdivisões, fuso e formatos precisam ser modelados de forma localizada, sem pressupor Brasil para todas as igrejas.
- `app/service/lib/theme.ts`: manter `themeCss`, famílias testadas e `adaptAccent`. O protótipo usa somente cores canônicas de exemplo. Não propõe substituir o mecanismo de tema nem limitar igrejas ao oliva.

Esses são vínculos com fontes, não alegações de que todas essas telas foram observadas em produção. A auditoria principal deve cruzar cada hipótese com as capturas e jornadas atuais.

## Organização e continuidade entre pessoas

O primeiro evento fecha um ciclo: pastor informa dados essenciais, gestão revisa o encontro, membros encontram horário e local, e a equipe organiza o serviço quando houver necessidade. Criar o encontro não deve exigir criar previamente todos os times e escalas. A revisão declara o destino antes de publicar.

A gestão vê “Recepção precisa de uma pessoa”, responsável e contexto, em vez de um painel indiscriminado de atalhos. O membro vê a própria resposta e o efeito dela. Nenhum percentual de engajamento, ranking ou pontuação sobre pessoas foi introduzido.

A ação de servir aparece primeiro quando exige resposta. Evento informativo não ganha confirmação artificial. Quando a fila fica vazia, o aplicativo não inventa tarefas para preservar uma aparência de atividade.

## Regras preservadas e decisões a discutir

Preservados: Inter, marca com igreja e Service, quatro abas e Perfil pelo avatar, ausência de moldura de celular, uma ação cheia na cor da igreja, dados sensíveis fora da visão do membro, texto sobre destaque via `--accent-ink`, nenhum travessão, emoji ou losango.

O protótipo é um documento independente, não importa componentes de produção nem cria módulo. Em implementação, usar `ChurchLockup`, `AuthShell`, registro de módulos, termos configuráveis, `plural()`, `avisar()`, escala de texto e temas existentes. O protótipo representa esses contratos visualmente, sem afirmar equivalência técnica.

Pontos para aprovação antes de implementar:

1. Reduzir cartões repetidos em favor de listas e divisórias quando os itens compartilham contexto. O contrato de dados dos cartões pode ser mantido, alterando a apresentação pela casca.
2. Permitir que a comunidade e o próximo encontro tenham mais presença quando a fila estiver vazia. Compatível com as duas zonas já previstas; não exige feed.
3. Simplificar criação inicial para identidade, localização e primeiro encontro. Rever a dependência atual de campos de contato e o momento adequado de dados fiscais.
4. Rever os limites fixos de tipografia por contexto somente quando testes comprovarem necessidade. O protótipo usa 13, 17, 20, 28 e 32px com escala. Campos mantêm piso de 16px.

## Zoom e teclado no celular

O protótipo usa campos de 16px e não bloqueia zoom. Isso reduz um fator conhecido de zoom no foco em Safari, mas não confirma a causa do comportamento relatado. Devem ser verificados tamanho computado real, escala herdada, viewport, teclado, foco, altura das folhas, posição de rolagem e recuperação ao fechar o teclado. Emulação Chromium não substitui iPhone/Safari real.

Roteiro: abrir cada campo em tela estreita, escrever, alternar campo, abrir seleção/data, rolar com teclado aberto, concluir, voltar e repetir com texto máximo. Medir se foco e botão de conclusão continuam visíveis. Nunca resolver proibindo ampliação com `user-scalable=no` ou `maximum-scale=1`.

## Limites e validação

Navegação e ações são locais. O envio de mensagens, publicação e cadastro são explicitamente simulados. Países/fusos são amostras, não uma implementação completa. O seletor de atividade afeta os inícios, mantendo os formulários iguais para comparação controlada. Não há autenticação, permissão, banco, push ou persistência no protótipo.

Antes de adotar uma direção, testar com pastores iniciantes, gestores e membros de baixa familiaridade digital, incluindo pessoas acima de 60 anos. Pedir tarefas sem explicar os botões. Registrar conclusão sem ajuda, primeira escolha, erros, dúvidas e entendimento do resultado. Testar também textos traduzidos maiores, leitor de tela, teclado, claro/escuro e as sete posições reais da escala.

Consultas `ui-ux-pro-max`: dois sistemas de design (“community church dashboard accessible” e “management dashboard accessible”). Os padrões de landing page, cores e fontes retornados não se adequaram ao contrato CE.X e foram descartados. Aproveitados critérios de acessibilidade, hierarquia, contraste, alvo de toque e navegação. A consulta específica de progressive disclosure retornou resultado de tipografia fora de contexto mesmo após refinamento; apresentação progressiva aqui é hipótese de design fundamentada nas jornadas, não recomendação comprovada por essa busca. Busca de inputs retornou labels, tipos de campo e teclado apropriado. A skill não substitui testes com pessoas.

## Revisão final do protótipo

A listagem do culto no cenário de muita atividade agora distingue “Convite para servir na recepção” antes da resposta e “Você serve na recepção” depois de confirmar. Desfazer restaura o convite. A confirmação só ocorre na simulação.

País e fuso têm associação explícita entre label e select. A troca de país atualiza as opções de fuso da amostra, usando identificadores IANA em vez de offsets fixos que poderiam ficar incorretos com horário de verão. Isso continua sendo uma amostra de interação e não cobertura internacional completa.

Revisar evento usa os dados preenchidos com inserção textual segura. Simular publicação mostra um resultado explícito ao voltar ao painel e permite abrir o resultado simulado. Nenhum envio real ocorre.
