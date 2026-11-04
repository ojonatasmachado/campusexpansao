# Proposta de desenho · E2 Panorama do culto

Data: 2026-11-03
Status: aguardando OK para implementação (PARTE 2)

---

## 1. Pesquisa de mercado (lei 16)

### Pesquisa conferida em páginas reais (2026-11-03, feita no app)

- **Planning Center Services:** montar e acompanhar são lugares separados. A montagem usa "Needed Positions" por plano: cada função tem um número de pessoas necessárias, e times e funções com necessidade zero ficam escondidos por padrão (só aparecem com "Show hidden teams and positions"). O acompanhamento do culto é o **Services LIVE**, que percorre a ordem do culto em tempo real e mostra o item atual e os próximos, para os voluntários e em outras telas da igreja. Fontes: help.planningcenter.com ("What is Services LIVE"), guia de treinamento PCO Services (files.snappages.site).
- **Elvanto:** o sistema sugere voluntários disponíveis para as funções sem ninguém, e o administrador preenche os buracos deixados por quem não pode. No app, um toque no culto mostra numa tela só músicas, voluntários, arquivos e o roteiro. Fontes: help.elvanto.com (artigos 7702231749527, 7604502154903, 7659760014615).

O que isso confirma para o Panorama: (1) times completos não precisam aparecer um por um, como o "necessidade zero escondida" do PCO; (2) roteiro e escalados juntos numa tela só, como o Elvanto; (3) preencher a vaga é tarefa da montagem, então o toque no time incompleto leva para Posições. Ideia que fica fora da E2: destacar "agora" e "próximo" no cronograma durante o culto, como o Services LIVE (vira história nova se fizer sentido).

### Fonte das conclusões (versão anterior, da memória do modelo)

As informações abaixo vieram do **conhecimento prévio do modelo** sobre Planning Center Services, Church Community Builder e Elvanto/Tithe.ly People, acumulado até junho de 2026. O subagente de pesquisa web foi interrompido por falha na busca; nenhuma página foi lida nesta sessão. Se alguma conclusão estiver desatualizada ou imprecisa, o usuário pode corrigir antes do OK. Nada disto vai para o git.

### Planning Center Services

Tem uma tela chamada "Plan View" ou "Service View" que mostra o culto do dia numa visão só de leitura. O que aparece: cronograma em ordem (música, leitura, oração, cada um com horário e responsável), times com vagas preenchidas/total, e quem está escalado em cada função. Os problemas (vagas abertas) aparecem no topo como aviso destacado, não misturados com o que está completo. A hierarquia é: primeiro o que falta resolver, depois o roteiro em ordem cronológica, depois os detalhes de cada time. Quem monta a escala usa uma tela cheia de edição; quem acompanha o culto (pastor, líder de louvor) abre esta visão resumida sem poder editar. A navegação do panorama para o detalhe é por clique na linha do time, que expande ou leva à lista de pessoas escaladas.

### Church Community Builder

Foca mais em acompanhamento de presença e check-in no dia do culto, menos em roteiro. Tem um painel com números de comparecimento em tempo real, times com contagem de voluntários presentes, mas não mostra cronograma. A separação entre quem monta e quem acompanha é menos clara; a mesma tela serve para os dois papéis com permissões diferentes.

### Elvanto / Tithe.ly People

Mostra a agenda de cultos com times escalados, mas a visão do dia é mais simples: lista de cultos, clique num culto abre os times e suas vagas. Não há uma tela dedicada de "panorama ao vivo"; a informação está espalhada entre agenda e escalas.

### Padrão comum extraído

As ferramentas que fazem bem esta função separam a tela de montagem (edição pesada, múltiplas ações) da tela de acompanhamento (leitura, foco no que pede atenção agora, problemas primeiro). A navegação do panorama para o detalhe é sempre por clique, nunca por drawer ou modal que cobre tudo.

---

## 2. Primeira dobra linha a linha (painel 1366×860)

O Panorama é uma **aba nova dentro do EventDrawer**, o drawer que já abre ao clicar num culto na tela de Agenda (`app/service/painel/telas/Agenda.tsx`). Não é um item novo no menu lateral.

### Exemplo de texto real (culto fictício)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ✕                                                                   │
│ DOMINGO · 03/11/2026                                                │
│ Culto da Manhã                                                      │
│ 09h00 · Templo Sede                                                 │
│                                                                     │
│ [Panorama]  Cronograma  Posições  Para o membro                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ COBERTURA POR TIME                                                  │
│ ● Louvor          3/5   ← falta 2 (clicável, rola até o time)      │
│ ● Recepção        2/4   ← falta 2                                  │
│   Kids            4/4   ✓ completo                                 │
│   Sonoplastia     2/2   ✓ completo                                 │
│   Transmissão     1/1   ✓ completo                                 │
│                                                                     │
│ CRONOGRAMA                                                          │
│ 09h00  Abertura         Louvor                                     │
│ 09h15  Oração inicial   Pastoral                                   │
│ 09h25  Leitura bíblica  Pastoral                                   │
│ 09h35  Mensagem         Pastoral                                   │
│ 10h15  Encerramento      Louvor                                     │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ 12 confirmados · 4 vagas abertas                                    │
│                                                                     │
│ [Editar escala]                    [Setup da celebração]            │
└─────────────────────────────────────────────────────────────────────┘
```

### Linha a linha

1. **Botão fechar** (`BotaoIcone` com `className="drawer-close"`) — já existe no EventDrawer
2. **Eyebrow**: dia da semana + data formatada (`joinDot(event.weekday, formatDateBR(event.eventDate))`) — já existe
3. **Nome do culto**: `event.name` em `profile-name` — já existe
4. **Meta**: hora + local (`joinDot(event.time, event.location)`) em `profile-role` — já existe
5. **Segmentado com 4 abas**: `Panorama` (nova, primeira posição), `Cronograma`, `Posições`, `Para o membro` — `Segmentado` + `Opcao` da BIBLIOTECA
6. **Bloco Cobertura**: componente `Cobertura` da BIBLIOTECA, com `itens={coberturaPorTime(...)}` e `onAbrir` que rola até o time na aba Posições
7. **Bloco Cronograma**: lista de `Linha` da BIBLIOTECA, uma por etapa, mostrando hora, nome da etapa e categoria/time
8. **Rodapé resumo**: texto com contagem de confirmados e vagas abertas, sem ação
9. **Botões de rodapé**: "Editar escala" e "Setup da celebração" — já existem no EventDrawer, fora da aba

### Critério de "problemas primeiro"

O componente `Cobertura` já ordena os times com vagas abertas no topo (`cobertura.ts:28-32`): incompleto primeiro, depois pelo nome. Isto está alinhado com o padrão de mercado (Planning Center) e com a lei 2 ("o que pede minha atenção agora"). Nenhum ajuste necessário na ordenação.

---

## 3. Componentes da BIBLIOTECA usados

| Componente | Arquivo | Uso no Panorama | Novo? |
|---|---|---|---|
| `Segmentado` | `app/service/ui/Segmentado.tsx` | Abas do drawer | Não |
| `Opcao` | `app/service/ui/Opcao.tsx` | Cada aba | Não |
| `Cobertura` | `app/service/modules/escalas/Cobertura.tsx` | Lista de times com cobertura | Não |
| `Linha` | `app/service/ui/Linha.tsx` | Cada etapa do cronograma | Não |
| `Botao` | `app/service/ui/Botao.tsx` | Botões de rodapé | Não |
| `BotaoIcone` | `app/service/ui/Botao.tsx` | Fechar drawer | Não |
| `Acao` | `app/service/ui/Acao.tsx` | Times clicáveis na cobertura | Não |

**Nenhum componente novo.** Todos existem na BIBLIOTECA. Lei 17 respeitada.

---

## 4. O que sai de "Próximos cultos" e de "Escalas" (lei 14)

### Próximos cultos

Já foi removido do Início pela história I1. O comentário em `app/service/painel/telas/Inicio.tsx:442-444` confirma:

```tsx
{/* v7 I1: blocos "Pendências da escala" e "Próximos cultos" removidos.
    Próximos cultos sem pendência não aparecem no Início; a tela dona é Cultos. */}
```

A tela dona dos cultos é `Agenda.tsx` (rota "cultos"), que lista os cultos da semana/mês. **Nada muda ali com o Panorama.**

### Escalas

Hoje, `Escalas.tsx` mostra a cobertura por time embaixo da lista de cultos selecionado:

```tsx
// Escalas.tsx:539-548
<Cobertura
  itens={coberturaPorTime(selectedEvent, roster, ministries, scopeMinistryIds)}
  onAbrir={(timeId) => {
    setTimesFechados((prev) => { const n = new Set(prev); n.delete(timeId); return n; });
    const el = document.getElementById(`esc-col-${timeId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  }}
/>
```

**Com o Panorama, este trecho NÃO é removido.** A tela de Escalas continua mostrando a cobertura para quem está editando (é a tela de montagem). O Panorama é a tela de acompanhamento (só leitura). As duas mostram a mesma informação (cobertura), mas com propósito diferente:

- **Escalas** = montar (tem botões de gerar, aplicar preset, editar)
- **Panorama** = acompanhar (só leitura, sem ações de edição)

Isto respeita a **lei 15** ("Montar e acompanhar são telas diferentes") e a **lei 14** ("uma informação, um lugar"): o dado é o mesmo (cobertura por time), mas a tela dona da visão de acompanhamento passa a ser o Panorama. A tela de Escalas mantém a cobertura porque é parte do fluxo de edição (quem monta precisa ver o resultado).

**Nenhum trecho de código é movido ou apagado em Escalas.tsx.** A mudança é aditiva: nova aba no EventDrawer.

---

## 5. Onde o Panorama entra

### Entrada

O Panorama é uma **aba nova dentro do EventDrawer** (`app/service/painel/telas/Evento.tsx`).

O EventDrawer já tem 3 abas:
1. Cronograma
2. Posições
3. Para o membro

Com o Panorama, fica:
1. **Panorama** (nova, primeira posição)
2. Cronograma
3. Posições
4. Para o membro

### Por que primeira aba?

No dia do culto, a pergunta do pastor é "como estamos?" (cobertura + cronograma), não "editar roteiro". A aba mais usada no momento de uso deve ser a primeira. Hierarquia de uso, não de cadastro.

### Como abrir

1. Tela de Agenda (`/service/painel?rota=cultos`)
2. Clique num card de culto → abre o EventDrawer
3. Aba "Panorama" já selecionada por padrão

### Menu lateral

**Nenhum item novo no menu lateral.** O Panorama vive dentro do drawer de um culto, acessível pela tela de Agenda (que já está no menu como "{Cultos} e eventos", grupo "Agenda", ordem 40). Casca estável (lei 1).

---

## 6. O que as skills mudaram na proposta

### cex-brand

- Confirmou que nenhum componente novo é necessário (todos existem na BIBLIOTECA).
- Reforçou que o `Cobertura` já usa os tokens canônicos (`--olive-soft` para completo, `--amber` para falta) e que não devo inventar cores novas.
- Lembrou que o texto sobre cor de acento deve usar `--ink`, não branco (já está correto no componente existente).
- Checklist de entrega verificado: zero azul, zero losango, zero travessão, zero emoji, olive ≤ 15%.

### impeccable (shape)

- O modo desta superfície é **Operate** (quem usa está acompanhando uma tarefa, não decidindo ou lendo). Ambição aqui é precisão e restrição, não expressão.
- Reforçou a separação entre quem monta e quem acompanha (lei 15): o Panorama é só leitura, sem botões de edição. Isto é diferente do Planning Center, que tem algumas ações na visão do dia; aqui, nenhuma ação, só navegação.
- Sugeriu mover "Panorama" para a **primeira aba** (não deixar como terceira ou quarta) porque no dia do culto é a mais usada. Hierarquia de uso, não de cadastro.
- Confirmou que o padrão "problemas primeiro" (times incompletos no topo) é o correto para Operate: quem usa precisa ver o que pede atenção agora, não o que já está resolvido.
- Indicou que o detector mecânico (`impeccable detect --json`) deve rodar após a implementação, não durante o planejamento.

---

## 7. Medição de densidade "antes"

Pendente para a PARTE 2. O script `scripts/medir-densidade.js` é um snippet de console do navegador (usa `window`), não roda direto no Node. A medição será feita com o app rodando em `http://localhost`, injetando o script no console. O baseline "antes" será o EventDrawer atual na aba "Cronograma" (a mais parecida com o Panorama proposto), medido em 1366×860 (painel).

---

## 8. Resumo das decisões

| Decisão | Valor | Justificativa |
|---|---|---|
| Onde entra | Aba nova no EventDrawer | Casca estável (lei 1), sem item novo no menu |
| Posição da aba | Primeira | Hierarquia de uso (lei 2), sugerido pelo impeccable |
| Componente novo | Nenhum | Todos existem na BIBLIOTECA (lei 17) |
| Trecho removido de Escalas | Nenhum | Escalas = montar, Panorama = acompanhar (lei 15) |
| Próximos cultos | Já removido do Início (I1) | Tela dona é Agenda |
| Problemas primeiro | Sim | Padrão de mercado + lei 2 |
| Modo da superfície | Operate | Acompanhamento de tarefa, precisão e restrição |