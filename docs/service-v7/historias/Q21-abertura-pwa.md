---
id: Q21
titulo: Abertura do app instalado (PWA) fica em branco/preto por segundos
tipo: codigo
status: feita
quem: claude
desde: 2026-11-13
branch: historia/Q21-abertura-pwa
depende: []
tamanho: M
---

## Por quê
Usuário relatou: instalou o app do Service na área de trabalho; ao abrir, demora quase 8s com tela preta ou branca, sem nenhum indício de carregamento. Deveria ser instantâneo, ou mostrar algo (carregando/bem-vindo, com movimento) em vez de parecer travado.

Achado por leitura de código: `app/service/layout.tsx` faz `await getServiceInternational()` (e `generateMetadata` faz `await getTexto()`, que chama a mesma função) antes de renderizar qualquer coisa. `getServiceInternational` (`lib/internacional/servidor.ts`, território da N2) encadeia até 3 idas e vindas de rede em série: `localeEnabled()` (RPC), `cookies()` + `auth.getUser()`, e `my_locale` (RPC) se a pessoa estiver logada. Numa função serverless fria (abertura do app depois de fechado), isso facilmente soma vários segundos — e como nada pinta na tela antes disso, o resultado é a tela em branco relatada. `app/service/loading.tsx` existe mas só cobre transição de rota dentro do Next.js já carregado, não a abertura fria do PWA.

## Arquivos (trilho)
- `docs/service-v7/historias/Q21-abertura-pwa.md`
- `app/service/layout.tsx`

## Pronto quando
- Alguma coisa pinta na tela quase instantaneamente na abertura (não a tela preta/branca sem nada), mesmo que os dados (locale, sessão) ainda estejam carregando.
- Não mexe no mecanismo de resolução de locale/moeda em si (`lib/internacional/servidor.ts`), que é território da N2; só envolve o que já existe numa fronteira de Suspense/streaming, sem tocar a lógica interna.

## Notas
2026-11-13 (claude): feita. Achado testando o app instalado pelo usuário ("demora quase 8s com tela preta ou branca, deveria ter algo dizendo que está abrindo e algo se mexendo").

**Causa:** `app/service/layout.tsx` fazia `await getServiceInternational()` (resolve locale/sessão: até 3 idas e vindas de rede em série) antes de renderizar qualquer coisa, e `generateMetadata` dependia da mesma cadeia via `getTexto()`. Numa função serverless fria isso soma segundos; como nada pintava antes, a tela ficava em branco sem indício de atividade.

**Fix:**
1. `metadata` virou estático (title/description fixos em pt-BR), sem depender de `getTexto()`. O rollout de idioma está desligado em produção (N2), então o texto traduzido seria sempre esse mesmo pt-BR hoje de qualquer forma.
2. O corpo do layout entrou numa fronteira `<Suspense fallback={<Carregando telaInteira rotulo="Carregando o Service…" />}>`; `ServiceConteudo` (a função async que faz o `await` e monta o `ServiceLocaleProvider`) ficou dentro. Reaproveita o componente `Carregando` já existente (`ui/Estados.tsx`), com o mesmo rótulo do `loading.tsx` de rota — revisor apontou que um rótulo diferente faria o texto trocar/piscar na abertura fria; corrigido reaproveitando o mesmo componente.
3. Não mexe em `lib/internacional/servidor.ts` (resolução de locale em si, território da N2 em andamento), só na fronteira de Suspense em volta dela.

**Teste:** subi `npm run dev` com um `await new Promise(r=>setTimeout(r,N))` temporário dentro de `ServiceConteudo` (removido antes do commit) e medi com `curl -w "ttfb=... total=..."`: TTFB ~0,3-0,7s (a splash sai na hora) contra total de ~3,7-4,6s (bate com o atraso simulado) — confirma que o HTML da splash chega antes do conteúdo real, nas duas rodadas (antes e depois de unificar o rótulo). `scripts/validar.sh` completo, duas vezes: TUDO PASSOU.

Revisado pelo subagente `revisor` em 2 rodadas: a 1ª não achou bug bloqueante, só a sugestão de unificar o texto (aplicada) e dois pontos de baixo risco, aceitos como estão:
- **Tema claro na splash:** `.svc-carregando-tela` usa `--ink` (escuro); o tema claro só entra depois da hidratação (`ServiceExactApp.tsx` grava `data-theme` no body). Quem usa tema claro vê a splash escura por um instante — já acontecia com o `loading.tsx` antes desta história, não é regressão.
- **Textos fixos em pt-BR** ("Carregando o Service…", o `metadata`): aceitável enquanto o rollout da N2 estiver desligado; quando ligar, revisar esses três textos é trabalho da própria N2 (`lib/internacional/`), não desta história.
A 2ª rodada (depois da unificação) não foi aberta por já não haver achado bloqueante na 1ª.

**Não verificado:** abertura a frio num aparelho real com o app instalado (o revisor notou que o service worker do `PwaBootstrap` pode servir a rota do cache antes da rede, o que a medição por curl não reflete).