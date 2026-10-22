---
id: E4
titulo: Implementar indisponibilidade por período e time
tipo: codigo
status: livre
quem:
desde:
branch:
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

## Notas
ABERTO, parcial: o bloqueio por data existe em people.availability, e as chaves fixas dom_m, dom_n e qua estão em app/service/membro/Agenda.tsx:338.
candidatos.ts (função indisponivel) e periodo.ts precisam ler o novo formato.
Migração só se sair de people.availability (jsonb).
