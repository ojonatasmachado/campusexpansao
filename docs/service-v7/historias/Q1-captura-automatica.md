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

## Pronto quando
- Um comando roda as jornadas do CAPTURA.md e falha nas regras da lei 12 e 13: alvo abaixo de 24px, contraste, rolagem lateral, erro de console, botão sem ação e densidade.
- Saída salva em prints/.
- Tabela "Captura por etapa" do PROGRESSO.md preenchida.
- Jornadas M1 a M11 e L1 a L10 da seção 8 do manifesto capturadas.

## Notas
ABERTO. Tipo original: infra + codigo.
Depende de levar o commit 5480bba para main e de recuperar o stash "tools" (em git stash list, stash@{0..3}). scripts/medir-densidade.js e scripts/seed-local-volume.ts existem apenas em service-v7.
