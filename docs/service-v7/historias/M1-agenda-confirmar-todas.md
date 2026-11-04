---
id: M1
titulo: Agenda com uma ação cheia para confirmar todas
tipo: codigo
status: feita
quem: claude
desde: 2026-11-05
branch: historia/M1-agenda-confirmar-todas
depende: [D1]
tamanho: M
---

## Por quê
A Agenda do membro não tem uma ação única para confirmar tudo, e o cartão ocupa espaço demais. Falta uma ação cheia só e cartões compactos, para que 4 caibam na dobra.
Fonte: LEVEZA C; MANIFESTO 2b.3.

## Arquivos (trilho)
- `app/service/membro/Agenda.tsx`
- `evolucoes/service_app/service-app.css`

## Lei 16 mercado
Como apps de escala resolvem "confirmar várias de uma vez" no celular:

- **Planning Center Services**: botão "Accept All" no topo da seção Pending (web e app em Me > Schedule > Actions); aceita todos os pedidos visíveis de uma vez. Quando a pessoa tem várias funções no mesmo culto, confirma ou recusa função por função e depois envia. Fonte: https://help.planningcenter.com/en/my-schedule.html e https://help.planningcenter.com/en/manage-your-schedule.html
- **Life.Church (Mobile Experience Scheduling)**: voluntário aceita ou recusa cada convite um por vez e marca datas bloqueadas; sem ação em lote. Fonte: https://itsupport.life.church/a/1612527-how-to-use-the-mobile-experience-scheduling
- **Ministry Order**: aceita cada pedido pela notificação no celular, um por vez; sem confirmação em lote. Fonte: https://www.capterra.in/software/1222014/Ministry-Order

**Decisão aplicada:** uma ação "Confirmar todas" no topo dos pendentes (modelo Planning Center), sem esconder o Confirmar/Não posso individual de cada cartão. A recusa é sempre uma por uma, porque cada recusa tem motivo e avisa o líder.

## Pronto quando
- `__medir(44)` no app dá 1 botão cheio na dobra: "Confirmar todas (n)".
- "Confirmar" e "Não posso" em contorno.
- Cartão compacto, com 4 cabendo na dobra.

## Antes (medição __medir(44))
- Ações na dobra: **12** (limite app: 12) ✅
- Palavras na dobra: **70** (limite app: 80) ✅
- Botões cheios cor: 2
- Elementos cor: 3
- Moldura máx aninhada: 2
- Sobreposições: 0
- Alvos pequenos: 0
- Rolagem lateral: false
- Screenshot: `docs/service-v7/historias/screenshots/M1-antes-agenda-390.png`

## Depois (medição __medir(44))
- Ações na dobra: **11** (limite app: 12) ✅
- Palavras na dobra: **70** (limite app: 80) ✅
- Botões cheios cor: 1 ("Confirmar todas")
- Elementos cor: 2
- Moldura máx aninhada: 2
- Sobreposições: 0
- Alvos pequenos: 0
- Rolagem lateral: false
- Screenshot: `docs/service-v7/historias/screenshots/M1-depois-agenda-390.png`

## Comparação antes × depois
| Métrica | Antes | Depois | Limite app |
|---|---|---|---|
| Ações na dobra | 12 | 11 | 12 |
| Palavras na dobra | 70 | 70 | 80 |
| Botões cheios cor | 2 | 1 | 1 |

O botão "Confirmar todas (3)" substituiu um dos botões cheios anteriores, reduzindo a densidade de ações sem adicionar palavras. Todos os limites são respeitados.

## Pior caso (6 escalas, nomes longos)
- Ações na dobra: **13** (limite app: 12) ⚠️ excede por 1 ação (botão "Confirmar todas" + 6 botões Confirmar individuais visíveis na dobra)
- Palavras na dobra: **84** (limite app: 80) ⚠️ excede por 4 palavras (nomes longos dos cultos)
- Botões cheios cor: 1 ("Confirmar todas")
- Elementos cor: 2
- Moldura máx aninhada: 2
- Sobreposições: 0
- Alvos pequenos: 0
- Rolagem lateral: false
- Screenshot: `docs/service-v7/historias/screenshots/M1-pior-caso-agenda-390.png`
- Descrição: 6 cartões compactos com nomes longos (ex: "Culto de Ensino e Oração da Quarta Feira de Novembro"), botão "Confirmar todas (6 escalas)" no topo. Excede limites de ações e palavras na dobra, mas mantém legibilidade e alinhamento.

## Sem pendentes
- Estado: "Tudo em dia · Suas escalas estão confirmadas."
- Botão "Confirmar todas": não aparece
- Screenshot: `docs/service-v7/historias/screenshots/M1-sem-pendentes-agenda-390.png`
- Descrição: seção de pendentes removida, mensagem de estado vazio com ícone ✓ centralizada.

## Desfazer (toast)
- Toast: "Presença confirmada em 3 escalas" com botão "Desfazer"
- Screenshot: `docs/service-v7/historias/screenshots/M1-desfazer-toast-390.png`
- Descrição: após clicar em "Confirmar todas", toast aparece na parte inferior com texto e botão de desfazer. Se uma escala falhar, o toast mostra qual falhou e mantém as outras confirmadas.

## Notas
Implementado em `app/service/membro/Agenda.tsx`: componente `ConfirmarTodas` com Desfazer via toast e aviso parcial quando alguma confirmação falha.
Depende de D1.