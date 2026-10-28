# Matriz autenticada de papéis do Service

Execução local com `npx tsx scripts/check-local-service-matrix.ts`. Requer Docker ativo, Supabase CLI e as dependências da raiz (`npm ci`). O script cria projeto, portas, banco e servidor próprios; aplica todas as migrações, usa as fixtures canônicas da Q2 e complementa seus perfis. Ao terminar, remove servidor e banco. Não usa produção nem o Supabase compartilhado em 54321. `MATRIZ_SAIDA` escolhe a pasta de evidências; o padrão fica em `prints/`.

Cada ator entra com senha pela API de autenticação. Consultas e uploads usam a sessão desse ator. As rotas HTTP recebem os cookies dessa sessão. `service_role` só prepara fixtures, observa a persistência depois das tentativas e restaura dados de teste; nunca representa o ator avaliado. O comando sai com código 1 se um caso divergir, uma consulta falhar ou a preparação não concluir. Salva `resultado.json`, `MATRIZ.md` e log privado do servidor, sem imprimir tokens.

## Perfis e regras conferidas

| Perfil | Base | Escopo de time | Acesso extra |
|---|---|---|---|
| Dono | owner | igreja | nenhum |
| Administrador | master | igreja | nenhum |
| Pastor | pastor | igreja | nenhum |
| Líder Louvor | lider | Louvor | nenhum |
| Líder Recepção | lider | Recepção | nenhum |
| Voluntário Louvor | membro | Louvor | nenhum |
| Voluntário Recepção | membro | Recepção, com módulo Visitantes | nenhum |
| Membro | membro | nenhum | nenhum |
| Extra leitura | membro | nenhum | Visitantes e financeiro.ver |
| Extra lançamento | membro | nenhum | financeiro.lancar |
| Outra igreja | master | outra organização | nenhum |

O voluntário é um membro vinculado a time, não um papel em `core.memberships`. Os dois líderes continuam lendo a igreja inteira conforme `service.is_lead` e a migração 0044: a matriz registra essa regra e não afirma isolamento do líder ao próprio time. Os voluntários leem a escala dos próprios times; o módulo Visitantes da Recepção libera leitura, sem conceder a escrita de liderança. Liberação financeira de leitura não permite lançar nem apagar arquivo.

## Cobertura

- Banco: igrejas, visitantes (ler, inserir, alterar e conferir persistência), escalas de Louvor e Recepção, configuração da igreja, contas financeiras e escrita fora da organização.
- Acessos extras: Visitantes, financeiro.ver e financeiro.lancar; arquivo privado após revogar a liberação.
- Storage: upload e conteúdo persistido nas pastas logo, mural e kids; escrita em pasta alheia recusada; leitura, upload e remoção de arquivo financeiro privado conforme a liberação.
- Notificações: preferências próprias, categoria inválida, privacidade das inscrições, escrita direta de inscrição alheia, fila exclusiva do servidor e inscrição por HTTP autenticado.
- HTTP: anônimo, personId forjado, organização alheia, destinatário alheio, renovação própria, tomada de endpoint alheio, remoção própria e proteção da inscrição alheia.
- Revogação: vínculo suspenso e produto inativo; bloqueio da inscrição e dos arquivos privados. Concorrência entre duas igrejas tentando inscrever o mesmo endpoint.

O bucket `service-media` já é público; o teste de isolamento ali trata da escrita por prefixo, não de confidencialidade da leitura. A prova de leitura privada é do bucket `service-finance`.

## Execuções e correções

| Execução | Resultado | Evidência |
|---|---|---|
| Preparação inicial | Schema da API não recarregou; nenhum caso executado. Ambiente descartado. | `prints/q3-matriz-inicial/` |
| Preparação seguinte | Consulta do script usava id no vínculo de time, que tem chave composta. Corrigida; nenhum caso executado. Ambiente descartado. | `prints/q3-matriz-antes/` |
| Base sem correções | 411 casos, 34 falhas, sem erro de execução. Dez perfis. Ambiente descartado. | `prints/q3-matriz-base/` |
| Correções e revogação | 487 casos, zero falhas, sem erro de execução. Onze perfis, incluindo Recepção e produto inativo. Ambiente descartado. | `prints/q3-matriz-corrigida/` |
| Revisão final, 23/10/2026 | 521 casos, zero falhas, sem erro de execução. Inclui atualização/remoção direta recusadas, renovação própria e concorrência entre igrejas. Ambiente descartado. | `prints/q3-matriz-final/` |

As 34 falhas reproduzidas foram: dez escritas diretas de inscrição alheia aceitas; dez tomadas de endpoint de outra pessoa/igreja pela rota; dez inscrições aceitas com vínculo suspenso; dois acessos financeiros ainda ativos e dois downloads privados permitidos para pessoas com liberação financeira e vínculo suspenso.

Correções restritas ao backend:

- Migração 0094: escrita da tabela de inscrições exclusiva do servidor; leitura própria preservada.
- Rota de inscrição: pessoa resolvida com a sessão e RLS, exigindo vínculo e produto ativos. Inserção não sobrescreve endpoint existente; renovação só altera chaves da própria pessoa e organização. Outra conta recebe 409.
- Migração 0095: `fin_can` exige `core.can_access`, inclusive quando a entrada é uma liberação individual. O Storage privado passa pela mesma condição de vínculo/produto que as tabelas.

## Limites da prova

São contas, pessoas, arquivos e endpoints fictícios em banco local real. Não é demo nem captura visual. As tabelas acima são uma amostra explícita por camada de acesso, não uma auditoria de todas as operações de todos os módulos. A Q2 também mantém sua aceitação de leitura com 46 verificações.

As chamadas de notificação usam categoria Mural, que agenda o resumo; não enviam mensagens para provedores. O servidor de teste não recebe chaves VAPID. Não foram comprovados entrega real de push, serviço externo de imagem, aparelho físico, leitor de tela ou famílias reais. A Q4 trata dos serviços reais. O relatório não aprova a navegação ou a visibilidade dos menus do painel.

Verificação local: typecheck, lint dos dois arquivos TypeScript, leis 12/17, contraste, os 13 contratos e build de produção com credenciais fictícias passaram. As migrações 0094 e 0095 foram aplicadas do zero nas duas execuções corrigidas; o pacote de produção foi regenerado pelo script canônico.
