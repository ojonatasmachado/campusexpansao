# Captura local do Service

Recuperada do stash de 05/10 e adaptada às leis 12 e 13. Usa Playwright e axe. Não aponta para produção, não aplica stashes nem reseta banco. O modo isolado sobe o app e o Supabase em portas locais próprias, aplica as migrações e as fixtures e descarta banco, servidor e sessões ao terminar. Docker deve estar ativo e o CLI Supabase instalado.

```sh
npm ci --prefix tools/captura-service
cd tools/captura-service
npx playwright install chromium
npm test
cd ../..
npx tsx tools/captura-service/isolado.ts
```

Não mantenha outro servidor Next no mesmo worktree durante a captura. Para uma jornada isolada: `npx tsx tools/captura-service/isolado.ts --so=jornadas --j=M10 --ap=celular`.

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

Limites atuais: a recuperação não comprova as jornadas ainda incompletas no `resultado.json`. Artefatos e falhas de produto são evidência; não substituem prova de persistência, isolamento de igreja, aparelho real ou leitor de tela. Q3 cuida da matriz autenticada. Não marcar Q1 feita enquanto a captura completa prevista no manifesto não estiver conferida.
