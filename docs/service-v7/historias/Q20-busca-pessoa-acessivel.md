---
id: Q20
titulo: Teclado e ARIA corretos na busca de pessoa do financeiro
tipo: codigo
status: feita
quem: claude
desde: 2026-11-13
branch: historia/Q20-busca-pessoa-acessivel
depende: []
tamanho: P
---

## Por quê
Achado durante a Q9 (avaliação de seletores acessíveis): `CampoPessoa` em
`app/service/modules/financeiro/Formularios.tsx` é um combobox de busca por
nome (escolher quem fez ou recebeu um lançamento) construído à parte da
`Selecao`/`usePopover` que o resto do Service usa. Só funciona no mouse: sem
Setas para navegar os resultados, sem Enter para escolher, sem Esc para
fechar, e `aria-selected={false}` fixo (nunca reflete a pessoa já escolhida).
Fonte: `app/service/modules/financeiro/Formularios.tsx:44` (revisão Q9, 13/11).

## Arquivos (trilho)
- `app/service/modules/financeiro/Formularios.tsx`
- `docs/service-v7/historias/Q20-busca-pessoa-acessivel.md`

## Pronto quando
- Com o campo em foco, Setas para baixo/cima movem entre os resultados da busca sem tirar o foco do campo de texto.
- Enter escolhe o resultado em foco; Esc fecha a lista e mantém o texto digitado.
- `aria-selected` do resultado em foco é `true`, dos demais `false` (hoje é sempre `false`).
- Comportamento igual nos dois formulários que usam `CampoPessoa` (lançamento e transferência, conferir no código).
- Teste pela tela: digitar parte de um nome, descer com Seta, confirmar com Enter, conferir que o campo fecha com a pessoa certa; Esc fecha sem escolher.

## Notas
2026-11-13 (claude): feita. `CampoPessoa` ganhou navegação por teclado sem tirar o foco do campo de texto: Setas movem um destaque entre os até 8 resultados (`aria-activedescendant` + `aria-selected`/realce visual via `Opcao`), Enter escolhe o destacado, Esc fecha a lista mantendo o texto digitado. Usado nos 3 campos do arquivo (Contribuinte, Contou, Conferiu), inclusive o par `excluir` cruzado entre Contou/Conferiu.

Revisado pelo subagente `revisor`; achou 3 problemas reais, corrigidos antes do commit:
1. O teclado reagia mesmo com a lista fora da tela (ela só aparece com busca digitada), então Enter num campo recém-focado e vazio escolhia a primeira pessoa às cegas, e Esc era engolido em vez de fechar a tela por cima (`FormScreen` ignora `Escape` com `defaultPrevented`). Corrigido com uma flag `visivel` (aberto + texto + lista não vazia) usada no guard do teclado, no `aria-expanded` e no `aria-activedescendant`.
2. As Setas partiam do índice cru em vez do já limitado ao tamanho da lista; se a lista encolhesse sem digitação (o campo pareado mudando `excluir`), sobravam toques "mortos" até o destaque voltar a se mover. Corrigido.
3. Depois de Esc, Seta para baixo não reabria a lista (só digitar). Corrigido: reabre se já há texto digitado.

Teste: `scripts/validar.sh` completo (build incluso) duas vezes (antes e depois das correções): TUDO PASSOU. Não verificado em aparelho real nem leitor de tela (fora do que esta sessão consegue fazer); o contrato ARIA (`role=combobox`/`listbox`/`option`, `aria-activedescendant`, `aria-selected`) segue o mesmo padrão já usado e testado em `Selecao`/`usePopover`.