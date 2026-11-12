---
id: O1
titulo: Verificar criação de culto avulsa no estilo do assistente
tipo: codigo
status: cancelada
quem: claude
desde: 2026-11-12
branch: historia/O1-criacao-culto-avulsa
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
- 12/11 (claude): cancelada, incorporada à O10. Evidência: desde 14be74309 (21/10) o assistente não usa mais `HORARIOS`/`resumoDosCultos` (só `setup.ts` declara; `grep -rn "resumoDosCultos(" app/service` não acha chamada). O estilo atual do assistente é um encontro (nome, data, hora, local) com "repetir" opcional (`Assistente.tsx:66`), que é o que a O10 pede para o "Novo {culto}" avulso de `painel/telas/Agenda.tsx:54` (hoje um formulário genérico sem repetição), além de 15 dias, mês e edição da série. A limpeza dos exports sem uso de `setup.ts` vai na O10.
