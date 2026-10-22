---
id: O1
titulo: Verificar criação de culto avulsa no estilo do assistente
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
O modal "Novo culto" avulso pode não usar o mesmo estilo do assistente. O assistente já tem HORARIOS e resumoDosCultos em setup.ts, mas o modal avulso não foi confirmado.
Fonte: DEPLOY.md:95.

## Arquivos (trilho)
- `app/service/modules/configuracao/setup.ts`

## Pronto quando
- Modal avulso usa o mesmo estilo do assistente, ou a nota da Fase 22 é fechada com evidência.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
A nota da Fase 22 (horários de culto) está coberta pelo assistente 4.12 (modules/configuracao/setup.ts: HORARIOS). Tamanho P a M.
