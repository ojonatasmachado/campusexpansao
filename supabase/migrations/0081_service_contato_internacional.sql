-- País informado no aceite; legado sem país não é reclassificado.
alter table service.members add column if not exists country text;

-- Preserva letras, espaços e hífen em códigos postais. Mesma assinatura,
-- autorização por my_members e regra de preservar dados opcionais vazios.
create or replace function service.update_my_member_contact(
  p_member uuid,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_birth text default null,
  p_postal_code text default null,
  p_street text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null
)
returns boolean
language plpgsql security definer set search_path = service, public as $$
begin
  if not (p_member = any(service.my_members())) then
    return false;
  end if;
  if length(trim(p_postal_code)) > 32 then
    raise exception 'Código postal deve ter até 32 caracteres.' using errcode = '22001';
  end if;
  update service.members set
    name = coalesce(nullif(trim(p_name), ''), name),
    email = coalesce(nullif(trim(p_email), ''), email),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    birth = coalesce(nullif(p_birth, ''), birth),
    postal_code = coalesce(nullif(trim(p_postal_code), ''), postal_code),
    street = coalesce(nullif(p_street, ''), street),
    neighborhood = coalesce(nullif(p_neighborhood, ''), neighborhood),
    city = coalesce(nullif(p_city, ''), city),
    state = coalesce(nullif(p_state, ''), state),
    updated_at = now()
  where id = p_member;
  return found;
end $$;

grant execute on function service.update_my_member_contact(uuid, text, text, text, text, text, text, text, text, text) to authenticated;

-- Sem reescrever dados legados: país já perdido não pode ser inferido.
create or replace function service.formatar_telefone(p text)
returns text
language plpgsql
immutable
as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if p is null or btrim(p) = '' then
    return nullif(btrim(coalesce(p, '')), '');
  end if;
  -- Um país explícito não brasileiro deve sobreviver ao trigger.
  if left(btrim(p), 1) = '+' and left(btrim(p), 3) <> '+55' then
    return btrim(p);
  end if;
  if length(d) in (12, 13) and left(d, 2) = '55' then d := substr(d, 3); end if;
  if length(d) in (11, 12) and left(d, 1) = '0' then d := substr(d, 2); end if;
  if length(d) = 11 then
    return '(' || substr(d, 1, 2) || ') ' || substr(d, 3, 5) || '-' || substr(d, 8, 4);
  elsif length(d) = 10 then
    return '(' || substr(d, 1, 2) || ') ' || substr(d, 3, 4) || '-' || substr(d, 7, 4);
  end if;
  return btrim(p);
end;
$$;
