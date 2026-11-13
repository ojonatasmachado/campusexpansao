---
id: Q24
titulo: Auditoria de densidade e alinhamento no painel (botões gigantes, sobreposição)
tipo: decisao
status: BLOQUEADA (ver Notas: achado grande demais pra decidir sozinho)
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
