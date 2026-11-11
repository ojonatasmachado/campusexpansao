---
id: Q17
titulo: Aplicar o termo da igreja na História da pessoa
tipo: codigo
status: feita
quem: codex
desde: 2026-11-11
branch: historia/Q17-termo-na-historia
depende: []
tamanho: P
---

## Por quê
Os fatos de integração guardam o marcador `{Grupo}` em `service.timeline_events.title`, mas duas telas exibem o título sem resolver o vocabulário da igreja.

## Arquivos (trilho)
- `app/service/lib/titulo-historico.ts`
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
Busca por usos de `event.title`, `f.title`, `timeline_events` e `timelineEvents` encontrou os dois leitores corrigidos: `PersonTimeline.tsx` e `Caminhada.tsx`. `Kids.tsx` usa `service.kids_events`, outro tipo de evento; relatórios contam fatos por tipo sem renderizar seus títulos.

Fluxo real pela interface: como gestão, a ficha da Maria recebeu um fato `{Grupo}` pela ação de concluir a etapa Grupo; depois de mudar temporariamente o vocabulário para Célula em Personalização, a ficha mostrou Célula. A tela Minha história do membro mostrou Grupo após restauração do termo. As três capturas foram abertas e conferidas.

Consulta antes da limpeza confirmou `timeline_events.title = {Grupo}` e a jornada `[1,1,0,1,1]`. Depois, o evento de teste foi removido, a jornada voltou para `[1,1,0,0,1]` e `vocabulario` voltou a `{}`; evento de teste restante: 0.

`tsc --noEmit -p .` e ESLint dos três arquivos de código passaram. `npx tsx scripts/historias.ts` não pôde baixar `tsx` por indisponibilidade de rede (`ENOTFOUND`); a checagem equivalente foi compilada com o TypeScript local para `/private/tmp` e executada com `HISTORIAS_SEM_FETCH=1`, confirmando a reserva e os conflitos registrados. Capturas e hashes MD5:

- `Q17-ficha-grupo.png`: ficha da Maria mostra “Grupo”; md5 `b866991f65fa473039c6002dfa5af835`.
- `Q17-ficha-celula.png`: a mesma ficha mostra “Célula”; md5 `b287077ffd6894d840c654f9a4fcc65f`.
- `Q17-app-grupo.png`: Minha história mostra “Grupo”; md5 `818dd52ca93601b7da323f635414c5fa`.

CI do PR #61: ambos os jobs `service` passaram (execuções 42954229551 e 42954249455); Vercel Preview passou. O PR #61 está aberto, sem merge. O servidor iniciado neste worktree foi encerrado; `lsof -nP -iTCP:3117 -sTCP:LISTEN` não retornou processo.

## Notas
Reserva feita por codex. O helper isolado evita alterar `historico.ts`, que estava reservado para E7; `Caminhada.tsx` recebeu somente a troca de exibição necessária e também aparece no trilho O8. Nenhuma outra exibição de título de `timeline_events` foi encontrada.
