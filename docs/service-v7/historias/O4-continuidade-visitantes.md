---
id: O4
titulo: Verificar continuidade de Visitantes, Crianças e Cursos
tipo: verificacao
status: reservada
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
