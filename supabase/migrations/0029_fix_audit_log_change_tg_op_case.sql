-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0029 · CORRIGE audit.log_change() — TG_OP É MAIÚSCULO
-- Aditiva: substitui só a função (mesma assinatura), nenhuma tabela muda.
--
-- Achado ao testar o painel de Operação Service em produção: 0028 foi a
-- PRIMEIRA vez que audit.log_change() (criada em 0004_audit.sql, só como
-- exemplo comentado até então) foi realmente pendurada num trigger. Ao
-- testar a extensão de trial, o registro em audit.activity_log saiu com
-- before/after nulos, mesmo com organization_id e record_id corretos.
--
-- Causa: TG_OP em Postgres vem sempre maiúsculo ('INSERT'/'UPDATE'/'DELETE'),
-- mas as duas comparações de before/after usavam a lista em minúsculo
-- ('update','delete' / 'update','insert'). A comparação nunca batia, então
-- before/after davam null em qualquer insert/update/delete — um bug latente
-- desde a 0004, nunca exercitado até agora porque nenhuma tabela usava o
-- trigger de verdade.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function audit.log_change()
returns trigger language plpgsql security definer set search_path = audit, public as $$
declare
  v_product text := coalesce(tg_argv[0], null);
  v_org     uuid;
  v_rec     text;
  v_row     jsonb;
begin
  v_row := coalesce(to_jsonb(new), to_jsonb(old));

  if v_row ? 'organization_id' then
    v_org := (v_row ->> 'organization_id')::uuid;
  end if;

  if v_row ? 'id' then
    v_rec := v_row ->> 'id';
  end if;

  insert into audit.activity_log
    (actor_id, organization_id, product_code, schema_name, table_name, record_id, action, before, after)
  values (
    auth.uid(), v_org, v_product, tg_table_schema, tg_table_name, v_rec,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end
$$;
