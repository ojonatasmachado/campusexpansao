# app/service/ui

Componentes compartilhados de interface do Service (lei 17 em `AGENTS.md` §13).

- O índice de todas as peças, novas e antigas, com onde mora cada uma e o que falta trocar, é
  `docs/service-v7/BIBLIOTECA.md`. Comece por lá.
- Peça nova nasce aqui, com a ficha de entrada da BIBLIOTECA preenchida e uma linha na tabela.
- O visual das peças mora em `biblioteca.css` (canvas "Service, direção visual", pranchas 1 e 6),
  carregado depois de `service-app.css`; mudar a aparência de uma peça é mexer só ali.
  Cor só por variável, texto sobre a cor da igreja com `var(--accent-ink)`.
- Peça centralizada ganha regra em `scripts/check-service-componentes.ts` (roda no CI).

| Arquivo | Peças |
|---|---|
| `Acao.tsx` | `Acao`: base de todo clicável (todo `<button>` do Service passa por aqui) |
| `Botao.tsx` | `Botao` (principal, secundario, discreto, perigo, texto; toque, lista, entrada ou mapa; compacto, largo, carregando, desativado), `BotaoIcone` (`rotulo` obrigatório), `botaoClasse()` para links |
| `Interruptor.tsx` | `Interruptor` (liga/desliga; toque, lista, compacto; `rotulo` ou `rotuloId` obrigatório) |
| `Opcao.tsx` | `Opcao` (escolha marcada: segmento, chip e famílias de `OpcaoEstilo`) |
| `Selo.tsx` | `Selo` (estado), `Etiqueta` (papel ou grupo), `seloClasse()`, `tomDaClasse()` |
| `Cartao.tsx` | `Cartao` (painel, app, app-solto; plano), `cartaoClasse()` |
| `Linha.tsx` | `Linha` (tabela, curta, config, app), `Lista`, `linhaClasse()` |
| `Segmentado.tsx` | `Segmentado` (contêiner `.seg` com pílula que desliza até a `Opcao` marcada) |
| `Contagem.tsx` | `Contagem` (número sobe do zero ou do valor anterior; leitor de tela ouve o final) |
| `movimento.ts` | `MOLA`, `movimentoReduzido()`, `entrarComDirecao()` (troca de tela com direção) |
| `Campo.tsx` | `Campo` (rótulo em cima, ajuda ou erro embaixo, liga id/aria; `grupo` para chips), `Entrada`, `TextoLongo`, `Marcar` (caixa ou bolinha nativa) |
| `Selecao.tsx` | `Selecao` (caixa suspensa no lugar do `<select>`; `vazio`, opção desativada, teclado) |
| `Data.tsx` | `SeletorData` (calendário, valor "aaaa-mm-dd", grade de anos, dias com evento), `SeletorHora` (valor "hh:mm"), `dataCurta()` |
| `Estados.tsx` | `Vazio` (diz o que vai aparecer e o próximo passo), `Carregando` (esqueleto: lista, linhas, cartões, indicadores), `ErroEstado` (com Tentar de novo) |
| `confirmar.ts` | `confirmar()`: diálogo de risco no lugar de `window.confirm`, só para o que não dá para desfazer |
| `popover.ts` | `usePopover()`: fecha no clique fora e no Esc, devolve o foco ao gatilho |

Galeria viva com todas as peças e estados: `/service/demo/biblioteca` (aceita `?cor=`, `?modo=light`).
| `Janela.tsx` | `Janela` (cresce de 96%; no celular vira folha com alça), `Gaveta` (440/560 px, 0,45 s, arrastar pela borda no toque), `Folha` (app do membro, arrastar a alça) |
| `arrastar.ts` | `useArrastarParaFechar()`: segue o dedo, fecha no gesto rápido ou depois de 30%, resiste ao contrário |
| `Menu.tsx` | `MenuAcoes` (cresce do botão, a que apaga no fim em rosa; teclado e inicial; `soIcone` para três pontos) |
| `Abas.tsx` | `Abas` (sublinhado da igreja desliza; contador; teclado de abas), `PainelAba` |
| `indicador.ts` | `useIndicador()`: pílula do Segmentado e sublinhado das Abas |
| `BarraSalvar.tsx` | `BarraSalvar` (sobe quando há alteração, pergunta antes de sair da página) |
