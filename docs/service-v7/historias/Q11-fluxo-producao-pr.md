---
id: Q11
titulo: Fechar fluxo de produção, PR e commits
tipo: infra
status: feita
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
- `.gitignore`
- `eslint.config.mjs`
- `.claude/settings.json` (novo: hook Stop do portão de qualidade)
- `scripts/hook-parar.sh` (novo)

## Pronto quando
- service-v7 atualizada com origin/main ou rebaseada.
- Commit 5480bba em main, por PR.
- Destino dos arquivos soltos do checkout principal decidido.
- Stashes antigos (git stash list) resolvidos.

## Notas
Levantamento refeito em 13/11 (o de 22/10 estava desatualizado; muita coisa já se resolveu sozinha entre as duas datas):

- **Commit 5480bba**: já está em `main` em substância (`scripts/medir-densidade.js`, `scripts/seed-local-volume.ts`, `docs/service-v7/LEVEZA-2026-10-21.md`, leis 13-16 no AGENTS.md e no MANIFESTO existem lá, via outro commit/PR). Critério já satisfeito, nada a portar.
- **Arquivos soltos do checkout principal** (13 entradas em 13/11, não 94): as edições soltas em `AGENTS.md`, `.claude/commands/service-v7.md`, `.claude/skills/portao-de-etapa/` e `scripts/validar.sh` eram rascunhos de uma versão do portão de qualidade **anterior e inferior** à que já está mesclada em `main` (ex.: a de `main` já usa `npm run dev:local` e alerta contra `npm run dev`, que aponta pra produção; a solta ainda mandava usar `npm run dev`). Descartados sem commit, para não regredir o que já está em produção.
  - `scripts/hook-parar.sh` era a única peça genuinamente nova (não existia em `main`): liga o `validar.sh` já existente a um hook Stop automático. Entra neste PR com o `.claude/settings.json` que o registra.
  - `.claude/docs/service-v7/historias/screenshots/i1-local-lider/` era lixo de uma verificação abandonada (fotos e json de falha, caminho errado: deveria ser `docs/...`, não `.claude/docs/...`). Apagado do checkout principal, não entra no PR.
  - `.vscode/settings.json`, `journey-mapper/` (tem `.git` próprio, material de concorrente), `meu-blog-ghost/` (blog pessoal, sem relação com o projeto) e `supabase/migrations/0093_service_ibge_perfil.sql` (migração da G1/IBGE, parqueada até a G1 andar, decisão já registrada em `PERGUNTAS-CLAUDE.md` de 11/11) ficam fisicamente no checkout, agora cobertos pelo `.gitignore` deste PR (exceto a migração, que deve ficar visível para quem for mexer na G1).
- **Stashes antigos**: os 5 (`i1-verify-stash`, `tools/.auth e node_modules restantes`, `arquivos soltos antes da nuvem`, `helpers soltos 4.3`, `cex-studio local antes da nuvem`) foram conferidos um a um contra `origin/main`: todo o conteúdo relevante (`sedeComPonto`, `date.ts`, `kids-checkin.ts`) já existe lá por outro caminho; o resto é lixo (`node_modules`, auth local, diff de 1 linha num bundle gerado do cex-studio). Todos removidos (`git stash drop`) no checkout principal.
- **Branch `service-v7`**: 53 commits atrás de `origin/main` e só 14 à frente (todos já em `main` por outro caminho, exceto I7 e M3, que tinham branch própria `historia/<ID>` sem PR; conferido em 13/11: as duas já foram mescladas, PR #69 e #68, 12/11, por outra frente). Confirma a recomendação já deixada em `PERGUNTAS-CLAUDE.md` (pergunta 7, 11/11): não publicar, apagar o branch local. Checkout principal passa a seguir `main`.
- **Revisão (`revisor`)**: achou 2 bugs graves no `hook-parar.sh` antes do commit, corrigidos:
  1. O hook rodaria (e bloquearia) em qualquer sessão aberta no checkout principal, onde `validar.sh` falha de propósito por causa do `.env.local` real. Corrigido: sai cedo quando `git rev-parse --git-dir` = `--git-common-dir` (não é worktree vinculado) ou existe `.env.local`.
  2. A marca de "já validado" usava só a lista de nomes do `git status`, então editar de novo um arquivo que já aparecia como modificado não mudava o hash e pulava a validação. Corrigido: a marca agora inclui o hash do conteúdo (`git diff` dos rastreados + bytes dos novos).
  Também ampliado o filtro de caminhos vigiados (incluía só `app components lib supabase package.json`; agora inclui `scripts tools docs/service-v7/producao.sql .github tsconfig.json`), o timeout do hook (180s → 600s, `--rapido` ainda faz fetch e ~17 contratos) e o comando do `settings.json` para não depender do diretório atual (`$CLAUDE_PROJECT_DIR`). Os três achados "baixo" do revisor: um redundante (removido), e um aceito como limitação conhecida — o hook pode bloquear por drift de `origin/main` (contrato/lint contra a main) mesmo em sessão que só mexeu em docs; aceitável, registrado aqui em vez de silenciado.
  Testado: pipe-test no checkout principal (sai em 0s), numa árvore limpa (sai em 0s), com mudança real (roda `validar.sh --rapido` completo, ~47s, `TUDO PASSOU`), e reeditando um arquivo já sujo (hash muda, revalida; antes da correção isso passava batido).
