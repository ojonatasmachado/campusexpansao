---
id: I8
titulo: Biblioteca, bloco B (janela, folha, gaveta, aviso, menus, abas)
tipo: codigo
status: feita
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
- 2026-10-22 (claude): feito. Peças em app/service/ui: Janela (vira folha no celular), Gaveta, Folha, arrastar para fechar, MenuAcoes, Abas (+PainelAba), BarraSalvar; avisar() com Desfazer e chave (o app do membro usa o mesmo). Movimento da prancha 5 em biblioteca.css. Troca em ~30 telas; CI barra modal-bg/drawer-bg/m6-scrim/save-bar e role=menu/tablist à mão (exceções marcadas com lei17-ok). Verificado: tsc, eslint, lei 12, build, galeria e telas da demo (Cultos, Configurações) em 1366 e 375. Revisor: 10 achados, todos corrigidos.
- Ficou de fora: busca global e central de notificações (funções novas, não peças); seletor de congregação; 9 superfícies próprias marcadas com lei17-ok (telas de resultado do check-in, prévia da arte, menu do usuário, ferramentas e formulário de ponto do mapa, Alterar escala, tamanho do texto). Larguras da prancha (gaveta 440/560) adiadas para não cortar telas; hoje 520/680. O aviso fica fora do foco preso das janelas (Desfazer pelo teclado com janela aberta).
