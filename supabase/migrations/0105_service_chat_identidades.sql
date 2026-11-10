-- Identidade mínima para as próprias conversas. Não amplia RLS de members/people.
create or replace function service.chat_identidades()
returns table(chat_id uuid, member_id uuid, name text, photo_url text)
language sql stable security definer
set search_path = ''
as $$
  select cm.chat_id, m.id, m.name, p.photo_url
  from service.chat_members cm
  join service.chats c on c.id = cm.chat_id and c.organization_id = cm.organization_id
  join service.members m on m.id = cm.member_id and m.organization_id = c.organization_id
  left join service.people p on p.id = m.volunteer_id and p.organization_id = m.organization_id
  where auth.uid() is not null
    and core.can_access(c.organization_id, 'service')
    and cm.chat_id = any(service.my_chats())
$$;
revoke all on function service.chat_identidades() from public, anon;
grant execute on function service.chat_identidades() to authenticated;
comment on function service.chat_identidades() is 'Nome e foto dos participantes das próprias conversas, sem acesso à ficha completa. Nem a gestão recebe identidades de conversas alheias.';
