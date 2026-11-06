---
id: G5
titulo: Espalhar perto da rua do CEP as pessoas do mesmo CEP
tipo: codigo
status: feita
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
- `supabase/migrations/0099_service_mapa_pontos_rua.sql`, `docs/service-v7/producao.sql`
- `app/service/modules/mapa/camadas.ts`, `estilo.ts`, `mapa.css` (sem cluster, ponto encolhe com o zoom, cor de cluster removida)
- `scripts/ibge/importar-cep-centros.ts` (trecho da rua por CEP), `scripts/seed-local-mapa.ts` (trecho fictício no seed)

## Pronto quando
- Pessoas do mesmo CEP aparecem espalhadas perto do trecho da rua do CEP, dos dois lados, nunca em cima da rua nem pelo bairro todo; cada uma sempre no mesmo lugar (posição fixa por pessoa, calculada no servidor).
- Afastando o mapa, os pontos encolhem (até uns 2 px) e nunca viram grupo com número.
- CEP de prédio único fica como está (decisão do usuário).
- O endereço continua fora da camada de pessoas e a regra de menos de 3 pontos anônimos continua valendo.
- Fotos de uma rua com 10 pessoas no mesmo CEP, perto e afastado.

## Notas
Sem histórico de mudança de endereço (G4). Referência: prancha P1 do canvas da evolução (PLANO §10).
2026-11-06, feita (claude): a importação do CNEFE guarda por CEP a direção e a metade do trecho da rua (eixo principal dos endereços, até 250 m; um endereço só ou trecho abaixo de 12 m é prédio único); mapa_pessoas (0099) devolve para cada pessoa um ponto fixo, sorteado pelo id, ao longo do trecho e de 7 a 16 m para um dos lados, arredondado a 5 casas; prédio único fica no centro arredondado a 3 casas, como antes; CEP sem trecho (que não veio do CNEFE, hoje o caso de produção até a G1) cai num círculo de 8 a 25 m. Sem cluster: o ponto vai de 6,5 px (perto) a ~2 px (cidade). Regra de anônimos conta no centro do CEP, como antes; o anônimo usa outro sorteio (retirar o aceite não deixa o ponto onde estava com nome); para o líder de área o ponto espalhado também precisa cair na área. CEPs já gravados antes da 0099 ficam sem trecho até a próxima importação do CNEFE. Revisão (subagente) corrigida antes do PR. Fotos G5-1 (zoom 17, CEP 02511114 com 11 pessoas, trecho fictício do seed que não segue a rua desenhada), G5-2 (zoom 13), G5-3 (zoom 11), G5-4 (balão da pessoa espalhada). 15 pessoas na tela em 15 posições distintas. Densidade 1366×860 igual à G7 (45 ações, 105 palavras, fora da lei 13 com justificativa no manifesto; 0 sobreposições).
