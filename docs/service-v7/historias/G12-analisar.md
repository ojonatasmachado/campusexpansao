---
id: G12
titulo: Refazer a Mesa de trabalho como Analisar
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [G1, G6]
tamanho: M
---

## Por quê
A Mesa usa "Só onde falta igreja", a frase "vezes menos que a cidade" e o vermelho na presença. Decisão: atalhos por área da igreja, presença neutra e um bloco de idade.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P7.

## Arquivos (trilho)
- `app/service/modules/mapa/Mesa.tsx`
- `app/service/modules/mapa/dados.ts`
- `docs/service-v7/historias/G12-analisar.md`

## Pronto quando
- Atalhos "Cidade inteira" e uma pílula por área; título é o escolhido.
- Coluna Presença com "1 a cada X" e o tom da escala; cidade como linha de referência; nenhuma frase de comparação nem cor de alerta.
- Bloco "Idade: igreja e moradores" em barras lado a lado, com quantas pessoas entram na conta.
- Tabelas pela peça Tabela; CSV continua sem endereço nem telefone e registrado.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
