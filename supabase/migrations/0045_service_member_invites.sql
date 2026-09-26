-- CE.X Service · 0045 · Convite do membro sem e-mail na hora do cadastro
--
-- O líder cadastra a pessoa só com nome, sobrenome e telefone e manda o link
-- pelo WhatsApp. A conta não existe ainda: nasce quando a pessoa abre o link
-- e informa e-mail, senha e CEP (app/service/convite). Antes (Fase 1) o
-- convite era guardado no app_metadata de uma conta criada com o e-mail que
-- o líder digitava.
--
-- Só o servidor (service role) lê e escreve aqui: nenhuma policy pra
-- authenticated/anon. O token nunca fica em claro, só o hash sha256.
-- Idempotente.

create table if not exists service.member_invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations(id) on delete cascade,
  member_id        uuid not null references service.members(id) on delete cascade,
  token_hash       text not null unique,
  expires_at       timestamptz not null,
  used_at          timestamptz,
  created_by       uuid references core.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
comment on table service.member_invites is 'Link de convite do membro (token só em hash). Uso único, 7 dias. Só o servidor acessa.';
create index if not exists member_invites_member_idx on service.member_invites (member_id);

alter table service.member_invites enable row level security;
revoke all on service.member_invites from anon, authenticated;
grant all on service.member_invites to service_role;
