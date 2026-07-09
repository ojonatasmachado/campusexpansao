-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0018 · SERVICE — FICHA DA CRIANÇA: campos extras + foto do responsável
-- Aditiva: só cria coluna/policy nova, não altera nada existente além da
-- correção de RLS abaixo (que só afrouxa, nunca aperta, o que já valia).
--
-- Achado ao implementar: service.people (de onde vem a foto do responsável)
-- está na camada LEAD de 0008 (só owner/master/pastor/lider escrevem). Isso
-- bloqueava o walk-in de responsável (professor comum, papel 'vol', cria um
-- people novo na hora pra visitante sem cadastro) e o autoatendimento (o
-- próprio responsável atualizando a própria foto). Corrigido abaixo com uma
-- policy mais fina : líder+ continua podendo tudo; além disso, qualquer
-- membro autenticado pode (a) criar uma pessoa SEM login (user_id is null,
-- o caso do walk-in) e (b) editar o PRÓPRIO registro (user_id = auth.uid()).
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.people
  add column photo_url text;

alter table service.children
  add column gender                  text check (gender in ('menino','menina')),
  add column emergency_contact_name  text,
  add column emergency_contact_phone text,
  add column image_authorized        boolean not null default false,
  add column dietary_restrictions    text,
  add column health_insurance        text,
  add column medication              text;

-- ── RLS: service.people escrita mais fina ─────────────────────────────────────
drop policy if exists svc_w_ins on service.people;
drop policy if exists svc_w_upd on service.people;

create policy svc_w_ins on service.people
  as restrictive for insert to authenticated
  with check (
    core.has_role(organization_id, 'owner','master','pastor','lider')
    or user_id is null
  );

create policy svc_w_upd on service.people
  as restrictive for update to authenticated
  using (
    core.has_role(organization_id, 'owner','master','pastor','lider')
    or user_id = auth.uid()
  )
  with check (
    core.has_role(organization_id, 'owner','master','pastor','lider')
    or user_id = auth.uid()
  );
