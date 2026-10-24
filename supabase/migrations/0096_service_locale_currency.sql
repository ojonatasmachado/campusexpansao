-- N1: locale da conta e moeda única da rede. Valores legados permanecem BRL.
-- Sem câmbio: a moeda não muda depois do primeiro valor financeiro.

alter table core.users add column if not exists locale_code text not null default 'pt-BR';
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'core.users'::regclass and conname = 'users_locale_code_check') then
    alter table core.users add constraint users_locale_code_check check (locale_code in ('pt-BR', 'en-US', 'es-ES'));
  end if;
end $$;

create or replace function service.my_locale()
returns text language sql stable security definer set search_path = core, public as $$
  select coalesce((select locale_code from core.users where id = auth.uid()), 'pt-BR');
$$;
create or replace function service.set_my_locale(p_locale text)
returns text language plpgsql security definer set search_path = core, public as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = '42501'; end if;
  if p_locale is null or p_locale not in ('pt-BR', 'en-US', 'es-ES') then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;
  update core.users set locale_code = p_locale where id = auth.uid();
  if not found then raise exception 'user_not_found' using errcode = '42501'; end if;
  return p_locale;
end $$;
revoke all on function service.my_locale(), service.set_my_locale(text) from public, anon;
grant execute on function service.my_locale(), service.set_my_locale(text) to authenticated;

create table if not exists service.organization_preferences (
  organization_id uuid primary key references core.organizations(id) on delete cascade,
  currency_code text not null default 'BRL' check (currency_code in ('BRL', 'EUR', 'USD')),
  currency_locked boolean not null default false
);
comment on table service.organization_preferences is 'Preferências da rede Service. Moeda única para totais financeiros por organization_id.';
alter table service.organization_preferences enable row level security;
drop policy if exists organization_preferences_read on service.organization_preferences;
create policy organization_preferences_read on service.organization_preferences for select to authenticated
  using (core.can_access(organization_id, 'service'));
revoke all on service.organization_preferences from public, anon, authenticated;
grant select on service.organization_preferences to authenticated;
grant all on service.organization_preferences to service_role;

insert into service.organization_preferences (organization_id, currency_locked)
select distinct c.organization_id,
  exists (select 1 from service.fin_transactions t where t.organization_id = c.organization_id)
  or exists (select 1 from service.fin_accounts a where a.organization_id = c.organization_id and a.opening_balance_cents <> 0)
  or exists (select 1 from service.fin_recurring r where r.organization_id = c.organization_id)
  or exists (select 1 from service.fin_campaigns k where k.organization_id = c.organization_id)
  or exists (select 1 from service.fin_offering_counts o where o.organization_id = c.organization_id)
from service.churches c on conflict (organization_id) do nothing;

create or replace function service.ensure_organization_preferences()
returns trigger language plpgsql security definer set search_path = service, public as $$
begin
  insert into service.organization_preferences (organization_id) values (new.organization_id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists t_organization_preferences on service.churches;
create trigger t_organization_preferences after insert on service.churches
  for each row execute function service.ensure_organization_preferences();

create or replace function service.set_organization_currency(p_org uuid, p_currency text)
returns text language plpgsql security definer set search_path = core, service, public as $$
declare pref service.organization_preferences;
begin
  if auth.uid() is null or not core.can_access(p_org, 'service') or not core.has_role(p_org, 'owner', 'master', 'pastor') then
    raise exception 'currency_forbidden' using errcode = '42501';
  end if;
  if p_currency is null or p_currency not in ('BRL', 'EUR', 'USD') then
    raise exception 'invalid_currency' using errcode = '22023';
  end if;
  insert into service.organization_preferences (organization_id) values (p_org) on conflict do nothing;
  -- O primeiro valor financeiro trava a mesma linha, serializando as duas operações.
  select * into strict pref from service.organization_preferences where organization_id = p_org for update;
  if pref.currency_code = p_currency then return p_currency; end if;
  if pref.currency_locked then raise exception 'currency_locked' using errcode = '23514'; end if;
  update service.organization_preferences set currency_code = p_currency where organization_id = p_org;
  return p_currency;
end $$;
revoke all on function service.set_organization_currency(uuid, text) from public, anon;
grant execute on function service.set_organization_currency(uuid, text) to authenticated;

create or replace function service.fin_guard_currency()
returns trigger language plpgsql security definer set search_path = service, public as $$
declare
  code text;
  expected text;
  meaningful boolean;
begin
  meaningful := tg_table_name <> 'fin_accounts' or coalesce((to_jsonb(new)->>'opening_balance_cents')::bigint, 0) <> 0;
  if not meaningful then return new; end if;
  if auth.uid() is not null and not service.fin_can(new.organization_id, true) then
    raise exception 'currency_forbidden' using errcode = '42501';
  end if;
  insert into service.organization_preferences (organization_id) values (new.organization_id) on conflict do nothing;
  select currency_code into strict code from service.organization_preferences where organization_id = new.organization_id for update;
  if auth.uid() is not null then
    -- Clientes antigos só interpretavam BRL. Em outra moeda, precisam declarar
    -- explicitamente a moeda que estava no formulário, não apenas mandar centavos.
    expected := coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-service-currency', 'BRL');
    if expected <> code then raise exception 'currency_changed' using errcode = '23514'; end if;
    if code <> 'BRL' and (
      (tg_table_name = 'fin_transactions' and to_jsonb(new)->>'method' in ('pix', 'boleto'))
      or (tg_table_name = 'fin_recurring' and to_jsonb(new)->>'method' in ('pix', 'boleto'))
      or (tg_table_name = 'fin_offering_counts' and coalesce((to_jsonb(new)->>'pix_cents')::bigint, 0) > 0)
    ) then raise exception 'payment_method_unavailable' using errcode = '23514'; end if;
  end if;
  update service.organization_preferences set currency_locked = true where organization_id = new.organization_id;
  return new;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['fin_accounts', 'fin_transactions', 'fin_recurring', 'fin_campaigns', 'fin_offering_counts'] loop
    execute format('drop trigger if exists t_fin_currency on service.%I', table_name);
    execute format('create trigger t_fin_currency before insert or update on service.%I for each row execute function service.fin_guard_currency()', table_name);
  end loop;
end $$;

-- A view preserva a RLS das duas tabelas. A aplicação não escolhe moeda por congregação.
create or replace view service.churches_with_preferences with (security_invoker = true) as
  select c.*, coalesce(p.currency_code, 'BRL') as currency_code, coalesce(p.currency_locked, false) as currency_locked
  from service.churches c left join service.organization_preferences p on p.organization_id = c.organization_id;
revoke all on service.churches_with_preferences from public, anon;
grant select on service.churches_with_preferences to authenticated, service_role;
revoke all on function service.ensure_organization_preferences(), service.fin_guard_currency() from public, anon, authenticated;
notify pgrst, 'reload schema';
