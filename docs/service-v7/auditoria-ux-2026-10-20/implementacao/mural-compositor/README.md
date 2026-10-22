# Compositor do Mural · decisão de 21/10/2026

Evidência no código: ComposerModal expõe tipo, urgência, canais, lembrete, agenda e destaque no mesmo formulário. O público inicial é todos. Ao editar rascunho com público que deixou de existir, o fallback também vira todos. Publicar grava e notifica diretamente, sem resumo final do destino. Afeta liderança que publica e membros que recebem.

Arquivos: modules/mural/Mural.tsx e base CSS do Service. Leis AGENTS §13.2 clareza por lugar, §13.5 prioridade, §13.6 dependências e §13.8 toque e tipografia. FormScreen preserva fechar, confirmação de descarte, rascunho e áreas seguras.

Opções: só recolher controles resolve densidade, mas não previne público errado. Só adicionar confirmação mantém densidade. Decisão: conteúdo e público explícito primeiro; opções avançadas em seções expansíveis; revisão de público, quantidade, canais e conteúdo antes de publicar ou agendar. Rascunho continua ação secundária. Público não resolvido exige escolha e nunca cai silenciosamente em todos. Não mudar banco, seleção de destinatários ou permissões.

Riscos: uma etapa a mais para publicar e nova escolha de público. Mitigações: resumo conciso, edição preservada e confirmação final com verbo Publicar/Agendar. Opções já preenchidas aparecem abertas na edição de rascunhos/agendamentos. Validação: rascunho/agendamento, conteúdo longo, teclado, voltar à edição, público, claro/escuro, 320/390/1280/1600, fonte ampliada, contratos e build. Testes da demo não enviam publicação ou mensagens reais.

## Resultado verificado

Typecheck, eslint do Mural, Lei 12, contraste, 12 contratos do CI e build aprovados. Após preservar os minutos, repetidos typecheck, lint, Lei 12, contratos de fuso/avisos e build.

Chromium/CDP: editar em 320/390/1280/1600, revisar em 320/390/1280, claro/escuro. Sem overflow horizontal. Campos de toque acima de 16px; no desktop, 14px segue a escala do painel. Estado inicial tem zero seções opcionais abertas. Só título não libera revisão; selecionar Time Louvor mostra duas pessoas. Revisão recebe foco e voltar à edição preserva título/mensagem/público, com foco no seletor de público. Nenhuma gravação de publicação ou envio de aviso ocorreu no teste. Sem exceção JavaScript durante a matriz.

Agendamento existente de 23/10 às 22:22 preserva data e minutos no campo e na revisão. Antes, o seletor só preservava horas inteiras. Campo time usa o mesmo resolvedor de fuso com recusa de horário inexistente/ambíguo.

Fixture temporária de rascunho com público “Grupo removido”: seletor fica vazio, aviso “Falta: quem recebe” e revisão bloqueada. Não assume Todos. Demo restaurada antes do commit.

Limites: não foi feito envio real, upload real, salvamento de rascunho no banco ou teste com teclado virtual de Safari/PWA. O viewport reduzido do teste de agenda foi de 320×700; não equivale a teclado físico. Escala do texto do membro não se aplica a este formulário do painel; zoom de navegador e leitor de tela não certificados.
