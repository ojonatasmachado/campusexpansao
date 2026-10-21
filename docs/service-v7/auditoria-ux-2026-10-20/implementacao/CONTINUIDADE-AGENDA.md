# Continuidade da Agenda

21/10/2026. Etapa iniciada após o envio da entrega principal para publicação.

A alternância entre Minha agenda e Igreja agora atualiza o endereço e o histórico. O identificador de tarefa é preservado no destino real, que é uma seção dentro de Minha agenda. Recarregar o link reabre a tarefa expandida e direciona para a seção correta. O caminho antigo com `mtela=tarefas` é convertido para a Agenda, evitando uma subtela sem conteúdo.

Testes de domínio cobrem tarefa embutida, link anterior, contexto sem permissão para o módulo, prioridade da tarefa sobre segmento incompatível e preservação de parâmetros independentes. TypeScript e lint passaram. No Chromium em 390 px, a troca de segmento gerou `msegmento=igreja`, o botão Ver a tarefa gerou `mtarefa=cd-1` e uma nova abertura desse destino exibiu a tarefa expandida em Minha agenda. Não foram enviados comentários nem alteradas tarefas reais.

As capturas desta etapa são cenários controlados com dados sintéticos. As permissões de leitura e gravação do banco não foram alteradas.

O build de produção passou após esta correção. Os dez testes puros das jornadas também passaram e foram incluídos no CI: ativação, datas civis, CNPJ, calendário do demo, endereço, geolocalização/CPF, navegação, semana, telefone e recebimento de pedidos por times. Assim, mudanças futuras passam a verificar esses contratos junto dos controles já existentes.

Galeria e identificação dos arquivos testados: `continuidade-agenda/index.html` e `continuidade-agenda/fontes.json`.
