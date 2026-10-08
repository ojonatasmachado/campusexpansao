-- ═══════════════════════════════════════════════════════════════════════════
-- 0057 · Service v7 · 4.9 · tamanho do texto no perfil da pessoa
--
-- Sete posições, como em Ajustes do iPhone: corpo de 14, 15, 16, 17, 19, 21 e
-- 23px (padrão na quarta, 17px). Guarda a posição (0 a 6), não o fator; o app
-- faz fator = corpo / 17 (app/service/lib/text-scale.ts). Nulo = a pessoa
-- nunca escolheu (o app usa o tamanho do sistema, quando o navegador informa).
-- A cópia no aparelho continua em localStorage.
-- Só a própria pessoa grava, pela RPC set_my_text_size (vale para todas as
-- fichas dela, uma por igreja). A leitura é pela my_text_size.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.members
  add column if not exists text_size smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_text_size_check') then
    alter table service.members add constraint members_text_size_check check (text_size is null or text_size between 0 and 6);
  end if;
end $$;

comment on column service.members.text_size is 'Tamanho do texto do app (posição 0 a 6: corpo 14, 15, 16, 17, 19, 21, 23px). Nulo = não escolheu.';

create or replace function service.set_my_text_size(p_size smallint)
returns integer
language plpgsql security definer set search_path = service, public as $$
declare
  v_count integer;
begin
  if p_size is not null and (p_size < 0 or p_size > 6) then
    raise exception 'tamanho fora da faixa (0 a 6)';
  end if;
  update service.members m
     set text_size = p_size
    from service.people p
   where m.volunteer_id = p.id
     and p.user_id = auth.uid();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function service.my_text_size()
returns smallint
language sql stable security definer set search_path = service, public as $$
  select m.text_size
    from service.members m
    join service.people p on p.id = m.volunteer_id
   where p.user_id = auth.uid()
     and m.text_size is not null
   order by m.created_at
   limit 1;
$$;

revoke all on function service.set_my_text_size(smallint) from public;
revoke all on function service.my_text_size() from public;
grant execute on function service.set_my_text_size(smallint) to authenticated;
grant execute on function service.my_text_size() to authenticated;
