---
id: Q14
titulo: Distinguir erro de rede de falta de permissão em EntradaConfig
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-10
branch: historia/Q14-entrada-config-erro
depende: []
tamanho: P
---

## Por quê
EntradaConfig trata qualquer falha de entrada_config como "sem permissão", mostrando a mensagem de restrição mesmo quando a causa é erro de rede ou banco. A gestão não sabe se foi bloqueada ou se algo falhou, e não tem como tentar de novo. Origem: seção 3 do PENDENTES.

## Arquivos (trilho)
- `app/service/modules/entrada/EntradaConfig.tsx`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/Q14-entrada-config-erro.md`
- `docs/service-v7/historias/screenshots/Q14-*.png`

## Pronto quando
- Carregando, erro e sem permissão distinguíveis na tela.
- Erro de rede/banco mostra mensagem honesta e botão Tentar de novo.
- Sem permissão de verdade mantém a mensagem atual ("Só a gestão e os pastores...").
- Resposta atrasada não sobrescreve estado mais recente (ref de carga).
- Peças da biblioteca (Carregando, ErroEstado); fotos dos três estados, medidas na mesma tela, abertas e com md5.
- Checks e CI Service verdes; PR para main sem merge e porta livre.

## Causa e decisão
A função entrada_config retorna null tanto para "sem permissão" (_entrada_gestao falso) quanto para "link não existe". Erro de rede/banco vem no objeto error do Supabase client. O código atual faz setCfg(error || !data ? null : ...), tratando ambos como cfg === null e renderizando a mensagem de restrição.

Estados explícitos carregando, erro e pronto. Só pronto com data !== null renderiza a config. Erro usa ErroEstado com Tentar de novo. Sem permissão (data === null sem error) mantém a mensagem atual. Ref de carga descarta resposta antiga após nova tentativa, seguindo o padrão da Q12.

## Notas
Reservada em 10/11/2026 por claude. Referência: Q12 (NovosCadastros) corrigiu o mesmo problema com o mesmo padrão.