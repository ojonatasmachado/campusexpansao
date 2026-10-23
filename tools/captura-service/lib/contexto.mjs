// Navegador, contexto por aparelho/conta, login por UI e coletores (console, rede, diálogos).
import { chromium } from "playwright";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { APARELHOS, AUTH_DIR, BASE_URL, CONTAS, CONTEXTO_BASE, SENHA, STORAGE_PADRAO, SLUG } from "./config.mjs";

let _browser;
export async function abrirNavegador() {
  if (!_browser) _browser = await chromium.launch({ headless: true });
  return _browser;
}
export async function fecharNavegador() {
  if (_browser) await _browser.close();
  _browser = null;
}

const CSS_SEM_OVERLAY_DEV = "nextjs-portal, [data-nextjs-dev-tools-button], #__next-build-watcher{display:none!important}";

function instrumentar(page) {
  page.__requisicoes = 0;
  page.on("request", (r) => {
    // Telemetria e consultas periódicas não provam que a ação funcionou.
    if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && !r.url().includes("/api/metrics") && !/card_shown|card_acted|card_dismissed/.test(r.postData() ?? "")) page.__requisicoes++;
  });
  page.__col = { console: [], falhas: [], dialogos: [] };
  page.on("console", (m) => {
    if (m.type() === "error") page.__col.console.push({ tipo: "console.error", texto: m.text().slice(0, 400), url: m.location()?.url ?? "" });
  });
  page.on("pageerror", (e) => page.__col.console.push({ tipo: "pageerror", texto: String(e.message ?? e).slice(0, 400) }));
  page.on("requestfailed", (r) => {
    const erro = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED/.test(erro)) return; // navegação cancelada pelo próprio app
    page.__col.falhas.push({ metodo: r.method(), url: r.url().slice(0, 300), erro });
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !/\/_next\/|favicon|hot-update/.test(r.url())) {
      page.__col.falhas.push({ metodo: r.request().method(), url: r.url().slice(0, 300), status: r.status() });
    }
  });
  // Nunca confirmar: confirmações nativas são registradas e recusadas.
  page.on("dialog", async (d) => {
    page.__col.dialogos.push({ tipo: d.type(), mensagem: d.message() });
    // jornadas que pedem a confirmação (ex. publicar) ligam page.__aceitarDialogo; nunca para exclusões
    if (page.__aceitarDialogo) await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
  });
}

export async function criarContexto(aparelho, { storageState, semPadroes = false, extraStorage = {} } = {}) {
  const browser = await abrirNavegador();
  const cfg = APARELHOS[aparelho];
  const { maxAltura, ...opts } = cfg;
  const ctx = await browser.newContext({ ...opts, ...CONTEXTO_BASE, ...(storageState ? { storageState } : {}), baseURL: BASE_URL });
  const ls = { ...(semPadroes ? {} : STORAGE_PADRAO), ...extraStorage };
  await ctx.addInitScript(({ ls, css }) => {
    try { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); } catch {}
    const aplicar = () => { if (document.head && !document.getElementById("__cap_css")) { const s = document.createElement("style"); s.id = "__cap_css"; s.textContent = css; document.head.appendChild(s); } };
    aplicar(); document.addEventListener("DOMContentLoaded", aplicar);
  }, { ls, css: CSS_SEM_OVERLAY_DEV });
  // Trava de segurança: qualquer chamada ao Supabase de produção aborta tudo.
  await ctx.route(/supabase\.(co|in)\b/, async (route) => {
    console.error("ABORTADO: requisição para Supabase de produção: " + new URL(route.request().url()).host);
    await route.abort();
    process.exit(2);
  });
  ctx.on("page", instrumentar);
  ctx.setDefaultNavigationTimeout(90000);
  ctx.setDefaultTimeout(15000);
  const page = await ctx.newPage();
  page.__aparelho = aparelho;
  page.__maxAltura = maxAltura;
  return { ctx, page };
}

export function arquivoAuth(aparelho, conta, sufixo = "") {
  mkdirSync(AUTH_DIR, { recursive: true });
  return join(AUTH_DIR, `${aparelho}-${conta}${sufixo}.json`);
}

/** Login pela tela /service/login (preenche o formulário, clica Entrar). Salva storageState. */
export async function loginPorUI(aparelho, conta, opts = {}) {
  let ultimo;
  for (let i = 0; i < 3; i++) {
    try { return await loginPorUI1(aparelho, conta, opts); } catch (e) { ultimo = e; console.log(`  login ${conta} tentativa ${i + 1} falhou: ${String(e.message).split("\n")[0]}`); }
  }
  throw ultimo;
}
async function loginPorUI1(aparelho, conta, { slugCookie = false } = {}) {
  const { ctx, page } = await criarContexto(aparelho);
  try {
    if (slugCookie) await ctx.addCookies([{ name: "cex_church_slug", value: SLUG, url: BASE_URL }]);
    await page.goto("/service/login?redirect=/service", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.locator('input[type="email"]').first().fill(CONTAS[conta].email);
    await page.locator('input[type="password"]').first().fill(SENHA);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.endsWith("/service/login"), { timeout: 60000 }),
      page.getByRole("button", { name: "Entrar", exact: true }).click(),
    ]);
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
    const destino = page.url();
    const arq = arquivoAuth(aparelho, conta);
    await ctx.storageState({ path: arq });
    return { arquivo: arq, destino };
  } finally {
    await ctx.close();
  }
}

/** Contexto já autenticado, reaproveitando o storageState por conta/aparelho (renova se > 40 min). */
export async function contextoLogado(aparelho, conta, opts = {}) {
  const arq = arquivoAuth(aparelho, conta, opts.sufixoAuth ?? "");
  const velho = !existsSync(arq) || Date.now() - statSync(arq).mtimeMs > 40 * 60 * 1000;
  if (velho && !opts.sufixoAuth) await loginPorUI(aparelho, conta);
  if (!existsSync(arq)) throw new Error(`sem storageState ${arq}`);
  return criarContexto(aparelho, { ...opts, storageState: arq });
}
