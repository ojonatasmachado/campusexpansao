// npm ci --prefix tools/captura-service; npx playwright install chromium (nessa pasta)
// npx tsx scripts/check-local-internacional-ui.ts
// Preferência de idioma em Chromium, banco descartável e somente contas canônicas locais.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type AddressInfo } from "node:net";
import { mkdirSync, openSync, closeSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { withDisposableSupabase } from "./check-local-rls";
import { TERMO_MAPA_VERSAO } from "../app/service/lib/termo-mapa";

const root = resolve(__dirname, "..");
// Dependência da ferramenta de captura, carregada só ao executar este teste.
// O build do aplicativo não instala nem precisa do Playwright.
const requireCapture = createRequire(join(root, "tools/captura-service/package.json"));
const { chromium } = requireCapture("playwright");
const output = join(root, "prints/n1-internacional-ui");
mkdirSync(output, { recursive: true });
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const checks: string[] = [];
const density: { locale: string; width: number; metrics: unknown }[] = [];
const passed = (name: string) => { checks.push(name); console.log(`ok ${name}`); };

withDisposableSupabase(async (db) => {
  // A conta master canônica cai no primeiro acesso. Esta prova usa a conta
  // de membro com cadastro concluído e recusa do mapa já registrada no banco
  // descartável, sem depender dos fluxos de primeiro acesso e consentimento.
  const admin = createClient(db.url, db.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const fixture = await admin.schema("service").from("members").update({ phone: "(11) 90000-0002", map_consent_declined_at: new Date().toISOString(), map_consent_terms: TERMO_MAPA_VERSAO }).eq("email", "membro@teste.local").select("id");
  assert.equal(fixture.error, null);
  assert.equal(fixture.data?.length, 1);
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
    await login(context, "membro");
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error: Error) => errors.push(error.message));
    try {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 860 }]) {
        await page.setViewportSize(viewport);
        await page.goto(base + "/service?maba=perfil", { waitUntil: "domcontentloaded" });
        await page.locator('[data-service-locale]').waitFor();
        const measure = async (locale: string) => {
          await page.locator(".sel-trigger").filter({ hasText: /Português \(Brasil\)|English \(United States\)|Español \(España\)/ }).waitFor({ state: "visible" });
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
          });
          await page.locator(".m-scroll").evaluate((element: HTMLElement) => { element.scrollTop = 0; });
          await page.evaluate(() => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));
          await page.addScriptTag({ content: readFileSync(join(root, "scripts/medir-densidade.js"), "utf8") });
          const metrics = await page.evaluate("window.__medir(44)");
          density.push({ locale, width: viewport.width, metrics });
        };
        await measure("pt-BR-antes");
        const translated = {
          "pt-BR": { profile: "Perfil", nav: ["Início", "Agenda", "Mensagens", "Caminhada"], size: "Tamanho do texto", done: "Pronto", position: "Padrão, 4 de 7" },
          "en-US": { profile: "Profile", nav: ["Home", "Calendar", "Messages", "Journey"], size: "Text size", done: "Done", position: "Default, 4 of 7" },
          "es-ES": { profile: "Perfil", nav: ["Inicio", "Agenda", "Mensajes", "Camino"], size: "Tamaño del texto", done: "Listo", position: "Predeterminado, 4 de 7" },
        };
        const names = { "pt-BR": "Português (Brasil)", "en-US": "English (United States)", "es-ES": "Español (España)" };
        for (const locale of ["en-US", "es-ES", "pt-BR"] as const) {
          const selector = page.locator(".sel-trigger").filter({ hasText: /Português \(Brasil\)|English \(United States\)|Español \(España\)/ });
          console.log(`Tentando idioma ${locale} em ${viewport.width}px`);
          await selector.click();
          await page.getByRole("option", { name: names[locale], exact: true }).click();
          await page.waitForFunction((expected: string) => document.documentElement.lang === expected, locale);
          assert.equal(new URL(page.url()).searchParams.get("maba"), "perfil");
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForFunction((expected: string) => document.documentElement.lang === expected, locale);
          await selector.waitFor();
          assert.equal(await selector.innerText(), names[locale]);
          const labels = translated[locale];
          assert.equal(await page.locator(".m-h1").innerText(), labels.profile);
          assert.deepEqual(await page.locator(".m-tab-l").allTextContents(), labels.nav);
          await page.getByText(labels.size, { exact: true }).click();
          const sizeDialog = page.getByRole("dialog", { name: labels.size, exact: true });
          await sizeDialog.waitFor();
          assert.equal(await sizeDialog.getByRole("slider").getAttribute("aria-valuetext"), labels.position);
          await sizeDialog.getByRole("button", { name: labels.done, exact: true }).click();
          await sizeDialog.waitFor({ state: "hidden" });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
          assert.equal(overflow, false, `rolagem lateral ${locale}/${viewport.width}`);
          await measure(locale);
          await page.screenshot({ path: join(output, `${locale}-${viewport.width}.png`), fullPage: true });
          passed(`idioma ${locale} persistido após recarga, perfil preservado, sem rolagem lateral em ${viewport.width}px`);
        }
      }
      await page.route("**/rest/v1/rpc/set_my_locale", (route: { fulfill: (response: object) => Promise<void> }) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "local_test_unavailable" }) }));
      const selector = page.locator(".sel-trigger").filter({ hasText: "Português (Brasil)" });
      await selector.click();
      await page.getByRole("option", { name: "English (United States)", exact: true }).click();
      await page.getByText("Não foi possível salvar o idioma. Tente novamente.", { exact: true }).waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"), "pt-BR");
      assert.equal(await selector.innerText(), "Português (Brasil)");
      await page.unroute("**/rest/v1/rpc/set_my_locale");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.documentElement.lang === "pt-BR");
      passed("falha de gravação preserva o idioma atual também após recarga");
      assert.deepEqual(errors, []);
    } catch (error) {
      await page.screenshot({ path: join(output, "falha.png"), fullPage: true }).catch(() => {});
      writeFileSync(join(output, "falha.json"), JSON.stringify({ url: page.url(), errors, text: await page.locator("body").innerText().catch(() => "") }, null, 2) + "\n", { mode: 0o600 });
      throw error;
    }
    await context.close();
    writeFileSync(join(output, "resultado.json"), JSON.stringify({ executedAt: new Date().toISOString(), checks, density, success: true }, null, 2) + "\n", { mode: 0o600 });
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
