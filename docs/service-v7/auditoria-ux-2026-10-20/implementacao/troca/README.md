# Jornada de troca de escala

Verificada em 21/10/2026 com uma igreja e quatro contas sintéticas no Supabase local.

## Contrato percorrido

1. A pessoa escalada encontra o líder responsável definido pela cadeia de destinatários.
2. A conversa de pedido chega ao líder.
3. Apenas pessoas da mesma função, livres no evento e ainda não escaladas aparecem como candidatas.
4. O membro não consegue transferir a própria vaga diretamente.
5. A liderança substitui a pessoa; a nova responsável recebe a vaga como pendente.
6. A pessoa anterior perde a permissão de responder por aquela vaga.
7. A substituta confirma no próprio app.
8. A linha do tempo registra a saída da pessoa anterior.

## Ajustes de interface

- O membro vê que continua responsável até a confirmação da liderança.
- O painel diferencia pedir troca de substituir pessoa.
- A janela aguarda a resposta do banco antes de fechar.
- Falhas permanecem na janela com uma mensagem de recuperação.
- Duplo toque não dispara duas alterações.
- A substituição usa a pessoa atual como condição, evitando sobrescrever uma mudança concorrente.
- Ações menos frequentes ficam recolhidas em Outras ações.
- A janela oferece saída visível por Fechar ou Cancelar.

## Limite preservado

O pedido é uma conversa em Mensagens. Não existe aceite automático nem fila estruturada de pedidos de troca. A transferência efetiva continua sob responsabilidade da liderança.

## Verificação

`npx tsx scripts/check-local-troca.ts` cria dados sintéticos, percorre permissões, destinatário, mensagem, substituição, confirmação e histórico, e remove as fixtures ao terminar.

As capturas usam dados sintéticos. A tela inicial confirma a hierarquia do app do membro; o detalhe do evento confirma a leitura de data, local e função sem excesso de ações.

- `capturas/membro-inicio.png`
- `capturas/membro-evento.png`
