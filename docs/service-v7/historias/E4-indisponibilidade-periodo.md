---
id: E4
titulo: Implementar indisponibilidade por período e time
tipo: codigo
status: feita
quem: codex
desde: 2026-11-06
branch: historia/E4-indisponibilidade-periodo
depende: [D1]
tamanho: M
---

## Por quê
Hoje a indisponibilidade marca só data (d:AAAA-MM-DD) ou dias fixos (dom_m, dom_n, qua). A pessoa não consegue marcar só a noite nem só um time, e o rodízio não respeita isso.
Fonte: MANIFESTO 2b.4; LEVEZA (parágrafo "O que o Voluts erra").

## Arquivos (trilho)
- `app/service/membro/Agenda.tsx`
- `app/service/modules/escalas/candidatos.ts`
- `app/service/modules/escalas/periodo.ts`
- `app/service/modules/escalas/Escalas.tsx`
- `app/service/modules/escalas/manifest.ts`
- `app/service/modules/escalas/disponibilidade.ts`
- `app/service/membro/Disponibilidade.tsx`
- `supabase/migrations/0104_service_indisponibilidade_periodo.sql`
- `docs/service-v7/producao.sql`
- `scripts/check-escala-periodo.ts`
- `docs/service-v7/historias/screenshots/E4-*.png`

## Pronto quando
- Pessoa marca dia inteiro, manhã, tarde, noite, e opcionalmente só para um time.
- "Só a noite" e "só o Louvor" são respeitados pelo rodízio e pelo Gerar período.
- Dados antigos não são reinterpretados silenciosamente.

## Decisão

### Formato do dado
Mesmo `people.availability` (jsonb). Chaves antigas continuam valendo exatamente como hoje:

| Chave | Significado |
|---|---|
| `d:AAAA-MM-DD` = false | Dia inteiro, todos os times (já existe) |
| `d:AAAA-MM-DD:manha` = false | Só manhã, todos os times |
| `d:AAAA-MM-DD:tarde` = false | Só tarde, todos os times |
| `d:AAAA-MM-DD:noite` = false | Só noite, todos os times |
| `d:AAAA-MM-DD:dia:<ministryId>` = false | Dia inteiro, só esse time |
| `d:AAAA-MM-DD:manha:<ministryId>` = false | Só manhã, só esse time |
| `d:AAAA-MM-DD:tarde:<ministryId>` = false | Só tarde, só esse time |
| `d:AAAA-MM-DD:noite:<ministryId>` = false | Só noite, só esse time |

**Período do culto:** derivado da hora (`event.time`). Antes de 12:00 → manhã; antes de 18:00 → tarde; depois → noite. Culto sem hora só responde às chaves de dia inteiro.

**Ausência de várias datas (de/até):** uma chave por data, no máximo 31 dias.

### indisponivel()
Recebe a hora e o id do time. `candidatos.ts` e `periodo.ts` passam os dois. Migração nova atualiza a função da 0053 para respeitar as chaves novas.

### Tela
"Avisar que vou faltar" abre folha com peças da BIBLIOTECA.md:
- Data e, se quiser, até
- Período: Dia inteiro | Manhã | Tarde | Noite
- Time: só se a pessoa serve em mais de um
- Botão principal "Avisar ausência"
- Link "Falar com o líder" (abre conversa como hoje)

Ao gravar: aviso com Desfazer + mensagem ao mesmo destinatário de hoje, com a ausência por extenso. Em "Quando posso servir", ausências futuras aparecem como linhas com "Remover".

### Lei 16
Planning Center Services: My Schedule reúne pedidos de escala, bloqueios de datas e contato com líderes. Na montagem, um aviso identifica pessoas com bloqueio. A E4 mantém registro de ausência e contato com o líder no mesmo ponto da Agenda. Sem segunda fonte verificada, fica só esta referência de escala de igreja.
- Fonte: [My Schedule](https://help.planningcenter.com/en/143027-my-schedule.html)
- Fonte: [Send blockout requests](https://help.planningcenter.com/en/142885-send-blockout-requests-for-predictable-scheduling.html)

## Verificação e crítica de design

- Jornada: Agenda > Minha agenda > Avisar que vou faltar. Sem time ou destinatário, a entrada não aparece. Sem rede, o formulário mantém os dados e mostra erro; se só a mensagem falhar, a ausência permanece salva e o aviso orienta falar com o líder.
- Peças: Campo, SeletorData, Selecao, Botao, Linha, Lista e folha existente do app. Nenhum CSS de superfície ou controle novo; nenhuma dependência nova.
- Pior caso: 32 dias recusados pela interface com erro junto de Até; corrigir a data limpa o erro. Os 18 testes de escala cobrem 31 dias inclusivos, datas inválidas, limites de horários, chaves legadas, sem hora, isolamento entre times e ausência em escala já salva.
- Antes: primeira dobra da Agenda, 15 ações e 72 palavras (limites 12/80). A captura padrão foi aberta. As duas fotos antigas com selo Next foram substituídas por esta evidência.
- Depois: folha preenchida, `__medir(44)`: 6 ações e 19 palavras, limites 12/80, zero sobreposições e zero alvos pequenos. Lista rolada: 13 ações e 67 palavras, acima do teto de 12 ações; exceção documentada no manifesto. A crítica é a densidade dos controles anteriores ainda visíveis, sem esconder conteúdo para ajustar a medida.
- Escalas Louvor e Recepção: 35 ações e 66 palavras em cada foto (limites 25/100), acima do teto de ações do painel já documentado no manifesto. Sem sobreposições. Na quarta às 20h, Maria aparece Indisponível só no Louvor; na Recepção segue Aguardando.
- Teste por cliques do Gerar período: removida temporariamente a escala de quarta da Maria para abrir a vaga; prévia de 11/11, só Louvor, propôs Lucas e deixou Maria de fora. Prévia não salva. Foto: 9 ações e 91 palavras, limites 25/100.
- Remover, Desfazer e Falar com o líder passaram por cliques. Alternar horários preservou a ausência. Mensagem por extenso conferida no banco: destinatário Lucas Líder, 11 de novembro de 2026, à noite, só no time Louvor.
- Preparação e restauração locais: o culto estava sem hora e Maria tinha só um vínculo. Horário 20h00 e vínculo temporário à Recepção foram ajustados pela interface. Ao final: availability `{}`, zero ausências, três escalas `wait`, somente Louvor, hora original vazia. Removidos um vínculo, um fato e quatro mensagens criados nesta execução. Sem alteração de senha e sem reset.
- Banco: aplicada somente a migração 0104. Ela recria `swap_candidates` mantendo o retorno `member_id` da 0053 e corrigindo a assinatura divergente local. `producao.sql` regenerado pelo script canônico. Horários `20h00` do seletor existente e `20:00` são reconhecidos.

## Fotos abertas

| Arquivo | O que aparece | MD5 |
|---|---|---|
| [E4-antes-agenda.png](screenshots/E4-antes-agenda.png) | Agenda antes, duas escalas e disponibilidade | `1ba6e87fa86f48d5401bd378114a3346` |
| [E4-folha-preenchida.png](screenshots/E4-folha-preenchida.png) | 11/11/2026, Noite, Louvor, Avisar ausência | `976f4be71888fde7ec9f5bde319c44e3` |
| [E4-lista-ausencias.png](screenshots/E4-lista-ausencias.png) | Ausência por extenso e Remover, sem aviso cobrindo a linha | `55686d2c5ff4275c12804792cd3d256b` |
| [E4-escalas-louvor.png](screenshots/E4-escalas-louvor.png) | Quarta às 20h, Maria Indisponível no Louvor | `40eacec2f09c65f2784d3bcac5fce91b` |
| [E4-escalas-recepcao.png](screenshots/E4-escalas-recepcao.png) | Recepção sem bloqueio, Maria Aguardando no domingo | `45af3598a91d2b1330fe4cc5466063ce` |
| [E4-gerar-periodo.png](screenshots/E4-gerar-periodo.png) | Prévia de quarta: Lucas proposto e uma vaga aberta, Maria não proposta | `8268fbe674e3b1ee7ca94e0b34fbc1b6` |
| [E4-remover.png](screenshots/E4-remover.png) | Quando posso servir depois de Remover, sem a linha de ausência | `fdc6540e6f28a2d03ae2453d342bed12` |

## Notas
2026-11-09: construção concluída por codex; decisões aprovadas substituem a proposta. Checks, capturas por cliques, medição da folha e restauração local conferidos. As densidades acima dos tetos estão explícitas; celular físico e leitor de tela não foram verificados nesta história.
