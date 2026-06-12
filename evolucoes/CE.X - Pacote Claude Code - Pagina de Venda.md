# CE.X · Página de Venda (Landing) — PACOTE ÚNICO PRA CLAUDE CODE

> Arquivo **autossuficiente**: especificação completa + **todo o código de referência**
> (HTML do protótipo, modelo de dados, render e painel). Entregue ESTE arquivo ao Claude
> Code. Recrie o design no app React/Vite existente seguindo `AGENTS.md` (raiz).
>
> **Sumário:** 1) Especificação · 2) Anexo A HTML · 3) Anexo B dados · 4) Anexo C render ·
> 5) Anexo D painel · 6) Anexo E formatos no admin · 7) Notas de produção

---

# HANDOFF · Página de Venda (Landing) — CE.X

> **Para o Claude Code:** leia `AGENTS.md` (raiz) antes de codar — paleta quente sem azul,
> cor travada por estante, marca ◆, zero travessão. Este doc descreve **a página de venda
> (landing)** que cada produto abre ao ser clicado. Os protótipos de referência (look final)
> são: `Pagina de Venda - Landing.html` + `landing-data.js` + `landing-render.js` +
> `landing-tweaks.jsx`. **Recrie esse design no app React/Vite existente** seguindo os padrões dele.

---

## 1. Objetivo

Toda página de detalhe de produto **É a landing de venda** (não existe página separada de
"detalhe" + "landing"). É o destino do clique no card E o link que vai pro Instagram /
tráfego pago. Precisa:

- **Funcionar sozinha** (quem cai do Instagram fecha a compra sem precisar do resto do site).
- **Vender pela autoridade** — tom sóbrio/editorial, direto ao valor. Sem desconto falso,
  sem urgência forçada.
- Ser **mobile-first** (a maior parte do tráfego é celular) e impecável no desktop.
- Ser **data-driven**: cadastrar produto = preencher poucos campos; a página inteira se monta.

---

## 2. Princípio central: UMA landing que se adapta pelo `type`

Não criar uma página por tipo de produto. É **um template só** com um **núcleo comum** e
**blocos que ligam/desligam conforme `type`**. Tipos:

| `type` | O que é | CTA / lógica de conversão |
|---|---|---|
| `material` | Conteúdo pronto (compra única) | **COMPRAR → Hotmart** (link externo, nova aba) |
| `ondemand` | Curso/treinamento gravado (compra única) | **COMPRAR ACESSO → Hotmart** |
| `curso` | Turma ao vivo, com trilha/etapa | **Entrar na lista de espera** (sem Hotmart) |
| `mentoria` | Acompanhamento (grupo/individual) | **Quero ser mentorado** (sem Hotmart) |
| `evento` | Encontro ao vivo (retiro, conferência) | **Garantir vaga** (Hotmart opcional) |

**Por que assim (minha recomendação):** o esqueleto de venda é o mesmo pra todos
(promessa → autoridade → pra quem é → o que tem dentro → prévia → como funciona → tese →
oferta → relacionados → FAQ). O que muda entre os tipos é **pouco**: o rótulo da meta, uma
ou duas seções e o botão final. Modelar como UM template com `switch(type)` nos 3-4 pontos
que variam é muito mais barato de manter do que 5 páginas. O admin já alterna por tipo —
basta estender (adicionar `ondemand` e os campos abaixo).

---

## 3. Campos editáveis — núcleo comum (TODOS os tipos)

Marque ◆ = **obrigatório**. O resto é **opcional** e **some da página se ficar vazio**.

| Campo | Tipo do dado | Obrig. | Para que serve na página |
|---|---|:--:|---|
| `type` | enum (lista acima) | ◆ | Decide CTA, meta e blocos visíveis |
| `title` | texto | ◆ | Título gigante do topo + pôster |
| `shelf` (estante) / `level` (curso) | enum | ◆ | **Define a COR (travada)** + a faixa/linha |
| `desc` | texto (1 frase) | ◆ | A promessa abaixo do título |
| `code` | texto curto | — | Etiqueta no canto (ex: `S-12`) |
| `image` | upload | — | Capa real; sem ela usa o **pôster tipográfico** automático |
| `formatos` | **multi-select** | — | Etiquetas (PDF · Word · PPT · …) — ver §5 |
| `paraQuem` | parágrafo | — | Seção "Pra quem é" (nomeia a dor) |
| `depoimento` | `{texto, autor}` | — | Prova social (some se vazio) |
| `status` | `Publicado` / `Rascunho` | ◆ | Rascunho não aparece no site |

> **Cor:** nunca é campo livre. Vem **sempre** da estante/nível (mapa em `landing-data.js →
> CEX_SHELVES`). Cadastrou a estante, a página inteira se pinta. Oliva ≤ 15% da peça.

---

## 4. Campos editáveis — por tipo (além do núcleo)

### 4a. `material` (compra única → Hotmart)
| Campo | Dado | Obrig. |
|---|---|:--:|
| `price` | número (R$) | ◆ |
| `hotmart` | URL | ◆ |
| `messages` | número (mensagens/encontros) | — |
| `pages` | número (páginas) | — |
| `beneficios` | lista de bullets ("o que vem dentro") | — |
| `messageList` | lista `{nome, desc}` (detalhe de cada mensagem) | — |

### 4b. `ondemand` (gravado, compra única → Hotmart) — **TIPO NOVO**
| Campo | Dado | Obrig. |
|---|---|:--:|
| `price` | número (R$) | ◆ |
| `hotmart` | URL | ◆ |
| `aulas` | número (aulas/módulos) | — |
| `duracao` | texto (ex: "4h30") | — |
| `modulos` | lista `{nome, desc}` (a grade) | — |
| `acesso` | texto (ex: "vitalício" / "12 meses") | — |

### 4c. `curso` (turma ao vivo → lista de espera, SEM Hotmart)
| Campo | Dado | Obrig. |
|---|---|:--:|
| `level` | `Fundação`/`Liderança`/`Multiplicação` | ◆ |
| `etapa` / `totalEtapas` | número / número (trilha "Etapa 02 de 06") | — |
| `weeks` | número (semanas) | — |
| `mentor` | texto | — |
| `proximaTurma` | texto (ex: "Turma de Set/26") | — |
| `ementa` | lista (o que se aprende por semana) | — |
| `aoVivo` | toggle (selo `● AO VIVO`) | — |

### 4d. `mentoria` (SEM Hotmart)
| Campo | Dado | Obrig. |
|---|---|:--:|
| `formato` | texto ("Grupo · 8 vagas" / "Individual") | — |
| `cadencia` | texto ("Quinzenal, 1h") | — |
| `mentor` | texto | — |

### 4e. `evento` (ao vivo)
| Campo | Dado | Obrig. |
|---|---|:--:|
| `data` | texto | ◆ |
| `local` | texto | — |
| `vagas` / `inscritos` | número / número | — |
| `price` + `hotmart` | número + URL (opcional — alguns são grátis) | — |

> **Possibilidade de criar campos novos:** o modelo é só um objeto. Adicionar campo =
> adicionar chave no dado + um `<Field>` no admin + um ponto de render. Sugiro padronizar
> 3 "tipos de campo" reutilizáveis no admin pra não reinventar: **texto curto**,
> **parágrafo**, **lista simples** (bullets), **lista de itens** (`{nome, desc}`),
> **multi-select** (formatos) e **número**. Com esses 6 controles você monta qualquer
> produto futuro sem código novo.

---

## 5. Formatos (multi-select marcável)

Caixas de marcar — o usuário liga as que vierem junto. Opções padrão:

```
PDF · Word · PPT · Slides · Editável · Planilha · Vídeo · Áudio
```

Viram etiquetas na cor da estante no topo e em "O que vem dentro". Deixe a lista de opções
fácil de estender (uma constante). Já implementado no admin: `admin/editor.jsx → FormatosField`.

---

## 6. Seções FIXAS (template — NÃO editável por produto)

Estas valem pra todo produto e ficam num bloco único (`landing-data.js → CEX_TEMPLATE`).
Editar uma vez muda todas as páginas:

- **Banda de autoridade** — a frase de impacto / tese ("…elas *preparam*").
- **Como funciona** — 3 passos (varia levemente por tipo: material/ondemand = "recebe na
  hora"; curso/mentoria = "entra na turma"; evento = "garante a vaga").
- **Tese CE.X** — "Nós preparamos. Deus multiplica."
- **FAQ** — perguntas genéricas (compra única / como recebo / etc).

**NÃO usar white-label / "põe a sua marca".** O público não conhece o termo e não tem
interesse em marca própria. O valor é "conteúdo pronto pra ministrar", só isso.

---

## 7. Ordem da página (núcleo)

1. **Hero** — voltar · estante › código · título · promessa · meta(formatos+nº) · **CTA** · pôster/capa · (vídeo opcional)
2. **Autoridade** (fixo)
3. **Pra quem é** (`paraQuem`; some se vazio)
4. **O que vem dentro** — fatos (nº + formatos) + lista (`messageList`/`modulos`/`ementa` ou `beneficios`)
5. **Prévia** — páginas de amostra (upload de imagens)
6. **Como funciona** (fixo, varia por tipo)
7. **Tese** (fixo)
8. **Oferta** — preço/CTA do tipo + garantia ("compra única, acesso vitalício" / "vaga limitada")
9. **Relacionados** — **automático**: outros produtos da mesma estante/nível. Só anuncia
   (link), **não vende junto**. Vem do catálogo, não é campo editável.
10. **FAQ** (fixo) + **CTA final**

**Vídeo:** opcional por produto. Sem vídeo, a área **não aparece**. Com vídeo, frame/embed.

---

## 8. Mobile-first

- Hero empilha (promessa → CTA → pôster). Botão de compra confortável (alvo ≥ 44px).
- Estantes/grids viram **coluna única**; etiquetas de formato quebram em linha.
- Texto nunca abaixo de ~15px no corpo. Nada de scroll horizontal.
- CTA **só nas seções** (sem barra fixa de compra no rodapé — decisão do cliente).

---

## 9. NÃO fazer

- ❌ Página separada por tipo de produto — é **uma** landing que adapta por `type`.
- ❌ Cor como campo livre — vem **sempre** da estante/nível.
- ❌ White-label / "coloque sua marca".
- ❌ Desconto/urgência fabricados, números de pesquisa inventados.
- ❌ Vender produtos juntos em "Relacionados" — ali só **aponta** pra outros.
- ❌ Travessão `—`, azul, emoji aleatório. Só `◆ ◇ → ·`.

---

## 10. Checklist de aceite

- [ ] Uma landing, data-driven, que muda CTA + meta + blocos pelo `type`.
- [ ] Tipos: `material`, `ondemand`, `curso`, `mentoria`, `evento`.
- [ ] Núcleo comum + campos por tipo (§3 e §4), com obrigatórios validados.
- [ ] Cor travada pela estante/nível; oliva ≤ 15%.
- [ ] Formatos = multi-select; viram etiquetas na página.
- [ ] Seções fixas centralizadas (autoridade, como funciona, tese, FAQ) — editar 1x afeta todas.
- [ ] Vídeo opcional some quando vazio. Sem white-label.
- [ ] Relacionados automáticos por estante (só link).
- [ ] Mobile-first impecável; CTA só nas seções.
- [ ] `material`/`ondemand`/`evento` → Hotmart nova aba. `curso`/`mentoria` → lista de espera.


---

## Anexo A · Protótipo HTML (`Pagina de Venda - Landing.html`)

Look e comportamento finais. Estrutura de seções, classes e `data-bind`/`data-screen-label` a recriar.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CE.X · Página de Venda</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,500;1,600;1,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<style>
:root{
  --ink:#0E110D; --graphite:#181B16; --graphite-2:#14170F; --border:#25291F; --border-2:#2E3327;
  --olive:#7A9E3F; --olive-soft:#94B85C; --olive-deep:#4F6B26; --olive-dim:rgba(122,158,63,0.10);
  --sand:#E2D6B4; --wheat:#CBA95C; --clay:#C5805A; --terra:#B5694A;
  --cream:#EDE6D3; --cream-soft:#F6F1E0;
  --white:#FAFAF7; --light:#E6E5DD; --muted:#8B8C82; --subtle:#555650;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'JetBrains Mono','SF Mono',monospace;
  --pad:64px;
  --cat:var(--clay);        /* acento da estante (sobrescrito por data-cat) */
  --cat-deep:#7C4B33;
  --maxw:1180px;
}
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:var(--ink);color:var(--white);font-family:var(--sans);-webkit-font-smoothing:antialiased;font-feature-settings:'ss01';line-height:1.5;overflow-x:hidden;}
::selection{background:var(--cat);color:var(--ink);}

/* acentos por estante */
body[data-cat="wheat"]{--cat:var(--wheat);--cat-deep:#8A6630;}
body[data-cat="sand"]{--cat:var(--sand);--cat-deep:#8A7B45;}
body[data-cat="clay"]{--cat:var(--clay);--cat-deep:#7C4B33;}
body[data-cat="terra"]{--cat:var(--terra);--cat-deep:#7C4030;}
body[data-cat="olive"]{--cat:var(--olive);--cat-deep:var(--olive-deep);}
body[data-cat="cream"]{--cat:var(--cream);--cat-deep:#9C9279;}

/* ── NAV ── */
.nav{position:sticky;top:0;z-index:60;display:flex;align-items:center;justify-content:space-between;
  padding:18px var(--pad);background:rgba(14,17,13,0.82);backdrop-filter:blur(14px);border-bottom:0.5px solid var(--border-2);}
.nav-logo{font-size:25px;font-weight:700;letter-spacing:-0.06em;text-decoration:none;color:var(--white);}
.nav-logo .dot,.nav-logo .x{color:var(--olive);}
.nav-links{display:flex;gap:34px;list-style:none;}
.nav-link{font-size:14.5px;color:var(--light);text-decoration:none;letter-spacing:-0.01em;transition:color .15s;}
.nav-link:hover{color:var(--white);}
.nav-link.active{color:var(--olive);}
.nav-cta{font-size:14px;font-weight:600;color:var(--ink);background:var(--olive);padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-flex;gap:8px;align-items:center;transition:background .18s;}
.nav-cta:hover{background:var(--olive-soft);}

.wrap{max-width:var(--maxw);margin:0 auto;padding:0 var(--pad);}
.eyebrow{font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:var(--cat);display:inline-flex;align-items:center;gap:10px;}
.eyebrow::before{content:'◆';font-size:9px;}
.sec-mark{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:var(--cat);display:inline-flex;align-items:center;gap:9px;margin-bottom:22px;}
.sec-mark::before{content:'◆';font-size:8px;}

/* ════ HERO ════ */
.hero{padding:54px 0 70px;border-bottom:0.5px solid var(--border);}
.hero-grid{display:grid;grid-template-columns:1fr 0.86fr;gap:64px;align-items:center;}
.hero-back{font-family:var(--mono);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);text-decoration:none;display:inline-flex;gap:8px;margin-bottom:26px;transition:color .15s;}
.hero-back:hover{color:var(--cat);}
.hero-crumb{font-family:var(--mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--cat);margin-bottom:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.hero-crumb .sep{color:var(--subtle);}
.hero-crumb .code{color:var(--subtle);}
.hero h1{font-size:88px;font-weight:800;letter-spacing:-0.05em;line-height:0.9;color:var(--cream);text-wrap:balance;}
.hero-promise{font-size:22px;line-height:1.42;color:var(--light);max-width:480px;margin-top:24px;font-weight:400;text-wrap:pretty;}
.hero-promise em{font-style:normal;color:var(--cream);font-weight:600;}
.hero-meta{display:flex;gap:9px;flex-wrap:wrap;margin-top:30px;}
.tag{font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:var(--light);background:var(--graphite);border:0.5px solid var(--border-2);padding:8px 14px;border-radius:100px;display:inline-flex;gap:7px;align-items:center;}
.tag b{color:var(--cat);font-weight:500;}
.tag.fmt{color:var(--cat);border-color:color-mix(in srgb,var(--cat) 40%,var(--border-2));}
.tag.fmt::before{content:'◆';font-size:7px;color:var(--cat);}
.hero-buy{display:flex;align-items:center;gap:22px;margin-top:38px;flex-wrap:wrap;}
.price-stack{display:flex;flex-direction:column;gap:2px;}
.price-stack .pv{font-size:13px;font-family:var(--mono);letter-spacing:0.04em;color:var(--muted);}
.price-stack .pp{font-size:38px;font-weight:800;letter-spacing:-0.03em;color:var(--white);line-height:1;}
.btn-buy{font-size:16px;font-weight:600;color:var(--ink);background:var(--olive);padding:16px 30px;border-radius:7px;text-decoration:none;
  display:inline-flex;gap:11px;align-items:center;transition:transform .15s,background .18s,box-shadow .2s;box-shadow:0 12px 30px -14px var(--olive);}
.btn-buy:hover{background:var(--olive-soft);transform:translateY(-2px);box-shadow:0 18px 38px -16px var(--olive);}
.hero-trust{font-family:var(--mono);font-size:11px;letter-spacing:0.04em;color:var(--muted);margin-top:18px;display:flex;align-items:center;gap:8px;}
.hero-trust::before{content:'◇';color:var(--cat);}

/* poster (capa tipográfica — sempre desenhada) */
.poster{position:relative;background:var(--ink);border:0.5px solid var(--border-2);border-top:2px solid var(--cat);border-radius:14px;
  aspect-ratio:4/4.6;display:flex;flex-direction:column;padding:30px;overflow:hidden;box-shadow:0 30px 70px -40px rgba(0,0,0,0.9);}
.poster::after{content:'';position:absolute;inset:0;background:radial-gradient(120% 80% at 80% 8%,color-mix(in srgb,var(--cat) 14%,transparent),transparent 55%);pointer-events:none;}
.poster-top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;}
.poster-cat{font-family:var(--mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--cat);display:inline-flex;gap:7px;align-items:center;}
.poster-cat::before{content:'◆';font-size:8px;}
.poster-code{font-family:var(--mono);font-size:11px;letter-spacing:0.1em;color:var(--subtle);}
.poster-title{margin-top:auto;font-size:80px;font-weight:900;letter-spacing:-0.05em;line-height:0.86;color:var(--cream);position:relative;z-index:1;text-wrap:balance;}
.poster-foot{margin-top:20px;font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:var(--muted);position:relative;z-index:1;display:flex;justify-content:space-between;border-top:0.5px solid var(--border);padding-top:16px;}
.poster image-slot{position:absolute;inset:0;border-radius:14px;z-index:2;}

/* vídeo opcional */
.video{margin-top:40px;}
body[data-video="off"] .video{display:none;}
.video-frame{position:relative;border-radius:14px;overflow:hidden;border:0.5px solid var(--border-2);background:var(--graphite-2);aspect-ratio:16/9;}
.video-frame image-slot{position:absolute;inset:0;}
.video-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:3;}
.video-play span{width:74px;height:74px;border-radius:100px;background:rgba(14,17,13,0.55);border:1px solid rgba(250,250,247,0.5);backdrop-filter:blur(4px);
  display:flex;align-items:center;justify-content:center;color:var(--white);font-size:22px;padding-left:5px;}
.video-cap{font-family:var(--mono);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-top:12px;text-align:center;}

/* ════ BANDA DE AUTORIDADE ════ */
.band{border-bottom:0.5px solid var(--border);background:var(--graphite-2);background-image:linear-gradient(var(--border) 1px,transparent 1px);background-size:100% 46px;}
.band-in{padding:78px 0;}
.band-q{font-size:42px;font-weight:700;letter-spacing:-0.035em;line-height:1.16;color:var(--cream);max-width:880px;text-wrap:balance;}
.band-q em{font-style:normal;color:var(--cat);}
.band-by{font-family:var(--mono);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-top:26px;display:inline-flex;gap:10px;align-items:center;}
.band-by::before{content:'◇';color:var(--cat);}

/* ════ SEÇÃO BASE ════ */
.sec{padding:88px 0;border-bottom:0.5px solid var(--border);}
.sec-head{display:grid;grid-template-columns:0.42fr 1fr;gap:48px;align-items:start;}
.sec-h{font-size:40px;font-weight:700;letter-spacing:-0.035em;line-height:1.04;color:var(--cream);text-wrap:balance;}
.sec-h em{font-style:italic;font-weight:600;color:var(--cat);}
.sec-lead{font-size:18px;line-height:1.62;color:var(--light);text-wrap:pretty;}
.sec-lead p+p{margin-top:18px;}
.sec-lead strong{color:var(--cream);font-weight:600;}

/* pra quem é — lista de dores */
.pains{margin-top:30px;display:flex;flex-direction:column;gap:0;border-top:0.5px solid var(--border);}
.pain{display:flex;gap:18px;padding:18px 0;border-bottom:0.5px solid var(--border);align-items:baseline;}
.pain .mk{font-family:var(--mono);font-size:12px;color:var(--cat);flex:none;}
.pain p{font-size:16.5px;color:var(--light);line-height:1.5;}
.pain p b{color:var(--cream);font-weight:600;}

/* o que vem dentro */
.inside-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:46px;}
.fact{background:var(--graphite);border:0.5px solid var(--border-2);border-radius:12px;padding:26px 24px;}
.fact .n{font-size:46px;font-weight:800;letter-spacing:-0.04em;color:var(--cat);line-height:1;}
.fact .l{font-family:var(--mono);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-top:12px;}
.msgs{border-top:0.5px solid var(--border);}
.msg{display:grid;grid-template-columns:54px 1fr;gap:14px;padding:20px 0;border-bottom:0.5px solid var(--border);align-items:baseline;}
.msg .mn{font-family:var(--mono);font-size:14px;color:var(--cat);letter-spacing:0.04em;}
.msg .mt{font-size:20px;font-weight:600;letter-spacing:-0.02em;color:var(--cream);}
.msg .md{font-size:15px;color:var(--muted);line-height:1.5;margin-top:5px;}
.msg.msg-b{grid-template-columns:32px 1fr;}
.depo{margin-top:36px;border-left:2px solid var(--cat);padding:6px 0 6px 24px;font-size:21px;line-height:1.5;color:var(--cream);font-weight:500;max-width:760px;text-wrap:pretty;}
.depo cite{display:block;font-style:normal;font-family:var(--mono);font-size:12px;letter-spacing:0.06em;color:var(--muted);margin-top:16px;}

/* amostra */
.amostra-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:8px;}
.amostra-grid image-slot{width:100%;aspect-ratio:3/4;border:0.5px solid var(--border-2);}
.amostra-note{font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:var(--subtle);margin-top:18px;text-align:center;}

/* como usar — passos */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:8px;}
.step{background:var(--graphite);border:0.5px solid var(--border-2);border-radius:12px;padding:30px 26px;position:relative;}
.step .si{font-family:var(--mono);font-size:12px;letter-spacing:0.1em;color:var(--cat);}
.step h4{font-size:21px;font-weight:600;letter-spacing:-0.02em;color:var(--cream);margin:16px 0 10px;}
.step p{font-size:15px;color:var(--muted);line-height:1.55;}
.wl{margin-top:40px;display:flex;gap:18px;align-items:center;background:var(--graphite-2);border:0.5px solid var(--border-2);border-left:2px solid var(--cat);border-radius:12px;padding:24px 28px;flex-wrap:wrap;}
.wl .wl-t{font-size:16px;color:var(--light);line-height:1.55;flex:1;min-width:260px;}
.wl .wl-t b{color:var(--cream);}

/* ════ TESE / OFERTA ════ */
.thesis{background:var(--cat);color:var(--ink);}
.thesis-in{padding:96px 0;text-align:center;}
.thesis-mk{font-family:var(--mono);font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(14,17,13,0.6);}
.thesis-h{font-size:64px;font-weight:800;letter-spacing:-0.04em;line-height:0.98;color:var(--ink);margin-top:20px;}
.thesis-sub{font-size:18px;color:rgba(14,17,13,0.72);margin-top:22px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.55;}

.offer{padding:90px 0;border-bottom:0.5px solid var(--border);}
.offer-card{background:var(--graphite);border:0.5px solid var(--border-2);border-top:2px solid var(--cat);border-radius:18px;padding:54px 56px;
  display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center;box-shadow:0 30px 70px -45px rgba(0,0,0,0.9);}
.offer-h{font-size:34px;font-weight:700;letter-spacing:-0.03em;line-height:1.1;color:var(--cream);text-wrap:balance;}
.offer-h em{font-style:normal;color:var(--cat);}
.offer-list{margin-top:22px;display:flex;flex-direction:column;gap:11px;}
.offer-list li{list-style:none;font-size:15px;color:var(--light);display:flex;gap:12px;align-items:baseline;}
.offer-list li::before{content:'→';color:var(--cat);font-family:var(--mono);}
.offer-right{display:flex;flex-direction:column;align-items:flex-end;gap:18px;text-align:right;}
.offer-price .pv{font-size:13px;font-family:var(--mono);color:var(--muted);letter-spacing:0.04em;}
.offer-price .pp{font-size:56px;font-weight:800;letter-spacing:-0.04em;color:var(--white);line-height:1;}
.offer-price .px{font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:6px;}
.offer-guar{font-family:var(--mono);font-size:11px;letter-spacing:0.04em;color:var(--muted);max-width:230px;text-align:right;line-height:1.5;}
.offer-guar::before{content:'◇ ';color:var(--cat);}

/* ════ RELACIONADOS ════ */
.rel{padding:86px 0;border-bottom:0.5px solid var(--border);}
.rel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:30px;flex-wrap:wrap;}
.rel-h{font-size:30px;font-weight:700;letter-spacing:-0.03em;color:var(--cream);}
.rel-h em{font-style:italic;font-weight:600;color:var(--cat);}
.rel-sub{font-family:var(--mono);font-size:12px;letter-spacing:0.04em;color:var(--muted);margin-top:8px;}
.rel-all{font-family:var(--mono);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);text-decoration:none;white-space:nowrap;transition:color .15s;}
.rel-all:hover{color:var(--cat);}
.rel-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;}
.rcard{display:flex;flex-direction:column;background:var(--graphite);border:0.5px solid var(--border-2);border-top:2px solid var(--rc,var(--olive));
  border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;height:300px;transition:transform .2s,border-color .2s,box-shadow .2s;}
.rcard:hover{transform:translateY(-5px);box-shadow:0 18px 40px -22px var(--rc,var(--olive));}
.rcard .ra{flex:1;background:var(--ink);padding:18px;display:flex;flex-direction:column;justify-content:space-between;}
.rcard .rc-cat{font-family:var(--mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--rc,var(--olive));display:inline-flex;gap:6px;align-items:center;}
.rcard .rc-cat::before{content:'◆';font-size:7px;}
.rcard .rc-ttl{font-size:27px;font-weight:800;letter-spacing:-0.035em;line-height:0.95;color:var(--cream);text-wrap:balance;}
.rcard .rf{padding:14px 18px 16px;border-top:0.5px solid var(--border);display:flex;flex-direction:column;gap:10px;}
.rcard .rf .rm{font-family:var(--mono);font-size:10.5px;color:var(--muted);}
.rcard .rf .rr{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;}
.rcard .rf .rp{font-size:16px;font-weight:700;color:var(--white);white-space:nowrap;}
.rcard .rf .rl{font-family:var(--mono);font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--rc,var(--olive));white-space:nowrap;}

/* ════ FAQ ════ */
.faq{padding:86px 0;border-bottom:0.5px solid var(--border);}
.faq-grid{display:grid;grid-template-columns:0.42fr 1fr;gap:48px;align-items:start;}
.faq-list{border-top:0.5px solid var(--border);}
.qa{border-bottom:0.5px solid var(--border);padding:24px 0;}
.qa .q{font-size:19px;font-weight:600;letter-spacing:-0.02em;color:var(--cream);display:flex;gap:12px;align-items:baseline;}
.qa .q .mk{color:var(--cat);font-family:var(--mono);font-size:13px;flex:none;}
.qa .a{font-size:16px;color:var(--muted);line-height:1.6;margin-top:12px;padding-left:26px;text-wrap:pretty;}

/* ════ CTA FINAL + FOOTER ════ */
.foot-cta{padding:96px 0;text-align:center;}
.foot-cta h2{font-size:52px;font-weight:800;letter-spacing:-0.04em;line-height:0.98;color:var(--cream);text-wrap:balance;max-width:760px;margin:0 auto;}
.foot-cta h2 em{font-style:normal;color:var(--cat);}
.foot-cta .sub{font-size:18px;color:var(--light);margin-top:22px;}
.foot-cta .btn-buy{margin-top:36px;font-size:17px;padding:18px 36px;}
.foot-cta .micro{font-family:var(--mono);font-size:11px;letter-spacing:0.04em;color:var(--muted);margin-top:18px;}

.foot-band{border-top:0.5px solid var(--border-2);padding:48px 0 60px;}
.foot-row{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.foot-logo{font-size:23px;font-weight:700;letter-spacing:-0.06em;}
.foot-logo .dot,.foot-logo .x{color:var(--olive);}
.foot-copy{font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:var(--subtle);}

@media(max-width:980px){
  .hero-grid{grid-template-columns:1fr;gap:44px;}
  .poster{max-width:420px;}
  .sec-head,.faq-grid{grid-template-columns:1fr;gap:26px;}
  .inside-grid,.steps{grid-template-columns:1fr 1fr;}
  .rel-grid{grid-template-columns:1fr 1fr;}
  .offer-card{grid-template-columns:1fr;gap:30px;}
  .offer-right{align-items:flex-start;text-align:left;}
  .offer-guar{text-align:left;}
}
@media(max-width:640px){
  :root{--pad:22px;}
  .nav{padding:15px 22px;} .nav-links{display:none;}
  .hero h1{font-size:58px;}
  .hero-promise{font-size:19px;}
  .band-q{font-size:30px;}
  .sec{padding:60px 0;}
  .sec-h{font-size:31px;}
  .inside-grid,.steps,.amostra-grid,.rel-grid{grid-template-columns:1fr;}
  .thesis-h{font-size:42px;}
  .offer-card{padding:36px 26px;}
  .offer-price .pp{font-size:44px;}
  .foot-cta h2{font-size:36px;}
}
</style>
</head>
<body data-cat="clay" data-video="off">

<nav class="nav">
  <a href="#" class="nav-logo">CE<span class="dot">.</span><span class="x">X</span></a>
  <ul class="nav-links">
    <li><a href="#" class="nav-link">Início</a></li>
    <li><a href="#" class="nav-link active">Materiais</a></li>
    <li><a href="#" class="nav-link">Cursos &amp; Mentorias</a></li>
    <li><a href="#" class="nav-link">Sobre</a></li>
    <li><a href="#" class="nav-link">Sua Vocação</a></li>
  </ul>
  <a href="#oferta" class="nav-cta">Comprar agora →</a>
</nav>

<!-- ════════ HERO ════════ -->
<header class="hero" data-screen-label="Hero">
  <div class="wrap">
    <a href="#" class="hero-back">← Voltar pra Materiais</a>
    <div class="hero-grid">
      <div class="hero-main">
        <div class="hero-crumb">
          <span data-bind="familia">Para ministrar</span><span class="sep">/</span>
          <span data-bind="estante">Adolescentes</span><span class="sep">·</span>
          <span class="code" data-bind="code">S-12</span>
        </div>
        <h1 data-bind="titulo">Firmes</h1>
        <p class="hero-promise" data-bind="promessa"></p>
        <div class="hero-meta" id="heroMeta"></div>
        <div class="hero-buy">
          <div class="price-stack">
            <span class="pv">Acesso vitalício</span>
            <span class="pp" data-bind="preco">R$ 47</span>
          </div>
          <a class="btn-buy" data-bind-href="hotmart" target="_blank" rel="noopener">Comprar material →</a>
        </div>
        <div class="hero-trust" data-bind="entrega">Entrega imediata · PDF editável · pela Hotmart</div>
      </div>

      <div class="hero-art">
        <div class="poster">
          <div class="poster-top">
            <span class="poster-cat" data-bind="estante">Adolescentes</span>
            <span class="poster-code" data-bind="code">S-12</span>
          </div>
          <div class="poster-title" data-bind="titulo">Firmes</div>
          <div class="poster-foot">
            <span data-bind="estanteSub">12 a 15 anos</span>
            <span data-bind="formatoCurto">PDF editável</span>
          </div>
          <!-- Capa real (arraste uma arte): aparece por cima do pôster -->
          <image-slot id="cex-cover" shape="rounded" radius="14" placeholder="Arraste a capa do material"></image-slot>
        </div>

        <!-- VÍDEO opcional (ligue no painel Tweaks; some quando desligado) -->
        <div class="video">
          <div class="video-frame">
            <image-slot id="cex-video" shape="rounded" radius="14" placeholder="Arraste o frame do vídeo de vendas"></image-slot>
            <div class="video-play"><span>▶</span></div>
          </div>
          <div class="video-cap">Vídeo de vendas · 40s</div>
        </div>
      </div>
    </div>
  </div>
</header>

<!-- ════════ BANDA DE AUTORIDADE ════════ -->
<section class="band" data-screen-label="Autoridade">
  <div class="wrap band-in">
    <div class="band-q" data-bind="impacto">As igrejas que mais formam não improvisam o que ensinam. Elas <em>preparam</em>.</div>
    <div class="band-by" data-bind="impactoBy">Tese CE.X · Campus Expansão</div>
  </div>
</section>

<!-- ════════ PRA QUEM É ════════ -->
<section class="sec" data-screen-label="Pra quem é">
  <div class="wrap sec-head">
    <div>
      <div class="sec-mark">Pra quem é</div>
      <h2 class="sec-h" data-bind="praQuemH">Se você lidera <em>adolescentes</em>, isso é pra você.</h2>
    </div>
    <div>
      <div class="sec-lead" data-bind="praQuem"></div>
    </div>
  </div>
</section>

<!-- ════════ O QUE VEM DENTRO ════════ -->
<section class="sec" data-screen-label="O que vem dentro">
  <div class="wrap">
    <div class="sec-mark">O que vem dentro</div>
    <div class="inside-grid" id="factsGrid"></div>
    <div class="sec-head" id="msgsTitleWrap" style="margin-bottom:30px;">
      <h2 class="sec-h">As <em data-bind="numMsg">6</em> <span data-bind="unidade">mensagens</span></h2>
      <div class="sec-lead">Cada encontro já vem fechado: abertura, desenvolvimento bíblico, dinâmica e aplicação. Você abre e ministra.</div>
    </div>
    <div class="msgs" id="msgsList"></div>
    <div id="depoWrap"></div>
  </div>
</section>

<!-- ════════ AMOSTRA ════════ -->
<section class="sec" data-screen-label="Amostra">
  <div class="wrap">
    <div class="sec-mark">Veja por dentro</div>
    <div class="sec-head" style="margin-bottom:34px;">
      <h2 class="sec-h">Sem comprar <em>no escuro</em>.</h2>
      <div class="sec-lead">Algumas páginas reais do material. Diagramação pronta e linguagem na medida da faixa etária.</div>
    </div>
    <div class="amostra-grid">
      <image-slot id="cex-amostra-1" shape="rounded" radius="12" placeholder="Página de amostra 1"></image-slot>
      <image-slot id="cex-amostra-2" shape="rounded" radius="12" placeholder="Página de amostra 2"></image-slot>
      <image-slot id="cex-amostra-3" shape="rounded" radius="12" placeholder="Página de amostra 3"></image-slot>
    </div>
    <div class="amostra-note">◇ Arraste prints reais das páginas pra cá</div>
  </div>
</section>

<!-- ════════ COMO USAR ════════ -->
<section class="sec" data-screen-label="Como usar">
  <div class="wrap">
    <div class="sec-mark">Como você usa</div>
    <div class="sec-head" style="margin-bottom:36px;">
      <h2 class="sec-h" data-bind="comoUsaH">Comprou, abriu, <em>ministrou</em>.</h2>
      <div class="sec-lead" data-bind="comoUsaLead">Conteúdo pronto pra ensinar. Você não monta nada do zero: abre o arquivo e ministra.</div>
    </div>
    <div class="steps" id="stepsGrid"></div>
  </div>
</section>

<!-- ════════ TESE ════════ -->
<section class="thesis" data-screen-label="Tese">
  <div class="wrap thesis-in">
    <div class="thesis-mk">◆ Campus Expansão</div>
    <div class="thesis-h" data-bind="teseH">Nós preparamos.<br>Deus multiplica.</div>
    <p class="thesis-sub" data-bind="teseSub">Estrutura ministerial pra líderes locais. A gente carrega o peso do conteúdo pra você carregar gente.</p>
  </div>
</section>

<!-- ════════ OFERTA ════════ -->
<section class="offer" id="oferta" data-screen-label="Oferta">
  <div class="wrap">
    <div class="offer-card">
      <div>
        <div class="sec-mark">A oferta</div>
        <h2 class="offer-h"><em data-bind="titulo">Firmes</em> <span data-bind="ofertaResumo">· 6 encontros prontos pra ministrar</span></h2>
        <ul class="offer-list" id="offerList"></ul>
      </div>
      <div class="offer-right">
        <div class="offer-price">
          <div class="pv">Compra única · sem mensalidade</div>
          <div class="pp" data-bind="preco">R$ 47</div>
          <div class="px">acesso vitalício ao arquivo</div>
        </div>
        <a class="btn-buy" data-bind-href="hotmart" target="_blank" rel="noopener">Comprar agora →</a>
        <div class="offer-guar" data-bind="garantia">Entrega imediata pela Hotmart. Compra protegida e garantia de 7 dias.</div>
      </div>
    </div>
  </div>
</section>

<!-- ════════ RELACIONADOS ════════ -->
<section class="rel" data-screen-label="Relacionados">
  <div class="wrap">
    <div class="rel-head">
      <div>
        <h2 class="rel-h">Da mesma <em>estante</em></h2>
        <div class="rel-sub" data-bind="relSub">Mais materiais pra Adolescentes</div>
      </div>
      <a href="#" class="rel-all">Ver a estante toda →</a>
    </div>
    <div class="rel-grid" id="relGrid"></div>
  </div>
</section>

<!-- ════════ FAQ ════════ -->
<section class="faq" data-screen-label="FAQ">
  <div class="wrap faq-grid">
    <div>
      <div class="sec-mark">Perguntas</div>
      <h2 class="sec-h">Antes de <em>comprar</em>.</h2>
    </div>
    <div class="faq-list" id="faqList"></div>
  </div>
</section>

<!-- ════════ CTA FINAL ════════ -->
<section class="foot-cta" data-screen-label="CTA final">
  <div class="wrap">
    <h2>Pare de montar do zero <em>toda semana</em>.</h2>
    <p class="sub" data-bind="ctaSub">Leve os 6 encontros de Firmes e ministre com chão já no próximo domingo.</p>
    <a class="btn-buy" data-bind-href="hotmart" target="_blank" rel="noopener">Comprar agora →</a>
    <div class="micro" data-bind="garantia">Entrega imediata pela Hotmart. Compra protegida e garantia de 7 dias.</div>
  </div>
</section>

<footer class="foot-band">
  <div class="wrap foot-row">
    <div class="foot-logo">CE<span class="dot">.</span><span class="x">X</span></div>
    <div class="foot-copy">© 2026 Campus Expansão · campusexpansao.com</div>
  </div>
</footer>

<div id="tweaks-root"></div>

<script src="image-slot.js"></script>
<script src="landing-data.js"></script>
<script src="landing-render.js"></script>
<script type="text/babel" src="tweaks-panel.jsx"></script>
<script type="text/babel" src="landing-tweaks.jsx"></script>
</body>
</html>

```

---

## Anexo B · Modelo de dados (`landing-data.js`)

Três blocos: ESTANTES→cor (fixo) · TEMPLATE fixo · PRODUTO (poucos campos editáveis).

```js
/* ════════════════════════════════════════════════════════════════
   CE.X · Landing de venda — CONFIG + TEMPLATE + PRODUTO
   ----------------------------------------------------------------
   Você só edita o BLOCO 3 (CEX_PRODUCT) por material — e mesmo assim,
   quase tudo é opcional. Os blocos 1 e 2 são fixos: cor da estante e
   textos institucionais que valem pra TODO material (não reescreve).
   ════════════════════════════════════════════════════════════════ */

/* ── BLOCO 1 · ESTANTES → COR (automático, não edite) ───────────── */
window.CEX_SHELVES = {
  "Berçário":            { cat: "wheat", sub: "0 a 1 ano e 11 meses", familia: "Para ministrar" },
  "Maternal":            { cat: "wheat", sub: "2 a 5 anos",           familia: "Para ministrar" },
  "Primários":           { cat: "wheat", sub: "6 a 7 anos",          familia: "Para ministrar" },
  "Juniores":            { cat: "sand",  sub: "8 a 11 anos",         familia: "Para ministrar" },
  "Adolescentes":        { cat: "clay",  sub: "12 a 15 anos",        familia: "Para ministrar" },
  "Jovens":              { cat: "olive", sub: "16 a 24 anos",        familia: "Para ministrar" },
  "Igreja toda":         { cat: "terra", sub: "todas as idades",     familia: "Para ministrar" },
  "Manuais":             { cat: "clay",  sub: "referência completa", familia: "Para liderar" },
  "Criar ministério":    { cat: "terra", sub: "passo a passo",       familia: "Para liderar" },
  "Modelos & Checklists":{ cat: "sand",  sub: "prático, pra usar hoje", familia: "Para liderar" },
  "Montar evento":       { cat: "wheat", sub: "retiro · conferência", familia: "Para liderar" }
};

/* Opções de formato pra marcar (no admin viram caixas de seleção) */
window.CEX_FORMATOS = ["PDF", "Word", "PPT", "Slides", "Editável", "Planilha", "Vídeo", "Áudio"];

/* ── BLOCO 2 · TEMPLATE FIXO (vale pra todo material, não edite) ── */
window.CEX_TEMPLATE = {
  // banda de autoridade
  impacto: "As igrejas que mais formam não improvisam o que ensinam. Elas <em>preparam</em>.",
  impactoBy: "Tese CE.X · Campus Expansão",
  // como você usa (3 passos · sem marca, sem white-label)
  comoUsaH: "Comprou, abriu, <em>ministrou</em>.",
  comoUsaLead: "Conteúdo pronto pra ensinar. Você não monta nada do zero: abre o arquivo e ministra.",
  comoUsa: [
    { t: "Recebe na hora", d: "Pagamento aprovado, o arquivo cai no seu e-mail pela Hotmart. Acesso vitalício, baixa quando quiser." },
    { t: "Abre e prepara", d: "Vem nos formatos que você já usa. Dá uma lida, separa o material de apoio e está pronto." },
    { t: "É só ministrar", d: "Cada encontro já vem estruturado. Você foca em pastorear gente, não em produzir conteúdo." }
  ],
  // tese
  teseH: "Nós preparamos.<br>Deus multiplica.",
  teseSub: "Estrutura ministerial pra líderes locais. A gente carrega o peso do conteúdo pra você carregar gente.",
  // FAQ
  faq: [
    { q: "Como eu recebo?", a: "Pagamento aprovado, o material cai no seu e-mail na hora, pela Hotmart. Acesso vitalício: baixa quando e quantas vezes quiser." },
    { q: "Preciso de algum programa especial?", a: "Não. Você ministra direto do arquivo e usa o material de apoio em qualquer tela ou projetor que já tenha." },
    { q: "Serve pra qualquer tamanho de grupo?", a: "Sim. Funciona com um grupo pequeno ou com o ministério inteiro. A estrutura é a mesma, você ajusta a escala." },
    { q: "É compra única?", a: "Sim. Você paga uma vez e o material é seu, pra sempre. Sem mensalidade." }
  ]
};

/* ── BLOCO 3 · O MATERIAL (os poucos campos que você edita) ─────── */
/* Obrigatórios: title · shelf · desc · price · hotmart · formatos    */
/* Opcionais: code · messages · pages · paraQuem · beneficios ·        */
/*            messageList · depoimento · image                         */
window.CEX_PRODUCT = {
  title: "Firmes",
  shelf: "Adolescentes",                 // ← define a COR e a faixa automaticamente
  code: "S-12",
  desc: "Seis encontros que ancoram adolescentes na fé <em>quando tudo ao redor balança</em>.",

  messages: 6,                           // nº de mensagens/encontros (deixe vazio se não tiver)
  pages: 48,                             // nº de páginas
  formatos: ["PDF", "Editável", "Slides"], // marque o que vier junto

  price: "47",
  hotmart: "https://pay.hotmart.com/SEU-LINK-AQUI",

  // opcionais ↓ (some da página se ficar vazio)
  paraQuem: "Você sente que cada semana começa do zero: domingo de noite ainda procurando tema e montando dinâmica às pressas. Enquanto isso, os adolescentes da sua igreja estão decidindo no que vão acreditar pela vida inteira.",
  beneficios: [
    "6 encontros completos, em sequência pensada",
    "Material de apoio pra cada mensagem",
    "Linguagem na medida da faixa etária"
  ],
  messageList: [
    { nome: "Quem eu sou de verdade", desc: "Identidade em Cristo antes da identidade que a internet vende." },
    { nome: "Quando a fé é testada", desc: "O que sustenta a crença quando a emoção some." },
    { nome: "Pressão de todo lado", desc: "Decidir por valor, não por plateia." },
    { nome: "Dúvida não é pecado", desc: "Espaço pra perguntar sem perder o chão." },
    { nome: "Firmes juntos", desc: "Por que ninguém se mantém firme sozinho." },
    { nome: "De pé pra ficar", desc: "Compromisso que atravessa a adolescência inteira." }
  ],
  depoimento: { texto: "", autor: "" },  // opcional: prova de quem usou
  image: null                            // capa real (senão usa o pôster tipográfico)
};

/* ── RELACIONADOS · automático pelo catálogo (mesma estante) ─────
   No site isto é preenchido sozinho pelos outros materiais da estante.
   Aqui fica um exemplo pra mostrar o bloco. */
window.CEX_RELATED = [
  { titulo: "Raízes",             shelf: "Adolescentes",  meta: "5 mensagens · 40 pág", preco: "R$ 47" },
  { titulo: "Entre Dois Mundos",  shelf: "Adolescentes",  meta: "7 mensagens · 56 pág", preco: "R$ 67" },
  { titulo: "Primeira Vez",       shelf: "Adolescentes",  meta: "4 mensagens · 32 pág", preco: "R$ 37" },
  { titulo: "Retiro de Adolescentes", shelf: "Montar evento", meta: "90 páginas · PDF", preco: "R$ 147" }
];

```

---

## Anexo C · Render (`landing-render.js`)

Junta os três blocos e monta a página; campos opcionais vazios somem.

```js
/* ════════════════════════════════════════════════════════════════
   CE.X · Landing — RENDER
   Junta CEX_PRODUCT (poucos campos editáveis) + CEX_SHELVES (cor) +
   CEX_TEMPLATE (texto fixo) e monta a página. Campos opcionais vazios
   somem sozinhos.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.CEX_PRODUCT, T = window.CEX_TEMPLATE, SH = window.CEX_SHELVES || {};
  if (!P) return;
  var shelf = SH[P.shelf] || { cat: "olive", sub: "", familia: "Materiais" };

  // cor da estante (automática)
  document.body.dataset.cat = shelf.cat;

  function set(id, html) { var e = document.getElementById(id); if (e) e.innerHTML = html; }
  function hide(sel) { var e = document.querySelector(sel); if (e) e.style.display = 'none'; }

  var precoFmt = (/^R\$/.test(P.price) ? P.price : 'R$ ' + P.price);
  var formatos = (P.formatos || []);
  var formatoCurto = formatos[0] || 'PDF';

  /* tokens de texto */
  var BIND = {
    familia: shelf.familia,
    estante: P.shelf,
    estanteSub: shelf.sub,
    code: P.code || '',
    titulo: P.title,
    promessa: P.desc || '',
    preco: precoFmt,
    formatoCurto: formatoCurto,
    numMsg: P.messages || '',
    unidade: P.messages ? 'mensagens' : '',
    impacto: T.impacto, impactoBy: T.impactoBy,
    praQuemH: 'Se você lidera <em>' + P.shelf.toLowerCase() + '</em>, isso é pra você.',
    praQuem: P.paraQuem ? '<p>' + P.paraQuem + '</p>' : '',
    comoUsaH: T.comoUsaH, comoUsaLead: T.comoUsaLead,
    teseH: T.teseH, teseSub: T.teseSub,
    relSub: 'Mais materiais pra ' + P.shelf,
    ctaSub: 'Leve ' + P.title + ' e ministre com chão já no próximo encontro.',
    garantia: 'Entrega imediata pela Hotmart. Compra única, acesso vitalício.',
    entrega: 'Entrega imediata · ' + formatos.slice(0, 2).join(' · ') + ' · pela Hotmart',
    ofertaResumo: P.messages ? '· ' + P.messages + ' encontros prontos pra ministrar' : ''
  };
  document.querySelectorAll('[data-bind]').forEach(function (el) {
    var k = el.getAttribute('data-bind');
    if (BIND[k] != null) el.innerHTML = BIND[k];
  });
  document.querySelectorAll('[data-bind-href]').forEach(function (el) {
    if (P[el.getAttribute('data-bind-href')]) el.setAttribute('href', P[el.getAttribute('data-bind-href')]);
  });

  /* capa real (se houver imagem, troca o pôster tipográfico) */
  if (P.image) {
    var slot = document.getElementById('cex-cover');
    if (slot) slot.setAttribute('src', P.image);
  }

  /* chips de meta no hero: nº mensagens, nº páginas, formatos */
  var chips = [];
  if (P.messages) chips.push('<span class="tag"><b>' + P.messages + '</b> mensagens</span>');
  if (P.pages) chips.push('<span class="tag"><b>' + P.pages + '</b> páginas</span>');
  formatos.forEach(function (f) { chips.push('<span class="tag fmt">' + f + '</span>'); });
  set('heroMeta', chips.join(''));

  /* PRA QUEM É — some se vazio */
  if (!P.paraQuem) hide('[data-screen-label="Pra quem é"]');

  /* O QUE VEM DENTRO — fatos */
  var facts = [];
  if (P.messages) facts.push({ n: P.messages, l: 'mensagens · encontros' });
  if (P.pages) facts.push({ n: P.pages, l: 'páginas editáveis' });
  facts.push({ n: formatos[0] || 'PDF', l: formatos.length > 1 ? '+ ' + (formatos.length - 1) + ' formatos' : 'formato' });
  set('factsGrid', facts.map(function (f) {
    return '<div class="fact"><div class="n">' + f.n + '</div><div class="l">' + f.l + '</div></div>';
  }).join(''));

  /* lista de mensagens (messageList) — senão, bullets de beneficios */
  var ml = (P.messageList || []).filter(function (m) { return m && m.nome; });
  if (ml.length) {
    set('msgsList', ml.map(function (m, i) {
      return '<div class="msg"><span class="mn">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div><div class="mt">' + m.nome + '</div>' + (m.desc ? '<div class="md">' + m.desc + '</div>' : '') + '</div></div>';
    }).join(''));
  } else if ((P.beneficios || []).length) {
    set('msgsList', P.beneficios.map(function (b) {
      return '<div class="msg msg-b"><span class="mn">→</span><div class="mt" style="font-weight:500;font-size:18px">' + b + '</div></div>';
    }).join(''));
    var t = document.getElementById('msgsTitleWrap'); if (t) t.style.display = 'none';
  } else {
    hide('#msgsList'); var t2 = document.getElementById('msgsTitleWrap'); if (t2) t2.style.display = 'none';
  }

  /* DEPOIMENTO opcional */
  if (P.depoimento && P.depoimento.texto) {
    set('depoWrap', '<blockquote class="depo">“' + P.depoimento.texto + '”' +
      (P.depoimento.autor ? '<cite>◇ ' + P.depoimento.autor + '</cite>' : '') + '</blockquote>');
  } else { hide('#depoWrap'); }

  /* COMO USA — passos do template */
  set('stepsGrid', T.comoUsa.map(function (s, i) {
    return '<div class="step"><div class="si">Passo 0' + (i + 1) + '</div><h4>' + s.t + '</h4><p>' + s.d + '</p></div>';
  }).join(''));

  /* OFERTA — lista (beneficios ou padrão) */
  var ofer = (P.beneficios && P.beneficios.length) ? P.beneficios.slice() : [];
  ofer.push('Acesso vitalício, sem mensalidade');
  if (formatos.length) ofer.push('Entregue em ' + formatos.join(' · '));
  set('offerList', ofer.map(function (x) { return '<li>' + x + '</li>'; }).join(''));

  /* FAQ — template */
  set('faqList', T.faq.map(function (f) {
    return '<div class="qa"><div class="q"><span class="mk">◆</span>' + f.q + '</div><div class="a">' + f.a + '</div></div>';
  }).join(''));

  /* RELACIONADOS — automático: outros materiais da mesma estante.
     (no site, vem do catálogo; aqui um exemplo da mesma estante) */
  var accentVar = { wheat: 'var(--wheat)', sand: 'var(--sand)', clay: 'var(--clay)', terra: 'var(--terra)', olive: 'var(--olive)', cream: 'var(--cream)' };
  var REL = (window.CEX_RELATED || []).filter(function (r) { return r.titulo !== P.title; }).slice(0, 4);
  if (REL.length) {
    set('relGrid', REL.map(function (r) {
      var c = accentVar[(SH[r.shelf] || {}).cat] || 'var(--olive)';
      return '<a class="rcard" href="#" style="--rc:' + c + '">' +
        '<div class="ra"><span class="rc-cat">' + r.shelf + '</span><span class="rc-ttl">' + r.titulo + '</span></div>' +
        '<div class="rf"><span class="rm">' + (r.meta || '') + '</span>' +
        '<span class="rr"><span class="rp">' + r.preco + '</span><span class="rl">Ver →</span></span></div></a>';
    }).join(''));
  } else { hide('[data-screen-label="Relacionados"]'); }
})();

```

---

## Anexo D · Painel de pré-visualização (`landing-tweaks.jsx`)

```jsx
/* CE.X · Landing — painel Tweaks
   A cor vem SEMPRE da estante (automático). Aqui você só:
   (1) pré-visualiza como a página fica em cada estante e
   (2) liga/desliga a área de vídeo. */
const CEX_TWK = /*EDITMODE-BEGIN*/{
  "estante": "Adolescentes",
  "video": false
}/*EDITMODE-END*/;

function CexLandingPanel() {
  const SH = window.CEX_SHELVES || {};
  const shelves = Object.keys(SH);
  const [t, setTweak] = useTweaks({ ...CEX_TWK, estante: (window.CEX_PRODUCT || {}).shelf || CEX_TWK.estante });

  React.useEffect(() => {
    const s = SH[t.estante];
    if (!s) return;
    document.body.dataset.cat = s.cat;
    document.querySelectorAll('[data-bind="estante"]').forEach((e) => { e.textContent = t.estante; });
    document.querySelectorAll('[data-bind="estanteSub"]').forEach((e) => { e.textContent = s.sub; });
    document.querySelectorAll('[data-bind="familia"]').forEach((e) => { e.textContent = s.familia; });
  }, [t.estante]);

  React.useEffect(() => { document.body.dataset.video = t.video ? 'on' : 'off'; }, [t.video]);

  return (
    <TweaksPanel>
      <TweakSection label="Pré-visualizar estante" />
      <TweakSelect
        label="Estante"
        value={t.estante}
        options={shelves}
        onChange={(v) => setTweak('estante', v)} />
      <div style={{ font: '11px/1.5 var(--mono, monospace)', color: '#8B8C82', padding: '2px 2px 10px' }}>
        A cor é travada por estante. Aqui é só pra ver o template em cada faixa.
      </div>

      <TweakSection label="Vídeo de vendas" />
      <TweakToggle
        label="Mostrar vídeo no topo"
        value={t.video}
        onChange={(v) => setTweak('video', v)} />
      <div style={{ font: '11px/1.5 var(--mono, monospace)', color: '#8B8C82', padding: '2px 2px 8px' }}>
        Desligado, a área de vídeo nem aparece. É opcional por material.
      </div>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<CexLandingPanel />);

```

---

## Anexo E · Campo "Formatos" no admin (`admin/editor.jsx`)

Caixas-marcáveis (multi-select) integradas ao editor de material.

```jsx
/* Formatos inclusos: caixas de marcar (PDF, Word, PPT...) */
function FormatosField({ value, onChange }) {
  const opts = ['PDF', 'Word', 'PPT', 'Slides', 'Editável', 'Planilha', 'Vídeo', 'Áudio'];
  const v = value || [];
  const toggle = (o) => onChange(v.includes(o) ? v.filter((x) => x !== o) : [...v, o]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {opts.map((o) => {
        const on = v.includes(o);
        return (
          <button key={o} onClick={() => toggle(o)} className="fmt-chip" data-on={on}>
            {on ? '◆ ' : ''}{o}
          </button>
        );
      })}
    </div>
  );
}
```

Uso no bloco `isMaterial` (após Código/Mensagens/Páginas):

```jsx
<Field label="Formatos inclusos" hint="Marque tudo que vai junto. Vira as etiquetas da página de venda.">
  <FormatosField value={d.formatos || []} onChange={(v) => set('formatos', v)} />
</Field>
```

---

## Notas de integração (produção)

- **image-slot** no protótipo é só pra arrastar imagens na demo. Em produção use o upload que
  o admin já tem (`admin/editor.jsx → ImageField`): capa (`image`) + páginas de amostra.
- Fontes: use as já carregadas no app (Inter). Tokens de cor: `AGENTS.md` §2 (fonte da verdade).
- `landing-tweaks.jsx` é **painel de pré-visualização** (trocar estante / ligar vídeo). NÃO vai
  pra produção — em produção a cor vem do dado da estante/nível.
- Relacionados: no protótipo há `CEX_RELATED` de exemplo. Em produção, **derive do catálogo**:
  itens publicados com a mesma `shelf`/`level`, excluindo o atual.
