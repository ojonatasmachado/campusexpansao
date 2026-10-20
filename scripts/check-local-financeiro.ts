// Uso: npx tsx scripts/check-local-financeiro.ts
//
// Teste de aceitação do financeiro (0073) no Supabase LOCAL populado por
// scripts/seed-local-service.ts. Confere que só dono/master/pastor e quem
// recebeu a liberação financeiro.* leem e lançam; líder, membro e outra
// igreja não veem nada. Deixa as liberações como estavam. Só roda em 127.0.0.1.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_PASSWORD } from "./seed-local-service";

const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
async function as(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return c;
}
const s = (c: SupabaseClient) => c.schema("service");
let falhas = 0;
function ok(quem: string, oque: string, cond: boolean, det = "") {
  if (!cond) falhas++;
  console.log(`${cond ? "ok   " : "FALHA"} ${quem.padEnd(8)} ${oque}${det ? `  (${det})` : ""}`);
}
const TABELAS = ["fin_accounts", "fin_categories", "fin_funds", "fin_transactions", "fin_offering_counts"];
async function conta(c: SupabaseClient, t: string, org: string) {
  const { count, error } = await s(c).from(t).select("*", { count: "exact", head: true }).eq("organization_id", org);
  return error ? -1 : count ?? 0;
}

async function main() {
  const { data: churches } = await s(admin).from("churches").select("id,organization_id,name");
  const A = churches!.find((c) => c.name === "Igreja Teste Local")!;
  const org = A.organization_id as string;
  const { data: people } = await s(admin).from("people").select("id,name,email").eq("organization_id", org);
  const pessoa = (email: string) => people!.find((p) => p.email === email)!.id as string;

  const master = await as("master@teste.local");
  const lider = await as("lider@teste.local");
  const membro = await as("membro@teste.local");
  const membro2 = await as("membro2@teste.local");
  const outra = await as("outra@teste.local");

  // limpa liberações de teste de execuções anteriores
  await s(admin).from("person_grants").delete().eq("organization_id", org).like("grant_code", "financeiro.%");

  // master prepara o conjunto inicial e lança
  await s(master).rpc("fin_preparar", { p_org: org });
  const { data: contas } = await s(master).from("fin_accounts").select("id,kind").eq("organization_id", org);
  const { data: cats } = await s(master).from("fin_categories").select("id,system_code").eq("organization_id", org);
  const { data: fundos } = await s(master).from("fin_funds").select("id,is_default").eq("organization_id", org);
  ok("master", "conjunto inicial (contas, categorias, fundos)", !!contas?.length && (cats?.length ?? 0) >= 10 && (fundos?.length ?? 0) >= 2);
  const caixa = contas!.find((c) => c.kind === "caixa")!.id;
  const dizimo = cats!.find((c) => c.system_code === "dizimo")!.id;
  const oferta = cats!.find((c) => c.system_code === "oferta")!.id;
  const geral = fundos!.find((f) => f.is_default)!.id;
  const { data: membros } = await s(admin).from("members").select("id,name").eq("organization_id", org);
  const maria = membros!.find((m) => m.name === "Maria Membro")!.id;
  const lucas = membros!.find((m) => m.name === "Lucas Líder")!.id;

  const { data: tx, error: e1 } = await s(master).from("fin_transactions").insert({
    organization_id: org, kind: "entrada", occurred_on: "2026-10-18", amount_cents: 15000, account_id: caixa,
    category_id: dizimo, fund_id: geral, method: "pix", description: "Teste RLS dízimo", contributor_member_id: maria,
  }).select("id").single();
  ok("master", "lança entrada com contribuinte", !e1 && !!tx, e1?.message);

  // valor quebrado (float) é recusado pelo banco: coluna é bigint
  const { error: eFloat } = await s(master).from("fin_transactions").insert({
    organization_id: org, kind: "despesa", occurred_on: "2026-10-18", amount_cents: 10.5, account_id: caixa, category_id: dizimo, fund_id: geral, description: "float",
  });
  ok("master", "valor com fração de centavo recusado", !!eFloat);

  // oferta: duas pessoas iguais é recusado; diferentes grava contagem e lançamentos
  const args = { p_org: org, p_church: A.id, p_data: "2026-10-18", p_event: null, p_fund: geral, p_category: oferta, p_conta_dinheiro: caixa, p_conta_digital: caixa, p_dinheiro: 30000, p_pix: 12345, p_cartao: 0, p_obs: null };
  const { error: eIg } = await s(master).rpc("fin_registrar_oferta", { ...args, p_contou: lucas, p_conferiu: lucas });
  ok("master", "oferta com a mesma pessoa duas vezes recusada", !!eIg && eIg.message.includes("duas_pessoas"));
  const { data: cont, error: eOf } = await s(master).rpc("fin_registrar_oferta", { ...args, p_contou: lucas, p_conferiu: maria });
  const { count: nOf } = await s(admin).from("fin_transactions").select("*", { count: "exact", head: true }).eq("offering_count_id", cont);
  ok("master", "oferta vira 2 lançamentos (dinheiro e Pix)", !eOf && nOf === 2, eOf?.message);
  const { data: saldos } = await s(master).rpc("fin_saldos", { p_org: org });
  ok("master", "saldo do caixa soma em centavos", (saldos as { account_id: string; saldo_cents: number }[]).some((r) => r.account_id === caixa && Number(r.saldo_cents) >= 15000 + 30000 + 12345));

  // ninguém mais lê nada
  for (const [quem, c, o] of [["lider", lider, org], ["membro", membro, org], ["membro2", membro2, org], ["outra", outra, org]] as const) {
    const n = await Promise.all(TABELAS.map((t) => conta(c, t, o)));
    ok(quem, "não lê nenhuma tabela do financeiro", n.every((x) => x === 0), n.join(","));
    const { data: sd } = await s(c).rpc("fin_saldos", { p_org: o });
    const { data: ps } = await s(c).rpc("fin_pessoas", { p_org: o });
    ok(quem, "funções de saldo e nomes vêm vazias", (sd ?? []).length === 0 && (ps ?? []).length === 0);
    const { error } = await s(c).from("fin_transactions").insert({ organization_id: o, kind: "entrada", occurred_on: "2026-10-18", amount_cents: 100, account_id: caixa, category_id: dizimo, fund_id: geral, description: "invasão" });
    ok(quem, "não lança", !!error);
  }
  const { data: arq } = await lider.storage.from("service-finance").list(org);
  ok("lider", "não lista comprovantes", (arq ?? []).length === 0);

  // líder não libera financeiro para ninguém
  const { error: eLib } = await s(lider).from("person_grants").insert({ organization_id: org, person_id: pessoa("membro2@teste.local"), grant_code: "financeiro.ver" });
  ok("lider", "não libera financeiro", !!eLib);

  // master libera "ver" para o membro2: lê, não lança
  const { error: eG } = await s(master).from("person_grants").insert({ organization_id: org, person_id: pessoa("membro2@teste.local"), grant_code: "financeiro.ver" });
  ok("master", "libera financeiro.ver", !eG, eG?.message);
  ok("membro2", "com ver: lê lançamentos", (await conta(membro2, "fin_transactions", org)) >= 3);
  const { error: eV } = await s(membro2).from("fin_transactions").insert({ organization_id: org, kind: "entrada", occurred_on: "2026-10-18", amount_cents: 100, account_id: caixa, category_id: dizimo, fund_id: geral, description: "ver não lança" });
  ok("membro2", "com ver: não lança", !!eV);

  // "lançar" deixa lançar
  await s(master).from("person_grants").insert({ organization_id: org, person_id: pessoa("membro2@teste.local"), grant_code: "financeiro.lancar" });
  const { data: t2, error: eL } = await s(membro2).from("fin_transactions").insert({ organization_id: org, kind: "despesa", occurred_on: "2026-10-18", amount_cents: 5000, account_id: caixa, category_id: cats!.find((c) => c.system_code === "energia")!.id, fund_id: geral, description: "Teste RLS energia" }).select("id").single();
  ok("membro2", "com lançar: lança despesa", !eL && !!t2, eL?.message);

  // auditoria grava
  /* o schema audit não é exposto pela API: conta direto no Postgres do contêiner local */
  const { execFileSync } = await import("node:child_process");
  const nAud = Number(execFileSync("docker", ["exec", "supabase_db_campusexpansao", "psql", "-U", "postgres", "-Atc",
    `select count(*) from audit.activity_log where table_name = 'fin_transactions' and organization_id = '${org}'`]).toString().trim());
  ok("audit", "alterações no activity_log", nAud >= 3);

  // ── fase 2: contas fixas, campanhas e fechamento (0080), num mês passado de teste ──
  const energia = cats!.find((c) => c.system_code === "energia")!.id;
  const { data: fixa, error: eFixa } = await s(membro2).from("fin_recurring").insert({ organization_id: org, kind: "despesa", description: "Conta de luz (teste)", amount_cents: 32000, account_id: caixa, category_id: energia, fund_id: geral, day_of_month: 31, starts_on: "2026-01-01" }).select("id").single();
  ok("membro2", "com lançar: cadastra conta fixa", !eFixa && !!fixa, eFixa?.message);
  ok("lider", "não vê contas fixas", (await conta(lider, "fin_recurring", org)) === 0);
  const { data: g1 } = await s(membro2).rpc("fin_gerar_previstos", { p_org: org, p_mes: "2026-09" });
  const { data: g2 } = await s(membro2).rpc("fin_gerar_previstos", { p_org: org, p_mes: "2026-09" });
  ok("membro2", "gera o previsto do mês uma vez só", g1 === 1 && g2 === 0, `${g1}/${g2}`);
  const { data: prev } = await s(membro2).from("fin_transactions").select("id,status,due_on").eq("recurring_id", fixa!.id).single();
  ok("membro2", "dia 31 em setembro vence no dia 30", prev?.status === "previsto" && prev?.due_on === "2026-09-30", JSON.stringify(prev));
  const { error: ePag } = await s(membro2).from("fin_transactions").update({ status: "realizado", occurred_on: "2026-09-29" }).eq("id", prev!.id);
  ok("membro2", "paga a conta fixa", !ePag, ePag?.message);

  const { data: camp, error: eCamp } = await s(membro2).from("fin_campaigns").insert({ organization_id: org, name: "Reforma (teste)", goal_cents: 100000, fund_id: geral, starts_on: "2026-09-01" }).select("id").single();
  ok("membro2", "cria campanha", !eCamp && !!camp, eCamp?.message);
  const { data: doacao } = await s(membro2).from("fin_transactions").insert({ organization_id: org, kind: "entrada", occurred_on: "2026-09-10", amount_cents: 25000, account_id: caixa, category_id: dizimo, fund_id: geral, description: "Oferta reforma (teste)", campaign_id: camp!.id }).select("id").single();
  const { data: prog } = await s(membro2).rpc("fin_campanhas_progresso", { p_org: org });
  const p1 = (prog as { campaign_id: string; arrecadado_cents: number }[]).find((r) => r.campaign_id === camp!.id);
  ok("membro2", "progresso da campanha soma a entrada", Number(p1?.arrecadado_cents) === 25000, JSON.stringify(p1));

  const { data: fechou } = await s(membro2).rpc("fin_fechar_mes", { p_org: org, p_mes: "2026-09", p_notas: "teste" });
  ok("membro2", "fecha o mês", fechou === "ok", String(fechou));
  const { data: fech } = await s(membro2).from("fin_closings").select("totals").eq("organization_id", org).eq("month", "2026-09").is("reopened_at", null).single();
  const tot = fech?.totals as { entradas_cents: number; despesas_cents: number } | undefined;
  ok("membro2", "retrato com entradas e despesas do mês", tot?.entradas_cents === 25000 && tot?.despesas_cents === 32000, JSON.stringify(tot));
  ok("membro2", "fechar de novo avisa", (await s(membro2).rpc("fin_fechar_mes", { p_org: org, p_mes: "2026-09" })).data === "ja_fechado");
  const { error: eFech1 } = await s(membro2).from("fin_transactions").insert({ organization_id: org, kind: "entrada", occurred_on: "2026-09-15", amount_cents: 100, account_id: caixa, category_id: dizimo, fund_id: geral, description: "mês fechado" });
  ok("membro2", "não lança em mês fechado", !!eFech1);
  const { error: eFech2 } = await s(master).from("fin_transactions").update({ amount_cents: 1 }).eq("id", doacao!.id);
  ok("master", "não edita lançamento de mês fechado", !!eFech2);
  const { error: eFech3 } = await s(membro2).from("fin_closings").update({ notes: "mexi" }).eq("organization_id", org);
  const { data: notas } = await s(admin).from("fin_closings").select("notes").eq("organization_id", org).eq("month", "2026-09").is("reopened_at", null).single();
  ok("membro2", "não edita o retrato à mão", !!eFech3 || notas?.notes === "teste");
  ok("membro2", "tesoureiro não reabre o mês", (await s(membro2).rpc("fin_reabrir_mes", { p_org: org, p_mes: "2026-09" })).data === "nao_pode");
  ok("master", "master reabre o mês", (await s(master).rpc("fin_reabrir_mes", { p_org: org, p_mes: "2026-09" })).data === "ok");
  const { error: eReab } = await s(master).from("fin_transactions").update({ description: "Oferta reforma (teste, corrigida)" }).eq("id", doacao!.id);
  ok("master", "depois de reabrir, edita", !eReab, eReab?.message);

  // limpeza da fase 2
  await s(admin).from("fin_transactions").delete().in("id", [prev!.id, doacao!.id]);
  await s(admin).from("fin_closings").delete().eq("organization_id", org).eq("month", "2026-09");
  await s(admin).from("fin_recurring").delete().eq("id", fixa!.id);
  await s(admin).from("fin_campaigns").delete().eq("id", camp!.id);

  // limpeza
  await s(admin).from("fin_offering_counts").delete().eq("id", cont);
  await s(admin).from("fin_transactions").delete().in("id", [tx?.id, t2?.id].filter(Boolean) as string[]);
  await s(admin).from("person_grants").delete().eq("organization_id", org).like("grant_code", "financeiro.%");

  console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
