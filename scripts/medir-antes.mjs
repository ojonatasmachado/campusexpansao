import { chromium } from "playwright";
import { readFileSync } from "fs";

const medirScript = readFileSync("scripts/medir-densidade.js", "utf-8");
const viewport = JSON.parse(process.argv[2] || '{"width":1366,"height":820}');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport, bypassCSP: true });
const page = await context.newPage();

// Login
await page.goto("http://localhost:3000/service/login", { waitUntil: "networkidle" });
await page.waitForSelector('input[type="email"].login-input', { timeout: 15000 });
await page.fill('input[type="email"].login-input', "master@teste.local");
await page.fill('input[type="password"].login-input', "TesteLocal123");
await page.click('button.login-btn, button[type="submit"]');

// Espera painel carregar pelo título da seção
await page.getByRole('heading', { name: 'Precisa de você' }).waitFor({ state: "visible", timeout: 60000 });
console.log("Painel carregado, URL:", page.url());

// Navega para Cultos clicando na sidebar (não por URL direta)
await page.click('button.sb-link:has-text("Cultos e eventos")');
await page.waitForSelector('.grid-2', { timeout: 15000 });
await page.waitForTimeout(2000);
console.log("Tela de cultos carregada, URL:", page.url());

// Fecha a sidebar/backdrop se estiver aberta (viewport mobile/tablet)
const backdrop = await page.$('.sb-backdrop');
if (backdrop) {
 await backdrop.click().catch(() => null);
 await page.waitForTimeout(500);
}
await page.keyboard.press('Escape').catch(() => null);
await page.waitForTimeout(500);

// Clica no primeiro card de culto para abrir o EventDrawer
const card = await page.$('.grid-2 button.panel.click');
if (!card) {
 console.log("ERRO: nenhum card de culto encontrado");
 await page.screenshot({ path: "/tmp/e2-sem-cards.png" });
 process.exit(1);
}
await card.click({ force: true });
await page.waitForTimeout(2000);
console.log("EventDrawer aberto");

// Injeta e roda o script de medição
await page.evaluate(medirScript);
const resultado = await page.evaluate(() => window.__medir(24));

console.log(JSON.stringify(resultado, null, 2));

await browser.close();