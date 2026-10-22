---
id: I2
titulo: Fazer ações do Início navegarem
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
Algumas ações do Início não navegam: aprovar caminhada, registrar cuidado e responder pedidos. Falta revisar cada uma por papel, módulo e dependência.
Fonte: HANDOFF item 2; CONTINUIDADE.md "Próxima investigação".

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/modules/inicio/Saude.tsx`
- `app/service/modules/cuidado/`
- `app/service/modules/registry.ts`

## Pronto quando
- Ações do Início revisadas por papel, módulo e dependência.
- Área indisponível não oferece botão, atalho nem resultado de busca.
- Nenhuma permissão ampliada.

## Notas
Tipo original: verificacao + codigo.
Decisão do usuário já tomada: área indisponível não aparece. Não ampliar permissão.
A busca do painel não tem caminho citado no levantamento; confirmar na reserva.
