-- Service v7 5.3 · Notificação = ação (lei 9). A pessoa desliga categorias
-- (escala, mural, mensagens, caminhada); nada chega das 22h às 7h; o Mural
-- chega em resumo. O que não pode sair na hora entra numa fila que o
-- servidor esvazia depois (rota do agendador e a cada novo envio).

alter table service.people add column if not exists notif_off text[] not null default '{}';
alter table service.people drop constraint if exists people_notif_off_check;
alter table service.people add constraint people_notif_off_check
  check (notif_off <@ array['escala', 'mural', 'mensagens', 'caminhada']::text[]);
comment on column service.people.notif_off is 'Categorias de aviso que a pessoa desligou (lei 9).';

create or replace function service.my_notifications()
returns text[]
language sql stable security definer set search_path = service, public as $$
  select coalesce((select p.notif_off from service.people p where p.id = any(service.my_people()) limit 1), '{}')
$$;
grant execute on function service.my_notifications() to authenticated;

create or replace function service.set_my_notifications(p_off text[])
returns text
language plpgsql security definer set search_path = service, public as $$
begin
  if not (coalesce(p_off, '{}') <@ array['escala', 'mural', 'mensagens', 'caminhada']::text[]) then return 'invalido'; end if;
  update service.people set notif_off = coalesce(p_off, '{}') where id = any(service.my_people());
  return case when found then 'ok' else 'sem_ficha' end;
end $$;
grant execute on function service.set_my_notifications(text[]) to authenticated;

-- fila de avisos que esperam (silêncio ou resumo do Mural). Só o servidor
-- (service role) lê e escreve: RLS ligada sem regra para authenticated.
create table if not exists service.push_queue (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  person_id        uuid not null references service.people(id) on delete cascade,
  categoria        text not null check (categoria in ('escala', 'mural', 'mensagens', 'caminhada')),
  title            text not null,
  body             text not null,
  url              text,
  send_after       timestamptz not null,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);
comment on table service.push_queue is 'Avisos esperando o fim do silêncio (22h às 7h) ou o resumo do Mural (lei 9).';
create index if not exists push_queue_pendentes_idx on service.push_queue (send_after) where sent_at is null;
alter table service.push_queue enable row level security;
