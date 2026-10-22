---
id: Q10
titulo: Mover FieldDef e FField para painel form
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: P
---

## Por quê
FieldDef está em painel/tipos.ts:700 e FField está em painel/campos.tsx. Os dois deveriam estar em painel/form/. Ainda não foi feito.
Fonte: PLANO_TELA_FORMULARIO.md onda 1 ("Ainda não feito").

## Arquivos (trilho)
- `app/service/painel/tipos.ts`
- `app/service/painel/campos.tsx`
- `app/service/painel/form/`

## Pronto quando
- FieldDef e FField passam a viver em painel/form/ e são importados de lá.

## Notas
ABERTO.
