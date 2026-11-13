---
id: F1
titulo: Implementar Financeiro fases 3 e 4
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-13
branch: historia/F1-financeiro-fases-3-4
depende: [I10]
tamanho: G
---

## Por quê
As fases 1 e 2 do Financeiro estão no ar (0073, 0080). Faltam o orçamento por ministério e a importação de extrato em .ofx, .csv e .pdf.
Fonte: JORNADAS_PONTE.md seção 1 (tesoureiro) e 0; MANIFESTO seção 9.

## Arquivos (trilho)
- `app/service/modules/financeiro/Financeiro.tsx`
- `app/service/modules/financeiro/Fase2.tsx`
- `app/service/modules/financeiro/Fase3.tsx` (novo, mesmo padrão de Fase2.tsx)
- `app/service/modules/financeiro/Formularios.tsx`
- `app/service/modules/financeiro/dados.ts`
- `supabase/migrations/0111_service_financeiro_fase3.sql` (novo; 0107 é da M7, 0111 é o próximo livre)
- `docs/service-v7/producao.sql`

## Pronto quando
- Orçamento por ministério funcionando.
- Importação de extrato em .ofx, .csv e .pdf funcionando.

## Notas
ABERTO. Fases 1 e 2 em produção.


### Mensagem ao Claude, 25/10/2026

O usuário pediu para concluir/publicar o que estivesse liberado e deixar para Claude o que dependesse dos seus arquivos. F1 não foi iniciada: seu trilho inteiro está em modules/financeiro/, ainda reservado no branch historia/I10-biblioteca-indicadores. A dependência I10 foi registrada para o estado vivo não mostrar esta história como executável enquanto existe a sobreposição. Não houve liberação presumida por o outro chat estar parado.

Após concluir/liberar I10, continuar F1: orçamento por ministério e importação de extrato .ofx/.csv/.pdf. Não estão implementados nesta entrega. Coordenar com N2 para moeda/formulários/exportações: a base N1 já está publicada, mas locale/currency ficam desligados em service.international_rollout até integração completa. Preservar centavos, moeda única por organização, RLS e as proteções existentes; não habilitar moeda estrangeira somente para trocar símbolo.

A prova de volume O6 usa os contratos atuais sem editar o Financeiro: milhares de registros, saldos, paginação e CSV reais, fechamento e isolamento. Ela não substitui as fases 3 e 4. Consultar a história O6 e scripts/check-local-financeiro-volume.ts para reproduzir em banco descartável. N2 e a evidência de densidade na I3 também ficam registradas para a continuação do Claude, sem assumir histórias E/I/M/G nesta frente.

### Fatia 1 (13/11, PR próprio): orçamento por ministério

Entrega a primeira metade do "Pronto quando" (orçamento por ministério); a importação de extrato .ofx/.csv/.pdf fica para a fatia 2, ainda não iniciada.

- **Ministério = categoria de despesa.** Não existe uma entidade "ministério" separada no banco; o JORNADAS_PONTE só pede "orçamento por ministério, por mês/semestre/ano" sem detalhar mais. `service.fin_categories` (kind='despesa') já é, na prática, a divisão por área/ministério usada no financeiro (Kids, Equipamentos, Missões e repasses...), então o orçamento é por categoria de despesa. Orçamento de entrada ficou fora do escopo (orçamento é plano de gasto).
- **Período livre**, não um enum: `fin_budgets.period_start/period_end` (como o comentário da 0073 já previa). A tela oferece Mês, Semestre (jan-jun/jul-dez) ou Ano, com navegação; orçado×realizado só casa quando o período da tela bate exatamente com o do orçamento (orçamento mensal não aparece ao olhar o ano). Aceito como limite da v1; se virar problema real, a saída é deixar escolher explicitamente "ver por mês" dentro de um orçamento anual, não inferir.
- **Moeda (coordenação com N2):** nenhuma integração de moeda nesta fatia. Centavos inteiros, BRL implícito, mesma base das fases 1 e 2; `service.international_rollout` continua desligado e esta fatia não mexe nisso. Quando a N2 ligar moeda no Financeiro, `fin_budgets.amount_cents` entra no mesmo tratamento das demais tabelas, sem migração própria.
- **RLS:** `fin_orcamento` segue o mesmo padrão de `fin_saldos`/`fin_pessoas` (só `fin_can`, sem conferir `core.can_access(org,'service')` dentro da função `security definer`). O revisor apontou que isso deixaria a RPC responder mesmo com o módulo Service desligado para a igreja; é um comportamento que as outras RPCs do financeiro (0073) já têm, não uma regressão desta fatia. Não corrigi aqui para não divergir do padrão sozinho; se for para endereçar, é um item à parte que cobre o módulo inteiro.
- **Teste:** migração aplicada numa transação descartada contra o banco local compartilhado (BEGIN...ROLLBACK), sem tocar dado real: agregação orçado×realizado correta excluindo "previsto" e fora do período, gatilho rejeita categoria de entrada, unicidade categoria+período, e categoria desativada com orçamento existente continua aparecendo (achado do revisor, corrigido). `scripts/validar.sh` completo: TUDO PASSOU (29 verificações, build incluso). Revisado pelo subagente `revisor`: achou o período resetando para "mês atual" depois de salvar/excluir (o `fin.carregando` do pai desmontava o estado do painel) e o uso de `new Date()` em UTC; os dois corrigidos (período/versão sobem para `Financeiro.tsx`, `todayISO()` no lugar de `new Date()`).
- **Não verificado em tela** (fora do que esta sessão consegue fazer sem navegador): captura de tela, teste de teclado/leitor de tela, aparelho real.
