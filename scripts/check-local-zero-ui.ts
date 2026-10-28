// O5: estados vazios e campos opcionais ausentes no painel, banco e navegador descartáveis.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type AddressInfo } from "node:net";
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { withDisposableSupabase } from "./check-local-rls";

const root = resolve(__dirname, "..");
const requireCapture = createRequire(join(root, "tools/captura-service/package.json"));
const { chromium } = requireCapture("playwright");
const output = join(root, "prints/o5-zero-ui");
mkdirSync(output, { recursive: true });
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const checks: string[] = [];
const issues: { route: string; scenario: string; detail: string }[] = [];
const metrics: { route: string; scenario: string; density: unknown }[] = [];
const cases = [
  { route: "visitantes", title: "Visitantes", empty: /0 visitantes/, sparse: "O5 visitante sem telefone" },
  { route: "cursos", title: "Cursos e Trilhas", empty: /Nenhum curso ainda/, sparse: "O5 curso sem aulas" },
  { route: "criancas", title: "Crianças", empty: /Nenhuma criança encontrada/, sparse: "O5 criança sem nascimento" },
  { route: "quadros", title: "Quadros", empty: /Nenhum quadro criado ainda/, sparse: "O5 quadro sem descrição" },
  { route: "reunioes", title: "Reuniões", empty: /Nenhuma reunião agendada/, sparse: "O5 reunião sem data" },
  { route: "espacos", title: "Espaços e reservas", empty: /Nenhuma sala cadastrada ainda/, sparse: "O5 sala sem capacidade" },
  { route: "financeiro", title: "Financeiro", empty: /Nada lançado em /, sparse: "Saldo em caixa e bancos:" },
];

withDisposableSupabase(async (db) => {
  const admin = createClient(db.url, db.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const church = await admin.schema("service").from("churches").select("id,organization_id").eq("name", "Igreja Teste Local").single();
  assert.equal(church.error, null);
  const org = church.data!.organization_id, churchId = church.data!.id;
  // Só o banco recém-criado desta execução: nunca apaga dados de instância compartilhada.
  for (const table of ["visitors", "courses", "boards", "meetings", "children", "kids_classes", "rooms", "fin_accounts"]) {
    const removed = await admin.schema("service").from(table).delete().eq("organization_id", org);
    assert.equal(removed.error, null, table);
    const count = await admin.schema("service").from(table).select("*", { count: "exact", head: true }).eq("organization_id", org);
    assert.equal(count.error, null);
    assert.equal(count.count, 0, `${table} não ficou vazia`);
  }
  const socket = createServer();
  await new Promise<void>((ok) => socket.listen(0, "127.0.0.1", ok));
  const port = (socket.address() as AddressInfo).port;
  await new Promise<void>((ok) => socket.close(() => ok()));
  const base = `http://127.0.0.1:${port}`;
  const fd = openSync(join(output, "runtime.log"), "w", 0o600);
  // Webpack permite reutilizar node_modules local sem atravessar a raiz do Turbopack.
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
    const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    context.setDefaultTimeout(60_000);
    context.setDefaultNavigationTimeout(120_000);
    const jar = new Map<string, string>();
    const client = createServerClient(db.url, db.anonKey, { auth: { autoRefreshToken: false }, cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (values) => { for (const c of values) jar.set(c.name, c.value); } } });
    assert.equal((await client.auth.signInWithPassword({ email: "master@teste.local", password: "TesteLocal123" })).error, null);
    await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: base, sameSite: "Lax" as const })));
    await context.addCookies([{ name: "cex_view", value: "gestao", url: base }]);
    await context.addInitScript(() => { localStorage.setItem("cex_tour_done", "1"); });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error: Error) => errors.push(error.message));
    page.on("console", (message: { type(): string; text(): string }) => { if (message.type() === "error") errors.push(message.text()); });
    try {
      for (const scenario of ["zero", "opcionais-ausentes"]) {
        if (scenario !== "zero") {
          for (const [table, values] of [
            ["visitors", { name: "O5 visitante sem telefone" }],
            ["courses", { name: "O5 curso sem aulas" }],
            ["children", { name: "O5 criança sem nascimento" }],
            ["boards", { name: "O5 quadro sem descrição", scope: "geral" }],
            ["meetings", { title: "O5 reunião sem data" }],
            ["rooms", { name: "O5 sala sem capacidade" }],
            ["fin_accounts", { name: "O5 conta sem instituição", opening_balance_cents: 0 }],
          ] as const) {
            const seeded = await admin.schema("service").from(table).insert({ organization_id: org, church_id: churchId, ...values });
            assert.equal(seeded.error, null, `${table}: ${seeded.error?.message}`);
          }
          const explicitZero = await admin.schema("service").from("rooms").insert({ organization_id: org, church_id: churchId, name: "O5 sala com zero explícito", capacity: 0 });
          assert.equal(explicitZero.error, null);
        }
        for (const item of cases.filter((item) => !process.argv.includes("--so-espacos") || item.route === "espacos")) {
          console.log(`Verificando ${scenario}/${item.route}`);
          const errorCount = errors.length;
          await page.goto(`${base}/service?ptela=${item.route}`, { waitUntil: "domcontentloaded" });
          await page.getByRole("heading", { level: 1, name: new RegExp(item.title) }).first().waitFor();
          const expected = scenario === "zero" ? item.empty : item.sparse;
          await page.getByText(expected, { exact: false }).first().waitFor();
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(document.getAnimations().filter((animation) => animation.playState === "running" && animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
          });
          const body = await page.locator(".main .content").last().innerText();
          assert.doesNotMatch(body, /\bNaN\b|\bInfinity\b|\bundefined\b|Invalid Date|\bnull\b/);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${item.route}: rolagem lateral`);
          assert.equal(errors.length, errorCount, errors.slice(errorCount).join("\n"));
          if (scenario === "zero" && item.route !== "financeiro") assert.ok(await page.locator(".ph-actions button").count(), `${item.route}: sem ação inicial`);
          if (scenario !== "zero" && item.route === "espacos") {
            const room = page.locator(".sala-card").filter({ hasText: item.sparse });
            assert.equal((await room.locator(".sala-cap").innerText()).trim(), "Capacidade desconhecida");
            const explicitZero = page.locator(".sala-card").filter({ hasText: "O5 sala com zero explícito" });
            assert.match((await explicitZero.locator(".sala-cap").innerText()).trim(), /^0\s+lugares$/);
            const removedZero = await admin.schema("service").from("rooms").delete().eq("organization_id", org).eq("name", "O5 sala com zero explícito");
            assert.equal(removedZero.error, null);
            // A medição usa a mesma fixture da referência: somente a sala de
            // capacidade desconhecida. O zero explícito foi verificado acima.
            await page.reload({ waitUntil: "domcontentloaded" });
            await page.getByText("Capacidade desconhecida", { exact: true }).waitFor();
            await page.evaluate(async () => { await document.fonts.ready; });
          }
          await page.addScriptTag({ content: readFileSync(join(root, "scripts/medir-densidade.js"), "utf8") });
          metrics.push({ route: item.route, scenario, density: await page.evaluate("window.__medir(24)") });
          await page.screenshot({ path: join(output, `${scenario}-${item.route}.png`), fullPage: true });
          checks.push(`${scenario}/${item.route}: dados esperados, sem valor inválido, sem erros de console e sem rolagem lateral`);
          console.log(`ok ${checks.at(-1)}`);
        }
      }
      assert.equal(errors.length, 0, errors.join("\n"));
      writeFileSync(join(output, "resultado.json"), JSON.stringify({ executedAt: new Date().toISOString(), scope: process.argv.includes("--so-espacos") ? "painel-1366-espacos" : "painel-1366-zero-e-opcionais", checks, issues, metrics, success: issues.length === 0 }, null, 2) + "\n", { mode: 0o600 });
      console.log(`Concluído: ${checks.length} verificações, ${issues.length} achados de apresentação.`);
      if (issues.length) process.exitCode = 1;
    } catch (error) {
      await page.screenshot({ path: join(output, "falha.png"), fullPage: true }).catch(() => {});
      writeFileSync(join(output, "falha.json"), JSON.stringify({ url: page.url(), errors, text: await page.locator("body").innerText().catch(() => "") }, null, 2) + "\n", { mode: 0o600 });
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
