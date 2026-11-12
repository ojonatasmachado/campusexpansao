---
id: M3
titulo: Persistir formulário e posição ao retornar
tipo: codigo
status: feita
quem: claude
desde: 2026-11-12
branch: historia/M3-retorno-recarga
depende: []
tamanho: M
---

## Por quê
Ao voltar ou recarregar, o app perde formulário preenchido, posição de leitura, conversa ou folha aberta. Aba, subtela e alvo de aviso ou tarefa já voltam.
Fonte: STATUS.md F22.

## Arquivos (trilho)
- `docs/service-v7/historias/M3-retorno-recarga.md`
- `app/service/lib/retorno.ts` (novo: `useRascunho`, rolagem, `limparRetorno`)
- `app/service/lib/member-navigation.ts` e `scripts/check-service-member-navigation.ts` (`mconversa`, `mevento`)
- `app/service/MobileApp.tsx` (só folha, conversa, rolagem e restauração)
- `app/service/membro/Conversas.tsx`, `app/service/membro/Caminhada.tsx`, `app/service/modules/oracao/Oracao.tsx` (rascunhos)
- `app/service/ServiceExactApp.tsx` (só `limparRetorno()` nas saídas da conta e o retorno falso dos envios)
- `app/service/onboarding/PedidoEmEspera.tsx` (só `limparRetorno()` na saída)
- `app/service/membro/tipos.ts` (envio devolve false quando não grava)
- `docs/service-v7/PENDENTES.md` (tirar a M3 da ordem)
- `docs/service-v7/historias/screenshots/M3-*.png`

## Pronto quando
- Formulário, posição de leitura, conversa e folha aberta voltam após retorno e recarga.

## Notas
Antes: aba, subtela e alvo de aviso ou tarefa já voltavam.
- 12/11 (claude): rascunho (mensagem da conversa, nova conversa, pedido de oração, pedido de etapa) em `sessionStorage` por pessoa, apagado só quando o envio grava e na saída da conta; conversa (`mconversa`) e folha do evento (`mevento`) na URL, só com ID; rolagem por tela, na recarga e no Voltar (troca de aba continua no topo). Teste pela tela (390×844, Supabase local, conta membro@teste.local): 11 PASSOU, 0 erro de console — conversa volta como subtela com o rascunho; enviar apaga o rascunho; fechar a conversa e usar o Voltar do navegador não a reabre; rolagem 122px→122px na recarga e no Voltar; folha "Culto da manhã" volta e sai da URL ao fechar; pedido de oração volta; sair da conta apaga tudo (2 itens → 0). Fotos `screenshots/M3-conversa-recarga.png` (md5 ac553d64), `M3-rolagem-recarga.png` (9abc8260), `M3-evento-recarga.png` (1c32038a), `M3-oracao-recarga.png` (dd78c8d2). `validar.sh`: TUDO PASSOU (28) e rotas `/service/login` e `/service` 200 no dev:local. Revisor: 6 achados, todos corrigidos. Sem mudança de layout, então sem medição de densidade. Decisão a validar: `sessionStorage` em vez de `localStorage` (privacidade do pedido de oração).
- Fora (próxima história): rascunho de Perfil, ausência, Kids e anotação da Bíblia; folhas sem ID natural (troca, aula, artigo, times) não voltam na recarga; a pré-visualização do líder (`mode="preview"`) não tem tela hoje, mas fica protegida pelo `RetornoContext`. Não testado em iPhone real nem com o app instalado (PWA).
