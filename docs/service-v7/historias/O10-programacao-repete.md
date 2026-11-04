---
id: O10
titulo: Criar programação que se repete
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
O pastor cria culto por culto; só os cultos iniciais do assistente saem em série, com oito horários prontos (J05 de JORNADAS-E-CONEXOES.md). Decisão D6 de 04/11, Onda 1 (MANIFESTO 2c.5).

## Arquivos (trilho)
- `app/service/painel/telas/Agenda.tsx`
- `app/service/modules/configuracao/setup.ts`
- `supabase/migrations/` (migração nova)

## Pronto quando
- Ao criar um culto ou evento, a pessoa escolhe se repete: toda semana, a cada 15 dias ou todo mês, com horário livre.
- Editar um da série pergunta: só este ou este e os próximos.
- Começa com um encontro e oferece repetir depois (J05), sem obrigar a decidir até dezembro.
- Fotos no painel em 1366 e 390 e densidade da lei 13 com número e limite.

## Notas
Ver como O1 (culto avulso no estilo do assistente) toca os mesmos arquivos antes de reservar.
