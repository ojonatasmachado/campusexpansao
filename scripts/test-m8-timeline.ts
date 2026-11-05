import { chromium } from "playwright";

const BASE = "http://localhost:3099";
const EMAIL = "membro@teste.local";
const PASS = "TesteLocal123";

type TimelineEntry = { t: number; url: string; title: string };

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function collectTimeline(
  page: import("playwright").Page,
  seconds: number
): Promise<TimelineEntry[]> {
  const entries: TimelineEntry[] = [];
  for (let i = 0; i <= seconds; i++) {
    if (i > 0) await sleep(1000);
    const url = page.url();
    // tenta pegar o título da aba ativa ou o texto principal visível
    let title = "";
    try {
      title = await page.evaluate(() => {
        const h = document.querySelector("h1, h2, [data-testid='tab-title'], .tab-active");
        if (h?.textContent) return h.textContent.trim().slice(0, 60);
        const body = document.body?.innerText?.slice(0, 80) ?? "";
        return body.replace(/\n/g, " ").trim();
      });
    } catch {
      title = "(erro ao ler título)";
    }
    entries.push({ t: i, url, title });
  }
  return entries;
}

async function login(page: import("playwright").Page) {
  await page.goto(`${BASE}/service/login`);
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 15000 });
  await page.fill('input[name="email"], input[type="email"]', EMAIL);
  await page.fill('input[name="password"], input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  // espera sair da página de login (qualquer URL que não seja /login)
  await page.waitForFunction(
    () => !window.location.href.includes("/login"),
    { timeout: 30000 }
  );
  await sleep(3000); // hidratação + carregamento de dados
  console.log(`Login OK | ${page.url()}`);
}

async function goToTab(page: import("playwright").Page, tab: string) {
  // clica na aba da barra inferior
  const tabBtn = page.locator(`[data-tab="${tab}"], button:has-text("${tab}")`).first();
  if (await tabBtn.isVisible()) {
    await tabBtn.click();
    await sleep(1000);
  } else {
    // fallback: navega via URL
    await page.goto(`${BASE}/service?maba=${tab}`);
    await sleep(1500);
  }
}

async function scenarioA(page: import("playwright").Page) {
  console.log("\n=== CENÁRIO A: Agenda > Confirmar UMA escala ===");
  await goToTab(page, "agenda");
  await sleep(1000);

  // procura botão "Confirmar" individual (não "Confirmar todas")
  const confirmarBtn = page.locator('button:has-text("Confirmar"):not(:has-text("todas"))').first();
  if (await confirmarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmarBtn.click();
    console.log("Clicou em 'Confirmar' individual");
  } else {
    console.log("AVISO: botão 'Confirmar' individual não encontrado");
  }

  const timeline = await collectTimeline(page, 10);
  for (const e of timeline) {
    console.log(`t=${e.t}s | ${e.url} | ${e.title}`);
  }
  const ficouNaAgenda = timeline.every((e) => e.url.includes("maba=agenda"));
  console.log(ficouNaAgenda ? "RESULTADO: PASSOU (ficou na Agenda)" : "RESULTADO: FALHOU (saiu da Agenda)");
}

async function scenarioB(page: import("playwright").Page) {
  console.log("\n=== CENÁRIO B: Agenda > Confirmar todas ===");
  await goToTab(page, "agenda");
  await sleep(1000);

  const confirmarTodas = page.locator('button:has-text("Confirmar todas")').first();
  if (await confirmarTodas.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmarTodas.click();
    console.log("Clicou em 'Confirmar todas'");
  } else {
    console.log("AVISO: botão 'Confirmar todas' não encontrado (pode não haver escalas pendentes)");
  }

  const timeline = await collectTimeline(page, 10);
  for (const e of timeline) {
    console.log(`t=${e.t}s | ${e.url} | ${e.title}`);
  }
  const ficouNaAgenda = timeline.every((e) => e.url.includes("maba=agenda"));
  console.log(ficouNaAgenda ? "RESULTADO: PASSOU (ficou na Agenda)" : "RESULTADO: FALHOU (saiu da Agenda)");
}

async function scenarioD(page: import("playwright").Page) {
  console.log("\n=== CENÁRIO D: Mensagens > Responder aviso do Mural ('Vou') ===");
  await goToTab(page, "mensagens");
  await sleep(1000);

  // procura botão "Vou" no mural
  const vouBtn = page.locator('button:has-text("Vou")').first();
  if (await vouBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await vouBtn.click();
    console.log("Clicou em 'Vou'");
  } else {
    console.log("AVISO: botão 'Vou' não encontrado no Mural");
  }

  const timeline = await collectTimeline(page, 10);
  for (const e of timeline) {
    console.log(`t=${e.t}s | ${e.url} | ${e.title}`);
  }
  const ficouNasMensagens = timeline.every((e) => e.url.includes("maba=mensagens"));
  console.log(ficouNasMensagens ? "RESULTADO: PASSOU (ficou em Mensagens)" : "RESULTADO: FALHOU (saiu de Mensagens)");
}

async function scenarioF(page: import("playwright").Page) {
  console.log("\n=== CENÁRIO F: Voltar do navegador (Início → Agenda → Mensagens → voltar 2x) ===");
  await goToTab(page, "inicio");
  await sleep(500);
  console.log(`t=0 Início | ${page.url()}`);

  await goToTab(page, "agenda");
  await sleep(500);
  console.log(`t=1 Agenda | ${page.url()}`);

  await goToTab(page, "mensagens");
  await sleep(500);
  console.log(`t=2 Mensagens | ${page.url()}`);

  // volta uma vez: deve ir para Agenda
  await page.goBack();
  await sleep(1000);
  const url1 = page.url();
  console.log(`t=3 Voltar 1x | ${url1}`);
  const voltouParaAgenda = url1.includes("maba=agenda");

  // volta outra vez: deve ir para Início
  await page.goBack();
  await sleep(1000);
  const url2 = page.url();
  console.log(`t=4 Voltar 2x | ${url2}`);
  const voltouParaInicio = url2.includes("maba=inicio") || !url2.includes("maba=");

  console.log(voltouParaAgenda ? "Voltar 1x: PASSOU (Agenda)" : "Voltar 1x: FALHOU");
  console.log(voltouParaInicio ? "Voltar 2x: PASSOU (Início)" : "Voltar 2x: FALHOU");
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await login(page);
  console.log(`Login OK | ${page.url()}`);

  await scenarioA(page);
  await scenarioB(page);
  await scenarioD(page);
  await scenarioF(page);

  await browser.close();
  console.log("\n=== TESTES CONCLUÍDOS ===");
})();