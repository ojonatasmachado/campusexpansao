---
id: E2
titulo: Criar Panorama do culto somente leitura
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [D1]
tamanho: G
---

## Por quê
Não existe tela de acompanhamento do culto. O pastor precisa ver o cronograma e a cobertura de cada time numa tela só de leitura, com os problemas primeiro.
Fonte: LEVEZA B2; MANIFESTO 2b.2, 4.16.

## Arquivos (trilho)
- `app/service/modules/escalas/`
- `app/service/painel/telas/Evento.tsx`
- `app/service/modules/escalas/cobertura.ts`
- `app/service/modules/registry.ts`

## Pronto quando
- Cronograma em ordem (event_schedule_items), uma linha por time (events.ministries), problemas primeiro.
- Toque numa linha abre o time naquele culto.
- Pastor vê o culto em cerca de 8 linhas.
- Próximos cultos e Escalas deixam de repetir a lista de times.
- Passa a ser a tela dona da cobertura por time (4.16).

## Notas
ABERTO: nenhuma ocorrência de "Panorama do culto" no código.
Arquivos prováveis: novo módulo em app/service/modules/escalas/ (ou painel/telas/Evento.tsx como entrada).
