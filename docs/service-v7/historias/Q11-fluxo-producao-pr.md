---
id: Q11
titulo: Fechar fluxo de produção, PR e commits
tipo: infra
status: reservada
quem: claude
desde: 2026-11-13
branch: historia/Q11-fluxo-producao-pr
depende: []
tamanho: P
---

## Por quê
A branch service-v7 está 18 commits atrás de origin/main. O commit 5480bba (leis 13 a 16) existe só em service-v7. O checkout principal tem 94 arquivos soltos e há stashes antigos. Falta fechar o fluxo de produção e de PR.
Fonte: levantamento de 22/10 (checkout local e git log).

## Arquivos (trilho)
- `docs/service-v7/historias/Q11-fluxo-producao-pr.md`
- `AGENTS.md` (seção "Processo de qualidade / portão de etapa")
- `.gitignore`
- `eslint.config.mjs`
- `.claude/commands/service-v7.md`
- `.claude/skills/portao-de-etapa/**` (novo)
- `scripts/validar.sh` (novo)
- `scripts/hook-parar.sh` (novo)

## Pronto quando
- service-v7 atualizada com origin/main ou rebaseada.
- Commit 5480bba em main, por PR.
- Destino dos 94 arquivos soltos decidido.
- Stashes antigos (git stash list) resolvidos.

## Notas
ABERTO. Ação de git, sem arquivo do repositório a alterar.
journey-mapper/, ponte_rea_full/ e docs/service-v7/COMPARATIVO_PONTE.md ficam fora do git de propósito (material de concorrente); não entram no PR.
Trilho a definir na reserva.
