---
id: Q2
titulo: Isolar e modernizar check-local-rls
tipo: infra
status: feita
quem: codex
desde: 2026-10-22
branch: historia/Q2-isolar-check-local-rls
depende: []
tamanho: M
---

## Por quê
O script check-local-rls.ts faz reset destrutivo de requisitos e pedidos, e tem contrato desatualizado de "Quero servir". Ele falhou e não deve rodar no banco local compartilhado.
Fonte: HANDOFF item 7; CONTINUIDADE.md "Limitações"; implementacao/acessos/README.md.

## Arquivos (trilho)
- `scripts/check-local-rls.ts`

## Pronto quando
- Script roda em banco descartável, com limpeza em caso de falha.
- Contrato de "Quero servir" atualizado.
- Não roda no banco local compartilhado.

## Notas
Concluído em 2026-10-22. O comando cria um projeto Supabase novo (portas próprias), prepara os schemas, aplica todas as migrações por psql e usa uma cópia temporária do seed canônico. Só inicia os testes após conferir a saúde dos serviços e o schema da API. Recusa 54321 e recusa mudanças no contrato do seed, sem executar fixtures. O finally remove projeto, volumes e diretório, inclusive após exceção.

Validação local:
- `npx tsx scripts/check-local-rls.ts`: 46 verificações aprovadas, código 0; ambiente `cex-rls-428905729fd1` descartado.
- `--provar-limpeza`: falha intencional depois do seed, código 1; ambiente `cex-rls-6859225db5a4` descartado. Nenhum container ou volume `cex-rls-*` restante.
- CLI/Docker simulados: endpoint 54321 recusado antes de SQL/seed, com cleanup chamado.
- Hash e contagem de `requirements` e `serve_requests` do banco compartilhado idênticos antes/depois.
- Typecheck, lint, lei 12, biblioteca, contraste, 13 contratos e build com configuração fictícia do CI passaram.

Contrato de Quero servir: time fechado, time aberto sem líder no app, requisitos pendentes, já participa, curso concluído, pedido e aprovação pelo líder. Sem reset das tabelas compartilhadas. A matriz de demais papéis, uploads e notificações continua na Q3.
