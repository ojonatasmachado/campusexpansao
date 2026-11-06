---
id: G7
titulo: Refazer a tela principal do mapa
tipo: codigo
status: feita
quem: claude
desde: 2026-11-05
branch: historia/G7-tela-principal-mapa
depende: [G6]
tamanho: G
---

## Por quê
A tela principal ainda tem as visões prontas ("Onde falta igreja", "Células e cobertura"), o "Comece por aqui", o menu Ferramentas escondido e o painel lateral de detalhe. O usuário decidiu camadas que se somam, barra de ferramentas visível, balão no ponto e nenhum aviso automático.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P1 (claro e escuro).

## Arquivos (trilho)
- `app/service/modules/mapa/MapaIgreja.tsx`
- `app/service/modules/mapa/MapaBase.tsx`
- `app/service/modules/mapa/camadas.ts`
- `app/service/modules/mapa/linguagem.ts`
- `app/service/modules/mapa/mapa.css`
- `docs/service-v7/historias/G7-tela-principal-mapa.md`
- `app/service/modules/mapa/Mesa.tsx`, `Pontos.tsx`, `estilo.ts`, `dados.ts`, `manifest.ts` (tirar "falta igreja" do Analisar, camada de lugares, tons, lista sem CEP, densidade)
- `app/service/ui/BarraFerramentas.tsx`, `app/service/ui/biblioteca.css`, `app/service/lib/icons.tsx`, `docs/service-v7/BIBLIOTECA.md`, `app/service/ui/README.md` (props `reservaDir` e `compacta`, ícone `menos`)
- `supabase/migrations/0098_service_mapa_sem_ponto.sql`, `docs/service-v7/producao.sql`

## Pronto quando
- Saem: as 4 visões, o "Comece por aqui", o anel de alerta de 2 km, o painel da direita e todo texto que conclui "falta igreja".
- Painel de camadas com os 4 grupos e os nomes do PLANO §10; camadas somam, cada uma com transparência; grupos só aparecem se a igreja usa grupos.
- Barra de ferramentas embaixo com Emergência à parte (só para quem coordena); balão com tudo ao tocar pessoa, sede, grupo, bairro ou área.
- 3D, aproximar e afastar no canto; rodapé "Nenhum endereço aparece no mapa" com "N pessoas sem CEP" e "Quem vê o mapa".
- Funciona no tema claro e no escuro da igreja.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
2026-11-05, feita (claude): painel de camadas com os 4 grupos (Igreja; Cidade · IBGE 2022 com Presença da igreja em 5 tons, as outras leituras do IBGE ficam para a G8; Áreas da igreja; Lugares da região só com o que tem ponto, mais Raios da sede), transparência na concentração e na presença, marcadores da G6 no mapa, balão com tudo de pessoa, sede, grupo, bairro, área e lugar, barra com Emergência à parte, 3D e zoom no canto, rodapé com "N pessoas sem CEP" (lista nova, função 0098), "Quem vê o mapa" e "Entenda o mapa" (legenda numa janela, decisão de 05/11); saíram as visões, o "Comece por aqui", o anel de 2 km, o painel da direita, a legenda fixa e o "falta igreja"/"somos fortes" (também no Analisar). Densidade com scripts/medir-densidade.js: 1366×860 com 45 ações (limite 25) e 105 palavras (limite 100), FORA DA LEI, casca 24 ações e 40 palavras, 0 sobreposições, justificativa em mapa/manifest.ts; antes 42 ações, 183 palavras e 1 sobreposição (foto G7-0). 390×844: 18 ações, 11 palavras, 0 sobreposições (o celular é a G16). Fotos G7-0 a G7-6. Frases de leitura da Linha do tempo ficam na G11; filtros por situação saíram (a legenda está no "Entenda o mapa"). Revisão (subagente revisor) corrigida antes do PR: lista sem CEP só para pastor e administração, mira das ferramentas preservada, balão escondido (sem roubar foco) com o ponto fora da tela e redesenhando sozinho no movimento, balão fechado ao recarregar dados, corte da legenda dos tons.
