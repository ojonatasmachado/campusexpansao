# AGENTS.md — CE.X · Constituição de Construção

> **Leia isto ANTES de qualquer tarefa neste repositório.**
> Vale para **Codex, Claude Code ou qualquer agente**. São as leis invariantes do
> projeto CE.X. Não importa o que for pedido (página nova, ajuste, componente, admin):
> **sempre se constrói deste jeito.** Tarefas específicas vivem nos handoffs (ver §9);
> este arquivo é o que **nunca muda**.
>
> Codex lê `AGENTS.md`. Claude Code lê `CLAUDE.md` (e este arquivo). Se houver conflito,
> **as regras de construção do site/admin deste arquivo prevalecem** sobre qualquer outro
> arquivo de instrução (que cobre a identidade da marca e a produção de reels, não o build
> do site).

---

## 0. Arquitetura — dois apps, um contrato

- **O admin é a fonte dos dados. O site é o render.** São **dois aplicativos separados**:
  - **Site público** → só lê e desenha. Não escreve nada.
  - **Admin** (`admin/`) → URL restrita, com login. Tem dados sensíveis (métricas,
    Hotmart, lista de espera). **Nunca** misturar o código dos dois.
- O que une os dois é **o contrato de dados** (ver `HANDOFF - Materiais v3 (site + admin).md` §1).
  Mesmo objeto de item, mesmo mapa estante→cor.
- **Nunca recomeçar do zero.** O site já existe (Home, Sobre, Materiais, Cursos & Mentorias)
  e o admin já está prototipado. Preserve o que funciona; só ajuste.

---

## 1. Identidade visual (inegociável)

| Token | Hex | Uso |
|---|---|---|
| Ink | `#0E110D` | Fundo dominante (~90% de toda peça) |
| Cream | `#EDE6D3` | Texto/títulos sobre escuro |
| Oliva | `#7A9E3F` | Acento-mestre da marca — **≤ 15% da peça** |
| Grafite | `#181B16` | Rodapés de card, superfícies |

- **Fonte:** Inter (display + body) + mono (JetBrains/SF Mono) só para metadados.
  **Nunca** trocar a fonte nem usar similar.
- **Logo:** `CE.X` sempre — `CE` peso 700, `.X` em oliva peso 700. Sem itálico, sem peso fino.
- **Oliva ≤ 15%.** Por isso oliva fica só em *Jovens* + elementos de marca. As outras
  estantes usam a paleta terrosa (§2).

---

## 2. Paleta de cor — QUENTE, sem azul (TOKENS CANÔNICOS)

**Proibido azul/ardósia/cinza-frio em qualquer lugar.** O slate `#5C7488` ("Ardósia") e o
`#4F7264` ("Pinho") foram **extintos**. Esta é a **única** lista de tokens do projeto — todo
handoff/CSS deriva daqui, ninguém redefine hex em outro lugar.

```css
/* Neutros (base da peça — ~90%) */
--ink:#0E110D; --graphite:#181B16; --graphite-2:#14170F;
--border:#25291F; --border-2:#2E3327;
--cream:#EDE6D3;   /* títulos sobre escuro */
--light:#E6E5DD;   /* texto de apoio */
--white:#FAFAF7;
--muted:#8B8C82;   /* meta / mono cinza */
--subtle:#555650;

/* Acentos QUENTES (codificam a estante / nível) */
--sand:#E2D6B4;    /* areia     */
--wheat:#CBA95C;   /* trigo     */
--amber:#D6A23E;   /* âmbar     */
--clay:#C5805A;    /* barro     */
--terra:#B5694A;   /* terracota */
--rust:#9C5A33;    /* ferrugem  */
--cocoa:#6F523A;   /* cacau     */
--olive:#7A9E3F;   /* oliva — acento-mestre, ≤15% */
--olive-soft:#94B85C; --olive-deep:#4F6B26;
```

> **Paleta de estante (o que o admin oferece ao criar uma estante nova).** Os 8 acentos
> acima — `sand, wheat, amber, clay, terra, rust, cocoa, olive` — são as **únicas** opções
> que o seletor de cor do admin mostra (swatches travados, **sem picker livre de hex**).

- A cor **codifica a estante** e entra **só como acento** (borda-topo do card, etiqueta ◆,
  número, selo, bolinha, hover). **Nunca** pinta o fundo do card (exceção única: bloco do
  Modelo B, 1 por fileira — §4).
- **Nunca inventar cor fora desta lista.** Mapeamento de cores antigas → canônicas:
  `Ardósia #5C7488 → (extinto)` · `Pinho #4F7264 → terra` ·
  `Ocre #C0934E → wheat` · `Argila #B07355 → clay` · `"Trigo" #C9A86B (antigo) → wheat`.

**Acentos de NÍVEL (cursos)** — derivam dos mesmos tokens:

| Nível | Token |
|---|---|
| Fundação | `wheat` |
| Liderança | `clay` |
| Multiplicação | `olive` |

### Exceção: editores da área do comprador

Esta exceção vale **somente** para o conteúdo criado/exportado nos editores de arquivos,
imagens, artes, slides e documentos dentro da área do comprador (`app/perfil/**/editores/**`).

- O canvas, filtros, efeitos, modelos de arte, elementos internos do arquivo e recursos
  exportáveis podem usar cores, fontes, imagens e estilos fora do brandbook CE.X.
- Motivo: esses arquivos são artes para igrejas e usuários que podem ter identidade visual
  própria.
- O chrome do produto continua CE.X: navegação, páginas do perfil, painéis, botões,
  formulários, cards, listas, modais, barras de ferramenta e estados de interface seguem
  a identidade CE.X.
- Não aplicar esta exceção ao site público, admin, catálogo, landing pages ou qualquer
  outra área da solução.

---

## 3. Cor é da ESTANTE — e a estante é EDITÁVEL no admin

- A estante é uma **entidade de primeira classe**, gerenciada no admin.
- O acento de um **item** vem da estante onde ele está — nunca é escolhido item a item.
- **Quem define a cor é a estante**, uma vez, no cadastro/edição **da estante**.
- Reúso de cor entre estantes diferentes é OK: estão em seções separadas.

Tabela de estantes (estado inicial — editável no admin):

| Família | Estante | Faixa / sub | Acento |
|---|---|---|---|
| Ministrar | Berçário | 0 a 1 ano e 11 meses | `wheat` |
| Ministrar | Maternal | 2 a 5 anos | `wheat` |
| Ministrar | Primários | 6 a 7 anos | `wheat` |
| Ministrar | Juniores | 8 a 11 anos | `sand` |
| Ministrar | Adolescentes | 12 a 15 anos | `clay` |
| Ministrar | Jovens | 16 a 24 anos | `olive` |
| Ministrar | Igreja toda | datas & campanhas | `terra` |
| Liderar | Manuais | referência completa | `clay` |
| Liderar | Criar ministério | passo a passo | `terra` |
| Liderar | Modelos & Checklists | prático, pra usar hoje | `sand` |
| Liderar | Montar evento | retiro/conferência/culto | `wheat` |

> **Infantil** = Berçário + Maternal + Primários (todas `wheat`). Escada de público:
> `Infantil → Juniores → Adolescentes → Jovens → Igreja toda`.

---

## 4. Modelo do card = rodízio automático por POSIÇÃO

- O usuário **nunca escolhe** o modelo no cadastro. **Não é campo do dado.** O site dá o
  ritmo, derivando pela posição do card na fileira:

  ```
  posição i na estante → modelo = ["A","C","B"][i % 3]
  ```

- **A · tipográfico** — título gigante no fundo ink.
- **C · número** — `messages`/`pages` em número grande + fundo com linhas-guia.
- **B · bloco** — única exceção que pinta cor cheia no topo (texto = tinta escura `--ink`);
  **no máximo 1 por fileira visível**.
- **Mesma moldura sempre:** borda-topo no acento, rodapé fixo com meta + preço/CTA.
- `model`, `big`, `bigLabel` **não se armazenam** — são derivados no render.

---

## 5. Layout — full-bleed estilo Netflix

- Fileiras **sangram até a borda da tela** (sem margem lateral).
- **Auto-Netflix:** estante com **≤ 6** itens → fileira fixa. **≥ 7** → carrossel
  horizontal com setas (desktop) + arraste (touch) + "ver todos →".
  `const SHELF_CAROUSEL_THRESHOLD = 6;`
- **Estante vazia (0 itens publicados) não renderiza.** `status: "Rascunho"` esconde do site.
- **Mobile-first**: abaixo do limite empilha em 2 colunas.

---

## 6. Divisão de seção e cabeçalho de estante (fortes)

- **Capítulo da jornada:** cada família (`Para ministrar` / `Para liderar`) abre com
  marcador forte — numeral-fantasma `01`/`02`, régua com segmento no acento,
  `§ 01 · Conteúdo`, título grande, contador à direita.
- **Cabeçalho de estante:** nome com ◆ no acento + **faixa etária / subtítulo** mono
  embaixo. Nunca a linha mono cinza miúda que some na parede preta.

---

## 7. Material × Curso — mesma família, conversão diferente

- **Mesma moldura/rodapé** dos cards.
- **Card de curso:** fundo **escuro** com linhas-guia (nunca pintar o miolo de cor).
  Acento só nos detalhes. Selo sólido **`● AO VIVO`** (fundo no acento, texto ink) é o
  ÚNICO elemento de cor cheia.
- **Página de detalhe — Material:** termina em **`COMPRAR` → Hotmart** (`target="_blank"`).
- **Página de detalhe — Curso:** termina em **`Entrar na lista de espera →`** + ementa por
  semana. **Sem Hotmart, sem preço.**

---

## 8. Tipografia semiótica e travessões

- **Marca de seção sempre `◆`** (mono, caixa-alta, espaçada, cor de acento). **Nunca `—`.**
- **Zero travessão renderizado:** o caractere `—` (em dash) e `–` (en dash) **não podem
  existir** em nada visível. Reescreva frases com ponto, vírgula ou dois-pontos.
- **Manter** o ponto-do-meio `·` (ex. "PDF · 64 páginas") e as setas `→`.
- **Sem emoji.** Marcas permitidas: `◆ ◇ → §` e a bolinha `●` (só no selo AO VIVO).

---

## 9. Onde está cada coisa (handoffs de tarefa)

Este arquivo é a **lei**. O **como executar cada tarefa** está em:

- `evolucoes/_claude_code_pacote/2 - HANDOFF - Materiais v3 (site + admin).md` → site Materiais v3 + ajustes do admin + contrato de dados.
- `evolucoes/_claude_code_pacote/3 - AJUSTES_ClaudeCode_jornada.md` → unificar header/footer, Home narrativa, cross-linking, fim dos travessões.
- `evolucoes/_claude_code_pacote/4 - AJUSTES_Cursos_e_Mentorias.md` + `5 - BRIEFING_ClaudeCode_Cursos_e_Infantil.md` → cursos, mentorias, faixas Infantil.
- `evolucoes/_claude_code_pacote/6 - Materiais - Revisão v3.html` → **mockup visual aprovado** (referência de pixel).
- `evolucoes/_claude_code_pacote/admin/` → painel interno já prototipado.

> Se um handoff de tarefa contradisser este arquivo, **este arquivo vence**.

**Código legado a migrar** (paleta antiga — azul/ocre/argila/pinho): `admin/data.js`,
`banners/cards.jsx`. Ao tocar nesses arquivos, troque pelos tokens canônicos de §2.

---

## 10. Recap — regras inegociáveis

1. **Dois apps:** admin é a fonte, site é o render. Não fundir.
2. **Sem azul.** Ardósia extinta. Só paleta quente.
3. **Cor é da estante**, derivada. **Modelo é por posição**, não editável.
4. Acento colore **detalhes**, nunca o fundo do card (exceto bloco do Modelo B, 1 por fileira).
5. Texto sobre acento é sempre tinta escura `#0E110D`.
6. **Oliva ≤ 15%** (só Jovens + marca).
7. **Zero `—`/`–`** renderizado. Marca de seção sempre `◆`. Manter `·` e `→`. Sem emoji.
8. Logo `CE.X` = `CE` 700 + `.X` 700 oliva, sem itálico. Fonte Inter, não trocar.
9. Mobile-first. Estante vazia não renderiza. Rascunho não aparece no site.

---

## 11. Módulos centrais — NUNCA duplicar

Estes arquivos são **fonte única de verdade**. Qualquer agente que tocar em dados do banco,
paleta de cores ou layout de landing page **importa daqui**. Nunca redefina inline o que já
existe aqui.

### `app/lib/types.ts` — tipos do Supabase
Contém `DbEstante`, `DbMaterial`, `DbCurso`, `DbMentoria`.
- Se um campo novo for adicionado ao banco, **adicione aqui primeiro**.
- Todos os componentes que leem Supabase importam de `../lib/types`.
- Nunca declare `type DbMaterial = { ... }` ou similar dentro de um componente.

### `app/lib/accents.ts` — paleta e conversão de hex
Contém `AccentKey`, `ACCENTS`, `HEX_TO_ACCENT`, `accentKeyFromHex`.
- `HEX_TO_ACCENT` converte o hex vindo do banco para `AccentKey`. Fonte única.
- Nunca declare `const HEX_TO_ACCENT = { ... }` dentro de um componente.

### `app/loja.css` — CSS global ativo (overrides Next.js)
Importado via `import "./loja.css"` no `app/layout.tsx`. Contém overrides e utilitários específicos do projeto.
Classes definidas aqui:
- `.ld-wrap` — container centralizado (max-width 1180px, padding responsivo).
- `.ld-sec` — seção com padding vertical e borda inferior.

Nunca declare `const wrap = { maxWidth: 1180, ... }` ou `const sec = { padding: "60px 0", ... }`
dentro de um componente. Use `className="ld-wrap"` e `className="ld-sec"`.

---

## 12. Biblioteca de componentes CSS — v2.0

Os arquivos em `public/` são a **CE.X Brand Library v2.0**. Referência completa: `evolucoes/cex-brand-library/AGENTS.md`.

### Brand Book 3.2 — consulta obrigatória para criações novas

Antes de construir qualquer **página, seção, componente, tela, arte, landing page, editor,
fluxo visual ou experiência nova**, consulte também o Brand Book completo:
`brand/CEX Brand Book v3.2 - Standalone (2).html`.

- Use o Brand Book para manter a identidade visual ampla da CE.X: composição, ritmo,
  hierarquia, uso de logo, aplicações, tom visual e exemplos de peças reais.
- Use a Brand Library v2.0 para implementar com os componentes, tokens e classes canônicas
  do site/admin.
- Se houver conflito entre o Brand Book 3.2, handoffs e este `AGENTS.md`, este `AGENTS.md`
  continua prevalecendo nas regras de construção do site/admin.

| Arquivo | O que contém | Importar quando |
|---|---|---|
| `tokens.css` | Variáveis `:root` + classes `.cat-*` de estante | **sempre, primeiro** |
| `components.css` | Tipografia, logo, botões, forms, card, nav | sempre |
| `sections.css` | Hero, captura, depoimento, FAQ, CTA, footer | site público |
| `domain.css` | Capítulo da jornada, estante full-bleed, cards A/C/B, card de curso AO VIVO, calendário | catálogo |
| `ui.css` | Badges, chips, tabs, modal, toast, skeleton, spinner, accordion | sempre |
| `admin.css` | Sidebar admin, métricas, tabela, status, seletor de estante | **só admin** |
| `library.js` | Carrossel arrastável, calendário, tabs, modal, dropdown | sempre |
| `tokens.json` | Tokens machine-readable (W3C) | build/tooling |

**Ordem de import obrigatória:**
`tokens.css` → `components.css` → `sections.css` → `domain.css` → `ui.css` → (`admin.css`) → `library.js`

**Nunca edite esses arquivos diretamente.** Novos estilos vão em `app/loja.css`.

**A cor de estante via `.cat-*`:** aplique a classe na fileira/contexto-pai; os cards herdam `--cat` automaticamente.
```html
<div class="row cat-clay">   <!-- Adolescentes → --cat = var(--clay) -->
  <a class="mcard m-a">…</a>   <!-- card herda a cor da fileira -->
</div>
```

**Breakpoints:** `980px` (grids/sidebar colapsam) e `860px` (mobile/drawer).

---

## Estrutura do projeto

```
app/
  layout.tsx         ← metadata, fontes, imports CSS, library.js
  loja.css           ← CSS de override/utilitários Next.js
  page.tsx           ← Home (página-narrativa)
  materiais/         ← catálogo de materiais
  cursos/            ← cursos & mentorias
  sobre/             ← página sobre
  components/        ← Nav, Footer, MateriaisContent, CursoCard, ProdCard,
                        MaterialLanding, CursoLanding
  lib/
    types.ts         ← tipos Supabase (DbEstante, DbMaterial, DbCurso, DbMentoria)
    accents.ts       ← paleta (ACCENTS, HEX_TO_ACCENT, accentKeyFromHex)
    materiais-data.ts
    cursos-data.ts
public/
  tokens.css         ← tokens v2.0 (IMPORTAR PRIMEIRO)
  components.css     ← tipografia, botões, forms, nav, cards
  sections.css       ← blocos de página (hero, CTA, footer...)
  domain.css         ← catálogo: estante Netflix, cards A/C/B, curso AO VIVO
  ui.css             ← interface: badges, modal, skeleton, tabs...
  admin.css          ← painel admin (importar só no admin)
  library.js         ← interações: carrossel, modal, tabs, calendário
  tokens.json        ← tokens machine-readable
evolucoes/
  cex-brand-library/ ← fonte dos arquivos public/ acima (Brand Library v2.0)
    AGENTS.md        ← referência completa de classes e componentes
    index.html       ← galeria viva: todos os componentes renderizados
```

## Como publicar alterações

```bash
git add -A && git commit -m "descrição da mudança" && git push
```

A Vercel faz o deploy automaticamente após o push.
