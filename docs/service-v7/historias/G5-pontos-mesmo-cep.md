---
id: G5
titulo: Espalhar perto da rua do CEP as pessoas do mesmo CEP
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-06
branch: historia/G5-pontos-mesmo-cep
depende: [G7]
tamanho: M
---

## Por quê
O ponto de cada pessoa vem do CEP, então 10 pessoas da mesma rua viram um grupo de 10 no mesmo lugar. Decisão G4 de 04/11, revista no mesmo dia (MANIFESTO 2c.4, mapa/PLANO.md §7 item 4 e §10).

## Arquivos (trilho)
- `app/service/modules/mapa/dados.ts`
- `app/service/modules/mapa/MapaIgreja.tsx`
- `app/service/modules/mapa/geo.ts`
- `supabase/migrations/<próximo>_service_mapa_pontos_rua.sql`

## Pronto quando
- Pessoas do mesmo CEP aparecem espalhadas perto do trecho da rua do CEP, dos dois lados, nunca em cima da rua nem pelo bairro todo; cada uma sempre no mesmo lugar (posição fixa por pessoa, calculada no servidor).
- Afastando o mapa, os pontos encolhem (até uns 2 px) e nunca viram grupo com número.
- CEP de prédio único fica como está (decisão do usuário).
- O endereço continua fora da camada de pessoas e a regra de menos de 3 pontos anônimos continua valendo.
- Fotos de uma rua com 10 pessoas no mesmo CEP, perto e afastado.

## Notas
Sem histórico de mudança de endereço (G4). Referência: prancha P1 do canvas da evolução (PLANO §10).
