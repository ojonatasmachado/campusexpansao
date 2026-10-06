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
- [ ] 2.12 Ordem e caixa do Mural
- [ ] 2.13 Erros de console
- [ ] 2.14 Controle de tamanho do texto parado
- [ ] 2.15 Selo da Agenda depois de confirmar
- [ ] 2.16 Situação, duplicados e telefones em Pessoas

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

## Bloqueios
| item | motivo | o que falta |
|---|---|---|

## Captura por etapa
| etapa | pasta | critérios que passaram | que não passaram |
|---|---|---|---|
