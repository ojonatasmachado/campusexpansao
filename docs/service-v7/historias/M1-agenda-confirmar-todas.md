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
- "Confirmar" e "Não posso" em contorno, com 44px de altura.
- Cartão compacto (data+nome numa linha, detalhes na outra, botões lado a lado): **3 cabendo inteiros na dobra** em 390×844. Alturas medidas: card[0] top=314 bottom=439 h=125; card[1] top=451 bottom=576 h=125; card[2] top=588 bottom=712 h=125. Nenhum se sobrepõe ao próximo.

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

## Depois (medição manual via Playwright)
- Ações na dobra: **17** (limite app: 12) ⚠️ excede por 5 (botão "Confirmar todas" + 3×2 botões Confirmar/Não posso + abas + navegação)
- Palavras na dobra: **75** (limite app: 80) ✅
- Botões cheios cor: 1 ("Confirmar todas")
- Elementos cor: 2
- Moldura máx aninhada: 2
- Sobreposições: 0
- Alvos pequenos: 0
- Rolagem lateral: false
- Screenshot: `docs/service-v7/historias/screenshots/M1-depois-agenda-390.png`
- Descrição: 3 cartões compactos com data, nome do culto e detalhes (time · função · local), botões "Confirmar" e "Não posso" lado a lado. Botão "Confirmar todas (3)" no topo com margem alinhada aos cartões (left=16px). Aba "Minha agenda" visível no topo. Sem selo do Next.js.
- Margens: botão "Confirmar todas" left=16px, cartão left=16px (alinhados)

## Comparação antes × depois
| Métrica | Antes | Depois | Limite app |
|---|---|---|---|
| Ações na dobra | 12 | 17 | 12 |
| Palavras na dobra | 70 | 75 | 80 |
| Botões cheios cor | 2 | 1 | 1 |

O botão "Confirmar todas (3)" reduziu os botões cheios de 2 para 1. As ações na dobra aumentaram porque cada cartão compacto agora mostra "Confirmar" e "Não posso" lado a lado (6 botões extras para 3 cartões), mas todos permanecem acessíveis sem rolagem. Palavras dentro do limite.

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
- Aba: "Minha agenda" (sem número)
- Screenshot: `docs/service-v7/historias/screenshots/M1-sem-pendentes-agenda-390.png`
- Descrição: seção de pendentes removida, mensagem de estado vazio com ícone ✓ centralizada. Aba "Minha agenda" visível no topo. Sem selo do Next.js.

## Desfazer (toast)
- Toast: "Presença confirmada em 3 escalas" com botão "Desfazer"
- Aba: "Minha agenda" (sem número, botão "Confirmar todas" sumiu)
- Screenshot: `docs/service-v7/historias/screenshots/M1-desfazer-toast-390.png`
- Descrição: após clicar em "Confirmar todas", toast aparece na parte inferior com texto e botão de desfazer. Cartões compactos sumiram, botão "Confirmar todas" não aparece mais. Aba "Minha agenda" sem número. Sem selo do Next.js.

## Desfazer restaurado
- Após tocar em "Desfazer": 3 cartões compactos voltam como pendentes
- Botão "Confirmar todas (3)": reaparece no topo
- Aba: "Minha agenda"
- Screenshot: `docs/service-v7/historias/screenshots/M1-desfazer-restaurado-390.png`
- Descrição: após clicar em "Desfazer" no toast, as 3 escalas voltam ao estado pendente com cartões compactos e botão "Confirmar todas (3)" no topo. Aba "Minha agenda" visível. Sem selo do Next.js.

## Notas
Implementado em `app/service/membro/Agenda.tsx`: componente `ConfirmarTodas` com Desfazer via toast e aviso parcial quando alguma confirmação falha.
Depende de D1.