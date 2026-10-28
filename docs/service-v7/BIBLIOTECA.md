# Biblioteca de componentes do Service

Referência visual: canvas "Service, direção visual" (claude.ai/artifact/JNpxaXTN3uVPmvdLCgcdMb), página Biblioteca, pranchas 1 a 6.
Inventário levantado em 2026-10-22 por busca no código; números são aproximados.

## Como usar (lei 17)

Este arquivo é o índice único das peças de interface do Service. Vale para quem constrói tela nova e para quem mexe em tela velha:

1. Antes de escrever markup, procure a peça na tabela abaixo. Existindo, importe do caminho indicado.
2. Faltou uma variação? Acrescente uma prop ao componente existente, nunca uma cópia na tela.
3. Não existe? Peça nova nasce em `app/service/ui/`, com a ficha de entrada preenchida e uma linha na tabela.
4. Trocou uma peça antiga pelo componente? Atualize a linha da tabela (caminho, compartilhado, problema).
5. O visual das peças fica em `app/service/ui/biblioteca.css` (pranchas 1 e 6 aplicadas em 2026-10-22); mudar a aparência é mexer só ali.
6. Nenhuma tela escreve `<button>`: o ponto de partida é `Acao` (ou a peça específica). Peça já centralizada ganha uma regra em `scripts/check-service-componentes.ts`, que o CI roda: escrever a classe à mão volta a falhar.

## Como trocar (regra)

Nada de apagar e recolocar. A tela fica, a peça muda:

1. Tokens primeiro (cor, raio, sombra, movimento) no tema do Service.
2. Uma peça base por vez vira componente compartilhado e substitui as cópias.
3. O componente/classe antigo só é apagado quando nenhuma tela o importa.
4. Cada troca passa pela captura (`tools/captura-service/`) e pelo medidor de densidade.

## Inventário

Quase todo o CSS está em `evolucoes/service_app/service-app.css` (~4.000 linhas), com duas famílias paralelas: painel (`.btn`, `.modal`, `.drawer`, `.sw`, `.av`, `.chip`) e membro (`.m6-*`, `.m-*`).

| Peça | Onde hoje | Compartilhado | Problema | Prancha |
|---|---|---|---|---|
| Botão | `Botao` em `app/service/ui/Botao.tsx` (famílias toque, lista, entrada, mapa; variantes principal, secundario, discreto, perigo, texto; `botaoClasse()` para links) | sim | login, convite e senha incluídos (cores CE.X do AuthShell); família antiga `.m-btn` apagada | 1 |
| Movimento | `app/service/ui/movimento.ts` (mola, `entrarComDirecao`), `Contagem` em `app/service/ui/Contagem.tsx`, entrada e check em `biblioteca.css`; tudo desliga com movimento reduzido | sim | troca de tela no painel e nas abas do app; contagem no Kpi, Saúde e Financeiro | 1 |
| Clicável base | `Acao` em `app/service/ui/Acao.tsx`: todo `<button>` do Service passa por ela (type="button" padrão, desativado, carregando) | sim | linhas, cartões e células ainda usam `Acao` com classe da tela até ganharem peça própria | n/a |
| Botão de ícone | `BotaoIcone` em `app/service/ui/Botao.tsx` (`rotulo` obrigatório; aparência pela classe da tela, ex. `.drawer-close`) | sim | 32 telas trocadas; botões só de ícone sem `aria-label` ainda soltos | 1 |
| Selo | `Selo` em `app/service/ui/Selo.tsx` (tons ok, pendente, cuidado, neutro, aberto, rascunho, destaque; lista ou toque); `Chip` do painel usa ele | sim | dados antigos com classe viram tom por `tomDaClasse()` | 1, 6 |
| Chip/etiqueta | escolha: `Opcao estilo="seg-chip"`; etiqueta: `Etiqueta` em `app/service/ui/Selo.tsx` | sim | `.papel-tag` ainda solto | 6 |
| Cartão | `Cartao` em `app/service/ui/Cartao.tsx` (painel, app, app-solto; `plano`); clicável usa `cartaoClasse()` | sim | variantes próprias de módulo (+5) ainda por classe extra | 1 |
| Cartão da fila | contrato em `modules/fila.ts` e `define.ts`; markup em `membro/Inicio.tsx` | parcial | markup por tipo dentro de um switch | 6 |
| Linha de lista | `Linha` e `Lista` em `app/service/ui/Linha.tsx` (tabela, curta, config, app); `M6Row` usa `linhaClasse()` | sim | ok | 6 |
| Avatar | `Avatar` e `AvatarGrupo` em `app/service/ui/Avatar.tsx` (foto ou iniciais sobre tom quente fixo por pessoa; xs 24, sm 32, md 44, lg 64, xl 88; `eu`, `lider`, `presente`; grupo empilhado com +N em cascata); `Av` do painel e do app repassam para ele | sim | ok; CI barra `.av`, `.av-stack`, `.mp-av` e `function Av` à mão | 6 |
| Campo de texto | `Campo`, `Entrada`, `TextoLongo` em `app/service/ui/Campo.tsx`; `FField` usa por dentro | sim | campos só com placeholder (membro/Kids, Visitantes, CursoEditor) e estruturas próprias (R$, busca de pessoa, CEP) ainda soltos | 3 |
| Seleção | `Selecao` em `app/service/ui/Selecao.tsx` (vazio, desativada, grupos); `SelectField` usa por dentro | sim | ok; CI barra `<select>` | 3, 4 |
| Interruptor | `Interruptor` em `app/service/ui/Interruptor.tsx` (`.sw`, `.m6-tg`, `.m-toggle`; sempre `role="switch"` com nome falado) | sim | `.acesso-tog` é linha de permissão, usa `Opcao` | 6 |
| Caixa de marcar | `Marcar` em `app/service/ui/Campo.tsx` (caixa ou bolinha; `lado="direita"`) | sim | ok; CI barra checkbox e radio nativos | 3 |
| Segmentado | `Segmentado` em `app/service/ui/Segmentado.tsx` com `Opcao` dentro; pílula desliza com mola | sim | ok | 1, 6 |
| Data e hora | `SeletorData`, `SeletorHora` em `app/service/ui/Data.tsx`; `DatePicker`/`TimePicker` antigos no formulário genérico | sim | `datetime-local` em Mural, Rota e PublicPageEditor; CI barra date e time | 4 |
| Envio de foto/arquivo | `PhotoPicker`, `ImageUpload`, `ImageCropper` | parcial | `type="file"` direto em 3 telas | falta |
| Busca | `.tb-search` e +4 classes | parcial | sem componente | 6 |
| Abas | `Abas`, `PainelAba` em `app/service/ui/Abas.tsx` (sublinhado que desliza) | sim | barra de abas do membro (`.m-tab`) e prévias de tema ficam | 4, 5 |
| Barra de abas do app | `.m-tab` | parcial | ok | 1 |
| Gaveta | `Gaveta` em `app/service/ui/Janela.tsx`; `DrawerShell` usa por dentro | sim | ok | 5 |
| Barra de salvar | `BarraSalvar` em `app/service/ui/BarraSalvar.tsx` | sim | ok | 5 |
| Menu lateral | `ServiceExactApp.tsx` (`.sb-*`) | sim | ok | 5 |
| Janela (modal) | `Janela` em `app/service/ui/Janela.tsx` (vira folha no celular); `confirmar()` para risco | sim | ver PR do I8 para as que ficaram por estrutura própria | 3, 5 |
| Folha inferior | `Folha` em `app/service/ui/Janela.tsx`; `M6Sheet` usa por dentro | sim | ok | 1, 5 |
| Confirmação | `confirmar()` em `app/service/ui/confirmar.ts` (diálogo de risco) | sim | ok; CI barra `confirm()` | 3 |
| Aviso (toast) | `avisar()` em `app/service/lib/avisar.ts`, com Desfazer (`acao`); o app do membro usa o mesmo | sim | ok | 3, 6 |
| Vazio | `Vazio` em `app/service/ui/Estados.tsx`; `EmptyState` usa por dentro | sim | `.empty` com estilo próprio em Escalas e `mp-vazio` no mapa | 3 |
| Carregando | `Carregando` em `app/service/ui/Estados.tsx` (esqueleto: lista, linhas, cartões, indicadores; `telaInteira` com anel na entrada) | sim | entrada em `app/service/loading.tsx`; textos inline curtos ficam | 3 |
| Erro | `ErroEstado` em `app/service/ui/Estados.tsx`; `friendlyWriteError` dá o texto | parcial | telas ainda mostram erro de carga só como texto | 3 |
| Ajuda "?" | `HelpDot` (HelpSystem.tsx) | sim | modelo a seguir | n/a |
| Tabela | `Tabela` em `app/service/ui/Tabela.tsx` (colunas, linha que abre o detalhe, seleção com barra de ações em lote, linhas em sequência ao filtrar); referência: Pessoas | parcial | as outras `.tbl` (Aniversariantes, Secretaria, Financeiro, Formação, Kids, Visitantes, Reuniões) ainda à mão | 3 |
| Indicador | `Indicador` em `app/service/ui/Indicador.tsx` (rótulo, número que conta via Contagem, variação com Selo, minilinha SVG; estilos cartao e numero), `Minilinha` (tendência sem eixo); `Kpi` em painel/comum.tsx é wrapper fino | sim | ok; CI barra .kpi-value/.kpi-label/.kpi-foot fora de app/service/ui/ | 2, 6 |
| Gráficos | `Barras`, `Tendencia`, `Meta`, `Cobertura`, `Distribuicao` (funil), `EntradasSaidas`, `Frequencia`, `Progresso` em `app/service/ui/Graficos.tsx`; visual em biblioteca.css (.graf-*) | sim | SVG próprio, sem lib externa; cada gráfico tem role=img + aria-label; movimento reduzido desliga animações | 2 |
| Etapas/linha do tempo | `Etapas` em `app/service/ui/Etapas.tsx` (linha, app, faixa; feito, atual, futuro; data real em cada etapa feita) | sim | ok; CI barra `.tl`, `.jrn-tl`, `.m6-step`, `.imp-steps`. Ficam de fora por não serem etapas: `.pipe` (quadro de visitantes), `LinhaDoTempo` do mapa (série no tempo), `.crono-step` (roteiro editável do culto) | 1, 6 |
| Menu de opções | `MenuAcoes` em `app/service/ui/Menu.tsx`; `MenuMais` usa por dentro | sim | menu do usuário (TopUserMenu) é peça própria | 4 |

## Ordem sugerida de troca

1. Botão e botão de ícone (maior volume, base de tudo).
2. Selo + Chip unificados.
3. Interruptor (4 para 1) e Avatar (5 para 1).
4. Aviso: o toast do membro passa a usar `avisar()` com Desfazer.
5. Carregando e Erro (peças novas, sem nada a remover).
6. Janela e folha inferior (uma família só).
7. Abas, menu de opções, etapas.
8. Campos: seleção, data, caixa de marcar.

## Ficha de entrada de um componente novo

### Carregando (2026-10-24)

- Necessidade e lugar: informar que a entrada do painel ou do app do membro está buscando dados. O fallback de `/service` também cobre suas rotas filhas sem fallback próprio.
- Anatomia: anel decorativo e mensagem falada; propriedades `rotulo` e `telaInteira`. Sem ação ou moldura. Substituído automaticamente pelo conteúdo da rota, sem espera artificial.
- Estados: carregando; foco, toque, vazio, erro e Desfazer não se aplicam a esta peça de status.
- Tokens e tema: `--ink`, `--white`, `--sans`, `--fs-ui-15` e áreas seguras. Anel neutro para não antecipar a cor de uma igreja ainda desconhecida; herda o tema já aplicado durante navegação. Não consulta dados nem atrasa o fallback.
- Pior caso e densidade: mensagem quebra naturalmente em tela estreita; zero ações e quatro palavras na entrada, sem listas ou dependência da quantidade de dados.
- Acessibilidade e movimento: `role="status"`, região educada, anel oculto para leitor de tela; animação CSS desativada com movimento reduzido. Texto permanece visível.
- Vocabulário: mensagem operacional, sem termos renomeáveis ou contadores.
- Mercado: Material UI Progress e Carbon Loading oferecem indicador indeterminado para espera sem duração conhecida; adotado anel com texto, sem percentual inventado.
- Lugares: componente em `app/service/ui/Estados.tsx`, visual em `biblioteca.css`, inventário acima. Prancha 6: atualização visual pendente.
- Validação: TypeScript e lint; captura no navegador e matriz de temas pendentes por indisponibilidade do navegador/servidor local no ambiente.

Um componente só entra na biblioteca se a ficha estiver completa:

1. **Necessidade.** Aparece em 2 telas ou mais e nenhuma peça existente resolve com variação.
2. **Lugar e função.** Uma frase dizendo a que pergunta do lugar ele responde (lei 2).
3. **Anatomia.** Partes, até 3 variantes, propriedades.
4. **Estados.** Padrão, toque, foco, desativado, carregando, vazio, erro; resolvido com Desfazer quando couber.
5. **Tokens.** Cor só por variável; texto sobre a cor da igreja com `--accent-ink`; tamanhos da escala (app 13/15/17/20/28, painel 12/13/14/16/20/32); alvos 44 px no app e 32 px no painel.
6. **Tema.** Testado com 4 cores de igreja, modo claro e escuro.
7. **Pior caso.** Nome longo, 390 px, zero e muitos itens.
8. **Acessibilidade.** Elemento real (`button`, `label`), `aria-label` em ícone, contraste 4.5:1.
9. **Movimento.** Mola, contagem ou direção; respeita movimento reduzido.
10. **Vocabulário.** `termo()`, `plural()`, `avisar()`; nada fixo.
11. **Mercado.** Como 2 ou 3 ferramentas resolvem a mesma função (lei 16; material fora do git).
12. **Três lugares.** Um arquivo compartilhado no código, uma prancha no canvas e uma linha na tabela acima.
