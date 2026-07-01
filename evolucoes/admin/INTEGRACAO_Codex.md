# INTEGRAÇÃO — Editor de Materiais (CE.X Admin)

Guia para o **Codex / Claude Code** integrar o novo editor de materiais ao site/admin real.
Leia o `AGENTS.md` da raiz antes (leis de build). Este guia cobre SÓ o editor de criação/edição de materiais.

---

## 1. O que tem neste pacote

Protótipo React (sem build, roda direto no navegador via Babel standalone). 7 arquivos:

| Arquivo | O que é | Mexer? |
|---|---|---|
| `Admin CE.X.html` | Casca: `<head>` com **todo o CSS** + carrega os scripts no fim do `<body>` | **SIM** — o CSS do editor mora aqui |
| `editor.jsx` | **O EDITOR** — pop-up de escolha, módulos (texto/PDF/slides/imagem), lista de conteúdos, prévia, salvar | **SIM** — é o coração |
| `preview.jsx` | Réplicas do card + página de venda + painel de divulgação (a "prévia ao vivo") | **SIM** — lista "o que vem dentro" |
| `data.js` | Catálogo semeado + `blankItem()` (item em branco) | **SIM** — modelo de dados |
| `app.jsx` | Shell, login, roteamento, listas | só se mudar navegação |
| `dashboard.jsx` | Painel inicial | não |
| `share.jsx` | Aba "Divulgação" da prévia | não |

**Ordem de carregamento** (já no fim do `Admin CE.X.html`, NÃO inverter):
`data.js` → `preview.jsx` → `share.jsx` → `dashboard.jsx` → `editor.jsx` → `app.jsx`

> Cada `<script type="text/babel">` tem escopo próprio. Componentes compartilhados são exportados com `Object.assign(window, {...})` no fim de cada arquivo. Ao migrar pra um bundler real (Vite/Next), troque isso por `import/export`.

---

## 2. MODELO DE DADOS — o que muda no banco

Um material agora carrega um array **`contents[]`**. Cada item é um conteúdo que o comprador recebe. **É a mudança principal.** Onde definir: `data.js`, dentro de `blankItem('material')` e no `mat(...)` semeado.

```js
item = {
  id, type:'material', title, desc, family, shelf, code,   // code é GERADO (M-xx / S-xx), não editável
  price, hotmart, status, model:'A'|'B'|'C'|'D',           // model = layout do card
  tags:[], faq:[{q,a}], messageList:[{nome,desc}],         // faq é opcional
  image,                                                    // capa opcional
  // ── DERIVADOS automaticamente de contents[] (NÃO digitados):
  messages, pages, format, formatos:[],

  // ── O ARRAY NOVO:
  contents: [
    { kind:'word', name, note, text, chars, messages, pages, delivery:'word'|'pdf', headings:[] },
    { kind:'pdf',  name, note, file, pages },
    { kind:'ppt',  name, note, slides },
    // (imagem de capa NÃO entra aqui — fica em item.image)
  ]
}
```

- **`name`** e **`note`** de cada conteúdo são o que aparece na **página de venda** ("O que vem dentro").
- `messages`, `pages`, `format`, `formatos` são **recalculados** por `deriveFromContents()` toda vez que `contents[]` muda. **Não salvar como verdade absoluta** — derivar no backend também, ou confiar no que o editor manda.
- `code` é gerado uma vez (`systemicCode()` em `editor.jsx`) e exibido como selo travado.

---

## 3. FLUXO DO EDITOR (como funciona hoje)

1. Botão **"Adicionar conteúdo"** → abre **`ChooserModal`** (pop-up: Documento de texto / PDF / Apresentação / Imagem).
2. Escolha → abre o **módulo** correspondente (`WordModal`, `PdfModal`, `PptModal`) ou o seletor de imagem.
3. Cada módulo tem **título + descrição** do conteúdo (componente `ContentDetails`) → vão pra página de venda.
4. Salvar no módulo → volta pra tela do produto; os totais e a prévia atualizam.
5. Clicar numa peça da lista = **editar** aquele conteúdo. Arrastar = reordenar.
6. Prévia ao vivo fica **fixa à direita**, atualizando enquanto digita o nome/edita.

> **IMPORTANTE:** os módulos aqui são *placeholders simplificados*. No app real, **substitua o corpo de cada `*Modal` pelo módulo de verdade que você já construiu** (editor de texto, leitor de PDF, estúdio de slides). Mantenha só o contrato de saída — veja §4.

---

## 4. ONDE O CODEX MEXE (ponto a ponto)

### A) Trocar os módulos placeholder pelos módulos reais
**Arquivo:** `editor.jsx` → funções `WordModal`, `PdfModal`, `PptModal`.
- Cada um recebe `{ initial, onAdd, onClose }`.
  - `initial` = conteúdo existente (modo edição) ou `undefined` (novo).
  - Ao salvar, chame **`onAdd(content, suggest)`** onde:
    - `content` = objeto com o `kind` certo + `name` + `note` + metadados (ver §2).
    - `suggest` = `{title, desc}` para auto-preencher nome/descrição do PRODUTO (só na 1ª vez). Passe `null` se não quiser sugerir.
- Plugue seu editor de texto / leitor de PDF / estúdio de slides DENTRO do corpo do modal, mantendo o bloco `<ContentDetails>` (título + descrição) e o botão do rodapé que chama `onAdd`.

### B) Lista "o que vem dentro" na página de venda
**Arquivo:** `preview.jsx` → bloco `◆ O que vem dentro` (usa `item.contents`, helpers `contentName()`/`contentMeta()`).
- Replique essa mesma renderização na **página de venda REAL** do site, lendo `item.contents`.

### C) Modelo de dados / persistência
**Arquivo:** `data.js`. Espelhe `contents[]`, `tags`, `faq`, `model` no seu schema (Supabase/Postgres/etc). `faq` é opcional (pode vir `[]`).

### D) Salvar / publicar
**Arquivo:** `editor.jsx` → botão final chama **`onSave(dv)`** (`dv` = item completo com `accent` resolvido). Hoje `app.jsx` guarda em memória. Troque por **POST/PUT na sua API**. `status:'Rascunho'` não deve aparecer no site.

### E) Estilo
**Arquivo:** `Admin CE.X.html` (`<style>`). Classes do editor: `.editor`, `.ed-form`, `.ed-preview`, `.wb*` (lista de conteúdos), `.piece*` (cartão de conteúdo), `.cmodal*`/`.chooser*` (pop-ups), `.modelbar`/`.modelchip` (seletor de modelo do card). A **cor (accent) vem da estante** via `window.CEX_accentFor(item)` — não há campo de cor.

---

## 5. Checklist de migração pra produção

- [ ] Trocar React+Babel via CDN por bundler real (Vite/Next) — converter `Object.assign(window,…)` em `export`.
- [ ] Substituir corpo dos 3 `*Modal` pelos módulos reais (texto/PDF/slides), mantendo o contrato `onAdd(content, suggest)`.
- [ ] Persistir `contents[]`, `tags`, `faq`, `model`, `code` no banco.
- [ ] Renderizar `contents[]` na página de venda real (copiar de `preview.jsx`).
- [ ] `onSave` → API real; respeitar `status` Rascunho/Publicado.
- [ ] Conferir leis do `AGENTS.md` (paleta quente, marca ◆, cor-da-estante, full-bleed, zero travessão).

---

## 6. Rodar o protótipo
Abra `Admin CE.X.html` num servidor estático (os `.jsx` precisam de HTTP, não `file://`):
```
cd admin && python3 -m http.server 8080   # depois abra http://localhost:8080/Admin%20CE.X.html
```
Senha do protótipo: **`cex2026`** → aba **Materiais** → *+ Novo material* ou *Editar*.
