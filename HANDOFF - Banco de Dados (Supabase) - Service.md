# HANDOFF — Banco de Dados (Supabase) · CE.X **Service**

> **Para o Codex.** Este é o pacote completo para implementar o banco do **Service** (app de
> gestão de igrejas) no Supabase do ecossistema Campus. Leia este arquivo inteiro **antes**
> de rodar qualquer migration. As migrations SQL estão em `supabase/migrations/`.
>
> **Escopo: SÓ o Service.** O produto CE.X (loja de materiais) **não** entra agora. Mas a
> arquitetura já reserva o schema `cex` e os schemas compartilhados (`core`, `billing`,
> `audit`) para quando ele entrar — não recrie essa base depois.

---

## 0. Lei mãe: um Campus, um Supabase, produtos separados

Um único Supabase para todo o ecossistema Campus. Os produtos **nunca** se misturam no
banco. A separação é por **schema**:

| Schema | Guarda | Neste handoff |
|---|---|---|
| `core` | Compartilhado: usuários, organizações, papéis, permissões, acesso a produtos | **Implementar** |
| `service` | Produto Service: igrejas, pessoas, ministérios, eventos, escalas, jornada, colaboração | **Implementar (foco)** |
| `billing` | Planos, assinaturas, faturas, pagamentos, liberações comerciais | **Implementar** (é quem libera o Service) |
| `audit` | Logs, histórico de alterações, rastreabilidade | **Implementar** |
| `cex` | Produto CE.X (loja) | **Fora do escopo agora.** Reservado. |

Regras inegociáveis (valem para toda tabela nova, sempre):

1. **Nada de tabela de negócio no schema `public`.** Ele fica só para extensões/tipos.
2. **Não misture domínios.** Campo do Service não entra em tabela do CE.X e vice-versa.
   Exemplo já resolvido no desenho: *cursos*. `service.courses` são trilhas **internas** de
   discipulado (Novos Convertidos, Fundamentos); os cursos comerciais do CE.X seriam
   `cex.courses`. Regras de negócio diferentes ⇒ **tabelas diferentes**, nunca uma genérica.
3. **Compartilhou? Vai pro `core`** e os produtos se relacionam a partir dele (ex.: `user_id`,
   `organization_id`).
4. **Toda tabela nova precisa de:** schema certo · nome claro · FKs bem definidas · `created_at`
   · `updated_at` (quando fizer sentido) · **RLS habilitada** · políticas de acesso · índices
   necessários · migration versionada.
5. **Antes de criar** uma tabela, decida o schema e **justifique** (a §4 faz isso tabela a
   tabela). **Antes de alterar** uma tabela, confirme que ela pertence ao domínio certo.

Arquitetura desejada, em uma linha: **Mesmo Campus. Mesmo Supabase. Produtos separados.
Schemas separados. Permissões separadas. RLS obrigatória. Nada de misturar domínios.**

---

## 1. A marca vem da biblioteca — sempre

> Esta parte não é sobre o banco, é sobre **como o app que consome o banco é construído**.

Toda a interface do Service (site, admin, app do membro) se monta com a
**`cex-brand-library/`** — é o kit oficial: tokens de cor, CSS, `library.js` e a galeria viva
`index.html`. **Baseie-se nela para tudo**: tipografia, cor, componentes, marca.

- **Tipografia:** Inter (display + body); mono (JetBrains/SF Mono) só para metadados. **Não
  trocar** a fonte nem usar similar.
- **Logo:** `CE.X` sempre (`CE` peso 700 + `.X` em oliva peso 700, sem itálico).
- **Cor:** paleta quente, sem azul; oliva `#7A9E3F` ≤ 15% da peça. Tokens canônicos em
  `AGENTS.md` §2. Nada de hex fora da lista.
- **Marcas semióticas:** `◆ ◇ → §`; **zero travessão** (`—`/`–`) renderizado; sem emoji.
- **Regra de ouro:** se um componente **não existe** na `cex-brand-library/`, **pare e avise**
  para criá-lo no kit primeiro — não improvise CSS solto. (Ver `AGENTS.md` §0.5.)

Ou seja: o banco é este handoff; **a cara do produto é a biblioteca**. As duas coisas andam
juntas e nenhuma tela nova foge do kit.

---

## 2. Modelo de multi-tenant (o coração da separação de permissões)

O isolamento de dados é por **organização** (`core.organizations`) — o *tenant*.

- **`core.organizations`** = a conta. No Service, uma org é uma **rede de igreja** (o cliente
  que assina). Uma org pode ter **várias congregações** (`service.churches`: matriz + filiais).
- **`core.memberships`** liga `user ↔ organization` com um **papel** (`master`, `pastor`,
  `lider`, `vol`, …). É a espinha dorsal do RBAC **e** da RLS.
- **`core.product_access`** diz quais produtos a org pode usar. É `billing` quem liga/desliga
  (assinatura ativa ⇒ acesso `service` = true).

**Toda linha de negócio do Service carrega `organization_id`** (e, quando faz sentido,
`church_id`). Nenhuma linha "solta" sem dono. É isso que permite a RLS isolar tenants sem
join caro.

### Fluxo de acesso, do login à linha
```
auth.uid()  →  core.memberships (é membro? qual papel?)
            →  core.product_access (a org tem 'service' liberado?)
            →  service.<tabela> (a linha é da minha org?)  ⇒  vê/edita
```

---

## 3. RLS — como funciona (padrão único)

Os **helpers** vivem em `core` (migration `0001`), são `STABLE SECURITY DEFINER` e são a base
de toda policy:

- `core.orgs_for_current_user()` → orgs ativas do usuário.
- `core.is_member_of(org)` · `core.has_role(org, variadic roles)`.
- `core.has_product_access(org, 'service')`.
- `core.can_access(org, 'service')` = membro **E** produto liberado. **É a policy base do Service.**

Cada tabela do schema `service` recebe (via bloco `DO` em `0006`) a policy:

```sql
create policy svc_tenant on service.<tabela>
  for all to authenticated
  using      (core.can_access(organization_id, 'service'))
  with check (core.can_access(organization_id, 'service'));
```

Isso garante a **lei de isolamento** (tenant + produto). Refinos por papel (ex.: `lider` só
edita a escala do próprio time; `vol` só mexe onde é responsável) entram como **policies
adicionais** depois — a base já impede vazamento entre igrejas. O `service_role` (backend/Edge
Functions) ignora RLS, então webhooks e jobs escrevem sem fricção.

- **`billing`**: `authenticated` só **lê** o da própria org (faturas/pagamentos, só papéis de
  gestão). Escrita é do backend.
- **`audit`**: **append-only**; a escrita vem só do trigger `audit.log_change` (SECURITY
  DEFINER). Leitura só para gestão da própria org.

---

## 4. Tabelas do Service — em qual schema e **por quê**

O usuário pediu justificativa tabela a tabela. Resumo (SQL completo nas migrations `0005`/`0006`):

### Vai pro `core` (compartilhado — não é "do Service")
| Tabela | Por quê `core` |
|---|---|
| `core.users` | Identidade única de quem loga. O mesmo usuário serve no Service e (futuro) compra no CE.X. Nunca duplicar por produto. |
| `core.organizations` | O tenant/assinante. Raiz de isolamento de **todos** os produtos. |
| `core.memberships` | Papel do usuário na org. É autorização compartilhada, não regra de igreja. |
| `core.product_access` | Diz se a org tem Service. Compartilhado por definição. |
| `core.permissions` / `core.role_permissions` | Matriz papel→ação (o `MATRIZ_V2`). É **autorização** — infra compartilhada. As *ações* são `service.*`, mas a mecânica é do core. |

### Vai pro `service` (regra de igreja, só deste produto)
| Tabela | Por quê `service` |
|---|---|
| `churches` | Congregação (matriz/filial) — conceito exclusivo do Service. |
| `church_identity`, `cycles`, `history_entries`, `ministerial_titles` | Identidade/ciclos/história/títulos são conteúdo ministerial. Não existem no CE.X. |
| `people` | Voluntário (quem serve). `user_id` opcional liga ao login do core. |
| `members` | Membro da congregação (≠ voluntário). Domínio 100% igreja. |
| `fellowship_groups` | GCs/células. |
| `ministries`, `ministry_positions`, `person_ministries` | Times, funções e vínculos — estrutura ministerial. |
| `tags` | Frentes (Jovens/Kids/Casais). Lente de escala, específica do Service. |
| `events`, `event_schedule_items`, `setlist_songs` | Cultos, cronograma e repertório. |
| `roster_assignments` | Escala (quem serve, onde, status). |
| `visitors`, `visitor_notes` | CRM de visitante. |
| `announcements`, `wall_posts` | Comunicação interna. |
| `decisions`, `baptism_classes`, `baptism_candidates`, `timeline_events` | Jornada espiritual. |
| `courses`, `course_modules`, `course_lessons`, `enrollments` | **Trilhas internas** de discipulado. **Não** são os cursos comerciais do CE.X. |
| `prayer_requests` | Pedidos do app do membro. |
| `rooms`, `reservations` | Salas e reservas (com checagem de conflito na app). |
| `meetings`, `meeting_actions`, `rehearsals` | Reuniões, ações e ensaios. |
| `boards`, `cards`, `card_comments` | Kanban dos times. |
| `chats`, `chat_members`, `messages` | Conversas time/grupo/DM. |

### Vai pro `billing`
| Tabela | Por quê |
|---|---|
| `plans`, `subscriptions`, `invoices`, `payments` | Comercial. `subscriptions` ativa `core.product_access` por trigger. |
| `entitlements` | Liberação avulsa (futuro CE.X). Guarda só a chave do item + o direito, **sem** campos de catálogo — domínios separados. |

### Vai pro `audit`
| Tabela | Por quê |
|---|---|
| `activity_log` | Trilha genérica de alterações (quem/o quê/diff). Qualquer schema pendura o trigger. |

---

## 5. Ordem das migrations (rodar nesta sequência)

```
supabase/migrations/
  0001_foundation.sql          extensões, schemas, helpers de RLS, grants
  0002_core.sql                users, organizations, memberships, product_access, permissions
  0003_billing.sql             plans, subscriptions, invoices, payments, entitlements (+ sync p/ core)
  0004_audit.sql               activity_log + trigger genérico audit.log_change
  0005_service_foundation.sql  churches, people, members, ministries, groups, identidade, tags
  0006_service_operations.sql  eventos, escalas, visitantes, jornada, trilhas, salas, reuniões, kanban, chat + RLS de TODO o service
  0007_seed_service.sql        produto 'service', plano base, catálogo de permissões
```

Rodar: `supabase db push` (ou aplicar em ordem no SQL editor). Tudo é idempotente onde faz
sentido; as migrations de estrutura assumem banco limpo/versionado.

### Ligar auditoria numa tabela (opcional, por tabela)
```sql
create trigger t_audit
  after insert or update or delete on service.people
  for each row execute function audit.log_change('service');
```
Sugestão de cobertura inicial: `people`, `members`, `roster_assignments`, `decisions`,
`baptism_classes`, `role_permissions`. Amplie conforme a necessidade de rastreabilidade.

---

## 6. Como o protótipo mapeia no banco (guia de migração do `service_app/`)

Os `data*.js` do protótipo são estado em memória; viram tabelas assim (chaves → FKs):

- `CONGREGACOES` → `service.churches` (matriz = `is_headquarters`).
- `PESSOAS` → `service.people`; `MEMBROS` → `service.members` (`volId` → `members.volunteer_id`).
- `TIMES` → `service.ministries`; `funcoes[]` → `service.ministry_positions`; `PESSOAS.times/lider`
  → `service.person_ministries`.
- `CULTOS` → `service.events`; `cronograma[]` → `service.event_schedule_items`; `SETLISTS` →
  `service.setlist_songs`.
- `ESCALAS` (time→função→células) → `service.roster_assignments` (uma linha por pessoa/função/evento).
- `VISITANTES` (+`historico`) → `service.visitors` / `service.visitor_notes`.
- `DECISOES`/`BATISMOS`/`TIMELINE` → `service.decisions` / `baptism_classes`+`candidates` / `timeline_events`.
- `CURSOS`/`MATRICULAS` → `service.courses`(+`modules`/`lessons`) / `service.enrollments`.
- `GCS` → `service.fellowship_groups`; `SALAS`/`RESERVAS` → `service.rooms`/`reservations`.
- `REUNIOES`/`ENSAIOS` → `service.meetings`(+`actions`)/`rehearsals`; `BOARDS`/`CARDS` →
  `service.boards`/`cards`; `CHATS` → `service.chats`/`chat_members`/`messages`.
- `PAPEIS_V2`/`MATRIZ_V2`/`ACOES_V2` → `core.memberships.role` + `core.permissions` +
  `core.role_permissions` (semeados por org no cadastro; ver `0007`).
- Config da igreja (`ESCALA_CFG`, `GRUPOS_CFG`, `CONTATO_CFG`, presets, `IDENTIDADE`) →
  `service.churches.settings` (jsonb) + `service.church_identity`.

Convenção de nomes: identificadores em **inglês snake_case** (sem acento, sem palavra
reservada); os rótulos em português ficam na aplicação/`cex-brand-library`.

---

## 7. Checklist de implementação

- [ ] Rodar `0001`→`0007` em ordem; conferir os 5 schemas criados e `public` sem tabela de negócio.
- [ ] Ligar Supabase Auth → gatilho que insere `core.users` no signup (espelho de `auth.users`).
- [ ] Edge Function `bootstrap_church_org` (ver rodapé do `0007`): cria org + membership master
      + product_access + `role_permissions` da `MATRIZ_V2` + a igreja matriz.
- [ ] Webhook Hotmart/pagamento → `billing.subscriptions` (o trigger libera `core.product_access`).
- [ ] Confirmar RLS: um usuário de outra org **não** enxerga linhas do Service alheio (testar).
- [ ] Trocar o estado em memória do `service_app/` por chamadas ao Supabase (mesmas chaves da §6).
- [ ] Toda UI nova sai da `cex-brand-library/` (tipografia Inter, marca `CE.X`, paleta quente,
      zero travessão, `◆`). Faltou componente? Parar e avisar.
- [ ] Nenhum campo do CE.X entrou em tabela do Service. Nenhuma tabela de negócio no `public`.
```
