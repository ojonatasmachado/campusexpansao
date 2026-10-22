---
id: Q4
titulo: Testar push e envio de imagem com serviços reais
tipo: verificacao
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
Envio de push e de imagem não foram testados com serviços reais. A fila e o silêncio das 22h às 7h foram testados só como migração. O upload da imagem do Destaque (0068) também não.
Fonte: PROGRESSO.md:8 e item 5.3; DEPLOY.md seção 5 (agendador por OIDC no ar desde c3a87ff, mas sem prova de execução registrada).

## Arquivos (trilho)
- `docs/service-v7/historias/Q4-push-imagem-servicos-reais.md`

## Pronto quando
- Push entregue com serviço real.
- Imagem enviada com serviço real, incluindo o Destaque (0068).
- Silêncio das 22h às 7h testado.
- Execução do agendador registrada.

## Notas
ABERTO. Trilho a definir na reserva.
