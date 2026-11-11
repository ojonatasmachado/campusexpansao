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
- `evolucoes/service_app/service-app.css` (somente foco da região do Mural)
- `docs/service-v7/historias/M5-mural-foco-teclado.md`
- `docs/service-v7/historias/screenshots/M5-*.png`

## Pronto quando
- Região rolável do Mural alcançável por teclado, depois de confirmada.

## Validação
- Antes: a árvore DOM da tela `/service?maba=mensagens&mtela=mural` não tinha região rolável com `tabIndex`; a sequência de Tab pulava do menu inferior para o botão de voltar. A única publicação inicial não existia, então criei “Publicação teste M5” pelo formulário de gestão.
- Depois: Tab alcançou `.m-scroll` com `tabIndex=0`, `role=region`, `aria-label="Publicações do Mural"`; o DOM confirmou `overflow-y:auto`, `scrollHeight=1276`, `clientHeight=674` e contorno de foco sólido de 2px na cor da igreja.
- Axe encontrou uma violação moderada `region` (“All page content should be contained by landmarks”); o teste DOM de foco foi o critério funcional pedido. Não descrevo o axe como limpo.
- Foto aberta: `docs/service-v7/historias/screenshots/M5-mural-foco.png`, 390×844, com publicação visível e foco no contêiner rolável. `__medir(44)`: 5 ações, 273 palavras, acima do limite do app de 12 ações/80 palavras por causa do texto longo usado para forçar rolagem. MD5 `90268f9e4d92ff00f0ae5791ce6e5f63`. Selo do Next ausente; animações concluídas antes da captura.
- Limpeza local: apaguei a publicação temporária e registros de leitura pelo ID `762ff224-69fe-46be-82f6-ab0462b0685f`; consulta final retornou `remaining_test_announcement=0`.
- `npx tsc --noEmit -p .`, ESLint em `Mural.tsx` e `scripts/check-service-componentes.ts`: passaram.

## Notas
O contêiner rolável recebe semântica e foco apenas enquanto Mural está montado; o efeito restaura os atributos anteriores ao sair da tela. A linha M5 ainda consta no índice de PENDENTES porque as reservas simultâneas I5 e I2 também incluem esse arquivo, portanto sua edição será coordenada na história I2 sem sobrepor os trilhos.
