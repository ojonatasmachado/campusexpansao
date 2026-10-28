---
id: Q3
titulo: Montar matriz autenticada de papéis e isolamento
tipo: verificacao
status: feita
quem: codex
desde: 2026-10-23
branch: historia/Q3-matriz-papeis
depende: []
tamanho: G
---

## Por quê
Falta uma matriz autenticada dos papéis (pastor, administrador, líder, voluntário, membro, acessos extras e escopo de times) e o isolamento entre igrejas. Hoje há só líder local e fixtures de restrição, e o contrato panel-access roda no CI.
Fonte: HANDOFF item 2; STATUS "Ordem de continuação" 1.

## Arquivos (trilho)
- `docs/service-v7/historias/Q3-matriz-papeis.md`
- `scripts/check-local-service-matrix.ts`
- `docs/service-v7/MATRIZ_PAPEIS.md`
- `app/api/service/push/subscribe/route.ts`
- `supabase/migrations/0094_service_push_acesso.sql`
- `supabase/migrations/0095_service_financeiro_acesso.sql`
- `docs/service-v7/producao.sql`

## Pronto quando
- Matriz cobre todos os papéis, com leitura e gravação no banco, uploads e notificações.
- Isolamento entre igrejas verificado.
- Demo não conta como prova.

## Notas
2026-10-23, Codex: reservada. Trilho conferido contra I10 do Claude (UI, painel/comum, início, financeiro e relatórios), sem sobreposição. Matriz autenticada usa o helper descartável da Q2, migrações reais e fixtures próprias; teste via HTTP/Storage com chaves de sessão, nunca service_role como ator. Service role só prepara as fixtures e verifica persistência após as tentativas. Entrega separa isolamento e regras do banco de navegação de tela e de entrega real de push (Q4).

2026-10-23, ampliação após prova autenticada: a execução q3-matriz-base permitiu inscrição de push alheia por escrita direta, tomada de endpoint de outra pessoa/igreja pela rota (HTTP 200) e inscrição com vínculo suspenso (HTTP 200). Correção restrita ao backend da inscrição e permissões de escrita da tabela. A matriz também verifica os limites de acesso aos arquivos financeiros quando vínculo/produto ficam inativos; migração específica reservada para eventual correção comprovada. Trilho conferido novamente, sem sobreposição com I10.

2026-10-23, prova e correção: q3-matriz-base concluiu 411 casos com 34 falhas, sem erro de execução: 10 escritas diretas de inscrição alheia, 10 tomadas de endpoint, 10 inscrições de vínculo suspenso, 2 liberações financeiras e 2 downloads privados ainda ativos após suspensão. Correções aplicadas na rota de inscrição e migrações 0094/0095. Repetição q3-matriz-corrigida: 487 casos, zero falhas, onze perfis, vínculo suspenso, produto inativo e liberação revogada; ambiente descartado. Conferência final inclui renovação própria e concorrência de endpoint entre igrejas.

2026-10-23, concluída: q3-matriz-final terminou com 521 casos, zero falhas e zero erro de execução, onze perfis, cookies de sessões reais, banco/Storage/API locais, revogação e concorrência. Banco e servidor descartados. Relatório em MATRIZ_PAPEIS.md; artefatos locais em prints/q3-matriz-final. Typecheck, lint, leis 12/17, contraste, 13 contratos e build com credenciais fictícias passaram. Ficaram de fora: todas as operações de todos os módulos, navegação de tela, serviços reais (Q4), aparelho físico, leitor de tela e famílias reais. Nenhuma tela foi alterada.
