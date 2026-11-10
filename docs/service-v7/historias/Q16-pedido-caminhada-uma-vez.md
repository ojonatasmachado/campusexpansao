---
id: Q16
titulo: Pedido da Caminhada uma vez só no Início do painel
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-10
branch: historia/Q16-pedido-caminhada-uma-vez
depende: []
tamanho: P
---

## Por quê
O Início repete pedidos da jornada: a linha de key jornada no Para resolver apenas rola até o bloco caminhada-pendente, que repete os pedidos e suas ações. A lei 14 pede uma informação em um lugar.

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/modules/pessoas/PedidosCaminhada.tsx`
- `docs/service-v7/historias/Q16-pedido-caminhada-uma-vez.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/Q16-*.png`

## Decisão
Decisão do usuário: só a linha no Para resolver; Revisar → abre Gaveta da biblioteca com Aprovar/Rejeitar, usando a Q15 como modelo. Sem consulta nova: linha e folha recebem journeyRequests já filtrado pela casca. O acesso é exatamente o do bloco anterior, inclusive líder com pedidos de quem lidera; não reaplicar a restrição !liderDeTime. Continuar chamando onApproveJourney/onRejectJourney.

## Pronto quando
- Bloco removido e Gaveta no módulo pessoas, dono da gestão da jornada e de seu vocabulário.
- Uma mesma lista de props abastece linha e folha, com queda imediata de contagem após decidir; último pedido remove a linha.
- Preparação sem itens não mostra Para resolver, conforme Q15.
- Texto usa ct/termos da igreja; Gaveta, Linha e Botao compartilhados.
- Pedidos criados no app do membro ou bloqueio comprovado. Sem reset ou mudança de senha, só banco local.
- Seis fotos 1366×860 abertas e com MD5 distintos; antes/depois medidos na mesma dobra e comparados com 25/100.
- Gestão e líder com pedido de pessoa do seu time comprovados.
- Dados de teste limpos; TypeScript, checks e CI verdes; PR para main, porta livre, sem merge.

## Jornada
Pessoa pede uma etapa pelo app. A gestão ou o líder responsável abre o Início, vê a linha e decide pela folha. Sem pedidos, a linha some; sem permissão, os pedidos já são filtrados antes das props. Falha ao executar mantém a folha com opção de tentar a ação de novo. Não alterar políticas nem ampliar a consulta da casca.

## Validação
Pendente de construção e execução local.

## Notas
Reservada por codex. Decisão registrada sem reabrir alternativas.
