---
id: Q6
titulo: Zerar resíduos da lei 12 e recolocar limite em 0
tipo: codigo
status: feita
quem: codex
desde: 2026-10-22
branch: historia/Q6-residuos-lei12
depende: []
tamanho: P
---

## Por quê
Ainda há 5 emoji e 2 hex fixos fora da lei 12. A base caiu de 14/1/6, mas não está em zero.
Fonte: PROGRESSO.md:11; DEPLOY.md:98; REVISAO-DESIGN.md.

## Arquivos (trilho)
- `scripts/lei12-base.json`
- `app/service/painel/comum.tsx`
- `app/service/layout.tsx`
- `app/service/painel/telas/Config.tsx`

## Pronto quando
- Emoji e hex fixos zerados.
- Limite recolocado em 0 em scripts/lei12-base.json.

## Notas
Concluído em 2026-10-22: cinco reações passam a texto; dois hex usam a família canônica do tema; limites de emoji e hex em zero. Verificados: lei 12, componentes, contraste, typecheck, lint (zero erros, dois avisos preexistentes de img), 13 contratos do CI e build com configuração fictícia do CI. Respostas antigas do banco não foram migradas; não houve teste autenticado nem captura visual nesta história.
