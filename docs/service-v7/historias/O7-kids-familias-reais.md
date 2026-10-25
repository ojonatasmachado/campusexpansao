---
id: O7
titulo: Validar Kids com famílias reais
tipo: verificacao
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
Continuação externa explícita da O6. Dados simulados e testes autenticados comprovam o contrato, mas não o uso por famílias reais. Não houve participantes, aparelho real ou dados autorizados de famílias nesta execução. O usuário pediu para publicar o possível sem inventar conclusão do restante.

## Arquivos (trilho)
- `docs/service-v7/historias/O7-kids-familias-reais.md`

Definir na reserva após combinar a prova com a gestão e confirmar reservas atuais.

## Pronto quando
- Famílias reais percorrem cadastro/vínculos, check-in e pedido de retirada, e a equipe confirma visualmente a entrega à pessoa autorizada.
- Verificar também co-responsável, ausência de autorização para buscar e privacidade entre famílias, com consentimento e dados adequados ao ambiente de teste.
- Registrar evidência e limitações de aparelho/fluxo, sem publicar dados pessoais das crianças no git.
- Corrigir problemas encontrados dentro do trilho liberado, ou registrar história própria para o responsável.

## Notas
O4 já percorreu a cadeia autenticada com fixtures em Supabase descartável: equipe registra, família lê/pede retirada, equipe confirma, família recebe o retorno, colega/outra igreja não recebem dados. O6 acrescenta volume financeiro, não famílias reais. Nenhuma dessas provas permite marcar esta história feita.

Mensagem para Claude/gestão: realizar a etapa com participantes e aparelhos reais quando houver famílias disponíveis; não substituir por mais fixtures nem confundir captura de demonstração com validação de pessoas. Esta etapa depende de participação externa, não apenas de liberação da I10.
