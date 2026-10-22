# app/service/ui

Componentes compartilhados de interface do Service (lei 17 em `AGENTS.md` §13).

- O índice de todas as peças, novas e antigas, com onde mora cada uma e o que falta trocar, é
  `docs/service-v7/BIBLIOTECA.md`. Comece por lá.
- Peça nova nasce aqui, com a ficha de entrada da BIBLIOTECA preenchida e uma linha na tabela.
- Os componentes usam as classes que já existem em `evolucoes/service_app/service-app.css`;
  cor só por variável, texto sobre a cor da igreja com `var(--accent-ink)`.
- Peça centralizada ganha regra em `scripts/check-service-componentes.ts` (roda no CI).

| Arquivo | Peças |
|---|---|
| `Acao.tsx` | `Acao`: base de todo clicável (todo `<button>` do Service passa por aqui) |
| `Botao.tsx` | `Botao` (principal, secundario, discreto, perigo, texto; toque, lista, entrada ou mapa; compacto, largo, carregando, desativado), `BotaoIcone` (`rotulo` obrigatório), `botaoClasse()` para links |
| `Interruptor.tsx` | `Interruptor` (liga/desliga; toque, lista, compacto; `rotulo` ou `rotuloId` obrigatório) |
| `Opcao.tsx` | `Opcao` (escolha marcada: segmento, chip e famílias de `OpcaoEstilo`) |
