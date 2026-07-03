# PROMPT — Reconstrução completa do CE.X Service (colar no Claude Code)

Leia primeiro o arquivo `AUDITORIA - Gaps app Service vs protótipo.md` inteiro.
Ele documenta, com números de linha e trechos reais, tudo que está errado ou
faltando no app construído em `app/service/` comparado à fonte de verdade em
`evolucoes/service_app/`. Não resuma de memória — abra os arquivos.

## Regra número 1
`evolucoes/service_app/` é a ÚNICA referência válida de telas, dados, nomes e
comportamento. Se algo em `app/service/` divergir dela, a referência manda.
Nunca reconstrua a partir de suposição, screenshot antigo ou memória — sempre
abra o arquivo-fonte correspondente antes de escrever código.

## O que corrigir, em ordem

**0. Bug crítico de CSS (fazer primeiro, é rápido e o que mais quebra a tela hoje)**
Em `app/loja.css`, linhas ~2085–3140, tem um bloco de CSS do Service colado sem
escopo correto (comentários viraram `.service-exact /* ... */` mas as regras reais
abaixo ficaram globais: `.panel`, `.mini-row`, `.bar`, `.btn`, `.ph-title` etc. sem
o prefixo `.service-exact`). Isso vaza pro site inteiro E colide com o CSS real do
Service (`evolucoes/service_app/service.css` + `service-v2.css`, carregado à parte
em `app/service/layout.tsx`). Apague esse bloco inteiro de `loja.css` — o Service
não deve ter nenhum CSS ali. Depois confira visualmente que nenhuma outra página do
site (materiais, checkout, admin) dependia sem querer dessas classes vazadas.

**1. Menu Jornada**
Tirar "Decisões" do menu lateral (grupo Jornada deve ter só Batismos e Cursos &
Trilhas — a tela/dado de Decisões continua existindo, só sai da navegação).

**2. Reconstruir os módulos ausentes** (auditoria, itens 2–6), nesta ordem de
prioridade:
   - Editor de curso rico (`evolucoes/service_app/curso-editor.jsx`): modalidade,
     módulos/aulas com vídeo/texto/ao vivo, materiais de divulgação, pré-requisitos,
     prova de múltipla escolha com nota mínima.
   - Check-in por QR Code (`evolucoes/service_app/checkin.jsx`): QR por evento/aula,
     geração e impressão de PNG, validação de janela/duplicidade/escalado, presença
     ao vivo, tela de resultado ao escanear.
   - App do voluntário/membro — mobile (`evolucoes/service_app/mobile.jsx`): hoje o
     botão "Ver app do voluntário" não faz nada. Reconstruir as abas Início, Escala,
     Tarefas, Conversas, Visitantes (recepção), Cursos, Perfil.
   - Onboarding do membro no 1º login (`evolucoes/service_app/onboarding.jsx`) —
     diferente do onboarding de criar igreja que já existe.
   - Arte do evento pra compartilhar (`evolucoes/service_app/evento-share.jsx`).
   - Drag-and-drop em Quadros (`evolucoes/service_app/kanban.jsx`).
   - Configurações completa (`evolucoes/service_app/config.jsx`): tema/cor de
     destaque, matriz de permissões, modo de montagem de escala.

**3. Aprofundar Jornada** (auditoria, item 9) — Decisões/Batismos/Cursos existem
como rota mas por dentro viraram formulários genéricos. Refazer:
   - `PersonTimeline` como componente único reutilizável no perfil de qualquer
     membro/voluntário (hoje cada tela desenha sua própria timeline isolada).
   - Drawer de Decisão completo: "Próximos passos" e "Encaminhar p/ acompanhamento".
   - Drawer de Batismo completo: buscar/adicionar candidato, emitir certificados.
   - Sistema de permissões de 4 níveis (`PAPEIS_V2`: Master, Pastor, Líder,
     Voluntário) — hoje não existe nenhum traço disso.
   - Pedidos de oração/falar com líder integrados ao app do membro (item 2), não
     só como CRUD administrativo solto.

## Como trabalhar
- Pare ao fim de CADA item acima. Explique em português simples o que mudou e
  o que você comparou. Só siga pro próximo depois do meu OK.
- Antes de mexer em qualquer arquivo, me diga o que vai tocar.
- Não mexa no site de materiais, admin, ou schema `public` — só no produto Service
  e no bug de CSS do item 0 (que é em `app/loja.css`, mas só a remoção do bloco
  vazado).
- UI sempre puxando da `cex-brand-library`, sem inventar cor fora da paleta.
