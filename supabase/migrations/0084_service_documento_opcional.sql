-- Documento voluntário, separado das listas de pessoas e das fichas públicas.
create table if not exists service.member_documents (
  member_id uuid primary key references service.members(id) on delete cascade,
  cpf text check (cpf is null or cpf ~ '^\d{11}$'),
  updated_at timestamptz not null default now()
);
alter table service.member_documents enable row level security;
revoke all on service.member_documents from public, anon, authenticated;
grant all on service.member_documents to service_role;

create or replace function service.my_member_cpf(p_member uuid)
returns text language plpgsql stable security definer set search_path = service, public as $$
begin
  if not (p_member = any(service.my_members())) then return null; end if;
  return (select cpf from service.member_documents where member_id = p_member);
end $$;

create or replace function service.save_my_member_cpf(p_member uuid, p_cpf text)
returns text language plpgsql security definer set search_path = service, public as $$
declare d text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'); n integer; i integer; soma integer; resto integer;
begin
  if not (p_member = any(service.my_members())) then return 'sem_ficha'; end if;
  if d <> '' then
    if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return 'cpf_invalido'; end if;
    for n in 9..10 loop
      soma := 0;
      for i in 1..n loop soma := soma + substr(d, i, 1)::integer * (n + 2 - i); end loop;
      resto := soma % 11;
      if substr(d, n + 1, 1)::integer <> (case when resto < 2 then 0 else 11 - resto end) then return 'cpf_invalido'; end if;
    end loop;
  end if;
  insert into service.member_documents(member_id, cpf) values (p_member, nullif(d, ''))
  on conflict (member_id) do update set cpf = excluded.cpf, updated_at = now();
  return 'ok';
end $$;
revoke all on function service.my_member_cpf(uuid) from public, anon;
revoke all on function service.save_my_member_cpf(uuid, text) from public, anon;
grant execute on function service.my_member_cpf(uuid) to authenticated;
grant execute on function service.save_my_member_cpf(uuid, text) to authenticated;
