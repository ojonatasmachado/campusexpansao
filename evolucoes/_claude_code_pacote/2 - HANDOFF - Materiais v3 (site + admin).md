# HANDOFF — Página Materiais v3 + Admin (CE.X)

Pacote único pra implementação no `campusexpansao.vercel.app`. Cobre o **site público** e o **painel admin**, e — o mais importante — o **contrato de dados** que liga os dois.

> **Leia `AGENTS.md` (raiz) primeiro.** Lá estão os invariantes e os tokens de cor. Este
> handoff só traz o que é **específico da tarefa Materiais v3** (contrato de dados, regras
> de render, ajustes do admin). Não repete paleta nem recaps.

**Arquivos de referência (nesta pasta):**
- `Materiais - Revisão v3.html` → **mockup do site público** (visual aprovado pelo cliente).
- `admin/Admin CE.X.html` (+ `admin/*.jsx`, `admin/data.js`) → **painel interno** já prototipado.
- `banners/cards.jsx` → implementação de referência dos modelos de card A/B/C/D.

> **Regra de ouro:** o **admin é a fonte dos dados**; o **site é o render**. São dois apps separados (o admin fica numa URL restrita, com login). Não fundir o código — eles só compartilham o **modelo de dados** abaixo.

---

## 0. O que mudou da versão anterior pra v3 (resumo executivo)

1. **Matar o azul.** Ardósia `#5C7488` sai de tudo (era usado em "Para liderar" no site e no `admin/data.js`). Entra a paleta quente.
2. **Divisão das seções vira "capítulo".** Cada família (`Para ministrar` / `Para liderar`) abre com um marcador forte: numeral-fantasma `01`/`02`, régua com segmento no acento, `§ 01 · Conteúdo`, título grande, contador à direita.
3. **Cabeçalho de estante forte e legível.** Nome da estante em **cream, bold, 20px** + **faixa etária como subtítulo** mono embaixo. Não é mais a linha mono cinza que sumia na parede preta.
4. **Modelo do card = rodízio automático por POSIÇÃO** (não é mais campo escolhido por item). Ver §3.3.
5. **Faixas Infantil** (Berçário/Maternal/Primários) entram como estantes de "Para ministrar".

---

## 1. Contrato de dados (o que liga admin ↔ site)

Cada item é um objeto. Campos que o **site consome** pra renderizar a estante e o card:

```js
{
  id: "mat-001",
  type: "material",              // material | curso | mentoria | evento
  family: "Para ministrar",      // "Para ministrar" | "Para liderar"
  shelf: "Adolescentes",         // chave da estante (ver tabela §5)
  code: "S-12",                  // etiqueta curta (ex.: S-12, M-04)
  title: "Firmes",
  desc: "...",                   // usado na página de detalhe
  messages: 6,                   // nº de mensagens (null se for manual/página)
  pages: 48,
  price: 47,                     // número; site formata "R$ 47"
  status: "Publicado",           // "Publicado" | "Rascunho" — Rascunho NÃO aparece no site
  hotmart: "https://...",
  image: null

  // ── NÃO editáveis pelo usuário — derivados pelo sistema: ──
  // accent  → derivado da ESTANTE (tabela §5). Nunca campo livre.
  // model   → derivado da POSIÇÃO na estante, no render do site (§3.3). NÃO armazenar.
  // big/bigLabel → derivados: se messages != null → (messages, "mensagens"); senão (pages, "páginas").
}
```

**Decisão importante:** `accent` e `model` **não são propriedades do item**. São derivados:
- `accent` vem da **estante** (config em §5). O editor mostra a cor **travada** (read-only), só pra conferência.
- `model` (A/C/B) vem da **posição** do card na fileira, no momento do render do site. Não guardar no banco; não oferecer seletor.

A estante é uma **entidade própria** (não só um nome solto):

```js
SHELVES = {
  "Para ministrar": [
    { key: "Berçário",   label: "Berçário",   age: "0 a 1 ano e 11 meses", accent: "wheat" },
    { key: "Maternal",   label: "Maternal",   age: "2 a 5 anos",           accent: "wheat" },
    { key: "Primários",  label: "Primários",  age: "6 a 7 anos",           accent: "wheat" },
    { key: "Juniores",   label: "Juniores",   age: "8 a 11 anos",          accent: "sand"  },
    { key: "Adolescentes",label:"Adolescentes",age:"12 a 15 anos",         accent: "clay"  },
    { key: "Jovens",     label: "Jovens",     age: "16 a 24 anos",         accent: "olive" },
    { key: "Igreja toda",label: "Igreja toda",age: "datas & campanhas",    accent: "terra" },
  ],
  "Para liderar": [
    { key: "Manuais",              label: "Manuais",              sub: "referência completa",          accent: "clay"  },
    { key: "Criar ministério",     label: "Criar ministério",     sub: "passo a passo",                accent: "terra" },
    { key: "Modelos & Checklists", label: "Modelos & Checklists", sub: "prático, pra usar hoje",       accent: "sand"  },
    { key: "Montar evento",        label: "Montar evento",        sub: "retiro, conferência, culto",   accent: "wheat" },
  ]
}
```

---

## 2. Paleta — ver `AGENTS.md` §2

Tokens de cor (quente, sem azul) e a regra "cor codifica a estante / oliva ≤ 15%" vivem em
`AGENTS.md` §2–§3. **Não redefinir hex aqui.** Reúso de cor entre `Para ministrar` e
`Para liderar` (ex.: barro em Adolescentes e Manuais) é OK: seções diferentes, nunca a
mesma fileira.

---

## 3. Site público — regras de render (ver `Materiais - Revisão v3.html`)

### 3.1 Divisão de seção (capítulo da jornada)
Cada família abre um bloco `.macro` com:
- Régua de 2px (`.macro-rule`) com segmento de 128px no acento da cabeça da seção.
- Numeral-fantasma grande (`01`/`02`) à esquerda, no acento, ~14% de opacidade.
- `§ 01 · Conteúdo` (mono) → título `Para ministrar` (52px, com bullet quadrado) → descrição.
- Contador à direita (`7 faixas · materiais por idade`).
- Cabeça de `Para ministrar` = **cream**; de `Para liderar` = **oliva**.

### 3.2 Cabeçalho de estante (forte — é o ponto do pedido)
Cada `.row` tem:
- **Nome** em Inter 600, 20px, cream, com ◆ no acento da estante.
- **Faixa etária / subtítulo** logo abaixo, mono 12px, cinza (`0 a 1 ano e 11 meses`).
- À direita: `N material(is) · ver todos →` + setas ←/→.
- (Tweak `header: minimal` no mockup mostra a versão antiga numa linha — referência de contraste; **ir de `forte` pra produção**.)

### 3.3 Modelo do card = rodízio automático por posição
Mesma moldura (244–254px, borda-topo no acento, rodapé fixo meta+preço+CTA). O **miolo** alterna por índice na fileira:

```
posição i na estante → modelo = ["A","C","B"][i % 3]
```

- **A · tipográfico** — título gigante no ink.
- **C · número** — `messages`/`pages` em número grande + fundo com linhas-guia.
- **B · bloco** — faixa de cor cheia no topo (texto = tinta escura `--ink`), título embaixo.
- Regras herdadas: **nunca 2 modelos iguais em fila**; **no máximo 1 modelo B por fileira visível**. (D · foto entra depois, quando houver imagem real.)
- O usuário **não escolhe** o modelo no cadastro. É o site que dá o ritmo.

### 3.4 Auto-Netflix (igual ao já especificado)
- Estante com **≤ 6** itens → fileira fixa, tudo visível (sem scroll lateral).
- **≥ 7** → carrossel horizontal full-bleed: setas (desktop) + arraste (touch) + "ver todos →".
- `const SHELF_CAROUSEL_THRESHOLD = 6;`

### 3.5 Full-bleed
As fileiras **sangram até a borda da tela** (sem margem lateral): `.row-track { margin: 0 -64px; padding: 0 64px; }` dentro de um container de largura total. Cabeçalhos respeitam o padding lateral.

### 3.6 Mobile
- Abaixo do limite, a estante **empilha em 2 colunas** (não some pro lado).
- Acima do limite, carrossel que rola com o dedo. Tráfego é majoritariamente Instagram/celular — priorizar mobile.
- Estante vazia (0 itens publicados) **não renderiza**.
- O site percorre as estantes por `order` e **pula as `active:false`** — ordem e ativação
  vêm do admin (§4.1), não do código.

---

## 4. Admin — ajustes no que já existe (`admin/`)

O painel (login, dashboard, listas, editor com prévia ao vivo) está bom. Ajustar:

1. **Matar Ardósia.** Em `admin/data.js`, remover `ardosia` de `ACCENTS` e do `accentFor()`. `Para liderar` passa a derivar o acento da **estante** (tabela §5), não mais uma cor única fria.
2. **Sincronizar a paleta** com os tokens quentes do §2 (areia/trigo/barro/terracota/oliva) — os hex do `data.js` devem ser exatamente esses.
3. **Remover o seletor/campo de modelo.** `model`, `big`, `bigLabel` saem do dado: o site deriva (§3.3 e §1). A prévia do card no editor deve mostrar o **rodízio** como o site faz (por posição), não um modelo fixo escolhido.
4. **Acento travado (read-only).** O editor já mostra a cor derivada da estante — manter, mas com o novo mapa. Usuário nunca escolhe cor à mão.
5. **Adicionar as faixas Infantil.** `SHELVES["Para ministrar"]` hoje só tem Juniores+. Incluir **Berçário / Maternal / Primários** com a faixa etária (§1) e acento **trigo**. As três compartilham o mesmo acento (lê como "Infantil").
6. **Estante carrega a faixa etária.** O campo `age`/`sub` da estante (§1) é o que o site mostra como subtítulo do cabeçalho. Garantir que esteja no config de estantes, não no item.
7. `status: "Rascunho"` continua escondendo o item do site (já implementado) — manter.

> O resto do admin (dashboard de métricas, Hotmart, lista de espera, prévia Card/Página/Banner) segue como está. Backend real (login, banco) fica pro Claude Code ligar depois.

### 4.1 Gestão de ESTANTES (nova tela no admin)

A estante deixa de ser lista fixa em código e vira **entidade editável**. Adicionar uma
seção **"Estantes"** no admin (irmã de Materiais/Cursos), por família (`Para ministrar` /
`Para liderar`), com:

1. **Criar estante.** Campos: `nome` (ex. "Pré-adolescentes"), `sub`/`faixa etária` (ex.
   "10 a 12 anos"), `família` (ministrar/liderar) e `acento` escolhido entre os **swatches
   da paleta de estante** (AGENTS.md §2 — 8 cores, **sem picker livre**). Gera um `key`/slug
   automaticamente.
2. **Reordenar.** Arrastar as estantes pra mudar a ordem em que aparecem no site (campo
   `order`). A ordem do site segue exatamente esta.
3. **Ativar / desativar.** Toggle `active`. Estante **desativada some do site** (e seus itens
   com ela), mas **não é apagada** — os materiais continuam no banco e voltam quando
   reativar. Útil pra tirar uma seção do ar temporariamente sem perder nada.
4. **Renomear / trocar faixa / trocar acento** de uma estante existente, a qualquer momento.
5. **Excluir** só quando vazia (senão, exigir mover/arquivar os itens antes) — evita
   material órfão.

**Modelo de dados da estante** (passa a ser persistido, não hardcoded):
```js
{ key:"adolescentes", family:"Para ministrar", label:"Adolescentes",
  sub:"12 a 15 anos", accent:"clay", order:5, active:true }
```
- No editor de **item**, o campo `shelf` vira um **select** que lista as estantes ativas da
  família escolhida. O `accent` do item continua **derivado e travado** (vem da estante).
- Tudo que aparece no site (estantes + itens) é editável por aqui. Materiais são o foco de
  movimentação: criar/editar/ativar/reordenar tem que ser rápido.
- Regras de cor/modelo do AGENTS.md continuam valendo: cor só da paleta travada; modelo do
  card é por posição (o admin não oferece isso).

---

## 5. Tabela estante → acento — ver `AGENTS.md` §3

A tabela mestra estante→acento (única fonte de verdade), com faixas etárias, está em
`AGENTS.md` §3. Não duplicar aqui.

---

## 6. Regras inegociáveis — ver `AGENTS.md` §10

Os invariantes (sem azul, oliva ≤ 15%, cor-da-estante, modelo-por-posição, texto sobre
acento, logo, fonte, marcas semióticas) estão em `AGENTS.md` §10. Este handoff não os repete.
