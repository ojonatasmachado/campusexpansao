---
id: Q1
titulo: Recriar captura automática das leis 12 e 13
tipo: codigo
status: reservada
quem: codex
desde: 2026-10-22
branch: historia/Q1-captura-automatica
depende: []
tamanho: G
---

## Por quê
A captura automática da lei 12 não existe em main. Ela está em stashes locais. A parte de densidade (lei 13) não roda em CI, e só existe a checagem estática scripts/check-service-lei12.ts.
Fonte: MANIFESTO.md lei 12 e seção 8; PROGRESSO.md "Para a captura final" e "Captura por etapa"; PLANO_TELA_FORMULARIO.md seção 8 e 9; DEPLOY.md seção 2.

## Arquivos (trilho)
- `tools/captura-service/`
- `scripts/check-service-lei12.ts`
- `scripts/medir-densidade.js`
- `scripts/seed-local-volume.ts`
- `docs/service-v7/PROGRESSO.md`
- `.github/workflows/service.yml`

## Pronto quando
- Um comando roda as jornadas do CAPTURA.md e falha nas regras da lei 12 e 13: alvo abaixo de 24px, contraste, rolagem lateral, erro de console, botão sem ação e densidade.
- Saída salva em prints/.
- Tabela "Captura por etapa" do PROGRESSO.md preenchida.
- Jornadas M1 a M11 e L1 a L10 da seção 8 do manifesto capturadas.

## Notas
EM ANDAMENTO, Codex, 2026-10-22. Ferramenta recuperada seletivamente do stash (sem auth/snapshots/probes), critérios das leis 12/13, falha por jornada ausente e CI com testes de DOM real. Typecheck, lint sem avisos e 19 testes passaram. Entrada: 12 estados, 8 com violações de alvo/sobreposição em prints/q1-entrada. M10 autenticada: 7 posições do slider, 9 prints em prints/q1-m10; recaptura em prints/q1-m10-recorte concluída com zero falhas após corrigir o recorte por contêiner rolável. Captura ampla em prints/q1-jornadas-v7 ainda contém jornadas incompletas por seletores/estados antigos e falhas de produto; não considerar feita nem integrar enquanto faltar a prova completa. Nenhuma tela foi alterada nesta história.

Tipo original: infra + codigo.
O main atual já contém scripts/medir-densidade.js e scripts/seed-local-volume.ts. Recuperação feita de stash@{1}^3, preservando o stash original. Reset e restauração destrutiva removidos; navegação por cookie forçado removida.

2026-10-22, continuação: modo isolado implementado com o helper já integrado pela Q2. Usa portas e sessões próprias, migrações e fixtures, guarda falhas com screenshot/texto/auditoria e descarta seu ambiente. Os 19 testes, typecheck, lint, leis estáticas, contraste e 13 contratos passaram; CI da revisão e397d61 verde. Captura autenticada ampla ainda em conferência. Primeira tentativa de repetição interrompida após o login exceder o prazo antigo de 25s; login direto no banco respondeu 200. Prazo e espera de hidratação ajustados, sem alteração de tela. Não marcar esta história feita com base apenas no CI dos critérios.
