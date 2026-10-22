---
id: I8
titulo: Biblioteca, bloco B (janela, folha, gaveta, aviso, menus, abas)
tipo: codigo
status: reservada
quem: claude
desde: 2026-10-22
branch: historia/I8-biblioteca-estrutura
depende: [I4]
tamanho: G
---

## Por quê
Janela, folha inferior e gaveta têm markup repetido em ~30 arquivos e duas famílias de CSS; o aviso do membro não passa pelo avisar(); menu de ações tem 5 implementações e abas 4.
Fonte: canvas "Service, direção visual" (claude.ai/artifact/JNpxaXTN3uVPmvdLCgcdMb), prancha 5 e menus da prancha 4; docs/service-v7/BIBLIOTECA.md.

## Arquivos (trilho)
- `app/service/ui/`
- `app/service/lib/avisar.ts`
- telas com `.modal`, `.drawer`, `.m6-sheet`, `MenuMais`, abas (lista na BIBLIOTECA.md)

## Pronto quando
- Uma família de janela/folha/gaveta (Janela, Folha, Gaveta) usada em todas as telas.
- Aviso com Desfazer só por avisar().
- Menu de ações e Abas como peças; barra "Salvar só quando muda".
- Regras no CI.

## Notas
Mesmo método do I4: peça em app/service/ui, visual em biblioteca.css, galeria em /service/demo/biblioteca, troca tela a tela, regra no scripts/check-service-componentes.ts.
