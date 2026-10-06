# Progresso · Service v7

Atualizado pelo Claude Code ao fim de cada item: marque `[x]` e anote o commit curto.

## Etapa 1 · Lei de módulos
- [x] 1.1 (8ac047d) Seção 11 "Service: módulos" no AGENTS.md
- [x] 1.2 (4cd2497) app/service/modules/README.md com as leis e o checklist
- [x] 1.3 (e0bc7f6) app/service/modules/_modelo/ com manifesto de exemplo
- [x] 1.4 (este commit) CLAUDE.md da raiz com @AGENTS.md (já está; só confirmar)

## Etapa 2 · Consertos
- [x] 2.1 (c7681f9) Continuar do curso com destino real
- [x] 2.2 (f46dad0) Aula na Agenda e no cartão, com a instrução do QR
- [x] 2.3 (a937c7d) Check-in da criança pelo app
- [x] 2.4 (996fc23, 5c1eeb6) Destinatário em cadeia para pedir troca (5c1eeb6: "Avisar que vou faltar" usa o mesmo destinatário)
- [x] 2.5 (73c83d6) Destinatário em cadeia para pedido de oração
- [x] 2.6 (4ff7642) Botões de Relatórios
- [x] 2.7 (80e9608) Entrada para Decisões por Jesus
- [x] 2.8 (1e0986c) Pessoas no menu do líder
- [x] 2.9 (e4cd677) Próximos cultos só no futuro
- [x] 2.10 (8293fa6) Janela Escalar vaga sem sobreposição e sem jargão
- [x] 2.11 (74557dd) Botão "?" sem cobrir texto
- [x] 2.12 (7bdd036) Ordem e caixa do Mural
- [x] 2.13 (59e5d4e) Erros de console
- [x] 2.14 (391bc2e) Controle de tamanho do texto parado
- [x] 2.15 (21e0c4e) Selo da Agenda depois de confirmar
- [x] 2.16 (41a3463) Situação, duplicados e telefones em Pessoas

## Etapa 3 · Leitura
- [ ] 3.1 Tokens de fonte
- [ ] 3.2 Mono e caixa alta
- [ ] 3.3 Cor de destaque
- [ ] 3.4 Contraste
- [ ] 3.5 Alvos de toque
- [ ] 3.6 Início do painel sem repetição
- [ ] 3.7 Tabela de Pessoas

## Etapa 4 · Estrutura
- [ ] 4.1 Registro de módulos (Escalas, depois Pessoas e Mural)
- [ ] 4.2 4 abas e avatar
- [ ] 4.3 Início do membro em duas zonas
- [ ] 4.4 Destaque da igreja
- [ ] 4.5 Agenda e detalhe do evento
- [ ] 4.6 Tarefas
- [ ] 4.7 Caminhada com vocabulário
- [ ] 4.8 Histórico
- [ ] 4.9 Tamanho do texto com o componente do iPhone
- [ ] 4.10 Primeiro acesso em 2 passos
- [ ] 4.11 Painel por papel e Saúde da igreja
- [ ] 4.12 Configuração guiada em 3 fases
- [ ] 4.13 Vocabulário em Personalização
- [ ] 4.14 Escalar vaga com histórico
- [ ] 4.15 Mensagens com pessoa e não lidas
- [ ] 4.16 Cobertura por time
- [ ] 4.17 Lista de cuidado
- [ ] 4.18 Lembrete do aviso para quem não viu
- [ ] 4.19 Saudação com o contexto do dia

## Etapa 5 · Medição
- [ ] 5.1 Eventos padrão
- [ ] 5.2 Métricas internas
- [ ] 5.3 Notificações por categoria e silêncio
- [ ] 5.4 Testes automáticos ligados

## Decisões da noite
- Branch `service-v7` criada a partir de `service-v6` (539a83d), e não de `main` (7ab1190): `main` está 2 commits atrás (etapa 6 de Configurações e Permissões), e o estudo de 05/10 foi feito em 539a83d. Partir de `main` perderia esse trabalho.
- AGENTS.md já tinha uma §11 ("Módulos centrais"). A lei entrou como "§13. Service: módulos", com nota explicando o número, para não renumerar seções existentes.
- 1.3: além do `_modelo/manifest.ts`, criei `app/service/modules/define.ts` com os tipos do contrato (`defineModule`, `Cartao`, `Lugar`), porque o exemplo precisa compilar.
- Verificação de cada item: `npx tsc --noEmit` + `npm run build` (o package.json não tem script de typecheck).
- 2.1: "próxima aula" = a aula seguinte às `done_count` já feitas, na ordem módulo/aula (`app/service/lib/aulas.ts`). Botão só para vídeo com link ("Assistir à aula") ou texto ("Ler a aula", lido no app como texto simples, sem HTML do editor). Aula presencial/ao vivo mostra a instrução do QR, sem botão.
- 2.2: aula não tinha dia nem sala no banco. Migração 0051 cria `lesson_date`, `lesson_time`, `location` em `course_lessons` (opcionais), o editor de curso pede os três só para aula presencial/ao vivo, e `page.tsx` passou a ler `course_lessons` com `select("*")` para não quebrar antes da migração em produção. Agenda ganhou "Suas aulas" (nas duas abas) com as aulas datadas dos cursos em andamento.
- 2.3: "hora em que abre" = 60 minutos antes do culto (`KIDS_CHECKIN_ABRE_MIN`). Como só a liderança cria sessão Kids, a migração 0052 cria `service.kids_checkin_session` (security definer: confere responsável, turma, culto hoje em Brasília e horário; cria a sessão se o professor ainda não abriu; sala desligada não reabre). O insert da presença é o mesmo da rota do QR, agora em `app/service/lib/kids-checkin.ts` (`useKidsCheckin`), usado pela rota e pelo app. Presença pelo app grava `dropped_off_via = 'qr'` (o check do banco só aceita qr/manual).
- 2.4: não existe "coordenação do ministério" no modelo de dados. A cadeia ficou líder do time, depois gestão (master, dono, pastor, nessa ordem); quando houver coordenação, entra no meio em `service.request_recipient` (0053). "Oferecer a vaga" usa `service.swap_candidates`: mesmo time, mesma função (marcada no time ou já escalada nela), sem pausa/férias, sem "não posso" no horário, ainda não escalado no culto. A oferta abre conversa com a pessoa; a troca em si continua com a liderança. O líder destinatário não aparece de novo na lista de oferta.
- 2.4/2.5: o destinatário é resolvido no banco porque o membro não lê a ficha do líder (regras 0044); por isso "Não achamos o líder do time". "Avisar que vou faltar" (Agenda) ainda usa a busca antiga `leadersFor` e tem o mesmo defeito: fica para um item próprio.
- Verificação no banco local deixou dados de teste: evento "Culto de teste v7" hoje (06/10) com sessões Kids e check-in de Davi e Alice; datas da aula "Encontro presencial" (10/10 09:30 Sala 2); conversas Maria-Lucas (troca), Maria-Mateus (oferta) e Maria-Marta (oração). Nada foi apagado.
- 2.4 (complemento 5c1eeb6): "Avisar que vou faltar" usa `useDestinatario("troca")` com o time da próxima escala (ou o primeiro time da pessoa); sem destinatário, o botão não aparece. `leadersFor` saiu do MobileApp (ficou sem uso).
- 2.6: "Trimestre" virou o seletor "30 dias | Trimestre", que troca a janela de comparação dos indicadores (30 ou 90 dias contra o período anterior de mesmo tamanho). "Baixar relatório →" gera um CSV no navegador com os números da tela, sem nomes de pessoas. Helper compartilhado `app/service/lib/csv.ts` (`baixarCsv`, com BOM para o Excel), também usado agora pelo "Baixar" de Escalas.
- 2.7: Decisões entrou em Pessoas no `NAV_GROUPS` atual (o registro vem na 4.1); na matriz de Permissões, "Decisões" passou do grupo Formação para Pessoas, igual ao menu.
- 2.8: o RLS já deixa o papel `lider` ler todas as pessoas (`service.is_lead`); não mexi no banco. O menu mostra Pessoas ao líder quando a matriz dá "Voluntários" e não dá "Pessoas e grupos", e a tela filtra para quem está nos times que ele lidera (sem "+ Novo membro"). Se a gestão ligar "Pessoas e grupos" para Líder, ele vê todos, como antes. Líder sem time não vê a entrada.
- 2.9: não era fuso: o dia da semana já vem de `weekdayFromISO`. O "Culto de domingo" num sábado era o nome fixo do seed (`scripts/seed-local-service.ts` criava "Culto de domingo" para hoje + 3 dias, em UTC); o seed agora nomeia pelo dia real, no calendário de Brasília. O evento local de 03/10 ficou como está (não apaguei dado). Filtro novo `aindaVaiAcontecer` em `app/service/lib/date.ts` (dia futuro, ou hoje com hora de início por vir); estado vazio "Nenhum culto marcado daqui pra frente.".
- 2.10: "captura" é a etiqueta que `tools/captura-service/seed-captura.ts` põe nas pessoas do seed: continua aparecendo como etiqueta (dado da igreja), só não sobrepõe mais. Lista em uma coluna (o `.modal-body` era grade de 2 colunas de formulário), motivo do bloqueio embaixo do nome, sem "% engajamento" e sem o status cru. A ordenação por engajamento entre os candidatos ficou (não aparece na tela; revisar na 4.14).
- 2.11: no celular (até 740px) o "?" vai para a barra do topo, ao lado da busca; no computador continua no canto e o conteúdo reserva 96px embaixo. O mesmo `HelpFab`, com `lugar="barra"`.
- 2.12: o "quando" do Mural vinha do texto salvo `when_label` ("agora", "Hoje"), que envelhecia errado. Agora é calculado da data de publicação (`created_at`) no fuso de Brasília: "hoje", "ontem", "há N dias", depois de 7 dias a data. Público numa forma só: "para todos" em minúsculas; nome de time ou grupo como foi cadastrado ("para Louvor"). Helpers em `app/service/lib/date.ts`: `quandoPublicado`, `dataPublicacao`, `porPublicacao`, `paraPublico`. O `when_label` continua sendo gravado, mas não aparece mais.
- 2.13: Reuniões quebrava porque a pauta do seed de captura vem como `[{ t }]` e o app grava texto; o detalhe agora aceita os dois. O erro do envio de logo era o `ImageCropper` criando um blob que o React em desenvolvimento revogava (monta, desmonta, monta) antes de a imagem carregar; o carregamento espera um tique e não cria o blob se o efeito já foi desfeito.
- 2.14: o app aplica a escala com `zoom` no `.m-scroll`, então a correção da rolagem divide pelo zoom do contêiner. Perto do topo, ao diminuir, a rolagem não tem para onde ir (fica no 0).
- 2.15: a resposta da escala fica num estado da casca do app (`respostas` no `MemberUiContext`) assim que a pessoa toca, e "Desfazer" tira; o selo usa esse estado antes de o banco gravar.
- 2.16: regra de "novo" (`ehNovo`, `app/service/lib/pessoas.ts`): situação "novo" na ficha; senão primeiro contato nos últimos 30 dias; sem primeiro contato e sem "membro desde", a data do cadastro. Quem tem histórico não vira novo por ter sido importado agora. No local: Novos 10 de 34 (as contas de teste sem histórico). O KPI do Início passou a "N novos em 30 dias" pela mesma regra. Duplicado: ficha de membro sem vínculo com o voluntário, mas com mesmo nome e telefone, aparece uma vez (Jonatas); ao cadastrar membro, mesmo telefone normalizado ou mesmo nome (sem acento) mostra o aviso, e o segundo toque cadastra. Telefone: helper `app/service/lib/telefone.ts` (`formatarTelefone`, `telefoneParaGravar`, `mesmoTelefone`); migração 0054 guarda "(11) 98000-1000" em `members` e `people` por gatilho e normalizou o que existia (só 10/11 dígitos, tirando +55/0 da frente; outros valores ficam como estão, nenhum dígito perdido). Visitantes e Decisões não entraram (fora do item).
- 3.1: tokens em `service-v5.css` §0: `--fs-app-13/15/17/20/28`, `--fs-pn-12/13/14/16/20/32` e `--fs-ui-*` (componente dos dois lados: vale o painel e, dentro de `.mob-bg`, vira a escala do app). Classe usada só no `MobileApp.tsx` = app; só em outros arquivos = painel; nos dois = ui. Arredondamento: app 11 a 13,5 → 13, 14 a 15,5 → 15, 16 a 18 → 17 (campo segue ≥16 no toque), 19 a 24 → 20, maior → 28; painel 11 a 12 → 12, 12,5 e 13 → 13, 13,5 a 15 → 14, 15,5 a 18 → 16, 19 a 24 → 20, maior → 32 (dentro de `@media (max-width)` acima de 20 arredonda para baixo, para título não estourar no celular). `button` sem tamanho deixou de herdar 13,33px do navegador (agora `--fs-ui-13`). A escala da pessoa continua pelo `zoom: var(--m-scale)` na coluna do app, que já multiplica os tokens; multiplicar o token também daria escala dupla (a troca fica para a 4.9). Ficaram de fora: as folhas de impressão do QR (`<style>` dentro de CheckIn/AulaCheckin, papel branco) e `.login-x` (42vh, marca d'água sem uso).

## Bloqueios
| item | motivo | o que falta |
|---|---|---|

## Captura por etapa
| etapa | pasta | critérios que passaram | que não passaram |
|---|---|---|---|
