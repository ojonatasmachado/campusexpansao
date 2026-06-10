# Ajustes CE.X — Jornada do usuário, consistência entre páginas e fim dos travessões

> **Para o Claude Code:** o site da CE.X já existe (páginas Home, Sobre, Materiais,
> Cursos & Mentorias). NÃO recomeçar do zero. Esta é uma rodada de **ajuste e
> unificação**. Preserve o que já funciona (sobretudo a página Materiais e a lógica
> de catálogo/filtros/auto-Netflix).
>
> **Identidade, tokens de cor e invariantes: ver `AGENTS.md` (raiz).** Este arquivo só
> traz as tarefas de unificação (header/footer, Home narrativa, cross-linking, fim dos
> travessões). Não redefine paleta.

---

## Diagnóstico (o que está errado hoje)

1. **Dialetos visuais diferentes por página.** A página *Materiais* usa `◆` como marca
   de seção; *Home, Sobre e Cursos* usam `—` (travessão) como marca de seção. Isso, junto
   com header/footer divergentes, faz as páginas parecerem sites diferentes.
2. **Header e footer inconsistentes.** A Home tem footer completo (3 colunas) e nav
   completa; as outras páginas têm footer mínimo (só © + redes) e header reduzido.
3. **Páginas não se cruzam.** Cada página termina nela mesma. Nenhuma encaminha o
   visitante para o próximo passo (Home → Materiais → Cursos não se puxam entre si).
4. **A Home é só um banner**, quando deveria ser a página-narrativa que conta a história
   e distribui o tráfego (a maior parte vem do Instagram, no celular).

---

## TAREFA 1 — Eliminar TODOS os travessões (`—`) do site

Regra inegociável: o caractere travessão/em dash `—` (e en dash `–`) **não pode existir
em nenhum lugar visível do site**. Há dois usos a corrigir:

**1a. Travessão como marca de seção → trocar por `◆`**
Toda "sobrancelha" de seção que hoje começa com `—` passa a começar com `◆` (a marca
semiótica oficial da CE.X), no mesmo estilo das marcas da página Materiais (mono,
caixa-alta, espaçada, cor de acento). Exemplos a corrigir:

| Antes | Depois |
|---|---|
| `— RECURSOS GRATUITOS` | `◆ RECURSOS GRATUITOS` |
| `— DÚVIDAS FREQUENTES` | `◆ DÚVIDAS FREQUENTES` |
| `— COMECE HOJE` | `◆ COMECE HOJE` |
| `— QUEM SOMOS` | `◆ QUEM SOMOS` |
| `— A EQUAÇÃO DA MARCA` | `◆ A EQUAÇÃO DA MARCA` |
| `— FAÇA PARTE` | `◆ FAÇA PARTE` |
| `— FORMAÇÃO AO VIVO` | `◆ FORMAÇÃO AO VIVO` |
| `— PRÓXIMA TURMA` | `◆ PRÓXIMA TURMA` |

**1b. Travessão no meio de frases → reescrever (sem travessão)**
Reescreva qualquer frase que use `—` como pausa. Use ponto, vírgula ou dois-pontos, ou
divida em duas frases. Exemplos:

| Antes | Depois |
|---|---|
| `Não substituímos o agir de Deus — preparamos o que cabe a nós.` | `Não substituímos o agir de Deus. Preparamos o que cabe a nós.` |
| `...e virou Campus Expansão — um sistema replicável de preparo ministerial.` | `...e virou Campus Expansão: um sistema replicável de preparo ministerial.` |
| `A CE.X existe para preparar trabalhadores — porque a colheita é grande, e o preparo não pode ser negligente.` | `A CE.X existe para preparar trabalhadores, porque a colheita é grande e o preparo não pode ser negligente.` |
| `Cinco mensagens sobre chamado, identidade e discernimento — gratuitas.` | `Cinco mensagens gratuitas sobre chamado, identidade e discernimento.` |

> Faça uma varredura final: busque o caractere `—` (e `–`) em TODO o código/conteúdo e
> garanta zero ocorrências no que é renderizado. **NÃO** remover o `·` (ponto do meio,
> ex. "PDF · 64 páginas") nem as setas `→` — esses ficam.

---

## TAREFA 2 — Unificar header e footer em TODAS as páginas

Header e footer devem ser **componentes únicos**, idênticos nas 4 páginas (Home,
Materiais, Cursos, e na seção/página Sobre).

**Header (sticky):**
```
CE.X        Início · Materiais · Cursos & Mentorias · Sobre        [ Comece agora → ]
```
- Logo CE.X à esquerda (CE.X weight 700, `.X` em oliva, sem itálico).
- Nav central/centro-direita com os 4 itens, com **estado ativo** destacando a página atual.
- Botão "Comece agora →" à direita (leva ao manual gratuito ou ao catálogo).
- "Sobre" rola até a seção `#sobre` da Home (ver Tarefa 3).

**Footer (completo, em todas as páginas):** usar o footer de 3 colunas que hoje só
existe na Home:
```
CE.X  "Preparamos trabalhadores para a Grande Comissão."

CONTEÚDO            INSTITUCIONAL        COMECE
Materiais           Sobre                Baixar manual
Cursos              Missão               Próximo retiro
Blog                Contato
Eventos

© 2026 Campus Expansão · campusexpansao.com      INSTAGRAM  YOUTUBE  SPOTIFY
```
Remover os footers mínimos das páginas Sobre/Materiais/Cursos e usar este em todas.

---

## TAREFA 3 — Reconstruir a HOME como página-narrativa (rolagem longa)

A Home deixa de ser um banner curto e passa a contar a história inteira e distribuir o
tráfego. Ordem das seções (de cima pra baixo):

1. **Hero** — "Nós preparamos. Deus multiplica." + subtítulo + dois CTAs
   ("Baixar manual gratuito →" primário, "Conhecer cursos" secundário). Manter.
2. **`#sobre` · O que é a CE.X** *(SOBE PRA CÁ — pedido do cliente)*. Logo abaixo do
   hero, para a pessoa entender a CE.X já na primeira rolagem. Traz o essencial da página
   Sobre: a frase "A maioria das igrejas não tem problema de fé. Tem problema de
   estrutura." + a **equação da marca** (CE = Campus Expansão / · = Multiplicação /
   X = variável divina). Botão "Conhecer a CE.X →" leva à página/seção Sobre completa.
3. **Prova** — a faixa de números (+2mil líderes, 12 cursos, 40+ materiais gratuitos,
   6 anos) + 1 depoimento (Pr. Ricardo Almeida).
4. **Teaser Materiais** — 2 a 3 estantes de amostra (ex. um destaque de cada família:
   Para ministrar + Para liderar) usando **os mesmos componentes de card da página
   Materiais**, encerrando com "Ver catálogo completo →" que leva à página Materiais.
5. **Teaser Cursos & Mentorias** — as 6 trilhas em formato resumido + "Conhecer formação
   ao vivo →" que leva à página Cursos.
6. **FAQ** — as perguntas frequentes (Para quem é a CE.X? / Os materiais são gratuitos? /
   Os cursos têm acompanhamento? / Como funciona o método?).
7. **CTA final** — "Prepare sua equipe." + "Baixar manual →" / "Falar conosco".
8. **Footer completo** (Tarefa 2).

**Sobre — decisão de estrutura:** o conteúdo essencial do Sobre vira a seção `#sobre`
da Home. O item "Sobre" do menu rola até essa seção. Manter a página Sobre dedicada é
opcional (versão aprofundada acessada pelo botão "Conhecer a CE.X →"); se mantida, ela
também deve usar o header/footer unificados e zero travessões.

---

## TAREFA 4 — Fazer as páginas "conversarem" (cross-linking)

Cada página deve encaminhar o visitante para o próximo passo lógico:

- **Home** → puxa para Materiais (teaser) e Cursos (teaser), como na Tarefa 3.
- **Materiais** → ao final do catálogo, antes do footer, uma faixa: "Precisa de formação
  ao vivo, não só de material pronto? **Conheça os cursos →**" (leva a Cursos).
- **Cursos** → na seção da turma/lista de espera, uma faixa: "Quer começar agora, sem
  esperar turma? **Veja os materiais editáveis →**" (leva a Materiais).
- **Sobre** (seção e/ou página) → CTA duplo: "Ver materiais →" e "Conhecer cursos →".

---

## TAREFA 5 — Coerência fina (aplicar em todas as páginas)

- **Marcas de seção:** sempre `◆ TEXTO` (mono, caixa-alta, espaçada, cor de acento).
  Nunca `—`.
- **Cards:** Home e demais teasers usam os MESMOS componentes/medidas de card da página
  Materiais (mesma moldura, rodapé com meta + preço/CTA, modelos A/B/C/D).
- **Botões:** um único conjunto de estilos (primário oliva, secundário contorno) repetido
  em todo o site. Setas sempre `→`.
- **Escala de espaçamento e ritmo de seção** consistentes entre páginas.
- **Mobile-first:** a Home é rolagem longa pensada primeiro para o celular (tráfego vem do
  Instagram). Estantes empilham; nada de scroll lateral acidental.

---

## TAREFA 6 — Cards de CURSO (mesma família, miolo de curso)

Na página Cursos & Mentorias (e no teaser de cursos na Home), os cards usam a **mesma
moldura/família** dos cards de material (mesma proporção 320px, mesmo rodapé, mesma
linguagem) — é o que faz o site conversar. Mas o **conteúdo é de curso**, não de produto
avulso. NÃO usar cor fria/acinzentada (parece desativado).

**Anatomia do card de curso:**
- **IMPORTANTE — o fundo do card NÃO é preenchido de cor.** O miolo (metade de cima) tem
  fundo ESCURO `#0E110D` (Ink) com linhas-guia horizontais sutis
  (`linear-gradient(#25291F 1px, transparent 1px)`, `background-size: 100% 44px`). A cor de
  acento aparece **só em detalhes**, nunca como bloco de fundo. (Erro comum a evitar: pintar
  toda a metade de cima do card com a cor de acento — isso vira um borrão pesado e mata o
  selo AO VIVO. Bloco de cor cheia é exclusividade do "Modelo B" dos materiais, 1 por estante.)
- **Topo do miolo:** marca de nível `◆ FUNDAÇÃO` (mono, caixa-alta, cor de acento) à
  esquerda; **selo sólido `● AO VIVO`** à direita (fundo na cor de acento, texto em tinta
  escura `#0E110D`, mono caixa-alta, cantos 4px). Esse selo é o **ÚNICO** elemento com cor
  sólida no card — é o que sinaliza "ativo" e por isso não pode competir com um fundo colorido.
- **Base do miolo:** título do curso (Inter 800, ~30px, cor cream `#EDE6D3`) + 1 linha de
  descrição (Inter 400, ~14px, cor areia `#C9BFA0`).
- **Rodapé:** fundo grafite `#181B16`, borda-topo `1px #25291F`. Meta
  `● X semanas · Mentoria inclusa` (mono, cor `#8B8C82`, com bolinha na cor de acento) na
  linha de cima; embaixo, `ETAPA 0N` (mono, cor de acento) à esquerda e `Detalhes →`
  (mono caixa-alta, cream) à direita. **Sem preço** (curso é turma/lista, não compra única).

Resumo da regra de cor: **o acento colore os detalhes (etiqueta, selo, bolinha, etapa),
nunca o fundo.** O fundo do card é sempre Ink/grafite escuro, igual aos cards de material.

**Cores quentes e vivas** (nada de cinza/azul apagado). Use os acentos terrosos por nível.

**Agrupar por NÍVEL, não em grade plana de 6.** As 6 trilhas se organizam em 3 níveis,
cada um uma fileira com sua marca `◆` e seu acento (tokens em `AGENTS.md` §2):

| Nível | Acento | Cursos |
|---|---|---|
| **Fundação** | `wheat` | 01 Fundamentos da Estrutura · 04 Gestão de Equipe |
| **Liderança** | `clay` | 02 Formação de Líderes · 06 Liderança e Descanso |
| **Multiplicação** | `olive` | 03 Discipulado Intencional · 05 Plantação de Igrejas |

Isso dá hierarquia e comunica "isto é um caminho/trilha, não um catálogo" — o que separa
curso de material. Referência visual: `referencia/Sistema de Banners.html` (se anexada),
seção "Cursos · mesma família, ritmo de trilha".

---

## TAREFA 7 — Páginas de detalhe (clicar no card abre a tela do item)

Clicar num card abre uma **página de detalhe**, igual em mecânica para material e curso
(mesma família visual). Mas a lógica de conversão é DIFERENTE em cada um.

**7a. Página de detalhe do MATERIAL** (compra única → Hotmart):
1. Topo: arte + etiqueta + título + promessa (1 frase forte)
2. Pra quem é: nomeia a dor do líder
3. O que vem dentro: lista de mensagens/encontros · nº de páginas · formatos
4. Amostra/preview: páginas/trecho (tira o medo de comprar)
5. Como usar: entrega + personalização (white-label CE.X)
6. **Preço + botão `COMPRAR`** → abre `hotmartUrl` (`target="_blank"`)
7. Relacionados: outros materiais da mesma estante
8. FAQ curto

**7b. Página de detalhe do CURSO** (turma / lista de espera / mentoria — NÃO Hotmart):
1. Topo: título + nível + selo `● AO VIVO` + 1 frase de promessa
2. Pra quem é: a dor do líder
3. **A trilha:** onde este curso se encaixa (ex. "Etapa 02 de 06", o que vem antes/depois)
   — só o curso tem isto; ajuda a vender o próximo curso
4. **Ementa por semana:** o que se aprende, semana a semana
5. **Como é:** formato dos encontros ao vivo + mentoria + carga (X semanas)
6. **Mentor:** quem conduz (autoridade)
7. Depoimento de quem já fez
8. **Turma + CTA:** datas da próxima turma · vaga limitada · botão
   `Entrar na lista de espera →` (ou `Garantir vaga →`). **Sem preço/Hotmart aqui.**
9. Relacionados: outros cursos da mesma trilha, ou faixa "Quer começar agora? Veja os
   materiais →"

**Diferença-chave:** material termina em "compra agora"; curso termina em "próxima turma +
lista de espera". As duas páginas compartilham header, footer, tipografia e estilo de seção
(`◆`, zero travessões).

---

## NÃO FAZER

- Não quebrar a página Materiais (catálogo, filtros de 2 andares, auto-Netflix). Só
  alinhar header/footer/travessões a ela.
- Demais invariantes (paleta, fonte, marcas, zero travessão): ver `AGENTS.md` §8 e §10.

---

## Checklist de aceite

- [ ] Zero ocorrências de `—` e `–` no site renderizado.
- [ ] Todas as marcas de seção usam `◆`.
- [ ] Header idêntico e sticky nas 4 páginas, com estado ativo.
- [ ] Footer completo (3 colunas) idêntico nas 4 páginas.
- [ ] Home é rolagem longa com a seção "O que é a CE.X" logo abaixo do hero.
- [ ] Home puxa para Materiais e Cursos; Materiais puxa para Cursos; Cursos puxa para Materiais.
- [ ] Cards da Home iguais aos da página Materiais.
- [ ] Cards de curso usam a mesma família, com selo sólido `● AO VIVO`, agrupados por nível, cores quentes (sem cinza apagado).
- [ ] Clicar num card de material abre a página de detalhe com `COMPRAR → Hotmart`.
- [ ] Clicar num card de curso abre a página de detalhe com ementa por semana + `Entrar na lista de espera →` (sem Hotmart).
- [ ] Tudo responsivo e impecável no mobile.
