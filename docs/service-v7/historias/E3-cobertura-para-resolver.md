---
id: E3
titulo: Transformar cobertura em linha no Para resolver
tipo: codigo
status: feita
quem: codex
desde: 2026-11-09
branch: historia/E3-cobertura-para-resolver
depende: [E2]
tamanho: M
---

## Por quê
O trilho antigo citava Cobertura.tsx. No código atual, o resumo remanescente chama CoberturaResumo.tsx e só tem um consumidor também sem uso, MiniEvent. O Início ainda apresenta uma contagem semanal genérica e o menu Escalas a repete. A cobertura por time deve gerar uma linha por culto com falta no Para resolver, com o detalhe no Panorama.
Fonte: MANIFESTO.md 4.16 (rev. 22/10), decisão 12.

## Arquivos (trilho)
- `app/service/modules/escalas/CoberturaResumo.tsx`
- `app/service/painel/telas/Inicio.tsx`
- `app/service/painel/telas/Panorama.tsx`
- `app/service/modules/escalas/Escalas.tsx`
- `app/service/modules/escalas/manifest.ts`
- `app/service/modules/escalas/pendencias.ts`
- `app/service/modules/registry.ts`
- `app/service/ServiceExactApp.tsx`
- `scripts/check-service-cobertura.ts`
- `.github/workflows/service.yml`
- `evolucoes/service_app/service-app.css`
- `app/service/ui/Segmentado.tsx`
- `app/service/ui/biblioteca.css`
- `app/service/painel/telas/Evento.tsx`
- `docs/service-v7/BIBLIOTECA.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/E3-*.png`

## Levantamento do trilho

Em origin/main d91e0a2, Próximos cultos já foi retirado do Início. MiniEvent, exportado em Inicio.tsx, não tem consumidores; é o único consumidor de CoberturaResumo.tsx. Escalas.tsx já não mostra cobertura na lista. FichaPessoa.tsx calcula a cobertura para EventDrawer, cujo detalhe vive em Panorama.tsx; esse caminho é preservado. O menu Escalas também repete o total de vagas no badge. A fila do Início ainda usa vagasDaSemana(), uma contagem genérica que será substituída por uma linha por culto nos próximos 14 dias. Não há colisão com outra reserva nos arquivos acrescentados ao trilho.

## Lei 16

- [Planning Center, Home](https://www.planningcenter.com/changelog/people/4412146262939-new-planning-center-home): o widget Schedule: team breakdown mostra na página inicial o estado das posições necessárias dos times liderados; a seleção de times é configurável. No [plano, Needed positions](https://help.planningcenter.com/en/142880-set-up-needed-positions.html), a contagem de vagas abre a seleção de pessoas.
- [ChurchSuite, Overview](https://support.churchsuite.com/article/300-viewing-multiple-rotas-in-a-single-report): da lista de escalas, Overview reúne datas e times, permite mostrar datas vazias e editar as escalas. A fonte não demonstra alerta de vaga na página inicial.
- [TimelyChurch, Need Attention](https://help.timelychurch.com/knowledgebase/articles/tutorial-need-attention-sub-invite-walkthrough): o dashboard de pendências, aberto pelo menu, separa posições sem pessoa, substituições e convites. Uma linha de substituição identifica pessoa, evento e motivo; o toque expande a resolução. A fonte não diz que seja a página padrão ao entrar.

Decisão funcional: antecipar no Início somente os cultos com falta, cada um com data e vagas por time; o detalhe e a resolução permanecem no Panorama. Não atribuímos aos concorrentes uma fila inicial que as fontes não comprovam.

## Jornada e decisão de construção

Começa no Início do painel, com Escalas ligado e permissão de escala. O registro fornece os módulos de painel.inicio.pendencias; o módulo Escalas produz entradas de ação com prioridade 80 e prazo, ordenadas por data. O recorte usa o fuso da igreja: hoje e os 13 dias seguintes, excluindo horários já iniciados. A conta reaproveita coberturaPorTime, o escopo do líder e os times do culto; quem recusou não preenche vaga. Sem falta, sem time, sem módulo ou sem permissão, não há linha de cobertura. Sem nenhuma pendência, a fila existente mostra Tudo em dia.

O Início mostra somente as três linhas de cobertura de prazo mais próximo. Se houver mais, uma linha final informa o total com plural() e abre Escalas. Cada linha usa Acao com linhaClasse(), título, apoio e uma ação; o campo ic foi removido porque não era renderizado. O clique abre o drawer com tab panorama, sem consultar outra API e sem escrever no banco. A carga e os erros de rede continuam sob a casca existente; não foi criado comportamento offline novo. O Panorama mantém a ação de abrir o time e editar a escala. O módulo não depende da resposta de outra pessoa para abrir o detalhe; o preenchimento depende do líder e das respostas dos escalados.

O subtítulo perdeu a frase "Culto de ensino e oração em 2 dias" para evitar repetir o mesmo evento no cabeçalho e na primeira pendência (lei 14). Mantém a semana como contexto temporal; culto, data e vagas ficam juntos na linha que abre o Panorama. A programação completa continua em Cultos. A escolha é mantida nesta revisão, conforme a opção de explicar o motivo solicitada pelo usuário.

## Pronto quando
- A cobertura por time sai de Próximos cultos e da lista de Escalas.
- Cada culto com falta vira uma linha no Para resolver.

## Provas e crítica de design

Capturas em localhost:3103, master@teste.local, login pelo formulário, hidratação/networkidle, tour fechado e selo Next conferido oculto. Cada imagem foi aberta. Medição da mesma tela com scripts/medir-densidade.js, __medir(24), 1366×860; limites de 25 ações e 100 palavras.

| Foto | O que foi aberto e visto | Ações / 25 | Palavras / 100 | MD5 |
|---|---|---:|---:|---|
| [Antes](screenshots/E3-antes.png) | Início com 6 vagas genéricas na semana e badge Escalas repetido | 29 | 85 | b526eb84b8733323f95acf57136de85f |
| [Depois](screenshots/E3-depois.png) | Dois cultos, data e vagas por time; sem badge de cobertura | 30 | 103 | 84ef82a693ef619779e4ebadc408eef5 |
| [Panorama](screenshots/E3-panorama.png) | Clique na linha do culto de 11/11 abre Panorama; Recepção 0/2 e time longo 1/2 | 9 | 46 | e333228966265300802a47dcbc4e302d |
| [Pior caso](screenshots/E3-pior.png) | Seis cultos com falta: três prazos à vista, nome longo inteiro e Ver todos com total de 6 | 32 | 159 | 1bb39a68bc2160d2e278287510c69e06 |

O Início está fora da lei 13 em ações, e depois da mudança também em palavras. Justificativas explícitas no manifesto de Escalas. Três molduras detectadas tanto antes quanto depois (limite 2), herdadas da casca; as novas linhas não têm moldura própria. O Panorama fica dentro dos limites. As fotos finais têm zero ações sobrepostas, zero alvo abaixo de 24 px, zero texto abaixo de 12 px e nenhuma rolagem lateral. Axe: zero violações no Depois, Panorama e pior caso; no Panorama e no pior caso recapturado, uma verificação de contraste ficou incompleta no axe e as opções antes reprovadas passaram após contraste reforçado. Nenhum pageerror nas capturas finais. O aviso existente de múltiplos GoTrueClient é warning, não erro. Não se testou aparelho real ou leitor de tela.

Crítica: a contagem genérica obrigava procurar qual culto precisava de ação. As novas linhas respondem isso e deixam o detalhe no Panorama, sem repetir no menu ou em Próximos cultos. O nome longo permanece legível e os demais cultos ficam acessíveis pela linha final Ver todos, conforme a correção da lei 5 pedida no PR #53. A casca continua densa; trocar sua navegação ou seus indicadores extrapola esta história. A reserva de espaço da ajuda é só na preparação do Início. Segmentado ganhou uma variação compartilhada de contraste, usada só no drawer do culto, sem mudar o padrão das outras telas.

Correção do PR #53: teste pelos cliques confirmou exatamente três linhas de cobertura, para 11/11, 15/11 e 16/11, nessa ordem, e a linha final Ver todos os cultos com falta (6 cultos). O clique nela abriu Escalas. O campo ic, sem consumidor visual, foi removido das entradas da fila. As duas fotos foram tiradas novamente e abertas. Depois mantém 30 ações e 103 palavras: excede o antes (29/85) em 1 ação e 18 palavras, porque mostra duas entradas identificadas com data e vagas por time no lugar do resumo agregado semanal. O limite de três não altera o caso com apenas dois cultos, e a imagem recapturada tem o mesmo MD5. O pior caso passou de 34/231 para 32/159, redução de 2 ações e 72 palavras. Ambos seguem fora dos limites de 25/100; as justificativas do manifesto refletem as medidas atuais.

O teste de contrato cobre 14 dias civis, hora e fuso, ordenação, completo/vazio, recusa, singular/plural, times do culto, escopo, módulo desligado e dependência desligada. Entra no CI Service. Os 26 testes existentes da ferramenta de captura passaram na construção inicial.

Validações locais: npx tsc --noEmit -p . e ESLint dos TS/TSX alterados sem erros ou avisos; check-service-lei12, check-service-componentes e check-service-cobertura aprovados; check-theme-contrast aprovado; check-graficos-contraste com 0 falhas (32 avisos existentes de combinações que exigem rótulo). npm test --prefix tools/captura-service: 26 passaram, 0 falharam. npm run build com variáveis fictícias locais do CI: saída 0.

Banco: scripts temporários em /private/tmp, quatro eventos extras além dos dois futuros existentes e renomeação de Louvor. Restauração: DELETE 4, UPDATE 1, zero eventos temporários; trigger t_ministries_upd reativado (O). cmp dos snapshots de eventos, times, escalas e pessoas sem diferença. SHA256 antes e depois: 40bd78d0df76523cb7fa51e271aa1d9fd8bf6c152e9dfd71dc329c81918bd624. Não houve reset nem alteração de senha.

Servidor encerrado: lsof sem listener e bind localhost:3103 OK, porta livre.

## Notas
Feita em 09/11/2026 por codex: fluxo testado por cliques e teclado, fotos recapturadas na correção do PR #53, máximo de três coberturas e Ver todos testados, densidade explicitada, banco restaurado e verificações locais aprovadas; pronta para revisão, sem merge.
