# Handoff: CE.X · Página de Venda de Materiais Editáveis

> **Para o Claude Code:** leia este README inteiro antes de começar. Ele é
> auto-suficiente — descreve a arquitetura da página, o menu, o sistema de cards,
> a paleta e o modelo de dados. Os arquivos em `referencia/` são **protótipos de
> design feitos em HTML** (mostram o look e o comportamento pretendidos), **não
> são código de produção pra copiar e colar**. Sua tarefa é **recriar esses
> designs** no ambiente do projeto (React/Vite já existente neste repositório),
> seguindo os padrões dele. Se ainda não houver framework, use React.

---

## 1. Visão geral

Página de venda **single-page** da CE.X · Campus Expansão para vender materiais
editáveis a líderes de igreja. **Compra única**: o botão de compra de cada
material leva para um **link externo da Hotmart**. Não há checkout próprio.

A identidade visual completa está em `CEX_BrandBook_v3.html` (na raiz do projeto).
Siga-a à risca. Os tokens essenciais estão na Seção 6 deste documento.

**Fidelidade:** ALTA (hi-fi). As cores, tipografia, espaçamentos e modelos de card
em `referencia/` são finais. Recrie pixel-perfect usando os componentes/estilos do
codebase.

---

## 2. Arquitetura da página — UMA página, filtro de 2 andares

Não criar páginas separadas por categoria. É **uma página só**. Categoria NÃO é
item de menu — é filtro DENTRO da página.

### Filtro de 2 andares
- **Andar 1 (família):** `Tudo` · `Para ministrar` · `Para liderar` · `Eventos`
- **Andar 2 (muda conforme o andar 1):**
  - Em **Para ministrar** → Juniores · Adolescentes · Jovens · Igreja toda *(público)*
  - Em **Para liderar** → Manuais · Criar ministério · Modelos & Checklists · Montar evento *(função)*

Sem filtro ("Tudo"): mostra todas as estantes em seções, na ordem **Para ministrar**
→ **Para liderar**. Selecionar uma família esconde a outra e revela o andar 2.
Selecionar uma subcategoria mostra só aquela estante.

### As duas famílias (nomeadas pela INTENÇÃO do líder)
| Família | O que é | Organizada por | Estantes |
|---|---|---|---|
| **Para ministrar** | conteúdo que o líder ensina | PÚBLICO | Juniores, Adolescentes, Jovens, Igreja toda |
| **Para liderar** | ferramentas de gestão | FUNÇÃO | Manuais, Criar ministério, Modelos & Checklists, Montar evento |

Cada público/função é uma **estante** (uma fileira de cards).

### Coleção "Eventos" (vitrine que cruza as duas famílias)
Um produto mora em UMA família só, mas pode aparecer em coleções temáticas que
apenas APONTAM pra ele (sem duplicar). "Eventos" puxa o material de **montar** o
evento (de *Para liderar → Montar evento*) + o conteúdo pra **ministrar** no evento
(séries de retiro/conferência de *Para ministrar*). Implementar como tag no dado
(`colecoes: ["retiro"]`), não como categoria fixa.

---

## 3. Menu do topo

```
CE.X     Início · Materiais · Cursos & Mentorias · Sobre        [ Comece agora → ]
```

- **Início** → home/apresentação
- **Materiais** → ESTA página (catálogo: ministrar + liderar + eventos). É onde mora o filtro.
- **Cursos & Mentorias** → bloco "ao vivo" (turma, data, vaga, ticket maior). Lógica
  de compra diferente. Pode ser só "Em breve" por enquanto.
- **Sobre** → a CE.X · tese "Nós preparamos. Deus multiplica."

**NÃO usar** os itens "Séries" nem "Loja" no menu (erro da versão anterior):
- "Séries" é o filtro interno *Para ministrar*, não um item de menu.
- "Loja" é comercial demais e vago — a página se chama **Materiais**.

Regra geral: **menu = grandes mundos** (Materiais prontos × Ao vivo × Sobre).
**Filtro de 2 andares = navegação fina**, sempre dentro de Materiais.

O botão **"Comece agora"** rola/leva pro catálogo de Materiais (ou pro carro-chefe).

---

## 4. Comportamento das estantes — AUTO-NETFLIX (regra importante)

Cada estante decide sozinha como se exibe, pela quantidade de materiais.

```js
const SHELF_CAROUSEL_THRESHOLD = 6; // deixe fácil de achar e alterar
```

- Estante com **até 6** materiais → exibe **todos** numa fileira/grade fixa, **sem
  scroll lateral** (tudo visível). Venda precisa mostrar tudo.
- Estante com **7 ou mais** → vira **carrossel horizontal estilo Netflix**: rola pro
  lado, com setas (desktop) + arraste (touch) + link **"Ver todos →"** no canto.

A troca é **automática** conforme materiais são cadastrados — o usuário só adiciona
itens ao dado.

**Mobile-first:** abaixo do limite, a estante **empilha em 2 colunas verticais** (não
some pro lado). Acima do limite, vira carrossel que rola com o dedo. A maior parte do
tráfego vem do Instagram no celular — priorize mobile.

---

## 5. Sistema de cards (banners) — esqueleto fixo, miolo que varia

Veja `referencia/Sistema de Banners.html` (abra no navegador) e
`referencia/cards.jsx` (a implementação de referência dos modelos). **Regra de
ouro:** toda a "família" tem a **mesma moldura e o mesmo rodapé** — só o **miolo
(arte)** muda. É isso que dá vida sem poluir.

### Dimensões do card
| Token | Valor |
|---|---|
| Largura do card (`CARD_W`) | **320px** |
| Altura da arte (`ART_H`) | **300px** |
| Altura do rodapé (`FOOT_H`) | **150px** |
| Raio | **10px** · `overflow: hidden` |
| Borda | `1px solid #25291F` |
| Fundo do card | `#181B16` (graphite) |
| Sombra | `0 1px 0 rgba(255,255,255,.02), 0 20px 40px -28px rgba(0,0,0,.8)` |
| Gap entre cards na estante | **22px** |

### Rodapé FIXO (igual em todos os cards) — `#181B16`, `border-top:1px #25291F`, padding `22px 24px`
- **Linha de meta** (mono, 11.5px, cor `#8B8C82`): ex. `6 mensagens · Editável · PDF`
- **Rodapé inferior** (flex, space-between):
  - **Preço** — Inter 600, 19px, `#FAFAF7`, ex. `R$ 47`
  - **CTA** — mono 11px, uppercase, **cor = acento da estante**, texto `Ver material →`

### Os 4 modelos de miolo (arte · 320×300)

**Modelo A · Tipográfico** — fundo `#0E110D` (ink), padding 24.
- Topo: etiqueta (◆ + mono 11px uppercase, **cor = acento**) à esquerda; `code` mono
  10px `#555650` à direita.
- Base: **título gigante** — Inter **800**, 52px, line-height .9, letter-spacing
  -.035em, cor `#EDE6D3` (cream), `text-wrap: balance`.
- Uso: séries cujo **nome já é o gancho** ("Firmes").

**Modelo B · Bloco de cor** — fundo ink, com **bloco de cor cheia no topo**.
- Bloco superior: `background: <acento>`, padding `20px 24px`. Dentro: etiqueta em
  **tinta escura** `#0E110D` (◆ + mono 11px uppercase, weight 500) à esquerda; `code`
  em `rgba(14,17,13,.5)` à direita. **Texto sobre cor é sempre tinta escura.**
- Abaixo (flex 1, padding 24, alinhado à base): título Inter 800, 46px, cream.
- Uso: **um por estante** — é o card que carrega a cor cheia. Segura a proporção de
  acento na página.

**Modelo C · Número / índice** — fundo `#14170F`, padding 24, com linhas-guia
horizontais (`linear-gradient(#25291F 1px, transparent 1px)`, `background-size:100% 38px`).
- Topo: etiqueta (◆ + mono, cor `#C9BFA0` sand).
- Centro: **número gigante** — Inter 800, 92px, line-height .8, **cor = acento** +
  rótulo mono vertical (ex. `encontros`, `páginas`, `modelos`) cor `#8B8C82`.
- Base: título Inter 700, 26px, cream.
- Uso: manuais/checklists onde "6 encontros / 40 páginas" já atrai.

**Modelo D · Foto** — para quando houver **arte/foto real** (placeholder por enquanto).
- Fundo: `radial-gradient(120% 80% at 30% 20%, <acento.deep> 0%, #0E110D 60%)` +
  textura diagonal sutil + scrim `linear-gradient(180deg, rgba(14,17,13,.1), rgba(14,17,13,.9))`.
- Etiqueta no topo (cor creme); título Inter 800, 44px, branco, ancorado na base.
- Encaixa na **mesma moldura/rodapé** dos outros.

### Rodízio dos modelos (como dar vida sem poluir)
O modelo de cada card é um **campo no dado** (`model: "A" | "B" | "C" | "D"`). Regra:
**nunca 2 modelos iguais em fila** dentro da mesma estante, e **no máximo 1 modelo B
(cor cheia) por estante**. Se o campo vier vazio, alterne automaticamente A→C→B→A…

---

## 6. Design tokens

### Base (do brand book — NÃO inventar fora disto)
```
--ink:        #0E110D   /* fundo primário */
--graphite:   #181B16   /* fundo de card / rodapé */
--graphite2:  #14170F   /* fundo do modelo C */
--border:     #25291F   /* linha sutil */
--border-2:   #2E3327   /* linha mais visível */
--cream:      #EDE6D3   /* títulos / "papel" */
--cream-soft: #F6F1E0
--sand:       #C9BFA0   /* etiqueta no modelo C */
--white:      #FAFAF7   /* preço */
--muted:      #8B8C82   /* meta, rótulos */
--subtle:     #555650   /* code, contagem */
```

### Paleta ESTENDIDA — acentos terrosos (irmãos da oliva)
A cor **codifica a estante**. Aparece **só como acento** (etiqueta, número, ◆, bloco
do modelo B, CTA). Ink + Creme seguem dominando ~90% de cada card. Não é decoração.

| Acento | `base` | `deep` | Estante (mapeamento padrão) |
|---|---|---|---|
| **Oliva** *(núcleo)* | `#7A9E3F` | `#4F6B26` | Jovens |
| **Argila** | `#B07355` | `#7C4B33` | Adolescentes |
| **Ocre** | `#C0934E` | `#8A6630` | Juniores |
| **Pinho** | `#4F7264` | `#335147` | Igreja toda |
| **Ardósia** | `#5C7488` | `#3C4E5C` | Para liderar (todas as funções — tom frio = "ferramenta") |

> O mapeamento é **configurável** — guarde a cor como propriedade da estante, não
> hardcoded no card. A oliva continua sendo o acento-mestre da marca; os demais
> entram em estantes diferentes, nunca competindo na mesma fileira (respeita a regra
> "oliva ≤ 15% da peça").

### Tipografia
- **Inter** (300–900) — display e corpo. Títulos de card: 800. Pesos finos: evitar.
- **Mono** — `'Fira Code', 'SF Mono', monospace` — etiquetas, meta, code, preço-mono.
- Logo **CE.X**: tudo weight **700**, o `.X` em oliva `#7A9E3F`, **sem itálico**.

### Marcas semióticas permitidas
Apenas `◆ ◇ → →`. **Nada de emojis aleatórios.**

---

## 7. Modelo de dados (data-driven)

A página inteira é gerada por um array de materiais. Adicionar material = adicionar
um objeto; estantes, filtros e auto-Netflix se ajustam sozinhos.

```js
{
  id: "firmes",
  familia: "ministrar",          // "ministrar" | "liderar"
  estante: "adolescentes",       // chave da estante (público ou função)
  accent: "clay",                // herdado da estante por padrão; aqui só se quiser sobrepor
  colecoes: [],                  // ex.: ["retiro"] — para a vitrine Eventos
  model: "A",                    // "A" | "B" | "C" | "D" (miolo do card)
  etiqueta: "Adolescentes",
  titulo: "Firmes",
  code: "S-12",                  // usado nos modelos A/B (canto)
  big: "06", bigLabel: "encontros", // usados no modelo C
  promessa: "Ancora adolescentes na fé em 6 encontros.",
  capa: "img/firmes.jpg",        // modelo D
  meta: { mensagens: 6, paginas: 40, formatos: ["PDF","Editável","Slides"] },
  preco: "R$ 47",
  hotmartUrl: "https://pay.hotmart.com/...",
  // página de detalhe:
  praQuem: "...",
  conteudo: ["Mensagem 1 — ...", "..."],
  comoUsar: "...",
  amostra: ["img/firmes-p1.jpg", "..."],
  faq: [{ q: "Dá pra editar?", a: "Sim, ..." }]
}
```

**Estantes** devem ser entidades próprias (chave, nome, família, **accent**, ordem),
para que: (a) o card herde a cor da estante; (b) seja simples, no futuro, adicionar um
CTA de **assinatura por estante** no cabeçalho ("Assine Adolescentes…"). Não
implementar assinatura agora.

**Para a demo:** popule ~15 materiais em *Para ministrar* e ~15 em *Para liderar*,
distribuídos pelas estantes, com **uma estante contendo 7+ itens** pra demonstrar o
carrossel auto-Netflix.

---

## 8. Página do material (onde a venda acontece)

Clicar no card abre a página do material (rota na SPA ou página por material).
Ordem que converte:

1. **Topo** — arte grande + etiqueta + título + promessa (1 frase forte)
2. **Pra quem é** — nomeia a dor ("se você lidera adolescentes e sente que…")
3. **O que vem dentro** — lista de mensagens/encontros · nº de páginas · formatos
4. **Amostra/preview** — algumas páginas/trecho (tira o medo de comprar)
5. **Como usar** — entrega + personalização (white-label CE.X)
6. **Preço + botão [ COMPRAR ]** → abre `hotmartUrl` (`target="_blank"`)
7. **Relacionados** — outros materiais da mesma estante (cross-sell)
8. **FAQ curto** — formato? edita? como recebo?

---

## 9. Não fazer

- Não criar múltiplas páginas/abas por categoria — é UMA página com filtro.
- Não esconder produto atrás de scroll lateral abaixo do limite.
- Não inventar cores fora dos tokens (base + 5 acentos). Não trocar a fonte Inter.
- Não duplicar produtos entre famílias — produto tem uma casa só; coleção aponta.
- Mais de 1 modelo B (cor cheia) por estante, ou 2 modelos iguais em fila: evitar.
- Emojis aleatórios: só `◆ ◇ →`.

---

## 10. Arquivos de referência (nesta pasta)

| Arquivo | O que é |
|---|---|
| `referencia/Sistema de Banners.html` | Prancha navegável: paleta estendida, os 4 modelos, ritmo em estante, mobile. **Abra no navegador.** |
| `referencia/cards.jsx` | Implementação de referência dos modelos A/B/C/D + tokens + acentos. |
| `referencia/design-canvas.jsx` | Só o shell da prancha (não é parte do produto). |

> O brand book completo (`CEX_BrandBook_v3.html`) está na **raiz do projeto**, não
> nesta pasta — consulte-o para grids de feed/stories, tom de voz e uso da marca.
