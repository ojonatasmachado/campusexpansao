---
id: Q20
titulo: Teclado e ARIA corretos na busca de pessoa do financeiro
tipo: codigo
status: reservada
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
