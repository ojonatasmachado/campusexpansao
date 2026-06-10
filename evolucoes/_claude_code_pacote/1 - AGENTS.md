# AGENTS.md — CE.X · Constituição de Construção

> **Leia isto ANTES de qualquer tarefa neste repositório.**
> Vale para **Codex, Claude Code ou qualquer agente**. São as leis invariantes do
> projeto CE.X. Não importa o que for pedido (página nova, ajuste, componente, admin):
> **sempre se constrói deste jeito.** Tarefas específicas vivem nos handoffs (ver §9);
> este arquivo é o que **nunca muda**.
>
> Codex lê `AGENTS.md`. Claude Code lê `CLAUDE.md` (e este arquivo). Se houver conflito,
> **as regras de construção do site/admin deste arquivo prevalecem** sobre o `CLAUDE.md`
> (que cobre a identidade da marca e a produção de reels, não o build do site).

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
> Pra adicionar uma cor nova à paleta no futuro: inclua o token AQUI, quente/terroso, e
> ele passa a aparecer no admin. Nunca um hex solto fora desta lista.

- A cor **codifica a estante** e entra **só como acento** (borda-topo do card, etiqueta ◆,
  número, selo, bolinha, hover). **Nunca** pinta o fundo do card (exceção única: bloco do
  Modelo B, 1 por fileira — §4).
- **Nunca inventar cor fora desta lista.** Nada de cinza/azul apagado ("parece desativado").
  Mapeamento de cores antigas → canônicas (ao migrar código legado):
  `Ardósia #5C7488 → (estante deriva, ver §3)` · `Pinho #4F7264 → terra` ·
  `Ocre #C0934E → wheat` · `Argila #B07355 → clay` · `"Trigo" #C9A86B (Infantil) → wheat`.

**Acentos de NÍVEL (cursos)** — derivam dos mesmos tokens:

| Nível | Token |
|---|---|
| Fundação | `wheat` |
| Liderança | `clay` |
| Multiplicação | `olive` |

---

## 3. Cor é da ESTANTE — e a estante é EDITÁVEL no admin

- A estante é uma **entidade de primeira classe**, gerenciada no admin (criar, renomear,
  reordenar, ativar/desativar — ver `HANDOFF v3` §4). Não é mais uma lista fixa em código.
- O acento de um **item** vem da estante onde ele está — nunca é escolhido item a item.
  No editor de item a cor aparece **travada (read-only)**.
- **Quem define a cor é a estante**, uma vez, no cadastro/edição **da estante**: o usuário
  escolhe o acento entre os swatches da paleta de estante (§2) — nunca hex livre.
- Reúso de cor entre estantes diferentes é OK (ex. barro em Adolescentes e Manuais):
  estão em seções separadas, **nunca na mesma fileira**.

A tabela abaixo é o **estado inicial semeado** (o usuário edita a partir daqui):

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

> **Infantil** = a modalidade que reúne **Berçário + Maternal + Primários**. As três
> sub-estantes **compartilham `wheat`** (a diferenciação é o rótulo + faixa etária, nunca a
> cor). No filtro de público, `Infantil` entra antes de `Juniores`. Resolve a proposta
> "Trigo" do BRIEFING: **é `wheat`, não uma cor nova.**

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
- **Mesma moldura sempre:** 244–254px, borda-topo no acento, rodapé fixo com meta + preço/CTA.
  É a moldura + a cor que dão a sensação de "família" mesmo com miolos diferentes.
- `model`, `big`, `bigLabel` **não se armazenam** — são derivados no render.

---

## 5. Layout — full-bleed estilo Netflix

- Fileiras **sangram até a borda da tela** (sem margem lateral):
  `.row-track { margin: 0 -64px; padding: 0 64px; }` dentro de container de largura total.
  Os cabeçalhos respeitam o padding.
- **Auto-Netflix:** estante com **≤ 6** itens → fileira fixa, tudo visível. **≥ 7** →
  carrossel horizontal com setas (desktop) + arraste (touch) + "ver todos →".
  `const SHELF_CAROUSEL_THRESHOLD = 6;` (fácil de achar e alterar).
- **Estante vazia (0 itens publicados) não renderiza.** `status: "Rascunho"` esconde do site.
- **Mobile-first** (tráfego vem do Instagram): abaixo do limite empilha em 2 colunas;
  nada de scroll lateral acidental.

---

## 6. Divisão de seção e cabeçalho de estante (fortes)

- **Capítulo da jornada:** cada família (`Para ministrar` / `Para liderar`) abre com
  marcador forte — numeral-fantasma `01`/`02`, régua com segmento no acento,
  `§ 01 · Conteúdo`, título grande, contador à direita. Bate o olho, entende a seção.
- **Cabeçalho de estante:** nome em cream, bold, ~20px, com ◆ no acento + **faixa etária /
  subtítulo** mono embaixo. Nunca a linha mono cinza miúda que some na parede preta.

---

## 7. Material × Curso — mesma família, conversão diferente

- **Mesma moldura/rodapé** dos cards de material (é o que faz o site conversar).
- **Card de curso:** fundo **escuro** com linhas-guia (nunca pintar o miolo de cor).
  Acento só nos detalhes. Selo sólido **`● AO VIVO`** (fundo no acento, texto ink) é o
  ÚNICO elemento de cor cheia. **Sem preço.** Agrupar **por nível** (Fundação / Liderança /
  Multiplicação), não em grade plana.
- **Página de detalhe — Material:** termina em **`COMPRAR` → Hotmart** (`target="_blank"`).
- **Página de detalhe — Curso:** termina em **`Entrar na lista de espera →`** + ementa por
  semana. **Sem Hotmart, sem preço.**

---

## 8. Tipografia semiótica e travessões

- **Marca de seção sempre `◆`** (mono, caixa-alta, espaçada, cor de acento). **Nunca `—`.**
- **Zero travessão renderizado:** o caractere `—` (em dash) e `–` (en dash) **não podem
  existir** em nada visível. Reescreva frases com ponto, vírgula ou dois-pontos.
  Faça varredura final buscando `—` e `–`.
- **Manter** o ponto-do-meio `·` (ex. "PDF · 64 páginas") e as setas `→`.
- **Sem emoji.** Marcas permitidas: `◆ ◇ → §` e a bolinha `●` (só no selo AO VIVO).

---

## 9. Onde está cada coisa (handoffs de tarefa)

Este arquivo é a **lei**. O **como executar cada tarefa** está em:

- `HANDOFF - Materiais v3 (site + admin).md` → site Materiais v3 + ajustes do admin + **contrato de dados** (§1).
- `AJUSTES_ClaudeCode_jornada.md` → unificar header/footer, Home narrativa, cross-linking, fim dos travessões.
- `AJUSTES_Cursos_e_Mentorias.md` + `BRIEFING_ClaudeCode_Cursos_e_Infantil.md` → cursos, mentorias, faixas Infantil.
- `Materiais - Revisão v3.html` → **mockup visual aprovado** do site público (referência de pixel).
- `admin/` → painel interno já prototipado (`Admin CE.X.html` + `*.jsx` + `data.js`).
- `CEX_BrandBook_v3.html` → tokens e uso da marca.

> Se um handoff de tarefa contradisser este arquivo, **este arquivo vence** — ou pare e
> sinalize o conflito. As regras de §0–§8 valem para tudo que for criado, sempre.

**Código legado a migrar** (ainda com a paleta antiga — azul/ocre/argila/pinho): o mapa de
acento de `admin/data.js` (`ACCENTS`, `accentFor()`) e as referências `banners/cards.jsx` /
`design_handoff_pagina_venda/referencia/cards.jsx`. Ao tocar nesses arquivos, troque os hex
pelos tokens deste §2 (mapa de migração lá). Não copie a paleta deles.

---

## 10. Recap — regras inegociáveis

1. **Dois apps:** admin é a fonte, site é o render. Não fundir.
2. **Sem azul.** Ardósia extinta do site e do admin. Só paleta quente.
3. **Cor é da estante**, derivada, não editável. **Modelo é por posição**, não editável.
4. Acento colore **detalhes**, nunca o fundo do card (exceto bloco do Modelo B, 1 por fileira).
5. Texto sobre acento é sempre tinta escura `#0E110D`.
6. **Oliva ≤ 15%** (só Jovens + marca).
7. **Zero `—`/`–`** renderizado. Marca de seção sempre `◆`. Manter `·` e `→`. Sem emoji.
8. Logo `CE.X` = `CE` 700 + `.X` 700 oliva, sem itálico. Fonte Inter, não trocar.
9. Mobile-first. Estante vazia não renderiza. Rascunho não aparece no site.
