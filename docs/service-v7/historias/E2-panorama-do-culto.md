---
id: E2
titulo: Criar Panorama do culto somente leitura
tipo: codigo
status: feita
quem: claude
desde: 2026-11-03
branch: historia/E2-panorama-do-culto
depende: [D1]
tamanho: G
---

## Por quê
Não existe tela de acompanhamento do culto. O pastor precisa ver o cronograma e a cobertura de cada time numa tela só de leitura, com os problemas primeiro.
Fonte: LEVEZA B2; MANIFESTO 2b.2, 4.16.

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/painel/telas/FichaPessoa.tsx`
- `app/service/painel/tipos.ts`
- `app/service/layout.tsx`
- `evolucoes/service_app/service-app.css`
- `app/service/modules/escalas/CoberturaResumo.tsx`
- `app/service/painel/telas/Panorama.tsx` / `panorama.css`
- `app/service/painel/telas/Evento.tsx`, `app/service/painel/campos.tsx` (prop `id` no DrawerSection), `app/service/ui/Segmentado.tsx`, `app/service/modules/define.ts`, `app/service/modules/cultos/manifest.ts`

## Pronto quando
- Cronograma em ordem (event_schedule_items), uma linha por time (events.ministries), problemas primeiro.
- Toque numa linha abre o time naquele culto.
- Pastor vê o culto em cerca de 8 linhas.
- Próximos cultos e Escalas deixam de repetir a lista de times.
- Passa a ser a tela dona da cobertura por time (4.16).

## Notas
Feita em 2026-11-04. Panorama read-only com cobertura resumida e cronograma; CoberturaResumo extraído como componente compartilhado.
Conferência de 04/11 (claude): travessão do roteiro trocado por "Sem nome" (lei 12); pílula e esfumado do Segmentado rolável sem mutar valor do hook; toque num time do Panorama agora rola até ele em Posições (o id procurado só existia na tela de Escalas).
