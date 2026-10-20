-- Service v7 · jornada "Boletim da semana" e Mural completo: rascunho,
-- agendamento e urgência na publicação.
--
-- status:
--   publicado  no ar (padrão, como tudo que já existe)
--   rascunho   salvo sem publicar; só a liderança vê no painel
--   agendado   entra no ar em publish_at; o agendador de hora em hora
--              (rota /api/service/cron/lembretes, o mesmo do lembrete da 0062)
--              publica e manda a notificação a publish_to, fora do silêncio
--              das 22h às 7h.
-- Ao entrar no ar (publicar agora, publicar o rascunho ou pelo agendador),
-- created_at passa a ser a hora da publicação: o Mural e o app ordenam e
-- mostram "há 2h" por ele.
--
-- urgent: só muda o destaque no Mural e a prioridade do cartão no Início do
-- app (lei 5). Não fura o silêncio nem a escolha de quem desligou o Mural.
--
-- remind_hours: lembrete "em 24h/48h" escolhido num rascunho ou agendamento;
-- o remind_at é calculado quando a publicação entra no ar.

alter table service.announcements add column if not exists status text not null default 'publicado';
do $$ begin
  alter table service.announcements add constraint announcements_status_chk check (status in ('publicado', 'rascunho', 'agendado'));
exception when duplicate_object then null; end $$;
alter table service.announcements add column if not exists publish_at timestamptz;
alter table service.announcements add column if not exists publish_to uuid[];
alter table service.announcements add column if not exists publish_push boolean not null default true;
alter table service.announcements add column if not exists urgent boolean not null default false;
alter table service.announcements add column if not exists remind_hours smallint;
do $$ begin
  alter table service.announcements add constraint announcements_agendado_chk check (status <> 'agendado' or publish_at is not null);
exception when duplicate_object then null; end $$;

comment on column service.announcements.status is 'publicado (no ar), rascunho (só a liderança vê) ou agendado (entra no ar em publish_at).';
comment on column service.announcements.publish_at is 'Quando a publicação agendada entra no ar.';
comment on column service.announcements.publish_to is 'Membros do público no momento do agendamento (service.members.id), para a notificação.';
comment on column service.announcements.publish_push is 'Manda notificação no app ao entrar no ar.';
comment on column service.announcements.urgent is 'Urgente: destaque no Mural e prioridade maior do cartão no Início do app.';
comment on column service.announcements.remind_hours is 'Lembrete relativo (24 ou 48) escolhido antes de publicar; vira remind_at ao entrar no ar.';

create index if not exists announcements_agendado_idx on service.announcements (publish_at) where status = 'agendado';

-- Rascunho e agendado não chegam ao membro: só a liderança lê.
-- (Restritiva: soma com AND à regra base de organização da 0006.)
drop policy if exists svc_r_no_ar on service.announcements;
create policy svc_r_no_ar on service.announcements as restrictive for select to authenticated
  using (status = 'publicado' or service.is_lead(organization_id));
