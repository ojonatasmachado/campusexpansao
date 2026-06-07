# CLAUDE.md — Projeto CE.X · Campus Expansão

Este arquivo descreve o projeto completo da identidade visual e produção de conteúdo da CE.X. Use estas instruções persistentes em todo chat deste projeto.

---

## 1. Identidade da marca

**Nome:** CE.X · Campus Expansão
**Posicionamento:** Estrutura ministerial para líderes de igreja locais.
**Tese central:** *Nós preparamos. Deus multiplica.*
**Tom de voz:** Direto, prático, com peso bíblico. Sem jargão corporativo. Sem pieguice religiosa.

### Sistema visual (definido em `CEX_BrandBook_v3.html`)

- **Cor primária:** Oliva `#7A9E3F` · Cream/papel `#EDE6D3`
- **Fundo:** Ink `#0E110D` (preto-verde profundo)
- **Tipografia:** Inter (display + body) + SF Mono (metadados)
- **Logo:** `CE.X` — "CE" peso 700, ponto e "X" em oliva (sem itálico)

---

## 2. Estrutura de entregas do projeto

| Arquivo | Função |
|---|---|
| `CEX_BrandBook_v3.html` | Brand book completo · referência da identidade |
| `motion_kit.html` | Galeria visual dos componentes animados |
| `reel_composer.html` | Compositor browser-based (alternativo, sem terminal) |
| `composition_template.html` | **Template HyperFrames** — base para cada reel |
| `setup_hyperframes.html` | Guia de instalação |
| `playbook_autoridade.html` | Estratégia de conteúdo Instagram |
| `CEX Brand Book v3.2 — Standalone.html` | Brand book offline (envio para terceiros) |

---

## 3. Pipeline de produção de reels (PRINCIPAL FLUXO)

O usuário grava reels no celular, manda pra mim com a transcrição, eu gero uma **composition HyperFrames** que ele renderiza com `npx hyperframes render` para MP4 pronto pra postar.

### Quando o usuário enviar um vídeo + script

**Comportamento esperado:**

1. **Identifico os picos da fala** — onde entra cada overlay
2. **Gero um `index.html`** copiando o `composition_template.html` e:
   - Ajustando `data-composition-id`
   - Definindo duração total
   - Substituindo cada `<div class="clip">` pelos cues reais (textos, timings, tipos)
   - Atualizando o `<script>` GSAP timeline com os novos `data-start/duration`
3. **Devolvo o HTML completo** num único bloco de código, pronto pra copiar/colar dentro da pasta do reel

### Componentes disponíveis (cues)

Use estes tipos de overlay, todos já definidos no template:

| Cue | Quando usar | Zona |
|---|---|---|
| **TitleCard** (`#cue-title`) | Abertura · gancho | Topo |
| **LowerThird** (`#cue-lt`) | Tópico/tese atual | Base-meio |
| **BigNumber** (`#cue-bignum`) | Estatística, % | Topo-direita |
| **Lista** (`#cue-list`) | Itens numerados | Direita |
| **Versículo** (`#cue-verse`) | Passagem bíblica | Base |
| **Highlight** (`#cue-hl`) | Palavra-chave da fala | Base-centro |
| **PullQuote** (`#cue-pq`) | Citação tela cheia (cobre vídeo) | Tela cheia |
| **EndCard** (`#cue-end`) | Encerramento + CTA | Tela cheia |

### Face Safe Zone

O centro vertical do reel (entre y=600 e y=1500 de 1920) é reservado pro rosto do usuário. **Nunca colocar overlays sobre essa área**, exceto PullQuote e EndCard (que são cortes intencionais cobrindo o vídeo).

### Sintaxe de destaque no texto

Em qualquer campo de texto, use `<em>palavra</em>` para destacar em oliva. Use `<br>` para quebra de linha. Exemplo:
```html
<div class="ovl-title-h">Tem problema <em>de estrutura</em>.</div>
```

---

## 4. Estratégia de conteúdo (resumo do `playbook_autoridade.html`)

### 4 pilares (proporção 3:3:3:1 a cada 10 posts)

1. **Diagnóstico** — aponta problema que o líder vive mas não nomeia
2. **Princípio** — verdade bíblica aplicada à estrutura ministerial
3. **Aplicação** — passos práticos, ferramentas, checklists
4. **Devocional** — versículo + reflexão pessoal

### Ritmo semanal alvo

- Ter 20h · Reel **Diagnóstico**
- Qua 13h · Carrossel **Aplicação**
- Qui 20h · Reel **Princípio**
- Sex 7h · Post **Devocional**
- Dom 18h · Reel **Aplicação**

### Estrutura de reel (45-60s)

```
0:00–0:03  Gancho        → afirmação chocante / pergunta
0:03–0:08  Tese          → afirmação contraintuitiva  · LowerThird
0:08–0:30  Sintomas      → 3-5 itens                  · Lista
0:30–0:40  Diagnóstico   → causa-raiz
0:40–0:55  Aplicação     → 1 ação prática             · Highlight
0:55–1:00  CTA           → salva/marca/comenta        · EndCard
```

---

## 5. Posts estáticos (carrosséis, devocionais)

Para posts estáticos, use os layouts documentados no `CEX_BrandBook_v3.html` (Seções 9-11):

- **Feed Square:** 1080×1080 com 80px de margem segura
- **Feed Portrait:** 1080×1350 com 96px lateral / 120px topo
- **Carrossel:** 5 slides 1:1, sequência narrativa: Capa → Setup → Argumento → Aplicação → CTA
- **Stories:** 1080×1920 com 80px lateral, evitar topo 250px e base 310px (UI Instagram)

Gere posts estáticos como HTML standalone que o usuário pode imprimir em PNG via captura de tela.

---

## 6. Modo de resposta esperado

Quando o usuário falar de **um novo reel**:
- Peça transcrição + duração + indicação de picos (timestamps + tipo de cue)
- Gere o HTML completo da composition HyperFrames pronta pra colar
- Sugira **2-3 variações de cue** caso ele queira testar

Quando o usuário falar de **um carrossel ou post estático**:
- Gere um HTML standalone seguindo o brand book
- 1080×1080 (carrossel) ou 1080×1350 (feed portrait)

Quando o usuário falar de **bio/legendas/copy**:
- Use o tom de voz do glossário (Seção 13 do brand book)
- Aplica os 4 pilares de conteúdo do playbook
- Hashtags: 15 por post, mistura 5 amplas + 5 nicho + 5 específicas

---

## 7. Regras inegociáveis

1. Verde oliva (#7A9E3F) nunca passa de 15% da peça
2. Logo CE.X sempre com "CE" 700 + "X" 700 (sem itálico, sem peso fino)
3. Texto sobre oliva é sempre tinta escura
4. Não usar Inter em outras versões nem substituir por similar
5. Não inventar cor fora da paleta
6. Não usar emojis aleatórios — só ◆ ◇ → → como marcas semióticas
7. Para reels, sempre respeitar Face Safe Zone (centro vertical livre)
