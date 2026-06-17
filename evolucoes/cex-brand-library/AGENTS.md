# CE.X · Biblioteca de Componentes — v2.0

> Sistema de design da **CE.X · Campus Expansão** para front-end (site + admin).
> Fonte da verdade para agentes (Claude Code, Codex) e devs.
> **Galeria viva:** abra `index.html` — todo componente renderizado, com botão *copiar* que entrega o markup real.

---

## Arquivos

| Arquivo | O que é | Importar quando |
|---|---|---|
| `tokens.css` | Variáveis `:root` + classes `.cat-*` de estante | **sempre, primeiro** |
| `tokens.json` | Mesmos tokens, machine-readable (W3C) | build/tooling |
| `components.css` | Base: tipografia, logo, botões, forms, card, nav + drawer | sempre |
| `sections.css` | Blocos de página: hero, captura, depoimento, FAQ, CTA, footer, lista, evento, nota | site público |
| `domain.css` | **Produto:** capítulo da jornada, estante full-bleed, cards A/C/B, card de curso AO VIVO, calendário | catálogo |
| `ui.css` | Interface: badges, chips, tabs, segmented, breadcrumb, paginação, modal, toast, banner, skeleton, empty, avatar, progress, stepper, tooltip, accordion, dropdown, spinner | sempre |
| `admin.css` | Painel: sidebar, métricas, tabela, status, seletor de estante travado, editor | só admin |
| `library.js` | Interações + carrossel arrastável + calendário + motor copiar | sempre |
| `gallery.css` | Chrome **só** do `index.html` — não usar no site | nunca no produto |

**Ordem:** `tokens` → `components` → `sections` → `domain` → `ui` → (`admin`) → `library.js`.

---

## Leis inegociáveis (resumo do AGENTS.md raiz)

1. **Oliva `--olive` #7A9E3F ≤ 15%** da tela. É acento, nunca preenchimento.
2. **Sem azul.** Acentos de estante saem só da paleta quente (sand→cocoa).
3. **A cor é da ESTANTE, não do card.** Defina `.cat-{token}` na fileira/contexto; tudo dentro herda via `--cat`. O card nunca declara cor própria.
4. **Fundo** sempre `--ink` (escuro) ou `--cream` (claro).
5. **Texto sobre oliva/cor** é sempre tinta escura (`--ink`).
6. **Logo:** `CE` 700 + `.`+`X` em oliva 700, sem itálico.
7. **Tipografia única:** Inter + JetBrains Mono. Não substituir.
8. **Zero travessão (—).** Marcas semióticas permitidas: `◆ ◇ → ●`. Use `<em>` para ênfase (vira oliva).
9. **Sem emoji** decorativo (exceto 🔒 no swatch travado do admin).

---

## A cor-por-estante (o mecanismo central)

Cada estante/nível tem um token quente. Aplique a classe **na fileira** e os cards herdam:

```html
<div class="row cat-clay">      <!-- Adolescentes -->
  <a class="mcard m-a cat-clay">…</a>   <!-- card herda --cat -->
</div>
```

| Classe | Token | Uso típico |
|---|---|---|
| `.cat-sand` | #E2D6B4 | estante neutra / capa |
| `.cat-wheat` | #CBA95C | Juniores |
| `.cat-amber` | #D6A23E | lançamentos |
| `.cat-clay` | #C5805A | Adolescentes |
| `.cat-terra` | #B5694A | séries |
| `.cat-rust` | #9C5A33 | Liderança |
| `.cat-cocoa` | #6F523A | Igreja toda |
| `.cat-olive` | #7A9E3F | Jovens / marca |

No **admin** a cor não é editável: o seletor de estante (`.shelf-select`) mostra a cor derivada com cadeado.

---

## Componentes de domínio (o que diferencia a CE.X)

### Capítulo da jornada — `.macro`
Divisor de família com numeral-fantasma + régua + contagem. Variantes `.macro--ministrar` (cream) / `.macro--liderar` (oliva).

### Estante (fileira full-bleed) — `.row`
Cabeçalho `◆` + faixa etária, carrossel arrastável (`.row-track`), setas (`.row-arrows`). ≥7 itens viram carrossel; ≤6 use `.row-track.is-fixed`. `library.js` ativa arrasto e setas.

### Card por posição — `.mcard` + `.m-a` / `.m-c` / `.m-b`
Mesma moldura, miolo varia pela posição na fileira:
- **`.m-a`** tipográfico (título grande)
- **`.m-c`** número (estatística/contagem)
- **`.m-b`** bloco de cor — **única exceção** que pinta cor cheia, **máx. 1 por fileira**.

Estrutura: `.art` (miolo) + `.foot` (família fixa: `.meta` `.price` `.cta-tag`).

### Card de curso AO VIVO — `.ccard`
Fundo escuro, cor só nos detalhes. Selo `.live` (`● AO VIVO`) é o único bloco sólido. `.ccard-level` `.ccard-title` `.ccard-stage`.

### Calendário — `[data-calendar]`
`library.js` renderiza o mês atual. Eventos via `data-events='{"2026-06-20":"cat-olive"}'`; legenda via `data-legend`.

---

## Catálogo de classes (resto)

**Tipografia** `.t-display .t-h1 .t-h2 .t-h3 .t-body-lg .t-body .t-small .eyebrow`
**Botões** `.btn` + `.btn-primary|secondary|ghost|cream|ink|danger` + `.btn-lg|sm` + `.btn-arrow` + `:disabled`
**Card genérico** `.card` (`.card-cream`) › `.card-media .card-body .card-title .card-foot`
**Nav** `.nav .nav-logo .nav-links .nav-link(.active) .nav-cta .nav-burger` · drawer `.nav-drawer(.open)`
**Forms** `.field .field-label(.req) .input .textarea .select .field-hint .field-error` · `.check-row .check-box(.checked)` · `.radio-row .radio-dot(.checked)` · `.toggle(.on)`
**Seções** `.hero .capture .testimonial .faq .cta-block .ev-card .footer .mat-list .course-grid .ds-note .psec-head`
**Interface** `.badge(.badge-olive|solid|cat|live) .chip(.active) .tabs/.tab(.active) .segmented .breadcrumb .pagination/.page-btn .progress/.progress-bar .stepper/.step(.done/.active) .avatar(.avatar-sm|lg/.avatar-stack) .tooltip .acc .dropdown .banner(.banner-soft) .toast(.err) .modal-overlay(.open) .skeleton .empty .spinner .divider`
**Admin** `.adm(.adm-side/.adm-main) .metrics/.metric .table .status(-pub|draft|live|soon) .shelf-select/.shelf-swatch/.swatch-rail .editor/.editor-panel .adm-item`

---

## Hooks de JS (`library.js`, zero dependência)

Atributos que o `library.js` lê automaticamente:
`data-copy` `data-toggle-code` (galeria) · `data-tabs` · `data-modal-open="id"` / `data-modal-close` · `data-dropdown` · `data-nav-open` / `data-nav-close` · `data-calendar` · `data-toggle` (chip).
FAQ/accordion, toggle, check, radio, segmento e carrossel funcionam por classe, sem atributo.

---

## Setup mínimo

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
<link rel="stylesheet" href="sections.css">
<link rel="stylesheet" href="domain.css">
<link rel="stylesheet" href="ui.css">
<!-- admin: + <link rel="stylesheet" href="admin.css"> -->
<script src="library.js" defer></script>
```

---

## Para agentes de código

1. Importe `tokens.css` **primeiro**; nunca hardcode hex.
2. Reutilize classes antes de escrever CSS novo. Componente novo → derive dos tokens (borda `0.5px var(--border-2)`, raio `var(--r-lg)`, fundo `var(--graphite)`).
3. Cor de catálogo **só** via `.cat-*` no contexto-pai.
4. Layout de grupos (botões, chips, cards) com flex/grid + `gap`, nunca inline.
5. Breakpoints: `980px` (grids/sidebar colapsam) e `860px` (mobile / drawer).
6. Dúvida visual → `index.html` é a referência renderizada.

---

*CE.X · Campus Expansão · Biblioteca de componentes v2.0 · 2026*
