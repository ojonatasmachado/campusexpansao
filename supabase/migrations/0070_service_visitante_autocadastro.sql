-- 0070 · Visitante se cadastra sozinho por QR ou link (/[slug]/visita).
--
-- A gestão liga o autocadastro em Visitantes › QR e link. Fica em
-- service.churches.settings.autocadastro = { ativo: boolean, responsavelId?: uuid }.
-- A página pública não lê nada do banco pelo navegador: o servidor monta a
-- página (service role) e o envio passa só por service.visitante_autocadastro,
-- security definer, que valida tudo e grava o visitante como "novo" com
-- origem "QR/link". Nenhuma leitura nova para anon.

-- ── colunas novas em service.visitors ─────────────────────────────────────────
alter table service.visitors add column if not exists email       text;
alter table service.visitors add column if not exists heard_from  text;
alter table service.visitors add column if not exists invited_by  text;
alter table service.visitors add column if not exists interests   text[] not null default '{}';
alter table service.visitors add column if not exists consent_at  timestamptz;

comment on column service.visitors.heard_from is 'Como a pessoa conheceu a igreja (autocadastro): instagram, amigo, passando, evento, outro.';
comment on column service.visitors.invited_by is 'Quem convidou, em texto livre (autocadastro).';
comment on column service.visitors.interests  is 'Interesses marcados no autocadastro: conhecer, grupo, oracao, servir, batismo, criancas.';
comment on column service.visitors.consent_at is 'Quando a pessoa aceitou o uso dos dados para contato (LGPD).';

-- limite contra abuso: busca rápida dos envios recentes por igreja
create index if not exists visitors_autocadastro_idx
  on service.visitors (church_id, created_at desc) where origin = 'QR/link';

-- ── RPC pública ──────────────────────────────────────────────────────────────
-- Retorna 'ok' ou o motivo: 'fechado' (igreja não existe ou autocadastro
-- desligado), 'nome', 'telefone', 'email', 'consentimento', 'repetido'
-- (mesmo telefone nos últimos 10 minutos), 'limite' (mais de 30 envios na
-- igreja nos últimos 10 minutos).
create or replace function service.visitante_autocadastro(
  p_slug        text,
  p_name        text,
  p_phone       text,
  p_email       text,
  p_heard_from  text,
  p_invited_by  text,
  p_interests   text[],
  p_consent     boolean
)
returns text
language plpgsql volatile security definer set search_path = service, public as $$
declare
  v_church   service.churches%rowtype;
  v_cfg      jsonb;
  v_name     text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_digits   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email    text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_heard    text := nullif(btrim(coalesce(p_heard_from, '')), '');
  v_invited  text := nullif(regexp_replace(btrim(coalesce(p_invited_by, '')), '\s+', ' ', 'g'), '');
  v_interest text[];
  v_resp     uuid;
  v_phone    text;
begin
  select * into v_church from service.churches where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then return 'fechado'; end if;

  v_cfg := coalesce(v_church.settings -> 'autocadastro', '{}'::jsonb);
  if coalesce((v_cfg ->> 'ativo')::boolean, false) is not true then return 'fechado'; end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then return 'nome'; end if;

  -- celular brasileiro com DDD (10 ou 11 dígitos), aceita +55 na frente
  if v_digits like '55%' and char_length(v_digits) in (12, 13) then v_digits := substr(v_digits, 3); end if;
  if char_length(v_digits) not in (10, 11) then return 'telefone'; end if;

  if v_email is not null and (char_length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then return 'email'; end if;
  if p_consent is not true then return 'consentimento'; end if;

  if v_heard is not null and v_heard not in ('instagram', 'amigo', 'passando', 'evento', 'outro') then v_heard := 'outro'; end if;
  v_invited := left(v_invited, 120);
  select coalesce(array_agg(distinct i), '{}') into v_interest
    from unnest(coalesce(p_interests, '{}')) i
   where i in ('conhecer', 'grupo', 'oracao', 'servir', 'batismo', 'criancas');

  if exists (
    select 1 from service.visitors
     where church_id = v_church.id and origin = 'QR/link'
       and created_at > now() - interval '10 minutes'
       and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits
  ) then return 'repetido'; end if;

  if (select count(*) from service.visitors
       where church_id = v_church.id and origin = 'QR/link'
         and created_at > now() - interval '10 minutes') >= 30 then return 'limite'; end if;

  -- responsável escolhido pela gestão, se ainda for alguém desta organização
  begin
    v_resp := nullif(v_cfg ->> 'responsavelId', '')::uuid;
  exception when others then v_resp := null;
  end;
  if v_resp is not null and not exists (
    select 1 from service.people where id = v_resp and organization_id = v_church.organization_id
  ) then v_resp := null; end if;

  v_phone := case char_length(v_digits)
    when 11 then format('(%s) %s %s-%s', substr(v_digits, 1, 2), substr(v_digits, 3, 1), substr(v_digits, 4, 4), substr(v_digits, 8, 4))
    else format('(%s) %s-%s', substr(v_digits, 1, 2), substr(v_digits, 3, 4), substr(v_digits, 7, 4))
  end;

  insert into service.visitors (
    organization_id, church_id, name, phone, email, stage, visited_on, origin,
    heard_from, invited_by, interests, consent_at, responsible_id, due, due_status
  ) values (
    v_church.organization_id, v_church.id, v_name, v_phone, v_email, 'novo',
    to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD'), 'QR/link',
    v_heard, v_invited, v_interest, now(), v_resp, '1º contato', 'soon'
  );
  return 'ok';
end $$;

revoke all on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean) from public;
grant execute on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean) to anon, authenticated;
