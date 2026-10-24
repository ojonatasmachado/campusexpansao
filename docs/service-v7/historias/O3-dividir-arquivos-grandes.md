---
id: O3
titulo: Dividir arquivos grandes restantes
tipo: codigo
status: reservada
quem: codex
desde: 2026-10-23
branch: historia/O3-arquivos-grandes
depende: []
tamanho: M
---

## Por quê
Restam três arquivos grandes: app/service/page.tsx (1665 linhas), painel/telas/Config.tsx (1392) e painel/telas/FichaPessoa.tsx (993). ServiceExactApp.tsx e MobileApp.tsx já foram divididos.
Fonte: memória "dividir arquivos gigantes" (desatualizada, ver Já feitos).

## Arquivos (trilho)
- `app/service/page.tsx`
- `app/service/painel/telas/Config.tsx`
- `app/service/painel/telas/FichaPessoa.tsx`

## Pronto quando
- Cada arquivo dividido, ou fechado sem mudança se não atrapalhar.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Só vale se atrapalhar. Tamanho M cada. Medir com wc -l antes de decidir.
