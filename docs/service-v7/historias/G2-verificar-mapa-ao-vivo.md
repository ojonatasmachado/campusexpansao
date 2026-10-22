---
id: G2
titulo: Verificar o Mapa ao vivo
tipo: verificacao
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
O Mapa ainda não foi verificado ao vivo: Overpass (OpenStreetMap), chave ORS opcional na Vercel, fundo, importação com arquivos reais e uso em celular de verdade.
Fonte: docs/service-v7/mapa/PLANO.md §9 "Não verificado" e "Para ligar em produção" 3 e 4.

## Arquivos (trilho)
- `docs/service-v7/historias/G2-verificar-mapa-ao-vivo.md`

## Pronto quando
- Mapa testado ao vivo com Overpass.
- Testado com e sem ORS_API_KEY na Vercel.
- Fundo verificado; NEXT_PUBLIC_MAPA_ESTILO é o plano B.
- Importação com arquivos reais e teste em celular.

## Notas
ABERTO. Tamanho M. Trilho a definir na reserva.
