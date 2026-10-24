---
id: N1
titulo: Tornar fuso, idioma e moeda explícitos
tipo: codigo
status: reservada
quem: codex
desde: 2026-10-24
branch: historia/N1-locale-moeda
depende: []
tamanho: G
---

## Por quê
O fuso da igreja já foi aplicado (2dec69c). Idioma da pessoa e moeda da igreja ainda não. Também faltam textos longos, pseudolocalização e validação no servidor com o mesmo contrato.
Fonte: HANDOFF item 6; STATUS F14; VALIDACAO.md :83; QUALIDADE-E-INTERNACIONAL.md.

## Arquivos (trilho)
- `docs/service-v7/historias/N1-fuso-idioma-moeda.md`

## Pronto quando
- Locale da pessoa e moeda da igreja explícitos.
- Textos longos e pseudolocalização testados.
- Servidor valida o mesmo contrato do cliente.
- Telefone, endereço exterior e CNPJ alfanumérico continuam tratados.

## Notas
ABERTO. Tipo original: codigo + decisao-do-usuario. Parte do item (idioma e moeda) depende de escolha sua: antes de codar, o agente prepara as opções e registra a resposta.
Trilho a definir na reserva.
