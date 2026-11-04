---
id: M1
titulo: Agenda com uma ação cheia para confirmar todas
tipo: codigo
status: reservada
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

## Lei 16 — mercado
Como apps de escala resolvem "confirmar várias de uma vez" no celular:

- **Planning Center Services**: botão "Accept All" no topo da seção Pending (web e app em Me > Schedule > Actions); aceita todos os pedidos visíveis de uma vez. Quando a pessoa tem várias funções no mesmo culto, confirma ou recusa função por função e depois envia. Fonte: https://help.planningcenter.com/en/my-schedule.html e https://help.planningcenter.com/en/manage-your-schedule.html
- **Life.Church (Mobile Experience Scheduling)**: voluntário aceita ou recusa cada convite um por vez e marca datas bloqueadas; sem ação em lote. Fonte: https://itsupport.life.church/a/1612527-how-to-use-the-mobile-experience-scheduling
- **Ministry Order**: aceita cada pedido pela notificação no celular, um por vez; sem confirmação em lote. Fonte: https://www.capterra.in/software/1222014/Ministry-Order

**Decisão aplicada:** uma ação "Confirmar todas" no topo dos pendentes (modelo Planning Center), sem esconder o Confirmar/Não posso individual de cada cartão. A recusa é sempre uma por uma, porque cada recusa tem motivo e avisa o líder.

## Pronto quando
- `__medir(44)` no app dá 1 botão cheio na dobra: "Confirmar todas (n)".
- "Confirmar" e "Não posso" em contorno.
- Cartão compacto, com 4 cabendo na dobra.

## Notas
ABERTO: não existe "Confirmar todas" em app/.
Depende de D1.