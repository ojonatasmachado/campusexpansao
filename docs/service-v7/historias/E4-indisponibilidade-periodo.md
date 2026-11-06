---
id: E4
titulo: Implementar indisponibilidade por período e time
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-06
branch: historia/E4-indisponibilidade-periodo
depende: [D1]
tamanho: M
---

## Por quê
Hoje a indisponibilidade marca só data (d:AAAA-MM-DD) ou dias fixos (dom_m, dom_n, qua). A pessoa não consegue marcar só a noite nem só um time, e o rodízio não respeita isso.
Fonte: MANIFESTO 2b.4; LEVEZA (parágrafo "O que o Voluts erra").

## Arquivos (trilho)
- `app/service/membro/Agenda.tsx`
- `app/service/modules/escalas/candidatos.ts`
- `app/service/modules/escalas/periodo.ts`

## Pronto quando
- Pessoa marca dia inteiro, manhã, tarde, noite, e opcionalmente só para um time.
- "Só a noite" e "só o Louvor" são respeitados pelo rodízio e pelo Gerar período.
- Dados antigos não são reinterpretados silenciosamente.

## Estado atual (lido no código)

### Formato do dado
`people.availability` é jsonb. Chaves existentes:
- `dom_m`, `dom_n`, `qua` → boolean (true = pode servir, false = não pode). Chaves fixas em `Agenda.tsx:401-405` (DISPONIBILIDADE).
- `d:AAAA-MM-DD` → false (data bloqueada). Usado em `candidatos.ts:23`.

### Quem lê
- `indisponivel()` em `candidatos.ts:19-25`: recebe `slot` (string | null) e `data` (string | null). Verifica `p.availability[slot] === false` ou `p.availability["d:" + data] === false`.
- `periodo.ts:297`: chama `indisponivel(pp, c.slot, c.data)` para gerar aviso "indisponivel" quando uma pessoa proposta está bloqueada.
- Migration `0053_service_destinatario_em_cadeia.sql:112`: consulta SQL direta `availability ->> slot <> 'false'` para filtro RLS.

### Origem do slot
`service.events.slot` (migration `0006_service_operations.sql:19`) é texto livre: `dom_m | dom_n | qua ...`. O GerarPeriodo (`GerarPeriodo.tsx:210`) copia `c.slot` do modelo de culto. O slot já codifica o período (manhã/noite) mas **não** diz qual time.

### Tela do membro
- Seção "Quando posso servir": `Agenda.tsx:400-430`. Três interruptores (dom_m, dom_n, qua). Sem opção de período parcial nem filtro por time.
- Botão "Avisar que vou faltar": `Agenda.tsx:139-143`. Abre chat com o líder, não marca ausência no banco. Não há folha dedicada.

## Lei 16: como apps de escala resolvem

### Planning Center Services
Voluntários marcam "blockout dates" pela web ou app móvel. O blockout é por **data inteira**; a granularidade por service time (manhã vs. noite) existe como **preferência de agendamento** no perfil, não como blockout parcial. O líder vê os blockouts ao criar a escala e o sistema avisa conflitos.
- Fonte: [My Schedule](https://help.planningcenter.com/en/143027-my-schedule.html) — voluntário define blockout dates e preferências de service time.
- Fonte: [Send blockout requests](https://help.planningcenter.com/en/142885-send-blockout-requests-for-predictable-scheduling.html) — líder solicita atualização de blockouts antes de escalar.
- Função: blockout por data + preferência por service time. Não há blockout por team específico.

### Zedmed (health scheduling)
Permite marcar um período como indisponível com data início/fim. A opção "Apply to all branches" aplica o bloqueio a todas as equipes/unidades de uma vez, sem granularidade por equipe individual.
- Fonte: [Mark a period as unavailable](https://zedmed.knowledgeowl.com/help/mark-a-period-as-unavailable) — workflow de blockout com start/end date e checkbox "all branches".
- Função: blockout por intervalo de datas, aplicado globalmente ou por branch. Sem filtro por role/time.

### Genesys Workforce Management
Relatório "Schedule Marked Time" lista ausências marcadas por agente, organizadas por **team**, com hora início/fim e duração. O voluntário marca o período; o sistema agrupa por team para o supervisor.
- Fonte: [Schedule Marked Time Report](https://docs.genesys.com/Documentation/WM/latest/SHelp/SchMrkTmRprt.html) — relatório de marked time por team com start/end/duration.
- Função: marcação por período com hora, agrupada por team. Granularidade maior que Planning Center.

### Resumo comparativo
| App | Período | Por time | Como |
|---|---|---|---|
| Planning Center | Data inteira + preferência por service time | Não | Blockout date + scheduling preference |
| Zedmed | Intervalo de datas | Sim (all branches) | Start/end date, apply to branches |
| Genesys WM | Hora início/fim | Sim (por team) | Marked time report agrupado por team |

Nenhum dos três permite "só a noite do domingo, só para o Louvor" como um único registro. Planning Center separa em duas dimensões (blockout + preferência). Zedmed e Genesys têm granularidade temporal mas não filtram por team na marcação do voluntário.

## Proposta

### a) Formato do dado

#### Opção 1: chaves compostas no mesmo jsonb
```json
{
  "dom_m": true,
  "dom_n": false,
  "qua": true,
  "d:2026-11-15": false,
  "p:dom_n:louvor": false,
  "p:2026-11-15:noite:suporte": false
}
```
- `p:<período>:<timeId>` → ausência parcial por período e time.
- `p:<data>:<slot>:<timeId>` → ausência em data específica, período e time.
- Chaves antigas (`dom_m`, `dom_n`, `qua`, `d:*`) continuam valendo exatamente como hoje. Nada é reinterpretado.
- **Prós:** sem migração, leitura backward-compatible, um único campo.
- **Contras:** chave composta é opaca para queries SQL; listar "todas as ausências do Louvor" exige scan de chaves.

#### Opção 2: tabela separada `service.people_unavailability`
```sql
create table service.people_unavailability (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references service.people(id),
  kind        text not null,  -- 'date' | 'slot' | 'slot_team'
  date        date,           -- para kind='date'
  slot        text,           -- para kind='slot' ou 'slot_team': dom_m/dom_n/qua/noite/manha/tarde
  team_id     uuid,           -- para kind='slot_team': references service.ministries(id)
  starts_at   timestamptz,    -- para intervalo futuro
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);
```
- **Prós:** queries eficientes, tipagem forte, fácil listar/filtrar.
- **Contras:** migração necessária, dois lugares para ler indisponibilidade (jsonb antigo + tabela nova), risco de inconsistência durante transição.

#### Migração
- **Opção 1:** zero migração. Chaves antigas seguem funcionando.
- **Opção 2:** migração obrigatória para copiar `d:*` e chaves fixas `false` para a tabela nova. Jsonb antigo fica read-only até remover.

### b) Rodízio e Gerar período com o formato novo

#### Assinatura nova de `indisponivel()`
```ts
export function indisponivel(
  p: PessoaEscala,
  slot: string | null | undefined,
  data?: string | null,
  timeId?: string | null   // ← novo parâmetro opcional
): boolean {
  // Regras antigas (backward-compatible)
  if (slot && p.availability?.[slot] === false) return true;
  if (data && p.availability?.[`d:${data}`] === false) return true;
  // Regras novas (Opção 1)
  if (slot && timeId && p.availability?.[`p:${slot}:${timeId}`] === false) return true;
  if (data && slot && timeId && p.availability?.[`p:${data}:${slot}:${timeId}`] === false) return true;
  return false;
}
```

#### O que muda em `periodo.ts`
- Linha 297: passar `time.id` como quarto argumento: `indisponivel(pp, c.slot, c.data, time.id)`.
- Linha 208 (`candidatosDisponiveis`): passar `time.id` no objeto `event`: `{ slot: c.slot, eventDate: c.data, timeId: time.id }`.
- Em `candidatos.ts:67`: extrair `event.timeId` e passar para `indisponivel()`.

#### Migration `0053` (RLS)
A query SQL `availability ->> slot <> 'false'` continua funcionando para chaves antigas. Para chaves novas (`p:*`), adicionar condição OR:
```sql
and coalesce(p.availability ->> coalesce(v_slot, ''), 'true') <> 'false'
and not exists (
  select 1 from jsonb_each(p.availability) kv
  where kv.key like 'p:' || coalesce(v_slot, '') || ':%'
  and kv.value = 'false'
)
```

### c) Tela: marcar "só a noite" e "só o Louvor"

Hoje o botão "Avisar que vou faltar" abre um chat. A proposta cria uma **folha dedicada** (Drawer/Sheet) acessível pelo mesmo botão, com o chat como opção secundária ("Falar com o líder").

**Passo a passo na folha "Avisar que vou faltar":**
1. Abrir folha → título "Vou faltar", subtítulo "Escolha quando e para quem".
2. Seletor de período: chips "Dia inteiro" | "Manhã" | "Tarde" | "Noite". Padrão: "Dia inteiro". (4 ações)
3. Seletor de time: lista de times da pessoa com checkboxes. Padrão: todos selecionados. Se só um time, não mostra seletor. (até 3 ações visíveis na dobra)
4. Seletor de data: calendário compacto ou "Próximos 4 domingos". (1 ação)
5. Botão "Confirmar ausência" (cheio, cor da igreja). (1 ação)
6. Link "Falar com o líder" (texto, abaixo do botão). (1 ação)

**Total na dobra:** 4 (período) + 3 (times) + 1 (data) + 1 (confirmar) + 1 (falar) = **10 ações**. Dentro do limite de 12 ações / 80 palavras (lei 13, app 390×844).

**Fluxo "só a noite, só o Louvor":**
1. Tocar "Avisar que vou faltar" → folha abre.
2. Tocar chip "Noite".
3. Desmarcar todos os times exceto "Louvor".
4. Escolher a data (ex.: próximo domingo).
5. Tocar "Confirmar ausência".
6. Sistema grava `p:dom_n:louvor-id: false` (ou equivalente na Opção 2).

### d) Pior caso

**Cenário:** Maria serve em 3 times (Louvor, Suporte, Kids). Marca ausência de 2 semanas, culto de manhã e de noite no mesmo domingo.

**Com Opção 1 (chaves compostas):**
- Ausência de 2 semanas × 2 slots × 3 times = 12 chaves no jsonb.
- Exemplo: `p:2026-11-15:dom_m:louvor`, `p:2026-11-15:dom_m:suporte`, `p:2026-11-15:dom_m:kids`, `p:2026-11-15:dom_n:louvor`, ... (12 entradas).
- Leitura: `indisponivel()` verifica 3 chaves por chamada (slot, slot+time, data+slot+time). Custo constante.
- Se marcar "dia inteiro" para todos os times: 2 chaves (`d:2026-11-15` e `d:2026-11-22`), cobre tudo. Backward-compatible.

**Com Opção 2 (tabela separada):**
- 12 linhas na tabela `people_unavailability`.
- Query com índice `(person_id, date, slot, team_id)`. Custo log(n).
- Mais limpo para listar/editar, mas exige JOIN ou query extra no rodízio.

**Edge case tratado:** culto de manhã e noite no mesmo dia. O slot diferencia (`dom_m` vs `dom_n`). A pessoa pode marcar só a noite e servir de manhã normalmente. O rodízio chama `indisponivel(p, "dom_m", "2026-11-15", timeId)` e `indisponivel(p, "dom_n", "2026-11-15", timeId)` separadamente.

## Recomendação

**Opção 1 (chaves compostas).** Zero migração, backward-compatible, custo de leitura constante e dentro do padrão jsonb existente. A opacidade das chaves é aceitável porque a lista de ausências é sempre por pessoa (não por time), e a tela do membro já lê o jsonb inteiro. A Opção 2 é mais limpa estruturalmente mas custa uma migração arriscada e dois pontos de leitura durante a transição.

## Notas
ABERTO, parcial: o bloqueio por data existe em people.availability, e as chaves fixas dom_m, dom_n e qua estão em app/service/membro/Agenda.tsx:338.
candidatos.ts (função indisponivel) e periodo.ts precisam ler o novo formato.
Migração só se sair de people.availability (jsonb).