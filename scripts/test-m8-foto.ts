import { chromium } from "playwright";

const BASE = "http://localhost:3099";
const EMAIL = "membro@teste.local";
const PASS = "TesteLocal123";
const SCREENSHOT_DIR = "/Users/macbook/campusexpansao/.claude/worktrees/M8/docs/service-v7/historias/screenshots";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE}/service/login`);
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 15000 });
  await page.fill('input[name="email"], input[type="email"]', EMAIL);
  await page.fill('input[name="password"], input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 30000 });
  await sleep(3000);
  console.log(`Login OK | ${page.url()}`);

  // Vai para Agenda
  const agendaBtn = page.locator('[data-tab="agenda"], button:has-text("Agenda")').first();
  if (await agendaBtn.isVisible()) {
    await agendaBtn.click();
    await sleep(1500);
  } else {
    await page.goto(`${BASE}/service?maba=agenda&msegmento=minha`);
    await sleep(2000);
  }
  console.log(`Agenda aberta | ${page.url()}`);

  // Confirma todas
  const confirmarTodas = page.locator('button:has-text("Confirmar todas")').first();
  if (await confirmarTodas.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmarTodas.click();
    console.log("Clicou em 'Confirmar todas'");
  } else {
    console.log("AVISO: botão 'Confirmar todas' não encontrado");
  }

  // Espera 10 s
  await sleep(10000);
  console.log(`Após 10s | ${page.url()}`);

  // Tira foto
  const screenshotPath = `${SCREENSHOT_DIR}/M8-agenda-apos-confirmar-todas.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Foto salva: ${screenshotPath}`);

  await browser.close();
})();