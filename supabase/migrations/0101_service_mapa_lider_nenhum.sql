-- G13: quem teve o acesso tirado ('nenhum') e deixa de cuidar da última área
-- volta a ser uma pessoa comum: a linha 'nenhum' sai. Assim, se um dia virar
-- responsável de novo, ganha o acesso automático (e o pastor vê na lista).
create or replace function service.trg_map_areas_responsavel()
returns trigger
language plpgsql security definer set search_path = service, public as $$
declare v_novo uuid; v_velho uuid;
begin
  v_novo := case when tg_op in ('INSERT', 'UPDATE') then new.responsavel_id end;
  v_velho := case when tg_op in ('UPDATE', 'DELETE') then old.responsavel_id end;
  if v_novo is not null and v_novo is distinct from v_velho
     and not exists (select 1 from service.map_access ma where ma.person_id = v_novo and ma.escopo = 'nenhum') then
    insert into service.person_grants (organization_id, person_id, grant_code)
    values (new.organization_id, v_novo, 'mapa')
    on conflict (person_id, grant_code) do nothing;
  end if;
  if v_velho is not null and v_velho is distinct from v_novo
     and not exists (select 1 from service.map_areas ar where ar.responsavel_id = v_velho and ar.id <> coalesce(new.id, old.id)) then
    delete from service.map_access where person_id = v_velho and escopo = 'nenhum';
    if not exists (select 1 from service.map_access ma where ma.person_id = v_velho) then
      delete from service.person_grants where person_id = v_velho and grant_code = 'mapa';
    end if;
  end if;
  return null;
end $$;
revoke all on function service.trg_map_areas_responsavel() from public, anon, authenticated;

-- quem já está nessa situação
delete from service.map_access ma
 where ma.escopo = 'nenhum'
   and not exists (select 1 from service.map_areas ar where ar.responsavel_id = ma.person_id);
