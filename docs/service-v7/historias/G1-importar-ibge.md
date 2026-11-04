---
id: G1
titulo: Importar IBGE, CNEFE, malha e idade do município
tipo: infra
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
Sem os dados do IBGE, as camadas Concentração de moradores, Presença da igreja ("1 a cada X moradores") e Idade dos moradores ficam vazias (mapa/PLANO.md §10). O site do IBGE bloqueia a máquina, então os arquivos precisam ser baixados à mão.
Fonte: docs/service-v7/mapa/PLANO.md:283-290 e §9 "Não verificado"; memória "mapa falta IBGE".

## Arquivos (trilho)
- `scripts/ibge/importar-cep-centros.ts`
- `scripts/ibge/importar-malha.ts`
- `scripts/ibge/importar-idade.ts`
- `supabase/migrations/<próximo>_service_mapa_idade.sql`

## Pronto quando
- Importação do município da igreja rodada com os arquivos baixados à mão.
- Moradores, "1 a cada X moradores" e idade por setor e bairro com dados.
- Idade nas faixas 0 a 9, 10 a 19, 20 a 29, 30 a 59 e 60+, conferidas contra os grupos de idade do arquivo do Censo 2022.

## Notas
ABERTO. Tamanho P a M por município.
