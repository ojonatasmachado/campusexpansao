# Captura local do Service

Recuperada do stash de 05/10 e adaptada às leis 12 e 13. Usa Playwright e axe. Não aponta para produção, não aplica stashes nem reseta banco. O modo isolado sobe o app e o Supabase em portas locais próprias, aplica as migrações e as fixtures e descarta banco, servidor e sessões ao terminar. Docker deve estar ativo e o CLI Supabase instalado.

```sh
npm ci
npm ci --prefix tools/captura-service
cd tools/captura-service
npx playwright install chromium
npm test
cd ../..
npx tsx tools/captura-service/isolado.ts
```

Não mantenha outro servidor Next no mesmo worktree durante a captura. Para uma jornada isolada: `npx tsx tools/captura-service/isolado.ts --so=jornadas --j=M10 --ap=celular`.

O limite é uma hora por grupo selecionado, somado para a execução completa. Ao excedê-lo, o processo de captura é encerrado antes do descarte do ambiente. Para verificações curtas, use `--so=membro`, `--so=painel` ou `--ap=celular` e uma pasta `CAPTURA_SAIDA` por lote. Uma execução interrompida deixa evidência parcial, não uma aprovação.

O último comando percorre entrada, jornadas, painel, estados, líder e membro. As jornadas vêm antes da galeria do membro, pois abrir o Mural registra a leitura e consumiria as novidades usadas nos testes. No modo isolado, a fixture de um rascunho de escala é reposta antes de cada aparelho; publicar no celular não esgota o cenário do desktop. O modo direto abaixo reaproveita app e banco locais já existentes e exige preparar as fixtures antes. Para recapturar uma parte:

```sh
node capturar.mjs --so=entrada --ap=celular
node capturar.mjs --so=jornadas --j=M10 --ap=celular
node capturar.mjs --so=jornadas --ap=desktop
```

Saída padrão: `prints/service-AAAA-MM-DD/`. `CAPTURA_SAIDA` permite uma pasta própria por execução. Screenshots, textos, auditorias, `manifest.json`, `JORNADAS.md`, `BLOQUEIOS.md` e `resultado.json` ficam nessa pasta. Falha de jornada, texto esperado ausente, auditoria indisponível ou violação de qualidade encerra com código 1. As capturas seguintes continuam para documentar os outros problemas.

Use `CAPTURA_BASELINE=/caminho/da/captura-aprovada` para comparar contraste e densidade com uma referência explícita. A execução atual não vira referência automaticamente. Sem referência, contraste deve ter zero violações e a densidade deve cumprir os limites absolutos. As referências de fonte são resolvidas para as declarações atuais; o valor legado fica preservado no manifesto. A outra igreja não tem equipes nem conteúdo, mas mantém a ficha da conta gestora, necessária para entrar no painel pelo celular.

Os critérios são testados com DOM real no CI; a execução completa com contas autenticadas continua local e deve ser relatada separadamente.

A medição da primeira dobra usa 1366×860 no painel e 390×844 no app. Em janela modal ou confirmação de risco (`alertdialog`), mede o conteúdo da janela. Reprova texto abaixo de 12px no painel ou 13px no app, alvos abaixo de 24px, contraste pior que a referência, rolagem lateral, console/rede com erro, densidade e sobreposição. Cada passo de ação registra se houve efeito observável na interface ou uma requisição; isso não prova o comportamento dos botões que a jornada não acionou.

O seed opcional `npx tsx tools/captura-service/seed-captura.ts` usa apenas as contas de teste local e IDs determinísticos, com datas relativas ao dia atual no fuso de São Paulo. Faz upsert das fixtures: use-o antes da captura, nunca durante outra sessão que use as mesmas fixtures. Guarda um snapshot local ignorado pelo Git; não oferece restauração nem reset. `--status` só inspeciona. Não execute o seed base ou resete o banco para tentar eliminar uma falha sem conferir o estado compartilhado.

Limites atuais: a recuperação não comprova as jornadas ainda incompletas no `resultado.json`. Artefatos e falhas de produto são evidência; não substituem prova de persistência, isolamento de igreja, aparelho real ou leitor de tela. Q3 cuida da matriz autenticada. A entrega da ferramenta não aprova telas com violações: jornadas interrompidas continuam explícitas no resultado, com screenshot e erro para a frente responsável. Consulte a história Q1 e a tabela Captura por etapa de PROGRESSO.md para as execuções conferidas.

## Foto padrão de uma tela

Na raiz do worktree, use sempre `npm run dev:local -- --port 3101`.
`npm run dev` aponta para produção pelo `.env.local`. Não copie esse arquivo.
Instale as dependências de captura com `npm ci --prefix tools/captura-service`
e o navegador com `cd tools/captura-service && npx playwright install chromium`.

```sh
node tools/captura-service/foto.mjs --porta 3101 \
  --email membro@teste.local --senha TesteLocal123 --tela agenda \
  --largura 390 --altura 844 \
  --saida docs/service-v7/historias/screenshots/X1-agenda.png
```

Telas: `inicio`, `agenda`, `agenda-igreja`, `mensagens`, `caminhada` e
`painel-escalas`. Use `master@teste.local` no painel, com 1366×860.
As dimensões padrão são 390×844 no app e 1366×860 no painel.
Todos os argumentos aceitam `--nome valor` ou `--nome=valor`.

Cada execução faz login pelo formulário em `http://localhost`, espera hidratação
(`networkidle`) e conteúdo visível, fecha o tour quando presente e confere que o
selo Next ficou oculto. Navega por cliques, inclusive nas abas do membro. Agenda
usa `/service?maba=agenda`, nunca `/service/agenda`.
A foto corresponde à primeira dobra medida por `scripts/medir-densidade.js`:
`__medir(44)` no app e `__medir(24)` no painel. A saída imprime a medição,
os limites da lei 13 (app: 12 ações/80 palavras; painel: 25 ações/100 palavras),
a classificação de densidade e o MD5 da foto. Dimensões personalizadas são
impressas junto da medida; os limites continuam os da lei 13.
Densidade acima do limite é relatada como "fora da lei", sem aprovar a tela.
Argumento inválido, login ou tela não encontrada falham com código 1.
Abra cada imagem e descreva o conteúdo antes de usá-la como prova.
