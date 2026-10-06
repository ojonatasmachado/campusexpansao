-- Service v7 4.15 · Mensagens com não lidas: quando cada pessoa leu a conversa
-- pela última vez. Linhas que já existem contam como lidas agora (ninguém
-- recebe uma enxurrada de "não lidas" antigas no dia da atualização).

alter table service.chat_members add column if not exists last_read_at timestamptz not null default now();
comment on column service.chat_members.last_read_at is 'Até quando a pessoa leu a conversa; mensagens de outros depois disso contam como não lidas.';

-- a pessoa marca como lida só a própria linha (sem abrir update geral em chat_members)
create or replace function service.marcar_conversa_lida(p_chat uuid)
returns text
language plpgsql security definer set search_path = service, public as $$
declare
  n int;
begin
  update service.chat_members cm set last_read_at = now()
  where cm.chat_id = p_chat and cm.member_id = any(service.my_members());
  get diagnostics n = row_count;
  return case when n > 0 then 'ok' else 'fora' end;
end $$;
grant execute on function service.marcar_conversa_lida(uuid) to authenticated;
