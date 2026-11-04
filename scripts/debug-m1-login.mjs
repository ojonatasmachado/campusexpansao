// Debug do login M1: screenshots antes e depois do clique em Entrar.
// Uso: node scripts/debug-m1-login.mjs
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

// Tela de login
await page.goto(`${URL}/service/login`);
await page.waitForTimeout(2000);
await page.screenshot({ path: join(OUT, "debug-01-login.png"), fullPage: false });
console.log("Screenshot 1: tela de login");

// Preenche e clica
await page.getByLabel(/e-mail/i).fill("membro@teste.local");
await page.getByLabel(/senha/i).fill("TesteLocal123");
await page.getByRole("button", { name: /entrar/i }).click();

// Espera 5s e tira screenshot do que apareceu
await page.waitForTimeout(5000);
await page.screenshot({ path: join(OUT, "debug-02-pos-login.png"), fullPage: false });
console.log("Screenshot 2: pós-login (5s)");

// Log do título e URL atual
console.log("URL:", page.url());
console.log("Title:", await page.title());

// Log de erros de console
page.on("console", (msg) => console.log("CONSOLE:", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("PAGE_ERROR:", err.message));

await page.waitForTimeout(2000);
await browser.close();
console.log("Done.");