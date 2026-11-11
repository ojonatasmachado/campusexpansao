---
id: Q18
titulo: Gravar etapa da Caminhada numa transação só
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-11
branch: historia/Q18-caminhada-transacao
depende: []
tamanho: M
---

## Por quê
O fluxo de aprovação pode gravar o fato e falhar ao atualizar o pedido; uma nova tentativa duplica a linha do tempo. Ao marcar várias etapas pela ficha, cada atualização parte da jornada antiga em memória e as anteriores se perdem.

## Arquivos (trilho)
- `supabase/migrations/0106_service_caminhada_transacao.sql`
- `app/service/painel/comum.tsx`
- `app/service/ServiceExactApp.tsx`
- `app/service/painel/telas/Caminhada.tsx`
- `docs/service-v7/historias/Q18-caminhada-transacao.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/producao.sql`
- `docs/service-v7/historias/screenshots/Q18-*.png`

## Decisão
Usar duas RPCs `security invoker` com `search_path` fixo: `marcar_etapa_caminhada` grava o fato e liga a posição da jornada no banco em uma operação; `aprovar_pedido_caminhada` só processa pedidos ainda pendentes e chama a primeira RPC dentro da mesma transação. A segurança continua nas políticas existentes. Títulos ficam com o marcador entre chaves.

## Pronto quando
- A atualização do fato e da jornada é atômica e usa o valor atual do banco, inclusive para jornada nula ou curta.
- Pedido já analisado retorna `ja_revisado` sem novo fato.
- Ficha com várias etapas salva todas; gestão e líder autorizado aprovam; pessoa fora do time continua barrada pela política.
- Conclusão da turma de batismo trata erros com aviso e não ignora falhas.
- Migração aplicada localmente sem reset; testes de UI e banco documentados, dados restaurados.
- Typecheck, checks do Service, CI e PR próprios verdes; servidor encerrado.

## Jornada
Gestão registra etapas na ficha, ou aprova o pedido de uma pessoa. Cada ação persiste o fato e a jornada juntos; uma aprovação repetida não duplica fatos.

## Validação
`npx tsc --noEmit -p .` e ESLint dos quatro arquivos alterados passaram (exit 0). `scripts/ci/pacote-producao.sh | diff -q - docs/service-v7/producao.sql` passou.

O Supabase local estava em 0100 (`supabase db query --local "select max(version) from supabase_migrations.schema_migrations"`). `supabase migration up --local` foi bloqueado pelo revisor automático porque aplicaria 0101–0106, não apenas esta história. A tentativa de executar somente o arquivo 0106 com `supabase db query --local --file ...` falhou com `cannot insert multiple commands into a prepared statement`. Não houve alteração de schema ou dados por essas tentativas. Testes de fluxo e banco aguardam definição sobre as migrações pendentes.

A inspeção de `pg_policies` confirmou que `service.members.svc_w_upd` permite `owner`, `master`, `pastor` e `lider` em todo o tenant; a política não filtra time. Por isso a RPC mantém `security invoker` e acrescenta uma verificação mais restrita para líder, baseada no time ou grupo da pessoa, sem mudar políticas.

## Notas
Reserva feita por codex. O main de origem estava em 0105, mas o banco local compartilhado só tinha até 0100. Nenhuma migração foi aplicada ainda.
