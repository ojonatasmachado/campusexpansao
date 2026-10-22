---
id: S-000
titulo: Verbo + objeto, curto
tipo: codigo            # codigo | decisao | verificacao | infra
status: livre           # livre | reservada | feita | bloqueada
quem:                   # claude | codex | nome da pessoa (preenchido ao reservar)
desde:                  # AAAA-MM-DD (ao reservar)
branch:                 # historia/S-000-slug (ao reservar)
depende: []             # ids que precisam estar feitos antes
tamanho: M              # P = horas · M = 1 dia · G = vários dias
---

## Por quê
Uma ou duas frases: o problema que a pessoa sente e de onde veio (fonte com arquivo:linha).

## Arquivos (trilho)
Só estes podem ser alterados. Precisa de outro? Acrescente aqui no commit de reserva ou num commit
só de documentação, depois de conferir que nenhuma história `reservada` lista o mesmo arquivo.
- `app/service/...`

## Pronto quando
- Critério verificável 1.
- Medida antes e depois com `scripts/medir-densidade.js` (telas) ou teste que passa (lógica).

## Notas
Decisões tomadas durante a execução, o que ficou de fora, o que foi para outra história.
