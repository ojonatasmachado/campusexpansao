-- v7 2.16 · Telefone guardado num formato só: "(11) 98000-1000".
-- Mesma regra de app/service/lib/telefone.ts: tira +55 e 0 na frente quando
-- sobra DDD + número (10 ou 11 dígitos) e formata. Qualquer outro valor fica
-- como foi digitado: nenhum dígito é jogado fora. Idempotente.

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

create or replace function service.trg_formatar_telefone()
returns trigger
language plpgsql
as $$
begin
  new.phone := service.formatar_telefone(new.phone);
  return new;
end;
$$;

drop trigger if exists formatar_telefone on service.members;
create trigger formatar_telefone before insert or update of phone on service.members
  for each row execute function service.trg_formatar_telefone();

drop trigger if exists formatar_telefone on service.people;
create trigger formatar_telefone before insert or update of phone on service.people
  for each row execute function service.trg_formatar_telefone();

-- dados que já existem
update service.members set phone = service.formatar_telefone(phone)
  where phone is not null and phone is distinct from service.formatar_telefone(phone);
update service.people set phone = service.formatar_telefone(phone)
  where phone is not null and phone is distinct from service.formatar_telefone(phone);
