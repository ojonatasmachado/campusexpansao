---
id: D1
titulo: Aprovar a revisão de leveza de 22/10
tipo: decisao
status: feita
quem: claude
desde: 2026-10-28
branch: historia/D1-aprovar-leveza
depende: []
tamanho: P
---

## Por quê
A revisão de leveza de 22/10 muda a decisão 9, a seção 2b e as leis 4.11 e 4.16 do manifesto, mas o MANIFESTO ainda marca "pendente de aprovação". Sem resposta, E1 a E5, I1 e M1 ficam bloqueados.
Fonte: MANIFESTO.md:5, :68, :127 (4.11), :77-82; LEVEZA-2026-10-21.md seção 3 A.

## Arquivos (trilho)
- `docs/service-v7/MANIFESTO.md`

## Pronto quando
- Você responde sim ou não a cada uma das 4 mudanças.
- O MANIFESTO perde o "pendente de aprovação".

## Notas
Decisão do usuário: o agente só prepara as opções e registra a resposta.
Mudanças: gestão e pastores abrem no "Para resolver" (Saúde vira uma linha de 3 números); Escalas por time; Panorama do culto; Agenda com uma ação cheia; indisponibilidade por período.
Bloqueia E1, E2, E3, E4, E5 e I1.
REVISAO-DESIGN.md também registra o conflito com a decisão 9.
Pré-requisito prático: levar o commit 5480bba para main (PR de service-v7), senão a lei 13 a 16 não vale no repositório que os outros agentes leem.

## Resposta (28/10/2026)
O usuário aprovou as quatro mudanças, sem ressalvas:
- A. Gestão e pastores abrem no "Para resolver"; a Saúde vira uma linha com até 3 números e o panorama vai para Relatórios (decisão 9, item 4.11). Libera I1.
- B. Escalas por time, em tabela função × culto (2b.1). Libera E1.
- B2. Panorama do culto, só leitura, dono da cobertura por time (2b.2, item 4.16), e indisponibilidade por período e por time (2b.4). Libera E2, E4 e, depois do E2, E3.
- C. Agenda do membro com um botão cheio só e cartão compacto (2b.3). Libera M1.
O MANIFESTO perdeu o "pendente de aprovação".
