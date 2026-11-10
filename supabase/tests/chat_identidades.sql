\set ON_ERROR_STOP on
-- Dados isolados e sempre desfeitos. Roda no v7ci depois das migrações.
begin;
do $$
declare u uuid; o uuid; c uuid; i integer;
begin
  insert into core.organizations(id,name) values
    ('b9000000-0000-4000-8000-000000000001','M9 A'),('b9000000-0000-4000-8000-000000000002','M9 B');
  insert into core.product_access(organization_id,product_code,source)
    select id,'service','manual' from core.organizations where name in ('M9 A','M9 B');
  insert into service.churches(id,organization_id,name) values
    ('c9000000-0000-4000-8000-000000000001','b9000000-0000-4000-8000-000000000001','M9 A'),
    ('c9000000-0000-4000-8000-000000000002','b9000000-0000-4000-8000-000000000002','M9 B');
  for i in 1..5 loop
    u := ('a9000000-0000-4000-8000-00000000000'||i)::uuid;
    o := case when i <= 3 then 'b9000000-0000-4000-8000-000000000001'::uuid else 'b9000000-0000-4000-8000-000000000002'::uuid end;
    c := case when i <= 3 then 'c9000000-0000-4000-8000-000000000001'::uuid else 'c9000000-0000-4000-8000-000000000002'::uuid end;
    insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values(u,'m9-'||i||'@test.invalid','{}','{}');
    insert into core.users(id) values(u) on conflict do nothing;
    insert into core.memberships(user_id,organization_id,role) values(u,o,case when i in (2,3,5) then 'master' else 'membro' end);
    insert into service.people(id,organization_id,church_id,user_id,name,photo_url)
      values(u,o,c,u,'M9 pessoa '||i,'https://example.invalid/m9-'||i||'.png');
    insert into service.members(id,organization_id,church_id,volunteer_id,name,phone,email)
      values(u,o,c,u,'M9 pessoa '||i,'privado','privado-'||i||'@test.invalid');
  end loop;
  insert into service.chats(id,organization_id,church_id,kind) values
    ('d9000000-0000-4000-8000-000000000001','b9000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000001','dm'),
    ('d9000000-0000-4000-8000-000000000002','b9000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000001','dm'),
    ('d9000000-0000-4000-8000-000000000003','b9000000-0000-4000-8000-000000000002','c9000000-0000-4000-8000-000000000002','dm');
  insert into service.chat_members(chat_id,member_id,organization_id) values
    ('d9000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000001','b9000000-0000-4000-8000-000000000001'),
    ('d9000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000002','b9000000-0000-4000-8000-000000000001'),
    ('d9000000-0000-4000-8000-000000000002','a9000000-0000-4000-8000-000000000002','b9000000-0000-4000-8000-000000000001'),
    ('d9000000-0000-4000-8000-000000000002','a9000000-0000-4000-8000-000000000003','b9000000-0000-4000-8000-000000000001'),
    ('d9000000-0000-4000-8000-000000000003','a9000000-0000-4000-8000-000000000004','b9000000-0000-4000-8000-000000000002'),
    ('d9000000-0000-4000-8000-000000000003','a9000000-0000-4000-8000-000000000005','b9000000-0000-4000-8000-000000000002');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from service.chat_identidades()) <> 2 then raise exception 'membro: somente dois participantes da própria DM'; end if;
  if exists(select 1 from service.members where id='a9000000-0000-4000-8000-000000000002') then raise exception 'ficha privada da liderança vazou'; end if;
  if not exists(select 1 from service.chat_identidades() where name='M9 pessoa 2' and photo_url='https://example.invalid/m9-2.png') then raise exception 'identidade mínima ausente'; end if;
  if exists(select 1 from service.chat_identidades() f where to_jsonb(f)-array['chat_id','member_id','name','photo_url'] <> '{}'::jsonb) then raise exception 'colunas privadas na projeção'; end if;
end $$;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000003',true);
do $$ begin
  if exists(select 1 from service.chat_identidades() where chat_id='d9000000-0000-4000-8000-000000000001') then raise exception 'master recebeu identidade de conversa alheia'; end if;
  if (select count(*) from service.chat_identidades()) <> 2 then raise exception 'master: própria conversa não encontrada'; end if;
end $$;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000004',true);
do $$ begin
  if exists(select 1 from service.chat_identidades() where chat_id<>'d9000000-0000-4000-8000-000000000003') then raise exception 'vazamento entre organizações'; end if;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if exists(select 1 from service.chat_identidades()) then raise exception 'sessão sem usuário recebeu identidades'; end if;
  if has_function_privilege('anon','service.chat_identidades()','execute') then raise exception 'anon pode executar'; end if;
end $$;
reset role;
update core.memberships set status='suspended' where user_id='a9000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000001',true);
do $$ begin
  if exists(select 1 from service.chat_identidades()) then raise exception 'membro suspenso recebeu identidades'; end if;
end $$;
reset role;
rollback;
\echo 'Chat identidades: nome/foto, ficha privada, participante, master alheio, organização, sessão vazia, anon e suspensão: OK.'
