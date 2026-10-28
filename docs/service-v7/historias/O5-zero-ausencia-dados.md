---
id: O5
titulo: Verificar zero e ausência de dados em outras áreas
tipo: verificacao
status: feita
quem: codex
desde: 2026-10-25
branch: historia/O5-zero-ausencia
depende: []
tamanho: M
---

## Por quê
Os estados de zero e de ausência de dados ainda não foram revisados nas outras áreas do Service. O STATUS diz que essas áreas exigem revisão contínua.
Fonte: STATUS F23 ("outras áreas exigem revisão contínua").

## Arquivos (trilho)
- `docs/service-v7/historias/O5-zero-ausencia-dados.md`

- `scripts/check-local-zero-ui.ts`
- `docs/service-v7/PENDENTES.md`

- `next.config.ts`

- `app/service/painel/telas/Agenda.tsx`

- `docs/service-v7/historias/I3-revisao-ui-telas-parciais.md`

## Pronto quando
- Áreas fora das já revisadas testadas com zero e com dados ausentes.
- Problemas encontrados corrigidos.

## Notas
ABERTO. Trilho a definir na reserva.

25/10: O4 publicada pelo PR25 (593d33e), banco e Vercel concluídos. Próxima da fila livre: O5. Prova Chromium autenticada em banco descartável: estados vazios e registros com campos opcionais ausentes em áreas operacionais do painel. Somente script/evidências nesta reserva inicial; telas E/I/M/G e caminhos da I10 continuam com Claude.

Retomada após interrupção: a prova não chegou aos casos. O Next/Webpack inferiu a raiz do checkout principal e o watcher alcançou um volume OrbStack fora do projeto. Reservado next.config.ts para fixar a raiz ao worktree/projeto, sem editar telas. Banco descartável e servidor órfão são removidos antes da repetição.

Reservas conferidas antes de ampliar: Agenda.tsx do painel não está na I10. Correção pontual de O5 a verificar: capacity NULL não deve ser apresentado como zero lugares; zero explícito continua zero. Sem redesenhar tela nem assumir I3. Caso a correção não seja autorizada na revisão, registrar o achado e a evidência para Claude conforme pedido do usuário.

Reservado somente o registro de evidência na história I3, sem mudar sua atribuição, estado ou implementar a revisão de tela. A primeira captura O5 em Espaços já mede 60 ações/101 palavras com zero salas e 61/105 com uma sala sem capacidade, antes da correção. Limites não aprovados; passagem ao Claude solicitada pelo usuário.


Prova de 25/10: primeira execução interrompida antes dos casos; servidor e projeto cex-rls-e21c6b8fedf0 removidos na retomada. Com raiz explícita, 14 cenários em sete áreas do painel passaram quanto a carregamento, valores válidos, erros de console e rolagem lateral, mas identificaram um erro de apresentação: NULL em capacidade aparecia como 0 lugares. A correção distingue ausência de zero, sem alterar o valor salvo, o comportamento, a estrutura ou a ordem da tela.

Após a correção, os 14 cenários passaram no projeto cex-rls-ae8f6df1f368 (descartado). A redação final, Capacidade desconhecida, foi verificada em mais dois cenários focados no projeto cex-rls-c63f7313699b (descartado): ausência, zero explícito e medição com a mesma fixture original. Relatórios locais em prints/o5-zero-ui/resultado-antes.json, resultado-completo.json e resultado.json; o último declara escopo apenas Espaços. Logs /tmp/cex-O5-zero-raiz.log, /tmp/cex-O5-zero-final.log e /tmp/cex-O5-espacos-final.log.

Densidade de Espaços idêntica antes/depois na mesma fixture: sem salas, 60 ações/101 palavras; com uma sala, 61/105. Um botão cheio, duas molduras, nenhum alvo abaixo de 24px, sobreposição ou rolagem lateral. Esses números já excediam a lei 13 e NÃO foram aprovados: achado registrado na I3 para o Claude, a pedido do usuário. Nenhum redesenho ou caminho da I10 foi assumido. Captura final revisada visualmente: rótulo completo cabe no cartão. Prova só do painel 1366×860, sem aparelho real ou leitor de tela. Lint passou; tipos/build e CI finais serão registrados antes da publicação.

Fechamento local: typecheck, lint, leis 12/17, contraste e contrato de navegação do painel passaram. Build completo Webpack aprovado com variáveis fictícias em loopback 59999, sem produção (/tmp/cex-O5-build.log). Captura final e contagens iguais à referência confirmadas. Sem aprovar a densidade preexistente delegada à I3. CI/preview e produção serão acompanhados pelo PR antes de declarar deploy concluído.
