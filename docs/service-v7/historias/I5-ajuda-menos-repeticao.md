---
id: I5
titulo: Reduzir repetição da ajuda e ajuda sem cobrir Escalas
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: P
---

## Por quê
A ajuda "?" aparece demais em Relatórios, Cursos e Escalas, e a ajuda flutuante cobre parte de Escalas.
Fonte: LEVEZA D.

## Arquivos (trilho)
- `docs/service-v7/historias/I5-ajuda-menos-repeticao.md`

## Pronto quando
- Relatórios com menos "?" que a medição de 21/10 (8), e Cursos com menos que 6.
- Ajuda flutuante não cobre Escalas.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Commits b776342 e ac3dca1 ("ajuda junto aos títulos") reduziram a repetição, mas a medição de 21/10 era anterior ou concorrente.
Medida a repetir: scripts/medir-densidade.js em Relatórios, Cursos e Escalas.
Trilho a definir na reserva.
