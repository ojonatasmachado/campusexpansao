---
id: I1
titulo: Transformar Início em fila Precisa de você
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [D1]
tamanho: M
---

## Por quê
O Início do painel renderiza Saúde da igreja antes de Para resolver, e a dobra não cabe. Falta virar uma fila "Precisa de você" com até 7 linhas-frase com seta, com Saúde reduzida a uma linha de 3 números.
Fonte: painel/telas/Inicio.tsx:361 e :368; AUDITORIA-UI-2026-10-20.md seção 2 ("Início do painel", 1028px de altura); LEVEZA A; MANIFESTO decisão 9 e 4.11; REVISAO-DESIGN.md "Pendências".

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/modules/inicio/Saude.tsx`
- `app/service/modules/inicio/saude.ts`

## Pronto quando
- Na dobra de 1366×860: até 25 ações e 100 palavras.
- Ordem: Para resolver, depois Saúde resumida.
- Nada de lista de times repetida em Próximos cultos.
- Panorama completo vai para Relatórios.

## Notas
ABERTO. Depende de D1. Também receberia "Pendências da semana" de E1.
Tela de Relatórios: acrescentar o arquivo ao trilho na reserva.
