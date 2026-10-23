---
id: Q5
titulo: Confirmar execução do workflow de CI no GitHub
tipo: verificacao
status: feita
quem: codex
desde: 2026-10-23
branch: historia/Q5-ci-workflow-github
depende: []
tamanho: P
---

## Por quê
Falta confirmar que o critério de CI "workflow só roda no GitHub" foi de fato executado. CONTINUIDADE lista runs "success", o que pode já cobrir.
Fonte: PROGRESSO.md 5.4 (nota original).

## Arquivos (trilho)
- `docs/service-v7/historias/Q5-ci-workflow-github.md`

## Pronto quando
- Execução confirmada com evidência no GitHub, ou fechado sem trabalho adicional se você aceitar as evidências do CONTINUIDADE.

## Notas
2026-10-23, Codex: feita, sem alterar código ou workflow. Evidência conferida diretamente no GitHub pela API de jobs e pelos metadados do run, não apenas pelo diário local.

Workflow `.github/workflows/service.yml`, SHA `1409cabaa68261de4e2acfb49fab57d86f33d990` (Q3, PR #18):

| Evento | Criado em UTC | Conclusão | Evidência |
|---|---|---|---|
| push | 23/10/2026 21:46:03 | success | [Service 40029129602](https://github.com/ojonatasmachado/campusexpansao/actions/runs/40029129602) |
| pull_request | 23/10/2026 21:46:25 | success | [Service 40029173281](https://github.com/ojonatasmachado/campusexpansao/actions/runs/40029173281) |

O job `service` [120672830930](https://github.com/ojonatasmachado/campusexpansao/actions/runs/40029173281/job/120672830930) confirmou sucesso em: critérios da captura (leis 12/13), typecheck, lei 12 estática, lei 17, contraste dos temas, contratos das jornadas, migrações num Postgres limpo, pacote de produção e build. O run de push também concluiu com sucesso. Isso fecha o critério de execução real do CI no GitHub.

Limite: o CI testa os critérios da captura com DOM e os contratos automáticos. As jornadas autenticadas e a matriz de 521 casos foram executadas localmente nas Q1/Q3 e têm provas próprias; não afirmar que rodaram no GitHub. Serviços reais, aparelho físico e leitor de tela também não são cobertos por estes runs. Verificado nesta alteração documental: links, metadados, estados dos passos e `git diff --check`.
