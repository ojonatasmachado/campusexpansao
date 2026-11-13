---
id: Q24
titulo: Auditoria de densidade e alinhamento no painel (botões gigantes, sobreposição)
tipo: codigo
status: feita (parte 1: menu lateral); parte 2 (botão de ajuda) BLOQUEADA, ver Notas
quem: claude
desde: 2026-11-13
branch: historia/Q24-auditoria-densidade-painel
depende: []
tamanho: G
---

## Por quê
Depois da Q23 (parede de texto no "Para resolver"), o usuário mandou o mesmo print
(IMG_0673.PNG) e disse: "tem telas com botões gigantes se sobrepondo, informações
desalinhadas e muito mais" e "tem [esse problema] e vários outros". Pediu explicitamente para
usar as melhores skills de experiência (UX).

O print em si (tela Início do app, não do painel) não mostra botão sobreposto: mostra o CTA
"Ver panorama →" centralizado verticalmente ao lado de um bloco de texto que, antes da Q23, tinha
8 linhas; parece estranho porque o texto era comprido, não porque o layout está quebrado. Com a
Q23 já corrigida (texto curto), esse efeito deve sumir sozinho. A reclamação de "botões gigantes
se sobrepondo" provavelmente é de outra tela, não capturada neste print.

## Objetivo
Usar `tools/captura-service` (Playwright + medidor de densidade/sobreposição, lei 13) em modo
isolado para fotografar as telas principais do painel e do app do membro com dados reais de
teste, medir contra a lei 13 (densidade) e lei 2 (uma pergunta por lugar) e lei 17
(componentes da biblioteca, sem `<button>` cru), e corrigir qualquer sobreposição/desalinhamento
real encontrado.

## Arquivos (trilho)
- `docs/service-v7/historias/Q24-auditoria-densidade-painel.md`
- `docs/service-v7/historias/screenshots/Q24-*.png` (evidência)
- Os arquivos de UI que a auditoria apontar como quebrados (a definir conforme achados)

## Pronto quando
- Telas principais do painel (Início, Agenda, Times/Escalas, Pessoas, Financeiro,
  Configurações) e do app do membro (Início, Agenda, Caminhada, Perfil) fotografadas com
  `tools/captura-service`, com medição de densidade/sobreposição registrada.
- Toda sobreposição de ação e todo desalinhamento confirmado na medição corrigidos, ou
  registrado como falso alarme com a foto que prova.
- `scripts/validar.sh` completo: TUDO PASSOU.

## Notas

2026-11-13 (claude): rodei `npx tsx tools/captura-service/isolado.ts --so=painel` (modo
isolado, banco e servidor próprios, descartados ao final). Resultado: **43 de ~70 telas
falharam** a lei 13/17, quase todas no painel desktop. Isso é muito maior do que "a Q23 e mais
umas duas telas parecidas" — é uma violação sistêmica. Dividindo o que achei em 3 grupos, do
mais simples ao mais estrutural:

**1. Falso alarme confirmado por foto (não precisa de ação).** O detector de sobreposição
(`nSobre`) não distingue camada (dropdown aberto por cima do conteúdo, de propósito) de
sobreposição real. Abri `desktop-30-painel-menu-do-usuario.png`: o menu "Tema claro / Sair" do
usuário está corretamente desenhado, com fundo opaco, sem vazamento visual. O "sobre" relatado
ali é o dropdown por cima do card de trás, que é o comportamento certo de qualquer menu
suspenso.

**2. Causa raiz real e pontual, já identificada no código (correção pequena, mas que eu não
apliquei: ver "por que parei" abaixo).** Seis dos oito achados de sobreposição real
("`(11)` x `?`" em Pessoas/Voluntários, "Todas as contas/categorias" x `?` em Financeiro,
"INPUT" x `?` em Configurações, "·" x `?` em Permissões) são o **mesmo elemento**: o botão
flutuante de ajuda (`?`, `app/service/HelpSystem.tsx`, classe `.help-fab-wrap.flutuante`,
`position:fixed; bottom:26px; right:96px` em `evolucoes/service_app/service-app.css:2088`).

O próprio CSS já documenta uma tentativa anterior de resolver exatamente isso
(`service-app.css:3052`: *"v7 2.11: o '?' não cobre conteúdo. No computador fica no canto e a
página reserva espaço embaixo"*), via `.main .content { padding-bottom: calc(96px + safe) }` e
uma classe `help-fab-reserve` que `ServiceExactApp.tsx:982` já aplica na `<div className="main
help-fab-reserve">`. **Só que essa classe não existe em nenhum CSS** — grep confirma zero
ocorrências de `.help-fab-reserve` em `service-app.css`. É uma reserva de espaço planejada e
nunca implementada (ou removida numa refatoração e o `className` ficou órfão).

Também existe, desde a mesma revisão v7 2.11, uma segunda instância do próprio `<HelpFab>` sem
`lugar="barra"` (`ServiceExactApp.tsx:1226`, variante `flutuante`) renderizada **junto** com a
variante `lugar="barra"` do cabeçalho (`ServiceExactApp.tsx:1002`) — a intenção, pelo CSS, é que
só uma apareça por vez por media query (`@media (max-width:740px)` esconde a flutuante e mostra
a da barra; acima disso é o oposto). Isso bate com o papel de cada uma, mas explica por que
mexer ali exige cuidado: a flutuante carrega `data-tour="ajuda-fab"`, usado por um passo do
Coachmark de onboarding (`HelpSystem.tsx:119`) — qualquer remoção precisa mover esse atributo
para a variante que ficar, senão quebra o tour guiado.

**3. Estrutural, não é bug de uma tela (decisão de produto, não cabe eu decidir sozinho).** A
maioria esmagadora dos 43 "FALHOU" é **densidade** (`acoes <= 25`, `palavrasNaDobra <= 100`),
não sobreposição. Ex.: `desktop-01-painel-inicio` mede 34 ações/143 palavras (limite 25/100);
praticamente toda tela desktop do painel reprova do mesmo jeito. Motivo: o menu lateral fixo
(Início, Pessoas, Visitantes, Mapa, Crianças, Grupos, Times, Escalas... uns 24 itens) conta
como "ações" em toda medição, em toda tela, antes mesmo de somar o conteúdo da própria tela.
Ou a lei 13 (rev. 22/10) não foi aplicada a essas telas desde que ficou mais rígida, ou o
menu lateral precisa de uma reformulação de fundo (colapsar grupos por padrão, mover para
busca, etc.) para qualquer tela do painel voltar a caber no limite. Isso não é uma correção
cirúrgica como a Q23: é uma decisão de estrutura do painel inteiro.

**Por que parei aqui, sem aplicar as correções do item 2:** depois de abrir o código, a
correção do botão de ajuda tem dependências finas (atributo do tour, duas classes CSS mortas
ou trocadas, um `padding-bottom` que também precisaria ser conferido tela a tela pra garantir
que não há outro container de rolagem interna sem a reserva) que eu não testei visualmente num
navegador de verdade. O item 3 é maior ainda e claramente pede uma decisão de produto, não uma
correção. Juntando os dois, isto deixou de ser "achei mais uns bugs parecidos com a Q23" (que eu
teria corrigido direto) e virou uma frente de trabalho própria, grande e com decisões de
prioridade. Preferi documentar tudo com prova (captura completa em `/tmp/q24-captura`, descartada
ao fim da sessão de captura; os JSONs de auditoria por tela e os prints ficam listados no
`manifest.json`) e perguntar ao usuário como ele quer priorizar, em vez de redesenhar o menu
lateral ou reescrever o botão de ajuda sem alinhar o tamanho da mudança.

**Print original do usuário (IMG_0673.PNG):** mostra a tela Início do app (celular), já com
`nSobre: 0` e sem sobreposição real — o estranhamento ali era inteiramente o texto corrido da
Q23 (já corrigido). A reclamação de "botões gigantes se sobrepondo" é de outra(s) tela(s) do
**painel**, não dessa.

---

## Parte 1 (feita): menu lateral fechado por padrão

O usuário pediu para seguir nos dois achados. Implementei e testei ao vivo (servidor local +
Supabase local deste aparelho, nunca produção) a correção do item 3 (densidade do menu):

`app/service/ServiceExactApp.tsx`: os grupos do menu lateral (Pessoas, Ministério,
Comunicação, Gestão) já tinham a infraestrutura de recolher/expandir pronta (igual o grupo
"Mais", que já nascia fechado) — só o **padrão** é que nascia com tudo aberto
(`gruposFechados` começava `[]`). Troquei para: sem preferência salva ainda no aparelho, só o
grupo da tela atual nasce aberto (mesma regra do "Mais"); com preferência salva, continua
exatamente como a pessoa deixou. Recalculado a cada render (não só na montagem), para
acompanhar módulo que a igreja ligar depois.

**Antes/depois, medido com `scripts/medir-densidade.js` num servidor local de verdade (não a
captura isolada, que já tinha descartado o banco):**

| Tela | ações antes | ações depois | limite (lei 13) |
|---|---|---|---|
| Início (painel) | 34 | **21** ✅ | 25 |
| Pessoas | 34 (`nSobre` incluído) | 31 (ainda acima; sobra é da própria tabela, não do menu) | 25 |
| Financeiro | não medido antes (isolado) | 30 (ainda acima) | 25 |
| Configurações | não medido antes (isolado) | 31 (ainda acima) | 25 |

O Início, que é a tela do print original do usuário, já volta a caber na lei 13. As telas de
conteúdo mais denso (Pessoas, Financeiro, Configurações) melhoram mas continuam acima do
limite: o excesso ali já não é o menu, é o conteúdo da própria tela (tabela, filtros, campos),
o que é uma frente própria, tela a tela, fora do escopo desta história.

**Testado ao vivo, não só por leitura de código:** subi `npm run dev` com o Supabase local
deste aparelho (nunca `.env.local`/produção), logado como `master@teste.local`, confirmado por
Playwright que: o grupo da rota atual nasce aberto e os demais fechados; clicar no cabeçalho de
um grupo expande e mostra os itens; a preferência sobrevive a um F5 (reload); `tsc`, `eslint` e
o `scripts/validar.sh` completo (com `npm run dev:local` real) deram `TUDO PASSOU`. Servidor de
teste encerrado ao final, porta conferida livre.

**Revisado pelo subagente `revisor`:** a primeira versão tinha 3 erros de lint reais (acessar
`NAV_GROUPS`/`route` antes de declarados na leitura do código do efeito, embora funcionasse em
runtime; `setState` síncrono dentro do efeito sem o disable na linha certa; risco de um grupo
que aparece depois nascer sempre aberto por o cálculo rodar só uma vez na montagem). Corrigido
separando o estado bruto (o que está salvo no aparelho) do valor efetivo (derivado a cada
render, combinando o salvo com o padrão calculado a partir de `NAV_GROUPS`/`route` atuais).

## Parte 2 (bloqueada): o "?" de ajuda cobrindo conteúdo

Reproduzi ao vivo (mesmo servidor local, não só pela captura isolada): o botão flutuante de
ajuda (`app/service/HelpSystem.tsx`, `.help-fab-wrap.flutuante`, `position:fixed; bottom:26px;
right:96px`) realmente cobre texto de linha em Pessoas, Financeiro, Configurações e Permissões
na primeira dobra, dependendo de quantas linhas a tela tem antes da dobra.

**Por que isto não tem uma correção de uma linha (e por que não apliquei nada ainda):**
investiguei a fundo e o problema é estrutural, não um CSS esquecido:

- O app usa rolagem **da janela inteira** (`.app{min-height:100vh}`), não um contêiner interno
  com altura fixa. O "?" é `position:fixed`, ou seja, sempre no mesmo lugar da **tela**,
  enquanto o conteúdo passa por baixo dele ao rolar.
- Um `padding-bottom` reservando espaço (que é o que o próprio CSS já tenta fazer hoje via
  `.main .content{padding-bottom:...}`, e que a classe órfã `help-fab-reserve` claramente
  tentava reforçar, mas nunca foi escrita) só ajuda a **não perder o último item ao rolar até o
  fim** — não impede que uma linha do MEIO de uma lista (ex.: a 5ª pessoa da tabela, que calha
  de cair exatamente onde o botão fica) seja coberta já na primeira dobra, sem rolar nada. Isso
  depende de quantas linhas cabem acima da dobra em cada tela, não dá pra resolver com
  espaçamento genérico.
- Confirmei que a classe `help-fab-reserve`, aplicada em `ServiceExactApp.tsx:982`, **não existe
  em nenhum CSS** (`grep` zero resultados) — é uma reserva de espaço planejada e nunca
  implementada, não uma regressão minha.
- O botão também carrega `data-tour="ajuda-fab"`, usado por um passo do tour de onboarding
  (`HelpSystem.tsx:119`): qualquer mudança de lugar/visibilidade dele tem que manter esse passo
  funcionando.

**Três caminhos reais, cada um com um trade-off de produto que não é meu de decidir sozinho:**

1. **Mover o "?" para dentro da barra do topo também no desktop** (ele já existe lá,
   `lugar="barra"`, e já é usado no celular — hoje escondido no desktop via CSS
   `.help-fab-wrap.na-barra{display:none}`). Zero sobreposição possível (barra fixa, sem
   disputar espaço com conteúdo), mas muda a posição de um elemento usado em todo o painel.
2. **Manter flutuante, mas reduzir/esvaziar sua "zona de exclusão"**: por exemplo, encolher o
   botão ou dar um recuo à direita das tabelas/listas do tamanho do botão, reservando uma
   coluna vazia onde ele sempre vive. Mantém a posição atual, mas estreita um pouco o espaço
   útil de conteúdo nessas telas.
3. **Aceitar a sobreposição como comportamento normal de botão flutuante** (é o padrão da
   indústria; a maioria dos apps com FAB tem esse efeito) e afrouxar a lei 13 especificamente
   para este elemento. Não muda nada no produto, muda o critério de qualidade.

Não escolhi nenhum porque os três têm consequência visível em várias telas do painel ao mesmo
tempo; prefiro a decisão do usuário aqui a redesenhar um elemento que aparece em toda tela sem
alinhar qual direção ele quer.
