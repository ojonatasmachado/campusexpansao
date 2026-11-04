// Captura da Agenda "antes" para M1: login como membro@teste.local,
// navega até aba Agenda do app do membro em 390x844 e tira screenshot.
// Uso: npx tsx scripts/captura-m1-antes.ts
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const URL = "http://localhost:3001";
const EMAIL = "membro@teste.local";
const SENHA = "TesteLocal123";
const OUT = join(__dirname, "../docs/service-v7/historias/screenshots");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Login
  await page.goto(`${URL}/service/login`);
  await page.getByLabel(/e-mail/i).fill(EMAIL);
  await page.getByLabel(/senha/i).fill(SENHA);
  await page.getByRole("button", { name: /entrar/i }).click();

  // Espera texto visível da tela do app (não waitForURL)
  await page.getByText(/Precisa de você|Minha agenda|Agenda/i).first().waitFor({ state: "visible", timeout: 15000 });

  // Fecha tour se aparecer
  try {
    const fecharTour = page.getByRole("button", { name: /fechar|pular|entendi/i });
    if (await fecharTour.isVisible({ timeout: 2000 })) await fecharTour.click();
  } catch { /* sem tour */ }

  // Navega até aba Agenda por clique
  const abaAgenda = page.getByRole("tab", { name: /agenda/i });
  await abaAgenda.waitFor({ state: "visible", timeout: 10000 });
  await abaAgenda.click();

  // Espera conteúdo da Agenda renderizar
  await page.getByText(/Escala a confirmar|Nada marcado/i).first().waitFor({ state: "visible", timeout: 10000 });

  // Screenshot
  const caminho = join(OUT, "M1-antes-agenda-390.png");
  await page.screenshot({ path: caminho, fullPage: false });
  console.log(`Foto salva: ${caminho}`);

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });