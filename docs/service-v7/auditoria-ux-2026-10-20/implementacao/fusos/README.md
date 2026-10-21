# Fuso por igreja

A gestão escolhe o fuso na preparação da primeira igreja ou em Configurações, Dados da igreja. O membro não precisa configurar região. Os encontros mantêm data e hora civis; mensagens, publicações e envios continuam armazenados como instantes UTC.

A entrega conecta o relógio da igreja à agenda, à saudação, à semana de escalas, às telas financeiras, ao Mural, ao histórico e ao check-in infantil. O calendário exportado converte o horário do evento para UTC. A publicação agendada e os lembretes respeitam o fuso; o silêncio das 22h às 7h é calculado por destinatário. A fila verifica novamente o fuso e as preferências antes de enviar. Falha de fila não libera envio no silêncio. Horários inexistentes ou repetidos na mudança de verão são recusados na exportação e no agendamento do Mural, com orientação para revisar o horário.

A migração 0086 acrescenta time_zone com Brasília como padrão de compatibilidade. Valida o identificador no banco, mantém as políticas de acesso e atualiza as rotinas de check-in, história, visitante, métricas, carteirinha e fechamento financeiro. Relatórios agregados por organização usam o fuso da matriz. Nenhuma data civil de encontro é reescrita.

## Verificação

- TypeScript e build de produção aprovados.
- ESLint sem erros nos arquivos alterados; avisos existentes de imagens e desativações não utilizadas registrados.
- Doze contratos de jornadas aprovados, incluindo fuso e fila de avisos.
- Testes de fuso executados com o processo em Brasília, Tóquio e Nova York: virada do dia, limites 7h/22h, verão, inverno e horas inexistentes/repetidas.
- Banco local: gestão grava; membro e outra igreja não alteram; fuso inválido recusado; encontros preservados; métricas executam. O teste restaura o fuso original.
- Todas as 85 migrações aplicadas em banco novo isolado até 0086.
- Contraste e parte estática da Lei 12 aprovados.
- Três capturas visuais: configuração em desktop/celular e app de igreja em Lisboa com aparelho em Tóquio. Sem erros de página.

## Limites

Fuso não equivale a tradução ou suporte contábil internacional. Idioma, moeda e exigências por país continuam pendentes. A conferência física do teclado/zoom no Safari continua pendente. Não houve envio de notificações reais nos testes.

A entrega foi isolada em um worktree porque um trabalho de mapas surgiu em paralelo na pasta principal. Migrações 0087 a 0092 de mapas não pertencem a esta publicação.
