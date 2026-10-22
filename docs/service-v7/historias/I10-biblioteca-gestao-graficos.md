---
id: I10
titulo: Biblioteca, bloco D (indicadores e gráficos)
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [I4]
tamanho: M
---

## Por quê
Indicador (Kpi) está duplicado com o admin e não há gráficos padronizados (tendência, meta, barras, funil, frequência, entradas e saídas, cobertura).
Fonte: canvas "Service, direção visual" (claude.ai/artifact/JNpxaXTN3uVPmvdLCgcdMb), prancha 2; docs/service-v7/BIBLIOTECA.md.

## Arquivos (trilho)
- `app/service/ui/`
- `app/service/painel/comum.tsx`, `app/service/modules/inicio/Saude.tsx`, `app/service/modules/financeiro/`, `app/service/modules/relatorios/`

## Pronto quando
- Indicador com número que conta e minilinha.
- Gráficos da prancha 2 como peças, usados em Relatórios, Saúde e Financeiro.
- Movimento reduzido respeitado.

## Notas
Mesmo método do I4: peça em app/service/ui, visual em biblioteca.css, galeria em /service/demo/biblioteca, troca tela a tela, regra no scripts/check-service-componentes.ts.
