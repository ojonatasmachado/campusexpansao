---
id: Q15
titulo: Pedido de conta uma vez só no Início do painel
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-10
branch: historia/Q15-pedido-conta-uma-vez
depende: []
tamanho: P
---

## Por quê
O Início da gestão repete pedidos de conta: uma linha no Para resolver e o bloco NovosCadastros logo abaixo. A linha só rola a página. A lei 14 pede uma informação em um lugar.

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/modules/entrada/NovosCadastros.tsx`
- `app/service/modules/entrada/usePedidosConta.ts`
- `docs/service-v7/historias/Q15-pedido-conta-uma-vez.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/Q15-*.png`

## Decisão
Decisão do usuário: fica só a linha no Para resolver. Revisar → abre uma folha existente da biblioteca com pedidos e Aprovar/Recusar. O bloco sai da página. Uma única leitura compartilhada abastece linha e folha. Só master/pastor vê essa função. Não alterar a Caminhada; registrar duplicação se confirmada.

## Pronto quando
- Linha e folha usam os mesmos pedidos, sem consulta duplicada.
- Carregando, erro com Tentar de novo e pronto preservados da Q12.
- Aprovar/recusar atualiza a linha imediatamente; último pedido remove a linha e fila vazia mostra Tudo em dia.
- Folha, Linha e Botao existentes; componentes e checks do Service aprovados.
- Pedidos criados pelo fluxo real local de participar, ou bloqueio comprovado. Nada de reset ou produção.
- Cinco fotos abertas, MD5 e medidas de antes/depois com limites explícitos.
- Caminhada inspecionada, pendência registrada se houver duplicação.
- História feita, pendência removida, PR para main, CI verde e porta livre, sem merge.

## Jornada
Gestão abre Início, vê a linha de pedidos, toca Revisar e resolve dentro da folha. Depende do link de entrada, de pedidos pendentes e da permissão de gestão. Sem conteúdo, a linha some; sem rede, há erro com nova tentativa; sem permissão, linha e folha não são oferecidas.

## Validação
Pendente de construção e execução local.

## Notas
Reservada por codex. Decisão registrada sem reabrir opções.
