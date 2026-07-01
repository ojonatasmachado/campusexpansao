-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0008 · SERVICE — RLS FINA POR PAPEL
-- A base (0006) já isola por tenant+produto: qualquer membro da org LÊ e (por
-- enquanto) escreve nas tabelas do Service. Aqui ESTREITAMOS a ESCRITA por papel
-- usando policies RESTRICTIVE (que se somam com AND à policy permissiva base).
--
-- Leitura NÃO é afetada (não há restrictive em SELECT): todo membro da org
-- continua vendo os dados. Só o INSERT/UPDATE/DELETE passa a exigir papel.
--
-- Camadas:
--   ADMIN  (owner/master/pastor)         → config da igreja e estrutura ministerial
--   LEAD   (owner/master/pastor/lider)   → operação do dia a dia
--   ABERTO (qualquer membro, inclui vol) → tabelas do app do membro (não listadas)
-- ═══════════════════════════════════════════════════════════════════════════

-- Aplica 3 policies RESTRICTIVE (insert/update/delete) exigindo um dos papéis.
create or replace function service._apply_write_roles(p_table text, p_roles text[])
returns void language plpgsql as $$
declare
  roles_sql text := (select string_agg(quote_literal(r), ',') from unnest(p_roles) r);
begin
  execute format($f$
    create policy svc_w_ins on service.%1$I as restrictive for insert to authenticated
      with check (core.has_role(organization_id, %2$s));
  $f$, p_table, roles_sql);

  execute format($f$
    create policy svc_w_upd on service.%1$I as restrictive for update to authenticated
      using (core.has_role(organization_id, %2$s))
      with check (core.has_role(organization_id, %2$s));
  $f$, p_table, roles_sql);

  execute format($f$
    create policy svc_w_del on service.%1$I as restrictive for delete to authenticated
      using (core.has_role(organization_id, %2$s));
  $f$, p_table, roles_sql);
end $$;

-- ── Camada ADMIN: config da igreja + estrutura ministerial ─────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'churches','church_identity','cycles','history_entries','ministerial_titles',
    'ministries','ministry_positions','tags','rooms'
  ]
  loop
    perform service._apply_write_roles(t, array['owner','master','pastor']);
  end loop;
end $$;

-- ── Camada LEAD: operação (líder do time + pastores + master) ──────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'people','members','person_ministries','fellowship_groups',
    'events','event_schedule_items','setlist_songs','roster_assignments',
    'visitors','visitor_notes','announcements','wall_posts',
    'decisions','baptism_classes','baptism_candidates','timeline_events',
    'courses','course_modules','course_lessons','enrollments',
    'reservations','meetings','meeting_actions','rehearsals',
    'boards','cards','card_comments'
  ]
  loop
    perform service._apply_write_roles(t, array['owner','master','pastor','lider']);
  end loop;
end $$;

-- ── Camada ABERTO (sem restrictive de papel; base permissiva já cobre) ─────────
-- prayer_requests, chats, chat_members, messages: o voluntário/membro escreve
-- (pedido de oração, mensagem no chat). O isolamento por tenant continua valendo.
-- Refinamento futuro (ex.: "só mexo no card onde sou responsável", "vol edita a
-- própria disponibilidade") entra aqui como restrictive extra amarrando
-- auth.uid() → service.people.user_id / service.members.
