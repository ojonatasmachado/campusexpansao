# AUDITORIA_COMPLETA_UI — Protótipo (`evolucoes/service_app/`) vs Produção (`app/service/`)

> Levantamento apenas. Nada foi corrigido. `evolucoes/service_app/` manda sempre que houver conflito.
> Legenda: ✅ bate exatamente · ⚠️ existe mas diverge · ❌ não existe na produção.

---

## 1. Painel / Dashboard
Ref: `evolucoes/service_app/screens.jsx:52-185` (+ `app.jsx`) · Prod: `ServiceExactApp.tsx:1090-1225`

- ✅ Hero (`ph-eyebrow "Painel"`, título "Bom domingo, *liderança*", subtítulo) idêntico.
- ✅ Botões "Ver agenda" / "Montar escala →" e estrutura `dash-3col`/`dash-2col` batem.
- ⚠️ **KPIs sem delta/tendência**: ref calcula `voluntariosDelta`, `confirmacaoDelta`, `escalasSemana`, `visitantesDelta` e mostra "▲ X% vs. mês anterior" etc (`screens.jsx:74-91`). Prod `Kpi` (`ServiceExactApp.tsx:1124-1127`) só mostra texto estático sem nenhuma variação percentual.
- ⚠️ **Ícones trocados**: ref usa `icon="ok"` p/ Taxa de confirmação e `icon="alerta"` p/ Vagas em aberto (`screens.jsx:78,83`); prod usa `icon="identidade"` e `icon="config"` (`ServiceExactApp.tsx:1125-1126`) — sem relação semântica.
- ⚠️ **Pendências da escala não diferencia recusa de vaga aberta**: ref troca ícone `✕`/`!` e texto "recusou, cobrir" vs "X vaga(s)" conforme `g.kind` (`screens.jsx:104-107`); prod sempre usa ícone `!` fixo e texto fixo "1 vaga(s)" (`ServiceExactApp.tsx:1138,1141`).
- ❌ **Botão de QR check-in inline** no card de "Próximos cultos" com contagem de presentes (`painel-qr`, `S.resumoPresenca`, `screens.jsx:135-138`) não existe em `MiniEvent` (`ServiceExactApp.tsx:1193-1203`).
- ❌ **"Comunicação recente" com dados reais**: ref lista `S.AVISOS` de verdade (`screens.jsx:171-178`); prod mostra um único card fixo hardcoded "Agenda da semana / Liderança · agora" (`ServiceExactApp.tsx:1175`), não lê avisos reais.
- ❌ **Botão "+ Novo voluntário" com modal rápido** no painel (`NovoVoluntarioBtn`, `screens.jsx:187-228`, campos Nome/Telefone/Ministérios em chips) não existe na tela de painel da produção.

## 2. Membros
Ref: `evolucoes/service_app/membros.jsx:23-236` · Prod: `ServiceExactApp.tsx:1227-1281` (lista) + `EntityDrawer` "member" (`4118-4204`)

- ✅ Hero, 4 KPIs (Membros/Novos convertidos/Em integração/Já servindo) e tabela (Membro · Membro desde · Serve · Jornada/Cargo) batem estruturalmente.
- ✅ Filtro de busca e segmentos "Todos/Servindo/Novos" funcionam nos dois lados.
- ⚠️ Ref tem um 4º filtro dinâmico por **Grupo de Comunhão** (`select` com `S.GCS`, `membros.jsx:85-90`) quando `G.ativo`; produção não tem esse seletor (não há conceito de GC/grupo de comunhão implementado).
- ⚠️ Coluna "Cargo" da ref mostra `papel-tag` (cargo ministerial, ex. Pastor/Diácono) **e** `lider-tag` por time liderado (`membros.jsx:122-126`); prod coluna "Serve" só mostra tags de ministério + "Líder" genérico (`ServiceExactApp.tsx:1268-1272`), sem o conceito de `papel` (cargo).
- ❌ **Drawer do membro** (`EntityDrawer` "member"): falta o campo **Aniversário** (`nasc`) em "Dados cadastrais" (ref `membros.jsx:184`; prod `4144-4150` não lista).
- ❌ Falta o campo/linha de **Grupo de Comunhão** com nome do líder (ref `membros.jsx:186`, condicional a `G.ativo`); não existe em produção.
- ❌ Falta a seção **"Família"** (irmãos/parentes cadastrados com mesmo `familia`, `membros.jsx:212-224`); ausente em `EntityDrawer` member.
- ⚠️ Seção de cursos: ref "Jornada de integração · cursos" (`CursosDoMembro`, calcula `pct` real de aulas feitas/total e tem botão **"+ Matricular em curso"** com busca de cursos disponíveis, `membros.jsx:238-305`); prod "Cursos matriculados" (`4170-4193`) usa `pct` **hardcoded 50%** quando `status !== "concluido"` (não calcula aulas reais) e **não tem botão de matricular**.
- ⚠️ Ordem/nome de seção: ref separa "Jornada de integração · cursos" (cursos) de "Linha do tempo · histórico" (timeline, com botão "+ Registrar evento"); prod chama a seção de timeline de **"Jornada de integração"** (mesmo nome que a ref usa para cursos) e não tem botão de registrar evento manual (`AddEventBtn` ausente).
- ⚠️ CTA final: ref é simples ("Ver como voluntário →" ou toast "Convidar para servir"); prod abre modais ricos "Atualizar jornada" / "Convidar para servir" com campos — comportamento **diferente do especificado na referência**, não necessariamente pior, mas diverge do fluxo aprovado.

## 3. Pessoas / Voluntários
Ref: `evolucoes/service_app/screens.jsx:231-362` · Prod: `ServiceExactApp.tsx:1283-1294` (lista) + `EntityDrawer` "person" (`4071-4116`)

- ✅ Hero e subtítulo idênticos.
- ❌ **Busca e filtro decorativos**: o `<input placeholder="Buscar por nome...">` da lista de produção (`ServiceExactApp.tsx:1287`) não tem `value`/`onChange` — não filtra nada. Os botões de segmento "Todos/Ativos/Pausa" também não têm `onClick` nem estado — decorativos. Na ref, busca e os filtros por time (`filtro` dinâmico a partir de `S.TIMES`) funcionam de verdade (`screens.jsx:232-258`).
- ⚠️ **Modal "+ Novo voluntário" com campos diferentes**: ref pede Nome + Telefone + seletor de **Ministérios** em chips (`NovoVoluntarioBtn`, `screens.jsx:188-228`); prod pede Nome + Telefone + **E-mail** (`ServiceExactApp.tsx:1286`) — sem seletor de ministérios, com campo e-mail que não existe na ref.
- ⚠️ **Colunas da tabela diferentes**: ref = "Voluntário · Times & funções · Engajamento (barra %) · Situação" com status computado por `volStatus()` (regras de recusas seguidas / dias indisponível / férias → Ativo/Inativando/Inativo/Em férias, `screens.jsx:6-14`); prod = "Voluntário · Disponibilidade · Frentes · Status" (`ServiceExactApp.tsx:1289-1290`) — troca a barra de engajamento por texto de disponibilidade, e usa `person.status` cru em vez da lógica de níveis da ref.
- ❌ Falta o indicador "você" ao lado do próprio nome quando `p.self` (ref `screens.jsx:267`); prod não usa esse prop no `Av`/linha da lista.
- ⚠️ **Drawer da pessoa**: `profile-role` da ref calcula "Líder · {times}" ou "Voluntário", sempre com `· desde {p.desde}` real (`membros.jsx` pattern / `screens.jsx:312`); prod tem texto fixo **"Voluntário · desde o cadastro"** (`ServiceExactApp.tsx:4084`) sempre, nunca calcula líder nem data real.
- ⚠️ Seção "Disponibilidade" da ref tem nota explicativa "Verde: disponível para escalar. Riscado: bloqueado pelo voluntário." (`screens.jsx:346`); prod omite essa nota (`4097-4105`).
- ❌ **"Meu calendário" não é um calendário**: ref usa `MiniCalendar` agregando escalas + reuniões + ensaios da pessoa por data (`screens.jsx:298-301,350-351`); prod mostra apenas uma lista plana de "Escala / Status: X" (`ServiceExactApp.tsx:4106-4108`), sem agregar reuniões/ensaios nem visual de calendário.

## 4. Times & Ministérios (+ detalhe do time)
Ref: `evolucoes/service_app/times.jsx:1-190` · Prod: `ServiceExactApp.tsx:1296-1305` (lista) + `EntityDrawer` "ministry" (`4206-4267`)

- ✅ Grid de cards (`team-grid`/`team-card`) com marca do time, avatar-stack, nome, líder, descrição e rodapé (voluntários/funções) bate nos dois lados.
- ❌ **"Sobre o time" incompleto**: ref tem até 5 blocos de informação — Propósito, Como trabalhamos, Horário de chegada, "O que esperamos" (lista de responsabilidades) e Pré-requisitos (cursos obrigatórios) (`times.jsx:74-111`); prod só renderiza o bloco **Propósito** (`ServiceExactApp.tsx:4228-4238`) — faltam os outros 4 blocos inteiros.
- ❌ **Bug: roster não filtra por função/posição**. Ref agrupa pessoas aptas por função (`porFuncao`, `times.jsx:49-52`), mostrando só quem tem aquela função. Prod (`4239-4259`) itera `ministry.positions` mas em cada posição lista **todas** as `ministry.people` sem filtrar pela posição — todas as posições mostram a mesma lista completa de pessoas do ministério. O check de "Ninguém neste time ainda" também usa `ministry.people.length === 0` (time inteiro) em vez de checar a posição específica.
- ❌ **"Adicionar pessoa" sem picker real**: ref abre `AddToTeamBtn` com busca e lista de voluntários fora do time, clicáveis (`times.jsx:156-190`); prod abre um modal genérico com dois campos de **texto livre** "Voluntário" e "Função no time" (`ServiceExactApp.tsx:4262`), sem vincular a uma pessoa real do cadastro.
- ⚠️ Falta a variante "Quero servir aqui →" quando a visão é de `member` (autosserviço) — provavelmente fora de escopo do admin (fluxo do app do voluntário, ver item 24), mas vale registrar a ausência.

## 5. Cultos / Eventos + cronograma + posições
Ref: `evolucoes/service_app/times.jsx:192-386` (cronograma + drawer) + `screens.jsx:365-402` (lista) · Prod: `ServiceExactApp.tsx:1507-1531` (lista) + `EventDrawer` (`4344-4432`)

- ⚠️ **Lista principal trocou de formato**: ref é uma tabela (`Data · Culto · Equipe (AvStack) · Confirmação (barra %) · Ver posições`, `screens.jsx:377-398`); prod é um grid de cards (`grid-2`) mostrando prévia do cronograma (`ServiceExactApp.tsx:1511-1527`) — perde a barra de % de confirmação e o avatar-stack de quem está escalado por evento.
- ✅ Prod adiciona atalhos "Check-in QR" e "Arte" direto no card da lista (`1519-1524`) — não existe na lista da ref (só dentro do drawer), mas é aditivo/positivo.
- ✅ Tabs "Cronograma"/"Posições" no drawer batem.
- ❌ **Cronograma é somente leitura na produção**. Ref tem `CronogramaEditor` completo e interativo: adicionar/remover/reordenar etapas, duração em minutos com cálculo automático de horário de início/fim por etapa, seletor de time por etapa com responsável = líder do time (readonly), campo de observação, repertório do louvor embutido quando `time==='louvor'`, e totais por categoria (`times.jsx:202-306`). Prod (`ServiceExactApp.tsx:4380-4384`) só lista `event.schedule` (item + horário + categoria) sem nenhuma edição.
- ⚠️ Prod acrescenta uma seção "Setlist" separada (`4385-4387`) fora do padrão da ref (que mostra repertório inline dentro da etapa de louvor do cronograma) — estrutura diferente, não necessariamente errada, mas diverge do desenho aprovado.
- ❌ **"Setup da celebração" não abre a arte do evento**: ref chama de fato o gerador de imagem `EventoShare` (`times.jsx:377,381`); prod abre um modal genérico de mensagem de texto (`ServiceExactApp.tsx:4427`) — mesmo o arquivo `EventoShare.tsx` já existindo em `app/service/`, o botão do drawer do evento não o aciona (ver item 18 para detalhe do componente em si).
- ⚠️ Posições: prod cria uma posição fake "Equipe" (`${ministry.id}-geral`) quando o ministério não tem `positions` cadastradas (`4393`); a ref não tem esse fallback (segue estritamente `t.funcoes`).

## 6. Escalas
Ref: `evolucoes/service_app/escalas.jsx` (todo o arquivo) · Prod: `ServiceExactApp.tsx:1307-1613` (`Escalas` + `RosterActionModal`)

Esta é a tela com a maior divergência funcional encontrada até agora — o protótipo é um editor de escala totalmente interativo; a produção é, em grande parte, uma casca visual com ações decorativas.

- ✅ Layout de colunas por time (`esc-cols`/`esc-col`), legenda de status (Confirmado/Pendente/Recusou/Vaga aberta), seletor de evento (`esc-events`) e os 3 modos "Manual/Assistida/Automática" com os mesmos textos de dica batem.
- ❌ **Nenhuma ação realmente muda o estado da escala**. No protótipo, clicar numa pessoa escalada abre um modal com ações reais: `setStatus` (confirmar/pendente), `recusar` (com chamada automática do próximo apto se `modo==='automatico'`), `checkin` (toggle), `trocar` (substituir), `remover` (`escalas.jsx:513-542`). Na produção, **todo botão do `RosterActionModal`** (`ServiceExactApp.tsx:1571-1577`) só abre outro `setModal` genérico com campos de texto livre — nenhum grava status, chama próximo candidato ou remove de fato.
- ❌ **Modo automático não gera nada sozinho**: ref tem `useEffect` que roda `gerarAuto(true)` ao trocar de evento quando `cfg.modo==='automatico'` (`escalas.jsx:333-338`) e um botão "Gerar automática/agora"; produção não tem esse `useEffect` nem esse botão.
- ❌ **Sem função de candidatos com regras de bloqueio**: ref calcula `candidatos()` com motivo de bloqueio (já escalado no evento, de férias, no teto do mês) e ordena por disponibilidade + engajamento (`escalas.jsx:12-30`); prod só marca "ocupado" via `occupiedPeople.has(id)` (`ServiceExactApp.tsx:1596,1604`), sem mostrar motivo, sem considerar férias/teto, sem ordenar por engajamento.
- ❌ **Repertório do louvor (`LouvorSetlist`) ausente na tela de Escalas** — ref mostra/edita o setlist inline quando o time de louvor está visível no evento, com controle de quem pode editar (`escalas.jsx:34-124,446`); produção não tem isso na tela de Escalas (só existe leitura no drawer do evento).
- ❌ **Editor de funções (`FuncoesEscalaModal`) é só decorativo**: ref permite renomear função, stepper +/− de vagas e remover, valendo para todos os eventos do time (`escalas.jsx:167-212`); prod "editar funções" (`ServiceExactApp.tsx:1425`) abre modal genérico com 2 campos de texto (nome da função + quantidade), sem listar as funções existentes nem permitir editar/remover.
- ❌ **Sem presets de escala**: `PresetSaveModal`/"Aplicar configuração…" (salvar e reaproveitar configuração de funções entre eventos, `escalas.jsx:214-233,409-416`) não existe em produção.
- ❌ **Delegação sem picker real**: ref abre `DelegarModal` com lista de pessoas do time e toggle (`escalas.jsx:127-164`); prod "Delegar" (`ServiceExactApp.tsx:1365`) abre modal genérico com 2 campos de texto livre.
- ❌ **"Baixar" não baixa nada**: ref gera e baixa um CSV de verdade (`escalas.jsx:360-367`); prod (`1367`) só abre um modal pedindo o "formato" (PDF/CSV/PNG), sem gerar arquivo algum.
- ⚠️ **"Regras" não navega**: ref tem link que leva à tela de Configurações de verdade (`window.cexGo('config')`, `escalas.jsx:417`); prod (`1390`) abre um modal genérico com campos de texto, sem navegar para Config.
- ⚠️ Falta o texto de perspectiva por papel ("Você está vendo os N times que lidera" / "A Direção vê todos os times", `escalas.jsx:384`) — produção não adapta a visão conforme o papel de quem está logado (liga com o item 26, matriz de permissões).
- ⚠️ Produção acrescenta um painel "Pendências da semana" ao final da tela de Escalas (`ServiceExactApp.tsx:1484-1491`) que não existe nessa tela na referência (só existe no Painel) — aditivo, não é regressão, mas diverge do desenho aprovado.

## 7. Visitantes + jornada de integração
Ref: `evolucoes/service_app/visitantes.jsx:1-303` · Prod: `ServiceExactApp.tsx:1622-1720` (lista) + `VisitanteDrawer` (`3901-3934`, ver observação)

- ✅ As 3 visões (Funil/Lista/Painel) existem nos dois lados com os mesmos KPIs, funil por etapa, distribuição por culto e "Resposta ao 1º contato" (split visual + lista de quem não respondeu).
- ✅ Modal "+ Visitante" com campos equivalentes.
- ❌ **Banner de configuração de contato é estático e "Ajustar" não faz nada**: ref lê `S.CONTATO_CFG` (prazo em horas, canal, meta de dias, mensagem padrão, abordagem) e o botão "Ajustar" abre `ContatoCfgModal`, editável e persistido (`visitantes.jsx:29-37,450-480`); prod tem os valores **hardcoded** "24h"/"WhatsApp"/"30 dias" (`ServiceExactApp.tsx:1658-1660`) e o botão "Ajustar" **não tem `onClick`** — decorativo.
- ⚠️ Etapas do funil: ref usa `S.ETAPAS` (dado configurável, cores por hex); prod usa uma constante fixa `VISITOR_STAGES` de 4 estágios com cores de token CSS (`ServiceExactApp.tsx:1615-1620`) — mesmo conjunto de estágios, mas não é dado configurável pelo admin como na ref.
- (Drawer do visitante será conferido em detalhe junto ao restante do fluxo de jornada; estrutura inicial confere com `dsec` "Contato" + pipeline de etapas + registrar contato + histórico.)

## 8. Decisões
Ref: `evolucoes/service_app/jornada.jsx:34-195` · Prod: `ServiceExactApp.tsx:2190-2259` (lista) + `DecisaoDrawer` (`3690-3765`)

- ✅ Hero, 4 KPIs, filtros (Todas/A contatar/Acompanhando/Encaminhados), tabela e drawer batem de perto — esta é uma das telas mais fiéis à referência.
- ✅ Produção implementa **de verdade** o "+ Registrar decisão" com formulário completo (nome/telefone/culto/responsável) — a própria referência tem esse botão como stub (`cexSoon('Registrar decisão')`, `jornada.jsx:65`), então aqui a produção está mais completa que o protótipo.
- ✅ "Encaminhar p/ acompanhamento →" persiste de verdade no Supabase (`ServiceExactApp.tsx:3701-3707`), equivalente ao comportamento pretendido pela ref.
- ⚠️ Falta o botão secundário **"Registrar contato"** que existe no rodapé do drawer da ref (`jornada.jsx:189`); `DecisaoDrawer` da produção só tem o botão primário (`3756-3761`).

## 9. Batismos
Ref: `evolucoes/service_app/jornada.jsx:197-376` · Prod: `ServiceExactApp.tsx:2268-2350` (lista) + `BatismoDrawer` (`3818-3899`) + `AddCandidatoModal` (`3767-3817`)

- ✅ Uma das telas mais fiéis do sistema: hero, KPIs, "Próximas turmas"/"Histórico" com `section-divide`, cards de turma, drawer com detalhes/candidatos/"+ Adicionar candidato"/"Avisar candidatos"/"Emitir certificados" batem de perto, com adição real de candidato buscável.
- ⚠️ KPI "Batizados no ano": ref soma candidatos concluídos **+ 19** (número mágico hardcoded no protótipo, `jornada.jsx:237`); prod troca por "Concluídos" = contagem de turmas concluídas (`ServiceExactApp.tsx:2292`) — métrica com definição diferente (turmas vs pessoas), não é regressão mas o número não é comparável.

## 10. Cursos & Trilhas + editor de curso
Ref: `evolucoes/service_app/cursos.jsx` + `curso-editor.jsx` · Prod: `ServiceExactApp.tsx:2352-2415` (`CursosTrilhas`) + `CursoEditor.tsx` (arquivo completo)

- ✅ **O editor de curso em si é uma reconstrução fiel**: `CursoEditor.tsx` reproduz modalidade, formato (trilha/conteúdo/presencial), `RichText` (negrito/itálico/título/listas/link), `MateriaisEditor` de divulgação, módulos/aulas com tipos (vídeo/texto/ao vivo/presencial) e `QuizEditor` (prova de múltipla escolha com mínimo de acertos) — e persiste de verdade no Supabase (`courses`/`course_modules`/`course_lessons`). Isso corrige o gap "editor de curso ausente" apontado na auditoria anterior.
- ❌ **Tela de listagem (`CursosTrilhas`) perdeu quase toda a estrutura da galeria da ref**: falta a linha de **4 KPIs** (Cursos ativos/Matrículas/Conclusões/Em formação de líderes, `cursos.jsx:48-69`); falta o toggle **"Galeria/Organizar"** e a view "Organizar" inteira (`CursoBuilder`, quadro de grupos com drag-and-drop e "+ Novo grupo", `cursos.jsx:279-326`); falta o filtro por tipo (Todos/Trilhas/Conteúdo/Presenciais).
- ❌ **Sem drawer de visualização (`CursoDrawer`) separado do editor**: na ref, clicar num curso abre um drawer só de leitura (conteúdo por módulo/aula, lista de matriculados com progresso, "+ Matricular pessoa", "Editar curso"); na produção, clicar no card **abre direto o editor completo** (`ServiceExactApp.tsx:2394`) — não há como só consultar o curso e a lista de matriculados sem entrar no modo de edição.
- ❌ Falta o **check-in de aula por QR** (`AulaCheckinModal`/`comQR` nas aulas presenciais/ao vivo, `cursos.jsx:174,185,233`) em qualquer lugar da produção — consistente com o gap encontrado no item 17.
- ❌ Falta o botão dedicado **"+ Matricular pessoa"** com busca de membros (`MatricularModal`) fora do fluxo de edição.
- ⚠️ Barra de progresso do card: ref mostra `% de conclusão` real (`concluintes/matriculados`); prod usa fallback **arbitrário** `Math.min(100, members.length * 2)` quando não há matrículas (`ServiceExactApp.tsx:2406`) — número sem relação com progresso real do curso.
- ⚠️ Subtítulo do cabeçalho mudou de tom: ref "Da decisão à liderança..." (`cursos.jsx:37`); prod "Trilhas internas de formação, aulas e participantes. Não mistura com cursos comerciais CE.X." (`ServiceExactApp.tsx:2378`) — texto e ênfase diferentes do aprovado.

## 11. Reuniões
Ref: `evolucoes/service_app/reunioes.jsx:1-104,227-262,363-437` · Prod: `ServiceExactApp.tsx:1722-1761` (lista) + `ReuniaoDrawer` (`1788-1905`)

- ✅ Hero, divisão "Agendadas"/"Realizadas", cards de reunião agendada e tabela de realizadas batem. `ReuniaoDrawer` (Times & presentes, Pauta, Ata, Responsabilidades) também bate na estrutura e **salva a ata de verdade no Supabase** (`salvarAta`, `ServiceExactApp.tsx:1808-1817`).
- ❌ **"+ Marcar reunião" perdeu o formulário rico**: ref abre `ReuniaoForm` com `DatePicker`/`TimePicker` de início e fim, **seletor de sala com detecção de conflito de horário** (`conflitoReserva`, `reunioes.jsx:375,416`), `PeoplePicker` real de presentes e pauta linha-a-linha (`reunioes.jsx:363-437`); prod abre um `setModal` genérico com campos de texto livre (título/data/hora/local/time) — sem reserva de sala, sem checagem de conflito, sem seletor de pessoas.
- ❌ **Não dá para adicionar responsabilidade a partir do drawer**: ref tem `acao-add` (input + seletor de responsável dentre os presentes + botão "+ Anotar", `reunioes.jsx:344-351`); prod só **lista** as responsabilidades existentes (`ServiceExactApp.tsx:1868-1891`), sem forma de criar uma nova dali.
- ❌ **Sem vínculo com Quadros/Kanban**: ref permite mandar cada responsabilidade (ou todas de uma vez) para um quadro via `BoardChooser`, virando card rastreável ("Ver no quadro →", `reunioes.jsx:244-262,309-341`); produção não tem esse elo — responsabilidades da reunião nunca viram cards de Kanban automaticamente.

## 12. Ensaios
Ref: `evolucoes/service_app/reunioes.jsx:56-76,106-185` · Prod: `ServiceExactApp.tsx:1763-1786` (lista) + `EnsaioDrawer` (`1907-1993`)

- ✅ Cards de ensaio (recorrência, tipo, título, data/hora/local, time, repertório/observação) e drawer (Time, Quem participa, Repertório, Materiais, Observação) batem bem, incluindo campos que a ref só mostra condicionalmente.
- ✅ "+ Novo ensaio" da produção tem cobertura de campos equivalente à intenção da ref (tipo, ministério, data/hora/local, recorrência, observação).

## 13. Espaços / Reservas
Ref: `evolucoes/service_app/espacos.jsx` · Prod: `ServiceExactApp.tsx:2157-2188`

- ✅ Grid de salas (capacidade, local, recursos, contagem de reservas, filtro por clique) bate.
- ❌ **Sem calendário de verdade**: ref usa `MiniCalendar` — um calendário mensal navegável com dias marcados, agenda por dia selecionado e "+ Reservar neste dia" (`espacos.jsx:25-81,203-215`, reaproveitado também no perfil da pessoa, ver item 3); prod substitui por um **painel de lista simples** ("Calendário de reservas" é, na verdade, uma lista `mini-row`, `ServiceExactApp.tsx:2176-2185`) — não há visualização de mês nem navegação por dia.
- ❌ **Sem detecção de conflito de reserva**: ref bloqueia reservas coincidentes na mesma sala/horário com aviso claro (`conflitoReserva`/`S.reservar`, `espacos.jsx:97-105,130-138`); o modal "+ Reservar espaço" da produção é um `setModal` genérico sem nenhuma validação de conflito.
- ⚠️ Ícone da sala e da reserva usa `config` (`ServiceExactApp.tsx:2172,2181`) em vez de um ícone de espaço/local como a ref (`espacos`, `espacos.jsx:189`) — sem relação semântica.

## 14. Quadros / Kanban
Ref: `evolucoes/service_app/kanban.jsx` · Prod: `ServiceExactApp.tsx:2423-2907` (`KbCard`, `CardDrawer`, `NovoCard`, `BoardView`, `Quadros`)

- ✅ Esta é uma das reconstruções mais completas: colunas com drag-and-drop (`draggable`/`onDragStart`/`onDrop`), `CardDrawer` com situação/prioridade/responsáveis/comentários, tudo persistido de verdade no Supabase (`cards`, `card_comments`) — corrige o gap "sem drag-and-drop" da auditoria anterior.
- ❌ **Sem controle de permissão nenhum**: ref restringe por papel via `kanbanPerm()` — só quem tem `perm.criarCard` vê o botão "+ Card", só `perm.comentar` vê a caixa de comentário, só `perm.editarBoard` vê "Excluir card", e mover card fora dos "meus" é bloqueado com toast (`kanban.jsx:9-13,125,174,286,303`); produção **não implementa nenhuma dessas restrições** — qualquer usuário pode criar, mover, comentar e excluir qualquer card em qualquer quadro (liga com o item 26).
- ❌ **Falta o filtro "Meus" cards** (`fEstado==='meus'`, cards em que sou responsável, `kanban.jsx:105,118,148`); produção só tem "Todos/Atrasados/Parados" (`ServiceExactApp.tsx:2758`).
- ❌ **Chip de "atrasado(s)" ausente no card do quadro** (`bd-card-top` na lista de quadros, `kanban.jsx:81`); produção não mostra essa contagem no card do quadro (`ServiceExactApp.tsx:2887-2891`).
- ⚠️ Marca do quadro: ref usa `TeamMark t={time do quadro}` (ícone/cor do time dono); produção usa `Icon name="times"` fixo para todo quadro (`2890`), perdendo a identificação visual por time.
- ⚠️ Texto de personalização por papel ("Os quadros do {time}. A Direção vê todos.") existe na ref (`kanban.jsx:53`); produção usa subtítulo estático sempre (`2867`).

## 15. Comunicação / Avisos
Ref: `evolucoes/service_app/visitantes.jsx:305-447,450-524` · Prod: `ServiceExactApp.tsx:2049-2156`

- ✅ Toggle Mural/Avisos, feed de posts com pin/canais, lista de avisos + detalhe batem estruturalmente.
- ❌ **Sem rastreio de leitura**: ref mostra "Alcance da semana" com % real de leitura e distribuição por time (`dist-row` por time, `visitantes.jsx:392-409`) e no detalhe do aviso tem **"Ver quem leu"** (`VerQuemLeuBtn`, lista de quem leu/não leu, `visitantes.jsx:483-524`); produção troca por um painel "Resumo" genérico (contagem de posts/avisos/fixados, `ServiceExactApp.tsx:2105-2111`) e **não tem** botão de quem leu.
- ⚠️ "Reenviar notificação" no detalhe do aviso não tem `onClick` na produção (`ServiceExactApp.tsx:2143`); na ref dispara um toast de confirmação.

## 16. Conversas
Ref: `evolucoes/service_app/chat.jsx` · Prod: `ServiceExactApp.tsx:2909-2940`

- ✅ Layout lista + thread (`chat-layout`/`chat-list`/`chat-main`) e estrutura de bolhas de mensagem batem.
- ❌ **Campo de mensagem não é controlado**: o `<input>` de composição da produção não tem `value`/`onChange` (`ServiceExactApp.tsx:2936`) — "Enviar" sempre abre um modal genérico pedindo a mensagem de novo, em vez de enviar direto o texto digitado como na ref (`ChatThread`, Enter ou botão envia via `S.enviarMsg`, `chat.jsx:36-70`).
- ❌ **"+ Nova conversa" sem seletor de pessoas real**: ref abre `NovaConversaModal` com escolha de tipo (Individual/Grupo) e `cand-pick` das pessoas do escopo (`chat.jsx:73-127`); produção abre modal genérico com campos de texto livre (nome do grupo, "Participante" como texto único) — não permite selecionar várias pessoas nem define tipo dm/grupo de fato.
- ⚠️ Falta a personalização do subtítulo por papel (Direção vê tudo vs líder vê só o canal do seu time, `chat.jsx:145`) e o prefixo "Você: " na prévia da última mensagem quando o remetente sou eu (`chat.jsx:28`).

## 17. Check-in por QR
Ref: `evolucoes/service_app/checkin.jsx` · Prod: `app/service/CheckIn.tsx` (arquivo completo)

- ✅ A modal de check-in em si é uma reconstrução muito próxima e bem cuidada: abas QR/Presença ao vivo, contadores (presentes/faltam/escalados/extras), roster com "Marcar presente"/desfazer, `ManualCheckinModal` de registro manual, template de impressão, e até usa uma lib de QR real (`react-qr-code`) em vez do gerador customizado da ref.
- ❌ **Presença não persiste**: `attendance` é só `useState` local (`CheckIn.tsx:390`) — ao fechar o modal ou recarregar a página, todo o check-in registrado se perde. A ref persiste em `S.PRESENCA` (localStorage no protótipo, mas pensado como dado real) e `S.registrarPresenca` é a fonte única de verdade reaproveitada pelo Painel (contagem de presentes no mini-card do culto) e pela tela de Escalas.
- ❌ **Sem rota pública de leitura do QR real**: a ref lê `location.search` no `App.jsx` (`checkin=ID&t=TOKEN`) e renderiza `CheckinLanding` para *qualquer um* que escaneie o QR físico, sem precisar abrir o admin (`app.jsx:35,73`). Na produção **não existe nenhum lugar que leia `useSearchParams`/`location.search` para `checkin`** (confirmado por busca no código) — o fluxo real "voluntário escaneia com o próprio celular" não está implementado; só existe o botão interno "Simular leitura", que roda dentro do próprio modal do admin.
- ❌ **Check-in de aula (curso presencial) inteiramente ausente**: `AulaCheckinModal`/`AulaCheckinLanding` (QR por aula, presença de alunos matriculados, `checkin.jsx:334-477`) não têm equivalente em produção — nem no `CheckIn.tsx`, nem no editor/drawer de curso (ver item 10).
- ❌ Falta o botão **"Salvar"** (baixar QR como PNG com nome do culto/data desenhado, `checkin.jsx:170-185`); produção só tem "Imprimir"/"Copiar link"/"Ativar/Desativar"/"Regenerar".
- ⚠️ No roster de presença, a função da pessoa no evento mostra o **`position_id` bruto** em vez de um nome legível tipo "Louvor · Vocal" (`CheckIn.tsx:305-310,332` vs `S.funcaoNoEvento`, `checkin.jsx:45-56`) quando não há correspondência amigável — checar se `position.name` está disponível e sendo perdido nessa função.

## 18. Arte do evento para compartilhar
Ref: `evolucoes/service_app/evento-share.jsx` · Prod: `app/service/EventoShare.tsx` (componente) + wiring em `ServiceExactApp.tsx:9,725,914-920`

- ✅ **O componente em si é uma reconstrução muito fiel**: mesmo layout de story 1080×1920 (`evt2-art`/`evt2-hero`/`evt2-prog`/`evt2-foot`), mesmo botão "↓ Baixar imagem" via `html-to-image`/`toPng` (equivalente ao `htmlToImage` da ref), mesmo "Copiar texto p/ WhatsApp" com a mesma formatação de texto (linhas com `◆`/`◇`/"Te esperamos. Traga alguém. →").
- ⚠️ Ref usa a **logo real da igreja** (`cexImg('igreja-logo')`) quando existe, caindo para texto só se não houver (`evento-share.jsx:9,71`); prod sempre usa `churchName` em texto (`EventoShare.tsx:113`), nunca renderiza uma logo/imagem.
- ❌ **Desconectado do fluxo principal do drawer do evento**: o componente é acionado corretamente a partir do botão "Arte" na **lista** de Cultos (`ServiceExactApp.tsx:1522`, via `setShareEventId`), mas o botão **"Setup da celebração" dentro do `EventDrawer`** (o caminho que a referência usa, `times.jsx:377,381`) abre um modal genérico de mensagem em vez de chamar `EventoShare` (ver item 5) — a peça existe, mas o ponto de entrada específico da ref não a aciona.

## 19. Relatórios
Ref: `evolucoes/service_app/relatorios.jsx` · Prod: `ServiceExactApp.tsx:2947-3013`

- ✅ Estrutura geral bate: KPI row, "Crescimento de membros" + "Funil de visitantes" lado a lado, seção "Termômetro de bem-estar", painel "Quem precisa de atenção", "Voluntários por ministério".
- ⚠️ **2 dos 4 KPIs trocaram de métrica e nenhum tem variação (delta)**: ref mostra Membros na rede / **Retenção de visitantes (%)** / Cobertura de escala / **Frequência média**, todos com "▲ X%" calculado (`relatorios.jsx:79-97`); prod mostra Membros na rede / **Visitantes ativos (contagem)** / Cobertura de escala / **Cultos na agenda (contagem)** (`ServiceExactApp.tsx:2995`), sem nenhum indicador de tendência.
- ❌ **Termômetro de bem-estar usa uma lógica diferente e com sobreposição indevida**: ref calcula `bemEstar(p)` combinando carga de escalas da semana, recusas, engajamento e status (férias/pausa), com um motivo textual específico por pessoa (`relatorios.jsx:6-28`); prod aproxima com `engagement`: `saudavel = ativo && engajamento>=70`, **`sobrecarga = ativo && engajamento>=90`** (`ServiceExactApp.tsx:2974-2977`) — isso faz **"sobrecarga" ser um subconjunto de "saudável"** (quem tem engajamento ≥90% conta nos dois grupos ao mesmo tempo), o que não corresponde ao conceito de sobrecarga da ref (estar escalado em 3+ posições na semana) e infla a contagem de ambos os grupos.
- ⚠️ "Quem precisa de atenção" mostra só 2 frases fixas ("Em pausa ou férias." / "Engajamento abaixo da média.", `ServiceExactApp.tsx:3002`) em vez do motivo específico calculado pela ref (ex: "Escalado em 3 posições nesta semana.", "Recusou escala e engajamento caindo.").
- ❌ **Painel "Membros por GC" (grupos de comunhão) ausente** (`relatorios.jsx:173-189`) — substituído por dois painéis não previstos na ref ("Jornada e formação", "Operação conectada") com barras calculadas por uma fórmula arbitrária `Math.max(8, count*18)%` (`ServiceExactApp.tsx:3008-3009`) em vez de normalizadas por um máximo real, o que pode estourar visualmente ou ficar despropositado conforme o número.

## 20. Configurações
Ref: `evolucoes/service_app/config.jsx` (872 linhas) · Prod: `ServiceExactApp.tsx:3015-3552` (`Config`, `CFG_TABS`, `MinisterioEditModal`)

- ✅ Boa parte das abas replicadas tem **persistência real no Supabase** (Igreja, Ministérios & funções, Papéis ministeriais, Frentes/tags, Grupos & Células) — evolução real em relação ao protótipo, que só mantém estado em memória.
- ❌ **2 das 9 abas da referência não existem em produção**: `CFG_TABS` da ref tem `Igreja, Ministérios & funções, Escala & presença, Grupos & Células, Espaços & Salas, Permissões, Acessos por pessoa, Personalização, Congregações` (`config.jsx:7-17`); a produção (`ServiceExactApp.tsx:3015-3023`) tem só 7 abas, **faltando "Espaços & Salas"** (embutir `<Espacos embed />` dentro de Config, `config.jsx:224-228`) **e "Acessos por pessoa" inteira** (`AcessosCard`, `config.jsx:524-586`: liberar telas extras pessoa-a-pessoa além do papel, e alternar quem pode delegar esses acessos).
- ❌ **"Escala & presença" está incompleta**: ref tem 4 cards (Regras de escala, **Status dos voluntários com steppers editáveis** de recusas/dias para inativar, **Configuração de check-in** com toggle "permitir presença extra", e **Tipos de evento** configuráveis, `config.jsx:129-135,331-414`); produção só tem "Regras de escala" (editável) e um card **"Status dos voluntários" que virou somente um texto/legenda fixa, sem steppers** (`ServiceExactApp.tsx:3430-3438`) — **não dá pra configurar** quantas recusas marcam "inativando"/"inativo", nem o "permitir presença extra" do check-in (confirmado: nenhuma ocorrência de `naRecusa`/`permitirExtra`/`TiposEventoCard`/`CheckinCfgCard` em todo `ServiceExactApp.tsx`), nem os tipos de evento customizáveis.
- ❌ **"Papéis ministeriais" perdeu o "elenco da frente"**: `TagsCard`/`TagElenco` da ref permite, ao clicar numa frente/tag, marcar **quem serve nela** e eleger um **"líder da frente"** (estrela, `config.jsx:599-639`); produção só cria/remove o nome e a cor da tag (`ServiceExactApp.tsx:3342-3358`), sem o picker de elenco nem líder de frente.
- ⚠️ **"Regras de escala" e a matriz de permissões salvam só no `localStorage` do navegador** (`ServiceExactApp.tsx:3192-3229`), não no banco — ao trocar de computador/navegador, cada administrador vê configurações diferentes, e não há nada compartilhado entre quem administra a mesma igreja.
- ❌ **Aba "Congregações" é só leitura**: ref tem "Gerir" (abre `CongDrawer`) por congregação e "+ Adicionar congregação" (`config.jsx:298,311,314`); produção só lista as congregações, sem nenhum botão de ação (`ServiceExactApp.tsx:3515-3543`).
- ❌ **Personalização sem upload de logo**: falta o card "Marca da sua igreja" com `ImgUpload` do logotipo (`config.jsx:208-219`) — produção só tem Tema + Cor de destaque (`ServiceExactApp.tsx:3483-3512`).

## 21. Identidade da igreja
Ref: `evolucoes/service_app/igreja.jsx:39-166` · Prod: `ServiceExactApp.tsx:3553-3620`

- ✅ Estrutura de hero/propósito/visão + valores + "tema do ciclo do ano" bate, incluindo criação de novo ciclo com formulário completo.
- ⚠️ **Regra "campo vazio não aparece" não é seguida**: a ref só renderiza cada bloco (propósito/missão/visão/valores) `se houver conteúdo` (`igreja.jsx:60,69,76,85`); produção sempre mostra os cards com textos de fallback tipo "Ainda não definido. Toque em Editar..." (`ServiceExactApp.tsx:3574,3579`) e até um texto institucional genérico hardcoded na "Declaração de missão" quando não há dado (`3566`) — inconsistente com o texto/tom aprovado pela referência.
- ❌ **Sem "Editar ciclo" do ciclo vigente**: ref permite editar o ciclo ativo existente (`edit==='ciclo'`, `igreja.jsx:102,152-162`); produção só tem "+ Novo ciclo" (`ServiceExactApp.tsx:3616`), sem like para editar o que já está cadastrado.

## 22. História da igreja
Ref: `evolucoes/service_app/igreja.jsx:168-234` · Prod: `ServiceExactApp.tsx:3622-3652`

- ✅ Estrutura em mural alternado (`hist-item`/`rev`) com ano, título e texto bate.
- ❌ **Sem foto real por capítulo**: ref usa `image-slot` (upload de imagem de verdade, `igreja.jsx:193`); produção substitui por um **gradiente CSS decorativo** fixo, sem upload nenhum (`ServiceExactApp.tsx:3637`).
- ❌ **Falta o campo "Link (opcional)"** com "Ver mais →" em cada capítulo (`igreja.jsx:200,217`) — ausente no marco da produção.
- ⚠️ Terminologia mudou de "capítulo" (ref: "+ Adicionar capítulo", "Capítulo de {ano}") para "marco" (prod: "+ Marco", "Marco histórico") — nome diferente do aprovado.

## 23. Onboarding do membro / 1º login
Ref: `evolucoes/service_app/onboarding.jsx` · Prod: `app/service/MobileApp.tsx:1048-1189` (`Onboarding`, dentro do fluxo `MobileMembro`)

- ✅ **Ao contrário do apontado numa auditoria anterior, o onboarding do membro existe** — foi reconstruído dentro de `MobileApp.tsx`, acionado a primeira vez que se abre "Ver app do voluntário/membro" (`MobileApp.tsx:1216-1225`, checando `localStorage cex_onboarded_<id>`). Os 4 passos (Bem-vindo → Seus dados → Sua foto → Crie sua senha), textos, validações (`d.nasc` obrigatório, senha ≥4 caracteres e confere) e progress dots batem quase palavra por palavra com a referência.
- ❌ **Nada do que a pessoa preenche é salvo**: `email`, `nasc`, `bairro`, a foto e a nova senha só ficam em `useState` local — ao concluir, o código só grava a flag `cex_onboarded_<id>` no `localStorage` (`MobileApp.tsx:1147`) e descarta os dados digitados. A ref ao menos atribui de volta para o objeto do membro em memória (`membro.nasc = d.nasc`, etc, `onboarding.jsx:16-23`); a produção não persiste em lugar nenhum, nem local nem no Supabase.

## 24. App do voluntário/membro (mobile)
Ref: `evolucoes/service_app/mobile.jsx` (795 linhas) · Prod: `app/service/MobileApp.tsx` (arquivo completo)

- ✅ Cobertura ampla e fiel: abas Início/Escala/Tarefas/Conversas/Visitantes(recepção)/Cursos/Perfil existem com a mesma lógica de troca Cursos↔Visitantes conforme a pessoa é da recepção (`isRecepPerson`). `TabEscala` reproduz muito de perto confirmar/recusar/pedir troca e marcar disponibilidade.
- ❌ **Mover tarefa do quadro deixou de funcionar no app**: ref permite tocar em qualquer coluna do card para mover a tarefa de fato (`mover(c, colId)`, `mobile.jsx:205-211,231-233`); produção mostra as colunas como **chips somente leitura, sem `onClick`** (`MobileApp.tsx:429-433`) — o voluntário não consegue mais atualizar o andamento da própria tarefa pelo celular.
- ❌ **Comentário de tarefa no app é descartado ao fechar**: `savedComments` é só `useState` local (`MobileApp.tsx:397,406`), nunca gravado no Supabase — diferente do comentário equivalente no Kanban do admin (`CardDrawer`, item 14), que **é** persistido em `card_comments`. Ou seja, um comentário feito pelo voluntário no app nunca chega à liderança no quadro.

## 25. Menu lateral / navegação
Ref: `evolucoes/service_app/shell.jsx:199-260` · Prod: `ServiceExactApp.tsx:750-826`

- ✅ Mesmos grupos e itens (Visão geral, Pessoas, Jornada, Operação, Gestão, Nossa igreja), mesmos badges/contadores por item, `IgrejaLogo`, `CongSwitcher` e rodapé (site público / sair).
- ❌ **"Espaços & reservas" é uma tela inatingível**: o componente `Espacos` e a rota `route==='espacos'` existem e funcionam (`ServiceExactApp.tsx:865`), mas **nenhum botão em lugar nenhum leva até lá** — não está no menu lateral (`nav`, `750-794`, que aliás bate com a ref, pois na ref "Espaços" também não é item do menu) **e também não está na aba "Espaços & Salas" de Configurações, porque essa aba foi omitida** (ver item 20). Ou seja, ao contrário da referência (que alcança Espaços via Config), a produção não tem NENHUM caminho de navegação até essa tela.
- ❌ **Menu não filtra por papel/perspectiva**: a ref filtra os itens visíveis com `window.cexPodeVer(it.id)` por papel (`shell.jsx:243`); a produção sempre mostra a lista `nav` inteira, sem nenhum filtro condicional — qualquer usuário vê todos os 19 itens.

## 26. Sistema de permissões de 4 níveis (`PAPEIS_V2`)
Ref: `evolucoes/service_app/config.jsx` (`PapeisCard`, `AcessosCard`) + `shell.jsx` (`cexPodeVer`/`cexView`/`cexScopeTimes`) · Prod: `ServiceExactApp.tsx:3025-3061` (`PAPEIS_V2`/`ACOES_V2`/`MatrizV2`) + tela em `Config` (`3442-3480`)

- ✅ A **matriz em si** (4 papéis × ~16 funcionalidades, agrupadas, com o Master travado em acesso total) existe, é editável e corresponde ao pedido do commit "Adiciona matriz de permissões (PAPEIS_V2)".
- ❌ **A matriz não é lida em lugar nenhum além da própria tela onde é editada.** Busquei todas as leituras de `matriz[...]` no arquivo inteiro e a única ocorrência é dentro do próprio `Config` (`ServiceExactApp.tsx:3463`, para desenhar os `✓`). Nada no menu lateral, nas Escalas, no Kanban (item 14), nas Conversas ou em qualquer botão de ação consulta essa matriz para liberar/bloquear algo — a "permissão" é só uma checklist visual, sem nenhum efeito real no app.
- ❌ **Sem "perspectiva" (view as)**: a ref tem `window.cexView()`/`cexScopeTimes()`/`cexPodeVer()`, que fazem o app inteiro reagir a "estou vendo como Direção" vs "estou vendo como líder do time X" (filtra menu, filtra times nas Escalas, restringe ações no Kanban, filtra Conversas). O `ViewSwitcher` da produção (`ServiceExactApp.tsx:593-639`) tem a mesma UI de troca de perspectiva, mas o estado `view` escolhido **só muda o texto do próprio botão** — não é passado para nenhum outro componente da árvore, então trocar para "Líder de Louvor" não filtra nada em lugar nenhum do app.
- ❌ **Falta a camada de "Acessos por pessoa"** (delegação individual além do papel, `AcessosCard`) — ver item 20.
- ⚠️ A matriz salva só em `localStorage` (`cex_matriz_v2`), não no banco — não é uma permissão real de sistema multiusuário, é uma preferência do navegador de quem a editou por último.

---

**Status: Auditoria completa (telas 1-26) concluída.** Ver resumo executivo abaixo.

## Resumo executivo

O padrão que se repete em quase todo o sistema: **as telas de cadastro/leitura de dados (Membros, Pessoas, Times, Visitantes, Decisões, Batismos, Cursos, Reuniões, Ensaios, Kanban) foram bem reconstruídas e, em vários casos, já persistem de verdade no Supabase** — inclusive superando o protótipo em alguns pontos (Kanban com comentários reais, Decisões com fluxo completo). Já **as telas operacionais mais "vivas" do protótipo — Escalas, Check-in por QR, Comunicação (leitura), Conversas e o sistema de permissões/perspectiva — perderam a maior parte da interatividade real**: os botões existem visualmente, mas em vez de executar a ação (confirmar, recusar, delegar, filtrar por papel, marcar leitura), a maioria abre um modal genérico de texto livre que não persiste nada, ou não faz nada. O sistema de permissões de 4 níveis existe como matriz editável, mas não é consultado por nenhuma outra parte do app. Duas telas descritas nos handoffs (Onboarding do membro, Arte do evento) existem e são bem fiéis, mas estão parcialmente desconectadas dos pontos de entrada esperados (onboarding não persiste dados; arte do evento não é acionada pelo botão do drawer do culto). "Espaços & reservas" ficou sem nenhum caminho de navegação até ela.
