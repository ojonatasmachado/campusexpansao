-- G7 (mapa/PLANO.md §10): o rodapé do mapa diz "N pessoas sem CEP" e leva à
-- lista. Só para pastor e administração (quem abre a ficha e libera o mapa):
-- a lista traz o nome de qualquer membro, inclusive de quem não aceitou o termo
-- do mapa, então quem só foi liberado na tela "Quem vê o mapa" não a recebe.
-- Devolve nome e se tem CEP (sem CEP x CEP que não achamos), nunca o endereço.
create or replace function service.mapa_sem_ponto(p_org uuid)
returns table (id uuid, nome text, tem_cep boolean)
language plpgsql stable security definer set search_path = service, core, public as $$
begin
  if not core.has_role(p_org, 'owner', 'master', 'pastor') then raise exception 'sem_acesso'; end if;
  return query
  select m.id, m.name, coalesce(regexp_replace(m.postal_code, '\D', '', 'g'), '') <> ''
    from service.members m
   where m.organization_id = p_org
     and m.latitude is null
   order by m.name;
end $$;
revoke all on function service.mapa_sem_ponto(uuid) from public, anon;
grant execute on function service.mapa_sem_ponto(uuid) to authenticated;
