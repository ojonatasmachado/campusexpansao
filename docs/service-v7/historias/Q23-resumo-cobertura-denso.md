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

Com 1 ou 2 times incompletos, o texto fica idêntico ao de antes (mesmo formato por time,
`join(" · ")`); só o caso de 3+ times, que era o quebrado, passa a agregar.

## Varredura do mesmo padrão
O usuário suspeitou (e pediu explicitamente) que a mesma causa ("concatenação sem limite de
uma lista que pode crescer") apareça em outras telas densas. Busquei todo `.map(...).join(" · "
)`/`.join(", ")` em `app/service` e revisei cada ocorrência. A maioria é segura (lista
estruturalmente pequena pela regra de negócio, ou já tem corte antes do join, ou é texto de
exportação/CSV/log interno, não tela densa). Três eram o mesmo bug real:

- `app/service/painel/telas/Agenda.tsx` (painel › Agenda, grade da semana): `mini-sub` do
  cartão de evento listava todos os ministérios escalados, sem limite.
- `app/service/painel/telas/Inicio.tsx` (painel › busca global): o subtítulo de um resultado de
  "Função" listava todos os times com aquela função, sem limite (o `.slice(0,6)` existente só
  limitava o nº de funções, não o nº de times por função).
- `app/service/modules/escalas/EscalaExtra.tsx` (criar escala extra, lista "Times que servem"):
  a linha secundária de cada time listava todas as suas posições, sem limite.

Também achei que o projeto **já tinha** o padrão certo em `CartaoDoTime.tsx` (cartão de
aniversário): "A e B" até 2 nomes, "A, B e mais N" a partir de 3, com chaves de tradução já
existentes (`pt-BR.json`: `m1dc81ff`, `modiem`). Extraí esse padrão para um helper compartilhado
(`app/service/lib/lista.ts`, `listaResumida`), apliquei nos três pontos acima e no próprio
`CartaoDoTime.tsx` (removendo a duplicação), seguindo a lei de módulos centrais / "não copie o
mesmo bloco em dois arquivos". `pendencias.ts` não usa esse helper porque não passa por
`traduzirUi` hoje (função pura de dados, chamada fora de componente; i18n do Service está
desligado em produção, então o texto solto em pt-BR já era o comportamento existente ali).

## Arquivos (trilho)
- `docs/service-v7/historias/Q23-resumo-cobertura-denso.md`
- `app/service/modules/escalas/pendencias.ts`
- `app/service/lib/lista.ts` (novo)
- `app/service/modules/aniversarios/CartaoDoTime.tsx`
- `app/service/painel/telas/Agenda.tsx`
- `app/service/painel/telas/Inicio.tsx`
- `app/service/modules/escalas/EscalaExtra.tsx`
- `scripts/check-service-cobertura.ts`

## Pronto quando
- `resumo` de cobertura nunca concatena mais de 2 nomes de time crus; acima disso, agrega em
  "e mais N times".
- Os três outros pontos achados na varredura (Agenda, busca do Início, EscalaExtra) usam o
  mesmo corte.
- `scripts/validar.sh` completo: TUDO PASSOU.

## Notas
2026-11-13 (claude): feita. Causa raiz encontrada por leitura de código a partir do print
enviado pelo usuário (números batem: 8 times, 29 vagas no total, igual ao print). Varredura
pedida pelo usuário ("tem vários outros") feita por busca de padrão + triagem de cada
ocorrência; achados reais corrigidos com o mesmo helper, achados seguros ficaram documentados
acima sem mudança de código.
