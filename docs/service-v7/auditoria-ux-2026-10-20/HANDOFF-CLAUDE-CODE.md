# Continuação no Claude Code

Atualizado em 21/10/2026. Este documento é o ponto de entrada para retomar a auditoria do Service. Leia também `CONTINUIDADE.md`, `STATUS.md` e o `AGENTS.md` integralmente. O relatório original é diagnóstico histórico; não representa sozinho a versão atual.

## Objetivo e decisão mais recente

Continuar a revisão das jornadas do Service: clareza, prioridade de ações, conexão entre pastor, liderança, voluntário e membro, acessibilidade, celular e igrejas internacionais. A auditoria ampla continua parcial.

Decisão explícita do usuário: **se uma área não está disponível ao usuário, nem sua opção deve aparecer**. Aplicar em menu, atalhos, busca e links internos. Uma mensagem de acesso negado é defesa para links antigos, não substitui ocultar a entrada. Não conceder permissão para fazer um botão funcionar.

O usuário já autorizou corrigir, testar, documentar, fazer commits, push e publicar, sem confirmações repetidas para o trabalho já definido. Uma entrega por problema. Preservar a casca de quatro abas e o registro único de módulos. Usar `ui-ux-pro-max` para trabalho de interface e consultar Brand Book/Brand Library conforme AGENTS.

## Onde continuar sem perder trabalho

- Repositório principal: `/Users/macbook/campusexpansao`. Tem alterações locais de outras frentes. Não limpar, sobrescrever ou usar `git add -A` nele.
- Worktree usado nas entregas: `/tmp/cex-fuso-release-20261021` (caminho real `/private/tmp/cex-fuso-release-20261021`).
- Branch: `fix/service-fuso-20261021`. Código também enviado a `main`.
- Antes de editar: `git status --short`, `git fetch origin`, comparar com `origin/main`. Se houver avanço remoto, integrar preservando alterações existentes.
- Servidor temporário de desenvolvimento em 3005 e Chrome/CDP em 9334 foram encerrados. Fixtures temporárias de `app/service/demo/page.tsx` foram restauradas.
- Capturas, decisões e resultados persistentes estão em `implementacao/`. Arquivos auxiliares em `/tmp` são descartáveis.

## Publicação confirmada

Último código publicado: `fa4f3669b5abb6ee8f6c05e6f7287cb5cb446f6b`, em main e fix/service-fuso-20261021. Service CI `39710681893` e `39710681973`: success. Produção `39710681916`: success. Vercel `dpl_81iNKZBiDvT4L38k5mU7QPMgSWvW`: READY, com campusexpansao.com.br e www associados. Nenhuma migração nova. Este handoff é uma atualização documental posterior, sem mudança de código.

## O que foi entregue nesta retomada

| Entrega | Commit | Resultado |
| --- | --- | --- |
| Etapas pendentes da Caminhada | `00e03a3` | Número da etapa substitui marcador vazio; estados e organização preservados |
| Menu Mais | `0c703c1` | Agrupado pelos grupos do registro, sem nova navegação paralela |
| Mural | `9bf601e` | Público explícito, revisão antes de publicar e minutos do agendamento preservados |
| Primeira igreja | `dfadcb4` | Formulário com padrão de autenticação e recuperação de falha sem perder dados |
| Acessos do painel | `68d7ef8` | Atalhos e ajuda filtrados, montagem de rotas por acesso, permissão do painel respeitada, contrato panel-access no CI |
| Entradas indisponíveis | `fa4f366` | Busca filtra entidades e escopo de times; aniversário exige rota; links de fichas negadas viram texto em Saúde, Cuidado e Aniversariantes; rota inicial negada abre uma permitida para qualquer papel |

As entregas anteriores à última já tiveram CI success e produção READY; IDs completos em `CONTINUIDADE.md`. Os diretórios `implementacao/acessos/` e `implementacao/entradas-permitidas/` explicam as últimas mudanças. Nenhuma migração nova nessas duas correções.

Arquivos da última correção:

- `app/service/ServiceExactApp.tsx`: busca, aniversário e rota inicial.
- `app/service/painel/telas/Inicio.tsx`: disponibilidade de ficha passada aos blocos.
- `app/service/modules/inicio/Saude.tsx`.
- `app/service/modules/cuidado/Cuidado.tsx`.
- `app/service/modules/aniversarios/Aniversariantes.tsx`: bloco semanal e tela mensal.

Os dados e ações próprios de uma área autorizada permanecem. Exemplo: aniversário continua visível se autorizado, mas o nome deixa de abrir a ficha quando Pessoas não está disponível. Não confundir essa alteração de interface com certificação das políticas do banco.

## Verificações feitas

Última correção: typecheck, lint sem erros (dois avisos preexistentes em ServiceExactApp), Lei 12, contraste, 13 contratos de jornada e build aprovados localmente.

Fixtures de interface verificaram liderança, master, pastor, membro com acesso extra, módulos desligados e liderança com escopo só do time. Busca negada inspecionada em 320, 390 e 1280 px, temas claro/escuro reais e sem rolagem lateral. Saúde manteve quatro nomes sem links de ficha; Cuidado e aniversário mantiveram nomes sem esses botões. Nenhuma mensagem foi enviada. JSON e PNG estão em `implementacao/entradas-permitidas/`.

Entregas anteriores incluíram Caminhada com fonte ampliada, menu em mobile/desktop, Mural com retorno preservando preenchimento, falha de rede no cadastro e as quatro abas de igreja sem conteúdo. Ver detalhes e limites em CONTINUIDADE. Não refazer testes aprovados sem mudança que os afete.

Comandos de referência:

```bash
npx tsc --noEmit -p .
npx eslint <arquivos-alterados>
npx tsx scripts/check-service-lei12.ts
npx tsx scripts/check-theme-contrast.ts
for check in fuso avisos-fuso ativacao civil-date cnpj demo-datas endereco geo-cpf member-navigation panel-access semana telefone times-recebimento; do
  npx tsx "scripts/check-service-${check}.ts" || break
done
npm run build
```

Build local usou as variáveis fictícias do CI, todas apontando a `http://127.0.0.1:54321` e chaves `ci`, sem credencial de produção. Leia `.github/workflows/service.yml` para o contrato exato. Dependências precisam estar no próprio worktree; Turbopack rejeitou symlink externo.

## Pendências em ordem sugerida

1. **Ações do Início sem navegação.** Revisar aprovar caminhada, registrar cuidado e respostas, por papel, módulo e dependências. A última correção cobre entradas e montagem de telas; não certifica toda ação de todo módulo. Conferir também links internos restantes em áreas permitidas que apontam a áreas negadas.
2. **Matriz autenticada.** Completar cenários reais de papéis, módulos e escopos entre igreja, líder e membro. Fixtures de demo não comprovam RLS, gravação, upload ou notificações reais. Isolar dados antes de testes que escrevem.
3. **Convite e primeiro acesso do membro.** Percorrer aceite, senha, endereço, dados essenciais, próximo passo e retorno, com igreja vazia e com conteúdo. A verificação visual de igreja vazia não encerra toda essa jornada.
4. **Densidade dos módulos.** Financeiro, Visitantes, Crianças, Cursos e outras telas ainda têm revisão parcial; priorizar evidência de ação confusa, duplicada ou sem continuidade. Consultar STATUS/JORNADAS-E-CONEXOES antes de repetir investigação.
5. **Acessibilidade em aparelho.** Safari/PWA real, teclado aberto, área segura, fonte do sistema e leitor de tela. Não há certificação completa.
6. **Internacionalização.** Idioma, moeda e regras locais ainda pendentes. Telefone, endereço exterior, CNPJ alfanumérico e fuso já têm entregas e contratos.
7. **Caminhada.** Reorganização interna em novos grupos permanece hipótese, não implementação pendente já decidida. Não mudar a casca sem evidência e decisão registrada.

## Cuidado obrigatório com teste local legado

**Não executar `scripts/check-local-rls.ts` no ambiente local compartilhado atual.** Nesta retomada ele foi executado antes de identificar que reseta requisitos e pedidos das fixtures e altera o bairro de um membro. Leituras iniciais passaram, mas o contrato antigo de Quero servir falhou e interrompeu a limpeza. Removidos por IDs exatos dois cursos e três requisitos criados. Não havia snapshot dos requisitos anteriores: não afirmar restauração integral. Detalhes em `implementacao/acessos/README.md`.

Antes de reutilizar, modernizar o contrato e implementar banco isolado ou snapshot/restauração garantida. O erro não é aprovação de RLS, e repetir o script pode destruir dados locais de outra frente. Nenhuma mutação direta desse teste foi feita no banco de produção.

## Publicação e limites

Fluxo atual integrado de `origin/main` pela PR #9 (`9fc6b50`): `.github/workflows/producao.yml` aplica/verifica Supabase e só então chama o deploy hook. O deploy automático de main na Vercel foi desligado em `vercel.json`. Não pular banco antes de código com redeploy manual.

Enviar arquivos explícitos em commit, push a main e à branch de continuação, monitorar os workflows Service e Produção e a implantação Vercel até READY. Registrar IDs no fechamento. Não inserir tokens em comandos, documentação ou saída.

Navegador integrado falhou com `missing field sandboxPolicy`; foi usado Chromium local/CDP. Inspeção local com chaves fictícias pode gerar erro de endpoint de métricas; não declarar console inteiro limpo. Capturas de demo não comprovam produção autenticada. Preservar a distinção entre evidência visual, teste de contrato, hipótese e validação no banco.

## Prompt para iniciar

> Leia AGENTS.md integralmente e depois este HANDOFF, CONTINUIDADE.md e STATUS.md. Preserve alterações de outras frentes. Confirme Git e estado da publicação antes de editar. Continue pela revisão das ações do Início e entradas internas com acesso negado, em uma jornada por vez. Opção indisponível não aparece. Teste, registre evidência e limites, faça um commit por problema e siga o fluxo banco antes de código até CI success e deploy READY. Não execute check-local-rls.ts sem isolamento/restauração.
