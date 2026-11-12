---
id: O10
titulo: Criar programação que se repete
tipo: codigo
status: feita
quem: claude
desde: 2026-11-12
branch: historia/O10-programacao-repete
depende: []
tamanho: M
---

## Por quê
O pastor cria culto por culto; só os cultos iniciais do assistente saem em série, com oito horários prontos (J05 de JORNADAS-E-CONEXOES.md). Decisão D6 de 04/11, Onda 1 (MANIFESTO 2c.5).

## Arquivos (trilho)
- `app/service/painel/telas/Agenda.tsx`
- `app/service/modules/configuracao/setup.ts`
- `supabase/migrations/0108_service_eventos_serie.sql` (nova) e `docs/service-v7/producao.sql`
- `app/service/lib/recorrencia.ts` (novo) e `scripts/check-service-recorrencia.ts` (novo, contrato no `.github/workflows/service.yml`)
- `app/service/painel/telas/EventoSerie.tsx` (novo), `Evento.tsx`, `ServiceModal.tsx`
- `app/service/painel/form/tipos.ts` (showIf com notEquals), `app/service/painel/tipos.ts`, `app/service/lib/server/tipos.ts`, `app/service/lib/server/adaptadores.ts`
- `evolucoes/service_app/service-app.css`

## Pronto quando
- Ao criar um culto ou evento, a pessoa escolhe se repete: toda semana, a cada 15 dias ou todo mês, com horário livre.
- Editar um da série pergunta: só este ou este e os próximos.
- Começa com um encontro e oferece repetir depois (J05), sem obrigar a decidir até dezembro.
- Fotos no painel em 1366 e 390 e densidade da lei 13 com número e limite.

## Notas
Ver como O1 (culto avulso no estilo do assistente) toca os mesmos arquivos antes de reservar.

2026-11-12 (claude): feita. "Novo culto" ganhou Repete (não, toda semana, a cada 15 dias, todo mês) e Repete até; cria a série de uma vez (teto 60), cada encontro com sua escala e presença, ligados por `series_id`/`series_rule` (0108). Na gaveta: "Toda semana · parte de uma série" e Editar (só este ou este e os próximos; nunca os anteriores; só os campos que mudaram; no mensal mantém o dia do mês); no avulso, Repetir (J05), que não cria encontro no passado. Updates com `.select` para não dar sucesso falso quando a RLS barra; erro de reserva do espaço vira aviso. O1 foi incorporada aqui. Código morto do assistente apagado de `setup.ts`.
- Teste pela tela (Chromium, 1366): criar série semanal (5 no banco, mesmo series_id), "Este e os próximos" a partir do 3º (19:30, 19:30, 20:00, 20:00, 20:00), "Só este" mudando a data do 1º (só ele anda, 5 continuam na série), Repetir um avulso todo mês (4 no banco, um series_id), 0 erro de console.
- Densidade (lei 13), gaveta do encontro: 1366, 10 ações (limite 25) e 46 palavras (limite 100); 390, 10 ações e 47 palavras; 1 botão cheio, moldura 1, nada sobreposto, sem rolagem lateral. Topo com no máximo duas ações (Editar, Repetir; lei 15).
- Fotos (md5): O10-novo-culto-repete 44f6ca602d08073b9fc9bb11b8578b47 · O10-gaveta-serie e9a542209bbfd60964490c5073952ea0 · O10-gaveta-serie-390 f49c54bef95c1380f8b48af43f050de6 · O10-editar-este-e-proximos 42780c66ddea0e6c0eec4915b2ae3963 · O10-repetir-avulso ed4b03e577aab1389293171dbff28d97.
- Mercado (lei 16): Google Agenda cria a repetição no próprio evento ("Does not repeat" vira a regra e o fim), deixa transformar um existente em série e, ao salvar uma mudança, pergunta a quais encontros vale; limite de 730 (https://support.google.com/calendar/answer/37115). Apple Calendário: menu Repetir e Fim da repetição no evento, mudança confirmada com "Change" (https://support.apple.com/guide/calendar/set-up-all-day-multiday-or-repeating-events-icl1018/mac). Ajuda do Planning Center devolveu 403, ficou fora. Daqui: repetir dentro do criar, repetir depois e "só este / este e os próximos"; não copiamos "todos", que mexeria no passado.
- Fora do escopo: excluir encontro ou série (cascata nas escalas), avisar voluntários escalados quando o encontro muda de data, conferir conflito de sala nas datas da série, e salvar a série numa transação (hoje é um update por encontro; numa falha parcial o aviso diz quantos salvaram).
