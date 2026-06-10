# BRIEFING CE.X — Correção dos Cursos + nova modalidade Infantil

> **Para o Claude Code.** Esta rodada tem DOIS focos:
> **(A)** corrigir, de vez, os **cards de Cursos & Mentorias** (a correção anterior NÃO foi
> aplicada — o card continua com a metade de cima pintada de cor) e o **título da página**;
> **(B)** criar uma **nova modalidade "Infantil"** dentro de Materiais, com três faixas
> etárias.
>
> NÃO recomeçar do zero. Preserve Home, Sobre e o catálogo de Materiais (filtros de 2
> andares / auto-Netflix).
>
> **Identidade, tokens de cor e invariantes: ver `AGENTS.md` (raiz) — fonte única.** Este
> arquivo só traz as duas tarefas (card de curso + modalidade Infantil). Onde antes havia
> a "Seção C" de tokens, agora vale o `AGENTS.md` §2.

---

# PARTE A — CURSOS & MENTORIAS (correção definitiva)

## A1 · Título da página: `Cursos & trilhas` → `Cursos & Mentorias`

Hoje o H1 da página está escrito **"Cursos & trilhas"** (com "trilhas" em oliva itálico).
Isso está errado por dois motivos:

1. **Não bate com o menu.** O item de navegação é **"Cursos & Mentorias"**. O H1 da página
   tem que ser idêntico ao rótulo do menu. Pessoa que clica em "Cursos & Mentorias" precisa
   cair numa página cujo título diz "Cursos & Mentorias".
2. **"Trilha" não é o nome da página.** Trilha é o conceito de agrupamento (os níveis) e
   uma seção interna do detalhe do curso ("Etapa 02 de 06"). Nunca o título.

**Fazer:**
- **H1 = `Cursos & Mentorias`** (Inter 800, cream). **Sem itálico** em nenhuma palavra.
- Se quiser a ideia de "trilha", ela vai no **olho/subtítulo** abaixo do H1, não no H1.
  Ex.: sobrancelha `◆ FORMAÇÃO AO VIVO` + H1 `Cursos & Mentorias` + linha de apoio
  *"Uma trilha por nível. Você entra onde está e sobe quando estiver pronto."*
- O link à direita continua `Conhecer formação ao vivo →`.

---

## A2 · Card de curso: o miolo continua PINTADO de cor — está ERRADO

**Estado atual (bug que persiste):** a metade de cima de cada card está **preenchida com a
cor de acento** (bloco ocre / argila cheio). Isso vira um borrão pesado, esconde o título e
**mata o selo `● AO VIVO`** (o selo só funciona se for o único bloco de cor sólida do card).
Esse layout **não é** o modelo aprovado.

> **REGRA DE OURO DO CARD:** o **fundo do card é sempre escuro** (Ink/grafite). A cor de
> acento aparece **só nos detalhes** — etiqueta de nível, selo AO VIVO, bolinha da meta e
> "Etapa". **Nunca** como bloco de fundo. Bloco de cor cheia é exclusividade do "Modelo B"
> dos materiais (1 por estante) — **não existe em card de curso.**

### Errado × Certo (o que mudar)

| | ERRADO (hoje) | CERTO (modelo aprovado) |
|---|---|---|
| Fundo do miolo (metade de cima) | `background: #C0934E` (cor cheia) | `background: #0E110D` (Ink) + linhas-guia sutis |
| Onde a cor aparece | no fundo inteiro | só na etiqueta, selo, bolinha e "Etapa" |
| Selo `● AO VIVO` | some / compete com o fundo | é o **único** bloco de cor sólida; salta |
| Sensação | borrão, "banner" | ferramenta sóbria, mesma família dos materiais |

### Anatomia correta (de cima pra baixo)

**MIOLO** — altura ~300px, `background: #0E110D`, `padding: 24px`, e linhas-guia
horizontais sutis:
```css
background-image: linear-gradient(#25291F 1px, transparent 1px);
background-size: 100% 44px;
```
- **Topo-esquerda:** etiqueta de nível `◆ FUNDAÇÃO` — mono, caixa-alta, `letter-spacing
  .14em`, cor = acento do nível. O `◆` tem `font-size: 9px`.
- **Topo-direita:** selo `● AO VIVO` — **fundo na cor de acento**, **texto em tinta escura
  `#0E110D`**, mono 10px 600, caixa-alta `letter-spacing .1em`, `padding: 5px 9px`,
  `border-radius: 4px`, com uma bolinha 5px escura antes do texto. **É o único elemento com
  cor sólida no card.**
- **Base do miolo:** **título** (Inter 800, ~30px, `line-height: .98`, `letter-spacing
  -.03em`, cor cream `#EDE6D3`, `text-wrap: balance`) + **1 linha de descrição** (Inter 400,
  14px, `line-height 1.45`, cor areia `#C9BFA0`).

**RODAPÉ** — altura ~150px, `background: #181B16`, `border-top: 1px solid #25291F`,
`padding: 22px 24px`, `display:flex; flex-direction:column; justify-content:space-between`.
- **Linha de cima (meta):** bolinha 7px na cor de acento + `4 semanas · Mentoria inclusa`
  (mono 11.5px, cor `#8B8C82`).
- **Linha de baixo:** `ETAPA 01` (mono 11px, caixa-alta `.1em`, cor de acento) à esquerda;
  `Detalhes →` (mono 11px, caixa-alta, cor cream) à direita.
- **Sem preço.** Curso é turma / lista de espera, não compra única.

**MOLDURA:** largura 320px, `border-radius: 10px`, `border: 1px solid #25291F`,
`background: #181B16`, `overflow: hidden`, sombra
`0 20px 40px -28px rgba(0,0,0,.8)`. Igual à moldura dos cards de material.

### Código de referência (HTML + CSS — pode colar e adaptar)

```html
<article class="cex-course" data-accent="wheat">
  <div class="cex-course__body">
    <div class="cex-course__top">
      <span class="cex-eyebrow"><i>◆</i> FUNDAÇÃO</span>
      <span class="cex-live"><i></i> AO VIVO</span>
    </div>
    <div class="cex-course__head">
      <h3 class="cex-course__title">Fundamentos da Estrutura</h3>
      <p class="cex-course__desc">Por que estrutura honra o agir de Deus. O alicerce de
        todo ministério que multiplica.</p>
    </div>
  </div>
  <div class="cex-course__foot">
    <div class="cex-course__meta"><span class="dot"></span> 4 semanas · Mentoria inclusa</div>
    <div class="cex-course__foot-row">
      <span class="cex-course__stage">ETAPA 01</span>
      <a class="cex-course__more" href="/cursos/fundamentos-da-estrutura">Detalhes →</a>
    </div>
  </div>
</article>
```
```css
/* acento por nível — tokens em AGENTS.md §2. trocar via [data-accent] */
.cex-course[data-accent="wheat"] { --ac:#CBA95C; } /* Fundação      */
.cex-course[data-accent="clay"]  { --ac:#C5805A; } /* Liderança     */
.cex-course[data-accent="olive"] { --ac:#7A9E3F; } /* Multiplicação */

.cex-course{ width:320px; border-radius:10px; overflow:hidden;
  border:1px solid #25291F; background:#181B16;
  box-shadow:0 1px 0 rgba(255,255,255,.02), 0 20px 40px -28px rgba(0,0,0,.8);
  font-family:'Inter',sans-serif; }

/* MIOLO — fundo ESCURO + linhas-guia. NUNCA cor cheia. */
.cex-course__body{ height:300px; background:#0E110D; padding:24px; box-sizing:border-box;
  display:flex; flex-direction:column; justify-content:space-between;
  background-image:linear-gradient(#25291F 1px, transparent 1px); background-size:100% 44px; }
.cex-course__top{ display:flex; justify-content:space-between; align-items:flex-start; }

.cex-eyebrow{ font-family:'Fira Code','SF Mono',monospace; font-size:11px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--ac); display:inline-flex; align-items:center; gap:8px; }
.cex-eyebrow i{ font-style:normal; font-size:9px; }

/* selo AO VIVO = ÚNICO bloco de cor sólida do card */
.cex-live{ display:inline-flex; align-items:center; gap:6px; background:var(--ac);
  color:#0E110D; font-family:'Fira Code',monospace; font-size:10px; font-weight:600;
  letter-spacing:.1em; text-transform:uppercase; padding:5px 9px; border-radius:4px; }
.cex-live i{ width:5px; height:5px; border-radius:50%; background:#0E110D; }

.cex-course__title{ margin:0 0 12px; font-weight:800; font-size:30px; line-height:.98;
  letter-spacing:-.03em; color:#EDE6D3; text-wrap:balance; }
.cex-course__desc{ margin:0; font-weight:400; font-size:14px; line-height:1.45; color:#C9BFA0; }

/* RODAPÉ */
.cex-course__foot{ height:150px; background:#181B16; border-top:1px solid #25291F;
  padding:22px 24px; box-sizing:border-box; display:flex; flex-direction:column;
  justify-content:space-between; }
.cex-course__meta{ display:flex; align-items:center; gap:8px; font-family:'Fira Code',monospace;
  font-size:11.5px; letter-spacing:.03em; color:#8B8C82; }
.cex-course__meta .dot{ width:7px; height:7px; border-radius:50%; background:var(--ac); }
.cex-course__foot-row{ display:flex; align-items:flex-end; justify-content:space-between; }
.cex-course__stage{ font-family:'Fira Code',monospace; font-size:11px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--ac); }
.cex-course__more{ font-family:'Fira Code',monospace; font-size:11px; letter-spacing:.06em;
  text-transform:uppercase; color:#EDE6D3; text-decoration:none; }
```

### Layout: uma fileira por NÍVEL (não grade plana, não empilhar)

Cada nível é uma **fileira horizontal** com seu cabeçalho (`◆ NÍVEL` na cor do nível +
contagem `N cursos` em cinza). Cores **quentes e vivas** (nada de cinza/azul apagado, que
parece desativado).

| Nível | Acento | Cursos (uma fileira cada) |
|---|---|---|
| **Fundação** | `wheat` | 01 Fundamentos da Estrutura · 04 Gestão de Equipe |
| **Liderança** | `clay` | 02 Formação de Líderes · 06 Liderança e Descanso |
| **Multiplicação** | `olive` | 03 Discipulado Intencional · 05 Plantação de Igrejas |

- Acima de ~6 cursos no futuro: a fileira vira carrossel horizontal ("Ver todos →").
- **Mobile:** fileira rola na horizontal **ou** empilha em 1 coluna — nunca cortar card
  escondido sem indicação.

### Roteamento

Clicar no card / em `Detalhes →` abre a **página de detalhe DAQUELE curso**
(ex. `/cursos/formacao-de-lideres`), **não** uma página de trilha. A trilha existe só como
(1) o agrupamento em fileiras aqui e (2) a seção "Etapa N de 6" dentro do detalhe do curso.

### Checklist — Cursos
- [ ] H1 da página = **`Cursos & Mentorias`** (igual ao menu), **sem itálico**.
- [ ] Miolo do card com **fundo Ink `#0E110D` + linhas-guia** — **nunca** cor cheia.
- [ ] Selo `● AO VIVO` é o **único** bloco de cor sólida do card.
- [ ] Etiqueta, bolinha e "Etapa" usam a cor do nível; resto é cream/areia/cinza.
- [ ] **Sem preço** no card.
- [ ] Uma fileira por nível (Fundação ocre / Liderança argila / Multiplicação oliva).
- [ ] Card abre o **detalhe do curso**, não a trilha.
- [ ] Zero travessões `—`/`–`. Marcas em `◆`. Setas `→` e ponto-médio `·` permanecem.

---

# PARTE B — NOVA MODALIDADE "INFANTIL" (em Materiais)

## B1 · O que é

Uma nova **modalidade (família de público)** no catálogo de Materiais, chamada
**`Infantil`**, que **segrega o material por faixa etária**. São **três faixas**:

| Sub-faixa (rótulo) | Faixa etária | Slug sugerido |
|---|---|---|
| **Berçário** | 0 a 1 ano e 11 meses | `infantil-bercario` |
| **Maternal** | 2 a 5 anos | `infantil-maternal` |
| **Primários** | 6 a 7 anos | `infantil-primarios` |

> Os nomes **Berçário / Maternal / Primários** são os termos de ministério infantil mais
> reconhecidos no Brasil para essas idades. Se o cliente preferir, podem virar
> "Bebês / Pré / Crianças" — mas mantenha **1 rótulo curto + a faixa etária** sempre juntos
> (ex.: `BERÇÁRIO · 0–1a 11m`). A faixa etária NUNCA aparece sozinha sem o rótulo.

Onde "Infantil" entra na escada de público existente:
`Infantil → Juniores → Adolescentes → Jovens → Igreja toda` (+ `Para liderar`).
É a faixa **mais nova**, abaixo de Juniores.

## B2 · Acento da modalidade — RESOLVIDO: `wheat`

Infantil usa **`wheat` (#CBA95C)**, o mesmo token das demais faixas de Materiais (ver
`AGENTS.md` §2–§3). A proposta antiga de criar uma cor nova ("Trigo #C9A86B") e o fallback
Pinho ficam **cancelados** — não se inventa cor fora da paleta.

> **As três faixas compartilham o MESMO acento (`wheat`).** Berçário/Maternal/Primários
> NÃO recebem cores diferentes — a diferenciação é o **rótulo mono + faixa etária**, nunca a
> cor. Mantém "Infantil" lendo como unidade. Acento só nos detalhes; Ink + Cream dominam.

## B3 · Como aparece no catálogo

A página Materiais já tem **filtro de 2 andares**. Infantil encaixa assim:

- **Andar 1 (público):** adiciona o chip **`Infantil`** na fila de públicos, antes de
  `Juniores`.
- **Andar 2 (faixa, aparece ao escolher Infantil):** três chips
  `Berçário` · `Maternal` · `Primários` (mais um `Todas` que mostra as três). Mesmo
  comportamento dos sub-filtros já existentes.
- **Na visão "estante" (auto-Netflix):** a família Infantil vira **uma seção** com até três
  sub-estantes empilhadas, cada uma com seu cabeçalho:
  `◆ BERÇÁRIO  ·  0–1a 11m` / `◆ MATERNAL · 2–5 anos` / `◆ PRIMÁRIOS · 6–7 anos`
  (mono, caixa-alta, na cor "Trigo"; a faixa etária em cinza à frente do rótulo).
- Sub-estante **vazia não aparece**. Cabeçalho da família mostra a contagem total
  (`◆ INFANTIL · N materiais`).

## B4 · Cards de material Infantil

Usam **os mesmos modelos A/B/C/D já existentes** (mesma moldura 320px, mesmo rodapé com
meta + preço + CTA). Nada de componente novo — só:
- `etiqueta` = a sub-faixa (`Berçário` / `Maternal` / `Primários`), não "Infantil".
- `accent` = **Trigo** (o acento da modalidade).
- Rodapé idêntico aos demais: `meta` (ex. `6 encontros · Editável · PDF`), `preço`,
  CTA `Ver material →`. Material É compra única → detalhe leva a `COMPRAR → Hotmart`.
- Regra do Modelo B (bloco de cor cheia): no máximo **1 por sub-estante**.

Exemplo de dados (pode usar de placeholder até ter o catálogo real):
```
Berçário   · A · "Primeiros Sons da Fé"  · 4 encontros · Editável · PDF    · R$ 37
Maternal   · C · "Arca do Noé"           · 6 encontros · Editável · Slides · R$ 39
Maternal   · B · "Deus Cuida de Mim"     · 5 encontros · Editável · PDF    · R$ 39
Primários  · A · "Heróis Pequenos"       · 6 encontros · Editável · PDF    · R$ 41
Primários  · C · "Primeiras Verdades"    · 8 encontros · Editável · PDF    · R$ 43
```

## B5 · Detalhe do material Infantil

Mesma página de detalhe de material já especificada (compra única → Hotmart). Acrescente,
no topo/etiqueta, a **faixa etária** de forma visível (ex. `BERÇÁRIO · 0–1a 11m`), porque
para material infantil a idade é o critério de escolha nº 1 do comprador.

### Checklist — Infantil
- [ ] Novo público **`Infantil`** no andar 1 do filtro, antes de Juniores.
- [ ] Sub-filtro de faixa: `Berçário` / `Maternal` / `Primários` (+ `Todas`).
- [ ] Na estante, família Infantil com 3 sub-estantes rotuladas com **rótulo + faixa etária**.
- [ ] Acento **`wheat`** usado só em detalhe; as 3 faixas compartilham o acento.
- [ ] Cards usam modelos A/B/C/D existentes; etiqueta = sub-faixa.
- [ ] Detalhe do material Infantil mostra a faixa etária no topo e `COMPRAR → Hotmart`.
- [ ] Sub-estante vazia não renderiza.

---

# SEÇÃO C — Tokens → migraram para `AGENTS.md` §2

Esta seção foi **removida para não duplicar (e contradizer) a paleta**. A **única fonte de
tokens** é `AGENTS.md` §2. Acentos de público e de nível derivam de
`sand/wheat/clay/terra/olive`. Ardósia `#5C7488`, Pinho `#4F7264`, Ocre `#C0934E`, Argila
`#B07355` e "Trigo" `#C9A86B` foram **extintos** (mapa de migração no `AGENTS.md` §2).
Fontes e marcas semióticas: `AGENTS.md` §1 e §8.

## NÃO FAZER
- Não pintar o miolo do card de curso com cor cheia (só detalhes recebem cor).
- Não deixar o H1 como "Cursos & trilhas" nem usar itálico no título.
- Não dar cor diferente para cada faixa etária do Infantil (as 3 dividem `wheat`).
- Não quebrar o catálogo/filtros de Materiais existente.
- Demais invariantes (paleta, marcas, travessão): ver `AGENTS.md` §8 e §10.
