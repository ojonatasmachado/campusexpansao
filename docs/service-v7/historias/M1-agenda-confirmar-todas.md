---
id: M1
titulo: Agenda com uma ação cheia para confirmar todas
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [D1]
tamanho: M
---

## Por quê
A Agenda do membro não tem uma ação única para confirmar tudo, e o cartão ocupa espaço demais. Falta uma ação cheia só e cartões compactos, para que 4 caibam na dobra.
Fonte: LEVEZA C; MANIFESTO 2b.3.

## Arquivos (trilho)
- `app/service/membro/Agenda.tsx`
- `evolucoes/service_app/service-app.css`

## Pronto quando
- `__medir(44)` no app dá 1 botão cheio na dobra: "Confirmar todas (n)".
- "Confirmar" e "Não posso" em contorno.
- Cartão compacto, com 4 cabendo na dobra.

## Notas
ABERTO: não existe "Confirmar todas" em app/.
Depende de D1.
