---
id: Q8
titulo: Criar endereço real por tela do painel
tipo: codigo
status: feita
quem: codex
desde: 2026-10-24
branch: historia/Q8-endereco-painel
depende: []
tamanho: G
---

## Por quê
ServiceExactApp.tsx:215 guarda a rota em useState. Por isso não há links diretos, e voltar do navegador sai do painel. O FormScreen já grava uma entrada de histórico por formulário.
Fonte: PLANO_TELA_FORMULARIO.md seções 6 e 9; REVISAO-COMPONENTES (ServiceExactApp.tsx:207).

## Arquivos (trilho)
- `app/service/ServiceExactApp.tsx`
- `app/service/page.tsx`
- `app/service/painel/tipos.ts`
- `app/service/lib/panel-navigation.ts`
- `app/service/lib/use-panel-navigation.ts`
- `scripts/check-service-panel-access.ts`
- `scripts/check-local-panel-navigation.ts`

## Pronto quando
- Cada tela do painel tem endereço próprio.
- Link direto abre a tela.
- Voltar do navegador navega dentro do painel.
- Respeita o manifesto (casca estável, lei 1).

## Notas
ABERTO. Mexe na casca do painel, então precisa respeitar o manifesto.

2026-10-24, Codex. Trilho ampliado após conferir a reserva I10 do Claude, sem sobreposição. URL por tela em /service?ptela=<id>, preservando parâmetros independentes e o estado interno do Next. Destino direto vem do servidor; validação continua pelo registro, papel e módulos. Verificar voltar/avançar e o histórico existente de FormScreen, sem redesenho ou mudança da casca.

Concluída em 24/10/2026. Cada tela tem URL /service?ptela=<id>. O servidor passa o destino inicial; um link direto do painel prevalece sobre a preferência de abrir o app, enquanto links do membro/notificação continuam no app. O hook valida a tela contra as rotas efetivamente ligadas e permitidas, substitui destinos inválidos/revogados por alternativa autorizada e sincroniza voltar/avançar. Navegações preservam o estado interno do Next, parâmetros independentes e hash, sem duplicar a entrada ao clicar na tela atual. O histórico de FormScreen continua independente. Não há novo layout, menu ou tela; nenhuma mudança em consultas ou RLS.

Verificado em Chromium autenticado com Supabase descartável e fixtures canônicas: 40 cenários passaram. Link direto e recarga; histórico por clique; mesmo destino sem duplicação; voltar/avançar; formulário limpo fecha antes de sair da tela dona; formulário alterado confirma descarte e mantém dados ao continuar; endereços de todos os 30 IDs conhecidos; destino inválido; módulo Kids desligado; configurações negadas ao líder em viewport móvel. Master começou com preferência app para comprovar prioridade do endereço. Nenhuma exceção pageerror no contexto principal. Resultado local prints/q8-navegacao/resultado.json; log /tmp/cex-Q8-browser-final.log. Projeto cex-rls-3f8ce1932c7d descartado, sem contêiner restante.

Também passaram typecheck, lint, leis 12/17, contraste, 13 contratos (incluindo parâmetros, destinos inválidos e revogação no teste de acesso) e build de produção com credenciais fictícias. Primeira tentativa do navegador executou zero cenários por prazo de recarga do schema; segunda parou na compilação inicial de /service com o prazo de navegação de 30s. Ambas descartaram seus bancos. Teste corrigido para esperar DOMContentLoaded, com prazo de navegação de 120s. Build iniciado no sandbox ficou parado e foi interrompido; repetição com permissão local concluiu.

Limites: navegador headless em desktop 1366x860 e viewport móvel 390x844, sem aparelho real, Safari ou leitor de tela. Não houve comparação visual ou medição de densidade: nenhum markup ou estilo de tela foi alterado. Execução autenticada em modo de desenvolvimento; build de produção validado separadamente. Os testes não enviam convites, mensagens ou notificações externas.

A primeira prévia falhou: o teste importava tipos do Playwright pela dependência da ferramenta de captura, ausente no build da Vercel. Reproduzido localmente sem essa dependência (TS2307). O carregamento passou a ocorrer somente em runtime pelo package.json da captura. Typecheck/lint repetidos sem Playwright instalado; carregamento runtime conferido com a dependência disponível. Nenhum código de navegação ou cenário mudou nesta correção.
