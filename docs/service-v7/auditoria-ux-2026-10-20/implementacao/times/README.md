# Gestão e membro: pedidos para servir

20/10/2026. [Capturas](index.html). Correção da conexão entre a decisão da gestão, a oportunidade exibida ao membro e o acompanhamento do pedido.

Abertura é explícita em `profile.recebendoVoluntarios`. Criação e edição do time persistem a escolha. Time legado sem essa decisão não é anunciado como oportunidade. Ter uma vaga na escala não significa estar recrutando. O formulário de criação tem um campo de propósito, eliminando a duplicidade com descrição curta.

A oportunidade depende de um líder com ficha no app. O servidor devolve somente os IDs utilizáveis da igreja do membro, sem liberar leitura de fichas ou vínculos de outras pessoas. A RPC de pedido verifica novamente igreja, abertura, destinatário, vínculo existente e requisitos. Repetição não duplica pedido ou conversa. Pedir entrada não aprova nem inclui a pessoa automaticamente no time.

A inspeção identificou uma política antiga `FOR ALL` que impedia o membro de ler o próprio pedido, embora houvesse uma política de leitura para isso. Ela foi substituída por restrições de escrita separadas para insert, update e delete. A pessoa acompanha o próprio status, continua sem aprovar pedidos e não lê pedidos de outra igreja.

O Início diferencia oportunidade e pedido em análise. Fechar novos pedidos não apaga o acompanhamento de quem já pediu. O status deixa de oferecer novamente o botão de pedir entrada. As configurações gerais de times, papéis e requisitos ficam recolhidas por padrão, preservando pessoas e pedidos como foco da tela.

A edição preserva outras propriedades do perfil do time. O seletor de ícones não renderiza símbolos legados desconhecidos como rótulos visuais.

## Verificação

- TypeScript, teste de abertura explícita e Lei 12 estática passaram.
- Integração local: pedido recusado quando fechado ou sem destinatário; aberto gerou um pedido e uma conversa; repetir manteve um registro; nenhuma inclusão automática na equipe.
- Permissões: membro lê próprio pedido, não aprova, não lê a ficha do líder; membro de outra igreja não lê o pedido nem recebe o ID da oportunidade.
- Criação pela tela persistiu propósito e abertura. Edição pela tela fechou pedidos e preservou horário de chegada e outra chave prévia do perfil.
- Capturas: ficha e edição da gestão, oportunidade, status próprio e acompanhamento após fechamento. Tentativas com seletor incorreto ou timeout constam como automação incompleta, sem serem contadas como sucesso.

Migração `0082_service_times_recebimento.sql` aplicada apenas no ambiente local. O código e a migração precisam ser publicados juntos. Nenhum pedido ou time de produção foi alterado.

Consolidação: build de produção passou. A captura final `times-painel-foco-pessoas` mostra pessoas e pedidos no foco e configurações gerais recolhidas, com plurais corrigidos. Fixtures desta etapa foram removidas após os testes.
