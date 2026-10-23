---
id: Q3
titulo: Montar matriz autenticada de papéis e isolamento
tipo: verificacao
status: reservada
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
