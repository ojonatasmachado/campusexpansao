---
id: Q17
titulo: Aplicar o termo da igreja na História da pessoa
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-11
branch: historia/Q17-termo-na-historia
depende: []
tamanho: P
---

## Por quê
Os fatos de integração guardam o marcador `{Grupo}` em `service.timeline_events.title`, mas duas telas exibem o título sem resolver o vocabulário da igreja.

## Arquivos (trilho)
- `app/service/lib/historico.ts`
- `app/service/painel/telas/ficha/PersonTimeline.tsx`
- `app/service/membro/Caminhada.tsx`
- `docs/service-v7/historias/Q17-termo-na-historia.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/Q17-*.png`

## Decisão
Trocar o termo somente na exibição, com `comTermos` (`ct`) obtido por `useTermos()`. Um helper compartilhado recebe o título cru e a função `ct`; o banco continua guardando `{Grupo}`. Assim os fatos antigos e novos acompanham renomeações futuras, sem migração ou UPDATE.

## Pronto quando
- `PersonTimeline` e Minha história usam o mesmo helper para títulos de fatos.
- A busca identifica qualquer outra exibição direta de `timeline_events.title`; acessos a outros tipos de evento ficam documentados.
- A ficha mostra o termo atual, e após renomear Grupo para Célula mostra o termo novo; a Minha história também mostra o termo resolvido.
- A consulta confirma o título bruto `{Grupo}` no banco, sem persistir o termo resolvido.
- Dados de teste são limpos e o vocabulário volta ao original.
- Typecheck, checks do Service, CI e PR próprios estão verdes; porta livre, sem merge.

## Jornada
Gestão marca a etapa pela ficha da pessoa. O fato segue guardado com o marcador de vocabulário e as duas telas de História apresentam o nome da igreja vigente.

## Validação
Pendente.

## Notas
Reserva inicial por codex. Nenhum código de produto foi alterado nesta etapa.
