---
id: N2
titulo: Concluir integração de idiomas e moeda nas telas
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-12
branch: historia/N2-integracao-internacional
depende: [N1]
tamanho: G
---

## Por quê
Continuidade explícita da entrega parcial N1, autorizada pelo usuário em 25/10/2026: publicar o possível, preservando a divisão de trabalho. A base de bastidor não equivale à interface inteira traduzida. Histórias E/I/M/G continuam com Claude; não assumidas por Codex.

## Arquivos (trilho)
- `docs/service-v7/historias/N2-integracao-internacional.md`
- `scripts/internacional/preparar-jsx.ts` (lê também este trilho)
- `app/service/lib/internacional/mensagens/` (catálogos)
- `app/service/ui/` (fatia 1)
- `app/service/membro/Agenda.tsx` (fatia 1)
- `app/service/membro/Biblia.tsx` (fatia 1)
- `app/service/membro/comum.tsx` (fatia 1)
- `app/service/membro/Cursos.tsx` (fatia 1)
- `app/service/membro/Disponibilidade.tsx` (fatia 1)
- `app/service/membro/Kids.tsx` (fatia 1)
- `app/service/membro/Mural.tsx` (fatia 1)
- `app/service/membro/Onboarding.tsx` (fatia 1)
- `app/service/membro/Onde.tsx` (fatia 1)
- `app/service/membro/Visitantes.tsx` (fatia 1)
- `app/service/painel/telas/Agenda.tsx` (fatia 2)
- `app/service/painel/telas/Evento.tsx` (fatia 2)
- `app/service/painel/telas/EventoSerie.tsx` (fatia 2)
- `app/service/painel/telas/Visitantes.tsx` (fatia 2)
- `app/service/painel/telas/Reunioes.tsx` (fatia 2)
- `app/service/painel/telas/Identidade.tsx` (fatia 2)
- `app/service/painel/telas/Kids.tsx` (fatia 2)
- `app/service/painel/telas/Formacao.tsx` (fatia 2)

Definir na reserva, conferindo especialmente I10: ui/, painel/comum.tsx, modules/inicio/Saude.tsx, modules/financeiro/ e modules/relatorios/. Não trabalhar simultaneamente no branch de outra frente.

## Pronto quando
- Interface inteira pt-BR/en-US/es-ES com frases completas ICU/rich, vocabulário da igreja e conteúdo das pessoas preservados. Integrar componentes do membro, painel, biblioteca e metadados dos manifestos.
- Configuração, campos, totais e exportações financeiras usam BRL/EUR/USD única por organização; escritas declaram x-service-currency. Sem câmbio ou reinterpretação de centavos. Moeda travada após qualquer valor financeiro.
- Capturas de membro e painel nos três idiomas e pseudo, textos extremos, contraste, densidade antes/depois, alvos, console e rolagem aprovados. Corrigir/verificar as três molduras da referência desktop; não alegar validação em aparelho real sem evidência.
- Testes demonstram comportamento com rollout ligado e desligado. Uma nova migração habilita service.international_rollout somente após integração e provas completas. Até lá, ambos os recursos ficam false em produção. Não ativar por console para contornar esta condição.
- CI verde, PR, merge e produção READY.

## Notas
Handoff detalhado: docs/service-v7/INTERNACIONALIZACAO.md, seção “Mensagem para o Claude” e atualizações seguintes. A base inclui 518 mensagens por idioma, extrator, preparador conservador, infraestrutura ICU/pseudo, preferência protegida, moeda/trava e adaptadores com tradutor opcional. Não refazer a base. Consumidores de tela ainda precisam passar useTexto() aos adaptadores; não traduzir status e cabeçalhos persistidos. A reserva N1 termina com a entrega parcial, sem fingir que estes critérios já foram cumpridos.

F1 continua outra história, ainda não iniciada; esbarra no Financeiro da I10. O4/O5 têm verificações de bastidor possíveis em banco local, desde que a reserva não sobreponha seus arquivos. O6 exige famílias reais para concluir Kids, além da prova de volume financeiro.

Fatia 1 (12/11, PR próprio, rollout ainda desligado): tradutor em `ui/` e nas telas do membro do trilho (Agenda, Biblia, comum, Cursos, Disponibilidade, Kids, Mural, Onboarding, Onde, Visitantes). Catálogos de 527 para 924 chaves, nenhuma vazia; plurais com `=1` (no ICU o zero cai em `one` no pt-BR; o `plural()` antigo punha o zero no plural). Prova de pt-BR idêntico: texto de 11 telas (5 do membro, 6 do painel) igual ao do main, exceto os contadores animados do `Contagem` (quadro no meio da animação). Ficou de fora, para fatias seguintes: Inicio, Conversas, Caminhada, MobileApp e ServiceExactApp (reservados por M3, M7 e O8), formatação de datas compartilhada (`dataLonga`, `MESES`), `requirementLabel`, `PERIODOS_AUSENCIA`, e mensagens enviadas a outra pessoa (chat, push), que seguem no idioma de quem envia.

Fatia 2 (12/11, PR próprio, rollout desligado): tradutor em 8 telas do painel (Agenda, Evento, EventoSerie, Visitantes, Reunioes, Identidade, Kids, Formacao). Catálogos de 924 para 1494 chaves, nenhuma vazia, plurais com `=1`. Prova: texto de 16 telas (5 do membro, 11 do painel) igual ao do main, exceto dados vivos (contadores animados e "vistos" dos cartões em Relatórios). Identidade e Reuniões não entraram na comparação (o script não abriu o item no menu); ficaram com as verificações estáticas e o revisor. Pendências de texto pt-BR antigo, mantidas para não mudar o pt-BR nesta fatia: "item(ns)" (Reunioes) e "{n} pessoas" sem plural (Formacao, Reunioes). Textos de arquivos fora da fatia seguem em pt-BR: `imageAuthorizationCopy`, `REPETICOES`, `VISITOR_STAGES`, `BAT_ST_MAP`, `resumoDaSerie`, `feitoDaSerie`.
