# Passo a passo — subir o banco do **Service** (VS Code + Supabase + Codex)

Guia direto para você levar o pacote deste projeto para o VS Code, aplicar no Supabase e
mandar o Codex construir o app em cima. Tudo em ordem, sem pular etapa.

---

## 0. O que você já tem neste projeto

```
HANDOFF - Banco de Dados (Supabase) - Service.md   ← leitura obrigatória (a arquitetura)
PASSO_A_PASSO - Banco Service.md                   ← este arquivo
AGENTS.md                                          ← leis de build (marca, paleta, ◆)
cex-brand-library/                                 ← kit oficial de UI (Inter, tokens, componentes)
supabase/
  README.md
  migrations/
    0001_foundation.sql … 0009_bootstrap.sql       ← as 9 migrations, em ordem
```

Baixe/abra a pasta do projeto no VS Code (se estiver na nuvem, exporte o projeto e abra a
pasta localmente).

---

## 1. Pré‑requisitos (uma vez só)

1. **Conta no Supabase** (supabase.com) e um **projeto** criado (guarde a senha do banco).
2. **Node.js** instalado (para o Codex/CLI e o app).
3. **Supabase CLI**:
   ```bash
   npm install -g supabase
   # ou, no Mac:  brew install supabase/tap/supabase
   supabase --version
   ```
4. **VS Code** + a extensão **Supabase** (opcional) e a do seu agente (Codex/Copilot).

---

## 2. Conectar o projeto local ao Supabase

No terminal, dentro da pasta do projeto:

```bash
supabase login                      # abre o navegador para autorizar
supabase link --project-ref SEU_REF # o REF está na URL do painel: app.supabase.com/project/SEU_REF
```

> A pasta `supabase/migrations/` que você já tem é exatamente o formato que a CLI espera.
> Não renomeie os arquivos: a ordem `0001…0009` é o que garante a sequência.

---

## 3. Aplicar as migrations (criar o banco)

```bash
supabase db push
```

Isso roda `0001` → `0009` em ordem. Ao final você terá:

- Os **5 schemas**: `core`, `service`, `billing`, `audit` (e `cex` reservado, vazio).
- Todas as tabelas do Service com **RLS habilitada** e políticas.
- O produto `service`, o plano base e o catálogo de permissões (seed).
- Os gatilhos: signup → `core.users`, e a função `core.bootstrap_church_org()`.

**Conferir no painel** (Supabase Studio → Table editor / SQL): veja os schemas e rode
```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname in ('core','service','billing','audit')
order by 1,2;
```
`rowsecurity` deve ser `true` em toda tabela de negócio.

> Alternativa sem CLI: abra cada arquivo `.sql` no **SQL Editor** do Studio e rode do `0001`
> ao `0009`, em ordem. Mesmo resultado.

---

## 4. Ligar o Auth e criar a primeira igreja (teste de fumaça)

1. No painel: **Authentication → Providers**, habilite **Email** (ou Google).
2. Crie um usuário de teste (Authentication → Add user) e faça login pelo seu app/temporário.
3. Com esse usuário logado, chame a função de bootstrap (SQL Editor, autenticado como o
   usuário, ou via `supabase.rpc` no app):
   ```sql
   select * from core.bootstrap_church_org('Igreja Central', 'São Paulo · SP');
   ```
   Isso cria a organização, te põe como **master**, libera o `service`, semeia as permissões
   e cria a **igreja matriz**. Guarde o `organization_id`/`church_id` retornados.
4. **Teste o isolamento:** logue com um segundo usuário de outra org e confirme que ele
   **não** enxerga nenhuma linha do Service da primeira. É a prova de que a RLS está de pé.

---

## 5. Passar para o Codex construir o app

Abra o Codex no VS Code e dê este **prompt inicial** (cole como está):

> **Contexto:** projeto CE.X Service. O banco Supabase já está criado pelas migrations em
> `supabase/migrations/` (schemas `core`/`service`/`billing`/`audit`). Leia, nesta ordem,
> antes de codar: `AGENTS.md`, `HANDOFF - Banco de Dados (Supabase) - Service.md` e o
> `cex-brand-library/AGENTS.md`.
>
> **Tarefa:** ligar o app `service_app/` (hoje com dados em memória em `service_app/data*.js`)
> ao Supabase, substituindo o estado mock por chamadas reais, **mantendo as mesmas chaves**
> do mapa protótipo→banco da §6 do handoff.
>
> **Regras invariantes:**
> - Toda a UI se monta com a `cex-brand-library/` (tipografia **Inter**, marca **`CE.X`**,
>   paleta **quente** sem azul, oliva ≤ 15%, marca de seção **`◆`**, **zero travessão**
>   `—`/`–`, sem emoji). Faltou componente no kit? **Pare e avise** — não improvise CSS.
> - Isolamento sempre por `organization_id`; nunca escreva SQL que ignore a RLS. Use o
>   cliente Supabase com o token do usuário (nunca a `service_role` no front).
> - Não crie tabela nova no `public`; não misture campos de outro produto. Tabela nova
>   segue o checklist do handoff (schema certo, FKs, timestamps, RLS, políticas, índices,
>   migration versionada) e você me explica o schema **antes** de criar.

Sugestão de ordem de trabalho para o Codex:

1. **Cliente Supabase** + `.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
2. **Auth**: login/logout + `bootstrap_church_org` no primeiro acesso.
3. **Leitura**: trocar `window.SVC.*` por queries (`churches`, `people`, `members`,
   `ministries`, `events`…), respeitando `organization_id`/`church_id`.
4. **Escrita**: escalas, visitantes, decisões, kanban, chat — usando as policies já prontas.
5. **Realtime** (opcional): `service.messages` e `service.roster_assignments` no canal do app.

---

## 6. Variáveis de ambiente (front)

```env
SUPABASE_URL=https://SEU_REF.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...        # painel → Project Settings → API (anon/public)
```
Nunca exponha a `service_role` no navegador — ela ignora RLS e é só para backend/Edge Functions
(webhooks de pagamento etc.).

---

## 7. Quando o CE.X entrar (depois)

O schema `cex` está reservado e vazio de propósito. Ao implementar a loja:
- Crie `cex.*` (estantes, materiais, cursos comerciais, waitlist) — **nunca** dentro de
  `service`. Cursos comerciais são `cex.courses`, distintos das trilhas `service.courses`.
- `billing.entitlements` já está pronto para amarrar as compras avulsas (Hotmart) ao direito
  de download, sem misturar catálogo com comercial.
- Mesma lei: RLS obrigatória, isolamento por org, nada no `public`.

---

## Resumo em 6 comandos

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_REF
supabase db push
# no SQL Editor, logado como usuário de teste:
#   select * from core.bootstrap_church_org('Igreja Central','São Paulo · SP');
# depois: abrir o Codex e colar o prompt da §5
```
