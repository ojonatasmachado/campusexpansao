# Captura completa do Service para análise de UX

Cole este prompt inteiro no Claude Code, aberto na raiz do repositório `campusexpansao`.

---

Você vai gerar o material que um designer precisa para analisar o **Service** atual e redesenhar as jornadas. **Não analise, não proponha melhorias e não altere o app.** Seu trabalho é só capturar, de forma completa e reproduzível.

Antes de começar, leia `AGENTS.md`, `CLAUDE.md`, `service-jornadas-routes.md` e `scripts/seed-local-service.ts`.

## 0. Regras

1. Rode tudo local: app em `http://localhost:3000` e Supabase em `http://127.0.0.1:54321`. Se algum endereço apontar para produção, pare.
2. Não altere nada em `app/`, `public/`, `supabase/` nem o `package.json` da raiz. Todo código novo fica em `tools/captura-service/`, com `package.json` próprio (Playwright e `@axe-core/playwright`).
3. Antes de qualquer `supabase db reset`, me pergunte.
4. Não imprima nem copie valores do `.env.local`.
5. Se um bug impedir uma captura, não corrija. Registre em `BLOQUEIOS.md` (tela, passo, erro e o print do que apareceu) e siga.
6. Navegue como uma pessoa navega: clicando no menu, nas abas e nos botões. Não force estado interno do React. As telas do painel não têm URL própria, então o caminho de cliques de cada captura vai para o manifesto.
7. Não faça commit de nada.

## 1. Ambiente e dados de teste realistas

Suba nesta ordem: `supabase start`, `npx tsx scripts/seed-local-service.ts`, o seed de captura abaixo e `npm run dev`.

Tela vazia esconde problema. Crie `tools/captura-service/seed-captura.ts`, que complementa o `seed-local-service.ts`. Ele usa a mesma trava do original (recusa rodar fora de 127.0.0.1), é idempotente e consegue restaurar o estado inicial dos registros que ele mesmo criou, porque as jornadas alteram dados. Leia `supabase/schema.sql` e `supabase/migrations/` antes. Se uma tabela não existir, pule e registre no relatório.

Na Igreja Teste Local, com datas relativas a hoje e fuso America/Sao_Paulo:
- 24 pessoas com nomes brasileiros e acentos, idades variadas (pelo menos 3 com mais de 65 anos) e aniversários espalhados pelo ano. Deixe 5 sem telefone e 3 sem e-mail, para ver como o app mostra dado ausente.
- 4 times (Louvor, Recepção, Kids, Mídia), com posições, necessidade por posição e um líder em cada.
- 6 eventos: 2 já passados, cultos de domingo e de quarta nas próximas duas semanas e 1 evento especial.
- Escalas com status variados (confirmado, pendente, recusado). A Maria Membro precisa ter 1 escala confirmada e 1 pendente nos próximos 7 dias.
- 3 visitantes em etapas diferentes do funil.
- 2 crianças da família da Maria, em turmas Kids.
- 3 publicações no Mural: 1 lida e 2 não lidas pela Maria.
- 2 conversas com mensagens trocadas e 1 pedido de oração.
- 1 curso com 4 aulas, com a Maria matriculada e 1 aula concluída.
- 1 grupo, 1 espaço com reserva, 1 reunião, 1 ensaio, 1 pesquisa aberta e 1 batismo agendado.
- A conta `novo@teste.local` (senha `TesteLocal123`), membro com a ficha incompleta, para percorrer o primeiro acesso desde o começo.

A "Outra Igreja Local" (`outra@teste.local`) fica vazia: é ela que mostra os estados vazios.

## 2. Configuração da captura

Script: `tools/captura-service/capturar.mjs`. Instale com `npm i` e `npx playwright install chromium` dentro da pasta. O script pode ser rodado de novo a qualquer momento e aceita filtro (ex.: `--so=jornadas`).

- **Celular:** 390×844, `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true`.
- **Desktop:** 1440×900, `deviceScaleFactor: 1`.
- Nos dois: `locale: 'pt-BR'`, `timezoneId: 'America/Sao_Paulo'`, `reducedMotion: 'reduce'`, `serviceWorkers: 'block'`.
- Antes de cada print, espere a rede parar, as fontes carregarem (`document.fonts.ready`) e sumir qualquer skeleton ou spinner.
- Cada print é a página inteira (`fullPage`). No celular, salve também a primeira tela sem rolar, com o sufixo `--dobra`. Ela mostra o que a pessoa vê primeiro e se a barra de abas está presa ao rodapé.
- **Validação automática:** confira se o título ou o texto esperado aparece na tela. Se cair no login, numa tela branca ou num erro, a captura conta como falha e vai para o `BLOQUEIOS.md`.

Para cada imagem, gere também:
- `textos/<mesmo caminho e nome>.txt` com o `innerText` da página.
- `auditoria/<mesmo caminho e nome>.json` com:
  - as combinações de fonte usadas no texto visível (família, tamanho em px, peso, caixa-alta), com contagem;
  - quantos elementos de texto têm menos de 12px e menos de 14px;
  - os elementos clicáveis menores que 44×44px (texto e seletor);
  - se a página rola para o lado e qual elemento causa isso;
  - os erros de console e as requisições com falha;
  - as violações do axe-core, com destaque para contraste.

## 3. O que capturar

Nome dos arquivos: `{celular|desktop}-{NN}-{grupo}-{tela}.png`. O manifesto liga cada arquivo ao equivalente da captura de 02/10 (`prints/service-2026-10-02/`), quando houver. Exemplos: Início do painel ↔ `05-painel-painel`, Pessoas ↔ `06-painel-membros` e `07-painel-voluntarios`, Grupos ↔ `24-config-grupos`, Times ↔ `08` e `22`, Agenda do app ↔ `36-app-membro-escala` e `37`, Mensagens ↔ `38-app-membro-chat`, Caminhada ↔ `39-app-membro-cursos`.

### 3.1 Entrada (sem login) · celular e desktop
01 login da gestão · 02 login com a identidade da igreja (descubra como `LoginForm` e `AuthShell` recebem a igreja) · 03 convite expirado · 04 nova senha com link inválido · 05 convite válido (use o link gerado na jornada L4) · 06 criar igreja (`/service/onboarding`) · 07 `/service/conexao` · 08 check-in de culto (`/service/checkin`) · 09 check-in Kids · 10 check-in de aula · 11 página pública da igreja (a que o painel abre em "Página da igreja").

### 3.2 Painel · conta `master@teste.local` · celular e desktop
Um print por item do menu atual (`NAV_GROUPS` em `ServiceExactApp.tsx`) e por aba de Configurações (`CFG_TABS`), na ordem do código. Hoje são:

- Início
- Pessoas: Pessoas, Visitantes, Crianças, Grupos
- Ministério: Times, Escalas, Ensaios, Reuniões
- Agenda: Cultos e eventos, Espaços e salas
- Comunicação: Mural, Conversas, Pesquisas, Página da igreja
- Formação: Cursos e trilhas, Batismos
- Gestão: Relatórios, Quadros, Identidade e propósito, Nossa história
- Configurações: índice, Dados da igreja, Personalização, Congregações, Escala e presença, Turmas Kids, Permissões, Acessos por pessoa
- O menu do usuário no topo aberto e, no celular, o menu lateral aberto.

Se o código tiver telas fora desta lista, inclua. Se alguma não existir mais, registre.

### 3.3 Estados de cada tela do painel (pasta `estados/`)
Para cada tela de 3.2, quando houver:
- cada aba ou segmento interno (ex.: Visitantes em Funil, Lista, Painel e Regras);
- o formulário principal de criação aberto ("+ Visitante", "+ Pessoa" etc.);
- o detalhe de um item aberto (ficha da pessoa, gaveta do curso, cartão do quadro);
- uma confirmação destrutiva aberta (excluir, sair), sem confirmar;
- o estado vazio, com a conta `outra@teste.local`.

Sufixo `--{estado}`, ex.: `desktop-14-painel-visitantes--funil.png`.

### 3.4 Painel com o papel de líder · `lider@teste.local` · celular e desktop
Menu, Início, Escalas e Pessoas, para mostrar o que muda por permissão.

### 3.5 App do membro · celular e desktop
Com `membro@teste.local` (serve no Louvor): um print por aba (Início, Agenda, Mensagens, Caminhada, Perfil) e por subtela. Para achar todas as subtelas, liste cada combinação de aba e subtela que `go()` e `ui.go()` aceitam em `MobileApp.tsx` (Mural, Minha escala, conversa aberta, nova mensagem, Bíblia em livros, capítulos, leitor e marcações, cursos, família, tamanho do texto, notificações etc.).

Com `membro2@teste.local` (não serve em time): Início, Agenda e Caminhada.
Com `lider@teste.local`: Perfil, mostrando a porta para o painel.

### 3.6 Jornadas passo a passo (pasta `jornadas/`)
Um print a cada toque que muda a tela, incluindo avisos, toasts e confirmações. Nome: `jornadas/{código}-{nome}/{NN}-{o-que-aconteceu}.png`.

Membro, no celular:
- **M1 Primeiro acesso:** login com `novo@teste.local`, cada passo do primeiro acesso e o Início ao final.
- **M2 Confirmar escala:** do cartão no Início até o estado final confirmado.
- **M3 Recusar escala:** recusar, "mudei de ideia" e o pedido de troca, se existir.
- **M4 Ler o Mural:** do número de não lidas até ele zerar, respondendo a uma publicação, se houver resposta.
- **M5 Pedir oração:** de Mensagens até a confirmação de envio.
- **M6 Caminhada:** próximo passo, abrir o curso e concluir uma aula. Com `membro2`, o caminho "Quero servir".
- **M7 Tamanho do texto:** Perfil e cada tamanho disponível. No maior tamanho, as 5 abas (pasta `texto-grande/`).
- **M8 Kids:** da família até o check-in da criança.
- **M9 Sair:** do Perfil até a tela de login.

Líder, no desktop e no celular:
- **L1 Montar a escala** de um culto e acompanhar as confirmações.
- **L2 Publicar um aviso** no Mural e ver quem leu.
- **L3 Registrar um visitante** e levá-lo à etapa seguinte.
- **L4 Cadastrar uma pessoa** e mandar o convite do app, até a tela do convite válido.
- **L5 Check-in do culto por QR**, do painel até a tela de presença confirmada.
- **L6 Trocar a cor e o logo** em Personalização e ver o app do membro com a nova identidade.

### 3.7 Temas (pasta `temas/`)
Login com a identidade da igreja, Início do painel e Início do app, nos temas claro e escuro, com 3 cores de destaque da lista `ACCENTS`: a padrão, a mais clara e a mais escura.

### 3.8 Ordem de execução
As jornadas alteram dados, então a ordem importa:
1. Seeds.
2. 3.1 (menos o 05), 3.2, 3.3, 3.4 e 3.5, com os dados no estado inicial.
3. L2 até publicar.
4. M1 a M9.
5. L2 de novo, para ver quem leu. Depois L1 (os status mudaram com M2 e M3), L3, L4 (gera o convite do 05), 3.1-05, L5 e L6.
6. 3.7.
7. Volte cor, logo, tema e tamanho do texto ao original e restaure os dados com o seed de captura.

## 4. Entrega

Tudo em `prints/service-AAAA-MM-DD/` (data de hoje), mais o `.zip` da pasta:

```
prints/service-AAAA-MM-DD/
  telas/  estados/  jornadas/  temas/  texto-grande/
  textos/  auditoria/
  manifest.json
  MAPA.md
  MUDANCAS.md
  BLOQUEIOS.md
  RELATORIO.md
```

- **manifest.json:** uma entrada por imagem com `arquivo`, `aparelho`, `conta`, `papel`, `tela`, `estado`, `jornada`, `passo`, `url`, `cliques` (caminho até a tela), `componente` (arquivo:linha), `antes_0210` (arquivo equivalente de 02/10 ou null), `erros_console` e `horario`.
- **MAPA.md:** para cada tela, o componente, o arquivo e a linha onde ela é desenhada.
- **MUDANCAS.md:** o commit atual e o que mudou desde 02/10/2026 (`git log --since=2026-10-02 --stat`), agrupado por tela.
- **RELATORIO.md:** quantas capturas por pasta; jornadas completas e incompletas; as 10 telas com mais texto abaixo de 12px, mais alvos menores que 44px, rolagem lateral, erros de console e violações de contraste. Só números e nomes, sem opinião.

## 5. Antes de dizer que terminou

- [ ] Todo item de `NAV_GROUPS` e `CFG_TABS` tem print no celular e no desktop.
- [ ] Toda aba e subtela do app do membro tem print.
- [ ] As 15 jornadas estão completas, ou o motivo está em `BLOQUEIOS.md`.
- [ ] Nenhuma imagem é tela de login, branca ou de erro fora do lugar.
- [ ] Toda imagem tem `.txt`, `.json` e entrada no manifesto.
- [ ] O app voltou à configuração original (cor, logo, tema, tamanho do texto e dados).

No fim, responda só com: o caminho da pasta, o total de imagens, as jornadas incompletas e os bloqueios.
