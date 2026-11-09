---
id: E4
titulo: Implementar indisponibilidade por período e time
tipo: codigo
status: em andamento
quem: codex
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
- `app/service/modules/escalas/Escalas.tsx`
- `app/service/modules/escalas/disponibilidade.ts`
- `app/service/membro/Disponibilidade.tsx`
- `app/loja.css`
- `supabase/migrations/0104_service_indisponibilidade_periodo.sql`
- `docs/service-v7/producao.sql`
- `scripts/check-escala-periodo.ts`
- `docs/service-v7/historias/screenshots/E4-*.png`

## Pronto quando
- Pessoa marca dia inteiro, manhã, tarde, noite, e opcionalmente só para um time.
- "Só a noite" e "só o Louvor" são respeitados pelo rodízio e pelo Gerar período.
- Dados antigos não são reinterpretados silenciosamente.

## Decisão

### Formato do dado
Mesmo `people.availability` (jsonb). Chaves antigas continuam valendo exatamente como hoje:

| Chave | Significado |
|---|---|
| `d:AAAA-MM-DD` = false | Dia inteiro, todos os times (já existe) |
| `d:AAAA-MM-DD:manha` = false | Só manhã, todos os times |
| `d:AAAA-MM-DD:tarde` = false | Só tarde, todos os times |
| `d:AAAA-MM-DD:noite` = false | Só noite, todos os times |
| `d:AAAA-MM-DD:dia:<ministryId>` = false | Dia inteiro, só esse time |
| `d:AAAA-MM-DD:manha:<ministryId>` = false | Só manhã, só esse time |
| `d:AAAA-MM-DD:tarde:<ministryId>` = false | Só tarde, só esse time |
| `d:AAAA-MM-DD:noite:<ministryId>` = false | Só noite, só esse time |

**Período do culto:** derivado da hora (`event.time`). Antes de 12:00 → manhã; antes de 18:00 → tarde; depois → noite. Culto sem hora só responde às chaves de dia inteiro.

**Ausência de várias datas (de/até):** uma chave por data, no máximo 31 dias.

### indisponivel()
Recebe a hora e o id do time. `candidatos.ts` e `periodo.ts` passam os dois. Migração nova atualiza a função da 0053 para respeitar as chaves novas.

### Tela
"Avisar que vou faltar" abre folha com peças da BIBLIOTECA.md:
- Data e, se quiser, até
- Período: Dia inteiro | Manhã | Tarde | Noite
- Time: só se a pessoa serve em mais de um
- Botão principal "Avisar ausência"
- Link "Falar com o líder" (abre conversa como hoje)

Ao gravar: aviso com Desfazer + mensagem ao mesmo destinatário de hoje, com a ausência por extenso. Em "Quando posso servir", ausências futuras aparecem como linhas com "Remover".

### Lei 16
Planning Center Services: My Schedule reúne pedidos de escala, bloqueios de datas e contato com líderes. Na montagem, um aviso identifica pessoas com bloqueio. A E4 mantém registro de ausência e contato com o líder no mesmo ponto da Agenda. Sem segunda fonte verificada, fica só esta referência de escala de igreja.
- Fonte: [My Schedule](https://help.planningcenter.com/en/143027-my-schedule.html)
- Fonte: [Send blockout requests](https://help.planningcenter.com/en/142885-send-blockout-requests-for-predictable-scheduling.html)

## Notas
ABERTO, parcial: o bloqueio por data existe em people.availability, e as chaves fixas dom_m, dom_n e qua estão em app/service/membro/Agenda.tsx:338.
candidatos.ts (função indisponivel) e periodo.ts precisam ler o novo formato.
Migração nova também necessária em `swap_candidates` (0053), que lê `people.availability`.