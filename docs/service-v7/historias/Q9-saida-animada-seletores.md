---
id: Q9
titulo: Avaliar biblioteca de seletores acessíveis
tipo: codigo
status: feita
quem: claude
desde: 2026-11-13
branch: historia/Q9-saida-animada-seletores
depende: []
tamanho: P
---

## Por quê
A saída animada de janelas, gavetas e folhas já foi feita (7eee976). Resta avaliar uma biblioteca acessível para os seletores.
Fonte: REVISAO-DESIGN.md; REVISAO-COMPONENTES.

## Arquivos (trilho)
- `docs/service-v7/historias/Q9-saida-animada-seletores.md`

## Pronto quando
- Biblioteca avaliada e decisão registrada (usar ou não), com justificativa.

## Notas
2026-11-13 (claude): feita, sem código novo (item de avaliação). Decisão: **não adotar biblioteca externa** para o seletor padrão (listbox de uma escolha).

Evidência: `app/service/ui/Selecao.tsx` (101 linhas) já é o seletor canônico (`Selecao`, usado por `SelectField`/`FField`), documentado em `BIBLIOTECA.md:56` ("CI barra `<select>`"), e já cobre exatamente o que a revisão de 20/10 (`REVISAO-COMPONENTES-VERCEL-2026-10-20.md:74`) apontava como incompleto: `role=listbox`/`option`, `aria-selected`/`aria-expanded`/`aria-haspopup`, navegação por Setas, Home/End, digitação pula pra opção (typeahead), Enter/clique escolhe, Esc fecha e devolve o foco ao gatilho (`usePopover.ts`), Tab fecha, grupos (equivalente a `optgroup`). Confirmado por `grep -rn "<select"` em `app/service`: zero ocorrências de `<select>` nativo restante.

Comparado com uma biblioteca (Radix UI Select, Headless UI Listbox, react-aria-components, downshift): nenhuma está instalada (`grep` no `package.json`, nenhuma ocorrência). Trocar agora significaria descartar uma implementação correta, testada e 100% integrada ao sistema de cores da igreja (tokens `--ink`/`--olive`/`color-mix()`, lei 13-17, i18n via `useTexto`) por uma dependência externa que, sendo headless, teria que ser restilizada do zero do mesmo jeito — sem ganho líquido, e com o risco de regressão numa peça que hoje passa na lei 17 e no CI (`check-service-componentes.ts`). Biblioteca externa só se justificaria para um padrão **novo e mais complexo** que o produto ainda não tem (ex.: seletor múltiplo com busca em lista grande), não para repor o que já funciona.

Achado fora do escopo desta avaliação, virou história nova: `app/service/modules/financeiro/Formularios.tsx` (`CampoPessoa`, busca de pessoa pelo nome) é um combobox próprio, à parte da `Selecao`/`usePopover`, sem navegação por teclado (só clique do mouse) e com `aria-selected={false}` fixo (nunca reflete a seleção real). Registrado como **Q20**.
