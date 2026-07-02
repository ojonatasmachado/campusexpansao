# Auditoria — app/service (construído) vs evolucoes/service_app (referência)

Comparei linha a linha os dois lados. O app construído (`app/service/ServiceExactApp.tsx`
e managers) foi feito a partir de uma versão ANTIGA do protótipo e ficou pra trás em
vários incrementos, não só o menu Jornada. Lista do que falta ou está incompleto:

## 0. BUG CRÍTICO — CSS do Service vazado no CSS do site inteiro
Achei a causa exata do problema visual do print (cards de "Voluntários mais engajados"
com layout quebrado, em escada). É um bug de arquivo, não de "versão antiga":

Em `app/loja.css` (o CSS global do SITE inteiro, carregado em toda página via
`app/layout.tsx`), tem um bloco de **~1000 linhas** (por volta das linhas 2085–3140)
que é uma cópia colada do CSS do Service. Só que o find-replace que tentou "escopar"
essas regras com `.service-exact` saiu errado: toda linha de COMENTÁRIO virou
`.service-exact /* título da seção */`, mas a regra de verdade logo abaixo **ficou
sem o prefixo**. Exemplos reais encontrados no arquivo:

```css
.service-exact /* ════════ PANEL ════════ */
.panel { background:var(--graphite); ... }        /* ← global, deveria ser .service-exact .panel */
.service-exact .panel-head { ... }                 /* ← este aqui ficou escopado certo */
...
.service-exact /* listrinhas internas */
.mini-row { display:flex; align-items:center; gap:13px; padding:13px 22px; ... }  /* ← global */
```

Isso significa que classes genéricas do Service — `.panel`, `.mini-row`, `.bar`,
`.bar-fill`, `.btn`, `.ph-title`, `.toolbar`, `.gap-row` e várias outras — estão
**vazando sem escopo para o site inteiro** (materiais, checkout, admin, qualquer
página que carregue `loja.css`), E ao mesmo tempo colidindo com o CSS real do
Service (`evolucoes/service_app/service.css` + `service-v2.css`, carregados à
parte em `app/service/layout.tsx`). Duas fontes de CSS parcialmente
sobrepostas para as mesmas classes = layout quebrado tipo o do print.

**Correção:** apagar esse bloco inteiro (~2085–3140) de `app/loja.css` — o Service
não deveria ter NENHUM CSS em `loja.css`, ele já carrega `service.css` +
`service-v2.css` sozinho via `app/service/layout.tsx`. Depois, checar se sumir
esse bloco quebra alguma página do site que dependia acidentalmente dessas classes
vazadas (não deveria, mas confirmar visualmente materiais/checkout/admin).

## 1. Menu Jornada
Built ainda lista "Decisões" no menu lateral. Na referência atual, "Decisões" saiu do
menu — vira acessível por dentro de Membros/Visitantes (a tela/dado continua existindo).

## 2. App do voluntário/membro (mobile) — AUSENTE
Referência: `mobile.jsx` (795 linhas) — um app completo com login por persona, abas
Início / Escala / Tarefas / Conversas / Visitantes(recepção) / Cursos / Perfil, jornada
visual, confirmar/recusar/trocar escala, tarefas do quadro com comentários, chat,
inscrição em batismo e cursos, edição de dados, pedidos de oração.
Built: o botão "Ver app do voluntário" (`ServiceExactApp.tsx:778`) não tem `onClick` —
é decorativo, não abre nada.

## 3. Check-in por QR Code — AUSENTE
Referência: `checkin.jsx` (520 linhas) — QR único por culto/aula, geração de PNG,
impressão, validação de janela/duplicidade/escalado, presença ao vivo, presença extra,
tela de resultado ao escanear (para voluntário e para aluno de curso).
Built: nenhuma ocorrência de QR/checkin em todo `app/service/`.

## 4. Arte do evento para compartilhar (story 1080×1920) — AUSENTE
Referência: `evento-share.jsx` — gera imagem PNG do evento (programação, equipes,
repertório) + botão "copiar texto pronto pro WhatsApp".
Built: nenhuma ocorrência.

## 5. Editor de curso rico — AUSENTE (curso é só um modal genérico)
Referência: `curso-editor.jsx` (291 linhas) — modalidade (presencial/remoto/híbrido/ao
vivo), módulos e aulas (vídeo/texto/ao vivo), rich text editor, materiais de divulgação,
pré-requisitos entre cursos, prova de múltipla escolha ao fim de cada aula com nota
mínima.
Built: `CursosTrilhas` abre um modal com 3 campos genéricos (Módulo, Aula, Participante)
— sem estrutura de módulos/aulas real, sem prova, sem divulgação.

## 6. Onboarding do membro (1º login) — AUSENTE (existe outro onboarding, de igreja)
Referência: `onboarding.jsx` — fluxo de boas-vindas do MEMBRO/voluntário no primeiro
login: confirmar dados, foto de perfil, trocar senha.
Built: só tem onboarding de BOOTSTRAP DA IGREJA (`BootstrapChurchForm.tsx`, criar a
organização) — coisa diferente. O onboarding pessoal do membro não existe.

## 7. Quadros (Kanban) sem drag-and-drop
Referência: `kanban.jsx` — cards arrastáveis entre colunas (`draggable`, `onDragStart`,
`onDrop`).
Built: `Quadros`/`BoardsManager` não tem nenhum atributo de drag-and-drop — provavelmente
só lista/click.

## 8. Configurações incompleta
Referência: `config.jsx` — tema claro/escuro, **paleta de cor de destaque (accent)
trocável**, matriz de permissões por papel, modo de montagem de escala
(manual/assistida/automática), multi-congregação.
Built: `Config` no `ServiceExactApp.tsx` não tem seletor de accent/cor, nem matriz de
permissões, nem modo de escala — precisa checar exatamente o que tem, mas os
indicadores-chave (ACCENTS, matriz `pmx`, MODOS de escala) não aparecem.

## 9. Decisões / Batismos / Cursos — existem como rota, mas são versões RASAS
Aprofundei a comparação porque essas telas pareciam prontas. Não estão na versão atual:

- **Linha do tempo da pessoa (`PersonTimeline`)** — na referência é um componente
  único reaproveitado no perfil de qualquer membro (mostra decisão → acompanhamento →
  batismo → curso → membresia → time → liderança, com data e responsável de cada marco).
  No built, `DecisionsJourneyManager.tsx` desenha sua PRÓPRIA timeline isolada — não é
  reaproveitada no perfil do membro/voluntário em nenhum outro lugar do app.
- **Drawer de Decisão** — referência tem "Próximos passos" (contato → discipulado →
  matricular em Novos Convertidos → GC) e o botão "Encaminhar p/ acompanhamento" que
  cria automaticamente um visitante em acompanhamento. Built: ao clicar numa decisão
  só abre um modal genérico com 2 campos (Responsável, Observação) — nada disso existe.
- **Drawer de Batismo** — referência tem busca de membro pra "Adicionar candidato",
  lista de candidatos com link pro perfil, "Emitir certificados". Built: só cria a
  turma via modal genérico (Nome, Data, Local, Pastor) — sem gestão de candidatos.
- **Cursos & Trilhas** — confirmado: clicar num curso abre um modal genérico
  ("Módulo", "Aula", "Participante" como texto livre). Não existe o editor real de
  módulos/aulas com vídeo/texto, nem prova de conclusão (ver item 5).
- **Sistema de permissões de 4 níveis (Master/Pastor/Líder/Voluntário — `PAPEIS_V2`)**
  — não existe nenhum traço no built. É o modelo de permissão atual da referência.
- **Pedidos de oração / falar com líder (`PEDIDOS`)**, o fluxo do lado do MEMBRO —
  existe só como uma tela administrativa solta (`RemainingServiceManager.tsx`, CRUD
  genérico de "prayer_requests"), não como parte do app do voluntário/membro (que
  nem existe — ver item 2) nem com o polimento da referência (escolher tipo,
  textarea, confirmação "✓ Enviado").

Conclusão: o "esqueleto" de Jornada existe, mas o conteúdo rico de cada tela (drawers,
timeline reutilizável, editor de curso, permissões de 4 níveis) foi perdido — são as
mesmas quatro telas com formulários genéricos no lugar da experiência real.

## O que ESTÁ correto e não precisa mexer
- Estrutura de grupos/rotas do menu lateral (Visão geral, Pessoas, Operação, Gestão,
  Nossa igreja) bate com a referência.
- Todas as telas principais existem como rota: painel, membros, pessoas, times,
  visitantes, decisoes, batismos, cursos, escalas, reunioes, ensaios, espacos, quadros,
  cultos, comunicacao, conversas, relatorios, config, identidade, historia.
- Painel/dashboard ("Bom domingo", Próximos cultos, Montar escala, Ver o site público)
  está atualizado e bate com a referência.

## Recomendação de ordem de trabalho pro Claude Code
1. Confirmar esta lista com o usuário antes de codar qualquer coisa.
2. Tirar "Decisões" do menu Jornada (trivial).
3. Priorizar por impacto: Check-in QR e Editor de curso rico são os maiores buracos
   funcionais. App do voluntário (mobile) é o maior em volume de código.
4. Dentro de Jornada (item 9), refazer nesta ordem: `PersonTimeline` reutilizável →
   drawer de Decisão completo → drawer de Batismo completo → editor de curso real →
   permissões de 4 níveis → pedidos integrados ao app do membro (depende do item 2).
5. Ir feature por feature, comparando sempre contra o arquivo-fonte em
   `evolucoes/service_app/`, não contra memória/suposição.
6. Parar ao fim de cada feature e confirmar com o usuário antes de seguir pra próxima.
