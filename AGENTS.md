# CE.X · Campus Expansão — Guia para Agentes de Código

> Este arquivo é lido automaticamente pelo **Codex (OpenAI)** e pelo **Claude Code (Anthropic)**.
> Siga todas as instruções abaixo antes de qualquer edição.

---

## Estrutura do projeto

```
app/
  layout.tsx      ← metadata, fontes, imports dos CSS
  page.tsx        ← página principal (Home) — edite aqui o conteúdo
public/
  tokens.css      ← variáveis CSS da marca (cores, espaçamento, tipografia)
  components.css  ← estilos de todos os componentes
  pages.css       ← estilos de seções de página
  tokens.json     ← tokens em formato machine-readable
```

**Nunca edite** `tokens.css`, `components.css` ou `pages.css` diretamente — são a fonte da verdade da marca.

---

## Como publicar alterações

```bash
git add -A && git commit -m "descrição da mudança" && git push
```

A Vercel faz o deploy automaticamente após o push. Site: https://campusexpansao.vercel.app/

---

## Tarefas comuns

### Editar texto de uma seção
Abra `app/page.tsx` e localize o texto pelo conteúdo. Edite apenas o texto dentro das tags JSX — não altere as `className`.

### Adicionar um curso
No array de cursos em `app/page.tsx`, adicione um objeto no padrão:
```ts
{ num: "04", title: "Nome do Curso", desc: "Descrição curta do curso." }
```

### Adicionar uma pergunta no FAQ
No array de FAQ em `app/page.tsx`, adicione:
```ts
{ q: "Pergunta?", a: "Resposta completa." }
```

### Adicionar nova seção
Use apenas classes documentadas abaixo. Nunca crie CSS inline fora do padrão do design system.

---

## Sistema de design da CE.X · Biblioteca da Marca

> Fonte da verdade para agentes de código (Claude Code, Codex) e desenvolvedores.

---

## Conteúdo do pacote

| Arquivo | O que é |
|---|---|
| `tokens.css` | Variáveis CSS (`:root`) — cores, espaçamento, raio, tipografia, movimento |
| `tokens.json` | Os mesmos tokens em formato machine-readable (W3C Design Tokens) |
| `components.css` | Estilos de todos os componentes e seções (botões, cards, nav, forms, hero, etc.) |
| `pages.css` | Estilos adicionais das páginas montadas (home, landing, sobre) |
| `AGENTS.md` | Este arquivo — instruções de uso para IA/dev |

---

## Setup mínimo

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Fontes -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <!-- Design system: tokens ANTES de components -->
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="components.css">
  <link rel="stylesheet" href="pages.css">
</head>
<body>
  <!-- use as classes documentadas abaixo -->
</body>
</html>
```

**Ordem de import importa:** `tokens.css` → `components.css` → `pages.css`.

---

## Identidade (não-negociável)

- **Acento oliva `--olive` (#7A9E3F)** nunca passa de ~15% de uma tela.
- **Fundo** é sempre `--ink` (escuro) ou `--cream` (claro). Nunca colorido fora da paleta.
- **Tipografia única:** Inter (display + corpo) + JetBrains Mono (metadados). Não substituir.
- **Logo CE.X:** "CE" peso 700 + ponto e "X" em oliva, peso 700, sem itálico.
  ```html
  <span class="nav-logo">CE<span class="dot">.</span><span class="x">X</span></span>
  ```
- **Itálico** = ênfase editorial. Use `<em>` (vira oliva automaticamente em títulos).
- **Texto sobre oliva** é sempre escuro (`--ink`).
- **Sem emojis** decorativos. Marcas semióticas permitidas: ◆ ◇ → —

---

## Tokens principais

### Cores
`--ink` `--graphite` `--card` `--border` `--border-2`
`--olive` `--olive-soft` `--olive-deep` `--olive-dim` `--olive-line`
`--cream` `--cream-soft`
`--white` `--light` `--muted` `--subtle` `--danger`

### Espaçamento — escala 4px
`--sp-1` (4px) … `--sp-8` (64px)

### Raio
`--r-sm` (4px) · `--r-md` (8px) · `--r-lg` (14px) · `--r-pill` (100px)

### Movimento
`--ease` (expo.out) · `--dur-fast` (0.18s) · `--dur-base` (0.4s) · `--dur-slow` (0.7s)

---

## Componentes disponíveis (classes)

### Tipografia
`.t-display` `.t-h1` `.t-h2` `.t-h3` `.t-body-lg` `.t-body` `.t-small` `.t-eyebrow`

### Botões
`.btn` + variante: `.btn-primary` `.btn-secondary` `.btn-cream` `.btn-ghost` `.btn-ink`
+ tamanho: `.btn-lg` `.btn-sm` · + `.btn-arrow` (adiciona →) · suporta `:disabled`

```html
<button class="btn btn-primary btn-arrow">Baixar material</button>
```

### Card
`.card` (`.card-cream` p/ variante clara) › `.card-media` `.card-tag` `.card-body`
`.card-eyebrow` `.card-title` `.card-desc` `.card-foot` `.card-meta` `.card-link`

### Navegação
`.nav` › `.nav-logo` `.nav-links` `.nav-link` (`.active`) `.nav-cta`
Mobile: `.nav-mobile` `.nav-burger`

### Formulários
`.field` › `.field-label` (`.req`) `.input` `.textarea` `.select` `.field-hint` `.field-error` (`.input.error`)
`.check-row` › `.check-box` (`.checked`) `.check-label` · `.toggle` (`.on`)

### Blocos / seções de página
- **Hero:** `.hero` › `.hero-grid-bg` `.hero-x` `.hero-inner` `.hero-eyebrow` `.hero-title` `.hero-desc` `.hero-actions`
- **Captura:** `.capture` › `.capture-eyebrow` `.capture-title` `.capture-desc` `.capture-form` `.capture-btn`
- **Footer:** `.footer` › `.footer-top` `.footer-brand-logo` `.footer-col-title` `.footer-links` `.footer-bottom` `.footer-social`
- **Lista de materiais:** `.mat-list` › `.mat-item` `.mat-num` `.mat-title` `.mat-meta` `.mat-type`
- **Grade de cursos:** `.course-grid` › `.course` `.course-num` `.course-title` `.course-desc` `.course-foot`
- **Depoimento:** `.testimonial` › `.testi-mark` `.testi-quote` `.testi-author` `.testi-avatar` `.testi-name` `.testi-role`
- **FAQ:** `.faq` › `.faq-item` (`.open`) `.faq-q` `.faq-q-text` `.faq-icon` `.faq-a`
- **CTA:** `.cta-block` › `.cta-eyebrow` `.cta-title` `.cta-desc` `.cta-actions`

### Headers de seção
`.psec-head` › `.psec-head-left` `.psec-eyebrow` `.psec-title` `.psec-desc`

---

## JS necessário (mínimo)

Componentes que precisam de JS:

```js
// FAQ accordion
document.querySelectorAll('.faq-q').forEach(q =>
  q.addEventListener('click', () => q.parentElement.classList.toggle('open')));

// Checkbox / toggle
document.querySelectorAll('.check-box').forEach(c =>
  c.addEventListener('click', () => c.classList.toggle('checked')));
document.querySelectorAll('.toggle').forEach(t =>
  t.addEventListener('click', () => t.classList.toggle('on')));
```

---

## Instruções para agentes de código

Ao desenvolver o front-end da CE.X:

1. **Sempre** importe `tokens.css` primeiro e use as variáveis CSS — nunca hardcode hex.
2. **Reutilize** as classes de `components.css` antes de criar CSS novo.
3. Se precisar de um componente novo, **derive** dos tokens e siga o padrão visual existente (borda 0.5px `--border-2`, raio `--r-lg`, fundo `--graphite`).
4. Mantenha a proporção de cor: oliva é acento, não preenchimento.
5. Responsivo: breakpoint principal em `980px` (sidebar/grids colapsam para 1 coluna).
6. Para referência viva dos componentes renderizados, veja `web_design_system.html` e `site_paginas.html` no projeto.

---

*CE.X · Campus Expansão · Biblioteca da marca v1.0 · 2026*
