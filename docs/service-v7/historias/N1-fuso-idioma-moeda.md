---
id: N1
titulo: Tornar fuso, idioma e moeda explícitos
tipo: codigo
status: reservada
quem: codex
desde: 2026-10-24
branch: historia/N1-locale-moeda
depende: []
tamanho: G
---

## Por quê
O fuso da igreja já foi aplicado (2dec69c). Idioma da pessoa e moeda da igreja ainda não. Também faltam textos longos, pseudolocalização e validação no servidor com o mesmo contrato.
Fonte: HANDOFF item 6; STATUS F14; VALIDACAO.md :83; QUALIDADE-E-INTERNACIONAL.md.

## Arquivos (trilho)
- `docs/service-v7/historias/N1-fuso-idioma-moeda.md`
- `app/lib/types.ts`
- `app/service/lib/internacional/`
- `app/service/lib/server/tipos.ts`
- `app/service/lib/server/adaptadores.ts`
- `app/service/lib/server/carregar.ts`
- `supabase/migrations/0096_service_locale_currency.sql`
- `docs/service-v7/producao.sql`
- `scripts/check-service-internacional.ts`
- `scripts/check-local-internacional.ts`
- `docs/service-v7/INTERNACIONALIZACAO.md`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `app/service/layout.tsx`
- `app/service/page.tsx`
- `app/service/painel/tipos.ts`
- `.github/workflows/service.yml`

## Pronto quando
- Locale da pessoa e moeda da igreja explícitos.
- Textos longos e pseudolocalização testados.
- Servidor valida o mesmo contrato do cliente.
- Telefone, endereço exterior e CNPJ alfanumérico continuam tratados.

## Notas
ABERTO. Tipo original: codigo + decisao-do-usuario. Parte do item (idioma e moeda) depende de escolha sua: antes de codar, o agente prepara as opções e registra a resposta.
Trilho a definir na reserva.

2026-10-24, Codex. Reserva publicada após concluir Q8. Nenhum código iniciado: esta história exige escolha do usuário antes de codificar. Enviadas duas perguntas: idiomas/locales (somente pt-BR; pt-BR/pt-PT; pt-BR/en-US/es-ES com tradução completa) e moedas (BRL; BRL/EUR; BRL/EUR/USD). Proposta explícita: uma moeda por igreja, sem câmbio ou mistura de moedas e sem reinterpretação dos lançamentos existentes. Respostas recebidas em 24/10: pt-BR, en-US e es-ES com tradução da interface inteira; BRL, EUR ou USD por igreja, sem câmbio ou reinterpretação dos lançamentos. Não foram assumidas histórias D.

Inventário anterior à escolha: fuso já está em DbChurchClock/app/lib/types.ts, ChurchRow/ChurchView e toChurchView; preservar essa cadeia. Não há locale/moeda explícitos nos contratos atuais. A preferência pessoal de tamanho de texto usa service.members e RPCs próprias (0057), uma referência de fluxo de preferência, não autorização para reutilizar seu campo. Financeiro ainda formata BRL em dinheiro.ts, campos e CSV; não basta trocar o símbolo para suportar outra moeda. A auditoria de referência é auditoria-ux-2026-10-20/QUALIDADE-E-INTERNACIONAL.md, seção 4: separa idioma da pessoa, moeda da igreja e vocabulário, pede plural/interpolação e pseudolocalização com expansão de 30% a 50%. O trilho de implementação será definido depois da resposta e de conferir reservas.

Decisão registrada antes do código. Primeiro trilho técnico sem sobreposição com I10: contrato central, persistência/validação, formatação e catálogo. A I10 ainda reserva app/service/ui/, painel/comum.tsx, módulos inicio/Saude, financeiro/ e relatorios/; nenhum desses arquivos entra enquanto a reserva existir. O inventário inicial identificou 3670 ocorrências e 2600 textos distintos em 182 arquivos, antes de classificar frases dinâmicas e conteúdo da igreja. A tradução completa e a integração nas telas continuam obrigatórias; esta etapa não fecha a N1.

Moeda precisa ser única na organização (rede), porque contas e lançamentos financeiros somam por organization_id e atravessam congregações. Locale pertence à conta da pessoa, separado de país, fuso e vocabulário. Persistir BRL nos dados legados e bloquear reinterpretação depois de qualquer valor financeiro. Testar concorrência entre primeira movimentação e mudança de moeda, além de leitura/escrita sem permissão.

Primeira verificação técnica: 37 casos autenticados passaram em banco descartável (cex-rls-1ff5952ff3e1, removido), incluindo locale individual, valores inválidos, isolamento, trava monetária persistente e disputa entre configuração e primeira gravação. Typecheck, lint e contrato estático de formatação passaram. Não é conclusão da história: tradução e integração ainda faltam. Trilho ampliado para instalar a infraestrutura de mensagens, configurar somente o Service e rodar o contrato novo no CI; nenhum caminho da I10 foi acrescentado.
