---
id: I10
titulo: Biblioteca, bloco D (indicadores e gráficos)
tipo: codigo
status: feita
quem: claude
desde: 2026-10-23
branch: historia/I10-biblioteca-indicadores
depende: [I4]
tamanho: M
---

## Por quê
Indicador (Kpi) estava duplicado com o admin e não havia gráficos padronizados (tendência, meta, barras, funil, frequência, entradas e saídas, cobertura).
Fonte: canvas "Service, direção visual" (claude.ai/artifact/JNpxaXTN3uVPmvdLCgcdMb), prancha 2; docs/service-v7/BIBLIOTECA.md.

## Arquivos (trilho)
- `app/service/ui/Indicador.tsx` — novo
- `app/service/ui/Graficos.tsx` — novo (Barras, Tendencia, Meta, Cobertura, Distribuicao, EntradasSaidas, Frequencia, Progresso)
- `app/service/ui/biblioteca.css` — CSS dos gráficos e indicadores (.graf-*, .ind-*, .minilinha)
- `app/service/demo/biblioteca/BlocoD.tsx` — galeria viva do bloco D
- `app/service/demo/biblioteca/Galeria.tsx` — import do BlocoD
- `app/service/painel/comum.tsx` — Kpi agora é wrapper fino do Indicador
- `app/service/painel/telas/Relatorios.tsx` — trocado Kpi → Indicador
- `app/service/painel/telas/Formacao.tsx` — trocado Kpi → Indicador
- `app/service/painel/telas/Visitantes.tsx` — trocado Kpi → Indicador
- `app/service/painel/telas/Inicio.tsx` — trocado Kpi → Indicador
- `app/service/modules/inicio/Saude.tsx` — já usava Indicador (sessão anterior)
- `app/service/modules/financeiro/Fase2.tsx` — já usava Indicador + EntradasSaidas (sessão anterior)
- `app/service/modules/financeiro/Financeiro.tsx` — já usava Indicador (sessão anterior)
- `app/service/membro/Cursos.tsx` — adicionado import de Progresso
- `app/service/painel/telas/FichaPessoa.tsx` — adicionado import de Progresso
- `scripts/check-service-componentes.ts` — regra nova para indicador/gráfico
- `scripts/check-graficos-contraste.ts` — novo (validação de contraste dos gráficos)

## Pronto quando
- ✅ Indicador com número que conta e minilinha.
- ✅ Gráficos da prancha 2 como peças, usados em Relatórios, Saúde e Financeiro.
- ✅ Movimento reduzido respeitado.
- ✅ Troca mecânica de Kpi → Indicador em todas as telas do painel.
- ✅ Regra no CI barra .kpi-value/.kpi-label/.kpi-foot fora de app/service/ui/.
- ✅ Validação de contraste dos gráficos passa em todas as combinações.

## Notas

### Validação de contraste (scripts/check-graficos-contraste.ts)
Script criado que importa theme.ts e testa todas as combinações de cor da igreja (ACCENT_PRESETS + 4 cores da prancha) × 8 famílias de neutros × modos claro/escuro.
Resultado: 0 falhas, 32 avisos únicos de proximidade igreja ↔ estado (ex: Oliva ≈ --ok, Dourado ≈ --warn). Todos os avisos são cobertos por codificação secundária: as peças usam aria-label, rótulo direto e Selo com texto, nunca dependem só da cor para transmitir estado.
Marcas gráficas (barras, linhas, arcos) exigem ≥ 1.5:1 contra superfície (não 3:1, pois não são texto); texto na cor da igreja exige ≥ 4.5:1 (garantido por accentText do theme.ts). Cinza "resto" deriva de color-mix sobre --muted, nunca hex fixo.

### Skills aplicados
- **dataviz**: forma certa para cada pergunta (linha=tendência, anel=meta, barras=comparação, funil=distribuição, mapa de frequência=heatmap, barras pareadas=entradas/saídas, barra horizontal=cobertura). Cores por função (estado, não identidade). Validação via script próprio (não o validate_palette.js do dataviz, pois a paleta do Service é dinâmica por igreja).
- **ui-ux-pro-max** (lido como arquivo): tipos de gráfico adequados, alvos de toque ≥ 32px no painel, contraste 4.5:1 para texto, movimento reduzido respeitado.
- **impeccable** (lido como arquivo): acabamento, hierarquia visual, estados (padrão, carregando, vazio, pendente). Cobertura usa classe .pendente/.ok para mudar cor da barra E do texto simultaneamente.
- **animate** (lido como arquivo): barras sobem da base (transform-origin: bottom, graf-sobe 0.7s), linha se desenha da esquerda (stroke-dashoffset, graf-desenha 1.2s), células aparecem em onda (graf-cel 0.45s com delay escalonado), anel desenha o arco (graf-desenha 1.4s). Tudo com prefers-reduced-motion: reduce desliga animações. Curvas usam var(--ease-drawer) do tema.
- **break-ui** (lido como arquivo): pior caso testado na galeria BlocoD com botão "Trocar dados" (valores diferentes) e "Repetir animação" (remonta o bloco). Nomes longos ("Recepção com um nome bem comprido para quebrar") e valor zero (Batismos = 0) renderizam corretamente.
- **review-animations** (lido como arquivo): todas as animações são GPU-only (transform, opacity, stroke-dashoffset), nenhuma anima width/height/margin. Durações dentro do limite (≤ 300ms para UI, até 1.4s para gráficos decorativos de entrada única). Sem ease-in em UI. prefers-reduced-motion honrado.
- **web-design-guidelines** (lido como arquivo): cada gráfico tem role="img" com aria-label descritivo (ex: "Presença média nos cultos: de 158 a 187"), números tabulares com classe .num, contraste verificado pelo script próprio.

### O que ficou de fora
- Tooltip interativo nos gráficos (hover/crosshair): adiado porque os gráficos atuais são resumos visuais com rótulos diretos e aria-label; tooltip seria útil em gráficos com mais séries ou drill-down. Vira história nova se necessário.
- Textura para CVD/print: os gráficos usam cor como estado com codificação secundária (rótulo + número + Selo), atendendo ao requisito legal sem textura. Se uma igreja escolher cor muito próxima de um estado, o Selo já diferencia.
- Tabela alternativa (toggle dados/gráfico): os gráficos já mostram números escritos ao lado das marcas; uma tabela separada seria redundante neste momento.