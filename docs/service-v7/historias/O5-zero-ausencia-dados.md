---
id: O5
titulo: Verificar zero e ausência de dados em outras áreas
tipo: verificacao
status: reservada
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

## Pronto quando
- Áreas fora das já revisadas testadas com zero e com dados ausentes.
- Problemas encontrados corrigidos.

## Notas
ABERTO. Trilho a definir na reserva.

25/10: O4 publicada pelo PR25 (593d33e), banco e Vercel concluídos. Próxima da fila livre: O5. Prova Chromium autenticada em banco descartável: estados vazios e registros com campos opcionais ausentes em áreas operacionais do painel. Somente script/evidências nesta reserva inicial; telas E/I/M/G e caminhos da I10 continuam com Claude.

Retomada após interrupção: a prova não chegou aos casos. O Next/Webpack inferiu a raiz do checkout principal e o watcher alcançou um volume OrbStack fora do projeto. Reservado next.config.ts para fixar a raiz ao worktree/projeto, sem editar telas. Banco descartável e servidor órfão são removidos antes da repetição.
