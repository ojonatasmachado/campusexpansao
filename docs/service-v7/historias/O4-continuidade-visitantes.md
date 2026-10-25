---
id: O4
titulo: Verificar continuidade de Visitantes, Crianças e Cursos
tipo: verificacao
status: feita
quem: codex
desde: 2026-10-25
branch: historia/O4-continuidade-visitantes
depende: []
tamanho: G
---

## Por quê
Uma ação do pastor em Visitantes, Crianças ou Cursos precisa chegar à pessoa certa, e a resposta precisa voltar. Essa cadeia ainda não foi percorrida inteira.
Fonte: HANDOFF item 4.

## Arquivos (trilho)
- `docs/service-v7/historias/O4-continuidade-visitantes.md`

- `scripts/check-local-continuidade.ts`
- `docs/service-v7/PENDENTES.md`

- `supabase/migrations/0097_service_course_progress.sql`
- `docs/service-v7/producao.sql`

## Pronto quando
- Cada etapa da cadeia percorrida com evidência: a ação chega à pessoa certa e a resposta volta.

## Notas
ABERTO. Mesmo trabalho de I3 e E5.
Trilho a definir na reserva.

25/10: N1 parcial publicada pelo PR24, SHA 7eab3f6, banco e Vercel concluídos. Integração restante registrada na N2. F1 não iniciada por sobrepor modules/financeiro/, ainda reservado pela I10/Claude. Próxima história livre da fila: O4. Verificação com contas autenticadas canônicas em banco descartável, sem telas E/I/M/G nem serviços externos.

Trilho ampliado para eventual correção do progresso de Cursos no banco. A leitura encontrou check-in do membro seguido de UPDATE em enrollments, embora a escrita exija liderança (0008); a prova autenticada verifica a persistência real antes de aprovar a cadeia. Migração nova aditiva, sem editar telas ou caminhos da I10.


25/10: cadeias autenticadas verificadas em Supabase descartável. Visitantes: gestão atribui ao líder, líder responde/avança, gestão lê o retorno, colega sem liberação e outra igreja não recebem dados. Kids: equipe registra presença, responsável lê e pede retirada, equipe recebe/confirma, família lê o resultado; não pode confirmar sozinha. Cursos: gestão oferece, membro se inscreve via enroll_me, gestão vê matrícula e presença, progresso volta ao membro.

Falha reproduzida antes da correção: presença do membro era gravada, mas o UPDATE de enrollments feito pela conta de membro era bloqueado pela lei de escrita (0008). Migração 0097 calcula progresso a partir das presenças na mesma transação, serializando pela matrícula. Não libera done_count/status ao membro. Valida pessoa/organização/curso/aula e recusa presença por colega ou sem matrícula. Duplicação não conta duas vezes. Exclusão manual recalcula; presença manual conclui; a recuperação só aumenta progresso comprovado, sem reduzir conclusões importadas.

Prova final: 31 casos em cex-rls-e26744756595, descartado; relatório local prints/o4-continuidade/resultado.json e log /tmp/cex-O4-correcao.log. Primeira prova parou em asserção do teste Kids que não aceitava recusa explícita; corrigida para verificar o estado pendente. A segunda confirmou a falha real de Cursos, antes da migração. Tipos e lint passaram. Nenhuma tela do Claude, push externo, aparelho ou família real foi testado/alterado. O escopo desta conclusão é a continuidade autenticada no banco, não auditoria visual. CI/build, dry-run SQL e deploy acompanhados no PR.
