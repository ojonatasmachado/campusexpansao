# supabase/ — Banco do CE.X **Service**

Pacote de migrations para o Supabase do ecossistema Campus. **Escopo: só o Service.**

**Comece pelo handoff:** [`../HANDOFF - Banco de Dados (Supabase) - Service.md`](../HANDOFF%20-%20Banco%20de%20Dados%20(Supabase)%20-%20Service.md).
Ele traz a lei mãe (um Campus, um Supabase, 5 schemas, produtos separados), a justificativa
tabela‑a‑tabela e a ordem de execução. E lembra: **toda a UI se baseia na `cex-brand-library/`**
(tipografia Inter, marca `CE.X`, paleta quente, `◆`, zero travessão).

## Ordem (rode em sequência)

| # | Arquivo | O que faz |
|---|---|---|
| 0001 | `migrations/0001_foundation.sql` | extensões, os 5 schemas, helpers de RLS, grants |
| 0002 | `migrations/0002_core.sql` | `core`: users, organizations, memberships, product_access, permissions |
| 0003 | `migrations/0003_billing.sql` | `billing`: plans, subscriptions, invoices, payments, entitlements (+ libera produto no core) |
| 0004 | `migrations/0004_audit.sql` | `audit`: log genérico + trigger `audit.log_change` |
| 0005 | `migrations/0005_service_foundation.sql` | `service`: igrejas, pessoas, membros, ministérios, grupos, identidade, tags |
| 0006 | `migrations/0006_service_operations.sql` | `service`: eventos, escalas, visitantes, jornada, trilhas, salas, reuniões, kanban, chat + RLS de todo o schema |
| 0007 | `migrations/0007_seed_service.sql` | seed: produto `service`, plano base, catálogo de permissões |
| 0008 | `migrations/0008_service_rls_roles.sql` | RLS fina por papel (escrita: admin vs líder) |
| 0009 | `migrations/0009_bootstrap.sql` | gatilho de signup (`core.users`) + `core.bootstrap_church_org()` |

```bash
supabase db push        # aplica todas em ordem
```

**Passo a passo completo (VS Code + Supabase CLI + Codex):**
[`../PASSO_A_PASSO - Banco Service.md`](../PASSO_A_PASSO%20-%20Banco%20Service.md)

## Invariantes (não quebrar)

- Nada de tabela de negócio em `public`.
- Não misturar domínios (Service ≠ CE.X). `cex` fica reservado, vazio por enquanto.
- Toda tabela: schema certo · FKs · `created_at` · `updated_at` (quando fizer sentido) · **RLS
  habilitada** · políticas · índices · migration versionada.
- Isolamento por `organization_id` via `core.can_access(org, 'service')`.
