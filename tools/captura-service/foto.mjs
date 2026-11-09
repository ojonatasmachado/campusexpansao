import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../../", import.meta.url));
const telas = ["inicio", "agenda", "agenda-igreja", "mensagens", "caminhada", "painel-escalas"];
let browser;
let page;
try {
  const { values: args } = parseArgs({ options: Object.fromEntries(
    ["porta", "email", "senha", "tela", "largura", "altura", "saida"].map((name) => [name, { type: "string" }]),
  ) });
  for (const name of ["porta", "email", "senha", "tela", "saida"]) assert(args[name], `Falta --${name}`);
  assert(telas.includes(args.tela), `Tela inválida: ${args.tela}`);
  const painel = args.tela === "painel-escalas";
  const positivo = (value, name) => {
    assert(/^\d+$/.test(value) && Number(value) > 0, `${name} deve ser inteiro positivo`);
    return Number(value);
  };
  const port = positivo(args.porta, "porta");
  assert(port <= 65535, "Porta inválida");
  const width = positivo(args.largura ?? (painel ? "1366" : "390"), "largura");
  const height = positivo(args.altura ?? (painel ? "860" : "844"), "altura");
  browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: `http://localhost:${port}`, viewport: { width, height } });
  // A captura nunca envia credenciais às instâncias hospedadas do Supabase.
  await context.route(/supabase\.(co|in)\b/, (route) => route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  const visivel = async (locator) => {
    await locator.waitFor({ state: "visible" });
    assert(await locator.isVisible(), "Texto ou controle esperado não está visível");
  };
  await page.goto("/service/login?redirect=/service");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mail", { exact: true }).fill(args.email);
  await page.locator('input[type="password"]').fill(args.senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await Promise.race([
    visivel(page.locator(painel ? ".sb" : "nav.m-tab")),
    page.locator(".login-alert").waitFor({ state: "visible" }).then(async () => {
      throw new Error(`Login recusado: ${await page.locator(".login-alert").innerText()}`);
    }),
  ]);
  await page.waitForLoadState("networkidle");
  const tour = page.getByRole("button", { name: "Pular tour", exact: true });
  // Tour é opcional para contas que já o concluíram; a tela nunca é opcional.
  if (await tour.isVisible()) await tour.click();
  await page.locator(".coach-layer").waitFor({ state: "hidden" });
  const css = "nextjs-portal,[data-nextjs-dev-tools-button],#__next-build-watcher{display:none!important}";
  await page.addStyleTag({ content: css });
  assert.equal(await page.locator("nextjs-portal:visible,[data-nextjs-dev-tools-button]:visible,#__next-build-watcher:visible").count(), 0, "Selo Next ainda visível");

  if (painel) {
    const menu = page.getByRole("button", { name: "Abrir menu", exact: true });
    if (await menu.isVisible()) await menu.click();
    const target = page.locator('button.sb-link[data-tour="escalas"]');
    if (!await target.isVisible()) {
      for (const group of await page.locator('button.sb-group-btn[aria-expanded="false"]').all()) {
        await group.click();
        if (await target.isVisible()) break;
      }
    }
    await target.click();
    await visivel(page.getByRole("heading", { name: /^Escalas por (time|evento)/ }));
    assert.match(await target.getAttribute("class"), /\bon\b/);
  } else {
    const tab = { inicio: "Início", agenda: "Agenda", "agenda-igreja": "Agenda", mensagens: "Mensagens", caminhada: "Caminhada" }[args.tela];
    const button = page.locator("nav.m-tab").getByRole("button", { name: new RegExp(`${tab}$`) });
    await button.click();
    assert.equal(await button.getAttribute("aria-current"), "page");
    if (args.tela === "agenda-igreja") await page.getByRole("radio", { name: "Igreja", exact: true }).click();
    const expected = { inicio: page.locator(".m-h1"), agenda: page.getByRole("radio", { name: "Minha agenda", exact: true }), "agenda-igreja": page.getByRole("radio", { name: "Igreja", exact: true }), mensagens: page.getByRole("heading", { name: "Mensagens", exact: true }), caminhada: page.getByText("Etapas", { exact: true }) }[args.tela];
    await visivel(expected);
    if (args.tela.startsWith("agenda")) {
      assert.equal(new URL(page.url()).searchParams.get("maba"), "agenda");
      assert.equal(await expected.getAttribute("aria-checked"), "true");
    }
  }
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter((animation) =>
      Number.isFinite(animation.effect?.getComputedTiming().endTime),
    ).map((animation) => animation.finished.catch(() => {})));
  });
  await page.locator(".coach-layer").waitFor({ state: "hidden" });
  await page.addScriptTag({ path: resolve(root, "scripts/medir-densidade.js") });
  const medida = await page.evaluate((min) => window.__medir(min), painel ? 24 : 44);
  const limites = painel ? { acoes: 25, palavras: 100 } : { acoes: 12, palavras: 80 };
  const dentro = medida.acoes <= limites.acoes && medida.palavrasNaDobra <= limites.palavras;
  console.log(JSON.stringify({ tela: args.tela, viewport: { width, height }, medida, limites, densidade: dentro ? "dentro dos limites" : "fora da lei" }));
  const saida = resolve(args.saida);
  await mkdir(dirname(saida), { recursive: true });
  await page.screenshot({ path: saida, fullPage: false });
  console.log(`foto=${saida} md5=${createHash("md5").update(await readFile(saida)).digest("hex")}`);
} catch (error) {
  console.error(`Falha na captura: ${error.message}`);
  if (page) console.error(`URL: ${page.url()}\nTela: ${(await page.locator("body").innerText()).slice(0, 2500)}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
