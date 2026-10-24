---
id: Q7
titulo: Medir e melhorar a carga do painel
tipo: codigo
status: feita
quem: codex
desde: 2026-10-24
branch: historia/Q7-carga-painel
depende: []
tamanho: M
---

## Por quê
A carga do painel nunca foi medida. Há suspeitas: áreas importadas estaticamente (nenhum dynamic ou lazy em app/service), uma cadeia de esperas antes do Promise.all em app/service/page.tsx:1271, leituras fora dele, mensagens sem paginação e payload do cliente por papel.
Fonte: REVISAO-COMPONENTES-VERCEL-2026-10-20.md "Achados verificáveis por arquivo".

## Arquivos (trilho)
- `app/service/page.tsx`
- `app/service/lib/server/carregar.ts`
- `scripts/check-local-panel-load.ts`
- `docs/service-v7/CARGA_PAINEL.md`

## Pronto quando
- Bytes e tempo medidos antes e depois.
- Só mexer nos pontos que a medição confirmar.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
O levantamento diz "não medi": medir antes de mexer. Tipo original: verificacao + codigo.

2026-10-24, Codex. Reserva conferida contra I10 do Claude, sem sobreposição. Depois da extração O3, as consultas estão em lib/server/carregar.ts. Trilho inclui esse arquivo e um medidor reproduzível com banco descartável, fixtures canônicas e volume. Primeiro medir SSR, bytes e consultas; qualquer mudança depende do resultado.

Concluída em 24/10/2026. Medidor reproduzível em scripts/check-local-panel-load.ts: banco descartável, migrações, fixtures e volume canônicos, build/start de produção, proxy local sem credenciais nos resultados, master/líder/membro, aquecimento e sete amostras por papel. Antes de alterar, o trace comprovou nove leituras independentes em sequência. Somente elas passaram a Promise.all depois da autorização e da leitura da igreja, preservando consultas, resultados e precedência dos erros.

Tempos totais medianos antes → depois: master 980,7 → 866,4 ms; líder 775,6 → 692,6 ms; membro 1065,7 → 857,1 ms. Janela das nove leituras: 263,2 → 147,6; 249,4 → 146,6; 435,3 → 235,2 ms. JS inicial idêntico, 2082467 bytes (592107 gzip), 72 chamadas por carga. HTML varia menos de 0,04% entre fixtures recriadas. As 48 cargas retornaram 200, sem erro de leitura/HTTP; ambos os projetos descartados. Método, tabelas e limites em CARGA_PAINEL.md; evidência local prints/q7-carga/{antes,depois}/resultado.json.

Verificado: typecheck, lint, leis 12/17, contraste, 13 contratos, diff check e dois builds de produção. Limites: SSR local, sem navegador, hidratação, aparelho, rede de produção ou histórico volumoso de mensagens. Os bytes gzip são estimados pelo medidor. Esta evidência não fundamenta paginação de mensagens ou mudanças no carregamento das telas. Nenhuma tela foi redesenhada.
