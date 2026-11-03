# I1: tarefas finais (arquivo de trabalho, NÃO commitar)

Esta é a fonte dos critérios. Se achar que falta histórico ou contexto, releia este arquivo. Não peça os critérios de novo.

## Regras
- Escreva sempre em português. Faça você mesmo, sem subagente, exceto o revisor na etapa 4.
- Trabalhe só em `/Users/macbook/campusexpansao/.claude/worktrees/I1`, branch `historia/I1-inicio-fila-precisa-de-voce`. Nunca toque em `/Users/macbook/campusexpansao/app`.
- Só Supabase local (127.0.0.1) e contas do seed local (`scripts/seed-local-service.ts`: master@teste.local para gestão, lider@teste.local para líder). Nunca produção; contas cex-fixture proibidas. Não procure senhas em `.env` nem no keychain; se faltar acesso, pergunte. Não grave senha em PR nem em documento.
- O painel fica na rota `/service` (`app/service/page.tsx`). `/service/painel/inicio` não existe e dá 404.
- As correções de código já estão na pasta, sem commit. Confira com `git diff`; não refaça.
- Só vale o que você vir: "feito" exige prova (linha do código, saída do comando ou foto aberta).
- Merge só com o OK do usuário.

## Etapa 1: captura
1. Suba o servidor a partir deste worktree, numa porta livre, apontando para o Supabase local. Encerre o que você mesmo tiver subido antes.
2. Crie um só script, `scripts/i1-captura.mjs`. Ele entra com a conta, clica em "Pular tour", esconde o selo do Next e, antes de salvar cada foto, FALHA com erro se o TEXTO VISÍVEL (`page.locator("body").innerText()`, nunca `page.content()`, porque o Next põe "could not be found" no código de toda página) tiver "could not be found" ou não tiver "Precisa de você" (no líder, "Para resolver no seu time" também vale). Espere o texto aparecer antes de checar.
3. Fotos finais em `docs/service-v7/historias/screenshots/`: `i1-depois-gestao-1366.png`, `i1-depois-gestao-820.png`, `i1-depois-lider-390.png`. Apague do branch `i1-depois-master-1366.png` e `i1-depois-tablet-820.png`.
4. Abra cada foto com Read e descreva textos, cartões e botões. Os três cartões têm que ter moldura, sem número cortado.

## Etapa 2: teste pela tela
1. Crie 2 pedidos de teste em `service.entry_requests`.
2. Sem SQL para decidir: clique em "Aprovar" num deles (a fila passa a dizer "1 pedido de conta pendente") e em "Recusar" no outro (a linha some).
3. Fotos `i1-teste-fila-antes.png` e `i1-teste-fila-depois.png`, abertas e descritas.
4. Apague os dados de teste.

## Etapa 3: console e densidade
1. Liste os erros do console na tela (lei 12), ou "nenhum" com a prova.
2. Rode `scripts/medir-densidade.js` na página aberta, nas 3 larguras.
3. Corrija `docs/service-v7/historias/I1-inicio-fila-precisa-de-voce.md`: um número só em cada lugar, sem "~" (hoje o texto diz 30 ações e 116 palavras; a tabela, ~25 e ~95).
4. Registra 3 níveis de moldura e o limite é 2: se vier desta tela, corrija; se vier da casca, diga qual elemento. Se não cumprir a lei 13, escreva isso claramente, sem chamar de cumprido.

## Etapa 4: revisão
1. Skills, olhando as fotos reais (se der "Unknown skill", leia `.claude/skills/<nome>/SKILL.md`): impeccable (critique e polish), break-ui (fila vazia "Tudo em dia", 7 linhas, números de 4 dígitos, 360 px), design:accessibility-review (teclado na fila e nos cartões), mobile-native (390 e 820).
2. Typecheck, `npx tsx scripts/check-service-componentes.ts`, `npx tsx scripts/check-graficos-contraste.ts`.
3. Peça ao agente revisor para revisar o diff e corrija o que for real.

## Etapa 5: fechar
1. Apague só estes temporários de `scripts/`: aprovar-pedido-teste.ts, captura-i1-teste.ts, comparar-falhas.py, i1-captura-fila.mjs, i1-captura-final.mjs, i1-verificar.mjs, inserir-pedidos-final.ts, inserir-pedidos-sql.ts, inserir-pedidos-teste.ts, limpar-pedidos-teste.ts, teste-recusar-completo.ts, teste-recusar.ts. Não commite `scripts/i1-captura.mjs` nem este arquivo.
2. Encerre o servidor que subiu.
3. Commit arquivo por arquivo, só: NovosCadastros.tsx, Inicio.tsx, Relatorios.tsx, biblioteca.css, service-app.css, a história I1 e as 5 fotos citadas acima (e a remoção das duas antigas). Nunca `git add -A`. Fora: `.claude/launch.json`, `skills-lock.json`, `COMPARATIVO_PONTE.md` e as outras pastas de fotos.
4. Push no mesmo branch e CI verde. Isso é tarefa sua, não do usuário.
5. Relatório: cada etapa com "feito" e prova, ou "não fiz" e por quê.
