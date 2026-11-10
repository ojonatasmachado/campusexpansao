---
id: Q16
titulo: Pedido da Caminhada uma vez só no Início do painel
tipo: codigo
status: feita
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
Servidor `npm run dev:local -- --port 3116`, cookie `sb-127-auth-token`, banco local 127.0.0.1:54321. Nenhuma senha alterada, nenhuma migração ou reset.

Pedidos criados por cliques no app de Maria (membro@teste.local) e Mateus (membro2@teste.local): Caminhada, Já participo, data, Enviar. Ambos POST 201. Mateus precisou concluir contato e responder Agora não ao consentimento do mapa; os campos alterados foram restaurados. Gestão viu os dois; lider@teste.local (Lucas, Louvor) viu só Maria. Abrir a Gaveta gerou zero consultas GET adicionais de journey_change_requests.

Aprovar Maria: PATCH ok, contagem 2 → 1. Rejeitar Mateus: PATCH ok, contagem 1 → 0, folha vazia e linha ausente. O carregamento existente traz todos os status: a lista compartilhada filtra apenas pendentes, para que decididos não voltem após refresh. Os IDs resolvidos antecipam a atualização apenas até chegarem novas props. Sem mudar a consulta, a filtragem de permissão ou os callbacks. A guarda da Q15 (`ativando`, fila vazia retorna null) foi preservada.

Fotos reais 1366×860, produzidas com foto.mjs e loader temporário fora do repositório para navegar nos novos estados. Todas abertas antes do uso. Medição `__medir(24)` na mesma tela:

| Foto | Medida / limite | MD5 | Imagem aberta |
|---|---|---|---|
| antes | 35/25 ações; 137/100 palavras, fora da lei | `b84cba8e48622f04d6b8eb730b2b4296` | Linha de dois pedidos e bloco com Maria/Mateus e ações repetidas. |
| depois | 31/25 ações; 111/100 palavras, fora da lei | `cd47c5369c5152e82d3897c3948ce4bb` | Só a linha de dois pedidos; bloco removido. |
| folha | 5/25 ações; 26/100 palavras, dentro dos limites | `a3fb2d50fb270ddf8d9d53f3ea682e6f` | Gaveta com Maria e Mateus, duas ações por pedido. |
| aprovado | 31/25 ações; 111/100 palavras, fora da lei | `f9b71678e5b78d828466a6ebcb1525e0` | Após Aprovar Maria, a linha mostra um pedido. |
| ultimo | 30/25 ações; 103/100 palavras, fora da lei | `cd554b4a23446c78107ca298c9523d74` | Após Rejeitar Mateus, nenhuma linha da jornada; outras pendências continuam. |
| lider | 3/25 ações; 15/100 palavras, dentro dos limites | `eeae206a32019e1c4b2691da097b2e50` | Lucas vê somente Maria, do Louvor; Mateus não aparece. |

Crítica: antes/depois continuam fora da lei por conteúdo e navegação existentes no Início. Houve redução de 4 ações e 26 palavras; os dois pares de ações sobrepostas ao botão de ajuda do bloco antigo desapareceram. Não se alterou CSS para forçar a dobra. A Gaveta com dois pedidos fica dentro dos limites, sem rolagem lateral ou alvos menores que 24px. A auditoria da folha vazia registrou zero violações axe, zero erros de console, zero textos abaixo de 12px, zero alvos abaixo de 24px; contraste teve um caso inconclusivo. Não houve teste em aparelho físico ou leitor de tela.

Banco: `DELETE 2` pedidos Q16, `DELETE 1` evento de integração, restauração do índice da jornada de Maria e telefone/consentimento de Mateus. `pedidos_q16=0`, `pedidos_total=0`, `eventos_teste=0`; jornadas finais Maria `[1,1,0,0,1]`, Mateus `[1,0,0,0,0]`. Um evento parcial de uma captura interrompida também foi identificado e removido pelo ID. Timestamps de auditoria das gravações foram preservados. Não se restaurou o banco inteiro: havia alterações de volume de outras sessões.

Validação local: `npx tsc --noEmit -p .` e ESLint dos dois arquivos sem saída, exit 0; componentes ok; lei 12 estática nada piorou; contraste de temas e gráficos, contratos do service.yml, testes de captura e pacote de produção passaram; build exit 0. Migrações em Postgres isolado ficam para o CI, sem reset no banco local.


## Notas
Construída por codex. Resumo único, revisão na Gaveta do módulo pessoas, sem ampliar acesso. Linha da duplicação retirada do PENDENTES. PR e CI devem ser conferidos no relatório da entrega.

## Referência funcional
A decisão segue a Q15, sem redesenhar alternativas. Como conferência funcional: Planning Center separa aviso de pedidos pendentes e sua revisão (https://www.planningcenter.com/changelog/people/request-access-to-lists-workflows-and-forms); ChurchSuite mantém inscrições pendentes até ativação ou remoção por pessoa autorizada (https://support.churchsuite.com/article/53-adding-people-to-small-groups). Aplicação: resumo na fila, decisão na Gaveta, item decidido sai imediatamente. Sem material visual de terceiros no git.
