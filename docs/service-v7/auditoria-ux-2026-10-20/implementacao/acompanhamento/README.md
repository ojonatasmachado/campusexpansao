# Acompanhamento, demonstração e continuidade da Caminhada

21/10/2026. Continuação da implementação autorizada. Esta etapa não encerra todos os achados da auditoria.

## O que mudou

- O painel calcula confirmações na semana civil e no escopo dos times do líder. Histórico inteiro não aparece como confirmação semanal. Contagem de vagas respeita funções que precisam de mais de uma pessoa e desconsidera recusas como preenchimento.
- Saíram ranking de pessoas, percentual individual de engajamento e séries decorativas sem origem nos dados. A verificação estática agora impede reintroduzir esse ranking na interface.
- Acompanhamento pastoral informa ausência de registro, origem dos registros e intervalo. Não conclui ausência física, saúde ou afastamento espiritual a partir de check-ins. A ação de justificar explicita os 30 dias existentes no contrato.
- Relatórios mostram fatos de escala: pausa informada, recusas e quantidade de escalas. Sem pendência registrada não significa avaliação da pessoa. O funil usa largura zero para quantidade zero.
- Indicadores e CSV usam o mesmo período. Conversão de visitantes usa os cadastros do recorte selecionado; confirmação usa as vagas escaladas do recorte; média de check-ins não se apresenta como contagem comprovada de frequentadores. Sem denominador, a interface diz Sem dados. O funil e as distribuições continuam sendo fotografias do cadastro atual.
- A demonstração mantém encontros futuros, tarefas e comunicados atuais, com histórico separado para os relatórios. O local do encontro noturno corresponde ao aviso de mudança. Endereço sintético coerente evita um lembrete artificial de cadastro incompleto. Controles de desenvolvimento aparecem apenas com `?ferramentas=sim`; deixaram de interceptar o fechamento do menu em 320 px.
- Cursos em andamento na Caminhada ganharam a ação Abrir meu curso. O caminho existente abre as aulas e preserva o botão de retorno. Etapas não configuradas deixam de produzir o resumo 0 de 0.

## CNPJ alfanumérico

O formulário, a consulta e o bootstrap preservam letras e validam os dígitos verificadores. A migração 0085 mantém assinatura, papéis e demais regras da função anterior. O identificador continua opcional no cadastro inicial.

Referências: [primeiro CNPJ alfanumérico, Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-gera-o-primeiro-cnpj-em-formato-alfanumerico) e [manual de dígitos verificadores](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf). Testes incluem `12.ABC.345/01DE-35`, `00.000.000/E08G-12`, CNPJ numérico e DVs inválidos. O bootstrap foi exercitado em transação local com rollback. Consulta real do provedor retornou indisponibilidade; não foi apresentada como consulta bem-sucedida.

## Verificação e limites

Passaram TypeScript, build de produção com banco exclusivamente local, lint dos componentes da etapa, testes de semana civil, datas da demonstração e CNPJ, verificação estática da Lei 12 e diff. A consolidação final também passou após os ajustes de relatórios, navegação, escala, acolhimento e estados financeiros. Os 358 arquivos TS, TSX e CSS do app foram comparados com a cópia compilada, sem divergências. A galeria contém 21 capturas selecionadas; tentativas incompletas permanecem no manifesto.

Capturas controladas em Chromium: painel em 1440 px, relatórios claros em 320 px, app em 390 px, Caminhada e acesso à aula em 320 px. Os cenários com falha de seletor, sobreposição do seletor de desenvolvimento ou erro transitório de recompilação permanecem registrados como tais em `capturas/manifesto.json`; não são evidência de aprovação. A captura final do acesso ao curso terminou sem erro de página.

A demonstração usa dados sintéticos e não comprova gravações reais dos módulos. Testes anteriores de gravação, recuperação, convite e permissões estão documentados nas etapas próprias. Migrações 0081 a 0085 foram aplicadas somente no Supabase local. Não houve push, deploy nem escrita no banco remoto. O teclado e o zoom do Safari/PWA em aparelho real continuam pendentes.

## Próximas verificações

Fusos da igreja, demais jornadas de operação e matriz visual ampliada continuam abertos. Uma causa concreta do ponto branco foi localizada na Caminhada: etapas a fazer renderizavam um círculo sem conteúdo. O estado agora mostra o número da etapa, preserva o rótulo textual e deixa de depender só de cor ou forma. Outros pontos brancos, se aparecerem em jornadas diferentes, ainda precisam ser tratados no contexto em que forem observados.

## Continuidade de navegação

O app do membro registra aba, subtela, segmento da agenda e identificador de aviso/tarefa na URL. Recarregar ou abrir o endereço restaura o destino permitido pelo registro de módulos, papel e dependências atuais. Uma subtela de outra aba, módulo desligado ou destino sem dependência disponível cai na aba correspondente, sem apresentar uma tela vazia. Pré-visualização de outras pessoas não altera a URL do painel.

Voltar de uma subtela que veio da aba principal usa o histórico do navegador; abrir diretamente uma subtela mantém a saída pela própria aba. Trocar para a gestão limpa os parâmetros do membro para que uma recarga não force o retorno ao app. O servidor reconhece destinos do membro antes de aplicar a preferência de superfície.

Avisos antigos por categoria têm destino compatível. Novos lembretes do Mural incluem a publicação; resumos com várias publicações levam à lista, sem escolher arbitrariamente uma delas. A medição de abertura permanece separada da navegação. Não foram enviadas notificações externas nesta validação.

Testes puros cobrem destinos adulterados, módulo não permitido, aba incompatível, identificadores inválidos, preservação de parâmetros independentes e limpeza ao voltar à gestão. No Chromium, abrir a URL de cursos restaurou a tela de aulas, retornar pelo histórico abriu a Caminhada e o endereço de uma publicação abriu somente o artigo indicado. A combinação de nome longo, texto máximo e 320 px também foi inspecionada.

Com conta autenticada de gestão no Supabase local, a URL direta abriu Cursos no app. O caminho Perfil, Abrir o painel da igreja e recarregar manteve a gestão. Para passar pelo primeiro acesso da fixture, seu telefone foi preenchido temporariamente e depois restaurado a nulo, com conferência por consulta. Nenhum documento ou endereço foi alterado nesse teste.

Limites: este estado não guarda formulário em andamento, posição de leitura, folha de evento aberta ou conversa específica. A troca entre contas não concede novos acessos, pois as subtelas são revalidadas e os dados continuam sujeitos às permissões existentes. A pré-visualização usa fixtures e não comprova gravação nem entrega de push.

## Resposta de escala e confiança

A confirmação e a recusa agora aguardam o resultado do banco. Falha mantém o estado anterior, libera nova tentativa e informa que não salvou. Desfazer também grava o estado anterior no banco, inclusive a volta para pendente; não é apenas uma mudança de aparência. Botões ficam indisponíveis durante a gravação. A sugestão de ativar notificações espera a janela de Desfazer, para não cobrir a ação nem aparecer para uma confirmação cancelada.

O texto da recusa informa que ela foi registrada. Não promete que um líder recebeu uma mensagem. A resposta continua sendo feita pela RPC de acesso próprio; o fallback legado só considera sucesso quando o update retorna uma linha realmente alterada. Falha ou ausência de acesso não solicita permissão de push.

Uma fixture temporária, com evento e escala exclusivos no Supabase local, foi confirmada pela interface. O banco e a conta do líder viram `ok`. Desfazer pela interface restaurou `wait` no banco e na leitura da liderança. Recusar gravou `no`. Outra pessoa e uma conta de outra igreja receberam `nao_encontrada` e não alteraram a escala. A consulta do destinatário de troca retornou uma ficha da mesma igreja.

O evento e a escala temporários foram removidos. O telefone da fixture foi restaurado e conferido. Não houve envio de mensagem ou notificação externa. O teste de falha usou somente a cópia temporária do demo, com uma escala sintética pendente e ID inexistente no banco: após tentar confirmar, a interface manteve a pendência e mostrou a falha. Essa alteração de dados sintéticos foi revertida na cópia de teste; não entrou no código do demo entregue.

A resolução de destinatário deixou de usar um cache global compartilhado entre sessões, que podia reaproveitar o resultado de uma conta para outra quando o time não era informado. A consulta passa a usar a sessão atual. A semana usada no resumo factual de escalas também foi unificada com o cálculo civil do painel.

## Rotina e configuração

Visitantes mantém Registrar visitante como ação principal. Funil e Lista ficam na área de acompanhamento. Indicadores, regras de acolhimento e QR/link continuam disponíveis em Mais opções. A volta ao acompanhamento é visível mesmo ao consultar as regras. Estados sem cadastro explicam como começar, em vez de mostrar quatro colunas vazias. Sem pessoas contatadas ou visitantes, taxas não dizem 0%; mostram Sem dados. Os segmentos de resposta sem registros não ganham largura artificial.

O menu foi inspecionado em 320 px, o acompanhamento claro em 390 px e a ida às regras com retorno ao funil em 1440 px. Crianças mantém uma única ação Criar evento no bloco de eventos Kids, sem repetir o mesmo botão dentro do vazio. Fluxos de cadastro, regras de acesso e contrato de gravação dessas telas foram preservados.

## Indisponibilidade do Financeiro

A inspeção encontrou uma falha de carregamento acompanhada de saldo R$ 0,00, três indicadores zerados e a afirmação de que nada foi lançado. A tela agora distingue carregamento, falha e leitura concluída. Falha mostra mensagem e Tentar novamente, sem saldo, indicadores, exportação ou ações de lançamento. Uma exceção de rede também encerra o carregamento com erro. Respostas de erro das consultas de saldos, fundos, pessoas e da fase 2 deixam de ser convertidas silenciosamente em arrays vazios.

O erro foi observado no demo com organização sintética, não apresentado como incidente no financeiro de uma igreja real. Após a correção, a captura não exibe valores ou vazio contábil. Para verificar a leitura válida, uma conta local recebeu temporariamente apenas `financeiro.ver`. A interface abriu o financeiro com zero legítimo e sem ações de lançamento. A comparação por hash das sete tabelas financeiras antes e depois confirmou que nenhum registro financeiro foi alterado. A liberação temporária foi removida e o telefone da fixture restaurado, com conferência.

As quatro operações e as seções atuais da tesouraria foram preservadas, assim como cálculos, permissões, RPCs e migrações financeiras existentes. Não foi refeita a implementação financeira em andamento. O teste de leitura não certifica todas as operações de escrita, fechamento, campanhas ou contagem de ofertas.

## Gravação das regras de acolhimento

O formulário agora verifica se uma linha foi realmente alterada antes de fechar. Falha mantém o formulário, os valores e a possibilidade de nova tentativa; durante a gravação, o fechamento acidental fica bloqueado. Horas e dias devem ser inteiros positivos. Os campos receberam identificadores e rótulos associados; o modal recebeu nome acessível e estado ocupado.

No demo de teste, a tentativa de salvar com identificador sintético retornou falha. A captura em 390 px mostrou o formulário aberto, prazo de 24 horas preservado, mensagem de erro e botão Salvar novamente disponível. Esse teste não é apresentado como gravação bem-sucedida em igreja real. Nos relatórios, os intervalos de comparação foram alinhados nos limites e encontros que ainda vão começar não entram na média de check-ins.

## Etapas pendentes da Caminhada · 21/10/2026

Número da posição no lugar do círculo vazio, com estado textual preservado e marcador decorativo oculto ao leitor de tela. Typecheck, lint do componente, Lei 12, contraste, os 12 contratos do CI e build passaram. O build usa as variáveis fictícias do CI. Dependências foram instaladas no próprio worktree porque o Turbopack rejeitou o symlink anterior.

Capturas `caminhada-etapas-*`: Chromium local, 320/390 px, claro/escuro, escala padrão e 23/17. Sem rolagem horizontal e sem marcador pendente vazio. Fixture temporária com etapa pendente e consentimento do mapa já decidido; o arquivo demo foi restaurado e não faz parte da entrega. Captura por CDP após falha do navegador integrado (`missing field sandboxPolicy`). Não valida Safari/PWA, teclado físico ou persistência de consentimento no banco. Logs de rede da demo com credenciais fictícias não comprovam funcionamento das APIs.
