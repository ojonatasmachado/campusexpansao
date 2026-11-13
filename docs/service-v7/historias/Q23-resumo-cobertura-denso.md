---
id: Q23
titulo: Resumo de cobertura sem limite vira parede de texto no Início
tipo: codigo
status: feita
quem: claude
desde: 2026-11-13
branch: historia/Q23-resumo-cobertura-denso
depende: []
tamanho: P
---

## Por quê
O usuário testou o app real e mandou um print do painel Início: o card "Para resolver" mostrava
uma linha de texto corrido, ilegível, listando a falta de vaga de 8 times seguidos (29 vagas no
total). Viola a lei 13 (densidade medida) e a lei 2 (uma pergunta por lugar: o card devia
responder "o que preciso resolver", não listar tudo).

## Causa raiz
`app/service/modules/escalas/pendencias.ts`, função `pendenciasDeCobertura`. Para cada evento
futuro com falta de vaga, o campo `resumo` era montado assim:

```ts
resumo: faltas.map((t) => `${plural(t.total - t.preenchidas, "vaga")} em ${t.time}`).join(" · ")
```

`faltas` é a lista de times com vaga aberta naquele culto (vem de `coberturaPorTime`, em
`cobertura.ts`). Nota para quem ler este código depois: aqui `t.time` é o **nome do time**
(ex. "Diaconia", "Louvor"), não um horário. Sem nenhum limite, `.join(" · ")` concatenava TODOS
os times com falta, um por um. Igreja com 8 times com vaga em aberto = 8 segmentos "N vaga(s)
em X" grudados com " · ", exatamente o que apareceu no print do usuário.

Esse `resumo` é consumido em dois lugares do painel (`painel/telas/Inicio.tsx`): no card
"Para resolver" da fila (linha ~ onde monta `filas`) e na gaveta de cobertura aberta
(`coberturaAberta`, usada como `mini-sub`). Corrigir na fonte (`pendencias.ts`) resolve os dois
sem tocar em `Inicio.tsx`, que já está no trilho da história N2 (fatia 3, já entregue).

## Fix
Limitar a 2 nomes de time no resumo, com total agregado de vagas e um "e mais N times" quando
sobrar. Exemplo real do print: de `"2 vagas em Ação social · 3 vagas em Diaconia · 4 vagas em
Intercessão · ..."` (parede de 8 segmentos) para `"29 vagas em Ação social, Diaconia e mais 6
times"`.

```ts
const totalFaltam = faltas.reduce((soma, t) => soma + (t.total - t.preenchidas), 0);
const LIMITE_TIMES = 2;
const nomes = faltas.slice(0, LIMITE_TIMES).map((t) => t.time).join(", ");
const extras = faltas.length - LIMITE_TIMES;
const resumo = extras > 0
  ? `${plural(totalFaltam, "vaga")} em ${nomes} e mais ${plural(extras, "time")}`
  : `${plural(totalFaltam, "vaga")} em ${nomes}`;
```

Com 1 ou 2 times incompletos, o texto fica igual ao de antes (sem o "e mais"), só muda o caso
de 3+ times, que era o caso quebrado.

## Arquivos (trilho)
- `docs/service-v7/historias/Q23-resumo-cobertura-denso.md`
- `app/service/modules/escalas/pendencias.ts`

## Pronto quando
- `resumo` nunca concatena mais de 2 nomes de time crus; acima disso, agrega em "e mais N times".
- `scripts/validar.sh` completo: TUDO PASSOU.

## Notas
2026-11-13 (claude): feita. Causa raiz encontrada por leitura de código a partir do print
enviado pelo usuário (números batem: 8 times, 29 vagas no total, igual ao print). Fix aplicado
só em `pendencias.ts`; `Inicio.tsx` e a gaveta de cobertura não precisaram mudar porque só
consomem o campo `resumo` já pronto.
