---
id: A1
titulo: Testar em celular real e PWA no iPhone
tipo: verificacao
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
Os ajustes de celular foram conferidos no navegador, não num iPhone real com o PWA. Falta checar zoom em campos, teclado, barra de status, puxar para atualizar, movimento reduzido e o Mapa.
Fonte: REVISAO-DESIGN.md "O que conferir num celular de verdade"; STATUS F15, F18; VALIDACAO.md :79-84; QUALIDADE-E-INTERNACIONAL.md seção 6; memória "teste em celular real".

## Arquivos (trilho)
- `docs/service-v7/historias/A1-teste-celular-real.md`

## Pronto quando
- Checklist inteiro marcado com evidência: botão sem flash e que encolhe; hover não fica preso; busca e campos sem zoom (iOS); folha de baixo arrasta para fechar; barra de status na cor do fundo; puxar no topo no PWA não recarrega; reduzir movimento, transparência e aumentar contraste; teclado aberto não cobre campo, erro ou ação; notificações; Mapa no celular.
- visualViewport.scale, altura visível e retângulos registrados antes, durante e depois.

## Notas
ABERTO, todos os itens sem marcar. O chat usa height calc(100dvh - 230px), que precisa ser conferido com teclado aberto.
O zoom (F15) segue como "mitigação implementada".
Trilho a definir na reserva.
