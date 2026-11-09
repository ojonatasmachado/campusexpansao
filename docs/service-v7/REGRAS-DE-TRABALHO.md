# Regras de trabalho (aprendidas com erros reais deste projeto)

Valem para toda sessão que trabalha numa história do Service. Cada regra existe porque já foi quebrada.

## 1. Relatório só com prova
- Nunca escreva "feito", "concluído" ou ✅ sem prova. Para cada item pedido, mostre o comando e a saída, ou a foto aberta: abra a imagem.
- Antes de relatar, releia o prompt item por item e monte uma tabela: item, feito ou não, prova. O que não fez entra como "não feito" e o motivo.
- Já aconteceu: o relatório disse "status feita", "culto com cronograma", "12 times" e "servidor encerrado", e nada disso era verdade.

## 2. Fotos
- Abra por http://localhost (nunca 127.0.0.1). Depois do login, espere um texto visível da tela (ex.: "Precisa de você"), nunca `waitForURL(/\/service/)`.
- Esconda o selo do Next e feche o tour antes da foto.
- Salve em `docs/service-v7/historias/screenshots/`, nunca em /tmp. Para cada foto, abra a imagem e descreva o que aparece.
- Se o prompt pede um dado (cronograma, 12 times, nome longo), confira na foto que ele aparece. Se não aparece, a foto não vale.
- A foto tem que mostrar a tela que a história mudou, aberta (ex.: o drawer do culto na aba Panorama), não a página de onde ela se abre. Já aconteceu: "fotos com cronograma e 12 times" eram só a lista da Agenda.
- Teste o fluxo pela tela (cliques), não chamando a função do banco direto.
- O script de foto falha se não achar o botão ou o texto esperado: nada de `if (botao) clicar` que pula em silêncio, nada de `waitForTimeout`; use `getByRole(...).click()` e `expect(...).toBeVisible()`. Já aconteceu: o script procurava "Culto de domingo", que não existia na semana, e as cinco fotos saíram da Agenda e do Início.

- Antes de commitar uma foto, abra a imagem: tela de erro do Next, 404 ou login não é foto. Já aconteceu: a E1 commitou duas fotos da tela "URL and Key are required" e relatou "fotos capturadas".
- Cada foto é tirada, nunca copiada de outra, e o md5 de todas vai no relatório. Já aconteceu: na M1 a foto "Desfazer restaurado" era cópia byte a byte da "depois", e a "sem pendentes" nunca foi tirada de novo.
- Não force a medida com CSS (`max-height`, `overflow: hidden`) para caber na dobra: o conteúdo vaza por cima do próximo. Se não cabe, escreva os números e pare. Já aconteceu na M1.

## 2b. Números
- Compare cada número medido com o limite da lei 13 e escreva os dois. Acima do limite é "fora da lei", nunca "dentro". Já aconteceu: 37 ações em 1366 (limite 25) relatado como "dentro da lei".
- Meça a mesma tela da foto, sempre com `scripts/medir-densidade.js` (`__medir(44)` no app, `__medir(24)` no painel). Contagem feita à mão não vale. Já aconteceu: na M1 a sessão contou todos os botões e todo o texto da página (17/98); o medidor deu 15/68.
- Número sem a foto da mesma tela não vale. Pesquisa de mercado só com fonte: nota, avaliações e números de concorrente sem link não entram. Já aconteceu: "Voluts 4,95★ em 6.680 avaliações" era inventado (eram 48).

## 3. Ambiente
- Trabalhe só no worktree da história. Nunca no checkout principal (nada de servidor, reset, clean, `git add -A` ou stash sem nome lá).
- use sempre npm run dev:local; npm run dev aponta para produção pelo .env.local
- Nunca rode `supabase db reset` sem pedir antes.
- Encerre o servidor que você subiu antes de relatar, e mostre que a porta ficou livre. Já aconteceu: a E1 deixou o servidor ligado 40 minutos, sem env, e as fotos saíram dele.

## 4. Documentos
- Edite só as linhas necessárias. Nunca reescreva um documento inteiro (o PENDENTES.md já foi apagado assim).
- Fechar história = no próprio arquivo da história: `status: feita`, arquivos novos no trilho, uma linha em "## Notas". Não crie arquivos novos para isso. Tire a história do PENDENTES.md.
- Arquivos de trabalho e scripts improvisados ficam fora do git. Medição usa `scripts/medir-densidade.js`. Nada de dependência nova no package.json para tirar foto. Já aconteceu: a E1 commitou 4 scripts e @playwright/test.

## 5. Código do Service
- Procure a peça em `docs/service-v7/BIBLIOTECA.md` antes de escrever markup. Não escreva CSS de tela que imita uma peça (borda, fundo e padding num botão): use a peça ou acrescente uma prop nela.
- Cor só por variável, sem hex nem reserva em hex. Nunca `outline: none` no foco. Nada de `style={{ color: ... }}`.
- Não copie o mesmo bloco em dois arquivos: vira um componente.
- `Selo` sem texto é só cor: sempre escreva o estado dentro (`<Selo tom="ok">Confirmado</Selo>`). Nunca ponha `Botao` dentro de `Acao` (botão dentro de botão).
- Ao trocar um componente, apague o import antigo e, se ficou sem uso, o arquivo. Mostre o grep.
- Formate o que tocou (indentação quebrada já passou duas vezes).
- Não mude classe global (ex.: `.seg`, `.drawer-body`) para resolver um caso: isso muda todas as telas. Faça uma prop no componente e use só onde precisa. Se mudar algo global, fotografe outra tela que usa a mesma classe. Já aconteceu: o `.seg` ganhou espaço vazio nas pontas em todo o Service.

## 6. Quando se perder
- Se perder o contexto, releia o arquivo da história, a proposta e o último prompt. Não pergunte de novo o que já foi decidido.
- Se uma tentativa falhar duas vezes do mesmo jeito, pare e relate o bloqueio com o erro, em vez de tentar um terceiro jeito parecido.
