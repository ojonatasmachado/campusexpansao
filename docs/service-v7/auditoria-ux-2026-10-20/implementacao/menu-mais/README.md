# J15 · Menu Mais · decisão de 21/10/2026

## Evidência e pessoas afetadas

Confirmado no código: ServiceExactApp reúne por flatMap todos os itens secundários em uma lista. Os manifestos preservam grupo e ordem no registry. Pastor, administração e líderes com acesso parcial precisam procurar operações de áreas diferentes no mesmo bloco. Perfil e Configurações já têm lugares próprios e permanecem ali.

| Grupo de origem | Operações secundárias | Pergunta |
| --- | --- | --- |
| Pessoas | Decisões, Aniversariantes | Quem precisa de acompanhamento? |
| Ministério | Ensaios, Reuniões | Como organizar o time? |
| Agenda | Espaços e salas | Quando e onde? |
| Comunicação | Pesquisas, Oração, Página da igreja | O que comunicar ou receber? |
| Formação | Batismos | Qual próximo passo de formação? |
| Gestão | Quadros, Identidade e propósito, Nossa história, Secretaria | O que administrar ou registrar? |

Itens efetivamente visíveis dependem dos módulos ligados e das permissões. A tabela descreve os manifestos, não acesso universal.

## Alternativas e decisão

Manter a lista plana preserva poucos cliques, mas perde a origem. Devolver tudo aos grupos principais aumenta novamente as opções iniciais. Recomendação: manter Mais e revelar seus grupos originais como seções expansíveis, uma por vez, com a seção da rota atual aberta. Cada destino continua vindo de NAV_GROUPS, filtrado por podeVerItem. Sem novo módulo, rota, permissão ou configuração.

Leis relacionadas: AGENTS §13.1 casca estável, §13.2 uma pergunta por lugar, §13.3 registro único, §13.6 dependências, §13.8 tipografia e toque. Arquivos: ServiceExactApp.tsx e estilos na base própria do Service, evolucoes/service_app/service-app.css. Brand Book consultado; regras do Service prevalecem.

Risco: um clique adicional para tarefas ocasionais. Mitigação: rótulos dos grupos já conhecidos, seção ativa aberta e busca global preservada. Não reorganiza conteúdo entre módulos nem muda a casca do membro.

## Como validar

Abrir Mais, expandir grupos, alternar grupos, abrir uma rota, reabrir menu no celular, conferir seção ativa, voltar a rota principal. Conferir filtragem por módulo/papel no registry. Inspeção em 320/390 e notebook/tela larga, claro/escuro, teclado e conteúdo longo. Typecheck, lint, Lei 12, contraste, contratos e build. CI e deploy antes de marcar publicado.

A inspeção do layout atual confirmou que loja.css é exclusivo de app/(site)/layout.tsx e não é carregado no Service. Estilos ficam na base do Service conforme modules/README.md, sem importar o CSS do catálogo para o app.

## Resultado verificado

Inspeção Chromium/CDP: 320/390/1280/1600 px, claro e escuro. Sem overflow horizontal. Grupos do Mais têm 44px no celular e 39px no desktop. Uma seção aberta por vez, quatro destinos de Gestão expostos em lugar dos 13 itens juntos. Enter abre Pessoas com foco no summary; abrir Secretaria mantém Gestão aberta e rota ativa. Capturas e JSON neste diretório. Não foram simulados novos papéis na UI: o filtro existente podeVerItem continua aplicado antes de montar os grupos.

Typecheck, lint (zero erros, dois avisos preexistentes), Lei 12, contraste, 12 contratos e build passaram. Não há campo ou teclado virtual nesta mudança. Leitor de tela e aparelhos reais continuam sem inspeção.
