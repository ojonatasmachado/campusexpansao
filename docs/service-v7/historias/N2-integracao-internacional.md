---
id: N2
titulo: Concluir integração de idiomas e moeda nas telas
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [N1]
tamanho: G
---

## Por quê
Continuidade explícita da entrega parcial N1, autorizada pelo usuário em 25/10/2026: publicar o possível, preservando a divisão de trabalho. A base de bastidor não equivale à interface inteira traduzida. Histórias E/I/M/G continuam com Claude; não assumidas por Codex.

## Arquivos (trilho)
- `docs/service-v7/historias/N2-integracao-internacional.md`

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
