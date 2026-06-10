# Ajustes CE.X — Página CURSOS & MENTORIAS (foco exclusivo)

> **Para o Claude Code:** esta rodada trata SOMENTE da página **Cursos & Mentorias** e das
> **páginas de detalhe de curso**. Não mexer em Home, Materiais nem Sobre. O header já está
> ok (ancorado/sticky) e o menu já inclui "Sua Vocação" (quiz) propositalmente.
>
> **Identidade, tokens e invariantes: ver `AGENTS.md` (raiz).** Este arquivo só traz a
> tarefa Cursos. O spec completo do card de curso (CSS) vive no
> `BRIEFING_ClaudeCode_Cursos_e_Infantil.md`.

---

## TAREFA 1 — Card de curso: fundo ESCURO, cor só nos detalhes

**Problema atual:** a metade de cima do card está preenchida com a cor de acento
(bloco colorido). Isso está errado: vira um borrão pesado e anula o selo AO VIVO.

**Como deve ser:**
- **Fundo do card NÃO é colorido.** O miolo (metade de cima) tem fundo **Ink `#0E110D`**
  com linhas-guia horizontais sutis (`linear-gradient(#25291F 1px, transparent 1px)`,
  `background-size: 100% 44px`). O rodapé tem fundo **grafite `#181B16`**,
  `border-top: 1px solid #25291F`. Igual aos cards de material.
- A cor de acento aparece **só nos detalhes**, nunca como fundo:
  - **Topo esquerda:** marca de nível `◆ FUNDAÇÃO` (mono, caixa-alta, espaçada, cor de acento).
  - **Topo direita:** selo **`● AO VIVO`** — fundo na cor de acento, texto em tinta escura
    `#0E110D`, mono caixa-alta, cantos 4px. **É o ÚNICO elemento com cor sólida no card** —
    é o que sinaliza "ativo". Por isso não pode competir com um fundo colorido.
  - **Título:** Inter 800, ~30px, cor cream `#EDE6D3`.
  - **Descrição:** 1 linha, Inter 400, ~14px, cor areia `#C9BFA0`.
  - **Rodapé, linha de cima:** meta `● X semanas · Mentoria inclusa` (mono, cor `#8B8C82`,
    bolinha na cor de acento).
  - **Rodapé, linha de baixo:** `ETAPA 0N` (mono, cor de acento) à esquerda; `DETALHES →`
    (mono caixa-alta, cream) à direita.
  - **Sem preço** (curso é turma/lista de espera, não compra única).

> Regra de cor: **o acento colore os detalhes (etiqueta, selo, bolinha, etapa), nunca o
> fundo.** Bloco de cor cheia é exclusividade do "Modelo B" dos materiais — não use em curso.

Card: largura ~320px, cantos 10px, borda `1px solid #25291F`, mesma família dos materiais.

---

## TAREFA 2 — Layout: UMA fileira por nível (não empilhar)

A página agrupa os cursos por **nível**, e cada nível é **uma única fileira horizontal**
de cards (não empilhar em coluna). *(O código já está assim — manter.)*

Cabeçalho de cada fileira: `◆ NÍVEL` (cor de acento do nível) + contagem `N cursos` (mono, cinza).

| Nível | Acento | Cursos (uma fileira cada) |
|---|---|---|
| **Fundação** | `wheat` | 01 Fundamentos da Estrutura · 04 Gestão de Equipe |
| **Liderança** | `clay` | 02 Formação de Líderes · 06 Liderança e Descanso |
| **Multiplicação** | `olive` | 03 Discipulado Intencional · 05 Plantação de Igrejas |

- **Cores quentes e vivas** por nível (nada de cinza/azul apagado — parece desativado).
- Se um nível passar de ~6 cursos no futuro, a fileira vira **carrossel horizontal**
  (setas no desktop, arraste no touch, "Ver todos →"). Abaixo disso, fileira fixa.
- **Mobile:** a fileira pode rolar horizontalmente ou empilhar em 1 coluna — nunca cortar
  conteúdo escondido sem indicação.

---

## TAREFA 3 — Roteamento: card abre o DETALHE DO CURSO, não a trilha

**Problema atual:** clicar no card (ou em "Detalhes →") abre uma página da *trilha/nível*.
Isso está errado.

**Correção:**
- Clicar no card de curso / em "Detalhes →" abre a **página de detalhe DAQUELE curso
  específico** (ver Tarefa 4), espelhando como o card de material abre `/materiais/:id`.
  Ex.: `/cursos/formacao-de-lideres`.
- **A trilha NÃO é uma página de destino.** Ela é apenas: (1) o agrupamento visual dos
  cards nesta página (as fileiras por nível), e (2) uma **seção interna** da página de
  detalhe do curso ("Etapa 02 de 06").
- Remova/desative qualquer navegação que leve a uma página de trilha isolada. Aponte o
  clique de cada card para a rota do curso individual.

---

## TAREFA 4 — Página de detalhe do CURSO (turma / lista de espera — NÃO Hotmart)

Mesma família visual do site (header ancorado, footer, `◆`, zero travessões), mas com
lógica de **formação ao vivo**, não de compra única. Estrutura, de cima pra baixo:

1. **Topo:** título do curso + marca de nível + selo `● AO VIVO` + 1 frase de promessa.
2. **Pra quem é:** nomeia a dor do líder.
3. **A trilha:** onde este curso se encaixa ("Etapa 02 de 06"), o que vem antes e depois.
   Mostra o caminho e ajuda a vender o próximo curso. (Esta é a única "trilha" visível.)
4. **Ementa por semana:** o que se aprende, semana a semana.
5. **Como é:** formato dos encontros ao vivo + mentoria + carga (X semanas).
6. **Mentor:** quem conduz (autoridade).
7. **Depoimento** de quem já fez o curso.
8. **Turma + CTA:** datas da próxima turma · vaga limitada · botão
   **`Entrar na lista de espera →`** (ou `Garantir vaga →`). **Sem preço / sem Hotmart.**
9. **Relacionados:** outros cursos da mesma trilha; ou faixa "Quer começar agora? Veja os
   materiais →".

---

## NÃO FAZER

- Não preencher o fundo do card com a cor de acento (só detalhes recebem cor).
- Não rotear o clique do card para uma página de trilha — vai para o detalhe do curso.
- Não empilhar os cards: uma fileira horizontal por nível.
- Não colocar preço/Hotmart em curso (é turma/lista de espera).
- Demais invariantes (paleta, marcas, travessão): ver `AGENTS.md` §8 e §10.

---

## Checklist de aceite (Cursos & Mentorias)

- [ ] Card de curso com fundo Ink escuro + linhas-guia; cor só na etiqueta, selo AO VIVO, bolinha e ETAPA.
- [ ] Selo `● AO VIVO` é o único bloco de cor sólida do card.
- [ ] Sem preço no card de curso.
- [ ] Uma fileira horizontal por nível (Fundação/Liderança/Multiplicação), cores quentes.
- [ ] Clicar no card abre a página de detalhe DAQUELE curso (não a trilha).
- [ ] Página de detalhe do curso tem: trilha (Etapa N de 6), ementa por semana, mentor, turma e "Entrar na lista de espera →".
- [ ] Zero travessões `—`. Marcas de seção em `◆`.
- [ ] Responsivo no mobile.
