# Service: o que falta fazer

Fonte única do trabalho pendente do Service, para qualquer agente (Claude Code, Codex) ou pessoa. Cada item é uma **história** em `docs/service-v7/historias/<ID>-<slug>.md`, pequena o bastante para uma entrega e com a lista dos arquivos que pode tocar (o **trilho**). Duas frentes trabalham ao mesmo tempo sem se atrapalhar porque cada uma pega uma história, num branch próprio, só dentro do trilho dela.

Este arquivo substitui `auditoria-ux-2026-10-20/HANDOFF-CLAUDE-CODE.md` e as listas de "próximo" e "ordem de continuação" de `STATUS.md` e `CONTINUIDADE.md`, que passam a ser só diário do que foi feito. Levantamento de 22/10/2026, conferido no código de `main`: o que já está pronto ficou de fora de propósito, para não ser refeito.

## Estado agora

```bash
npx tsx scripts/historias.ts          # todas: LIVRE, RESERVADA (por quem), espera X, esbarra em Y
npx tsx scripts/historias.ts livres   # só as que dá pra pegar agora
```

O estado vivo não fica escrito aqui. A trava é o branch `historia/<ID>-<slug>` no GitHub: se ele existe, a história está reservada. O script lê a história de dentro de cada branch, então mostra quem está nela, desde quando e o trilho em uso.

## Como pegar uma história

O campo "quem" é `codex` ou `claude`. As fotos saem de `tools/captura-service/foto.mjs`.

1. Ler `AGENTS.md` inteiro. Rodar `npx tsx scripts/historias.ts livres` e escolher a primeira da ordem abaixo que estiver LIVRE e for do seu tipo (decisão é do usuário; o agente só prepara as opções).
2. Reservar, num worktree novo a partir do `main` atualizado:
   ```bash
   git fetch origin
   git worktree add -b historia/E1-escalas-por-time .claude/worktrees/E1 origin/main
   ```
   No arquivo da história, preencher `status: reservada`, `quem`, `desde` e `branch`. Commitar só esse arquivo (`historias: reservar E1 (claude)`) e **dar push do branch na hora**. O push é a reserva.
3. Se o push falhar porque o branch já existe, ou se `historias.ts` passar a mostrar a história reservada por outro, desistir e escolher outra. Nunca trabalhar no branch de outra frente.
4. Executar dentro do trilho. Precisou de um arquivo fora dele? Antes de tocar, rodar o script e conferir que nenhuma história reservada lista esse arquivo; então acrescentar o arquivo ao trilho num commit só da história.
5. Terminar: no arquivo da história, `status: feita` e uma linha em Notas com o que foi verificado e o que ficou de fora (o que sobrar vira história nova, com o próximo número da área). Remover a linha dela da ordem abaixo. Abrir PR para `main` com o código e esses dois arquivos.
6. CI verde e merge. O merge publica: `producao.yml` aplica migrações e só depois faz o deploy. Acompanhar até a Vercel ficar READY. O branch é apagado no merge e a reserva some sozinha.

## Regras de convivência

- **Nada de commit no `main` fora de PR.** Todo push no `main` publica em produção, inclusive os de documentação.
- **Uma história por branch, um branch por frente.** Não juntar duas histórias numa entrega.
- **Checkout principal intocado.** `/Users/macbook/campusexpansao` tem trabalho solto de outras frentes: nada de `reset`, `clean`, `git add -A` ou `stash` sem nome ali. Sempre worktree.
- **Arquivos de casca** (`app/service/ServiceExactApp.tsx`, `MobileApp.tsx`, `modules/registry.ts`, `evolucoes/service_app/service-app.css`) aparecem em muitos trilhos. Quem pegar, mexe só no trecho do seu módulo. Se duas reservadas precisarem do mesmo trecho, a segunda espera.
- **Verificação antes do PR**, conforme `.github/workflows/service.yml`: typecheck, lint dos arquivos alterados, lei 12 (`scripts/check-service-lei12.ts`), contraste dos temas, contratos e build. Em tela, `scripts/medir-densidade.js` antes e depois (leis 13 a 16). Banco local com volume: `scripts/seed-local-service.ts` e depois `scripts/seed-local-volume.ts`. Nunca credencial de produção em teste local.
- **Sem prova, não está feito.** Captura de demo não vale como validação de banco, de aparelho real ou de leitor de tela. Diga o que não foi verificado.

## Ordem sugerida

A ordem vai do que destrava mais para o que destrava menos. Decisões do usuário vêm primeiro porque travam várias histórias de código.

### 1. Decisões do usuário (o agente prepara as opções e registra a resposta)
- **M6** Reorganização interna da Caminhada (só com evidência)
- **D4** Capítulo "Interface do Service" no Brand Book (galeria viva pronta em /service/demo/biblioteca)

### 2. Leveza, liberada pelo D1 em 28/10 (maior ganho para quem usa)

### 3. Qualidade que protege o resto
- Links de texto (variante texto, panel-link e m6-link): revisar a hierarquia e o uso da cor da igreja; fora da Q13 por decisão do usuário.

### 4. Código independente (dá para tocar em paralelo, se os trilhos não esbarrarem)
- **I2** Ações do Início que não navegam · **I5** Ajuda com menos repetição
- **M2** Setas nos botões do membro · **M3** Retorno e recarga · **M5** Foco no Mural · **I7** Quadros no toque
- **N2** Integração final de idiomas e moeda (base N1 entregue com recursos desativados) · **F1** Financeiro fases 3 e 4 · **O1** Culto avulso no estilo do assistente
- **I3** Revisão de UI das telas densas (I9 e D1 feitos)
- **M7** Aba Meus times para quem lidera (decisão D2) · **E7** Faltou pelo check-in (decisão D5)
- **Onda 1 da D6:** **O8** Quero fazer parte · **O9** Convidar amigo · **O10** Programação que se repete · **O11** Juntar duplicados

### 4b. Evolução da jornada do mapa (decisões de 04/11, `mapa/PLANO.md` §10)
Ordem por dependência; G3 cancelada (sem avisos automáticos de expansão).
- **G12** Analisar (espera G1 para a idade) · **G8** Camadas do IBGE (espera G1)

### 5. Verificações em código e banco local
- **E5** Troca de escala ponta a ponta · **M4** Convite e primeiro acesso
- **O6** Kids e Financeiro com volume · **Q4** Push e imagem com serviços reais

- **A4** Ponto branco · **Q9** Seletores acessíveis

### 6. Precisam de aparelho, pessoas ou dados de fora
- **O7** Kids com famílias reais (continuação externa da O6)
- **A1** iPhone e PWA · **A2** Cinco membros acima de 60 anos · **A3** Leitor de tela e teclado · **A5** Pessoas representativas
- **O2** Cinco igrejas no assistente · **G1** IBGE e CNEFE por município · **G2** Mapa ao vivo

### 7. Arrumação do repositório
- **Q11** Fluxo de produção, PRs e os arquivos soltos do checkout principal
