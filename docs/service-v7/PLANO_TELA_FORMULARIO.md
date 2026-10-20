# Plano · Tela de formulário do Service

Data: 2026-10-19. Status: proposta, nada implementado.
Motivo: no painel do Service os botões estouram e saem da tela, e criar ou editar
alguma coisa parece apertado. No Ponte o mesmo fluxo é fluido. Este plano copia
**o padrão de funcionamento**, não o visual: o Service continua com a casca, os
tokens e o tema da igreja.

---

## 1. Diagnóstico

O que encontrei no código (`app/service/`, `evolucoes/service_app/`):

| Causa | Onde | Efeito |
|---|---|---|
| `.btn` com `white-space:nowrap` e sem limite de largura | `service.css:134` | Rótulo longo empurra o botão para fora da tela |
| `.modal-foot` em linha, sem quebrar | `service.css:376` | Três botões no rodapé da janela saem pela direita no celular |
| `.ph-actions` em linha, com remendos depois | `service.css:131`, `service-v4.css:129`, `service-v6.css:51` | Ações do cabeçalho brigam com o título |
| `.modal-body` limitado a `max-height:50vh` | `service.css:375` | Formulário longo vira uma caixinha com rolagem dentro de rolagem |
| ~400 `style={{...}}` no código, 61 `display:flex` em linha e só 15 com `flexWrap` | `ServiceExactApp.tsx` | Cada tela resolve layout do seu jeito; o CSS não consegue corrigir |
| 6 arquivos de CSS, um remendando o outro | `service.css` até `service-v6.css` | Regra de botão espalhada; difícil saber qual vale |
| Tudo é janela ou gaveta: ~45 formulários, nenhum em tela própria | `*Modal`, `*Drawer`, `ServiceModal` | Formulário de 15 campos espremido numa janela de 460px |
| O painel não tem endereço por tela (rota em `useState`) | `ServiceExactApp.tsx:1040` | O "voltar" do navegador ou do celular sai do painel em vez de fechar o formulário |
| Escala de texto da pessoa (lei 8) aumenta tudo | `text-scale.ts` | Com texto grande, os estouros acima pioram |

O app do membro (`MobileApp.tsx`) já abre subtelas cheias (`openSub`), então o
problema é principalmente no **painel**.

## 2. O padrão que vamos adotar

1. **Criar ou editar algo com mais de 4 campos abre uma tela própria**, não uma janela.
2. **A tela tem uma coluna só**, centralizada, com largura de leitura.
3. **Topo fixo**: voltar, título e no máximo duas ações (secundária e principal).
4. **Campos agrupados em seções** com título.
5. **Escolhas curtas viram botões de opção que quebram linha.** Escolhas longas viram lista.
6. **O botão principal só ativa quando dá para salvar**, e diz o que falta.
7. **O voltar do navegador ou do celular fecha o formulário**, e pergunta se há
   alteração não salva.

## 3. Quando usar cada coisa

| Situação | Usar | Exemplos |
|---|---|---|
| Criar ou editar um cadastro (mais de 4 campos ou mais de uma seção) | **Tela de formulário** | Nova pessoa, nova criança, novo grupo, editar time, nova reunião, nova pesquisa, novo curso, nova publicação no mural |
| Confirmar, escolher uma coisa, 1 a 3 campos | **Janela** | Excluir, adicionar candidato, delegar escala, salvar modelo, nova conversa, matricular |
| Ver um item sem perder a lista | **Gaveta** (só leitura e ações rápidas) | Visitante, decisão, batismo, evento, card. O botão "Editar" dentro dela abre a tela de formulário |
| Mostrar um QR ou uma explicação | **Janela** | Check-in por QR, "Sobre estes números" |

## 4. Anatomia da tela de formulário

### Desktop e tablet (acima de 860px)

```
┌──────────────────────────────────────────────────────────────┐
│ ←  SOBRETÍTULO                                                │  topo fixo
│    Título do formulário            [Secundária] [Principal]   │
├──────────────────────────────────────────────────────────────┤
│        ┌───────────── coluna de até 720px ─────────────┐     │
│        │ Seção: Dados básicos                           │     │
│        │ [ Campo largura toda                        ]  │     │
│        │ [ Campo curto ]   [ Campo curto ]              │     │
│        │ ( opção ) ( opção ) ( opção )                  │     │
│        │ ( opção que quebrou para a linha de baixo )    │     │
│        ├────────────────────────────────────────────────┤     │
│        │ Seção: Endereço                                │     │
│        │ ...                                            │     │
│        └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### Celular (até 860px)

```
┌──────────────────────────┐
│ ←  Título                │  topo fixo + área segura de cima
├──────────────────────────┤
│ Seção                    │
│ [ Campo, 16px          ] │
│ [ Campo                ] │  campos sempre em uma coluna
│ ( opção ) ( opção )      │
│ ( opção )                │
│                          │
├──────────────────────────┤
│ [      Principal       ] │  rodapé fixo + área segura de baixo
│        Secundária        │  (como link de texto, embaixo)
└──────────────────────────┘
```

### Regras

- **Topo**: voltar (alvo de 32px no painel), sobretítulo, título (com quebra de linha
  se for longo, nunca cortado). Ações à direita, no máximo duas. Se não couberem,
  descem para baixo do título; nunca saem da tela.
- **Corpo**: `max-width:720px`, centralizado, margem lateral de 16px no celular.
- **Seções**: título curto + campos. Seção opcional pode vir recolhida ("Mais detalhes").
- **Campos**: rótulo em cima, ajuda embaixo, erro embaixo em vermelho. Campos curtos
  (`half`) lado a lado só acima de 640px. 16px em tela de toque.
- **Opções**: até 6 opções viram botões que quebram linha (`flex-wrap`). Mais que 6, lista.
- **Botão principal**: um por tela, com a cor da igreja (lei 8). Desabilitado quando
  falta algo, com a frase "Falta: nome e telefone" ao lado ou embaixo (lei 6, nenhum
  beco sem saída).
- **Salvar**: mostra "Salvando…", trava o botão, e ao terminar volta para a tela de
  origem com `avisar()`. Erro do servidor aparece no topo do formulário, sem perder
  o que foi digitado.
- **Sair sem salvar**: se algo mudou, pergunta antes de descartar.

## 5. Componentes (fonte única)

Pasta nova: `app/service/painel/form/`. Ninguém mais monta formulário na mão.

| Componente | Faz |
|---|---|
| `FormScreen` | Topo fixo, corpo de 720px, rodapé fixo no celular, voltar, aviso de alteração não salva |
| `FormSection` | Bloco com título, opcionalmente recolhível |
| `Field` | Renderiza um `FieldDef` (texto, área, lista, data, hora, chave liga-desliga, várias escolhas, CEP). O tipo `FieldDef` sai de `ServiceExactApp.tsx:713` e passa a morar aqui |
| `ChoiceChips` | Opções curtas que quebram linha |
| `FormActions` | As duas ações, com a regra de onde elas ficam em cada largura |
| `useFormState` | Valores, o que mudou, o que falta, salvando e erro |

Reaproveita o que já existe: `CepInput`, `PhotoPicker`, `ImageUpload`, `PasswordInput`,
`avisar()`, `plural()`, `useTermos()`.

**CSS**: as regras de formulário vão para **um** arquivo novo
`evolucoes/service_app/service-form.css`, só com variáveis (sem hex). As correções de
`.btn`, `.modal-foot` e `.ph-actions` entram no **`service.css`**, onde essas classes
nascem, e os remendos das versões v4 e v6 saem. A consolidação dos 6 arquivos fica
para outro trabalho.

## 6. Navegação

Hoje a tela do painel vive em `useState`, sem endereço. Para o "voltar" funcionar:

- **Fase 1 (este plano)**: abrir um formulário grava uma entrada no histórico
  (`history.pushState` com `?form=<id>`). O voltar do navegador ou o gesto do celular
  fecha o formulário. Recarregar a página com `?form=` volta para a lista (não reabre o
  formulário).
- **Depois**: endereço real por tela do painel (`/service/painel/pessoas/nova`). Fica
  fora deste plano porque mexe na casca toda.

## 7. Migração em ondas

### Onda 0: correção do CSS (sem mudar fluxo)

Ajuda tudo de uma vez, inclusive o que fica em janela.

- `.btn`: pode quebrar linha quando não couber (`white-space:normal`, `text-align:center`,
  `max-width:100%`), com altura mínima mantida.
- Todo grupo de botões quebra linha: `.ph-actions`, `.modal-foot`, `.drawer` (ações).
- `.modal-foot` no celular: botões em coluna, principal em cima.
- `.modal-body`: sem o limite de `50vh`; a janela inteira rola dentro da tela.
- Trocar os `display:flex` em linha dos rodapés e cabeçalhos por classes que quebram.

### Onda 0 revisada (2026-10-19): consistência de botão e excesso de texto

Medição no painel local, 1280px, 23 telas. Com os dados de teste, os botões não saem
da tela em 320, 390, 768 nem 1280. O problema real é outro:

**Botões sem sistema.**
- 15 estilos diferentes de botão no painel. Alturas de 31, 32, 33, 34, 38, 39, 40 e 41px.
- Cantos de 4, 6, 7, 8 e 100px misturados: `.btn` quadrado (4px), `.seg-chip` e o
  botão do usuário em pílula (100px), `.esc-vaga` e `.opt` com 8px, `.esc-preset-save` com 7px.
- `.btn-sm` aparece com fonte de 12px (32px de altura) e com 14px (33px). O mesmo
  "botão pequeno" tem dois tamanhos.
- Escalas mostra 7 estilos de botão na mesma tela; Visitantes e Configurações, 5.
- No cartão do visitante, dois botões empilhados de largura toda ("WhatsApp",
  "Registrar contato") ocupam mais que o próprio nome.

**Texto demais.**
- Todas as 23 telas abrem com um parágrafo explicando a tela, e quase todas ainda
  têm a ajuda "?" ao lado. Escalas: 161 caracteres (3 linhas). Decisões: 128.
  Espaços: 110. Batismos: 107. Só 6 telas ficam abaixo de 60.
- O Mural tem 73 palavras de texto explicativo visível; Escalas, 55; o Início, 41.

**Regras novas para a onda 0** (substituem os itens de botão acima):

1. **Uma família de botão.** Painel: normal de 36px (fonte 14) e pequeno de 32px
   (fonte 13). Nenhum outro tamanho. Chips, segmentos (`.seg`), opções (`.opt`),
   vagas da escala e o botão do usuário usam as mesmas alturas.
2. **Um canto só** para tudo que se toca: botão, chip, segmento, opção, vaga.
   O valor fica numa variável (`--r-ctl`).
3. **Rótulo de até 3 palavras.** Seta `→` só em link, não em botão.
4. **Botões lado a lado têm a mesma altura** e, num cartão, ficam numa linha só
   (ícone + rótulo curto) em vez de empilhados.
5. **Subtítulo da tela vira contagem ou some.** "34 pessoas", "3 visitantes sem
   contato". A explicação vai para a ajuda "?", que já existe. Teto: uma linha.
6. Segue valendo o resto da onda 0: grupos de botões que quebram linha, rodapé da
   janela em coluna no celular, janela sem o limite de 50vh.

**Feito em 2026-10-20** (não commitado). Canto de 8px em `--r-ctl`; `.btn` 36px/14 e
`.btn-sm` 32px/13 (no toque 44 e 36); `.seg` rola por dentro em vez de sair da tela;
rodapé da janela empilha no celular; funil de visitantes em uma coluna até 640px;
ações do cabeçalho em grade de 2 colunas no celular; 17 rótulos encurtados e sem seta;
subtítulos das telas trocados por contagem (Visitantes, Crianças, Times) ou movidos
para o "?". Medição: 15 → 11 estilos de botão, 5 → 1 canto, nenhum botão fora da tela
em 390, 768 e 1280. Comparação em `docs/service-v7/onda0/comparacao.html`.
Ficou de fora: o app do membro ainda tem setas nos botões (`m6-btn`).

### Onda 1: componente + formulário genérico

`ServiceModal` (o formulário montado a partir de `FieldDef`) passa a abrir em
`FormScreen`. Uma troca migra uns 20 formulários de uma vez: decisão, sala, turma Kids,
quadro, card, papel ministerial, etiqueta, grupo, identidade, ciclo anual, capítulo da
história, cadastros simples.

**Feito em 2026-10-20** (não commitado). `app/service/painel/form/FormScreen.tsx` +
`evolucoes/service_app/service-form.css`. O `ServiceModal` abre em tela quando tem mais
de 4 campos (hoje: Nova sala, Novo evento Kids, Novo time, Nova turma de batismo); com
até 4, continua em janela. Lista de até 6 opções vira botões de opção. Navegação: uma
entrada no histórico por abertura, preservando o estado do Next; a marca é única e
sobrevive à montagem dupla do modo de desenvolvimento. Junto: `.input`, `.textarea`,
`.select` e `.sel-trigger` com canto de 8px, e no toque os seletores de data e lista com
16px e 44px, iguais aos campos de texto. Comparação em `docs/service-v7/onda1/comparacao.html`.
Depois da revisão: não fecha enquanto salva; fecha antes do `router.refresh()` (a lista
chega com o dado novo); foco vai para a tela e o resto do app fica `inert`; Escape fecha
só a camada de cima; opções com `aria-pressed`; "algo mudou" comparado campo a campo;
`key` no `ServiceModal` para um formulário não herdar o estado do anterior.
Ainda não feito desta onda: mover `FieldDef`/`FField` para `painel/form/` (fica para a
onda 2, junto com os formulários feitos à mão).
Limite conhecido: janela ou gaveta aberta de dentro da tela ficaria por baixo dela
(hoje nenhum campo abre uma).

### Onda 2: formulários grandes feitos à mão

**Andamento (2026-10-20, não commitado):** `FormSection` no componente; `FieldDef` com
`secao`; "Novo membro" com seções; `ChildFormModal` em tela com 5 seções. A edição de
pessoa (`MemberEditModal`) tem 4 campos e fica em janela pela regra. Depois da revisão:
o botão fica travado até a tela fechar (sem salvar duas vezes); erro ao gravar responsáveis
aparece e não fecha a tela; o erro rola para a vista; rótulos ligados aos campos; o
principal é o primeiro responsável preenchido; caixas de marcar com 44px no toque.
Próximos: visitante, time, reunião, mural.

Um por vez, nesta ordem (os mais usados primeiro):

1. `MemberEditModal` e cadastro de pessoa
2. `ChildFormModal`
3. `VisitanteDrawer` → gaveta continua para ver; "Editar" abre tela
4. `MinisterioEditModal`
5. `ReuniaoForm`
6. `ComposerModal` (mural)
7. `CongregacaoEditModal`, `ValoresEditModal`
8. `PesquisaEditor`, `CursoEditor` (já são quase telas; só entram na casca nova)
9. Edição dentro de `EventDrawer`, `EnsaioDrawer`, `BatismoDrawer`, `DecisaoDrawer`

### Onda 3: o que fica como janela

Só recebe a correção da onda 0: excluir, `AddCandidatoModal`, `AddToMinistryModal`,
`DelegarModal`, `PresetSaveModal`, `NovaConversaModal`, `MatricularModal`,
`RosterActionModal`, QR de check-in, "Sobre estes números".

### App do membro

Já usa telas cheias. Recebe a onda 0 e o rodapé fixo com área segura nas subtelas
que têm botão de salvar (Meus dados, Minha família, pedido de oração, inscrição em
batismo).

## 8. Como vamos verificar

A lei 12 cita `tools/captura-service/`, mas essa pasta **não existe** no repositório.
Até ela existir, a verificação é manual no navegador do app, com o Supabase local:

| Checagem | Larguras | Condição |
|---|---|---|
| Sem rolagem lateral | 390, 768, 1280 | Nenhuma |
| Nenhum botão cortado ou fora da tela | 390, 768, 1280 | Texto normal e texto no maior tamanho |
| Nomes longos (pessoa, time, igreja) | 390 | Título quebra, não empurra ações |
| Alvos de toque | 390 | 44px no app, 32px no painel |
| Campos | 390 (iPhone) | 16px, sem zoom ao tocar |
| Voltar do navegador | todas | Fecha o formulário, pergunta se há alteração |
| Tema | claro e escuro, cor da igreja clara e escura | Contraste do botão principal |

Antes e depois de cada onda: captura de tela das mesmas telas nas três larguras.

## 9. Fora deste plano

- Endereço real por tela do painel.
- Juntar os 6 arquivos de CSS num só.
- Criar a ferramenta `tools/captura-service/`.
- Mudar o visual (cores, fontes, cantos): continua o do Service.

## 10. Decisões que preciso de você

1. **Gaveta para ver detalhes continua?** Recomendo que sim: abrir o visitante ao lado
   da lista é rápido. Só a edição longa sai dela.
2. **Rodapé fixo no celular com o botão principal**, em vez de deixar o botão só no
   topo? Recomendo que sim: no celular o polegar alcança embaixo.
3. **Começar pela onda 0 sozinha**, publicar e sentir, antes de criar o componente?
   Recomendo que sim: é pequena e já resolve os botões estourando.
