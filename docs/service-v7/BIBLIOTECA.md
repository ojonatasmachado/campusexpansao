# Biblioteca de componentes do Service

Referência visual: canvas "Service, direção visual" (claude.ai/artifact/JNpxaXTN3uVPmvdLCgcdMb), página Biblioteca, pranchas 1 a 6.
Inventário levantado em 2026-10-22 por busca no código; números são aproximados.

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
| Botão | `.btn*` (css 143), `.m6-btn`, `.m-btn-ok` | parcial | sem componente; ~366 usos inline; `.btn-ghost` definido 2x | 1 |
| Botão de ícone | classes soltas (`.drawer-close`, `.top-icon`...) | não | cada tela o seu | 1 |
| Selo | `.m6-st` (membro), `Chip` (painel/ui.tsx) | não | duas peças para o mesmo papel | 1, 6 |
| Chip/etiqueta | `Chip`, `.tag`, `.papel-tag` | parcial | usos misturados | 6 |
| Cartão | `.panel`, `.m6-card`, `.m-card` e +5 variantes | não | paddings e bordas próprios | 1 |
| Cartão da fila | contrato em `modules/fila.ts` e `define.ts`; markup em `membro/Inicio.tsx` | parcial | markup por tipo dentro de um switch | 6 |
| Linha de lista | `M6Row` (membro/comum.tsx), `.tr`, `.mini-row`, `.cfg-row` | parcial | duas famílias | 6 |
| Avatar | `Av` em painel/ui.tsx e membro/comum.tsx + cópias em CheckIn, CursoDrawer, AulaCheckin | parcial | 5 definições | 6 |
| Campo de texto | `.field`, `FField` (painel/campos.tsx) | parcial | ~273 `field-label` inline | 3 |
| Seleção | `SelectField` (1 uso) | não | 57 `<select>` nativos | 3 |
| Interruptor | `.sw`, `.m6-tg`, `.m-toggle`, `.acesso-tog-sw` | não | 4 implementações | 6 |
| Caixa de marcar | checkbox nativo + 6 classes | não | cada tela estiliza | 3 |
| Segmentado | `.seg` (~25 arquivos) | parcial | só CSS | 1, 6 |
| Data e hora | `DatePicker`, `TimePicker` (painel/campos.tsx) | parcial | `type="date"` nativo em vários formulários | 4 |
| Envio de foto/arquivo | `PhotoPicker`, `ImageUpload`, `ImageCropper` | parcial | `type="file"` direto em 3 telas | falta |
| Busca | `.tb-search` e +4 classes | parcial | sem componente | 6 |
| Abas | `.ck-tab`, `.cfg-tab`, `.tp-tab`, `.ob-tab-item` | não | 4 implementações | 5 |
| Barra de abas do app | `.m-tab` | parcial | ok | 1 |
| Menu lateral | `ServiceExactApp.tsx` (`.sb-*`) | sim | ok | 5 |
| Janela (modal) | `.modal*`, `ServiceModal`, `DialogosAcessiveis` | parcial | markup repetido em ~30 arquivos | 3 |
| Folha inferior | `M6Sheet` + `.m-sheet` | parcial | duas famílias de CSS | 1 |
| Aviso (toast) | `avisar()` + `.m6-toast` com Desfazer | parcial | dois sistemas; o do membro fora do `avisar()` | 6 |
| Vazio | `EmptyState` (painel/ui.tsx) | parcial | ~60 `.empty` inline | 6 |
| Carregando | nenhum | não | texto "Carregando..." em 10+ telas | 6 |
| Erro | `friendlyWriteError` (só texto) | não | sem componente | 6 |
| Ajuda "?" | `HelpDot` (HelpSystem.tsx) | sim | modelo a seguir | n/a |
| Tabela | `.tbl` | parcial | só painel | 3 |
| Indicador | `Kpi` (painel/comum.tsx) | parcial | `.kpi` duplicado com o admin | 2, 6 |
| Etapas/linha do tempo | `.tl`, `.jrn-tl`, `.m6-step`, `.pipe`, `LinhaDoTempo` | parcial | 4 estruturas | 1, 6 |
| Menu de opções | `MenuMais` + 4 menus próprios | parcial | 5 implementações | 4 |

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
