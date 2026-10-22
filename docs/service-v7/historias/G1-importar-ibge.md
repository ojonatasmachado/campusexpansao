---
id: G1
titulo: Importar IBGE, CNEFE e malha do município
tipo: infra
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
Sem os dados do IBGE, a visão "Onde falta igreja" e "1 a cada X moradores" fica vazia. O site do IBGE bloqueia a máquina, então os arquivos precisam ser baixados à mão.
Fonte: docs/service-v7/mapa/PLANO.md:283-290 e §9 "Não verificado"; memória "mapa falta IBGE".

## Arquivos (trilho)
- `scripts/ibge/importar-cep-centros.ts`
- `scripts/ibge/importar-malha.ts`

## Pronto quando
- Importação do município da igreja rodada com os arquivos baixados à mão.
- "Onde falta igreja" e "1 a cada X moradores" com dados.

## Notas
ABERTO. Tamanho P a M por município.
