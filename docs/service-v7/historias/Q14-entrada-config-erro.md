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
Entrega refeita em 10/11/2026 por codex no worktree Q14, sem mudar código de produto. Servidor anterior: lsof identificou PID 6273 com cwd neste worktree; encerrado antes de iniciar `npm run dev:local -- --port 3112`. Não se iniciou o Supabase, não se resetou banco nem se carregou o .env.local do checkout principal.

Quatro capturas novas por `tools/captura-service/foto.mjs`, 1366×860, em http://localhost:3112. A ferramenta só tem destinos do membro e Escalas: um loader e hooks temporários em /private/tmp acrescentaram os quatro destinos Q14 em memória, sem editar o arquivo no repositório. Login pelo formulário, texto visível e networkidle, tour fechado, selo Next escondido e conferido, fontes/animações prontas. Retorno explícito ao topo antes de `__medir(24)`; medida e foto da mesma primeira dobra. As primeiras capturas com rolagem automática foram descartadas. Todas as quatro fotos finais foram abertas e descritas.

Após login, master@teste.local e lider@teste.local apresentaram cookies=["sb-127-auth-token"]. Assert do teste exige prefixo sb-127- e rejeita gjnhittspvbvzplsqfgv. Nenhum valor de cookie foi exposto. Nenhuma senha alterada.

| Foto aberta | O que mostra | Ações / limite | Palavras / limite | Classificação | MD5 |
|---|---|---|---|---|---|
| [Normal](screenshots/Q14-normal.png) | Entrada na igreja aberta, link local, QR code e duas opções de regra | 41 / 25 | 230 / 100 | fora da lei | 2886bf2c7362bcc54466c1709cae062e |
| [Erro](screenshots/Q14-erro.png) | Mensagem Não conseguimos carregar as configurações de entrada e Tentar de novo | 34 / 25 | 114 / 100 | fora da lei | 997e8030a5a05f77f960964f9ca9d5ce |
| [Recuperado](screenshots/Q14-recuperado.png) | Após erro visível e clique em Tentar de novo, link e QR reais locais reaparecem | 41 / 25 | 230 / 100 | fora da lei | 2886bf2c7362bcc54466c1709cae062e |
| [Sem permissão real](screenshots/Q14-sem-permissao.png) | Lucas, líder, retorna ao Início; menu sem Configurações | 22 / 25 | 76 / 100 | dentro | 5ad1cd6f60829c554084538b7a9605b8 |

Normal e recuperado foram capturados separadamente com screenshot; o MD5 igual corresponde ao mesmo conteúdo após recuperar, sem cópia de arquivo. Erro provocado somente por HTTP 503 na chamada entrada_config interceptada no navegador. Recuperação: retirada da interceptação, clique em Tentar de novo, espera de entrada-link visível com resposta local real. Sem alterações no banco. Normal e recuperado mantêm a sobreposição existente da ajuda com a opção Entra direto como membro; as quatro telas têm três níveis de moldura. Nenhuma rolagem lateral ou alvo abaixo de 24 px foi apontado pelo medidor. Densidade acima do limite permanece registrada, sem mudança de produto nesta entrega.

### Acesso real sem gestão
Login lider@teste.local (Lucas): o teste contou zero entradas de Configurações no menu e imprimiu os itens presentes. Depois abriu diretamente http://localhost:3112/service?ptela=config. Resultado: URL final http://localhost:3112/service?ptela=painel, cabeçalhos Boa tarde, Lucas e Para resolver no seu time; zero chamadas entrada_config. A casca bloqueia Configurações antes de montar EntradaConfig, portanto a mensagem Só a gestão e os pastores não aparece neste fluxo real. A foto final registra esse bloqueio, e não uma simulação de null.

A aba Entrada na igreja não possui URL própria: Config.tsx guarda a aba em useState, e use-panel-navigation.ts aceita ptela somente entre rotas permitidas. Por isso a URL direta testada foi a rota real de Configurações, sem inventar parâmetro para Entrada nem contornar a permissão. A revisão não comprova a renderização interna de cfg=null pelo líder, pois ele não chega ao componente.

## Banco e verificações
Nesta revisão, nenhuma escrita no banco, senha ou personalização alterada. `npx tsc --noEmit -p .`: saída vazia, exit=0; a afirmação anterior de 21 erros de main foi substituída por esta execução completa. `git diff --check`: sem saída. O código de produto aprovado não foi alterado. Checks adicionais da construção original não foram reexecutados localmente nesta correção de entrega; CI Service do novo commit será acompanhado até terminar.

`scripts/q14-captura.mjs` movido para /private/tmp/Q14-captura-anterior.mjs, fora do repositório. Loader/hooks também fora do git; foto.mjs permanece idêntico ao HEAD. PENDENTES mantém a retirada da linha Q14. Commit desta revisão limitado a PENDENTES, história e fotos. Servidor desta revisão encerrado: `lsof -nP -iTCP:3112 -sTCP:LISTEN` sem listener; teste de bind retornou `bind localhost:3112 OK, porta livre`. PR #57 permanece para main, sem merge.

## Notas
Feita em 10/11/2026 por claude: estados carregando, erro e pronto distinguidos; erro de rede/banco mostra ErroEstado com Tentar de novo; sem permissão mantém mensagem de restrição; resposta atrasada descartada por ref de carga. A entrega visual original foi substituída pela revisão de codex documentada acima: quatro fotos recapturadas e abertas, medidas e limites explícitos, cookie local comprovado, recuperação por clique e bloqueio real do líder; normal e recuperado têm MD5 igual e capturas independentes. TypeScript completo com saída 0 nesta revisão. PR #57, sem merge.
