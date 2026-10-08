Modo noturno: vou dormir. Trabalhe sozinho até terminar ou até não haver mais nada que dê para fazer sem mim. Não me faça perguntas. Quando precisar decidir, escolha a opção mais conservadora, anote em docs/service-v7/PROGRESSO.md (seção "Decisões da noite") e siga.

Leia AGENTS.md, docs/service-v7/MANIFESTO.md e docs/service-v7/PROGRESSO.md.

Segurança
1. Crie e use a branch service-v7 a partir de main (git switch -c service-v7). O primeiro commit leva os arquivos do pacote: docs/service-v7/ e .claude/commands/service-v7.md. Não faça push, merge nem deploy.
2. Banco: só o Supabase local. Mudança de banco entra como migração nova em supabase/migrations/. Não rode nada contra o banco remoto e não apague dados.
3. Dependência nova só se for indispensável, com o motivo anotado no PROGRESSO.md.
4. Não mexa no que não está no manifesto.

Ordem
Etapa 1 (seção 1 do manifesto), etapa 2 (seção 3), etapa 3 (seção 4), etapa 4 (seção 5), etapa 5 (seção 6). Na etapa 4, escreva o plano de cada item no PROGRESSO.md e siga sem esperar aprovação. No item 4.2, implemente e marque "falta teste com 5 membros acima de 60 anos". A seção 9 do manifesto não é para executar.

Para cada item
1. Implemente.
2. Rode o typecheck e o build do projeto (scripts do package.json). Só faça commit se passarem.
3. Um commit por item: "Service v7 · <número> <resumo>".
4. Marque [x] no PROGRESSO.md com o commit curto.
Se um item travar depois de 3 tentativas, ou depender de algo que não existe, desfaça as mudanças daquele item (git restore), registre em Bloqueios o motivo e o que falta, e passe para o próximo. Nunca deixe a branch com o build quebrado.

Memória
O PROGRESSO.md é a sua memória. Se a conversa for compactada ou você perder o fio, releia o PROGRESSO.md e continue do primeiro item aberto.

Fim
Quando terminar (ou se precisar parar antes), rode a captura descrita em docs/service-v7/CAPTURA.md numa pasta nova com a data de hoje, compare com prints/service-2026-10-05 e preencha a tabela "Captura por etapa" e os itens da seção 8 do manifesto. Escreva no topo do PROGRESSO.md um resumo para eu ler de manhã: o que foi feito, o que travou e o que precisa de mim.
