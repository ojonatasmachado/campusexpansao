# Captura local do Service

Recuperada do stash de 05/10 e adaptada às leis 12 e 13. Usa Playwright e axe. Não aponta para produção, não aplica stashes nem reseta banco. O app deve rodar em `http://localhost:3000` com Supabase em `http://127.0.0.1:54321`.

```sh
npm ci --prefix tools/captura-service
cd tools/captura-service
npx playwright install chromium
npm test
npm run capturar
```

O último comando percorre entrada, painel, estados, líder, membro e jornadas. Para recapturar uma parte:

```sh
node capturar.mjs --so=entrada --ap=celular
node capturar.mjs --so=jornadas --j=M10 --ap=celular
node capturar.mjs --so=jornadas --ap=desktop
```

Saída padrão: `prints/service-AAAA-MM-DD/`. `CAPTURA_SAIDA` permite uma pasta própria por execução. Screenshots, textos, auditorias, `manifest.json`, `JORNADAS.md`, `BLOQUEIOS.md` e `resultado.json` ficam nessa pasta. Falha de jornada, texto esperado ausente, auditoria indisponível ou violação de qualidade encerra com código 1. As capturas seguintes continuam para documentar os outros problemas.

Use `CAPTURA_BASELINE=/caminho/da/captura-aprovada` para comparar contraste e densidade com uma referência explícita. A execução atual não vira referência automaticamente. Sem referência, contraste deve ter zero violações e a densidade deve cumprir os limites absolutos. Os critérios são testados com DOM real no CI; a execução completa com contas autenticadas continua local e deve ser relatada separadamente.

A medição da primeira dobra usa 1366×860 no painel e 390×844 no app. Em janela modal, mede o conteúdo da janela. Reprova texto abaixo de 12px no painel ou 13px no app, alvos abaixo de 24px, contraste pior que a referência, rolagem lateral, console/rede com erro, densidade e sobreposição. Cada passo de ação registra se houve efeito observável na interface ou uma requisição; isso não prova o comportamento dos botões que a jornada não acionou.

O seed opcional `npx tsx tools/captura-service/seed-captura.ts` usa apenas as contas de teste local e IDs determinísticos, com datas relativas ao dia atual no fuso de São Paulo. Faz upsert das fixtures: use-o antes da captura, nunca durante outra sessão que use as mesmas fixtures. Guarda um snapshot local ignorado pelo Git; não oferece restauração nem reset. `--status` só inspeciona. Não execute o seed base ou resete o banco para tentar eliminar uma falha sem conferir o estado compartilhado.

Limites atuais: a recuperação não comprova as jornadas ainda incompletas no `resultado.json`. Artefatos e falhas de produto são evidência; não substituem prova de persistência, isolamento de igreja, aparelho real ou leitor de tela. Q3 cuida da matriz autenticada. Não marcar Q1 feita enquanto a captura completa prevista no manifesto não estiver conferida.
