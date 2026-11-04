import { chromium } from "playwright";
import { readFileSync } from "fs";
import { join } from "path";
import { createServerClient } from "@supabase/ssr";

const root = process.cwd();
const medirScript = readFileSync(join(root, "scripts/medir-densidade.js"), "utf8");
const base = "http://localhost:3000";
const dbUrl = "http://127.0.0.1:54321";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const outDir = "docs/service-v7/historias/screenshots";

async function authContext(browser, viewport) {
  const jar = new Map();
  const client = createServerClient(dbUrl, anonKey, {
    auth: { autoRefreshToken: false },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) => { for (const c of values) jar.set(c.name, c.value); },
    },
  });
  const signIn = await client.auth.signInWithPassword({ email: "master@teste.local", password: "TesteLocal123" });
  if (signIn.error) throw new Error("Login falhou: " + signIn.error.message);

  const context = await browser.newContext({ viewport });
  context.setDefaultTimeout(60_000);
  context.setDefaultNavigationTimeout(120_000);
  await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: base, sameSite: "Lax" })));
  await context.addCookies([{ name: "cex_view", value: "gestao", url: base }]);
  await context.addInitScript(() => { localStorage.setItem("cex_tour_done", "1"); });
  return context;
}

async function hideNextBadge(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[class*="nextjs"], [id*="nextjs"], nextjs-portal').forEach(el => el.remove());
  });
}

async function openDrawerPanorama(page) {
  await page.goto(`${base}/service?ptela=cultos`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const eventBtn = await page.$('button:has-text("Culto de domingo")');
  if (eventBtn) {
    await eventBtn.click();
    await page.waitForTimeout(2000);
  }
  const panoramaTab = await page.$('button:has-text("Panorama")');
  if (panoramaTab) {
    await panoramaTab.click();
    await page.waitForTimeout(1500);
  }
}

async function medir(page, label) {
  await page.addScriptTag({ content: medirScript });
  const resultado = await page.evaluate(() => window.__medir(24));
  console.log(`[${label}] ${JSON.stringify(resultado)}`);
  return resultado;
}

// ── 1366 ──
{
  const browser = await chromium.launch({ headless: true });
  const ctx = await authContext(browser, { width: 1366, height: 860 });
  const page = await ctx.newPage();
  await openDrawerPanorama(page);
  await hideNextBadge(page);
  await page.screenshot({ path: `${outDir}/e2-1366.png`, fullPage: false });
  console.log("Screenshot e2-1366.png salvo");
  await medir(page, "1366");
  await browser.close();
}

// ── 820 ──
{
  const browser = await chromium.launch({ headless: true });
  const ctx = await authContext(browser, { width: 820, height: 820 });
  const page = await ctx.newPage();
  await openDrawerPanorama(page);
  await hideNextBadge(page);
  await page.screenshot({ path: `${outDir}/e2-820.png`, fullPage: false });
  console.log("Screenshot e2-820.png salvo");
  await medir(page, "820");
  await browser.close();
}

// ── 390 Panorama ──
{
  const browser = await chromium.launch({ headless: true });
  const ctx = await authContext(browser, { width: 390, height: 844 });
  const page = await ctx.newPage();
  await openDrawerPanorama(page);
  await hideNextBadge(page);
  await page.screenshot({ path: `${outDir}/e2-390.png`, fullPage: false });
  console.log("Screenshot e2-390.png salvo");
  await medir(page, "390");
  await browser.close();
}

// ── 390 Para o membro ──
{
  const browser = await chromium.launch({ headless: true });
  const ctx = await authContext(browser, { width: 390, height: 844 });
  const page = await ctx.newPage();
  await page.goto(`${base}/service?ptela=cultos`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const eventBtn = await page.$('button:has-text("Culto de domingo")');
  if (eventBtn) {
    await eventBtn.click();
    await page.waitForTimeout(2000);
  }
  // Rola o Segmentado para a direita para revelar "Para o membro"
  const seg = await page.$('.seg');
  if (seg) {
    await seg.evaluate(el => el.scrollLeft = el.scrollWidth);
    await page.waitForTimeout(500);
  }
  const membroTab = await page.$('button:has-text("Para o membro")');
  if (membroTab) {
    await membroTab.click();
    await page.waitForTimeout(1500);
  }
  await hideNextBadge(page);
  await page.screenshot({ path: `${outDir}/e2-390-membro.png`, fullPage: false });
  console.log("Screenshot e2-390-membro.png salvo");
  await browser.close();
}

// ── Agenda Semana|Mês (prova de que voltou ao normal) ──
{
  const browser = await chromium.launch({ headless: true });
  const ctx = await authContext(browser, { width: 1366, height: 860 });
  const page = await ctx.newPage();
  await page.goto(`${base}/service?ptela=agenda`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await hideNextBadge(page);
  await page.screenshot({ path: `${outDir}/e2-agenda-semana-mes.png`, fullPage: false });
  console.log("Screenshot e2-agenda-semana-mes.png salvo");
  await browser.close();
}

console.log("Todas as fotos tiradas.");