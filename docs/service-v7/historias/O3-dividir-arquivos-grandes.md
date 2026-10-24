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
- `app/service/lib/server/`
- `app/service/painel/telas/configuracao/`
- `app/service/painel/telas/ficha/`

## Pronto quando
- Cada arquivo dividido, ou fechado sem mudança se não atrapalhar.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Só vale se atrapalhar. Tamanho M cada. Medir com wc -l antes de decidir.

2026-10-23, Codex. Medição inicial: page.tsx 1665, Config.tsx 1325 e FichaPessoa.tsx 942 linhas. Há fronteiras de responsabilidade reais: contrato/adaptação/leitura/render no servidor; cartões e editores de configuração independentes (AcessosCard usado pela ficha); editores e visitante misturados ao despachante de fichas. Extração preservará corpos e exportações, sem redesenhar tela ou mudar consultas. Prefixos novos conferidos contra as reservas, sem sobreposição com I10 do Claude.
