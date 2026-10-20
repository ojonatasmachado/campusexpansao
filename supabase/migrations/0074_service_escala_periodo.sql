-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0074 · Escala de um período inteiro: rascunho
-- A escala montada para 1 a 12 meses é gravada como rascunho: a liderança vê
-- e ajusta, a pessoa escalada só vê depois de "Publicar e avisar".
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.roster_assignments
  add column if not exists rascunho boolean not null default false;

comment on column service.roster_assignments.rascunho is
  'true: escala ainda não publicada (montada pelo período). Só a liderança e quem lidera o time leem; ao publicar vira false.';

create index if not exists roster_assignments_rascunho_idx
  on service.roster_assignments (event_id) where rascunho;

-- Leitura do rascunho: restritiva, soma com svc_r_scope (0044). Linha publicada
-- passa direto; rascunho só para quem tem liberação de pessoas/times (inclui
-- master, pastor e líder) ou lidera o time da função.
drop policy if exists svc_r_rascunho on service.roster_assignments;
create policy svc_r_rascunho on service.roster_assignments as restrictive for select to authenticated
  using (
    not rascunho
    or service.can_read(organization_id, array['pessoas','times'])
    or position_id in (
      select mp.id from service.ministry_positions mp
      join service.person_ministries pm on pm.ministry_id = mp.ministry_id and pm.is_leader
      where pm.person_id in (select unnest(service.my_people()))
    )
  );
