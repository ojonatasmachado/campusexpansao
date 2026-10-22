---
id: I4
titulo: Criar biblioteca de componentes do produto
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: G
---

## Por quê
Botão, campo, seletor, cartão, lista, cabeçalho e feedback ainda não estão reunidos num lugar só, e as telas repetem implementações. Os contratos de campo e seletor já têm Esc, aria e htmlFor, mas faltam as variantes e a galeria.
Fonte: REVISAO-COMPONENTES-VERCEL-2026-10-20.md "Proposta de biblioteca" e "Ordem de trabalho"; PROPOSTA-ADENDO-BRANDBOOK-SERVICE.md.

## Arquivos (trilho)
- `app/service/painel/campos.tsx`
- `app/service/painel/form/FormScreen.tsx`
- `app/service/painel/ui.tsx`
- `evolucoes/service_app/service-app.css`

## Pronto quando
- Variantes de cartão (resumo, item, ação) e hierarquia de botões documentadas.
- Galeria viva com os componentes reais.
- Tela de referência Pessoas usando a biblioteca.

## Notas
ABERTO, contratos de campo já parcialmente feitos (ver Já feitos: ServiceModal, campos.tsx com calendário e seletor com aria-expanded, Esc e setas).
A galeria viva é usada pelo D4.
