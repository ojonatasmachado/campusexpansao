# Acessos e módulos · 21/10/2026

Evidência: menu e busca usam podeVerItem; atalhos do Painel chamam setRoute diretamente. A proteção de rota em ServiceExactApp só contempla membros, deixando liderança abrir por atalhos áreas ausentes do menu ou de módulos desligados. Isso é inconsistência da interface; não comprova acesso indevido no banco, que mantém RLS.

Decisão: manter registro e contratos. Usar o mesmo predicado nos atalhos do Início e na montagem da tela para todos os papéis. Área que perdeu acesso mostra orientação com saída válida. Início usa a linha painel da matriz também para liderança, como já faz com voluntários. Pessoa sem qualquer tela de gestão fica no próprio app. Não adicionar rota ou módulo. AGENTS §13.1, 3 e 6. Arquivos: registry.ts, ServiceExactApp.tsx e painel/telas/Inicio.tsx.

Alternativas: só esconder menu mantém o problema; só interceptar cliques deixa entradas impossíveis expostas. Risco: uma permissão negada passa a valer também nos atalhos. Validar líder, pastor, membro com acesso extra, módulo desligado e dependência desligada, com retorno e sem tela vazia.

Inspeção local inicial: o script legado check-local-rls passou nas leituras básicas de master/líder/membros e isolamento de visitantes, mas falhou no fluxo Quero servir, cujo contrato mudou. Ele modifica fixtures, apaga requisitos/pedidos da organização de teste e abortou antes da limpeza. Os dois cursos e três requisitos criados nesta execução foram identificados pelo horário e removidos por ID; não há snapshot dos requisitos anteriores. Não usar esse script como comprovação da matriz atual ou executá-lo de novo no banco compartilhado. A validação seguinte usa contas locais existentes e cenários de interface isolados, sem repetir esse reset.

## Validação desta entrega

Contrato novo check-service-panel-access.ts incluído no CI: líder/pastor com Início negado, master, voluntário, membro com acesso extra, financeiro restrito e módulos/dependências desligados. Typecheck e lint sem erros (dois avisos preexistentes de eslint-disable em ServiceExactApp), Lei 12, contraste, os 13 contratos e build aprovados.

Autenticação real local com lider@teste.local: entrou com a conta existente, alterou só a preferência de visualização no cookie e percorreu o Início. Menu sem Financeiro e operação normal de liderança preservados. Nenhum convite, mensagem ou ação de operação foi enviado nesta inspeção. Evidência JSON autenticada separada.

Cenários adicionais são fixtures da demo: líder com escala negada fica sem Montar escala/Escalar; master com escalas desligado ou times desligado também não recebe entrada/atalho de escala; membro com personGrant de visitantes recebe apenas Visitantes; pastor com Início negado recebe explicação e saída válida. Rota indisponível não monta o componente e retorno reabre uma área liberada. Capturas do estado em 320/390/1280, claro/escuro, sem overflow.

Para exercitar o estado de rota antiga houve um botão temporário de auditoria chamando a rota explicitamente. O botão e as alterações da demo foram removidos antes do commit. As fixtures não comprovam políticas do banco ou atualização em tempo real de permissões. O script legado falho não foi repetido nem contado como aprovação. Safari/PWA físico e leitor de tela continuam pendentes.
