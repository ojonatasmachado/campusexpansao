import { chromium } from "playwright";
import { readFileSync } from "fs";
import { join } from "path";
import { createServerClient } from "@supabase/ssr";

const viewport = JSON.parse(process.argv[2] || '{"width":1366,"height":860}');
const root = process.cwd();
const medirScript = readFileSync(join(root, "scripts/medir-densidade.js"), "utf8");
const base = "http://localhost:3000";
const dbUrl = "http://127.0.0.1:54321";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport });
context.setDefaultTimeout(60_000);
context.setDefaultNavigationTimeout(120_000);

// Autenticação via Supabase client + cookies injetados
const jar = new Map();
const client = createServerClient(dbUrl, anonKey, {
  auth: { autoRefreshToken: false },
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (values) => { for (const c of values) jar.set(c.name, c.value); },
  },
});
const signIn = await client.auth.signInWithPassword({ email: "master@teste.local", password: "TesteLocal123" });
if (signIn.error) { console.error("Login falhou:", signIn.error.message); process.exit(1); }

await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: base, sameSite: "Lax" })));
await context.addCookies([{ name: "cex_view", value: "gestao", url: base }]);
await context.addInitScript(() => { localStorage.setItem("cex_tour_done", "1"); });

const page = await context.newPage();

// Navega para cultos
await page.goto(`${base}/service?ptela=cultos`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

// Clica no primeiro evento para abrir o drawer
const eventBtn = await page.$('button:has-text("Culto de domingo")');
if (eventBtn) {
  await eventBtn.click();
  await page.waitForTimeout(2000);
}

// Clica na aba Panorama se existir e não estiver ativa
const panoramaTab = await page.$('button:has-text("Panorama")');
if (panoramaTab) {
  await panoramaTab.click();
  await page.waitForTimeout(1500);
}

// Esconde selo do Next.js
await page.evaluate(() => {
  document.querySelectorAll('[class*="nextjs"], [id*="nextjs"], nextjs-portal').forEach(el => el.remove());
});

// Screenshot
const screenshotPath = `docs/service-v7/historias/screenshots/e2-${viewport.width}.png`;
await page.screenshot({ path: screenshotPath, fullPage: false });
console.log(`Screenshot salvo em ${screenshotPath}`);

// Injeta e roda medição
await page.addScriptTag({ content: medirScript });
const resultado = await page.evaluate(() => window.__medir(24));
console.log(JSON.stringify(resultado, null, 2));

await browser.close();