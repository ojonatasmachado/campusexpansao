# MANIFESTO · Ajustes do Service (v7) · para o Claude Code

Data: 06/10/2026. Base: estudo `prints/service-2026-10-05` (commit 539a83d). Referência visual para pessoas: `Service - Analise e Evolucao v2.html`, no projeto de design CE.X (fora do repositório). Este manifesto basta para executar.

## 0. Como usar

- Leia `AGENTS.md` antes de tudo. Este manifesto não revoga nada de lá; acrescenta a seção do Service.
- Execute por etapa, na ordem: 1 (lei) → 2 (consertos) → 3 (leitura) → 4 (estrutura) → 5 (medição). Um commit por item, com o número do item na mensagem.
- Atalho: `/service-v7 <etapa>` (comando em `.claude/commands/service-v7.md`). O estado fica em `docs/service-v7/PROGRESSO.md`.
- Ao fim das etapas 2 a 5, rode a captura de `docs/service-v7/CAPTURA.md` numa pasta nova com a data do dia e compare com o estudo de 05/10. A etapa só fecha quando os critérios de pronto batem.
- Não mude o que não está listado. Textos de interface sem travessão. Item travado vai para Bloqueios em `docs/service-v7/PROGRESSO.md`, com o motivo.

## 1. Lei permanente: arquitetura de módulos (primeira tarefa)

Grave esta lei antes de mexer em tela:
1. Acrescente ao `AGENTS.md` a seção "11. Service: módulos" com as 12 leis abaixo e o caminho deste manifesto (`docs/service-v7/MANIFESTO.md`).
2. Crie `app/service/modules/README.md` com as leis e o checklist "Criar um módulo novo".
3. Crie `app/service/modules/_modelo/` com um manifesto de exemplo comentado.
4. Confirme que o `CLAUDE.md` da raiz continua com `@AGENTS.md`. É ele que faz o Claude Code carregar a lei em toda sessão.

Daqui em diante, toda função nova do Service nasce como módulo. Tela, item de menu, aba de configuração, cartão ou notificação criados fora do registro não entram.

### As 12 leis

1. **Casca estável.** App do membro: 4 abas (Início, Agenda, Mensagens, Caminhada) e avatar no topo, que abre o Perfil. Painel: menu, barra e busca. A casca não muda quando entra função nova; só oferece lugares: `inicio.fila`, `inicio.igreja`, `agenda.minha`, `agenda.igreja`, `mensagens.itens`, `caminhada.secoes`, `perfil.linhas`, `painel.menu`, `painel.inicio.saude`, `painel.inicio.pendencias`, `painel.config`, `busca`.
2. **Uma pergunta por lugar.** Início: o que pede minha atenção agora? Agenda: quando e onde? Mensagens: quem falou comigo? Caminhada: como estou crescendo? Perfil: quem sou e como prefiro? Função nova entra onde responde à mesma pergunta.
3. **Registro único.** `app/service/modules/registry.ts` lê os manifestos e filtra por igreja (módulo ligado), papel, permissão e dependências. `NAV_GROUPS`, `CFG_TABS` e `MEMBER_MODULES` passam a ser gerados por ele.
4. **Manifesto por módulo** (`defineModule`): `id`, `liga` (padrão por igreja), `depende` (sem a dependência, o módulo some), `permissoes`, `membro` (`visivel` e lugares), `painel` (`menu`, `inicio`, `config`), `avisos` (tipo, público, cartão, quando), `rotas` (QR e link público), `vocabulario` (termos renomeáveis que usa), `historico` (fatos que grava na história da pessoa).
5. **Contrato do cartão.** Seis tipos: `acao`, `passo`, `evento`, `aviso`, `pedido`, `destaque`. Campos: `id`, `modulo`, `tipo`, `prioridade` (0 a 100), `prazo`, `contexto`, `titulo`, `linhas`, `principal`, `secundaria` (no máximo duas ações), `resolvido` (título e Desfazer). A casca ordena por prioridade e prazo, mostra até 3 na primeira dobra e dá botão cheio só ao primeiro. Resolvido segue o modelo da confirmação de escala: o cartão muda, oferece Desfazer e sai da fila. Fila vazia mostra "Tudo em dia".
6. **Nenhum beco sem saída.** Toda entrada declara do que depende (destinatário, conteúdo, turma aberta). Sem a dependência, a entrada não aparece. Teste automático falha com botão sem ação, rota sem entrada no menu ou convite que leva a botão desabilitado.
7. **Vocabulário da igreja.** Nenhum texto de interface escreve fixo um termo renomeável; usa `termo("caminhada")`. Termos iniciais: Caminhada, Grupo, Culto, Voluntário. Cada termo tem nome da tela (até 24 caracteres) e nome curto da barra (até 10). O código usa o nome interno e a busca encontra os dois.
8. **Tipografia, cor e toque.** Tokens únicos. App: 13, 15, 17, 20, 28. Painel: 12, 13, 14, 16, 20, 32. Mínimo de 13px no app e 12px no painel, sem meio pixel. Mono só para números que alinham e para o sobretítulo do painel; caixa alta só nesse sobretítulo. Alvos de 44px no app e 32px no painel (piso de 24px). A cor de destaque da igreja vai em uma ação por tela e na aba ativa. Todo tamanho deriva da escala do texto da pessoa (seção 7).
9. **Notificação = ação.** Cada aviso corresponde a um cartão. Categorias que a pessoa desliga: Escala, Mural, Mensagens, Caminhada. Silêncio das 22h às 7h. Mural chega em resumo. Permissão de notificação pedida depois da primeira escala confirmada.
10. **Histórico, sem gamificação.** Módulos gravam fatos numa linha do tempo da pessoa: serviu, faltou, trocou, concluiu aula ou curso, batizou, entrou em grupo. O membro vê o próprio, o líder vê o do seu time, gestão e pastores veem de todos. Proibido: ranking, medalha, sequência de dias, pontos ou percentual de engajamento sobre pessoas.
11. **Medição padrão.** Todo cartão emite `card_shown`, `card_acted`, `card_dismissed`; todo aviso emite `notification_sent` e `notification_opened`. Métricas: semanas com participação, vagas cobertas 48h antes do culto, minutos para fechar a escala da semana, visitantes contatados em 48h.
12. **Qualidade verificada por máquina.** A captura roda a cada versão e falha com texto abaixo do mínimo, alvo abaixo de 24px, contraste pior que a versão anterior, rolagem lateral, erro de console ou botão sem ação.

### Checklist: criar um módulo novo

- [ ] Pasta em `app/service/modules/<id>/` com `manifest.ts` a partir de `_modelo/`.
- [ ] Respondi em qual lugar ele mora (lei 2) e quais lugares ocupa (lei 1).
- [ ] Declarei permissões, dependências e o padrão de liga/desliga por igreja.
- [ ] Cartões usam um dos seis tipos; avisos têm categoria e cartão correspondente.
- [ ] Textos usam `termo()` para os termos renomeáveis e os tokens de fonte.
- [ ] Fatos que vão para o histórico estão declarados.
- [ ] Captura das telas novas passa nos testes da lei 12.

## 2. Decisões fechadas em 06/10

1. **Destaque da igreja.** É um cartão `destaque`: imagem 16:9 ou capa, título, duração, público e prazo. A igreja publica pelo Mural com "Destacar no Início até…". Um destaque por vez, parado, sem carrossel. Vídeo do YouTube ou do Instagram incorporado a partir do link colado; envio de vídeo próprio fica para depois. Artigo abre dentro do app. Fica em "Da igreja", abaixo das pendências, e sobe para o topo quando a fila está vazia.
2. **Início em duas zonas.** "Para você agora" (fila) e "Da igreja" (destaque e eventos da semana, até 3 itens).
3. **Eventos.** Clicáveis. Cada evento declara o que pede: só aviso, confirmar presença ou inscrição. Com valor, mostra o valor e as instruções escritas pela igreja (chave PIX, prazo, contato); o app não recebe nem confirma pagamento. Quem serve vê "Serve · função · chegar HH:MM". Compartilhar envia o link público pelo WhatsApp; Adicionar ao calendário gera `.ics`.
4. **Histórico** conforme a lei 10. Gestão e pastores veem de todos.
5. **Agenda.** "Minha agenda" reúne tudo que envolve a pessoa, por dia, com o tipo escrito ao lado: Serve, Ensaio, Reunião, Aula, Tarefa, Evento, Culto. Conflito de horário aparece marcado. "Você não está na escala" é texto discreto, só para voluntários. "Igreja" mostra a programação pública.
6. **Vocabulário** conforme a lei 7, começando por Caminhada, Grupo, Culto e Voluntário. "Inscrições abertas" vira cartão só para quem ainda não fez aquela etapa.
7. **Tarefas.** No Início enquanto abertas e na Agenda no dia do prazo. Sem aba nova.
8. **Tamanho do texto com o componente do iPhone**, em sete posições, de 14 a 23px no corpo do texto (seção 7).
9. **Painel por papel.** Gestão e pastores abrem na Saúde da igreja (padrão de 30 dias); líder de time abre no "Para resolver" do seu time.
10. **Configuração guiada em 3 fases**, com tempo estimado, da igreja e da criação de culto (item 4.12).
11. **Do estudo:** 4 abas e avatar; Início como fila; escala de fonte da lei 8; nenhum beco sem saída; primeiro acesso em 2 passos; registro de módulos começando por Escalas.
12. **Cobertura por time** em cada culto (item 4.16).
13. **Lista de cuidado** com quem está ausente (item 4.17).
14. **Lembrete do aviso** só para quem não viu (item 4.18).
15. **Saudação com o contexto do dia** (item 4.19).
16. **Financeiro, patrimônio e site da igreja:** planejar para depois (seção 9).

## 3. Etapa 2 · Consertos

| # | Onde | Hoje | Fazer | Pronto quando |
|---|---|---|---|---|
| 2.1 | Início e Caminhada do membro; `TabCursos` em `MobileApp.tsx` (l.1316) | "Continuar →" sem onClick | O cartão mostra o próximo passo real: aula, dia, sala e "presença por QR na aula". Botão só se houver conteúdo para abrir | Nenhum Continuar sem destino |
| 2.2 | Cursos | Concluir aula só por QR (`/service/aula-checkin`) | Manter o QR. A aula aparece na Agenda e no cartão, com a instrução | Membro sabe como concluir sem sair do app |
| 2.3 | Minha família | Check-in da criança só pela rota `/service/kids-checkin` | No dia do culto, cartão no Início com o check-in de cada filho e a hora em que abre; botão também em Minha família | Jornada M8 faz check-in pelo app |
| 2.4 | Pedir troca (M3) | "Não achamos o líder do time" | Destinatário em cadeia: líder do time, depois coordenação do ministério, depois gestão. Opção de oferecer a vaga a quem faz a mesma função e está disponível | M3 termina com conversa criada |
| 2.5 | Pedido de oração (M5) | Enviar desabilitado | Mesma cadeia (intercessão, depois gestão). Sem ninguém para receber, o convite não aparece. O pedido mora em Mensagens | M5 envia |
| 2.6 | Relatórios | "Trimestre" e "Baixar relatório →" sem onClick | Implementar ou remover | Nenhum botão inerte |
| 2.7 | Decisões por Jesus (`ServiceExactApp.tsx`, perto da l.5105) | Rota sem entrada no menu | Entrada em Pessoas › Decisões, pelo registro | Alcançável por clique |
| 2.8 | Menu do líder | Pessoas não aparece | Menu por permissão: líder vê as pessoas do seu time | Líder chega em Pessoas |
| 2.9 | Início do painel, Próximos cultos | Em 05/10 listou 30/09, 03/10 e 04/10; "Culto de domingo" num sábado | Filtrar a partir de agora, no fuso da igreja; conferir o rótulo do dia | Só datas futuras, dia correto |
| 2.10 | Janela Escalar vaga | "captura" sobre "já escalado neste evento"; "Verde: disponível" com selo azul | Corrigir sobreposição; instrução igual ao selo; tirar "captura" e "% engajamento" | Sem sobreposição; sem jargão |
| 2.11 | Painel no celular | Botão "?" cobre o texto do cartão Visitantes | Reservar espaço inferior ou mover o botão | Nada coberto |
| 2.12 | Mural | Ordem fora do tempo; "hoje/Hoje", "para Todos/todos" | Ordem por publicação, mais recente primeiro; caixa padronizada | Ordem cronológica |
| 2.13 | Console | Detalhe de Reuniões (celular e computador); envio de logo (L6) | Corrigir os 4 erros | 0 erros |
| 2.14 | Perfil › Tamanho do texto | Ao trocar, a tela se mexe | Correção imediata: guardar a posição do controle antes de aplicar e rolar depois para mantê-lo no lugar. Componente final na seção 7 | Controle parado ao trocar |
| 2.15 | Barra do app | Agenda segue com selo 1 depois de confirmar (M2) | Atualizar o selo junto com a ação | Selo correto |
| 2.16 | Pessoas | Situação = NOVO nos 35; "Novos 35" = "Todos 35"; "31 novos este mês" de 31; nome duplicado com mesmo telefone; telefones em 3 formatos | Conferir a regra de "novo"; aviso de possível duplicado ao cadastrar; telefone guardado num formato só e exibido como (11) 98000-1000 | Coluna diferencia pessoas; sem duplicado silencioso |

## 4. Etapa 3 · Leitura

- 3.1 Aplicar os tokens da lei 8 no app e no painel. Remover 11, 11,5, 12,5 e 13,5px.
- 3.2 Mono e caixa alta só onde a lei 8 permite. Rótulos de seção do app em frase, 15/600: "Para você agora", "Da igreja".
- 3.3 Cor de destaque: nome da saudação em tinta, sem itálico (painel e app iguais); rótulos de cartão em tinta secundária; um botão cheio por cartão.
- 3.4 Contraste: cartões travados sem opacidade, texto com contraste mínimo de 4,5:1. Meta: zero nós com contraste insuficiente no app do membro.
- 3.5 Alvos: 44px no app, 32px no painel. Permissões tinha 137 alvos abaixo de 44px.
- 3.6 Início do painel: nome da tela uma vez; cada número uma vez; "Como calculamos" vira um link só, "Sobre estes números"; grade com colunas iguais; ações em botão Inter 14/600.
- 3.7 Pessoas: Caminhada com legenda; coluna Situação útil (ver 2.16).

## 5. Etapa 4 · Estrutura

- 4.1 **Registro de módulos** (leis 3 e 4). Criar `app/service/modules/`, mover `MEMBER_MODULES`, gerar `NAV_GROUPS` e `CFG_TABS`. Extrair Escalas de `ServiceExactApp.tsx` primeiro, depois Pessoas e Mural, comparando os prints da jornada antes e depois. Liga/desliga por igreja no banco, no mesmo desenho de `ministries.app_modules`.
- 4.2 **4 abas e avatar.** Perfil sai da barra e abre pelo avatar, que mostra o rótulo "Perfil" no primeiro acesso. Validar com 5 membros acima de 60 anos antes de fechar.
- 4.3 **Início do membro** em duas zonas (decisão 2). O culto em que a pessoa serve aparece uma vez, com o selo "Você serve".
- 4.4 **Destaque** (decisão 1). No painel: Mural › nova publicação › "Destacar no Início até…", com público, prazo, imagem com texto alternativo e link de vídeo (YouTube ou Instagram).
- 4.5 **Agenda** (decisões 3 e 5), com o detalhe do evento numa área de ação única.
- 4.6 **Tarefas** (decisão 7). A seção vazia "Tarefas com você · 0 abertas" deixa de existir.
- 4.7 **Caminhada** com o nome do vocabulário e cartão "Inscrições abertas" segmentado.
- 4.8 **Histórico** (lei 10). "Minha história" no Perfil; linha do tempo na ficha da pessoa no painel; janela Escalar com "serviu há X · N vezes no mês".
- 4.9 **Tamanho do texto** (seção 7).
- 4.10 **Primeiro acesso em 2 passos:** confirmar nome e telefone; tamanho do texto com prévia. Termina na escala pendente ou no próximo culto. Foto, CEP e aniversário viram cartão "Complete seus dados". Atalho na tela de início pedido no segundo acesso.
- 4.11 **Painel por papel** (decisão 9). Saúde da igreja: período 30 dias (padrão), 90 dias, 12 meses ou datas escolhidas, comparado ao período anterior. Base: membros registrados, servindo em times, em grupos. Período: visitantes, integrados, decisões, batismos, em cursos, concluíram. As etapas seguem a Caminhada configurada. Cada número abre a lista de pessoas. "Para resolver" logo abaixo.
- 4.12 **Configuração guiada em 3 fases.** Assistente que dá para pular e retomar, com o tempo estimado de cada fase na tela (ponto de partida: 3, 5 e 5 minutos; ajustar depois de testar com 5 igrejas).
  - Fase 1 · Sua igreja: dados (o CEP preenche o endereço), logo e cor com prévia do app.
  - Fase 2 · Cultos e times: horários comuns em botões; times a partir de modelos (Louvor, Recepção, Kids, Mídia, com funções).
  - Fase 3 · Pessoas: líderes convidados por WhatsApp, com link e código; primeira escala.
  Cada fase termina num resumo em frase, por exemplo "Vamos criar 13 cultos de quarta até dezembro, cada um com 8 vagas." Criação de culto no mesmo estilo. No Início do painel, "Sua igreja: fase 2 de 3 · cerca de 10 minutos" até completar, no lugar do tour.
- 4.13 **Vocabulário** em Configurações › Personalização (lei 7).
- 4.14 **Escalar vaga:** busca, filtro "Disponíveis", "Sugeridos pelo rodízio" com histórico, e quem já está escalado agrupado, com o motivo em texto legível.
- 4.15 **Mensagens:** cada conversa com nome e foto (ou iniciais), última fala, tempo relativo e não lidas em negrito com contagem.
- 4.16 **Cobertura por time.** Cada culto mostra quantas vagas cada time já preencheu: "Louvor 5/5 · Recepção 3/4 · Projeção 2/2". Aparece em Próximos cultos e em Para resolver no Início do painel, na lista de Escalas e no detalhe do culto. Time incompleto vem primeiro e abre direto as vagas abertas. Líder de time vê só o seu. Leitor de tela: "Recepção, 3 de 4 vagas preenchidas".
- 4.17 **Lista de cuidado.** Módulo novo, que depende de presença registrada (check-in do culto, do grupo ou da escala); sem isso, não aparece (lei 6). Quem passa 3 semanas ou mais sem presença (prazo ajustável em Configurações) entra na lista de quem cuida: líder do grupo, depois líder do time, depois pastoral. Cada nome vira cartão "Ana Souza · sem presença há 4 semanas", com "Registrar contato" (ligação, mensagem ou visita) e "Ausência justificada" (sai da lista por 30 dias). O contato vai para o histórico como fato. O membro nunca vê essa marcação. Na Saúde da igreja, o número "Ausentes há 3 semanas ou mais" abre a lista. O bloco atual "Crianças sumindo" passa a ser uma visão desta lista.
- 4.18 **Lembrete do aviso.** Ao publicar no Mural, opção "Lembrar quem não viu" em 24h, 48h ou numa data. O lembrete vai só para quem não abriu, uma vez por aviso, respeitando o silêncio das 22h às 7h. O painel mostra "vista por 38 de 52 · lembrete amanhã às 9:00 para 14 pessoas". Usa o registro de leitura que já existe.
- 4.19 **Saudação com o contexto do dia.** No app do membro, abaixo da saudação, uma linha com o mais relevante de hoje, nesta ordem: serve hoje ("Você serve hoje às 20:00 · chegar 19:00"), culto hoje, grupo hoje, aula hoje; sem nada, a data. No painel: "Semana de 5 a 11 de outubro" e o próximo culto com a cobertura ("Culto de quarta em 2 dias · faltam 6 vagas").

## 6. Etapa 5 · Medição

- 5.1 Eventos padrão da lei 11 em todos os módulos.
- 5.2 Painel de métricas internas: semanas com participação, vagas cobertas 48h antes, minutos para fechar a escala, visitantes contatados em 48h, % com notificações desligadas.
- 5.3 Notificações por categoria, silêncio das 22h às 7h, resumo do mural, permissão depois da primeira escala confirmada (lei 9).
- 5.4 Testes automáticos da lei 12 ligados a cada versão.

## 7. Especificação: tamanho do texto com o componente do iPhone

Referência: iPhone, Ajustes › Tela e Brilho › Tamanho do Texto. Mesmo componente e as mesmas sete posições. Os tamanhos de acessibilidade do iPhone, acima de 23, ficam de fora.

- **Hoje.** `app/service/lib/text-scale.ts`: três valores (1, 1,15 e 1,3), guardados só no aparelho (`cex_text_scale`) e aplicados por `--m-scale` em `service-v6.css`; a barra de abas cresce no máximo 1,15.
- **Posições.** Sete, com a padrão na quarta. Corpo de texto: 14, 15, 16, **17**, 19, 21 e 23px. O fator de cada posição é o corpo dividido por 17 (de 0,82 a 1,35) e continua aplicado por `--m-scale` a todos os tokens. Guardar a posição (0 a 6), não o fator. Piso de 13px; barra de abas limitada a 16px.
- **Componente.** Igual ao da Apple: prévia no alto (frase de exemplo e um cartão real do app) e, embaixo, "A" pequeno à esquerda, "A" grande à direita, trilho com sete marcas e um botão redondo de arrastar. Funciona arrastando ou tocando numa marca. As duas letras também funcionam como − e +: único acréscimo ao desenho da Apple, exigido pela WCAG 2.2 (critério 2.5.7, alternativa ao arrasto). Para leitor de tela: `role="slider"` e `aria-valuetext` como "Padrão, 4 de 7".
- **Onde aparece.** Perfil › Tamanho do texto, numa folha fixa na parte de baixo, e no passo 2 do primeiro acesso.
- **Ancoragem.** O controle não se move durante a troca; só a prévia e o conteúdo atrás mudam. Ao fechar, a rolagem volta ao ponto anterior.
- **Na maior posição (23px).** Pares de botões que não couberem empilham, linhas com data viram coluna e títulos quebram linha em vez de cortar com reticências.
- **Gravação.** A posição fica no perfil da pessoa, no banco, com cópia no aparelho. Valor inicial: o do perfil. Sem perfil, e se o navegador informar o tamanho do sistema (no Safari, a fonte `-apple-system-body`), usar a posição mais próxima dele dentro de 14 a 23. Migração: quem tinha 1,15 vai para 19px; quem tinha 1,3 vai para 23px.
- **Pronto quando** Início, Agenda, Mensagens, Caminhada e Perfil passam nas 7 posições sem texto cortado, sem rolagem lateral e com o controle parado durante a troca.

## 8. Verificação final

- Captura completa refeita e comparada com 05/10.
- 0 becos sem saída, 0 botões inertes, 0 erros de console, 0 rolagem lateral.
- 0 textos abaixo do mínimo (13px no app, 12px no painel).
- Jornadas M1 a M9 e L1 a L6 completas, sem ressalva além das de dados do seed.
- Jornadas novas capturadas: L7 configurar a igreja, L8 ver a Saúde da igreja, M10 trocar o tamanho do texto nas 7 posições, M11 abrir um destaque com vídeo, L9 registrar contato pela lista de cuidado, L10 publicar aviso com lembrete para quem não viu.
- `AGENTS.md` com a seção 11 e `app/service/modules/README.md` presentes.

## 9. Para depois (não executar agora)

Registrados para entrar como módulos, pela lei da seção 1, quando forem priorizados:
- **Financeiro:** dízimos e ofertas, campanhas, prestação de contas, tesouraria com permissão própria.
- **Patrimônio:** bens e equipamentos, empréstimos.
- **Site da igreja:** a partir da Página da igreja que já existe (Comunicação › Página da igreja).
- **Pagamento integrado** de inscrições, no lugar das instruções da igreja.
- **Envio de vídeo próprio** para o Destaque.
