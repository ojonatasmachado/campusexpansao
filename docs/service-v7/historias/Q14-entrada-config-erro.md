---
id: Q14
titulo: Distinguir erro de rede de falta de permissão em EntradaConfig
tipo: codigo
status: feita
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

## Validação visual
Captura pelo mesmo método de tools/captura-service/foto.mjs: login real master@teste.local, localhost:3112, 1366×860, espera de texto visível e networkidle, tour fechado, selo Next escondido e conferido, fontes e animações concluídas. Scripts de teste fora do repositório. __medir(24) na mesma tela de cada foto, primeira dobra sem rolagem.

| Foto aberta | O que mostra | MD5 |
|---|---|---|
| [Normal](screenshots/Q14-normal.png) | Configurações > Entrada com link, QR code, botão Gerar outro e seletor de regra | 2886bf2c7362bcc54466c1709cae062e |
| [Erro](screenshots/Q14-erro.png) | ErroEstado com "Não conseguimos carregar as configurações de entrada" e Tentar de novo | 19afba8f81e167192f33873bd8d1ab20 |
| [Recuperado](screenshots/Q14-recuperado.png) | Após clique em Tentar de novo, config recuperada com sucesso (idêntica ao normal) | 2886bf2c7362bcc54466c1709cae062e |
| [Sem permissão](screenshots/Q14-sem-permissao.png) | Mensagem "Só a gestão e os pastores mudam o link e a regra de entrada." (cfg=null sem erro) | 885d67152874727be9274d2f17fa1d22 |

Erro simulado via interceptação HTTP 503 na chamada entrada_config no navegador, sem alterar o banco. Sem permissão simulada via interceptação retornando null sem erro. Recuperação confirmada após remover interceptação e clicar em Tentar de novo.

## Banco e verificações
TypeScript: zero erros em EntradaConfig.tsx (21 erros pré-existentes no origin/main em outros arquivos). ESLint: saída 0. Lei 12 estática: nada piorou. Componentes da biblioteca: ok. Contraste dos temas: ok. Merge com origin/main: already up to date. Servidor encerrado e porta livre.

## Notas
Feita em 10/11/2026 por claude: estados carregando, erro e pronto distinguidos; erro de rede/banco mostra ErroEstado com Tentar de novo; sem permissão mantém mensagem de restrição; resposta atrasada descartada por ref de carga. Quatro fotos abertas e descritas, md5 distintos (normal e recuperado idênticos por design). TypeScript, ESLint, lei 12, componentes e contraste com saída 0. PR para revisão, sem merge.