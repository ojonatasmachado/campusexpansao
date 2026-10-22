# Service: trabalho ainda pendente

Atualizado em 22/10/2026. Este arquivo contém somente o trabalho restante e as instruções para executá-lo. Antes de começar, conferir o código atual e os registros da auditoria para não repetir uma tarefa concluída por outra frente.

## 1. Revisão profunda de UI

Fazer uma revisão visual sistemática do painel e do aplicativo do membro, começando pelo Início e pelas telas mais densas: Financeiro, Visitantes, Crianças e Cursos.

- Dar hierarquia clara a títulos, conteúdo, metadados e ações.
- Reduzir a sensação de cockpit: excesso de controles, botões simultâneos e informação sem prioridade.
- Rever espaçamento, alinhamento, tipografia, densidade e consistência entre telas.
- Melhorar a separação entre fundo, superfícies e conteúdo nos temas claro e escuro.
- Destacar a ação principal e revelar controles secundários conforme a necessidade.
- Rever estados vazios, carregamento, erro, confirmação e retorno.
- Validar celular pequeno, desktop, nomes longos e texto ampliado.

Trabalhar com evidência de cada tela, preservar o tema da igreja e seguir AGENTS. Não tratar esta revisão como concluída apenas porque os testes automáticos passaram.

## 2. Ações e permissões ainda não verificadas

- Revisar as ações do Início que não navegam: aprovar caminhada, registrar cuidado e responder pedidos, por papel, módulo e dependências.
- Procurar entradas internas restantes que apontem para áreas indisponíveis.
- Aplicar a decisão do usuário: **área indisponível não oferece opção, botão, atalho ou resultado de busca**. Não ampliar permissão para viabilizar um botão.
- Completar a matriz com contas autenticadas de pastor, administrador, líder, voluntário e membro, incluindo acessos extras e escopo de times.
- Verificar isolamento entre igrejas, leitura e gravação no banco, uploads e notificações. Demo não substitui validação autenticada.

## 3. Convite e primeiro acesso do membro

Percorrer a jornada completa: convite, aceite, senha, endereço, dados essenciais, entrada no aplicativo, próximo passo e retorno. Testar igreja vazia e igreja com conteúdo. Identificar passos sem orientação, repetidos ou sem saída e corrigir com evidência.

## 4. Continuidade das jornadas e densidade dos módulos

Revisar Financeiro, Visitantes, Crianças, Cursos e Formação, além das outras telas marcadas como parciais em STATUS. Verificar se uma ação de pastor/liderança chega à pessoa certa e se a resposta aparece para quem a iniciou. Priorizar ações confusas, duplicadas ou sem continuidade.

A eventual reorganização interna da Caminhada é hipótese a investigar. Não implementar novos grupos nem mudar as quatro abas sem evidência e decisão arquitetural registrada.

## 5. Acessibilidade em aparelho real

Testar Safari/PWA, teclado aberto, zoom ao preencher campos, áreas seguras, fonte do sistema ampliada, foco, leitor de tela e alvos de toque. Verificar contraste, sobreposição e rolagem lateral. Registrar o que foi testado e o que continuar sem validação.

## 6. Internacionalização

Revisar idiomas, moedas e regras locais conforme os países atendidos. Verificar textos longos e formatos locais sem assumir que todos os usuários estão no Brasil. Consultar os contratos existentes antes de alterar dados compartilhados.

## 7. Isolar e modernizar o teste de permissões

Não executar `scripts/check-local-rls.ts` no banco local compartilhado. Antes de reutilizá-lo:

- Atualizar o contrato antigo de Quero servir.
- Usar banco descartável isolado ou snapshot e restauração garantida.
- Garantir limpeza mesmo em falha, sem resetar requisitos ou pedidos de outras frentes.
- Consultar `implementacao/acessos/README.md` para os detalhes da limitação e dos dados locais afetados.

## Como executar as próximas entregas

1. Ler integralmente `AGENTS.md`; consultar `STATUS.md`, `JORNADAS-E-CONEXOES.md` e `CONTINUIDADE.md` antes de escolher a próxima tarefa. Usar `ui-ux-pro-max` e consultar Brand Book/Brand Library nas mudanças visuais.
2. Conferir `git status`, buscar origin e comparar com main. O diretório `/Users/macbook/campusexpansao` contém trabalho local de outras frentes: preservar tudo e não usar limpeza/reset nem staging geral. Preferir worktree isolado; o anterior está em `/tmp/cex-fuso-release-20261021`.
3. Resolver um problema por entrega, com inspeção visual focada em 320/390 px e desktop, claro/escuro e fonte ampliada. Não refazer verificações antigas sem motivo.
4. Rodar typecheck, lint dos arquivos alterados, Lei 12, contraste, contratos e build conforme `.github/workflows/service.yml`, além dos testes específicos necessários. Não usar credenciais de produção em testes locais.
5. Documentar evidência, limites e pendências restantes. Fazer commit apenas dos arquivos da entrega.
6. Seguir o workflow Produção: banco antes de código, depois monitorar CI e Vercel até READY. Não contornar esse fluxo com deploy manual. Atualizar CONTINUIDADE e este arquivo, retirando tarefas concluídas.

Preservar o registro único de módulos, as quatro abas do membro e as regras de tema/estrutura do AGENTS. Não declarar validação de banco, aparelho real ou leitor de tela com base apenas em captura de demo.
