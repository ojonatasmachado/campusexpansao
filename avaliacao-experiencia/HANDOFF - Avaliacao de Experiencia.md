# HANDOFF · Avaliação de Experiência (backend real)

> Referência de UX: `Avaliacao - Site.html` (experiência do usuário) e `Avaliacao - Admin.html`
> (gestão). Ambas rodam hoje sobre `localStorage` via `store.js`, só pra prototipar a
> interação. Este documento é o contrato pra sair do mock e virar produto real.
> Regras de marca/paleta valem as do `AGENTS.md` raiz (sem azul, oliva ≤15%, zero travessão).

---

## 1. Modelo de dados

> Segmentação e disparo têm eixos próprios por contexto — não reaproveite o mesmo enum
> para os dois produtos. Confira `avaliacao-data.js` (`SEG_MODES_SERVICE/SITE`,
> `DISPARO_MODES_SERVICE/SITE`) para os hints exatos exibidos no admin.

```ts
type TipoPergunta = 'nota' | 'texto' | 'emoji' | 'multipla' | 'simnao';

interface Pergunta {
  id: string;
  tipo: TipoPergunta;
  texto: string;
  escala?: 5 | 10;        // só tipo 'nota'
  opcoes?: string[];      // só tipo 'multipla'
}

type Contexto = 'service' | 'site';

// Service: 'todos' | 'papel' | 'time' | 'lista'
// Site:    'todos' | 'papel' | 'estante' | 'lista'
type ModoSegmentacao = 'todos' | 'papel' | 'time' | 'estante' | 'lista';

// Service: 'livre' | 'periodica' | 'posescala' | 'campanha'
// Site:    'livre' | 'periodica' | 'posdownload' | 'campanha'
type ModoDisparo = 'livre' | 'periodica' | 'posescala' | 'posdownload' | 'campanha';

interface Enquete {
  id: string;
  nome: string;
  contexto: Contexto;      // decide quais opções de segmentação/disparo são válidas
  status: 'ativa' | 'pausada' | 'encerrada';
  perguntas: Pergunta[];
  segmentacao: {
    modo: ModoSegmentacao;
    valores: string[]; // papéis, times/ministérios, estantes/cursos, ou e-mails (lista)
  };
  disparo: {
    modo: ModoDisparo;
    ativoComoLivre: boolean;    // true só pra 1 enquete POR CONTEXTO
    intervaloDias: number | null;  // só 'periodica'
    horasDepois: number | null;    // só 'posescala' (Service) — horas após confirmar presença
    emitidaEm?: string;             // timestamp de quando 'campanha' foi disparada
  };
  criadoEm: string;
}

interface Resposta {
  id: string;
  enqueteId: string;
  usuarioId: string;       // FK usuário real (qualquer papel)
  papel: string;           // snapshot do papel no momento da resposta (papéis diferem por contexto)
  timesAcessados?: string[];    // snapshot p/ segmentação 'time' (Service)
  estantesAcessadas?: string[]; // snapshot p/ segmentação 'estante' (Site)
  data: string;             // ISO date
  respostasPerguntas: { perguntaId: string; valor: string | number }[];
}
```

**Regra de negócio:** só uma `Enquete` pode ter `disparo.ativoComoLivre = true` por vez
**dentro do mesmo `contexto`** — uma livre ativa no Service e outra livre ativa no site
podem coexistir. Ao ativar uma nova dentro do mesmo contexto, desativar as demais
(implementado assim no protótipo do admin, `onSave` do `AdminEditor`).

**Papéis por contexto** (fixos no protótipo, mas devem vir de config/backend):
- Service: `Master`, `Líder`, `Membro`
- Site de materiais: `Líder`, `Aluno`, `Equipe`

---

## 2. Lógica de disparo (client-side, a implementar no site/Service real)

1. **Livre:** sempre disponível via atalho/botão fixo, um por contexto. Busca a
   enquete com `contexto === atual && ativoComoLivre === true && status === 'ativa'`.
   Se nenhuma, esconder o atalho.
2. **Campanha:** admin marca `disparo.modo = 'campanha'` e clica "Emitir agora"
   (grava `emitidaEm`). No client: ao carregar, buscar enquetes de campanha ativas
   do contexto atual, elegíveis pela segmentação, que o usuário **ainda não viu**
   (`usuario_enquete_visto(usuarioId, enqueteId, vistoEm)`). Mostrar 1x.
3. **Periódica:** compara `hoje - ultimaExibicao >= intervaloDias`. Reaparece até
   responder ou o admin pausar.
4. **Pós-escala** (só Service): dispara `horasDepois` horas depois do usuário
   confirmar presença numa escala — precisa de um evento/job agendado no backend
   do Service (tabela de confirmações já existe; usar como gatilho).
5. **Pós-download** (só site de materiais): dispara logo após o usuário concluir
   o download de um material — hook no endpoint de download existente do site.
6. Popups **nunca** empilham por contexto: se mais de uma enquete for elegível na
   mesma sessão, mostrar só uma (prioridade: campanha > pós-evento > periódica > nenhuma).

### Segmentação — resolução no backend (eixos diferem por contexto)
- `todos`: todo usuário autenticado no contexto.
- `papel`: usuário cujo `papel` (do contexto correspondente) está em `valores`.
- `time` (Service): usuário escalado/membro de um time/ministério em `valores`.
- `estante` (Site): usuário que acessou/matriculou em estante ou curso em `valores`.
- `lista`: usuário cujo e-mail está em `valores`.

---

## 3. Endpoints sugeridos

```
GET  /api/enquetes?contexto=service|site        # lista (admin)
POST /api/enquetes                      # criar (contexto obrigatório no payload)
PUT  /api/enquetes/:id                  # editar (inclui trocar ativoComoLivre, emitir campanha)
DELETE /api/enquetes/:id

GET  /api/enquetes/elegveis?usuarioId=&contexto=  # quais enquetes mostrar agora
                                         # (resolve segmentação do contexto + regra de
                                         #  "visto" + livre + gatilhos pós-evento)
POST /api/enquetes/:id/respostas        # usuário envia resposta
POST /api/enquetes/:id/visto            # marca popup como exibido (campanha/periódica)
POST /api/eventos/escala-confirmada     # webhook interno: dispara checagem de 'posescala'
POST /api/eventos/material-baixado      # webhook interno: dispara checagem de 'posdownload'

GET  /api/enquetes/:id/respostas?periodo=&papel=  # admin: resultados filtrados
```

---

## 4. Telas de referência (o que já está desenhado)

Protótipo em `avaliacao-experiencia/`:
- `Avaliacao - Service.html` (+ `avaliacao.jsx` + `avaliacao-data.js`): shell com toggle
  "Service (app)" / "Site de materiais (web)" no topo. Usa `service_app/service.css` +
  `service-v2.css` + `icons.jsx` — nenhum CSS novo fora do que já existe no app.
- `Avaliacao - Site Web.html`: versão web isolada (site de materiais), carregada no
  iframe do toggle acima; usa `cex-brand-library/` (mesmo padrão do site real).

**App do membro (Service):** cartão de atalho na Início (`.m-card`) → bottom sheet
(`.m-sheet-bg/.m-sheet/.m-sheet-grip`) com stepper de perguntas, ícone real da
pergunta (`<Icon name=... />`) e opções em `.seg-chip`. Ação em `.m-btn.m-btn-ok`.

**Site de materiais (web):** botão fixo `.btn.btn-primary` + modal centralizado
(`.modal-overlay`/`.modal`) com o mesmo stepper, usando `.chip`/`.chip.active`.

**Admin (desktop, dentro do Service):** lista (`.ph`/`.kpi-row`/`.tbl`) → editor em
jornada de 3 passos com `.section-divide` numerado — **01 Segmentação → 02 Perguntas
→ 03 Disparo** — e uma prévia ao vivo fixa ao lado (`PreviewCard`) mostrando a
pergunta atual exatamente como vai aparecer pro usuário. O campo "Onde aparece"
(Service/Site) no topo do editor comuta as opções de segmentação e disparo, que são
listas **totalmente distintas por contexto** (`SEG_MODES_SERVICE/SITE`,
`DISPARO_MODES_SERVICE/SITE` em `avaliacao-data.js`), cada uma com um hint curto
explicando o que faz — reduz erro de configuração sem precisar de documentação externa.
Tela de resultados com barras agregadas + filtro de período/papel.

Dois ícones novos foram adicionados ao sistema oficial em `service_app/icons.jsx`
(`estrela` para nota/NPS, `reacao` para a pergunta de reação), traçados no mesmo
estilo de linha 24×24 dos demais. **Nenhum emoji e nenhum glifo solto (◆ como ícone
de UI) foi usado** — só os ícones de traço da biblioteca real.

## 6. Passo a passo pro Claude Code implantar

1. Ler este arquivo inteiro + abrir os 3 arquivos do protótipo
   (`Avaliacao - Service.html`, `Avaliacao - Site Web.html`, `avaliacao.jsx`,
   `avaliacao-data.js`) pra ver a UX final antes de tocar em schema/API.
2. Criar as tabelas: `enquetes`, `perguntas` (FK enquete), `respostas`,
   `respostas_perguntas` (FK resposta+pergunta), `usuario_enquete_visto`. Usar os
   tipos da Seção 1 — atenção ao campo `contexto` em todo lugar que hoje é
   "global" (ativoComoLivre, listas do admin).
3. Implementar os endpoints da Seção 3. `GET /api/enquetes/elegveis` é o mais
   sensível: precisa resolver segmentação (Seção 2) + o gatilho certo por contexto.
4. Portar `AdminEditor`/`AdminLista`/`AdminResultados` de `avaliacao.jsx` para o
   admin real, trocando o `cexLoadSurveys()`/`cexSaveSurveys()` (localStorage) pelas
   chamadas de API — a UI e os componentes (`.panel`, `.section-divide`, `.seg-chip`,
   `PreviewCard`) já estão prontos, é troca de camada de dados.
5. No app Service e no site de materiais, plugar a lógica de elegibilidade (Seção 2)
   no boot da página/app: buscar `elegveis`, aplicar prioridade campanha > pós-evento
   > periódica, renderizar com os componentes já existentes (`AvaliacaoSheet` no
   Service, modal em `Avaliacao - Site Web.html` no site).
6. Implementar os dois webhooks de gatilho (`escala-confirmada`, `material-baixado`)
   chamando o mesmo resolver de elegibilidade com `contexto` fixo.
7. Testar: uma enquete livre por contexto (não deixar duas `ativoComoLivre=true`
   simultâneas no mesmo contexto), popup não empilha, resultados filtram certo por
   papel/período.

## 7. Pontos em aberto pro time de dev
- Autenticação: qual sessão/token identifica o usuário no site/Service pra registrar
  `usuarioId` e `papel` na resposta.
- Onde fica o registro de "estantes acessadas" por usuário (pra segmentação `estante`
  funcionar de verdade).
- Se resultados devem ficar visíveis só pro admin ou também por painel do próprio
  usuário (não coberto neste protótipo).
