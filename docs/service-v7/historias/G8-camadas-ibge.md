---
id: G8
titulo: Ligar as camadas do IBGE no mapa
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [G1, G7]
tamanho: M
---

## Por quê
Com os dados do G1, o mapa ganha as leituras do IBGE sem conclusão pronta: concentração de moradores, presença da igreja numa cor só em tons, idade dos moradores e comparação de idade igreja x bairro.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P1.

## Arquivos (trilho)
- `app/service/modules/mapa/camadas.ts`
- `app/service/modules/mapa/dados.ts`
- `app/service/modules/mapa/linguagem.ts`
- `supabase/migrations/<próximo>_service_mapa_ibge_camadas.sql`
- `docs/service-v7/historias/G8-camadas-ibge.md`

## Pronto quando
- Concentração de moradores como mancha de calor; Presença da igreja em 5 tons de `#E5E0D6` a `#B4A596` com "1 a cada X" no balão do bairro, sem vermelho e verde.
- Idade dos moradores e Comparar idades nas faixas 0 a 9, 10 a 19, 20 a 29, 30 a 59, 60+; a comparação diz quantas pessoas da igreja têm data de nascimento.
- Região com menos de 3 pessoas da igreja mostra "menos de 3"; fonte IBGE · Censo 2022 visível.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
