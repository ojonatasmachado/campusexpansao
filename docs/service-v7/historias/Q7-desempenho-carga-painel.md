---
id: Q7
titulo: Medir e melhorar a carga do painel
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
A carga do painel nunca foi medida. Há suspeitas: áreas importadas estaticamente (nenhum dynamic ou lazy em app/service), uma cadeia de esperas antes do Promise.all em app/service/page.tsx:1271, leituras fora dele, mensagens sem paginação e payload do cliente por papel.
Fonte: REVISAO-COMPONENTES-VERCEL-2026-10-20.md "Achados verificáveis por arquivo".

## Arquivos (trilho)
- `app/service/page.tsx`

## Pronto quando
- Bytes e tempo medidos antes e depois.
- Só mexer nos pontos que a medição confirmar.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
O levantamento diz "não medi": medir antes de mexer. Tipo original: verificacao + codigo.
