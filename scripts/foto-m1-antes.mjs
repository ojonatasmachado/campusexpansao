// Foto "antes" da Agenda M1 — completa onboarding, fecha modais, navega via pushState.
// Uso: node scripts/foto-m1-antes.mjs
import { chromium } from "../tools/captura-service/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL = "http://localhost:3000";
const OUT = join(__dirname, "../docs/service-v7/historias/screenshots");

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Login
await page.goto(`${URL}/service/login`);
await page.getByLabel(/e-mail/i).fill("membro@teste.local");
await page.getByLabel(/senha/i).fill("TesteLocal123");
await page.getByRole("button", { name: /entrar/i }).click();
await page.waitForURL(/\/service/, { timeout: 20000 });
await page.waitForTimeout(3000);

// Completa onboarding passo a passo
for (let i = 0; i < 5; i++) {
  const tel = page.locator('input[autocomplete="tel"]');
  const btn = page.getByRole("button", { name: /continuar|confirmar|concluir|salvar|começar|iniciar|entrar no app/i });
  if (await tel.isVisible({ timeout: 2000 }).catch(() => false)) await tel.fill("(11) 90000-0002");
  if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.first().click();
    await page.waitForTimeout(3000);
  } else break;
}

// Espera app carregar
try {
  await page.locator("body").getByText(/Escala|Confirmar|Início|Agenda|Mensagens|Caminhada|Perfil|Tudo em dia/i).first().waitFor({ state: "visible", timeout: 15000 });
} catch { /* continua */ }
await page.waitForTimeout(2000);

// Fecha modais com force
for (let i = 0; i < 5; i++) {
  const scrimBtns = page.locator(".m6-scrim button, .m-sheet-bg button");
  const count = await scrimBtns.count();
  if (count === 0) break;
  for (let j = 0; j < count; j++) {
    const btn = scrimBtns.nth(j);
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      break;
    }
  }
}

await page.waitForTimeout(1000);

// Navega via pushState (mais confiável que clique na aba)
await page.evaluate(() => {
  const url = new URL(window.location.href);
  url.searchParams.set("maba", "agenda");
  url.searchParams.set("msegmento", "minha");
  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
});
await page.waitForTimeout(3000);

// Screenshot da Agenda
const caminho = join(OUT, "M1-antes-agenda-390.png");
await page.screenshot({ path: caminho, fullPage: false });
console.log(`OK: ${caminho}`);

await browser.close();