---
id: Q10
titulo: Mover FieldDef e FField para painel form
tipo: codigo
status: feita
quem: codex
desde: 2026-10-23
branch: historia/Q10-campos-form
depende: []
tamanho: P
---

## Por quê
FieldDef está em painel/tipos.ts:700 e FField está em painel/campos.tsx. Os dois deveriam estar em painel/form/. Ainda não foi feito.
Fonte: PLANO_TELA_FORMULARIO.md onda 1 ("Ainda não feito").

## Arquivos (trilho)
- `app/service/painel/tipos.ts`
- `app/service/painel/campos.tsx`
- `app/service/painel/form/`

## Pronto quando
- FieldDef e FField passam a viver em painel/form/ e são importados de lá.

## Notas
2026-10-23, Codex: FieldDef e ShowIf movidos para painel/form/tipos.ts; FField e seus seletores auxiliares para painel/form/FField.tsx. Os auxiliares vão junto para o novo módulo não importar de campos.tsx e criar um ciclo com a compatibilidade. painel/tipos importa o tipo da fonte canônica e reexporta FieldDef/ShowIf; painel/campos reexporta explicitamente os campos, preservando os consumidores existentes fora do trilho. Sem index/barrel novo, sem mudar tela, marcação ou comportamento.

Comparação dos trechos movidos com o HEAD anterior: corpos dos campos e definições de tipo idênticos. Uma única declaração de FField, FieldDef e ShowIf em painel/form. Typecheck, lint dos quatro arquivos, leis 12/17, contraste e 13 contratos passaram.

Build de produção com credenciais fictícias passou. Não houve criação de UI ou mudança de fluxo; nenhuma história de tela foi tomada. Verificação de runtime visual não repetida porque a extração preservou integralmente os corpos; typecheck e build verificaram resolução dos imports e reexports.
