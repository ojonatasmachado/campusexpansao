---
id: Q18
titulo: Gravar etapa da Caminhada numa transação só
tipo: codigo
status: feita
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
`supabase migration up --local` aplicou 0101 a 0106 no Supabase local, sem reset. O teste revelou que a função auxiliar `service.church_time_zone` só autoriza `service_role`; mantive as RPCs como `security invoker` e a 0106 agora lê o fuso da igreja sob RLS. Reapliquei somente a 0106 idempotente. A jornada é salva como números JSON `0` e `1`, compatíveis com o cast `::int` de 0043. A busca do revisor acontece depois de ler o pedido e filtra por `organization_id`.

Pela ficha de Mateus, marquei três etapas. A interface recebeu três respostas `200 "ok"`. A consulta mostrou `[1,1,1,1,0]` e `jsonb_typeof` igual a `number` nas cinco posições. Criei temporariamente um requisito `serve` para `curso`; sob contexto de gestão, `service.missing_requirements` retornou `has_access=true, missing_count=0`.

Maria enviou o pedido de Grupo pelo app (`journey_change_requests` respondeu `201`). Lucas, líder do Louvor, abriu a gaveta pelo Início e aprovou pela interface (`200 "ok"`). Repetir a RPC autenticado retornou `200 "ja_revisado"`. A tentativa de Lucas aprovar um pedido temporário de Mateus, sem vínculo com Louvor, retornou `403` e `Você não lidera o time desta pessoa.`

Limpei os pedidos, o requisito e os quatro fatos de teste. A consulta final mostrou Maria `[1,1,0,0,1]`, Mateus `[1,0,0,0,0]`, zero pedidos e zero fatos de etapa criados no teste. `scripts/ci/pacote-producao.sh > docs/service-v7/producao.sql` e `git diff --check` passaram.

Fotos refeitas, abertas e verificadas após a animação terminar (opacidade 1, folha parada); o selo do Next foi ocultado e confirmado ausente:
- `Q18-ficha-tres-etapas.png`, ficha do Mateus na História, com Grupo em 11/11/2026, Fundamentos em 10/11/2026 e Batismo nas águas em 09/11/2026. `__medir(24)`: 7 ações, 35 palavras. MD5 `8939f7895af072cceee12d9145c27dff`.
- `Q18-pedido-pedir.png`, folha Grupo da Maria, com data preenchida e botão Enviar inteiro visível. `__medir(44)`: 3 ações, 23 palavras. MD5 `608601a598ae709618b0e6d3ce09d175`.
- `Q18-lider-pedido-aberto.png`, Início da gestão depois da aprovação; a linha de pedido de Caminhada não aparece. `__medir(24)`: 0 ações, 8 palavras. MD5 `e89368ce0572c3ca102562ce2f2d039f`.

As capturas inválidas anteriores foram removidas, inclusive a foto de formulário vazio e a imagem da Caminhada que não fazia parte desta retificação.

`npx tsc --noEmit -p .` e ESLint nos três arquivos TSX tocados passaram. A checagem local `npx tsx scripts/check-service-lei12.ts` não iniciou: `tsx` não está instalado e o acesso ao npm terminou em `ENOTFOUND registry.npmjs.org`. A checagem de pacote de produção e `git diff --check` passaram. A execução remota de `.github/workflows/service.yml` está em andamento na PR #62; a CI de migrações já passou. PR continua aberto, sem merge.

## Notas

### Retificação de fotos
As fotos refeitas foram abertas e verificadas com a folha parada em opacidade 1 e o selo do Next oculto e ausente. Os MD5s e descrições estão na seção Validação. A ficha mostra as três etapas de Mateus e suas datas; a folha de Grupo de Maria mostra Enviar inteiro; o Início da gestão já não mostra a linha de pedido após aprovar.

O banco local foi restaurado após os testes: Maria `[1,1,0,0,1]`, Mateus `[1,0,0,0,0]`; os pedidos e eventos temporários foram removidos. A captura `Q18-membro-caminhada.png` foi apagada por não pertencer a esta retificação.
Construção concluída por codex; testes e dados temporários foram limpos. A 0106 corrigida está em `docs/service-v7/producao.sql`.
