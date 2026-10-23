// Peças comuns das jornadas (painel de gestão e app do membro).
import { clicarTexto, abrirMenuLateral, esperarH1, abaApp } from "./nav.mjs";
import { esperar } from "./print.mjs";

export const MESES_T = (t) => t;
export const tocar = (seletor, txt, o = {}) => (p) => clicarTexto(p, seletor, txt, o);
export const BTN = "button, a, [role=button], .m6-row, .m6-btn";

/** Clica no item do menu do painel (a gaveta já deve estar aberta no celular). */
export async function clicarItemMenu(page, t) {
  const sel = `button.sb-link[data-tour="${t.id}"]`;
  if (!(await page.locator(sel).first().isVisible().catch(() => false))) {
    const grupos = page.locator('button.sb-group-btn[aria-expanded="false"]');
    for (let i = (await grupos.count()) - 1; i >= 0; i--) await grupos.nth(i).click().catch(() => {});
    await page.waitForTimeout(250);
  }
  await page.locator(sel).first().click({ timeout: 8000 });
  await esperarH1(page, t.h1);
  await page.waitForTimeout(400);
}

/** Painel: do estado atual até uma tela do menu. Celular = 2 toques (menu, item); desktop = 1. */
export async function menuPara(j, t, slugTela) {
  if (j.ap === "celular") {
    const aberto = await j.page.locator("aside.sb").first().evaluate((e) => e.getBoundingClientRect().right > 20).catch(() => false);
    if (!aberto) await j.passo("menu-aberto", "botão de menu (topo)", (p) => abrirMenuLateral(p));
    await j.passo(slugTela, `menu > ${t.grupo} > ${t.label}`, (p) => clicarItemMenu(p, t), { espera: [t.label.split(" ")[0]] });
  } else {
    await j.passo(slugTela, `menu > ${t.grupo} > ${t.label}`, (p) => clicarItemMenu(p, t));
  }
}

/** Abre /service e espera o painel (gestão) ou o app (membro). */
export async function abrirInicioPainel(page) {
  for (let i = 0; ; i++) {
    try {
      await page.goto("/service", { waitUntil: "domcontentloaded", timeout: 60000 });
      await esperar(page); await esperarH1(page, /./, 40000); return;
    } catch (e) { if (i >= 2) throw e; }
  }
}
export async function abrirInicioApp(page) {
  for (let i = 0; ; i++) {
    try {
      await page.goto("/service", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.locator("nav.m-tab").first().waitFor({ timeout: 30000 }); await esperar(page); return;
    } catch (e) { if (i >= 2) throw e; }
  }
}
export { abaApp };
export const preencher = (seletor, valor, nth = 0) => async (p) => { const l = p.locator(seletor).nth(nth); await l.scrollIntoViewIfNeeded().catch(() => {}); await l.click({ timeout: 8000 }); await l.fill(valor); };
export const esperarTexto = (page, re, timeout = 10000) => page.waitForFunction((s) => document.body.innerText.includes(s), String(re), { timeout });
