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
A Agenda do membro não tem uma ação única para confirmar tudo, e o cartão ocupa espaço demais. Falta uma ação cheia só e cartões compactos, para que 3 caibam inteiros na dobra (com botões de 44px, 4 não cabem).
Fonte: LEVEZA C; MANIFESTO 2b.3.

## Arquivos (trilho)
- `app/service/membro/Agenda.tsx`
- `app/service/membro/Inicio.tsx` (prop `compacto` do EscalaCard)
- `app/service/MobileApp.tsx` e `app/service/membro/tipos.ts` (cópia local aceita "wait")
- `app/service/modules/escalas/manifest.ts` (densidade)
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

## Depois (medição __medir(44), 3 escalas)
- Ações na dobra: **15** (limite app: 12): fora da lei, justificada no manifesto de Escalas
- Palavras na dobra: **68** (limite app: 80): dentro
- Moldura máx aninhada: 1 · Sobreposições: 0 · Alvos pequenos: 0 · Rolagem lateral: não
- Alturas: 125, 125, 125 (3 inteiros acima da barra de abas, sem sobreposição)
- Margem: "Confirmar todas" e cartões com left=16px
- Foto: `M1-depois-agenda-390.png`. Agenda, aba marcando 3, "Confirmar todas (3 escalas)" no topo e 3 cartões compactos (Sáb 07, Qua 11, Dom 15) com "Confirmar" e "Não posso" lado a lado. Sem o selo do Next.

## Comparação antes × depois
| Métrica | Antes | Depois | Limite app |
|---|---|---|---|
| Ações na dobra | 12 | 15 | 12 |
| Palavras na dobra | 70 | 68 | 80 |
| Botões cheios cor | 2 | 1 | 1 |

As 3 ações a mais são o "Não posso" de cada cartão, que antes ficava fora da dobra. Ele fica: a recusa é uma por uma.

## Pior caso (6 escalas, um nome com 55 caracteres)
- Ações na dobra: **15** (limite 12): fora da lei · Palavras na dobra: **81** (limite 80): fora da lei por 1
- Foto: `M1-pior-caso-agenda-390.png`. Agenda, aba marcando 6, "Confirmar todas (6 escalas)", 3 cartões inteiros e o 4º começando, com o nome longo cortado com reticências ("Culto de Ensino e Oração da Quart..."). Sem rolagem lateral.

## Confirmar todas e Desfazer
- Antes desta correção, as 6 gravações iam uma depois da outra e a lista só mudava em 8 s, depois de o aviso com Desfazer (5 s) já ter sumido. Agora a lista e a aba mudam no toque (cópia local) e o banco grava em paralelo: aviso e lista em 1,1 s, Desfazer visível por 5 s com as escalas já confirmadas.
- Foto: `M1-desfazer-toast-390.png`. Agenda com as 3 escalas como "Confirmado", sem o "Confirmar todas", aba sem número e o aviso "Presença confirmada em 3 escalas · Desfazer".
- Foto: `M1-desfazer-restaurado-390.png`. Com 6 escalas, depois de tocar em Desfazer: Agenda com "Confirmar todas (6 escalas)" de volta, aba marcando 6 e o aviso "6 respostas desfeitas".

## Sem pendentes
- Foto: `M1-sem-pendentes-agenda-390.png`. Agenda aberta com as 3 escalas já confirmadas: sem "Escala a confirmar", sem "Confirmar todas", aba sem número, os 3 cultos com "Confirmado".
- Defeito anterior à M1, fora desta história: depois de responder uma escala (uma ou todas), o roteador do Next reescreve o endereço para `/service` e o app volta sozinho para o Início em 2 a 5 s. Por isso esta foto abre a Agenda de novo, em vez de esperar o aviso sumir.

## Notas
Fechada em 2026-11-05: `ConfirmarTodas` (Agenda.tsx) confirma na tela e grava em paralelo, com Desfazer e aviso parcial; `EscalaCard compacto` (Inicio.tsx); densidade no manifesto de Escalas.
Depende de D1.
Ajuste em 2026-11-06: o "Confirmar todas" ganhou `largo` e ocupa a mesma largura dos cartões (borda 16 a 374 nos dois em 390x844); antes terminava em 308 e ficava encostado à esquerda.
