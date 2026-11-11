---
id: M5
titulo: Dar foco por teclado à região rolável do Mural
tipo: codigo
status: feita
quem: codex
desde: 2026-11-11
branch: historia/M5-mural-foco-teclado
depende: []
tamanho: P
---

## Por quê
O axe apontou em 20/10 uma região rolável do Mural do membro sem foco por teclado. Em membro/Mural.tsx:50 há tabIndex={-1} só no artigo, e a região rolável ainda não foi confirmada.
Fonte: AUDITORIA-UI-2026-10-20.md seção 4.

## Arquivos (trilho)
- `app/service/membro/Mural.tsx`
- `app/service/MobileApp.tsx`
- `evolucoes/service_app/service-app.css` (somente foco da região do Mural)
- `docs/service-v7/historias/M5-mural-foco-teclado.md`
- `docs/service-v7/historias/screenshots/M5-*.png`

## Pronto quando
- Região rolável do Mural alcançável por teclado, depois de confirmada.

## Validação
- Antes: a árvore DOM da tela `/service?maba=mensagens&mtela=mural` não tinha região rolável com `tabIndex`; a sequência de Tab pulava do menu inferior para o botão de voltar. A única publicação inicial não existia, então criei “Publicação teste M5” pelo formulário de gestão.
- Antes da correção, o efeito do Mural trocava o `role="main"` de `.m-scroll` por `role="region"`, causando uma violação de landmark no axe.
- Depois: `.m-scroll` mantém `role="main"`, recebe `tabIndex=0` e nomeia-se pelo `h1` ativo com `aria-labelledby="m-screen-title"`. No Mural, o nome acessível é “Mural da igreja”, `overflow-y:auto`, `scrollHeight=1244`, `clientHeight=674`; Tab a partir de Voltar chega ao contêiner e `:focus-visible` mostra contorno sólido de 2px. No axe do Mural: `violations: []`. Na Agenda, Tab também chega ao contêiner focado e nomeado “Agenda”; axe não reporta violação de landmark (há 16 nós em `color-contrast`, não relacionados a landmark).
- Foto aberta: `docs/service-v7/historias/screenshots/M5-mural-foco.png`, 390×844, com publicação visível, foco verde no contêiner rolável e selo do Next ausente. A animação estava parada. `__medir(44)`: 5 ações e 272 palavras, acima do limite do app de 12 ações/80 palavras devido ao texto longo da publicação temporária usado para confirmar rolagem. MD5 `980e7c823032a226bdf1f4d1460e6a9a`.
- A publicação temporária “Publicação teste M5” foi criada pelo formulário e removida, junto com os registros dependentes. Consulta final: zero publicações com esse título.
- `npx tsc --noEmit -p .`, ESLint em `MobileApp.tsx` e `Mural.tsx` e `scripts/check-service-componentes.ts`: passaram.

## Notas
Todo contêiner rolável do app do membro recebe foco e nome pelo título atual da tela; a região principal continua sendo `main` em todas as abas.
