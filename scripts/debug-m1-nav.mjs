// Debug da barra de navegação do app M1: inspeciona HTML da barra de abas.
// Uso: node scripts/debug-m1-nav.mjs
import { chromium } from "../tools/captura-service/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
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

// Espera redirecionamento pós-login
await page.waitForURL(/\/service(\?.*)?$/, { timeout: 20000 });
await page.waitForTimeout(3000);

// Screenshot da tela atual
await page.screenshot({ path: join(OUT, "debug-03-pos-login-nav.png"), fullPage: false });
console.log("Screenshot salva: debug-03-pos-login-nav.png");

// Inspeciona a barra de navegação inferior
const navHTML = await page.evaluate(() => {
 // Procura por nav, footer, ou div com classe de tab bar
 const candidates = [
 document.querySelector("nav"),
 document.querySelector("footer"),
 document.querySelector('[class*="tab"]'),
 document.querySelector('[class*="nav"]'),
 document.querySelector('[class*="bar"]'),
 document.querySelector('[class*="bottom"]'),
 ];
 for (const el of candidates) {
 if (el && el.innerHTML.length > 10) {
 return `TAG: ${el.tagName} CLASS: ${el.className}\nHTML: ${el.outerHTML.substring(0, 3000)}`;
 }
 }
 // Fallback: body inteiro (primeiros 5000 chars)
 return `BODY (first 5000): ${document.body.innerHTML.substring(0, 5000)}`;
});

writeFileSync(join(OUT, "debug-nav.html"), navHTML);
console.log("HTML da nav salvo em debug-nav.html");
console.log(navHTML.substring(0, 1000));

await browser.close();