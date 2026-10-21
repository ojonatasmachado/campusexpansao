# Service: jornadas e conexões entre personas

20/10/2026. Análise estática do checkout atual, complementar à inspeção visual feita em outra frente. Não altera aplicativo, regras ou dados. A skill journey-mapper foi aplicada para construir mapa autocontido com seu build.py: 12 jornadas, 48 momentos, cinco atores e cinco categorias. Pesquisa com usuários ainda não foi fornecida: campos de evidência de pesquisa estão vazios, sentimentos não foram pontuados. O mapa descreve percursos possíveis no código; não certifica banco implantado, acessibilidade nem execução ponta a ponta.

## Conclusão de serviço

[Assumption] A dificuldade central é o custo de conectar as funções. O registro organiza módulos e permissões, mas a pessoa precisa completar uma cadeia de preparação para outra pessoa encontrar valor: igreja → local → evento → comportamento público → pessoas → time/função → convite → vínculo de conta → publicação → confirmação → retorno. A implementação tem bons mecanismos recentes, mas a cadeia continua distribuída entre assistente, módulos, detalhes e configurações.

Não se deve aumentar conteúdo artificialmente para tornar o app vivo. A prioridade proposta é tornar visível o conteúdo real, explicar o próximo resultado e reduzir o esforço administrativo para preparar esse resultado.

## Achados atuais com fonte

| ID | Observação de código | Efeito a validar | Proposta e prioridade |
|---|---|---|---|
| J01 | Convite individual exige CEP de oito dígitos antes de criar acesso. `app/service/convite/ConviteForm.tsx:28`, `:91`. Onboarding posterior diz que CEP fica para depois em `app/service/membro/Onboarding.tsx:59`. | [Assumption] Duas portas impõem custos diferentes para o mesmo objetivo; endereço vira barreira antes do valor. Fora do Brasil, um postal code válido pode ser recusado. | P0: unificar contrato da entrada e coletar localização conforme país, depois do acesso quando dispensável. |
| J02 | Cadastro de igreja começa por CNPJ opcional e consulta Receita Federal. Não há escolha de país no formulário. `app/service/onboarding/BootstrapChurchForm.tsx:143`, `:156`, `:188`. | [Assumption] A experiência se apresenta como exclusivamente brasileira mesmo quando o campo é opcional. | P0 para expansão: país e idioma contextuais; identificação fiscal opcional e localizada. |
| J03 | Entrada exige telefone com DDD de 10 a 13 dígitos. `app/api/service/entrada/route.ts:43`. Primeiro acesso valida DDD em `app/service/membro/comum.tsx:18`. | [Assumption] Números de outras regiões e convenções locais podem falhar ou ficar ambíguos. | P0 para expansão: país/indicativo e armazenamento internacional, com exibição local. |
| J04 | `todayISO`, saudação e hora atual fixam America/Sao_Paulo; eventos futuros dependem dessas funções. `app/service/lib/date.ts:47`, `:66`, `:72`, `:78`. | [Assumption] Igrejas em outro fuso podem receber saudação, dia e classificação de evento incorretos. Não é apenas tradução. | P0 para expansão: fuso da igreja para encontros e contexto explícito para pessoa que está viajando. |
| J05 | Fase 2 do assistente oferece oito horários predefinidos, sem horário livre nessa tela, e fim do ano como horizonte. `app/service/modules/configuracao/setup.ts:36`, `:55`; `Assistente.tsx:188`. | [Assumption] Igreja com rotina diferente precisa pular e descobrir outro fluxo; criar série até dezembro exige decidir demais antes do primeiro resultado. | P1: começar com um encontro e opção de repetir depois; horário livre além dos atalhos. |
| J06 | Fase 3 convida, mas manda sair para Times para marcar liderança e para Escalas para montar escala. Concluir grava conclusão sem validar resultado. `app/service/modules/configuracao/Assistente.tsx:223`, `:231`, `:250`; `:69`. | [Assumption] Terminar assistente pode ser confundido com igreja pronta, embora líder/time/publicação ainda estejam incompletos. | P1: roteiro por resultado, com retorno preservado e estado explícito: convidado, aceitou, vinculado, publicado. Não bloquear implantação por recursos opcionais. |
| J07 | Evento é criado com dados básicos; regra de aviso/presença/inscrição está em outra aba do detalhe, que abre inicialmente em Cronograma. `app/service/painel/telas/Agenda.tsx:41`; `Evento.tsx:46`, `:59`, `:124`. | [Assumption] Pastor cria evento sem perceber que precisa decidir separadamente o que o membro poderá fazer. | P1: criação em dados essenciais → participação → revisão/publicação; avançados depois. |
| J08 | Início vazio informa “Quando a liderança precisar de você, aparece aqui”. Da igreja vazio apenas diz que próximos eventos aparecerão. `app/service/membro/Inicio.tsx:365`, `:389`. | [Assumption] A pessoa é orientada a esperar demandas; sem conteúdo preparado, não encontra propósito ou sinal de comunidade. | P1: acolhimento contextual real, próximo encontro ou contato legítimo; gestão recebe checklist para preparar o app. Não fabricar atividade. |
| J09 | Caminhada concentra etapas, cursos, Bíblia e Pix; sem etapas, título calcula “0 de 0 etapas concluídas”. `app/service/membro/Caminhada.tsx:163`, `:187`, `:191`, `:195`. | [Assumption] Objetivos diferentes compartilham um lugar abstrato; pessoa pode não procurar contribuição ou leitura ali. | P1: testar agrupamento Trajetória / Aprender / Práticas da igreja, mantendo acesso frequente claro. Decisão pode exigir ajuste da lei da casca. |
| J10 | Etapa feita/em andamento tem ícone; demais estados renderizam span sem conteúdo, com classe de estado. `app/service/membro/Caminhada.tsx:176`. | [Assumption] Pode explicar parte do relato de bullet branco ou vazio, mas cor e aparência exigem inspeção visual. | P1: sistema semântico de estados com rótulo e forma consistentes; nunca depender só do ponto ou da cor. |
| J11 | Botão “Ver a tarefa” leva a Minha agenda, sem ID de tarefa. “Ler a publicação” leva ao Mural, sem ID da publicação. `app/service/membro/Inicio.tsx:264`, `:274`. | [Assumption] A pessoa precisa reencontrar o item que acabou de escolher, principalmente em igreja ativa. | P1: abrir objeto exato e preservar origem/rolagem na volta. |
| J12 | Troca de escala cria conversa; mensagem ao candidato pede combinar com liderança. `app/service/membro/Inicio.tsx:105`, `:132`. | [Assumption] Enviar pedido pode ser interpretado como vaga já transferida; acordo humano precisa virar atualização verificável. | P1: apresentar estados pedido/enviado/aceito/escala atualizada e manter responsável final claro. Não afirmar troca automática. |
| J13 | Convite a servir usa todos os times dos quais pessoa não participa e diz “times procuram pessoas”, sem checar um indicador explícito de recrutamento nesse seletor. `app/service/membro/Inicio.tsx:196`, `:240`, `:333`. | [Assumption] Mensagem pode prometer abertura que a liderança não publicou intencionalmente. | P1: convite depende de recrutamento ativo e requisito atingível. |
| J14 | Financeiro exibe quatro ações no cabeçalho de Movimento, quatro abas e filtros; fluxo inicial também tem orientação para primeira conta. `app/service/modules/financeiro/Financeiro.tsx:108`, `:117`, `:157`, `:180`. | [Assumption] Novato enfrenta decisões de operação e estrutura juntas; tesoureiro experiente pode precisar de atalhos. | P2: exposição por maturidade e papel; manter ação frequente e menu secundário com nomes explícitos. Confirmar quantidade e hierarquia visual em runtime. |
| J15 | O menu já separa secundários em “Mais”, removendo-os dos grupos originais. `app/service/ServiceExactApp.tsx:878`, `:895`. | [Assumption] Reduz opções simultâneas, mas pode perder relação semântica: batismos deixa de estar visível junto a formação, secretaria junto a gestão. | P2: testar agrupamentos recolhíveis por área ou busca contextual; quantidade menor não basta se a localização surpreende. |
| J16 | Adiamentos de cards usam chave localStorage genérica `cex_inicio_adiados`; ids como dados/atalho não incluem igreja/pessoa. `app/service/membro/Inicio.tsx:157`, `:209`, `:234`. | [Assumption] Troca de conta ou igreja no mesmo aparelho pode herdar adiamento de outra pessoa. | P2: contexto de usuário/igreja e preferência coerente entre aparelhos. Testar antes de chamar de defeito observado. |
| J17 | Dados financeiros críticos são buscados em paralelo; estado de erro principal só considera contas, categorias, fundos e lançamentos. `app/service/modules/financeiro/dados.ts:115`, `:129`, `:137`. | [Assumption] Falha em saldo ou fechamento pode parecer zero ou ausência de dados, comprometendo a compreensão da tela. | P1: distinguir zero real, indisponível e carregando por seção; testar falha seletiva com dados de teste. |

P0 significa pré-requisito da expansão internacional; não representa incidente em produção. P1 significa ruptura de compreensão ou conclusão a validar prioritariamente. P2 significa melhoria com menor urgência relativa.

## Matriz das transições entre papéis

| Origem → destino | Entrega necessária | Como o destino recebe hoje | Ruptura a validar | Critério de pronto proposto |
|---|---|---|---|---|
| Pastor → líder | Convite aceito + liderança vinculada ao time | Convite WhatsApp e login; marcação em Times separada | Convite enviado confundido com time pronto | Líder entra e reconhece seu time e próxima tarefa. |
| Gestão → membro | Conta vinculada + conteúdo publicado | Convite individual ou código com aprovação | Igreja vazia depois de concluir cadastro | Primeiro acesso termina em encontro ou conteúdo real com orientação. |
| Gestão → pessoa aguardando | Decisão sobre entrada | PedidoEmEspera e reconsulta | Pessoa espera sem prazo/canal claro | Estado, responsável e como obter ajuda compreensíveis. |
| Líder → voluntário | Escala publicada | Card, Agenda e tentativa de push | Publicado, avisado e lido podem ser confundidos | Líder distingue os estados; membro recebe objeto certo. |
| Voluntário → líder | Confirmação ou indisponibilidade | Estado de escala e conversa para troca | Conversa não equivale a alteração da vaga | Pedido tem responsável e conclusão registrada. |
| Comunicação → membro | Publicação segmentada | Mural, destaque e fila | CTA abre lista e requer nova busca | Abre aviso exato e mantém contexto de volta. |
| Visitante → recepção | Autocadastro com dados de contato | Funil de visitantes | Pessoa real ainda depende de responsável que assuma contato | Contato assumido, prazo e próximo passo visíveis. |
| Recepção → pastoral/membro | Continuidade e vínculo | Funil, ficha e mecanismos de entrada distintos | Duplicação e abandono entre pessoa/visitante/conta | Uma ficha acompanha transição e mostra acesso separadamente. |
| Família → Kids | Criança e responsáveis aptos | Minha família + check-in | Dados incompletos descobertos na porta | Pendências antecipadas; retorno do estado em ambos os lados. |
| Kids → família | Entrega segura | Pedido de retirada e conferência humana | Status digital tomado como autorização suficiente | Equipe mantém verificação presencial e confirmação inequívoca. |
| Formação → membro | Curso, turma e aula publicadas | Caminhada, curso, Agenda, QR | Inscrição sem próxima aula; retorno após QR | Próximo passo e instrução de conclusão sempre explícitos. |
| Presença → líder de cuidado | Base válida e pessoa sob cuidado | Lista depende de presenca | Sem check-in pode parecer ausência real | Informar cobertura e fonte antes de inferir necessidade de contato. |
| Gestão → tesouraria | Grant de leitura/lançamento | Financeiro restrito no registro | Papel amplo confundido com liberação específica | Quem delega entende alcance e pessoa recebe apenas seu trabalho. |
| Gestão → secretaria | Grant secretaria | Registro atual reconhece liberação | Documentação anterior ainda diz bloqueado | Caminho de delegação e primeira operação testados com conta restrita. |
| Secretaria → novo membro | Ficha importada | ImportarMembros | Importar cadastro confundido com criar conta e enviar convite | Resumo diferencia fichas criadas, pessoas convidadas e acessos ativos. |

## Antes e depois proposto

### Pastor: primeira igreja e primeiro encontro

Atual: cria conta → escolhe liderança → cadastro BR → painel/assistente → identidade → série de cultos e times → convida líderes → sai para Times → sai para Escalas → publica → precisa conferir app do membro. A opção de concluir assistente não garante o fechamento dessas dependências.

[Assumption] Proposto: país/fuso e nome → “qual primeiro resultado?” (publicar encontro, organizar equipe, migrar cadastro) → dados mínimos do resultado → prévia do que membro verá → convidar responsável, se necessário → publicar resultado → checklist restante e retomada. Personalização, série anual e configurações avançadas podem ser feitas depois. A decisão de oferecer rotas por objetivo precisa validação com igrejas, sem criar três assistentes desconectados.

### Membro: primeiro acesso e semana sem tarefas

Atual: convite pode pedir CEP → nome/telefone → tamanho do texto → fila por demandas → “Tudo em dia” → seção de igreja depende de publicações e eventos → procurar funções em Agenda/Mensagens/Caminhada/Perfil.

[Assumption] Proposto: vínculo identificado → contato mínimo já preenchido → preferências com opção de continuar → boas-vindas da igreja com encontro real e uma orientação adequada ao vínculo → tarefas só quando necessárias → contexto semanal. Sem publicação da igreja, mostrar contato válido e explicação honesta; gestão vê lacuna de preparação. Evitar obrigar servir, contribuir ou preencher cadastro como substituto de conteúdo relevante.

### Líder e voluntário: escala

Atual: pessoas/time/funções → evento → escala → publicar → membro confirma → se precisa trocar, conversa → liderança atualiza escala em outro contexto.

[Assumption] Proposto: evento com cobertura do meu time → vagas → sugestões explicadas → revisão de quem será avisado → publicar → respostas por estado → pedido de troca ligado à vaga → selecionar substituto → confirmação e retorno para ambos. Preservar boa lógica atual de Desfazer e retomada de publicação parcial.

### Tesouraria e secretaria

Atual: papel + liberação específica → módulo com operação e estrutura → dados e livros de várias origens.

[Assumption] Proposto: delegação explicada → tela inicial da função → tarefa principal guiada se ainda não há dados → cadastros estruturais no contexto da necessidade → comprovante/resumo com origem e próximo passo. A pessoa que usa diariamente pode fixar atalhos sem tornar o primeiro uso um painel com todas as escolhas.

## Relevância e exposição dos 34 módulos

`inventario-funcoes.csv` cobre todos os 34 módulos atuais, incluindo público, frequência proposta, resultado, superfície, dependências e fonte. Frequência e exposição são hipóteses de serviço, não métricas medidas. Módulo essencial significa casca técnica; não significa destaque constante para o usuário.

| Momento de exposição proposto | Módulos e justificativa |
|---|---|
| Sempre, com contexto e estado adequado | inicio, perfil, igreja, acesso, entrada, configuracao: sustentam orientação e vínculo. Não precisam todos de entradas permanentes de menu. |
| Rotina operacional conforme responsabilidade | pessoas, visitantes, times, escalas, cultos, conversas, mural: trabalho e participação frequentes, segmentados por papel. |
| Quando há vínculo, publicação ou ocorrência | kids, grupos, ensaios, reunioes, quadros, cursos, batismos, decisoes, cuidado, aniversarios, pesquisas, oracao: presença depende do contexto, não só do módulo ligado. |
| Consulta voluntária e conteúdo disponível | biblia, contribuir, identidade, historia, pagina: valor sem obrigação; não competir automaticamente com urgências. Pix é opção brasileira, não definição universal de generosidade. |
| Gestão especializada ou manutenção ocasional | financeiro, secretaria, relatorios, espacos: acesso e frequência variam; preparar dados e primeiro uso sem despejar configuração. |

A lista acima tem todos os 34 módulos uma vez. Publicar conteúdo, convidar e configurar devem ser julgados pelo que habilitam para a próxima pessoa. Apenas esconder itens em Mais não resolve a ausência dessa conexão.

## Achados antigos que não devem reaparecer como atuais

- Secretaria delegada: manifesto atual contém `acessos: ["secretaria"]`; registry testa concessões e negativa explícita da matriz. As duas divergências do featmap anterior foram atendidas no código. Fontes: `app/service/modules/secretaria/manifest.ts:17`; `app/service/modules/registry.ts:147` (ramo de rota restrita da função podeVerRota).
- Carteirinha: contrato atual usa `/service/carteirinha/[codigo]`, compatível com página concreta. `app/service/modules/secretaria/manifest.ts:21`.
- Financeiro: não há limite total de 2000 no mês; usa paginação keyset de 1000 em laço. Já existem consultas a contas fixas, campanhas e fechamentos. Não chamar de apenas fase 1 sem qualificar o código atual. `app/service/modules/financeiro/dados.ts:77`, `:123`.
- Publicação parcial: a janela já acompanha ids publicados, explica quantos saíram e permite tentar novamente. Não repetir “não tem retomada”. `app/service/modules/escalas/PublicarEscala.tsx:31`, `:63`, `:107`.
- Início do membro já possui duas zonas e limite de três cartões. Não propor isso como novidade. `app/service/membro/Inicio.tsx:242`, `:363`, `:384`.
- Cursos já explicam aula não publicada e presença por QR; não declarar Continuar inerte com base no manifesto antigo. `app/service/membro/Cursos.tsx:20`.
- Troca já resolve destinatário em cadeia e oração tem mural e escolha de público. Oportunidade é clareza e fechamento do serviço, não recriar funcionalidades já existentes.
- Visitante por QR, importação, entrada por código, contribuição Pix, oração, aniversários, financeiro e secretaria estão presentes. Tabelas antigas de JORNADAS_PONTE não são inventário confiável do estado atual.

## Limites e validação necessária

1. O mapa não prova primeira igreja criada em banco, conta de líder restrita nem aprovação real. Executar com igreja de teste nova e pelo menos duas contas, verificando tenant e vínculos.
2. Demo aberta por pastor em modo membro não prova visibilidade de membro comum. Seeds com eventos passados não demonstram ausência de conteúdo em produção.
3. Zero, vazio e erro precisam ser testados separadamente, incluindo falha de saldo, aula sem publicação, igreja sem turma Kids, destinatário sem login e conta já existente.
4. Zoom ao digitar, campos abaixo de 16px, teclado e viewport exigem inspeção visual e aparelho Safari real. Esta análise estática não confirma a causa do relato.
5. País/fuso precisam de teste fora de São Paulo, com meia-noite, horário de verão, telefone internacional, postal code alfanumérico e traduções longas. Não há prova de infraestrutura completa de internacionalização.
6. Relevância deve ser validada com pastor novo, gestor recorrente, líder, membro que não serve e pessoa idosa. Recomenda-se roteiro curto por resultado, sem explicar a interface durante a execução.
7. Medir sucesso por conclusão e entendimento: publicar primeiro evento corretamente, membro encontrar esse evento, responder e gestão reconhecer resposta. Contagem de telas, cliques ou recursos por si só não mede qualidade.
8. Verificar o que foi mostrado, compreendido e salvo; ação otimista, push solicitado, WhatsApp aberto e convite gerado não são prova de conclusão pelo próximo ator.
9. Assinatura comercial e cobrança do Service não foram reconstruídas como jornada de venda: não inferir disponibilidade a partir de tabelas de billing. Precisam investigação própria para comercialização.

## Mudanças de lei que merecem avaliação

[Assumption] A regra de quatro abas pode continuar como base, mas não deve impedir testar se Caminhada comporta bem trajetória, biblioteca e contribuição. A regra “fila vazia mostra Tudo em dia” pode manter confirmação de ausência de pendências sem obrigar o conteúdo principal a comunicar espera pela liderança. “Nenhum beco sem saída” deve ser refinado: esconder entrada impossível evita frustração, porém ausência silenciosa também impede descobrir como habilitar uma função; ao responsável, deve existir motivo e próximo passo. A escala tipográfica não pode reduzir campos de toque abaixo de 16px; tokens de corpo e campos devem ter contratos separados. São propostas para aprovação, não alterações realizadas.
