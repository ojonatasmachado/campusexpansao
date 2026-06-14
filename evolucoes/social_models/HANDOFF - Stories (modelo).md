# HANDOFF — Stories CE.X (modelo de arte)

> Para Claude Code. Especificação do **modelo de Stories** da CE.X, pronta pra
> implementar no site/gerador. Vale junto com `AGENTS.md` (leis de marca) e o
> `CEX_BrandBook_v3`. Referência visual viva: `social_models/Modelos de Arte Social.html`
> (componente `SStory`, seção "Stories").

---

## 0. Princípio (o que o modelo PRECISA fazer)

O Stories é **um único frame** (nunca uma sequência) que **converte sozinho**.
Ele lidera com um **gancho** que para o scroll e termina num **CTA** que aponta pro
botão de link / tráfego pago do Instagram. Tudo 100% ID CE.X: fundo Ink, Inter,
**oliva é o único acento**, palavra-chave em **itálico oliva**.

Leitura de cima pra baixo, sempre nesta ordem:

```
KICKER     (contexto/segmento, mono oliva, pequeno)
   ↓
GANCHO     (manchete gigante, para o scroll — dor OU promessa)
   ↓
PONTE      (uma linha que liga o gancho à oferta)
   ↓
CTA        (pílula oliva, ação — aponta pro botão do Instagram)
```

---

## 1. Canvas e zonas

| Item | Valor |
|---|---|
| Dimensão | **1080 × 1920** (9:16) |
| Fundo | `--ink #0E110D` (padrão) ou `--graphite #161A12` (variação de ritmo) |
| Padding interno | `100px 88px 360px` (topo / laterais / base) |
| **Zona segura inferior** | **310px de baixo SEMPRE livres** (UI do Instagram + botão "Saiba mais" do tráfego pago). O `padding-bottom: 360px` já garante isso. |
| Filete de topo | barra `--olive` de **5px** full-width em `top:0` |
| Marca d'água | "X" gigante, Inter 800 itálico, `rgba(122,158,63,.06)`, canto inferior direito, atrás do conteúdo |

> A zona segura é inegociável: nenhum texto/CTA pode entrar nos 310px de baixo.

---

## 2. Tipografia (idêntica ao brand book)

Fonte única: **Inter** (Google Fonts), carregada com o eixo óptico **opsz** e os
ajustes de OpenType do brand book. Sem isso, o Inter renderiza glifos levemente
diferentes do brand book.

```css
/* No <head> */
/* Inter com eixo opsz + itálico + pesos 400..900 */
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,800;1,14..32,400;1,14..32,800&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* Aplicar a TODA a peça (herdado) */
.peca-cex{
  font-family:'Inter',sans-serif;
  font-feature-settings:"ss01","cv11";   /* <- ajuste do brand book */
  font-variation-settings:"opsz" 144;     /* clampa em 32 = óptico display */
}
```

| Papel | Fonte / peso | Tamanho | Detalhe |
|---|---|---|---|
| Kicker | JetBrains Mono 500 | 26px | `letter-spacing:.16em`, UPPERCASE, cor `--olive` |
| **Gancho** (headline) | **Inter 800** | **138px** | `line-height:.95`, `letter-spacing:-.04em`, cor `--cream-soft`. `text-wrap:balance` |
| Ênfase no gancho | **Inter 800 itálico** | (igual) | `<em>` → `font-style:italic; color:--olive` |
| Ponte | Inter 400 **itálico** | 46px | `line-height:1.3`, cor `--muted`, `max-width:860px` |
| CTA (pílula) | Inter 800 | 48px | texto em `--ink` sobre fundo `--olive` |

Headline ocupa o quadro: 1 a 3 linhas, sempre com **1 palavra-chave** em itálico oliva.

---

## 3. Tokens de cor (somente estes)

```css
--ink:#0E110D;        /* fundo dominante */
--graphite:#161A12;   /* fundo alternativo (ritmo) */
--olive:#7A9E3F;      /* ÚNICO acento: filete, kicker, ênfase, CTA, marca d'água */
--cream-soft:#F6F1E0; /* manchete */
--muted:#8B8C82;      /* ponte */
```

Sem cor-de-estante / sem terroso aqui. Oliva é o acento da marca. Texto sobre oliva é sempre `--ink`.

---

## 4. Chrome (cabeçalho + marca)

- **Logo** `CE.X` no topo-esquerdo: `CE` em `--cream-soft`, `.` e `X` em `--olive`,
  **`X` em itálico**, Inter 800, ~44px. (Em fundo cream, `CE`→ink e `.X`→`--olive-deep`.)
- **Filete oliva** de 5px no topo absoluto.
- **Marca d'água "X"** gigante itálico no canto inferior direito, bem apagada.

---

## 5. CTA (pílula) — regra de conversão

- Pílula sólida `--olive`, texto `--ink`, cantos `border-radius:16px`, padding `32px 50px`.
- Fica **acima** da zona segura (dentro do `padding-bottom:360px`).
- Copy curta e imperativa, apontando pro recurso do Instagram:
  - Tráfego pago: `VER O MATERIAL →`, `QUERO O GUIA →`
  - Orgânico: `ARRASTA PRA CIMA ↑`, `LINK NA BIO →`
- Só `→ ↑` como marcas. Sem emoji. Zero travessão.

---

## 6. Estrutura de marcação (referência)

```html
<div class="stx peca-cex">                 <!-- 1080x1920, bg ink/graphite -->
  <div class="stx-rule"></div>              <!-- filete oliva 5px -->
  <div class="stx-wm">X</div>               <!-- marca d'água -->
  <div class="stx-inner">                   <!-- padding 100 88 360 -->
    <header class="stx-top">CE.X (logo)</header>
    <div class="stx-mid">                   <!-- flex, center -->
      <div class="stx-kicker">LÍDER DE IGREJA</div>
      <h2 class="stx-h">Sua equipe não está cansada. Está <em>sem direção.</em></h2>
      <p class="stx-bridge">Tem um material pronto que organiza isso em 4 passos.</p>
    </div>
    <div class="stx-cta-wrap"><div class="stx-pill">ARRASTA PRA CIMA ↑</div></div>
  </div>
</div>
```

CSS completo das classes `.stx*`: copiar do `<style>` de
`social_models/Modelos de Arte Social.html` (bloco "STORIES · 9:16").

---

## 7. Variações de gancho (testar)

O gancho é o que converte. Dois ângulos, mesma estrutura:

1. **Dor** (nomeia o problema que o líder sente):
   *"Sua equipe não está cansada. Está sem direção."*
2. **Promessa / reframe** (vira a chave):
   *"Voluntário bom não falta. Foi mal preparado."*

A palavra-chave (a virada) vai sempre em **itálico oliva**.

---

## 8. Checklist de aceite

- [ ] 1080×1920, fundo Ink (ou graphite), filete oliva no topo.
- [ ] **Um único frame** (não é carrossel de stories).
- [ ] Ordem: kicker → gancho gigante → ponte → CTA.
- [ ] Gancho em Inter 800 com 1 palavra em **itálico oliva**.
- [ ] `font-feature-settings:"ss01","cv11"` + `font-variation-settings:"opsz" 144`.
- [ ] Oliva é o único acento. Texto sobre oliva é ink.
- [ ] **310px inferiores livres** pra UI do Instagram / botão do tráfego pago.
- [ ] Marcas só `◆ → ↑`. Sem emoji. Zero travessão (`—`/`–`).
