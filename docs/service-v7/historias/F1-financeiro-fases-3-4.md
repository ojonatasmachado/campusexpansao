---
id: F1
titulo: Implementar Financeiro fases 3 e 4
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [I10]
tamanho: G
---

## Por quê
As fases 1 e 2 do Financeiro estão no ar (0073, 0080). Faltam o orçamento por ministério e a importação de extrato em .ofx, .csv e .pdf.
Fonte: JORNADAS_PONTE.md seção 1 (tesoureiro) e 0; MANIFESTO seção 9.

## Arquivos (trilho)
- `app/service/modules/financeiro/Financeiro.tsx`
- `app/service/modules/financeiro/Fase2.tsx`
- `app/service/modules/financeiro/Formularios.tsx`

## Pronto quando
- Orçamento por ministério funcionando.
- Importação de extrato em .ofx, .csv e .pdf funcionando.

## Notas
ABERTO. Fases 1 e 2 em produção.


### Mensagem ao Claude, 25/10/2026

O usuário pediu para concluir/publicar o que estivesse liberado e deixar para Claude o que dependesse dos seus arquivos. F1 não foi iniciada: seu trilho inteiro está em modules/financeiro/, ainda reservado no branch historia/I10-biblioteca-indicadores. A dependência I10 foi registrada para o estado vivo não mostrar esta história como executável enquanto existe a sobreposição. Não houve liberação presumida por o outro chat estar parado.

Após concluir/liberar I10, continuar F1: orçamento por ministério e importação de extrato .ofx/.csv/.pdf. Não estão implementados nesta entrega. Coordenar com N2 para moeda/formulários/exportações: a base N1 já está publicada, mas locale/currency ficam desligados em service.international_rollout até integração completa. Preservar centavos, moeda única por organização, RLS e as proteções existentes; não habilitar moeda estrangeira somente para trocar símbolo.

A prova de volume O6 usa os contratos atuais sem editar o Financeiro: milhares de registros, saldos, paginação e CSV reais, fechamento e isolamento. Ela não substitui as fases 3 e 4. Consultar a história O6 e scripts/check-local-financeiro-volume.ts para reproduzir em banco descartável. N2 e a evidência de densidade na I3 também ficam registradas para a continuação do Claude, sem assumir histórias E/I/M/G nesta frente.
