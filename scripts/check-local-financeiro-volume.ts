// O6: milhares de lançamentos, saldos e CSV reais em Supabase/Chromium descartáveis.
// Requer dependências/Chromium de tools/captura-service. Nunca usa produção/54321.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer, type AddressInfo } from "node:net";
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { withDisposableSupabase } from "./check-local-rls";
import { lerCsv } from "../app/service/lib/planilha";
import type { Lancamento } from "../app/service/modules/financeiro/dados";

type Tx = Pick<Lancamento, "id" | "kind" | "status" | "occurred_on" | "amount_cents" | "account_id" | "to_account_id" | "category_id" | "fund_id" | "description" | "created_at"> & { organization_id: string; church_id: string };
const root = resolve(__dirname, "..");
const requireCapture = createRequire(join(root, "tools/captura-service/package.json"));
const { chromium } = requireCapture("playwright");
const output = join(root, "prints/o6-financeiro-volume");
mkdirSync(output, { recursive: true });
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const checks: string[] = [];
const ok = (value: unknown, name: string) => { assert.ok(value, name); checks.push(name); console.log(`ok ${name}`); };
const normal = (text: string) => text.replace(/\s/g, " ").trim();
const money = (cents: number) => `${cents < 0 ? "− " : ""}R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(cents) / 100)}`;

withDisposableSupabase(async (db) => {
  const admin = createClient(db.url, db.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  async function login(account: string) {
    const client = createClient(db.url, db.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    assert.equal((await client.auth.signInWithPassword({ email: `${account}@teste.local`, password: "TesteLocal123" })).error, null);
    return client;
  }
  const master = await login("master"), member = await login("membro"), other = await login("outra");
  const church = await master.schema("service").from("churches").select("id,organization_id").eq("name", "Igreja Teste Local").single();
  assert.equal(church.error, null);
  const org = church.data!.organization_id, churchId = church.data!.id;
  assert.equal((await master.schema("service").rpc("fin_preparar", { p_org: org })).error, null);
  async function create(table: string, values: Record<string, unknown>) {
    const result = await admin.schema("service").from(table).insert({ organization_id: org, ...values }).select("id").single();
    assert.equal(result.error, null, `${table}: ${result.error?.message}`);
    return result.data!.id as string;
  }
  const accounts = await Promise.all([100_000, 0, 5_000].map((opening, i) => create("fin_accounts", { church_id: churchId, name: `O6 Conta ${"ABC"[i]}`, opening_balance_cents: opening })));
  const funds = await Promise.all([false, true].map((designated, i) => create("fin_funds", { name: i ? "O6 Social" : "O6 Geral", designated })));
  const categories = await Promise.all(["entrada", "despesa"].map((kind) => create("fin_categories", { kind, name: `O6 ${kind}` })));
  const balances = new Map(accounts.map((id, i) => [id, [100_000, 0, 5_000][i]]));
  const fundBalances = new Map(funds.map((id) => [id, 0]));
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  const prior = new Date(`${month}-01T12:00:00Z`); prior.setUTCMonth(prior.getUTCMonth() - 1);
  const previousMonth = prior.toISOString().slice(0, 7);
  const current: Tx[] = [], all: Tx[] = [];
  let income = 0, expense = 0, planned = 0;
  for (const [m, count, label] of [[month, 5013, "atual"], [previousMonth, 1005, "anterior"]] as const) {
    for (let i = 0; i < count; i++) {
      const kind: Tx["kind"] = i % 5 === 0 ? "transferencia" : i % 5 < 3 ? "despesa" : "entrada";
      const status: Tx["status"] = kind !== "transferencia" && i % 7 === 0 ? "previsto" : "realizado";
      const amount = (i * 7919) % 500_000 + 1;
      const account = kind === "transferencia" ? accounts[0] : kind === "despesa" ? accounts[1] : accounts[i % 2 ? 2 : 0];
      const fund = kind === "transferencia" ? null : kind === "despesa" || i % 3 === 0 ? funds[1] : funds[0];
      const tx: Tx = { id: randomUUID(), organization_id: org, church_id: churchId, kind, status, occurred_on: `${m}-${String(i % 28 + 1).padStart(2, "0")}`, amount_cents: amount, account_id: account, to_account_id: kind === "transferencia" ? accounts[1] : null, category_id: kind === "transferencia" ? null : categories[kind === "entrada" ? 0 : 1], fund_id: fund, description: `O6 ${label} ${i}${i === 0 ? ' "especial"; linha\nseguinte' : ""}`, created_at: `${m}-01T12:00:00.000Z` };
      all.push(tx); if (m === month) current.push(tx);
      if (status === "realizado") {
        balances.set(account, balances.get(account)! + (kind === "entrada" ? amount : -amount));
        if (tx.to_account_id) balances.set(tx.to_account_id, balances.get(tx.to_account_id)! + amount);
        if (fund) fundBalances.set(fund, fundBalances.get(fund)! + (kind === "entrada" ? amount : -amount));
        if (m === month && kind === "entrada") income += amount;
        if (m === month && kind === "despesa") expense += amount;
      } else if (m === month) planned++;
    }
  }
  for (let i = 0; i < all.length; i += 250) {
    const seeded = await admin.schema("service").from("fin_transactions").insert(all.slice(i, i + 250));
    assert.equal(seeded.error, null, seeded.error?.message);
    console.log(`Lançamentos preparados: ${Math.min(i + 250, all.length)}/${all.length}`);
  }
  const count = await master.schema("service").from("fin_transactions").select("id", { count: "exact", head: true }).eq("organization_id", org);
  ok(!count.error && count.count === 6018, "banco contém 6.018 lançamentos, em dois meses");
  const saldos = await master.schema("service").rpc("fin_saldos", { p_org: org });
  assert.equal(saldos.error, null);
  for (const [id, value] of balances) assert.equal(Number(saldos.data.find((row: { account_id: string }) => row.account_id === id)?.saldo_cents), value);
  ok([...balances.values()].some((value) => value < 0), "cenário inclui conta com saldo negativo");
  ok(true, "RPC de contas soma abertura, entradas e despesas realizadas e transferências sem contar previstos");
  const fundos = await master.schema("service").rpc("fin_saldos_fundos", { p_org: org });
  assert.equal(fundos.error, null);
  for (const [id, value] of fundBalances) assert.equal(Number(fundos.data.find((row: { fund_id: string }) => row.fund_id === id)?.saldo_cents), value);
  ok(true, "RPC de fundos preserva centavos e não transforma transferência em receita");
  for (const [name, client] of [["membro sem financeiro", member], ["outra igreja", other]] as const) {
    const hidden = await client.schema("service").from("fin_transactions").select("id", { count: "exact", head: true }).eq("organization_id", org);
    const privateBalance = await client.schema("service").rpc("fin_saldos", { p_org: org });
    ok(!hidden.error && hidden.count === 0 && !privateBalance.error && privateBalance.data.length === 0, `${name} não recebe lançamentos nem saldos do volume`);
  }

  const socket = createServer();
  await new Promise<void>((ok) => socket.listen(0, "127.0.0.1", ok));
  const port = (socket.address() as AddressInfo).port;
  await new Promise<void>((ok) => socket.close(() => ok()));
  const base = `http://127.0.0.1:${port}`;
  const fd = openSync(join(output, "runtime.log"), "w", 0o600);
  const app = spawn("npm", ["run", "dev", "--", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, detached: true, stdio: ["ignore", fd, fd], env: { ...process.env, SUPABASE_URL: db.url, SUPABASE_ANON_KEY: db.anonKey, SUPABASE_SERVICE_ROLE_KEY: db.serviceRoleKey, NEXT_PUBLIC_SUPABASE_URL: db.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: db.anonKey, NEXT_PUBLIC_SITE_URL: base, NEXT_PUBLIC_VAPID_PUBLIC_KEY: "", VAPID_PRIVATE_KEY: "" } });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (app.exitCode !== null) throw new Error("Next encerrou antes da prova");
      try { if ((await fetch(base + "/service/login", { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
      await pause(500);
    }
    if (!ready) throw new Error("Next não ficou pronto");
    const context = await browser.newContext({ viewport: { width: 1366, height: 860 }, timezoneId: "America/Sao_Paulo", acceptDownloads: true });
    context.setDefaultTimeout(120_000); context.setDefaultNavigationTimeout(180_000);
    const jar = new Map<string, string>();
    const client = createServerClient(db.url, db.anonKey, { auth: { autoRefreshToken: false }, cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (values) => { for (const c of values) jar.set(c.name, c.value); } } });
    assert.equal((await client.auth.signInWithPassword({ email: "master@teste.local", password: "TesteLocal123" })).error, null);
    await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: base, sameSite: "Lax" as const })));
    await context.addCookies([{ name: "cex_view", value: "gestao", url: base }]);
    await context.addInitScript(() => { localStorage.setItem("cex_tour_done", "1"); });
    const page = await context.newPage();
    const errors: string[] = [], pages: { id: string }[][] = [], pending: Promise<void>[] = [];
    page.on("pageerror", (error: Error) => errors.push(error.message));
    page.on("console", (message: { type(): string; text(): string }) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", (response: { url(): string; status(): number; json(): Promise<unknown> }) => {
      if (!response.url().includes("/rest/v1/fin_transactions?")) return;
      pending.push(response.json().then((rows) => { assert.equal(response.status(), 200); assert.ok(Array.isArray(rows)); pages.push(rows); }).catch((error: Error) => { errors.push(error.message); }));
    });
    try {
      const started = Date.now();
      await page.goto(base + "/service?ptela=financeiro", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Exportar CSV", exact: true }).waitFor();
      const totalBalance = [...balances.values()].reduce((a, b) => a + b, 0);
      await page.waitForFunction((expected: string) => document.querySelector(".fin .ph-sub")?.textContent?.replace(/\s/g, " ").trim() === expected, normal(`Saldo em caixa e bancos: ${money(totalBalance)}`));
      await page.waitForFunction((expected: string[]) => [...document.querySelectorAll(".fin .kpi-value")].slice(0, 2).every((el, i) => [el.querySelector('[aria-hidden="true"]'), el.querySelector(".sr-only")].every((text) => text?.textContent?.replace(/\s/g, " ").trim() === expected[i])), [normal(money(income)), normal(money(expense))]);
      await Promise.all(pending);
      const ids = pages.flat().map((row) => row.id);
      ok(ids.length === 5013 && new Set(ids).size === 5013 && current.every((tx) => ids.includes(tx.id)), "interface carrega todos os 5.013 lançamentos do mês em seis páginas, sem perdas/duplicações");
      ok(pages.length === 6 && pages.filter((p) => p.length === 1000).length === 5, "paginação real atravessa cinco limites de mil registros");
      ok(true, "totais do mês na interface usam somente realizados; saldo em caixa inclui os dois meses e abertura");
      for (let i = 0; i < accounts.length; i++) {
        const row = page.locator(".fin-saldo").filter({ hasText: `O6 Conta ${"ABC"[i]}` });
        assert.equal(normal(await row.locator(".fin-saldo-v").innerText()), normal(money(balances.get(accounts[i])!)));
      }
      ok(true, "interface mostra os saldos exatos das três contas, inclusive negativos");
      const social = page.locator(".fin-saldo").filter({ hasText: "O6 Social" });
      assert.equal(normal(await social.locator(".fin-saldo-v").innerText()), normal(money(fundBalances.get(funds[1])!)));
      ok(true, "fundo designado na interface corresponde ao saldo real do banco");
      const downloadReady = page.waitForEvent("download");
      await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
      const download = await downloadReady;
      const csvPath = join(output, "volume.csv"); await download.saveAs(csvPath);
      const csv = lerCsv(readFileSync(csvPath, "utf8"));
      assert.equal(csv.linhas.length, current.length);
      assert.equal(csv.cabecalho[10], "Valor (R$)");
      const byDescription = new Map(current.map((tx) => [tx.description, tx]));
      assert.equal(new Set(csv.linhas.map((row) => row[2])).size, current.length);
      for (const row of csv.linhas) {
        const tx = byDescription.get(row[2]); assert.ok(tx, `Linha inesperada no CSV: ${row[2]}`);
        const amount = `${Math.floor(tx.amount_cents / 100)},${String(tx.amount_cents % 100).padStart(2, "0")}`;
        assert.equal(row[10], `${tx.kind === "despesa" ? "'-" : ""}${amount}`);
      }
      ok(true, "CSV real contém 5.013 registros únicos e preserva centavos, sinais com proteção de fórmula, aspas, separador e quebra de linha");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(errors.length, 0, errors.join("\n"));
      await page.screenshot({ path: join(output, "volume-1366.png"), fullPage: false });
      ok(true, "painel com volume sem erro de console ou rolagem lateral");
      const closed = await master.schema("service").rpc("fin_fechar_mes", { p_org: org, p_mes: month, p_notas: "O6 volume descartável" });
      ok(!closed.error && closed.data === "ok", "fechamento do mês executa com milhares de registros");
      const snapshot = await master.schema("service").from("fin_closings").select("totals").eq("organization_id", org).eq("month", month).is("reopened_at", null).single();
      assert.equal(snapshot.error, null);
      const totals = snapshot.data!.totals;
      ok(totals.entradas_cents === income && totals.despesas_cents === expense && totals.previstos_em_aberto === planned, "snapshot de fechamento preserva totais exatos e previstos em aberto");
      const forbidden = await master.schema("service").from("fin_transactions").update({ amount_cents: 1 }).eq("id", current[1].id);
      const unchanged = await admin.schema("service").from("fin_transactions").select("amount_cents").eq("id", current[1].id).single();
      ok(forbidden.error?.code === "42501" && /fechado/.test(forbidden.error.message) && !unchanged.error && unchanged.data?.amount_cents === current[1].amount_cents, "mês fechado impede alteração de valor sem corromper o saldo");
      writeFileSync(join(output, "resultado.json"), JSON.stringify({ executedAt: new Date().toISOString(), scope: "financeiro-volume-banco-e-navegador", totalRows: all.length, monthRows: current.length, pageSizes: pages.map((p) => p.length), localElapsedMs: Date.now() - started, checks, success: true, realFamiliesTested: false }, null, 2) + "\n", { mode: 0o600 });
    } catch (error) {
      await page.screenshot({ path: join(output, "falha.png"), fullPage: false }).catch(() => {});
      writeFileSync(join(output, "falha.json"), JSON.stringify({ url: page.url(), errors, pageSizes: pages.map((p) => p.length), text: (await page.locator("body").innerText().catch(() => "")).slice(0, 15000) }, null, 2) + "\n", { mode: 0o600 });
      throw error;
    } finally { await context.close(); }
  } finally {
    await browser?.close();
    if (app.pid) {
      try { process.kill(-app.pid, "SIGTERM"); } catch {}
      for (let i = 0; i < 30 && app.exitCode === null && app.signalCode === null; i++) await pause(100);
      if (app.exitCode === null && app.signalCode === null) { try { process.kill(-app.pid, "SIGKILL"); } catch {} }
    }
    closeSync(fd);
  }
}).catch((error) => { console.error(String(error.message).replace(/eyJ[\w.-]+/g, "[token omitido]")); process.exitCode = 1; });
