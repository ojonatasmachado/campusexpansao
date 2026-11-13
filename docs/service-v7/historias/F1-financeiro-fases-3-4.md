---
id: F1
titulo: Implementar Financeiro fases 3 e 4
tipo: codigo
status: bloqueada
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
- `app/service/modules/financeiro/Fase3.tsx` (novo, mesmo padrão de Fase2.tsx; orçamento)
- `app/service/modules/financeiro/Fase4.tsx` (novo; importar extrato)
- `app/service/modules/financeiro/extrato.ts` (novo; leitura de .ofx e .csv)
- `app/service/modules/financeiro/Formularios.tsx`
- `app/service/modules/financeiro/dados.ts`
- `supabase/migrations/0111_service_financeiro_fase3.sql` (novo; 0107 é da M7, 0111 é o próximo livre)
- `supabase/migrations/0112_service_financeiro_fase4.sql` (novo)
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

### Fatia 2 (13/11, PR próprio): importar extrato .ofx e .csv

Entrega a segunda metade do "Pronto quando", exceto .pdf (ver bloqueio abaixo). Status muda para **bloqueada**: o item não fecha sozinho, falta uma decisão do usuário sobre o .pdf.

- **Banco:** `service.fin_import_batches` (um lote por arquivo) + `service.fin_importar_lote(org, church, conta, formato, arquivo, linhas jsonb)`, que grava o lote inteiro de uma vez e usa o índice único (`account_id, external_id`) já existente desde a 0073 pra ignorar quem já foi importado (`on conflict ... do nothing`), sem duplicar. A FK nova em `fin_transactions.import_batch_id` usa `on delete set null (import_batch_id)` (column-specific, Postgres 15+): apagar o lote só desliga a referência, nunca apaga o lançamento real.
- **Leitura:** `app/service/modules/financeiro/extrato.ts`. OFX: parser tolerante tanto ao SGML do 1.x (tags sem fechamento) quanto ao XML do 2.x (tudo fechado, às vezes numa linha só) — quebra antes de cada `<`, então não importa como o arquivo veio formatado. CSV: reaproveita `lerCsv`/`dataBR` de `lib/planilha.ts`; valor aceita formato BR ("1.234,56"), ponto decimal solto ("100.00") e parênteses como negativo (extrato de cartão). Linha sem data ou valor que dê pra entender (ex.: "SALDO ANTERIOR") é descartada, não derruba o arquivo inteiro; a tela avisa quantas ficaram de fora.
- **Dedup dentro do próprio arquivo:** duas linhas genuinamente iguais (duas tarifas de R$10 no mesmo dia, por exemplo) ganham um sufixo `:2`, `:3`... na chave, senão a segunda pareceria "a mesma" pro índice único e sumiria sem avisar.
- **Categoria e fundo:** a tela pede uma categoria de despesa e uma de entrada (se o arquivo tiver as duas) e um fundo, aplicados a todo o lote; separar por categoria diferente fica para editar o lançamento depois, um por vez (mesma tela que já existe). `fin_importar_lote` confere que a categoria de cada linha é da própria organização e do mesmo tipo da linha (entrada/despesa); não confia só no que a tela já filtra.
- **Teste:** migração testada numa transação descartada contra o banco local compartilhado (BEGIN...ROLLBACK): reimportar o mesmo lote conta certo (duplicado ignorado), apagar o lote preserva o lançamento, migração roda duas vezes sem erro (idempotência), igreja de outra organização e categoria do tipo errado são recusadas. Parsers testados fora da tela (tsx direto) com arquivos de exemplo: OFX 1.x e 2.x (inclusive tudo numa linha só, com tags fechadas coladas), valores BR/US/parênteses, CSV com linha de saldo no meio, duas linhas legitimamente iguais. `scripts/validar.sh` completo: TUDO PASSOU (29 verificações, contrato de internacionalização e build inclusos).
- **Revisado pelo subagente `revisor`**, achou 12 problemas; corrigidos: parser OFX perdia lançamento com tags de fechamento coladas numa linha (achado mais grave); duas linhas de CSV iguais viravam "a mesma" pro dedup; a tela mostrava "gravados" errado (agora a RPC devolve `imported_rows` de verdade); voltar da etapa de colunas e confirmar de novo podia pular a releitura da planilha; trocar de arquivo no meio deixava pedaço do anterior; a contagem de "já importados" não resetava ao trocar de conta e erro de rede virava silenciosamente "nada existe"; a faixa de etapas deixava clicar em "Colunas" com o OFX (tela vazia sem saída); conversão de valor do OFX não tratava milhar; heurística de milhar x decimal do CSV era ambígua; migração não rodava duas vezes; função não conferia igreja nem tipo da categoria. Aceito como limite de v1, não corrigido: CSV com débito e crédito em colunas separadas, ou com sufixo "D"/"C" em vez de sinal — só sinal (-/parênteses) numa coluna de valor só.
- **Bloqueio (.pdf):** não há biblioteca de leitura de PDF no projeto (só `jspdf`, que gera PDF, não lê). Extrair texto de um PDF de extrato bancário pede uma dependência nova (ex. `pdfjs-dist` ou `pdf-parse`), e dependência nova é decisão do usuário, não presumida. Pergunta pendente: posso adicionar uma dessas bibliotecas? Com qual preferência, se houver. Até a resposta, a história fica **bloqueada** (não "feita"): orçamento e extrato .ofx/.csv já estão em produção e utilizáveis; só falta o terceiro formato do "pronto quando".
- **Não verificado em tela:** captura, teclado/leitor de tela, aparelho real, extrato real de um banco brasileiro específico (os testes usaram arquivos sintéticos no formato OFX/CSV padrão).
