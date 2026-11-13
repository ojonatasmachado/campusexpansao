---
id: Q24
titulo: Auditoria de densidade e alinhamento no painel (botões gigantes, sobreposição)
tipo: codigo
status: em andamento
quem: claude
desde: 2026-11-13
branch: historia/Q24-auditoria-densidade-painel
depende: []
tamanho: M
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
2026-11-13 (claude): reservada e em andamento. Vou rodar a captura isolada
(`npx tsx tools/captura-service/isolado.ts`) e revisar o `resultado.json`/manifesto antes de
decidir o que corrigir.
