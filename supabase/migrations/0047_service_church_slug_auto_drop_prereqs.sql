-- CE.X Service · 0047 · Endereço da igreja automático + fim de courses.prereqs
--
-- 1. O login do membro é o da igreja (/{slug}/entrar), mas o slug só nascia
--    quando a igreja configurava a página pública ou no primeiro convite
--    enviado. Agora toda igreja (matriz ou congregação) ganha o slug já no
--    cadastro, por trigger, e as que existem sem slug são preenchidas aqui.
--    Quem define o próprio slug na página pública continua podendo: o trigger
--    só age quando o slug vem vazio.
-- 2. courses.prereqs foi substituído por service.requirements na 0043 e não é
--    mais lido nem gravado pelo app.
-- Rodar DEPOIS do deploy do código que parou de ler courses.prereqs.
-- Idempotente.

-- nome → slug no formato da constraint churches_slug_formato (^[a-z0-9-]{3,40}$)
create or replace function service.slug_from_name(p_name text)
returns text
language sql immutable as $$
  select case when length(s) >= 3 then s else left('igreja-' || s, 34) end
  from (
    select left(trim(both '-' from regexp_replace(
      translate(lower(coalesce(p_name, '')),
        'áàâãäåéèêëíìîïóòôõöúùûüçñ',
        'aaaaaaeeeeiiiiooooouuuucn'),
      '[^a-z0-9]+', '-', 'g')), 34) as s
  ) x
$$;

-- primeiro slug livre a partir do nome (igreja, igreja-2, igreja-3...)
create or replace function service.free_church_slug(p_name text, p_except uuid default null)
returns text
language plpgsql as $$
declare
  v_base text := service.slug_from_name(p_name);
  v_try text;
  i int := 1;
begin
  if v_base = 'igreja-' then v_base := 'igreja'; end if;
  loop
    v_try := case when i = 1 then v_base else v_base || '-' || i end;
    exit when not exists (
      select 1 from service.churches c where c.slug = v_try and (p_except is null or c.id <> p_except)
    );
    i := i + 1;
  end loop;
  return v_try;
end $$;

create or replace function service.churches_fill_slug()
returns trigger
language plpgsql as $$
begin
  if new.slug is null or btrim(new.slug::text) = '' then
    new.slug := service.free_church_slug(new.name, new.id);
  end if;
  return new;
end $$;

drop trigger if exists t_churches_fill_slug on service.churches;
create trigger t_churches_fill_slug
  before insert on service.churches
  for each row execute function service.churches_fill_slug();

-- igrejas que já existem sem endereço
do $$
declare r record;
begin
  for r in select id, name from service.churches where slug is null order by created_at loop
    update service.churches set slug = service.free_church_slug(r.name, r.id) where id = r.id;
  end loop;
end $$;

-- ── fim de courses.prereqs ──────────────────────────────────────────────────
alter table service.courses drop column if exists prereqs;
