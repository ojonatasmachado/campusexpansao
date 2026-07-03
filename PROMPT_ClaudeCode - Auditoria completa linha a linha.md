# PROMPT — Auditoria linha a linha: protótipo (referência) vs produção (colar no Claude Code)

## Contexto
Existem duas versões do CE.X Service neste repositório:
- **Referência (fonte de verdade de UI/UX):** `evolucoes/service_app/` — HTML/JSX
  standalone, é onde toda tela, formulário, drawer e fluxo são desenhados primeiro.
- **Produção (o que está no ar):** `app/service/ServiceExactApp.tsx` (+ arquivos
  auxiliares em `app/service/`) — reconstrução em Next.js/TypeScript ligada ao Supabase.

A produção foi construída a partir de uma versão antiga da referência e ficou pra
trás em muitos pontos — não só features grandes ausentes, mas detalhes finos de
formulário, campos, textos, drawers e organização visual. Já existe uma auditoria
anterior (`AUDITORIA - Gaps app Service vs protótipo.md`) e um levantamento pontual
de 4 telas (`PROMPT_ClaudeCode - Fidelidade UI (etapas, membro, voluntario,
ministerio).md`) — mas o usuário confirmou que a divergência é maior do que isso.
Esta auditoria deve ser **completa e exaustiva**, tela por tela, campo por campo.

## Tarefa
Comparar **arquivo por arquivo, linha por linha** cada tela/componente de
`evolucoes/service_app/` contra sua equivalente em `app/service/ServiceExactApp.tsx`
(e demais arquivos de `app/service/`, como `CheckIn.tsx`, `CursoEditor.tsx`,
`EventoShare.tsx`, `MobileApp.tsx`). Não vale comparar de memória, resumo ou
impressão geral — abra os dois lados de cada tela e confira:

- **Toda tela existe?** (rota, menu, ponto de entrada)
- **Todo formulário** — os mesmos campos, na mesma ordem, com os mesmos labels,
  placeholders, hints, obrigatoriedade, tipos de input (select vs texto vs data vs
  checkboxes), valores default.
- **Todo drawer/modal de detalhe** — mesmas seções, mesma informação mostrada,
  mesmos botões de ação, mesmo comportamento ao clicar.
- **Toda listagem** — mesmas colunas, filtros, buscas, ordenação, badges/chips,
  estados vazios ("empty state").
- **Toda ação/CTA** — botões que na referência abrem algo específico e na produção
  não têm `onClick`, abrem modal genérico, ou fazem algo diferente.
- **Textos e tom de voz** — títulos, subtítulos, textos de ajuda devem bater com a
  referência (é o texto que já foi aprovado).
- **Organização visual** — ordem das seções, agrupamento de campos (`half` = lado a
  lado), separadores, abas internas de cada tela/drawer.

## Escopo — cobrir TODAS as telas, nesta ordem
Para cada uma, arquivo de referência entre parênteses:

1. Painel/Dashboard (`app.jsx`, `screens.jsx`)
2. Membros (`membros.jsx`)
3. Pessoas/Voluntários (`membros.jsx` ou arquivo correspondente de pessoas)
4. Times & Ministérios + detalhe do time (`times.jsx`)
5. Cultos/Eventos + cronograma + posições (`times.jsx`, `data.js`)
6. Escalas (`escalas.jsx`)
7. Visitantes + jornada de integração (`visitantes.jsx`)
8. Decisões (`jornada.jsx`)
9. Batismos (`jornada.jsx`)
10. Cursos & Trilhas + editor de curso (`cursos.jsx`, `curso-editor.jsx`)
11. Reuniões (`reunioes.jsx`)
12. Ensaios (`reunioes.jsx`)
13. Espaços/Reservas (`espacos.jsx`)
14. Quadros/Kanban (`kanban.jsx`)
15. Comunicação/Avisos (`chat.jsx` ou arquivo correspondente)
16. Conversas (`chat.jsx`)
17. Check-in por QR (`checkin.jsx`)
18. Arte do evento para compartilhar (`evento-share.jsx`)
19. Relatórios (`relatorios.jsx`)
20. Configurações (`config.jsx`)
21. Identidade da igreja (`igreja.jsx`)
22. História da igreja (`igreja.jsx`)
23. Onboarding do membro / 1º login (`onboarding.jsx`)
24. App do voluntário/membro — mobile (`mobile.jsx`)
25. Menu lateral / navegação (`shell.jsx`)
26. Sistema de permissões de 4 níveis (procurar `PAPEIS_V2` na referência)

## Formato do entregável
Um arquivo `AUDITORIA_COMPLETA_UI.md`, organizado por número da lista acima. Para
cada tela, liste em bullets:
- ✅ o que já bate exatamente
- ⚠️ o que existe mas está divergente (campo faltando, texto diferente, comportamento
  simplificado) — citar arquivo:linha dos dois lados
- ❌ o que não existe na produção

Não corrija nada ainda. Esta etapa é só levantamento. Ao final, pare e apresente o
documento — a ordem de correção será decidida depois, com o usuário.

## Regras
- `evolucoes/service_app/` manda sempre que houver conflito.
- Não invente divergência — só reporte o que você de fato abriu e comparou nos dois
  arquivos.
- Não mexa em código nesta etapa.
