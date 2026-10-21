# Auditoria da experiência do Service

20 de outubro de 2026. Diagnóstico e propostas, sem implementação no aplicativo.

## 1. Parecer

O problema central é a distância entre a organização interna do sistema e a tarefa que cada pessoa quer concluir. O produto tem capacidades relevantes, mas frequentemente pede que pastor, líder e membro entendam sua estrutura antes de encontrar um resultado. O mesmo padrão de cartão é usado para obrigações, orientação, preferências, convites e conteúdo; isso enfraquece a leitura de prioridade.

A sensação de aplicativo parado tem mais de uma causa. Há dependência de preparação feita por outras pessoas, estados vazios que apenas prometem conteúdo futuro, ações que abrem listas sem selecionar o item desejado e uma demonstração com eventos antigos. Somado a isso, a revisão visual encontrou um bloqueio real no assistente mobile: o conteúdo das três fases fica escondido por CSS.

Minha recomendação é preservar o sistema de temas, as permissões, os módulos e a separação de responsabilidades, mas reorganizar a experiência em torno de resultados completos. Primeiro corrigir os bloqueios. Depois refazer a ativação da igreja e a hierarquia dos inícios. Por fim consolidar uma linguagem visual com menos caixas repetidas, estados reconhecíveis e densidade adequada a cada tarefa.

Não recomendo começar trocando cores, instalando outra biblioteca de componentes ou adicionando mais um feed para dar aparência de movimento. O aplicativo deve mostrar a vida real da igreja e tornar as conexões entre pessoas visíveis.

## 2. O que foi investigado

- Código atual dos 34 módulos, manifestos, rotas, permissões e componentes compartilhados. O inventário completo está em inventario-funcoes.csv.
- Doze jornadas e 48 momentos, com cinco atores e cinco categorias, em mapa-jornadas.html. Pensamentos, emoções e oportunidades são hipóteses identificadas; não representam entrevistas realizadas.
- Telas atuais capturadas pelo REA em Chromium separado, incluindo login, cadastro inicial de acesso, painel, configuração, evento, escalas, mural, quatro abas do membro, perfil, formulários, fontes mínima e máxima, tema claro e operações de gestão.
- Login com contas de teste de master, líder e dois membros em Supabase local. Igreja com programação e igreja sem programação também foram percorridas.
- Sequências históricas de quinze jornadas de 05/10 usadas como contexto. Não foram usadas como prova de defeitos atuais que o código já corrigiu.
- AGENTS.md, manifesto v7, Brand Book 3.2, Brand Library, Featmap anterior, auditorias e propostas existentes.
- Duas propostas visuais interativas para as mesmas quatro jornadas, com variação de atividade, tema e tamanho do texto. São documentos separados do produto.

### Ambientes e limites

O servidor habitual em localhost:3001 usa configuração de banco remoto. Nele percorri a demonstração e formulários sem submeter gravações. Para autenticação, preparei uma cópia temporária do código em /tmp/cex-service-ux-local-20261020, na porta 3002, apontando exclusivamente para o Supabase local em 127.0.0.1:54321 e usando contas de teste já existentes. Nenhuma migração, seed ou reset foi executado. A cópia usa webpack e desliga o indicador de desenvolvimento; essas diferenças técnicas não mudam as jornadas analisadas.

Não enviei convites, mensagens, avisos, pagamentos ou notificações. Não criei nem editei igrejas, pessoas, eventos, escalas ou registros financeiros. Os logins geraram sessões técnicas de autenticação. Preferências de escala usadas nas capturas foram injetadas no armazenamento de navegadores temporários, sem alterar o perfil no banco.

A instrumentação de métricas do site tentou rodar na cópia local e acusou configuração administrativa ausente; não foi tratada como defeito de produto. Capturas de transição antes de terminar a compilação também não são usadas como prova de tela vazia. Abertura de tela concluída não significa gravação validada.

A cobertura por cenário, imagens, passos, ambiente e Evidence ID está em capturas/manifesto.json. Contagens e verificações finais estão em VALIDACAO.md. Não foram realizados testes com usuários nem com teclado de iPhone real. Este relatório é uma auditoria fundamentada, não uma certificação de todas as combinações do sistema.

## 3. Achados prioritários

P0 significa bloqueio da tarefa inicial ou pré-requisito de uma expansão anunciada. P1 significa ruptura importante de compreensão, continuidade ou confiança. P2 significa consolidação de linguagem e consistência. A prioridade não afirma incidente em produção. O esforço indicado é relativo e precisa ser dimensionado após escolher a solução.

### F01 · O assistente inicial desaparece no celular

**P0 · Observado em execução e confirmado no código · Pastor e gestão.**

Na igreja de teste sem programação, toquei em Começar e nas três fases. Em 390px, aparecem os títulos das fases, mas nenhum formulário, botão de salvar, criar ou concluir. Em 1440px, os mesmos formulários aparecem.

A regra de evolucoes/service_app/service-app.css:2978 oculta toda .setup-card abaixo de 640px. Ela foi escrita para compactar o checklist antigo e também atinge o novo Assistente, cujo corpo usa .cfg-card.setup-card em app/service/modules/configuracao/Assistente.tsx:147.

**Consequência:** um pastor no celular recebe uma promessa de configuração guiada e fica sem ação para avançar. Isso é uma ruptura funcional antes de ser um problema estético.

**Proposta:** separar explicitamente a apresentação resumida do checklist e o conteúdo do assistente. Toda fase deve manter formulário e ação disponíveis no mobile. Sem corrigir nesta etapa.

**Evidência visual:** capturas/local-configuracao-fase1--settled.png, local-configuracao-fase2--settled.png, local-configuracao-fase3--settled.png e local-configuracao-desktop--settled.png.

**Aceitação:** começar e percorrer as fases em 320, 390, 640 e desktop; nenhum conteúdo essencial oculto; voltar e retomar mantêm o ponto correto. Teste deve proteger o comportamento do usuário, não apenas verificar o nome da classe.

### F02 · A data do primeiro evento não tem ano e pode ficar em branco

**P0 · Interface observada e contrato de dados confirmado · Gestão, líder e membro.**

O novo evento abre em um seletor de dia e mês, começando em janeiro mesmo com data corrente em outubro. Escolhi 20 de Janeiro e não há como escolher o ano. Ao preencher apenas nome e local, Criar na agenda já fica habilitado, sem data e hora.

FField usa DatePicker para todo campo date. O componente devolve texto como 20 jan, sem ano, em app/service/painel/campos.tsx:66 e :234. ServiceModal envia esse valor diretamente para events.event_date em app/service/painel/telas/ServiceModal.tsx:159. A coluna é date em supabase/migrations/0006_service_operations.sql:17. Agenda.tsx:41 não declara data e hora obrigatórias.

Não submeti o formulário. Portanto, não afirmo qual mensagem o banco devolveria. O defeito demonstrado é a ausência de uma data civil completa no contrato e a habilitação de criação sem os dados que tornam um evento encontrável na agenda.

**Proposta:** distinguir data completa, dia/mês de aniversário e hora. Publicação exige data válida e política explícita para horário ou dia inteiro. O seletor começa no contexto temporal da igreja, permite ano e retorna ISO completo.

**Evidência:** capturas/evento-data--choose-day.png, evento-data-escolhida--settled.png e evento-sem-data-habilitado--settled.png.

**Aceitação:** ano atual e seguinte, fevereiro bissexto, edição, reserva de sala e aparecimento no app no mesmo dia. Um rascunho sem data não deve se apresentar como encontro publicado.

### F03 · O convite obriga endereço brasileiro antes do vínculo

**P0 para expansão internacional · Confirmado no código, sem concluir convite.**

ConviteForm.tsx:28 exige CEP de oito dígitos. CepInput remove caracteres e limita o tamanho. A pessoa que mora em Portugal ou usa código postal alfanumérico não consegue fornecer seu endereço real. O caminho por código tem perguntas diferentes, portanto o esforço de entrada varia conforme o link recebido.

O onboarding do membro já foi reduzido para dois passos; não é o antigo fluxo de seis telas. Mas a exigência anterior no convite enfraquece essa simplificação.

**Proposta:** identificação, vínculo e acesso primeiro; endereço depois, quando necessário e com formato do país. Validar cliente e API juntos. Detalhes em QUALIDADE-E-INTERNACIONAL.md.

### F04 · O início da igreja nova pede escala antes de produzir valor

**P1 · Observado em igreja local sem programação.**

Mesmo sem culto futuro ou times, Montar escala é o botão principal, indicadores com zero vêm antes da orientação e o painel chega a dizer Escala coberta. Nenhuma vaga aberta nesta semana. Ausência de eventos não é cobertura bem-sucedida.

O banner Sua igreja: fase 1 de 3 fica depois dos indicadores. O caminho útil para ativação perde prioridade para a estrutura do painel. A captura local-igreja-vazia--settled.png demonstra a primeira dobra; o texto de escala coberta consta na árvore acessível do mesmo cenário e no ramo Inicio.tsx:484.

**Proposta:** primeira entrada orientada a um resultado escolhido: publicar primeiro encontro, organizar equipe ou migrar cadastro. O início muda para rotina quando houver preparação suficiente. Sem programação, dizer o que falta e oferecer a ação apropriada.

### F05 · O assistente conclui etapas de sistema, sem comprovar o primeiro resultado

**P1 · Observado no desktop e confirmado no código.**

Fase 2 reúne horários, série até dezembro e quatro modelos de times pré-selecionados. Fase 3 envia para Times para marcar líderes e depois para Escalas. Concluir não verifica se existe um evento útil, líder vinculado, convite aceito ou escala publicada.

As oito sugestões de horário são as únicas opções dessa fase. Não atendem uma igreja cujo encontro seja sexta às 19h, por exemplo, embora o produto já suporte outros horários em outro caminho. Referências: modules/configuracao/setup.ts:36 e Assistente.tsx:188, :223 e :250.

**Proposta:** primeiro encontro individual com prévia do que o membro verá. Repetição, times e personalização entram como continuação contextual. Convidar líder deve terminar no vínculo do papel e do time, ou explicar claramente a pendência. Não exigir escala quando o objetivo é apenas publicar programação.

### F06 · O início do membro transforma tudo em demanda

**P1 · Observado no demo e confirmado no construtor da fila.**

Aviso, tarefa, cadastro, instalação, próximo passo e recrutamento usam o mesmo espaço e a mesma moldura. Na primeira dobra atual há aviso urgente, tarefa administrativa antiga e completar cadastro; a vida da igreja vem depois.

Já existe ordenação por prioridade, limite de três e seção Da igreja. Esses mecanismos são bons, mas não bastam: três cartões altos não equivalem a três itens visíveis sem rolar. Na fonte máxima, o segundo cartão já ultrapassa a primeira dobra.

A amostra demonstrativa tem datas antigas, por isso não generalizo seu conteúdo para membros reais. O problema de organização permanece no código: Inicio.tsx:221-240 coloca tarefas de naturezas distintas na mesma fila.

**Proposta:** a fila concentra o que exige resposta pessoal agora. Conteúdo e encontro têm apresentação própria; preferências de cadastro ficam discretas e adiáveis. Não promover servir ou contribuir só para preencher a tela.

### F07 · Sem pendências, a experiência orienta a esperar a liderança

**P1 · Confirmado no código; efeito sobre percepção é hipótese de produto.**

O estado vazio diz Quando a liderança precisar de você, aparece aqui. A seção de igreja vazia apenas promete próximos eventos. Isso comunica ausência de tarefas, mas pouco pertencimento e pouca autonomia. Inicio.tsx:365 e :389.

**Proposta:** Tudo em dia confirma a ausência de pendências em uma área curta. O restante mostra próximo encontro real, orientação de chegada, conteúdo válido ou contato disponível, conforme a preparação da igreja. Quando não houver nada publicado, explicar honestamente o estado e dar uma saída possível. Não inventar notícias, mensagens ou eventos; não obrigar a gestão a alimentar um feed diário.

### F08 · Ler o aviso exige procurá-lo de novo

**P1 · Observado.**

Toquei no aviso urgente sobre mudança de salão. O app abriu o mural inteiro, com esse aviso em terceiro lugar. O botão promete um objeto específico, mas entrega uma categoria. Inicio.tsx:274 navega para mensagens/mural sem id do aviso.

O mesmo padrão existe em Ver a tarefa, que abre Minha agenda sem selecionar o cartão; precisei expandi-lo novamente. Inicio.tsx:264.

**Proposta:** abrir o objeto exato com título e contexto; voltar leva ao ponto de origem. Links internos e notificações devem transportar a mesma identidade do objeto.

**Evidência:** membro-aviso-destino--settled.png e membro-tarefa-destino--settled.png.

### F09 · Abrir o mural zera novidades antes de comprovar visualização

**P1 · Mudança local de estado observada e regra confirmada.**

O badge de três novidades desapareceu ao abrir a lista, mesmo com itens abaixo da dobra. Mural.tsx:18 percorre todos os avisos e chama onReadAnnouncement na montagem.

**Consequência:** a gestão pode interpretar vista por como leitura de cada aviso, embora a implementação registre abertura da lista. Isso afeta lembretes, prioridade e confiança entre comunicação e membro.

**Proposta para decisão:** nomear exatamente o que se mede. Separar disponibilizado, visualizado segundo critério definido e respondido quando houver resposta. Não inferir compreensão. Reavaliar a semântica antes de mudar a métrica.

### F10 · O painel repete informação e espalha o trabalho

**P1 · Observado em master e líder locais.**

Saúde, indicadores antigos, pendências, cobertura e próximos eventos coexistem. A mesma escala reaparece em Ver agenda, Montar escala, Para resolver, Pendências da escala e Próximos cultos. As entradas são úteis em contextos diferentes, mas acumuladas no início têm o mesmo peso.

No líder, a redução de escopo já funciona: vi Para resolver no seu time e cobertura apenas do Louvor. Ainda apareceu Configuração 4 de 5, uma pendência institucional cujo resultado e responsabilidade não são claros para esse papel.

**Proposta:** gestão começa por exceções e compromissos; indicadores ficam em um panorama consultável. Líder começa no seu time. O painel inicial de uma igreja nova tem outra composição, mantendo a mesma casca e registro de módulos.

### F11 · A superfície das ações nem sempre distingue rotina de configuração

**P1 · Observado em Times, Visitantes, Financeiro e Crianças.**

Times junta equipes, funções, títulos ministeriais, requisitos e etiquetas. Visitantes apresenta Funil, Lista, Painel, Regras, QR/link e cadastro no cabeçalho. Financeiro abre com quatro operações, quatro abas, mês e vários blocos de zero. Crianças sem cadastros oferece criar criança e criar evento Kids com ações concorrentes.

Não proponho remover essas funções. Proponho que a tarefa diária tenha entrada clara, que configurações ocasionais sejam secundárias e que primeiro uso tenha menos decisões simultâneas. Em tesouraria, o usuário experiente pode precisar de densidade maior que o membro no celular. A mesma densidade não deve governar todo o produto.

### F12 · Caminhada reúne trajetórias, biblioteca, pagamento e identidade

**P1 · Observado e confirmado.**

Na mesma aba aparecem etapas, cursos, Bíblia, Pix e identidade da igreja. Para quem concluiu etapas, a primeira mensagem é Todas as etapas concluídas, seguida de um resumo repetido. O nome Caminhada não informa, por si só, que ali há contribuição financeira.

**Proposta:** manter as quatro abas como base de teste, mas separar visualmente trajetória pessoal, formação e recursos voluntários. Contribuir tem entrada contextual e no perfil; testar onde as pessoas realmente o procuram. Não quebrar a casca apenas para acomodar cada função nova.

### F13 · Times procuram pessoas não significa que a igreja abriu vagas

**P1 · Confirmado no código.**

timesAbertos é derivado dos times aos quais a pessoa não pertence, não de recrutamento explicitamente aberto. Inicio.tsx:196, :240 e :333. Um membro novo pode receber uma pressão para servir que não corresponde à intenção do gestor.

**Proposta:** distinguir existência de time, possibilidade de conhecer e chamada de recrutamento. Mostrar intenção real, requisitos, responsável e acompanhamento do pedido. Não usar esse cartão como preenchimento de vazio.

### F14 · Datas, contatos e pagamentos ainda pressupõem Brasil

**P0 antes de expansão, P1 dentro de fusos brasileiros · Confirmado.**

todayISO, saudação, elegibilidade temporal, exportação ICS e silêncio usam Brasília. Telefones e links WhatsApp assumem +55 em caminhos importantes. Endereços usam CEP/UF e moeda usa R$. Pix é regional. Renomear termos da igreja não é internacionalização.

**Proposta:** país, fuso e moeda da igreja; locale da pessoa; telefone internacional; código postal localizado; conteúdo escrito pela igreja separado dos textos do produto. Definir os primeiros mercados antes de implementar pagamentos e regras fiscais. Não prometer suporte global com uma tradução isolada.

### F15 · Zoom e teclado precisam de correção sistêmica baseada em reprodução

**P1 · Relato ainda não reproduzido em Safari real; combinação técnica confirmada.**

Já há proteção de fonte de campos no toque e viewport que permite ampliação. A escala pessoal, porém, usa zoom geométrico no conteúdo, onboarding e folhas. Fontes, dimensões e alvos podem diminuir juntos na posição mínima.

Capturei o início nas escalas mínima e máxima e a folha de ajuste. Isso valida a mudança de geometria no Chromium, não o comportamento do teclado iOS. O bug relatado pode depender da combinação fonte efetiva, teclado, viewport e rolagem. A correção não deve ser bloquear o zoom do usuário.

**Proposta:** medir foco, escala visual, retângulos, campo e CTA antes/durante/depois do teclado; comparar aba e PWA em Safari real. Se comprovado, separar escala tipográfica de tamanho de campo e alvo. Matriz detalhada em QUALIDADE-E-INTERNACIONAL.md.

### F16 · Acessibilidade não pode ser inferida só da aparência

**P1 · Falhas específicas confirmadas e base positiva existente.**

Alguns formulários do membro expõem rótulos visuais sem nome programático: na árvore de Editar meus dados, o nome aparece como textbox sem nome e telefone depende do placeholder. O CEP compartilhado não recebe associação completa de nome, erro e descrição. Isso torna o preenchimento mais difícil por leitor de tela e controle por voz.

FormScreen já contém mecanismos de foco, inércia, fechamento e confirmação de descarte. Não precisa ser recriado. Completar os componentes que escaparam do contrato e verificar VoiceOver/TalkBack.

### F17 · Contraste de paleta aprovado não resolve hierarquia de superfícies

**P2 visual e P1 quando envolve leitura essencial.**

O teste atual de contraste passou para as oito famílias e acentos ajustados. A paleta de tema é uma base boa. Mas cards, campos e fundos próximos, bordas discretas e muitos textos secundários ainda podem deixar a tela sem pontos claros de leitura. Há réguas diferentes para texto, subtle e borda; passar o script não certifica todos os elementos reais.

**Proposta:** papéis semânticos de superfície, menos caixas aninhadas, títulos com relação clara ao conteúdo e estados com texto. Preservar famílias da igreja e adaptAccent. Não impor um novo verde ou proibir cores permitidas no Service.

### F18 · O ponto branco específico ainda não tem causa comprovada

**P2 · Investigação delimitada.**

Vi ícones, contadores, círculos de etapa e marcadores com funções diferentes. A folha atual transforma chip::before de ponto em máscara de ícone e esconde a variante neutra deliberadamente. Um chip sem variante pode cair num fallback. Isso precisa ser verificado no elemento exato; não há evidência para culpar uma regra genérica de listas.

O círculo com N e o indicador de issue que aparecem em algumas capturas da porta 3001 são ferramentas do Next em desenvolvimento, não componentes da experiência publicada. A cópia de teste na porta 3002 os omite. Esse detalhe não explica automaticamente o ponto relatado por você.

**Proposta:** catálogo de estados com significado e texto, em claro/escuro, incluindo carregamento, vazio, sem permissão e falha. Um marcador decorativo nunca deve ser o único sinal de estado.

### F19 · Há tarefas sem continuidade suficiente entre duas pessoas

**P1 · Dependências confirmadas, efeito sobre compreensão a validar.**

Convite enviado, WhatsApp aberto, pedido de troca em conversa, importação de ficha e registro de presença são etapas de um serviço. Nenhuma delas, isoladamente, prova que a próxima pessoa concluiu sua parte.

**Proposta:** cada transição mostra responsável, estado atual, próximo passo e retorno esperado. Troca de escala precisa fechar a vaga, não terminar apenas na mensagem. Importação precisa diferenciar cadastro, convite e acesso ativo. A matriz de quinze transições está em JORNADAS-E-CONEXOES.md.

### F20 · Tempo sem presença registrada não é prova de ausência

**P1 · Hipótese de confiança derivada do modelo.**

A lista de cuidado depende de haver registros de presença. O demo exibe pessoas sem presença há quinze semanas porque usa eventos de julho. Sem informar a cobertura da coleta, um gestor pode interpretar falha de registro como afastamento real.

**Proposta:** declarar a fonte e o limite da informação, permitir justificativa e registrar contato como fato. Preservar cuidado sem ranking, pontuação ou gamificação.

### F21 · Dados de demonstração podem fabricar uma experiência morta

**P1 para avaliação e venda · Observado no demo.**

O demo apresenta eventos de julho, escala de julho e tarefa do primeiro semestre em outubro, enquanto alguns avisos recebem data atual. O painel pede resolver vagas e simultaneamente diz que não há culto futuro. Isso não prova comportamento equivalente em produção, mas prejudica a própria demonstração do valor do produto.

**Proposta:** cenários determinísticos relativos à data da igreja: nova, pequena, ativa e muito movimentada. Dados devem representar um ciclo completo entre pastor, líder e membro. A qualidade da demonstração é parte da experiência comercial.

### F22 · Voltar, recarregar e abrir uma notificação exigem um contrato comum

**P1 · Estado interno confirmado; comportamento de Voltar do aparelho não certificado.**

O membro navega por tab/sub em estado local, sem sincronização equivalente de todas as telas internas com URL. Alguns formulários já possuem histórico próprio, mas isso não cobre todos os destinos. A URL genérica e CTAs sem id dificultam retomar o mesmo objeto.

**Proposta:** definir navegação por objeto, retorno ao contexto, retomada depois de autenticar e ação em notificação. Validar navegador, Android e PWA; não substituir o problema por mais botões Voltar em todos os lugares.

### F23 · Zero, não carregado e indisponível precisam de apresentações distintas

**P1 · Risco confirmado por análise de caminhos de erro.**

Além de Escala coberta sem eventos, consultas paralelas do financeiro podem ter falha em saldos/fechamentos sem compor o erro principal. Um zero financeiro ou uma agenda vazia têm significado operacional; não devem ser o estado substituto de falha silenciosa.

**Proposta:** estado explícito por seção, recuperação local, preservação dos dados já confiáveis e mensagem que diga o que está indisponível. Não foi simulada falha de rede financeira nesta auditoria.

### F24 · Regras visuais precisam deixar espaço para validar o serviço

**P2 estrutural · Proposta, não mudança realizada.**

As quatro abas, registro de módulos, termos da igreja e tema são bons mecanismos de estabilidade. O risco é confundir estabilidade da casca com congelamento de uma composição que não ajuda a tarefa. A lei de até três cartões pode conviver com uma única ação dominante e listas compactas. Tudo em dia pode ser curto, sem ocupar o centro da experiência vazia.

**Proposta:** aprovar adendos de contrato de jornada, primeiro resultado, estados, internacionalização e validação mobile. Manter regras atuais até a decisão explícita. Ver seção 7.

## 4. Como reorganizar o produto

### Início do membro

1. Identificação da igreja e contexto útil do dia.
2. Resposta pessoal mais importante, somente quando existir.
3. Próximo encontro real com horário, local e o que a pessoa precisa saber.
4. Novidades e oportunidades apropriadas ao vínculo, sem repetir obrigações.
5. Acesso previsível às demais abas e ao perfil.

Sem tarefas: confirmação curta, encontro/contexto da igreja e saída útil. Sem programação publicada: explicar o estado, contato válido quando disponível e sinalizar à gestão a preparação incompleta. Não exibir uma ação inviável só para preencher espaço.

Com muita atividade: uma resposta dominante, outras organizadas por prazo e vínculo. Aumentar densidade com listas, não com uma parede de cards idênticos. Aviso urgente tem destino direto e não exige redescoberta.

### Início da gestão

Igreja nova começa no resultado inicial. Igreja em operação começa no que precisa de intervenção, com responsável e próximo compromisso. Saúde da igreja vira panorama que se consulta; não substitui a fila de trabalho. Líder vê seu time e não herda automaticamente pendências institucionais.

### Funções especializadas

Tesouraria, secretaria, recepção e Kids precisam de entradas coerentes com a tarefa. Rotina, consulta e configuração têm hierarquias diferentes. O registro pode continuar único, gerando exposições por contexto. A intenção não é criar um menu de 34 itens nem esconder tudo em Mais.

### Conexões essenciais

Pastor prepara encontro → membro encontra o encontro → líder prepara equipe quando necessária → voluntário responde → cobertura se atualiza → gestão sabe o resultado.

Visitante chega → recepção assume contato → pastoral acompanha → vínculo e acesso são resolvidos → novo membro sabe onde continuar.

Família cadastra criança/responsáveis → equipe valida requisitos → check-in registra entrega → família conhece o estado → retirada exige verificação presencial adequada.

Formação abre turma/aula → membro encontra sua próxima atividade → presença/conclusão é registrada → histórico e gestão refletem o fato.

Esses ciclos, e seus caminhos de falha, devem orientar os componentes. O detalhe de cada etapa está no mapa navegável e na matriz de transições.

## 5. Duas direções visuais para comparar

### A · Comunidade editorial

Hierarquia por tipografia, espaço, títulos e divisórias. Menos superfícies fechadas; o contexto da igreja precede a ferramenta. Boa candidata para identidade do membro e igrejas com pouca atividade. Precisa provar que as ações continuam descobertas sem excesso de caixas.

### B · Agenda e ação

Próximo encontro como âncora, data legível e sequência temporal. Boa candidata para agenda, escala e rotina do líder. Precisa evitar que toda participação pareça obrigação ou confirmação.

Minha hipótese preferida é usar A como linguagem geral e B para compromissos. A escolha não está aprovada nem validada com usuários. Comparar as duas com as mesmas tarefas, sem escolher apenas pela aparência da tela mais preenchida.

O protótipo propostas.html permite alternar membro, gestão, primeira igreja e primeiro evento; sem/pouca/muita atividade; claro/escuro; e três tamanhos de texto. As ações são simulações locais. Não é uma versão implementada do Service. Não introduz dependência de outra biblioteca visual.

## 6. Sequência de melhoria recomendada

| Onda | Resultado a perseguir | Escopo principal | Critério de saída |
|---|---|---|---|
| 0 · Desbloquear | Pastor consegue começar no celular e criar encontro com data correta | F01, F02, estados falsos de sucesso de F04 | Assistente utilizável; data completa; evento de teste aparece em painel e membro |
| 1 · Ativar a igreja | Primeiro uso produz valor reconhecível | F04, F05, F19; convite e vínculo | Uma igreja nova termina com resultado útil e a próxima pessoa sabe continuar |
| 2 · Orientar a semana | Membro e líder reconhecem o que importa | F06-F13, F22 | Evento/aviso/tarefa abrem o objeto certo; início vazio faz sentido; líder vê seu trabalho |
| 3 · Consolidar linguagem | Legibilidade e interação consistentes | F15-F18 e estados de F23 | Matriz mobile/teclado/tema/texto validada; estados com significado |
| Internacional · Antes do mercado correspondente | Uso correto fora do Brasil e de Brasília | F03, F14 e catálogos traduzíveis | Convite, telefone, endereço, tempo, moeda e conteúdo passam nos países escolhidos |
| Demonstração · Em paralelo | Apresentação comercial fiel | F21 | Cenários relativos à data e ciclo completo entre personas |

A dependência mais importante é a sequência 0 → 1 → 2. Internacionalização tem decisões de modelo que devem começar cedo, mesmo que o primeiro lançamento seja Brasil. Polimento não deve atrasar a correção do assistente oculto.

## 7. Decisões e adendos para sua aprovação

Não alterei AGENTS.md nem o manifesto. Proponho discutir:

1. Todo módulo declara a jornada que habilita, quem prepara dados, quem recebe o resultado e como a operação termina ou se recupera.
2. Estado vazio distingue sem tarefa, sem programação, sem permissão, ainda não configurado e falha. Nunca apresentar zero como substituto de erro.
3. O início se adapta à maturidade da igreja e ao papel. A casca estável não obriga a mesma composição para pastor novo e líder recorrente.
4. A fila mantém contrato e ordenação, mas pode renderizar lista compacta ou cartão conforme a tarefa. Três entradas não devem virar obrigação de três grandes caixas.
5. Todo CTA por objeto transporta seu id e preserva o caminho de volta. Métricas distinguem aberto, visualizado e respondido.
6. País/fuso/moeda da igreja e locale da pessoa são explícitos. Dados fiscais e pagamentos são capacidades regionais.
7. Tipografia, campos e alvos têm contratos separados após escala. Proibido tratar bloqueio de zoom como correção de usabilidade.
8. A aprovação visual exige testar vazio, pouca e muita atividade, com papel restrito e dados atuais. Uma tela bonita preenchida não basta.

Inter, ChurchLockup, temas, adaptAccent, quatro abas como base, permissões, modularidade, privacidade e ausência de gamificação continuam sendo ativos do projeto. Propor ajustes não significa desconsiderá-los.

## 8. Validação com pessoas e dispositivos

Os roteiros detalhados estão em VALIDACAO.md. Usar tarefas sem explicar o sistema antes: cadastrar igreja, publicar primeiro encontro, localizar o encontro como membro, encontrar mensagem específica, responder escala, pedir troca e acompanhar resultado.

Incluir pastor iniciante, gestor recorrente, líder com escopo, membro que não serve e pessoa com baixa familiaridade digital. Incluir pelo menos pessoas acima de 60 anos. Uma rodada pequena de testes qualitativos encontra rupturas; não permite afirmar percentuais populacionais.

Registrar primeira escolha, necessidade de ajuda, erros, retorno ao contexto e entendimento do resultado. Perguntar ao final o que a pessoa acha que aconteceu e quem precisa agir agora. Testar iPhone Safari/PWA real para fechar o zoom relatado.

## 9. O que preservar e o que não repetir das auditorias anteriores

O registro de módulos e os filtros atuais já resolvem problemas anteriores de secretaria delegada. A carteirinha já tem rota parametrizada correta. Financeiro já pagina e inclui recorrências, campanhas e fechamentos. Publicação parcial de escala já tem retomada. O início do membro já tem duas zonas e ordenação. Oração já tem público e destinatário; troca já busca a cadeia de responsáveis. Essas bases devem ser usadas.

A nova análise desloca o foco de quantidade de recursos para continuidade: resultado inicial, destino correto, contexto, estado honesto e passagem de responsabilidade. É esse conjunto que deve guiar a próxima implementação.
