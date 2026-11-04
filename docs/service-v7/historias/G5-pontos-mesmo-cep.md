---
id: G5
titulo: Espalhar ao longo da rua as pessoas do mesmo CEP
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
O ponto de cada pessoa vem do CEP, então 10 pessoas da mesma rua viram um grupo de 10 no mesmo lugar. Decisão G4 de 04/11 (MANIFESTO 2c.4, mapa/PLANO.md §7 item 4).

## Arquivos (trilho)
- `app/service/modules/mapa/dados.ts`
- `app/service/modules/mapa/MapaIgreja.tsx`

## Pronto quando
- Pessoas do mesmo CEP aparecem espalhadas ao longo da rua, cada uma sempre no mesmo lugar (posição fixa por pessoa, não sorteada a cada abertura).
- O agrupamento só acontece com o mapa bem afastado.
- O endereço continua fora da camada de pessoas e a regra de menos de 3 pontos anônimos continua valendo.
- Fotos de uma rua com 10 pessoas no mesmo CEP, perto e afastado.

## Notas
Sem histórico de mudança de endereço (G4).
