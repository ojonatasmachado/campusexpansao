---
id: I2
titulo: Fazer ações do Início navegarem
tipo: codigo
status: feita
quem: codex
desde: 2026-11-11
branch: historia/I2-acoes-inicio-navegar
depende: []
tamanho: M
---

## Por quê
As linhas, indicadores e atalhos do Início precisam abrir a unidade que resolve o problema. Uma tela genérica obrigava a pessoa a procurar de novo o dado que iniciou a ação.

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/painel/telas/Visitantes.tsx`
- `app/service/painel/comum.tsx`
- `app/service/modules/pessoas/Pessoas.tsx`
- `app/service/ServiceExactApp.tsx`
- `app/service/modules/cuidado/`
- `docs/service-v7/historias/I2-acoes-inicio-navegar.md`
- `docs/service-v7/historias/screenshots/I2-*.png`

## Pronto quando
- Ações do Início revisadas por papel, módulo e dependência.
- Área indisponível não oferece botão, atalho nem resultado de busca.
- Nenhuma permissão ampliada.

## Inventário de ações
O destino abre por clique e usa estado/dados já carregados pela casca. Não foi acrescentada consulta ao banco nem permissão.

| Ação | Gestão (master) | Líder de time |
|---|---|---|
| Culto com vaga, até três primeiros | Abre o culto exato na gaveta Panorama. | Abre o culto exato no Panorama, limitado a `scopeMinistryIds`. |
| Ver todos os cultos com falta | Abre a gaveta; tocar uma linha abre o Panorama daquele culto. O título e rótulo usam `ct("{Cultos} com vaga aberta")`. | Só aparece se houver faltas nos times visíveis; abre a mesma gaveta filtrada. |
| Visitante sem contato há 48h | 1 resultado abre a ficha; 2 ou mais abrem Visitantes filtrada com aviso e Limpar filtro; sem resultado abre a lista com estado vazio. | Não aparece, pois o papel não vê Visitantes. |
| Visitante recebido pelo link | Mesma regra 1/2+/0. A contagem e o filtro usam a função comum `visitantePeloLink` em `painel/comum.tsx`. | Não aparece. |
| Pedido de mudança da Caminhada | Abre a folha com `visibleJourneyRequests`. | Só os pedidos já recebidos em `visibleJourneyRequests`, sem ampliar escopo. |
| Pedido de conta | Linha abre a lista de Novos cadastros. | Não aparece. |
| Pessoa sem registro de cuidado | Abre a gaveta de cuidado; selecionar abre a ficha exata. | Não aparece, como antes. |
| Criança sem check-in | Abre a gaveta de crianças sem check-in; selecionar abre a ficha associada. | Não aparece, como antes. |
| Saúde: membros registrados | Abre Membros no filtro de membros registrados. | Indicadores não são renderizados. |
| Saúde: Em grupos | Abre Membros filtrada para quem está em grupo. | Indicadores não são renderizados. |
| Saúde: Servindo em times | Abre Pessoas filtrada para quem serve. | Indicadores não são renderizados. |
| Preparação | Abre Configurações. “Revisar preparação” só aparece para gestão com acesso a configurar, Times, Cultos e Pessoas. | Não aparece sem permissão/configuração. |
| Busca: tela | Só oferece telas do menu autorizado; abre a tela dona. | Só oferece as telas disponíveis ao líder. |
| Busca: pessoa, membro, time ou função | Abre ficha da pessoa/membro; time/função abre a gaveta do time correspondente. | Usa só resultados visíveis no papel; time/função abre a equipe disponível. |

Avaliação de experiência e Pulso da escala abrem seus formulários em modal. Comece por aqui mantém as rotas de configuração existentes. Não há ação silenciosa com lista vazia: se a linha ficou desatualizada antes do clique, o destino abre a lista e informa o filtro sem resultados.

## Provas pela tela
Para comparar main e branch, quatro visitantes temporários foram criados na igreja de `master@teste.local`: dois sem contato e dois recebidos pelo link. Os dois Inícios mediram `__medir(24)` em **32 ações e 126 palavras**, frente ao limite **25/100**, fora por 7 ações e 26 palavras. A imagem do Início do branch era pixel a pixel igual à do main (mesmo MD5), pois a mudança só aparece após o clique; por isso a prova depois é a tela de destino aberta já filtrada, não uma cópia idêntica da tela inicial.

| Foto | O que mostra | __medir(24) | MD5 |
|---|---|---:|---|
| [Início main antes](screenshots/I2-qa-main-before.png) | Gestão com os mesmos quatro visitantes temporários e filas de culto | 32 ações, 126 palavras | `63cc2bafc8fd9fd008aafdd91f43baea` |
| [Visitantes sem contato](screenshots/I2-qa-visitantes-sem-contato-filtrado.png) | Dois registros, filtro visível e ação Limpar filtro | após clique | `a8f2b88157ae2c1cf980dac6cf1d1b87` |
| [Visitantes pelo link](screenshots/I2-qa-visitantes-link-filtrado.png) | Dois registros, filtro visível e ação Limpar filtro | após clique | `09b09ec6d19c2222efc281eb2a174e77` |
| [Único visitante sem contato](screenshots/I2-qa-visitante-sem-contato-unico-ficha.png) | Um resultado abre diretamente a ficha | após clique | `aede901a30acdf159e6557cf1145c3c5` |
| [Único visitante pelo link](screenshots/I2-qa-visitante-link-unico-ficha.png) | Um resultado abre diretamente a ficha | após clique | `256e695ca76f87c0286dd0807eb7e7eb` |
| [Saúde: membros](screenshots/I2-qa-saude-membros-filtrados.png) | Membros, filtro de membros registrados | após clique | `7a660ab58569699fc03c024668c230c4` |
| [Saúde: grupos](screenshots/I2-qa-saude-grupos-filtrados.png) | Membros, filtro de pessoas em grupo | após clique | `00317e22ef50b730c0515e56b55be0ff` |
| [Saúde: servindo](screenshots/I2-qa-saude-servindo-filtrado.png) | Pessoas, filtro de quem serve | após clique | `2e5d5d5e22cecc140843ab1822efa929` |

Fotos anteriores adicionais preservadas da entrega: `I2-antes-lider.png` (21 ações/73 palavras, MD5 `5f2011fe0125677f84c022735e8396b7`) e `I2-depois-lider-cultos-filtrados.png` (23 ações/98 palavras, MD5 `1e6dfd6d9865b097b61ac058562a9953`). A gaveta da Caminhada já abria a lista filtrada por `visibleJourneyRequests`; conferido em código e na tela de gestão/líder. O menu do líder não oferece Visitantes nem Configurações. Nenhuma permissão foi ampliada.

A limpeza das fixtures locais confirmou `deleted=4, remaining=0`. Nenhuma senha foi alterada e não houve `db reset`.

## Validação
- Nesta revisão: `npx tsc --noEmit -p .` e ESLint dos cinco arquivos de código passaram sem erros. `scripts/check-service-componentes.ts` e `scripts/check-service-lei12.ts` passaram. `scripts/check-theme-contrast.ts` não é pertinente ao diff da I2.
- As oito fotos listadas foram abertas e visualmente conferidas; as duas fotos únicas mostram ficha direta, as duas listas mostram filtro e opção para limpar, e os três indicadores abrem suas listas donas filtradas.
- A imagem duplicada `I2-qa-branch-after.png` foi descartada: MD5 igual ao main (`63cc2bafc8fd9fd008aafdd91f43baea`).

## Notas
I2 não altera PENDENTES. Reutiliza os dados já carregados, com estado de filtro na tela dona.
