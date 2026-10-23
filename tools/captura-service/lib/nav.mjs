// Navegação por cliques reais: menu do painel, abas de Configurações, abas do app do membro.
import { norm } from "./config.mjs";
import { esperar } from "./print.mjs";


/** Índice (entre os visíveis) do n-ésimo elemento cujo texto casa. Aceita string (contém, sem acento/caixa) ou RegExp. */
async function acharIndice(loc, alvo, { exato = false, nth = 0 } = {}) {
  const alvoN = alvo instanceof RegExp ? null : norm(alvo);
  return loc.evaluateAll(
    (els, { alvoN, re, exato, nth }) => {
      const nr = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
      let c = 0;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const t = nr(`${el.innerText || el.textContent || ""} ${el.getAttribute("aria-label") || ""} ${el.title || ""}`);
        const ok = re ? new RegExp(re, "i").test(t) : exato ? t === alvoN : t.includes(alvoN);
        if (ok) { if (c === nth) return i; c++; }
      }
      return -1;
    },
    { alvoN, re: alvo instanceof RegExp ? alvo.source : null, exato, nth },
  );
}

/** Clica no n-ésimo elemento `seletor` cujo texto casa. Lança erro se não achar. */
export async function clicarTexto(page, seletor, alvo, { exato = false, nth = 0, dentro = null, timeout = 6000, force = false } = {}) {
  const raiz = dentro ? page.locator(dentro).first() : page;
  const loc = raiz.locator(seletor);
  const fim = Date.now() + timeout;
  let i = -1;
  while (Date.now() < fim) {
    i = await acharIndice(loc, alvo, { exato, nth });
    if (i >= 0) break;
    await page.waitForTimeout(250);
  }
  if (i < 0) throw new Error(`não achei ${seletor} com texto ${alvo}`);
  await loc.nth(i).scrollIntoViewIfNeeded().catch(() => {});
  await loc.nth(i).click({ timeout: 8000, force });
  await page.waitForTimeout(350);
}

export async function existe(page, seletor, alvo = null, opts = {}) {
  const loc = (opts.dentro ? page.locator(opts.dentro).first() : page).locator(seletor);
  if (alvo == null) return (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false));
  return (await acharIndice(loc, alvo, opts)) >= 0;
}

export async function h1Atual(page) {
  return (await page.locator("h1.ph-title:visible, main h1:visible, .main h1:visible").first().innerText({ timeout: 3000 }).catch(() => "")).trim().replace(/\s*\?$/, "").trim(); // tira o "?" do HelpDot
}
export async function esperarH1(page, re, timeout = 20000) {
  const fim = Date.now() + timeout;
  let h = "";
  while (Date.now() < fim) {
    h = norm(await h1Atual(page));
    if (re.test(h)) return h;
    await page.waitForTimeout(250);
  }
  throw new Error(`h1 esperado ${re} mas está "${h}"`);
}

export async function abrirPainel(page, re = /./) {
  for (let i = 0; ; i++) {
    try {
      await page.goto("/service", { waitUntil: "domcontentloaded", timeout: 60000 });
      await esperar(page);
      await esperarH1(page, re, 40000);
      return;
    } catch (e) { if (i >= 2) throw e; console.log(`  abrirPainel tentativa ${i + 1} falhou, repetindo`); }
  }
}

const ehCelular = (page) => page.__aparelho === "celular";

export async function abrirMenuLateral(page) {
  if (!ehCelular(page)) return;
  const aberto = await page.locator("aside.sb").first().evaluate((e) => e.getBoundingClientRect().right > 20).catch(() => false);
  if (aberto) return;
  await page.locator('button.top-menu[aria-label="Abrir menu"]').first().click();
  await page.waitForTimeout(450);
}

/** Vai a uma tela do painel pelo menu (clicando). Devolve a lista de cliques. */
export async function irPara(page, t) {
  const cliques = [];
  const aberto = await page.locator("aside.sb").first().evaluate((e) => e.getBoundingClientRect().right > 20).catch(() => false);
  await abrirMenuLateral(page);
  if (ehCelular(page) && !aberto) cliques.push("botão de menu (topo)");
  const alvo = page.locator(`button.sb-link[data-tour="${t.id}"]`).first();
  if (!await alvo.isVisible()) {
    const grupos = page.locator('button.sb-group-btn[aria-expanded="false"]');
    for (let i = (await grupos.count()) - 1; i >= 0 && !await alvo.isVisible(); i--) {
      const botao = grupos.nth(i);
      const nome = (await botao.innerText()).trim();
      await botao.click();
      cliques.push(`abrir ${nome}`);
    }
    const fechados = alvo.locator('xpath=ancestor::details[not(@open)]');
    while (await fechados.count()) {
      const resumo = fechados.first().locator(':scope > summary');
      const nome = (await resumo.innerText()).trim();
      await resumo.click();
      cliques.push(`abrir ${nome}`);
    }
  }
  await alvo.click({ timeout: 8000 });
  cliques.push(t.id === "config" ? "menu > Configurações" : `menu > ${t.grupo} > ${t.label}`);
  if (t.h1) await esperarH1(page, t.h1);
  else {
    await page.waitForFunction((id) => document.querySelector(`button.sb-link[data-tour="${id}"]`)?.classList.contains("on"), t.id);
    await esperar(page);
  }
  await page.waitForTimeout(400);
  return cliques;
}

/** Abre uma aba de Configurações. Pré-condição: já está em Configurações (índice visível). */
export async function abrirConfigAba(page, tab) {
  await clicarTexto(page, "button.cfg-index-item", tab.label, { timeout: 8000 });
  await page.waitForTimeout(500);
  return [`Configurações > ${tab.label}`];
}
export async function voltarIndiceConfig(page) {
  const b = page.locator("button.cfg-back").first();
  if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(400); }
}

/** Fecha modal/drawer aberto sem salvar (Escape, depois Cancelar/Fechar). */
export async function fecharOverlay(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
}

// ---------- app do membro ----------
export async function abaApp(page, nome) {
  if (norm(nome) === "perfil") {
    await page.getByRole("button", { name: "Perfil", exact: true }).click();
    await page.waitForTimeout(500);
    return;
  }
  await clicarTexto(page, "nav.m-tab button", new RegExp("(^|\\s)" + nome + "$", "i"));
  await page.waitForTimeout(500);
}
