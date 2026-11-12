-- 0109 · O9: convidar um amigo com link que já diz quem convidou.
--
-- Cada pessoa tem um código de convite (criado na primeira vez que ela abre
-- "Convidar um amigo", por service.meu_convite). O link é
-- /[slug]/visita?convite=CODIGO: a página (service role) acha o nome e já
-- preenche "Quem te convidou?", que o visitante pode apagar. No envio, a RPC
-- do autocadastro liga o visitante a quem convidou só se o nome continuou o
-- mesmo. Sem link, o texto livre segue como antes. Idempotente.

alter table service.people add column if not exists invite_code text;
create unique index if not exists people_invite_code_key on service.people (invite_code) where invite_code is not null;
comment on column service.people.invite_code is 'Código do link "Convidar um amigo" (O9). Criado por service.meu_convite.';

alter table service.visitors add column if not exists invited_by_person_id uuid references service.people(id) on delete set null;
comment on column service.visitors.invited_by_person_id is 'Quem convidou, quando o visitante chegou pelo link de convite e manteve o nome (O9).';

-- ── código de convite da pessoa logada ───────────────────────────────────────
create or replace function service.meu_convite(p_organization uuid)
returns text
language plpgsql volatile security definer set search_path = service, public as $$
declare
  v_person service.people%rowtype;
  v_code   text;
begin
  select * into v_person from service.people
   where user_id = auth.uid() and organization_id = p_organization
   order by created_at limit 1;
  if not found then return null; end if;
  if v_person.invite_code is not null then return v_person.invite_code; end if;
  for i in 1..5 loop
    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    begin
      update service.people set invite_code = v_code where id = v_person.id and invite_code is null;
      select invite_code into v_code from service.people where id = v_person.id;
      return v_code;
    exception when unique_violation then
      -- código repetido (raro): tenta outro
    end;
  end loop;
  return null;
end $$;

revoke all on function service.meu_convite(uuid) from public;
grant execute on function service.meu_convite(uuid) to authenticated;

-- ── autocadastro com o código do convite ─────────────────────────────────────
create or replace function service.visitante_autocadastro(
  p_slug        text,
  p_name        text,
  p_phone       text,
  p_email       text,
  p_heard_from  text,
  p_invited_by  text,
  p_interests   text[],
  p_consent     boolean,
  p_convite     text
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
  v_inviter  service.people%rowtype;
  v_inviter_id uuid;
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

  -- quem convidou: código desta organização e o nome mantido no campo
  if nullif(btrim(coalesce(p_convite, '')), '') is not null and v_invited is not null then
    select * into v_inviter from service.people
     where invite_code = btrim(p_convite) and organization_id = v_church.organization_id;
    if found and lower(regexp_replace(btrim(v_inviter.name), '\s+', ' ', 'g')) = lower(v_invited) then
      v_inviter_id := v_inviter.id;
    end if;
  end if;

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
    heard_from, invited_by, invited_by_person_id, interests, consent_at, responsible_id, due, due_status
  ) values (
    v_church.organization_id, v_church.id, v_name, v_phone, v_email, 'novo',
    to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD'), 'QR/link',
    v_heard, v_invited, v_inviter_id, v_interest, now(), v_resp, '1º contato', 'soon'
  );
  return 'ok';
end $$;

revoke all on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean, text) from public;
grant execute on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean, text) to anon, authenticated;

-- a assinatura antiga (sem convite) continua valendo e passa a usar a nova
create or replace function service.visitante_autocadastro(
  p_slug text, p_name text, p_phone text, p_email text, p_heard_from text,
  p_invited_by text, p_interests text[], p_consent boolean
)
returns text
language sql volatile security definer set search_path = service, public as $$
  select service.visitante_autocadastro(p_slug, p_name, p_phone, p_email, p_heard_from, p_invited_by, p_interests, p_consent, null::text);
$$;

revoke all on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean) from public;
grant execute on function service.visitante_autocadastro(text, text, text, text, text, text, text[], boolean) to anon, authenticated;

-- o PostgREST passa a ver meu_convite e a assinatura nova
notify pgrst, 'reload schema';
