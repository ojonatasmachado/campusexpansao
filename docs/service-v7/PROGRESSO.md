# Progresso · Service v7

Atualizado pelo Claude Code ao fim de cada item: marque `[x]` e anote o commit curto.

## Etapa 1 · Lei de módulos
- [x] 1.1 (8ac047d) Seção 11 "Service: módulos" no AGENTS.md
- [x] 1.2 (4cd2497) app/service/modules/README.md com as leis e o checklist
- [x] 1.3 (e0bc7f6) app/service/modules/_modelo/ com manifesto de exemplo
- [x] 1.4 (este commit) CLAUDE.md da raiz com @AGENTS.md (já está; só confirmar)

## Etapa 2 · Consertos
- [ ] 2.1 Continuar do curso com destino real
- [ ] 2.2 Aula na Agenda e no cartão, com a instrução do QR
- [ ] 2.3 Check-in da criança pelo app
- [ ] 2.4 Destinatário em cadeia para pedir troca
- [ ] 2.5 Destinatário em cadeia para pedido de oração
- [ ] 2.6 Botões de Relatórios
- [ ] 2.7 Entrada para Decisões por Jesus
- [ ] 2.8 Pessoas no menu do líder
- [ ] 2.9 Próximos cultos só no futuro
- [ ] 2.10 Janela Escalar vaga sem sobreposição e sem jargão
- [ ] 2.11 Botão "?" sem cobrir texto
- [ ] 2.12 Ordem e caixa do Mural
- [ ] 2.13 Erros de console
- [ ] 2.14 Controle de tamanho do texto parado
- [ ] 2.15 Selo da Agenda depois de confirmar
- [ ] 2.16 Situação, duplicados e telefones em Pessoas

## Etapa 3 · Leitura
- [ ] 3.1 Tokens de fonte
- [ ] 3.2 Mono e caixa alta
- [ ] 3.3 Cor de destaque
- [ ] 3.4 Contraste
- [ ] 3.5 Alvos de toque
- [ ] 3.6 Início do painel sem repetição
- [ ] 3.7 Tabela de Pessoas

## Etapa 4 · Estrutura
- [ ] 4.1 Registro de módulos (Escalas, depois Pessoas e Mural)
- [ ] 4.2 4 abas e avatar
- [ ] 4.3 Início do membro em duas zonas
- [ ] 4.4 Destaque da igreja
- [ ] 4.5 Agenda e detalhe do evento
- [ ] 4.6 Tarefas
- [ ] 4.7 Caminhada com vocabulário
- [ ] 4.8 Histórico
- [ ] 4.9 Tamanho do texto com o componente do iPhone
- [ ] 4.10 Primeiro acesso em 2 passos
- [ ] 4.11 Painel por papel e Saúde da igreja
- [ ] 4.12 Configuração guiada em 3 fases
- [ ] 4.13 Vocabulário em Personalização
- [ ] 4.14 Escalar vaga com histórico
- [ ] 4.15 Mensagens com pessoa e não lidas
- [ ] 4.16 Cobertura por time
- [ ] 4.17 Lista de cuidado
- [ ] 4.18 Lembrete do aviso para quem não viu
- [ ] 4.19 Saudação com o contexto do dia

## Etapa 5 · Medição
- [ ] 5.1 Eventos padrão
- [ ] 5.2 Métricas internas
- [ ] 5.3 Notificações por categoria e silêncio
- [ ] 5.4 Testes automáticos ligados

## Decisões da noite
- Branch `service-v7` criada a partir de `service-v6` (539a83d), e não de `main` (7ab1190): `main` está 2 commits atrás (etapa 6 de Configurações e Permissões), e o estudo de 05/10 foi feito em 539a83d. Partir de `main` perderia esse trabalho.
- AGENTS.md já tinha uma §11 ("Módulos centrais"). A lei entrou como "§13. Service: módulos", com nota explicando o número, para não renumerar seções existentes.
- 1.3: além do `_modelo/manifest.ts`, criei `app/service/modules/define.ts` com os tipos do contrato (`defineModule`, `Cartao`, `Lugar`), porque o exemplo precisa compilar.
- Verificação de cada item: `npx tsc --noEmit` + `npm run build` (o package.json não tem script de typecheck).

## Bloqueios
| item | motivo | o que falta |
|---|---|---|

## Captura por etapa
| etapa | pasta | critérios que passaram | que não passaram |
|---|---|---|---|
