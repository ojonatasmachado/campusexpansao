// npm ci --prefix tools/captura-service; npx playwright install chromium (nessa pasta)
// npx tsx scripts/check-local-panel-navigation.ts
// Preferência de idioma em Chromium, banco descartável e somente contas canônicas locais.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type AddressInfo } from "node:net";
import { mkdirSync, openSync, closeSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { createServerClient } from "@supabase/ssr";
import { withDisposableSupabase } from "./check-local-rls";

const root = resolve(__dirname, "..");
// Dependência da ferramenta de captura, carregada só ao executar este teste.
// O build do aplicativo não instala nem precisa do Playwright.
const requireCapture = createRequire(join(root, "tools/captura-service/package.json"));
const { chromium } = requireCapture("playwright");
const output = join(root, "prints/n1-internacional-ui");
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
      if (result.error) throw new Error(`Login local falhou (${result.error.status ?? "sem status"}/${result.error.code ?? result.error.name}): ${result.error.message}`);
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
    for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 860 }]) {
      await page.setViewportSize(viewport);
      await page.goto(base + "/service?maba=perfil", { waitUntil: "domcontentloaded" });
      await page.locator('[data-service-locale]').waitFor();
      const names = { "pt-BR": "Português (Brasil)", "en-US": "English (United States)", "es-ES": "Español (España)" };
      for (const locale of ["en-US", "es-ES", "pt-BR"] as const) {
        const selector = page.locator(".sel-trigger").filter({ hasText: /Português \(Brasil\)|English \(United States\)|Español \(España\)/ });
        await selector.click();
        await page.getByRole("option", { name: names[locale], exact: true }).click();
        await page.waitForFunction((expected: string) => document.documentElement.lang === expected, locale);
        assert.equal(new URL(page.url()).searchParams.get("maba"), "perfil");
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction((expected: string) => document.documentElement.lang === expected, locale);
        await selector.waitFor();
        assert.equal(await selector.innerText(), names[locale]);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `rolagem lateral ${locale}/${viewport.width}`);
        await page.screenshot({ path: join(output, `${locale}-${viewport.width}.png`), fullPage: true });
        passed(`idioma ${locale} persistido após recarga, perfil preservado, sem rolagem lateral em ${viewport.width}px`);
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
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
