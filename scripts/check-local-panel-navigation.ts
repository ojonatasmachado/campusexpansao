// npm ci --prefix tools/captura-service; npx playwright install chromium (nessa pasta)
// npx tsx scripts/check-local-panel-navigation.ts
// Navegação real em Chromium, banco descartável e somente contas canônicas locais.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type AddressInfo } from "node:net";
import { mkdirSync, openSync, closeSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ROUTES } from "../app/service/painel/comum";
import { withDisposableSupabase } from "./check-local-rls";

const root = resolve(__dirname, "..");
// Dependência da ferramenta de captura, carregada só ao executar este teste.
// O build do aplicativo não instala nem precisa do Playwright.
const requireCapture = createRequire(join(root, "tools/captura-service/package.json"));
const { chromium } = requireCapture("playwright");
const output = join(root, "prints/q8-navegacao");
mkdirSync(output, { recursive: true });
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const checks: string[] = [];
const passed = (name: string) => { checks.push(name); console.log(`ok ${name}`); };

withDisposableSupabase(async (db) => {
  const socket = createServer();
  await new Promise<void>((ok) => socket.listen(0, "127.0.0.1", ok));
  const port = (socket.address() as AddressInfo).port;
  await new Promise<void>((ok) => socket.close(() => ok()));
  const base = `http://127.0.0.1:${port}`;
  const fd = openSync(join(output, "runtime.log"), "w", 0o600);
  const app = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, detached: true, stdio: ["ignore", fd, fd], env: { ...process.env, SUPABASE_URL: db.url, SUPABASE_ANON_KEY: db.anonKey, SUPABASE_SERVICE_ROLE_KEY: db.serviceRoleKey, NEXT_PUBLIC_SUPABASE_URL: db.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: db.anonKey, NEXT_PUBLIC_SITE_URL: base, NEXT_PUBLIC_VAPID_PUBLIC_KEY: "", VAPID_PRIVATE_KEY: "" } });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (app.exitCode !== null) throw new Error("Next encerrou");
      try { if ((await fetch(base + "/service/login", { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
      await pause(500);
    }
    if (!ready) throw new Error("Next não ficou pronto");
    async function login(session: typeof context, account: string) {
      const jar = new Map<string, string>();
      const client = createServerClient(db.url, db.anonKey, { auth: { autoRefreshToken: false }, cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (values) => { for (const c of values) jar.set(c.name, c.value); } } });
      const result = await client.auth.signInWithPassword({ email: `${account}@teste.local`, password: "TesteLocal123" });
      if (result.error) throw new Error("Login local falhou");
      await session.addCookies([...jar].map(([name, value]) => ({ name, value, url: base, sameSite: "Lax" as const })));
      await session.addCookies([{ name: "cex_view", value: "app", url: base }]); // destino direto prevalece sobre a preferência
      await session.addInitScript(() => { localStorage.setItem("cex_tour_done", "1"); });
    }
    const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    context.setDefaultTimeout(60_000);
    context.setDefaultNavigationTimeout(120_000);
    await login(context, "master");
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error: Error) => errors.push(error.message));
    await page.goto(base + "/service?ptela=membros&origem=q8#teste", { waitUntil: "domcontentloaded" });
    await page.locator("h1.ph-title").filter({ hasText: "Pessoas" }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("ptela"), "membros");
    passed("link direto abre Pessoas mesmo com preferência app");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("h1.ph-title").filter({ hasText: "Pessoas" }).waitFor();
    passed("recarga mantém a tela");
    const length = await page.evaluate(() => history.length);
    await page.locator('.sb-link[data-tour="times"]').click();
    await page.waitForURL(/ptela=times/);
    await page.locator("h1.ph-title").filter({ hasText: "Times" }).waitFor();
    assert.equal(await page.evaluate(() => history.length), length + 1);
    assert.equal(new URL(page.url()).searchParams.get("origem"), "q8");
    assert.equal(new URL(page.url()).hash, "#teste");
    passed("clique grava uma entrada e preserva parâmetros/hash");
    await page.locator('.sb-link[data-tour="times"]').click();
    assert.equal(await page.evaluate(() => history.length), length + 1);
    passed("clicar na tela atual não duplica o histórico");
    await page.goBack();
    await page.locator("h1.ph-title").filter({ hasText: "Pessoas" }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("ptela"), "membros");
    await page.goForward();
    await page.locator("h1.ph-title").filter({ hasText: "Times" }).waitFor();
    passed("voltar e avançar trocam a tela dentro do painel");
    await page.goBack();
    await page.getByRole("button", { name: "+ Novo membro", exact: true }).click();
    await page.locator(".fs-title").filter({ hasText: "Novo membro" }).waitFor();
    await page.goBack();
    await page.locator(".fs-title").waitFor({ state: "detached" });
    assert.equal(new URL(page.url()).searchParams.get("ptela"), "membros");
    passed("primeiro voltar fecha formulário, preservando a tela dona");
    await page.getByRole("button", { name: "+ Novo membro", exact: true }).click();
    await page.getByPlaceholder("Como a pessoa se chama").fill("Pessoa não salva");
    await page.goBack();
    await page.getByText("Descartar o que você preencheu?", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
    assert.equal(await page.getByPlaceholder("Como a pessoa se chama").inputValue(), "Pessoa não salva");
    await page.goBack();
    await page.getByRole("button", { name: "Descartar", exact: true }).click();
    await page.locator(".fs-title").waitFor({ state: "detached" });
    passed("formulário alterado pede confirmação e mantém dados ao continuar");

    // Cada ID conhecido tem endereço estável; o registro pode levar a uma alternativa autorizada.
    for (const id of Object.keys(ROUTES)) {
      await page.goto(base + `/service?ptela=${id}`, { waitUntil: "domcontentloaded" });
      await page.locator(".main").waitFor();
      await page.waitForFunction(() => new URL(location.href).searchParams.has("ptela"));
      const actual = new URL(page.url()).searchParams.get("ptela")!;
      assert.ok(Object.hasOwn(ROUTES, actual));
      await page.waitForTimeout(150);
      assert.ok(!(await page.locator(".main").innerText()).includes("Esta área não está disponível"));
      passed(`endereço ${id}: ${actual}`);
    }
    await page.goto(base + "/service?ptela=__proto__&origem=q8", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => new URL(location.href).searchParams.get("ptela") === "painel");
    passed("endereço inválido é substituído por área autorizada");

    const admin = createClient(db.url, db.serviceRoleKey, { auth: { persistSession: false } });
    const churches = await admin.schema("service").from("churches").select("id").eq("name", "Igreja Teste Local").single();
    if (churches.error) throw new Error("Igreja canônica ausente");
    const off = await admin.schema("service").from("churches").update({ modules_off: ["kids"] }).eq("id", churches.data.id);
    if (off.error) throw new Error("Não foi possível desligar módulo local");
    await page.goto(base + "/service?ptela=criancas", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => new URL(location.href).searchParams.get("ptela") !== "criancas");
    passed("módulo desligado não abre por link direto");
    assert.deepEqual(errors, []);
    await context.close();

    const leader = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    leader.setDefaultTimeout(60_000);
    leader.setDefaultNavigationTimeout(120_000);
    await login(leader, "lider");
    const mobile = await leader.newPage();
    await mobile.goto(base + "/service?ptela=config", { waitUntil: "domcontentloaded" });
    await mobile.locator(".main").waitFor();
    await mobile.waitForFunction(() => new URL(location.href).searchParams.get("ptela") !== "config");
    passed("líder no celular não abre configurações por URL");
    await leader.close();
    writeFileSync(join(output, "resultado.json"), JSON.stringify({ executedAt: new Date().toISOString(), checks, success: true }, null, 2) + "\n", { mode: 0o600 });
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
