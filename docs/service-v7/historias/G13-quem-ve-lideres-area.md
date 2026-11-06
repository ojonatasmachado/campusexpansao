---
id: G13
titulo: Mostrar os líderes de área em Quem vê o mapa
tipo: codigo
status: feita
quem: claude
desde: 2026-11-06
branch: historia/G13-quem-ve-lideres-area
depende: [G10]
tamanho: P
---

## Por quê
Com o acesso automático do G10, a tela Quem vê o mapa precisa separar quem o pastor liberou e quem vê por ser responsável de uma área.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P8.

## Arquivos (trilho)
- `app/service/modules/mapa/LiberarMapa.tsx`
- `docs/service-v7/historias/G13-quem-ve-lideres-area.md`
- `app/service/modules/mapa/mapa.css`
- `app/service/modules/mapa/manifest.ts`

## Pronto quando
- Lista em "Liberados pelo pastor" e "Líderes de área" (com a cor e o nome da área), etiqueta "Líder de área" no detalhe.
- Pastor muda ou tira o acesso de qualquer um; nomes novos (Abrir Analisar, Criar áreas e marcar lugares).
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
06/11/2026 (claude): lista em "Liberados pelo pastor" e "Líderes de área" (cor e nome da área), etiqueta e motivo no detalhe, permissões com os nomes novos em interruptores. Tirar o acesso de um líder grava 'nenhum' (bloqueia o automático da 0100) e tira o menu; salvar devolve. Testado pela tela e conferido no banco. Densidade com a pessoa aberta: 30 ações e 171 palavras (antes 30, 163 e 1 sobreposição), justificada no manifesto. Fotos G13-0 a G13-2.
