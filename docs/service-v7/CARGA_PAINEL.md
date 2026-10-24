# Carga do painel: Q7

## Método

`npx tsx scripts/check-local-panel-load.ts antes` e `depois` criam um Supabase descartável com todas as migrações, fixtures de autenticação e seed-local-volume. Nunca usam 54321 ou credenciais de produção. Cada execução compila e inicia Next em produção e remove app, proxy e banco ao terminar.

Volume canônico desta medição: 300 pessoas adicionais, 70 voluntários, 13 cultos/eventos, 120 escalas, 40 visitantes e 45 crianças, além das fixtures básicas. Papéis master, líder e membro. Um aquecimento e sete cargas completas de /service por papel, sem concorrência entre amostras. O proxy local registra somente caminho sem parâmetros, duração, tamanho e status das chamadas do servidor. Não grava tokens, cookies ou conteúdo.

Tempo total vai do GET até consumir todo o HTML. Tempo de cabeçalhos é registrado separadamente, pois o streaming pode enviar cabeçalhos antes dos dados. Bytes de HTML e scripts iniciais são medidos sem compressão e também comprimidos com gzip no medidor. O total dos scripts conta cada URL uma vez por papel. As amostras e a linha do tempo de consultas ficam localmente em prints/q7-carga/<rótulo>/resultado.json.

## Linha de base

Na versão anterior à Q7, nove consultas independentes só começavam depois de a anterior terminar. A janela entre o início da primeira e o fim da última dessas nove teve mediana de 263,2 ms (master), 249,4 ms (líder) e 435,3 ms (membro). Cada carga registrou 72 chamadas no proxy do servidor.

| Papel | Tempo total, mediana | HTML, bytes | HTML gzip, bytes | JS inicial, bytes | JS gzip, bytes |
|---|---:|---:|---:|---:|---:|
| Master | 980,7 ms | 734810 | 89046 | 2082467 | 592107 |
| Líder | 775,6 ms | 474490 | 48620 | 2082467 | 592107 |
| Membro | 1065,7 ms | 73916 | 11312 | 2082467 | 592107 |

## Resultado após a mudança

| Papel | Tempo total, mediana | Redução | Janela das nove leituras | HTML, bytes | HTML gzip, bytes |
|---|---:|---:|---:|---:|---:|
| Master | 866,4 ms | 11,7% | 147,6 ms | 735076 | 89086 |
| Líder | 692,6 ms | 10,7% | 146,6 ms | 474570 | 48644 |
| Membro | 857,1 ms | 19,6% | 235,2 ms | 73944 | 11333 |

Continuam 72 chamadas por carga, todas sem erro HTTP. JS inicial idêntico: 2082467 bytes, 592107 gzip em cada papel. HTML varia menos de 0,04% entre os bancos recriados, sem redução de conteúdo. A janela das nove consultas encolheu de 44% a 46%; as linhas do tempo mostram sobreposição após a mudança. Todas as 24 cargas de cada execução (aquecimentos incluídos) retornaram 200 com a igreja e sem erro de leitura. Ambos os bancos foram descartados. Execuções de 24/10/2026.

## Mudança aplicada

Somente as nove leituras independentes depois da autenticação, ensure_my_member e leitura de churches são aguardadas juntas. Mesmas consultas, seleções, ordenações, RLS, dados devolvidos e precedência do tratamento de erros. Não há cache compartilhado entre usuários.

## Limites

Medição local em macOS com Docker/OrbStack e proxy em loopback. Não representa latência de produção, aparelho real, hidratação, renderização, interação, CSS, imagens ou carregamentos posteriores. Bytes gzip são estimativa de transferência comprimida, não o protocolo/compressão observados na Vercel. O banco não tem histórico volumoso de mensagens; a medição não justifica paginação desse histórico. O JS inicial ficou registrado, mas a experiência de carregamento no navegador não foi medida nesta história.
