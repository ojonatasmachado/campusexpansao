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

Fotos abertas:
- `Q18-ficha-tres-etapas.png`, folha de Mateus com Batismo, Fundamentos e Grupo marcados; medição `__medir(24)`: 7 ações, 35 palavras. MD5 `ac941eb5d82e18db50ac8cdc540c42d3`.
- `Q18-membro-caminhada.png`, Maria vê 3 de 5 etapas concluídas e os estados de cada etapa; `__medir(44)`: 6 ações, 52 palavras. MD5 `325a52194d3347ffa0ecff574cef92dc`.
- `Q18-pedido-pedir.png`, folha de pedido de Grupo com data e observação; MD5 `1784cd317f050e96e9dd60e068d1c2ce`.
- `Q18-lider-pedido-aberto.png`, gaveta do líder com o pedido de Maria e os botões Aprovar e Rejeitar; medição `__medir(24)`: 0 ações, 8 palavras, conforme saída do medidor. MD5 `6397ea2eba93670afa3821c52af79eab`.

TypeScript, ESLint e verificações completas de `.github/workflows/service.yml` serão registrados após a execução final. PR #62 continua aberto, sem merge.

## Notas
Construção concluída por codex; testes e dados temporários foram limpos. A 0106 corrigida está em `docs/service-v7/producao.sql`.
