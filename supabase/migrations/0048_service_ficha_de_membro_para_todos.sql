-- CE.X Service · 0048 · Toda pessoa com login tem ficha de membro
--
-- Líder, pastor e master também usam o app de membro "como qualquer
-- pessoa" (jornada, cursos, "Quero servir"), e tudo isso mora na ficha
-- (service.members). Quem cria a igreja e a liderança antiga só tinham
-- cadastro de pessoa (service.people), então o app deles ficava vazio.
--
-- · service.ensure_my_member(): cria a ficha da pessoa logada quando falta
--   (o app chama ao abrir). Não é trigger em people de propósito: o convite
--   liga a pessoa a uma ficha que já existe, e um trigger criaria outra.
-- · Preenche agora as fichas que faltam.
-- Idempotente.

create or replace function service.ensure_my_member()
returns integer
language plpgsql security definer set search_path = service, public as $$
declare
  v_count integer;
begin
  insert into service.members (organization_id, church_id, volunteer_id, name, email, phone, situation, journey)
  select p.organization_id, p.church_id, p.id, p.name, p.email, p.phone, 'membro', '[0,0,0,0,0]'::jsonb
  from service.people p
  where p.user_id = auth.uid()
    and not exists (select 1 from service.members m where m.volunteer_id = p.id);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function service.ensure_my_member() to authenticated;

-- fichas que faltam hoje (quem tem login e ainda não tem ficha)
insert into service.members (organization_id, church_id, volunteer_id, name, email, phone, situation, journey)
select p.organization_id, p.church_id, p.id, p.name, p.email, p.phone, 'membro', '[0,0,0,0,0]'::jsonb
from service.people p
where p.user_id is not null
  and not exists (select 1 from service.members m where m.volunteer_id = p.id);
