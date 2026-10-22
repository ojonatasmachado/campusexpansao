---
id: F1
titulo: Implementar Financeiro fases 3 e 4
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
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
