---
id: G6
titulo: Criar as peças do mapa na biblioteca
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
A tela nova do mapa precisa de peças que a biblioteca ainda não tem: painel flutuante de camadas (e o trilho recolhido), linha de camada com interruptor e ícone que é o próprio marcador, barra de ferramentas, balão preso a um ponto do mapa, ícones novos e os marcadores novos (igreja em âmbar com silhueta, célula, lugar da igreja, selecionado). A Folha, a Janela, o Segmentado, o Interruptor e o avisar() já existem e são reaproveitados.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P1 e P6.

## Arquivos (trilho)
- `app/service/ui/PainelMapa.tsx`
- `app/service/ui/BarraFerramentas.tsx`
- `app/service/ui/Balao.tsx`
- `app/service/ui/biblioteca.css`
- `app/service/ui/README.md`
- `docs/service-v7/BIBLIOTECA.md`
- `app/service/lib/icons.tsx`
- `app/service/modules/mapa/estilo.ts`
- `app/service/modules/mapa/marcadores.ts`
- `scripts/check-service-componentes.ts`
- `app/service/demo/biblioteca`
- `docs/service-v7/historias/G6-pecas-do-mapa.md`

## Pronto quando
- Peças novas com ficha de entrada e linha na BIBLIOTECA, visíveis em /service/demo/biblioteca, no claro e no escuro.
- Balão abre a partir do ponto, vira para o outro lado perto da borda e fecha com Esc; painel recolhe no trilho de ícones com mola.
- Ícones novos no traço do conjunto do Service (camadas, concentração, moradores, presença, idade, comparar idades, criar área, rota, linha do tempo, marcar lugar, analisar, emergência, 3D, minha posição, ímã) e marcadores desenhados para o MapLibre.
- Cores do mapa só da paleta fixa; o âmbar `#D6A23E` fica reservado à igreja.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
