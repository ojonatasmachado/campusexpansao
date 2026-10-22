# Migrações em produção: automáticas, banco antes do código

Desde 2026-10-21 ninguém cola SQL no SQL Editor. Quando um PR entra no `main`:

1. O workflow **Produção** (`.github/workflows/producao.yml`) roda `supabase db push` contra o
   Supabase de produção. A CLI compara `supabase/migrations/` com a tabela
   `supabase_migrations.schema_migrations` e aplica só as que faltam, em ordem, cada uma
   na sua transação.
2. Só se o passo 1 der certo, o mesmo workflow chama o Deploy Hook da Vercel e o código
   novo vai ao ar. Se a migração falhar, o site fica na versão anterior (que funciona com o
   banco como está) e o erro aparece na aba Actions.

O deploy automático do `main` pela Vercel está desligado em `vercel.json`
(`git.deploymentEnabled.main: false`); os previews dos PRs continuam normais.

Por que não a integração GitHub do Supabase (opção "Deploy to production"): ela roda em
paralelo com a Vercel e não segura o deploy se a migração falhar. Código novo com banco
velho já quase quebrou o aceite de convite. **Deixe essa opção desligada** no painel do
Supabase (Project Settings > Integrations > GitHub), senão as duas aplicam ao mesmo tempo.
A verificação "Supabase Preview" dos PRs pode continuar como está.

## Regras para quem escreve migração

- Arquivo novo em `supabase/migrations/`, número seguinte (`0094_...sql`). Nunca edite nem
  renumere uma migração que já está no `main`: produção já a registrou e não roda de novo.
- Só acrescentar (colunas, tabelas, funções). O código antigo continua no ar até o deploy
  terminar e precisa funcionar com o banco novo.
- Nada de `create index concurrently` nem `vacuum`: a CLI roda cada arquivo numa transação.
- O CI (`service.yml`) aplica tudo do zero num Postgres com PostGIS antes do merge.

## Configuração (uma vez, feita pelo dono do projeto)

Os segredos são cadastrados por você; nenhum agente procura senha em `.env` ou keychain.

1. **Segredo `SUPABASE_DB_URL`.** Supabase > botão Connect > Session pooler (porta 5432;
   o GitHub não alcança o endereço direto, que é só IPv6). Troque `[YOUR-PASSWORD]` pela
   senha do banco e cadastre em GitHub > Settings > Secrets and variables > Actions.
   Se a senha tiver símbolos (`@`, `#`, `/`, `%`...), eles precisam ir codificados na URL
   (`@` vira `%40`); mais simples é trocar a senha por uma só com letras e números.
2. **Segredo `VERCEL_DEPLOY_HOOK_URL`.** Vercel > projeto > Settings > Git > Deploy Hooks:
   nome `producao`, branch `main`. Cadastre a URL no GitHub do mesmo jeito.
3. **Histórico das migrações antigas.** Até a 0092 tudo foi aplicado à mão, então a
   produção não sabe que elas rodaram. Sem este passo, o primeiro `db push` tentaria
   rodar tudo de novo. No Mac, na pasta do projeto:

   ```bash
   export SUPABASE_DB_URL='cole aqui a mesma string do passo 1'
   ```

   ```bash
   supabase migration list --db-url "$SUPABASE_DB_URL"
   ```

   ```bash
   supabase migration repair --db-url "$SUPABASE_DB_URL" --status applied $(ls supabase/migrations | cut -c1-4 | awk '$1 <= "0092"')
   ```

   ```bash
   supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
   ```

   O último comando deve listar só a `0093` (ou dizer que está em dia, se ela ainda não
   está no `main`). Se o `migration list` mostrar versões remotas que não existem na pasta
   (por exemplo uma `0051` antiga da aula, renumerada para `0067`), marque-as como revertidas
   com `--status reverted <versão>`: elas só existem no histórico, o SQL já está no banco.
4. Confirme que a opção "Deploy to production" da integração GitHub do Supabase está
   desligada.

Depois disso, mesclar o PR que trouxe este arquivo testa tudo: a `0093` (só troca o
comentário do schema `service`) tem de aparecer em `migration list` como aplicada, sem as
antigas rodarem de novo, e a Vercel publica em seguida.

## Plano B: SQL Editor

Se o workflow estiver fora do ar ou for preciso aplicar algo urgente à mão:

1. `scripts/ci/pacote-producao.sh 0093 > /tmp/pacote.sql` gera as migrações a partir de
   um número, numa transação só (`docs/service-v7/producao.sql` continua sendo o pacote
   desde a 0051, conferido pelo CI).
2. Cole no SQL Editor e rode.
3. Registre no histórico o que foi aplicado, senão o workflow tenta de novo:
   `supabase migration repair --db-url "$SUPABASE_DB_URL" --status applied 0093`.
4. Para publicar o código sem migração: Actions > Produção > Run workflow (ou o Deploy Hook).
