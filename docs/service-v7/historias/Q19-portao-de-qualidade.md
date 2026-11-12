---
id: Q19
titulo: Levar o portão de qualidade para o main
tipo: infra
status: feita
quem: claude
desde: 2026-11-11
branch: historia/Q19-portao-de-qualidade
depende: []
tamanho: P
---

## Por quê
O ciclo "implementar, validar com saída real, corrigir, validar de novo" (skill `portao-de-etapa` e `scripts/validar.sh`) existia só no checkout do usuário, sem commit, e o usuário decidiu em 11/11 que ele vale para toda história. Do jeito que estava, o `validar.sh` rodava o lint do projeto inteiro (456 erros antigos no main) e nunca passaria.

## Arquivos (trilho)
- `scripts/validar.sh`
- `.claude/skills/portao-de-etapa/SKILL.md`
- `.claude/commands/service-v7.md`
- `AGENTS.md` (só a seção "Processo de qualidade")
- `docs/service-v7/historias/Q19-portao-de-qualidade.md`

## Pronto quando
- `bash scripts/validar.sh --rapido` no main diz "RESULTADO: TUDO PASSOU" e roda os mesmos passos de `.github/workflows/service.yml` (typecheck, leis 12 e 17, contraste, contratos lidos do workflow, pacote de produção).
- O lint só olha os arquivos que a história alterou em relação a `origin/main`.
- O skill manda fechar história nas Notas do arquivo da história (REGRAS-DE-TRABALHO §4) e subir o servidor com `npm run dev:local`.

## Notas
- 12/11 (claude): `bash scripts/validar.sh` no main: 27 PASSOU, "RESULTADO: TUDO PASSOU" (tsc, leis 12 e 17, contraste dos temas e gráficos, 16 contratos lidos do workflow, pacote de produção, critérios da captura, build com env do CI). Testado também: arquivo alterado com erro (e com espaço no nome) reprova no lint; servidor em :3000 sem o Supabase local é recusado; `PORTA=3001` com `npm run dev:local` passa `/service/login` e `/service`. Revisor: 10 achados, todos corrigidos (redirect não passa mais, servidor de produção é recusado, lista vazia de contratos falha, sem `.env.local` no diretório). Fora: "Migrações num Postgres limpo" continua só no CI.
