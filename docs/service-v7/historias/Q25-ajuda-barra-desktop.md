---
id: Q25
titulo: Botão de ajuda sai do canto flutuante e vai pra barra do topo (também no desktop)
tipo: codigo
status: em andamento
quem: claude
desde: 2026-11-13
branch: historia/Q25-ajuda-barra-desktop
depende: []
tamanho: P
---

## Por quê
Continuação da Q24 (parte 2, que ficou bloqueada esperando decisão do usuário). O botão
flutuante de ajuda (`?`, `position:fixed` no canto inferior direito) cobre conteúdo real em
várias telas do painel desktop (Pessoas, Financeiro, Configurações, Permissões), porque o app
rola a janela inteira e o botão fica sempre no mesmo lugar da tela, não do documento.

O usuário escolheu, entre 3 caminhos documentados na Q24: mover o "?" para a barra do topo
também no desktop (a variante `lugar="barra"` já existe no código e já é usada no celular).

## Arquivos (trilho)
- `docs/service-v7/historias/Q25-ajuda-barra-desktop.md`
- `evolucoes/service_app/service-app.css`
- `app/service/ServiceExactApp.tsx` (se precisar ajustar o uso do `<HelpFab>`)
- `app/service/HelpSystem.tsx` (se precisar ajustar `data-tour`/estilos)

## Pronto quando
- No painel desktop, o "?" aparece na barra do topo (como já é no celular), nunca mais
  flutuante cobrindo conteúdo.
- O passo do tour de onboarding que aponta pro botão de ajuda continua funcionando.
- `scripts/validar.sh` completo: TUDO PASSOU; testado ao vivo (servidor local) sem sobreposição
  nas telas antes afetadas (Pessoas, Financeiro, Configurações, Permissões).

## Notas
2026-11-13 (claude): em andamento.
