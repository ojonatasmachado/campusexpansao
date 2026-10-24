---
id: O3
titulo: Dividir arquivos grandes restantes
tipo: codigo
status: feita
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

2026-10-24, concluída a extração, sem alteração de comportamento ou consultas:

| Arquivo | Antes | Depois | Responsabilidade extraída |
|---|---|---|---|
| page.tsx | 1665 | 222 | DTOs em lib/server/tipos.ts, adaptação em adaptadores.ts, leitura/autorização em carregar.ts |
| painel/telas/Config.tsx | 1325 | 987 | AcessosCard, editores de etiqueta/congregação e constantes em telas/configuracao/ |
| painel/telas/FichaPessoa.tsx | 942 | 610 | Linha do tempo, visitante e três editores em telas/ficha/ |

Exportações anteriores preservadas por reexports explícitos. FichaPessoa importa AcessosCard diretamente da peça, sem depender do módulo completo de Config. Não há index/barrel novo. A comparação por AST confirmou 18 corpos de função, 64 definições de tipo e 6 constantes idênticos aos originais, sem perder ou duplicar declarações.

Verificado: typecheck, lint sem erros, leis 12/17, contraste, 13 contratos, diff check e build de produção com credenciais fictícias e endpoint local não utilizado. Os dois avisos de img em Config já existiam no original (conferidos com lint via stdin), sem novos avisos.

Limites: o smoke SSR autenticado local não executou casos. A API Docker do OrbStack parou de responder durante a inicialização do banco descartável; a tentativa própria foi interrompida, com descarte ainda dependente da recuperação do serviço. O reinício do OrbStack afeta os ambientes compartilhados e aguarda autorização. Nenhum ambiente compartilhado foi reiniciado ou resetado. O primeiro build, apontando para 54321 com chave fictícia, esperou a rede em /cursos; repetição em 59999 concluiu sem depender do serviço. Não foi feita comparação visual ou de desempenho, pois esta história mantém os corpos das peças e consultas; medição de carga é a Q7. Logs locais: /tmp/cex-O3-extracao.log, /tmp/cex-O3-tsc.log, /tmp/cex-O3-lint.log, /tmp/cex-O3-lint-base-config.log e /tmp/cex-O3-build-isolado.log.
