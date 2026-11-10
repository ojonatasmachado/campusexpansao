---
id: Q12
titulo: Mostrar falha ao carregar pedidos de conta
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-09
branch: historia/Q12-erro-novos-cadastros
depende: []
tamanho: P
---

## Por quê
NovosCadastros ignora o erro de entrada_pedidos e transforma falha em lista vazia. O bloco some do Para resolver e a gestão entende que não há pessoas esperando. Origem: seção 3 do PENDENTES.

## Arquivos (trilho)
- `app/service/modules/entrada/NovosCadastros.tsx`
- `app/service/modules/entrada/manifest.ts`
- `app/service/lib/internacional/mensagens/`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/Q12-erro-novos-cadastros.md`
- `docs/service-v7/historias/screenshots/Q12-*.png`

## Pronto quando
- Carregando, erro e vazio distinguíveis; vazio não mostra bloco.
- Erro mantém a linha Não conseguimos carregar os pedidos de conta com Tentar de novo.
- Nova tentativa pela tela recupera os pedidos.
- Consultas ignorando erro no mesmo arquivo corrigidas; outras do módulo registradas no PENDENTES.
- Peças da biblioteca; fotos de pendente, vazio e erro, medidas na mesma tela, abertas e com md5.
- Dados locais restaurados, checks e CI Service verdes; PR para main sem merge e porta livre.

## Notas
Reservada por codex. Sem migração ou mudança de senhas prevista.
