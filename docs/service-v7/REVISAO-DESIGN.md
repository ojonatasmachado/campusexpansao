# Revisão de design do Service (outubro de 2026)

Passagem para continuar fora da nuvem. Tudo está no branch `claude/dazzling-hopper-stt21v`,
no pull request https://github.com/ojonatasmachado/campusexpansao/pull/3. Nada foi para o `main` ainda.

## Para publicar

1. No Claude Desktop (ou no GitHub), faça o merge do PR 3 no `main`. Não há conflito: o `main`
   não andou desde o início do branch.
2. A Vercel publica sozinha depois do merge.
3. Na sua máquina: `git checkout main && git pull`.

Não há migração de banco nesta revisão: só código do Service e CSS.

## O que já foi verificado

- `npx tsc --noEmit`, `npm run build`
- `npx tsx scripts/check-service-lei12.ts`: nada piorou; base regravada mais baixa
  (emoji 14 para 5, travessão 1 para 0, hex fixo 6 para 2)
- `npx tsx scripts/check-theme-contrast.ts`
- Lint dos arquivos mexidos: 46 problemas contra 47 no `main` (os 23 erros já existiam)
- Navegador automático no `/service/demo` em 1440, 2560, 720 (zoom 200%), 390 e 320 px,
  tema escuro e claro, sem erro de console

Conferido depois do merge (navegador automático, 390px): as folhas do app do membro (Nova
mensagem, Tamanho do texto) recebem o foco, prendem o Tab, fecham no Esc e devolvem o foco; no
quadro de tarefas do painel, tocar no cartão abre a gaveta com as colunas, então mover cartão
funciona no celular mesmo sem arrastar.

## O que conferir num celular de verdade

Nada disso aparece em emulação:

- [ ] Tocar em botões: sem flash cinza, botão encolhe de leve ao apertar
- [ ] Hover não fica "preso" depois de tocar num card ou linha
- [ ] Tocar na busca do topo e em campos sem zoom da página (iOS)
- [ ] Folha de baixo do app (Mensagens, Nova mensagem): arrastar a alça para baixo fecha;
      arrastar devagar e soltar volta; puxar para cima resiste
- [ ] Barra de status do celular na cor do fundo, no tema escuro e no claro
- [ ] App instalado (PWA): puxar no topo não recarrega a página
- [ ] Ajustes do sistema: "reduzir movimento", "reduzir transparência" e "aumentar contraste"

## O que mudou, por rodada

| Commit | Rodada |
| --- | --- |
| 46f9e4c | Revisão de design: Início do painel, tour de 7 passos, convite de instalar, app do membro, `<main>`, contraste, textos |
| bfb5cca | Skills de Emil Kowalski: movimento, celular, pior caso |
| 66d8b3f | Segunda passada: animate e review-animations |
| bf28dbf | Segunda passada: emil-design-eng |
| 463fdb2 | Catálogo da break-ui: limpeza do HTML da divulgação do curso (XSS), iniciais, separador de milhar |
| 1f6fe1b | Folha de baixo arrasta para fechar |
| cb02587 | Janelas acessíveis: Esc, Tab preso, foco, nome para leitor de tela |

### Janelas (`app/service/DialogosAcessiveis.tsx`)

Um componente no layout do Service cuida das 40 janelas, gavetas e folhas sem mexer em cada
uma: Esc fecha a de cima (acionando o mesmo clique do fundo escuro; se o fundo não fecha no
clique, o Esc também não), Tab fica dentro, o foco entra ao abrir e volta ao botão de origem
ao fechar, e a janela ganha `role="dialog"`, `aria-modal` e o nome do título.

### Pior caso

`/service/demo?dados=pior` (só fora de produção) troca os dados do demo por nomes longos,
curtos, com acento, e-mail sem quebra, times e cultos longos e contagens em 1. Os valores
ficam em `app/service/demo/pior-caso.ts`: é o teste de regressão das telas.

### Skills instaladas

`.claude/skills/` tem as 15 skills de `emilkowalski/skills` (lista em `skills-lock.json`).
No Claude Desktop elas aparecem como skills do projeto. As úteis para o Service:
`review-animations` (revisar uma mudança de movimento), `break-ui` (testar uma tela nova com o
pior caso), `mobile-native` (qualquer coisa do app no celular), `animate` (criar animação).

## Pendências e decisões suas

- **Saída animada de janelas e gavetas.** Hoje elas somem sem animação ao fechar. Animar a saída
  exige que cada janela espere a animação antes de desmontar, ou uma biblioteca de componentes
  (a skill pick-ui-library recomenda base-ui).
- **Juntar as seis folhas de CSS** (`service.css` até `service-v6.css`) numa só.
- **Arquivos grandes:** `ServiceExactApp.tsx` (10 mil linhas) e `MobileApp.tsx` (4 mil).
- **"Para resolver" acima da Saúde da igreja** no Início do painel: vai contra a decisão 9 do
  `MANIFESTO.md`; ficou como estava.
- **Interruptores de disponibilidade na cor da igreja:** mantidos (mostram ligado e desligado),
  embora a leitura estrita da lei 8 peça neutros.
