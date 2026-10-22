---
id: I4
titulo: Biblioteca, bloco A (formulários e estados, prancha 3)
tipo: codigo
status: feita
quem: claude
desde: 2026-10-22
branch: historia/I4-biblioteca-formularios
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
- `app/service/ui/`, `app/service/demo/biblioteca/`, `scripts/check-service-componentes.ts`
- telas com `<select>`, data/hora, caixa de marcar, `confirm()`, vazio e carregando (troca mecânica; lista no PR)

## Pronto quando
- Variantes de cartão (resumo, item, ação) e hierarquia de botões documentadas.
- Galeria viva com os componentes reais.
- Tela de referência Pessoas usando a biblioteca.

## Notas
ABERTO, contratos de campo já parcialmente feitos (ver Já feitos: ServiceModal, campos.tsx com calendário e seletor com aria-expanded, Esc e setas).
A galeria viva é usada pelo D4.
- 2026-10-22 (claude): bloco A feito. Peças em app/service/ui (Campo, Entrada, TextoLongo, Marcar, Selecao, SeletorData, SeletorHora, Vazio, Carregando, ErroEstado, confirmar), visual da prancha 3 em biblioteca.css, galeria viva em /service/demo/biblioteca. Troca em 64 telas; CI barra <select>, date/time, checkbox/radio e confirm() nativos. Verificado: tsc, eslint, lei 12, build, galeria e Escalas no navegador (claro, escuro, outra cor, 375px). Não verificado: telas que dependem do banco (Financeiro, Secretaria), leitor de tela real.
- Ficou de fora: datetime-local (Mural, Rota, PublicPageEditor); campos sem rótulo visível só com placeholder (membro/Kids, Visitantes, CursoEditor); estruturas próprias (valor com R$, busca de pessoa, CEP, RichText). Tabela com seleção em lote e o resto das pranchas viram I8 a I10.
