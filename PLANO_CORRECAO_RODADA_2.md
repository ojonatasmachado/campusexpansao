# Plano de correção · Rodada 2 (Fases 18-24)

> Continuação do plano de correção do CE.X Service. As Fases 0-17 fecharam a
> auditoria original (`AUDITORIA_COMPLETA_UI.md`). Este documento organiza os
> ~24 gaps novos achados na Rodada 2 (`AUDITORIA_RODADA_2.md`) em fases,
> seguindo o mesmo padrão de trabalho de sempre: **Plan Mode por fase**
> (reconferir contra o código atual antes de codar, já que a lista pode ter
> ficado desatualizada), implementar, `npx tsc --noEmit`, verificar ao vivo em
> `/service/demo`, e só commitar depois de tudo verificado.
>
> Ordem sugerida: críticos primeiro (dado descartado em silêncio ou fluxo
> quebrado), depois moderados, depois cosméticos. Ajustável conforme o
> usuário priorizar.

---

## Fase 18 — Persistência quebrada (críticos, prioridade máxima)

Padrão comum: a UI parece funcionar mas a ação não persiste em lugar nenhum
(silenciosa) ou falha sempre por um bug simples.

1. **Cadastro de visitante pelo modal genérico sempre falha** —
   `ServiceExactApp.tsx:7799` valida `!value("Nome")` mas o campo é
   `k:"nome"` → nunca passa da validação. Corrigir a chave certa.
2. **Onboarding nunca salva a senha** — `onCompleteOnboarding`
   (`ServiceExactApp.tsx:928`, chamado por `MobileApp.tsx:1105-1205`) só trata
   email/nascimento/bairro. Precisa persistir a senha de verdade
   (`supabase.auth.updateUser` ou equivalente, investigar como a autenticação
   do voluntário funciona hoje antes de decidir o mecanismo).
3. **App do voluntário: "avançar etapa"/"registrar visitante" não persiste** —
   `TabVisitantes` (`MobileApp.tsx:626-757`) só tem `useState` local; falta
   threading de `onAdvanceVisitorStage`/`onRegisterVisitor` desde
   `ServiceExactApp.tsx` até o mobile, com mutação real no Supabase.
4. **"Enviar mensagem" no drawer de Pessoa/Membro descarta o texto** —
   `ServiceExactApp.tsx:6863,6972` abre modal sem `action`; ou dá pra ligar
   numa `action.kind` real (que crie/ache uma conversa e insira a mensagem,
   reaproveitando o que a Fase 17 já deixou pronto em Conversas) ou remove o
   campo de texto do modal se não for pra fazer nada com ele.
5. **`DecisaoDrawer.encaminhar()` não cria mais visitante** —
   `ServiceExactApp.tsx:6283-6289` só faz update de status; precisa voltar a
   inserir em `visitors` (igual ao protótipo `jornada.jsx:188`), fechando a
   integração decisão → funil de visitantes.

## Fase 19 — Chat do app do voluntário

6. **Chat mobile é só leitura** — `TabConversas` (`MobileApp.tsx:543-585`)
   não tem input/botão de enviar. Adicionar composer real (mutação em
   `messages`, mesmo padrão de `Conversas` desktop pós-Fase 17).
7. **"+ Nova conversa" ausente no mobile** — falta o fluxo de escolher
   líder/pastor e iniciar uma conversa pelo celular (protótipo
   `mobile.jsx:309-337`).
8. **Bolha de mensagem própria sem destaque** — `ServiceExactApp.tsx:4784`
   nunca aplica a classe `.me`; CSS já suporta, só falta o `self = ...` no
   JSX (mesmo padrão do protótipo `chat.jsx:47,52`). Pode entrar nesta fase
   já que é a mesma área de código.

## Fase 20 — Kanban e Membros: vínculos e escopo

9. **Kanban: responsáveis do card não filtram pelo time do quadro** —
   `CardDrawer`/`NovoCard` (`ServiceExactApp.tsx:4237,4345`) usam
   `people.slice(0,12)` fixo; trocar por filtro real via `board.ministry_id`
   (mesmo padrão de escopo já usado na Fase 17).
10. **Membros: vínculo com ministério por nome de texto, não por ID** —
    `getMemberMinistries`/`MembroDrawer` comparam `personName === member.name`;
    trocar pra usar `member.volunteerId` (já existe e já é usado
    corretamente em Conversas/NovaConversaModal).
11. **Membros: "Ver como voluntário" virou modal cosmético** — restaurar
    navegação real pro drawer de `person` correspondente (ou decidir, se não
    fizer sentido no modelo atual, uma ação real equivalente).

## Fase 21 — Cursos, Reuniões, Jornada

12. **CursoEditor apaga organização manual do quadro ao editar** —
    `CursoEditor.tsx:439` sobrescreve `category` com o campo "Nível" toda
    edição; separar os dois conceitos (nível ≠ agrupamento do Kanban de
    cursos).
13. **ReuniaoDrawer não força mais decisão sobre pendências** —
    `salvarAta` (`ServiceExactApp.tsx:2905-2914`) não abre `BoardChooser`
    automaticamente quando sobram ações sem card.
14. **PersonTimeline virou checklist fixo, perdeu histórico real** —
    `ServiceExactApp.tsx:6245-6270` é 5 booleanos (`JRN_STEPS`); avaliar se
    dá pra reconstruir uma timeline real a partir de dados já existentes
    (decisions, baptism_candidates, enrollments, person_ministries com
    datas) ou se precisa de uma tabela de eventos de jornada nova.
15. **VisitanteDrawer: beco sem saída quando `member_id` é nulo na última
    etapa** — adicionar de volta o CTA "Completar dados de membro →".

## Fase 22 — Configurações (abas com regressão)

16. **Grupos & Células perdeu toggle mestre "Habilitar grupos" e nome
    customizável.**
17. **Congregações → Gerir perdeu seção de governança própria e
    frentes/tags** no drawer.
18. **Igreja perdeu "Horários de culto"; Personalização perdeu "dica de
    senha".**
19. **"Quando alguém recusa" virou binário**, perdendo a opção real "Avisar
    o líder" (vs. "Chamar o próximo").
20. **Identidade → "Valores" virou lista rasa** (só título, perdeu a
    descrição de cada valor).

## Fase 23 — Polish (EventoShare, badge, busca, perfil do app, PWA)

21. **EventoShare ignora nome/logo real da igreja** — sempre mostra "CE.X
    Service" fixo; `firstChurch.nome`/`logoUrl` já existem no escopo do
    `App`, só falta passar como prop.
22. **Badge "Visitantes" da sidebar mostra número errado** —
    `ServiceExactApp.tsx:1001`, trocar `visitors.length || visitorsInCare`
    por só `visitorsInCare` (que já é calculado certo).
23. **Busca global sem resultados de "Função"** dentro dos times.
24. **App do voluntário → Perfil**: falta trocar senha, toggle de tema,
    toggle de push, e editar dados pessoais depois do onboarding.
25. **Camada PWA ausente** (`manifest.json`, banner de instalação,
    `beforeinstallprompt`) — avaliar prioridade real com o usuário antes de
    entrar nesta fase, pode ser baixo valor comparado ao resto.

## Fase 24 — Permissão de edição da jornada (backfill histórico + aprovação líder↔membro)

> Adicionada depois das Fases 18-21 (a "jornada real com datas", commit `b26e4c3`,
> já está no ar, mas é só leitura). Motivação: quando uma igreja contrata o CE.X
> Service, os membros já têm um passado (decisão, batismo, curso, GC, serviço
> anteriores à existência do sistema). Hoje **não existe nenhuma tela que
> escreva** `journey[0]` (Decisão) e `journey[2]` (Fundamentos) — só
> Batismo/GC/Servindo são setados, e só como efeito colateral de outra ação
> administrativa. E ninguém, nem o próprio membro nem o líder, tem uma tela para
> declarar "isso já aconteceu antes, nesta data".
>
> Decisão do usuário (2026-07-08): só **Admin/Pastor** edita a jornada de
> qualquer pessoa diretamente, sem aprovação. O **próprio membro**, pelo app do
> voluntário, pode preencher/editar sua própria jornada (inclusive eventos
> passados, pré-sistema), mas isso fica **pendente até um líder aprovar**.
> Fica pra decidir no detalhamento da fase: se a edição feita por um **líder**
> (não admin) também precisa de aprovação de alguém acima, ou se líder só atua
> como aprovador das solicitações de membro (a Fase 21 deu ao líder escrita
> direta via RLS "LEAD"; essa regra pode precisar ficar mais estreita).
>
> Levantamento feito (ver conversa): o RBAC hoje é sólido em duas camadas
> (`core.role_permissions` = matriz papel→ação editável em Configurações →
> Permissões, `ServiceExactApp.tsx:5097-5146`; e RLS restrictive real em
> `supabase/migrations/0008_service_rls_roles.sql`, com camada LEAD
> `owner,master,pastor,lider` já cobrindo `members`, `timeline_events`,
> `enrollments`, `person_ministries`). Mas a granularidade é **por tabela
> inteira**, nunca por linha/dono do registro — não existe hoje "só edito a
> jornada de quem é meu", nem "membro só propõe, não edita direto". O autor da
> migration 0008 já deixou o comentário previndo isso (linhas ~70-76): RLS
> fina ligando `auth.uid() → service.people.user_id` entra como
> "refinamento futuro". Não existe também nenhum fluxo de
> solicitação→aprovação hoje; o mais próximo é `roster_assignments.status`
> (`ok/wait/no`), mas é o inverso (líder atribui, voluntário confirma/recusa) —
> e mesmo esse lado "voluntário responde" não está persistido ainda no mobile
> (`MobileApp.tsx` `TabEscala`, só `useState` local, sem `.update()`).

**Peças a desenhar em Plan Mode antes de codar:**

1. **Tabela nova de pendências de jornada** (`service.journey_change_requests`
   ou similar): `member_id`, `step` (decisão/batismo/fundamentos/gc/servindo),
   `event_date`, `note`, `requested_by` (people.user_id), `status`
   (`pendente/aprovado/rejeitado`), `reviewed_by`, `reviewed_at`. Espelha o
   padrão ternário de `roster_assignments.status`.
2. **RLS por linha**, não só por papel: membro só cria/edita solicitação onde
   `requested_by = auth.uid()` (via `people.user_id`); só admin/pastor
   grava direto em `members.journey`/`timeline_events`; líder grava/aprova
   pendências de quem está no time/GC dele (definir o filtro exato: por
   `ministry_id` do GC/time, análogo ao que a Fase 20 já fez para o Kanban).
3. **UI desktop**: fila de aprovação (algo como "Jornada pendente" na
   sidebar/Configurações ou dentro do drawer de Pessoa), com aprovar/rejeitar
   + edição direta para admin/pastor.
4. **UI mobile** (`MobileApp.tsx`, aba Perfil): formulário para o próprio
   voluntário declarar/editar suas etapas passadas, com data real; mostrar
   estado "pendente de aprovação" nas etapas que ainda não foram confirmadas.
5. **Backfill em massa**: pensar se a igreja precisa de uma via de importação
   (CSV/planilha) para carregar o histórico de muitos membros de uma vez, em
   vez de um por um — avaliar com o usuário se entra nesta fase ou fica pra
   depois.
6. Dependência a resolver antes ou junto: persistir de verdade a confirmação
   de escala no mobile (`TabEscala`), já que é o único precedente real de
   "ação do próprio voluntário gravando no banco" e hoje está quebrado (só
   estado local) — vale corrigir como parte da mesma leva de trabalho, mesmo
   não estando na lista original de gaps.

## Como retomar

Quando o usuário pedir pra começar: entrar em Plan Mode pra **Fase 18**,
reconferir cada item contra o código atual (a lista pode ter ficado
desatualizada entre esta sessão e a próxima — mesma lição da Fase 15),
escrever o plano específico da fase, implementar, testar em `/service/demo`,
commitar. Repetir fase a fase na ordem acima, ajustando se o usuário quiser
outra prioridade.

**Fase 24 é a última**, de propósito: só entrar nela depois de fechar 22 e 23
(decisão explícita do usuário em 2026-07-08). É a maior e mais nova da
rodada, precisa de Plan Mode dedicado por ter tabela nova, RLS por linha e
telas em dois apps (desktop + mobile) — reconferir com o usuário as
perguntas em aberto da seção (aprovação de edição de líder, escopo do
backfill em massa) antes de desenhar o schema.
