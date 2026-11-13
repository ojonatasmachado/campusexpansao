---
id: Q21
titulo: Abertura do app instalado (PWA) fica em branco/preto por segundos
tipo: codigo
status: reservada
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
