// npx tsx scripts/check-local-internacional.ts
// Contrato autenticado N1 em projeto descartável; nunca usa produção/54321.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { withDisposableSupabase } from "./check-local-rls";

const checks: string[] = [];
function ok(condition: unknown, name: string) { assert.ok(condition, name); checks.push(name); console.log(`ok ${name}`); }

withDisposableSupabase(async (db) => {
  async function login(account: string, currency?: string) {
    const client = createClient(db.url, db.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: currency ? { "x-service-currency": currency } : {} } });
    const result = await client.auth.signInWithPassword({ email: `${account}@teste.local`, password: "TesteLocal123" });
    assert.equal(result.error, null);
    return client;
  }
  const master = await login("master"), member = await login("membro"), leader = await login("lider"), other = await login("outra");
  const anonymous = createClient(db.url, db.anonKey, { auth: { persistSession: false } });
  const admin = createClient(db.url, db.serviceRoleKey, { auth: { persistSession: false } });
  const church = await master.schema("service").from("churches_with_preferences").select("id,organization_id,currency_code,currency_locked").eq("name", "Igreja Teste Local").single();
  assert.equal(church.error, null);
  const org = church.data!.organization_id;
  ok(church.data!.currency_code === "BRL" && church.data!.currency_locked === false, "igreja nova tem moeda BRL explícita e ainda livre");
  for (const [name, client] of [["master", master], ["membro", member]] as const) {
    ok((await client.schema("service").rpc("my_locale")).data === "pt-BR", `locale inicial da conta ${name}`);
  }
  ok((await master.schema("service").rpc("set_my_locale", { p_locale: "en-US" })).error?.code === "42501", "publicação parcial bloqueia troca de idioma no banco");
  ok((await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: "EUR" })).error?.code === "42501", "publicação parcial bloqueia moeda estrangeira no banco");
  ok(!!(await master.schema("service").from("international_rollout").update({ enabled: true }).eq("feature", "locale")).error, "conta não libera rollout");
  const enabled = await admin.schema("service").from("international_rollout").update({ enabled: true }).in("feature", ["locale", "currency"]).select();
  assert.equal(enabled.error, null);
  assert.equal(enabled.data?.length, 2);
  ok(!(await master.schema("service").rpc("set_my_locale", { p_locale: "en-US" })).error, "master escolhe en-US");
  ok(!(await member.schema("service").rpc("set_my_locale", { p_locale: "es-ES" })).error, "membro escolhe es-ES");
  ok((await master.schema("service").rpc("my_locale")).data === "en-US", "locale do master preservado");
  ok((await member.schema("service").rpc("my_locale")).data === "es-ES", "locale do membro independente");
  for (const value of [null, "pt", "en-GB", "PT-BR", "constructor"]) {
    ok((await member.schema("service").rpc("set_my_locale", { p_locale: value })).error?.code === "22023", `RPC rejeita locale inválido ${value}`);
  }
  const own = (await member.auth.getUser()).data.user!.id;
  ok(!!(await member.schema("core").from("users").update({ locale_code: "de-DE" }).eq("id", own)).error, "restrição do banco rejeita locale inválido direto");
  const masterId = (await master.auth.getUser()).data.user!.id;
  await member.schema("core").from("users").update({ locale_code: "pt-BR" }).eq("id", masterId);
  ok((await master.schema("service").rpc("my_locale")).data === "en-US", "outra pessoa não altera o locale do master");
  ok(!!(await anonymous.schema("service").rpc("set_my_locale", { p_locale: "en-US" })).error, "anônimo não grava preferência");

  const recipients = await admin.schema("service").from("people").select("id,user_id").eq("organization_id", org);
  assert.equal(recipients.error, null);
  const personId = recipients.data!.find((p) => p.user_id === own)!.id;
  const outside = await admin.schema("service").from("people").select("id").neq("organization_id", org).limit(1).single();
  assert.equal(outside.error, null);
  for (const [name, client] of [["anônimo", anonymous], ["membro", member], ["master", master]] as const) {
    ok(!!(await client.schema("service").rpc("notification_locales", { p_org: org, p_people: [personId] })).error, `${name} não lê idioma alheio pelo adaptador de entrega`);
  }
  const languages = await admin.schema("service").rpc("notification_locales", { p_org: org, p_people: [personId, outside.data!.id] });
  ok(!languages.error && languages.data?.length === 1 && languages.data[0].person_id === personId && languages.data[0].locale_code === "es-ES", "entrega lê o idioma atual da conta e exclui outra organização");
  const invalidTemplate = await admin.schema("service").from("push_queue").insert({ organization_id: org, person_id: personId, categoria: "mural", title: "Teste local", body: "Teste local", body_template: "texto-arbitrario", send_after: new Date().toISOString() });
  ok(invalidTemplate.error?.code === "23514", "fila rejeita identificação de texto automático fora do contrato");

  for (const [name, client] of [["líder", leader], ["membro", member], ["outra igreja", other]] as const) {
    ok((await client.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: "USD" })).error?.code === "42501", `moeda protegida contra ${name}`);
  }
  ok(!!(await master.schema("service").from("organization_preferences").update({ currency_code: "USD" }).eq("organization_id", org)).error, "escrita direta não contorna RPC");
  const foreign = await other.schema("service").from("organization_preferences").select("*").eq("organization_id", org);
  ok(!foreign.error && foreign.data.length === 0, "preferência de outra igreja fica oculta");
  for (const value of [null, "GBP", "usd", "R$"]) {
    ok((await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: value })).error?.code === "22023", `servidor rejeita moeda inválida ${value}`);
  }
  for (const currency of ["EUR", "USD", "BRL", "USD"]) {
    ok(!(await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: currency })).error, `escolha explícita de ${currency} antes de valores`);
  }
  const usd = await login("master", "USD");
  assert.equal((await usd.schema("service").rpc("fin_preparar", { p_org: org })).error, null);
  ok(!(await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: "EUR" })).error, "contas iniciais zeradas não bloqueiam escolha");
  assert.equal((await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: "USD" })).error, null);
  const accounts = await admin.schema("service").from("fin_accounts").select("id").eq("organization_id", org).limit(1).single();
  const funds = await admin.schema("service").from("fin_funds").select("id").eq("organization_id", org).limit(1).single();
  const categories = await admin.schema("service").from("fin_categories").select("id").eq("organization_id", org).eq("kind", "entrada").limit(1).single();
  assert.equal(accounts.error, null); assert.equal(funds.error, null); assert.equal(categories.error, null);
  const entry = { organization_id: org, account_id: accounts.data!.id, fund_id: funds.data!.id, category_id: categories.data!.id, kind: "entrada", status: "realizado", occurred_on: "2026-10-24", amount_cents: 123456, description: "Teste N1", method: "transferencia" };
  ok((await master.schema("service").from("fin_transactions").insert(entry)).error?.message === "currency_changed", "cliente antigo BRL não grava centavos como USD");
  ok((await usd.schema("service").from("fin_transactions").insert({ ...entry, method: "pix" })).error?.message === "payment_method_unavailable", "Pix não é anunciado como pagamento em USD");
  const inserted = await usd.schema("service").from("fin_transactions").insert(entry).select("id,amount_cents").single();
  ok(!inserted.error && Number(inserted.data?.amount_cents) === 123456, "lançamento USD preserva centavos com moeda declarada");
  ok((await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: "EUR" })).error?.message === "currency_locked", "valor financeiro trava mudança de moeda");
  ok(!(await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: "USD" })).error, "repetir moeda atual continua idempotente");
  assert.equal((await admin.schema("service").from("fin_transactions").delete().eq("id", inserted.data!.id)).error, null);
  ok((await master.schema("service").rpc("set_organization_currency", { p_org: org, p_currency: "BRL" })).error?.message === "currency_locked", "apagar lançamento não reinterpreta histórico");

  // Disputa real entre moeda e o primeiro valor, com conexões autenticadas independentes.
  const otherChurch = await other.schema("service").from("churches").select("organization_id").single();
  assert.equal(otherChurch.error, null);
  const otherOrg = otherChurch.data!.organization_id;
  const eurOther = await login("outra", "EUR");
  assert.equal((await other.schema("service").rpc("set_organization_currency", { p_org: otherOrg, p_currency: "EUR" })).error, null);
  const [currencyRace, moneyRace] = await Promise.all([
    other.schema("service").rpc("set_organization_currency", { p_org: otherOrg, p_currency: "USD" }),
    eurOther.schema("service").from("fin_accounts").insert({ organization_id: otherOrg, name: "Conta concorrente", kind: "banco", opening_balance_cents: 100 }),
  ]);
  ok(Number(!currencyRace.error) + Number(!moneyRace.error) === 1, "troca de moeda e primeiro valor não vencem juntos");
  const afterRace = await other.schema("service").from("organization_preferences").select("currency_code,currency_locked").eq("organization_id", otherOrg).single();
  ok(!afterRace.error && (moneyRace.error ? afterRace.data.currency_code === "USD" && !afterRace.data.currency_locked : afterRace.data.currency_code === "EUR" && afterRace.data.currency_locked), "estado final da disputa mantém significado do valor");
  const result = resolve("prints/n1-internacional");
  mkdirSync(result, { recursive: true });
  writeFileSync(resolve(result, "banco.json"), JSON.stringify({ executedAt: new Date().toISOString(), checks, success: true }, null, 2) + "\n", { mode: 0o600 });
}).catch((error) => { console.error(String(error.message).replace(/eyJ[\w.-]+/g, "[token omitido]")); process.exitCode = 1; });
