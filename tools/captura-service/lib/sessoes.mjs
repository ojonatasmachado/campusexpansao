// Sessões por papel/visão. Celular com iPhone UA abre o app do membro; para o painel, a pessoa de gestão
// usa Perfil > "Abrir o painel da igreja" (grava cex_view=gestao). No desktop, o inverso: menu do usuário > "Abrir o app".
import { existsSync, statSync } from "node:fs";
import { arquivoAuth, contextoLogado, criarContexto, loginPorUI } from "./contexto.mjs";
import { clicarTexto, abaApp, esperarH1 } from "./nav.mjs";
import { esperar, capturarFalha } from "./print.mjs";

const fresco = (arq) => existsSync(arq) && Date.now() - statSync(arq).mtimeMs < 40 * 60 * 1000;

/** Contexto no painel de gestão (master/lider/outra), nos dois aparelhos. */
export async function contextoGestao(ap, conta) {
  if (ap === "desktop") return contextoLogado(ap, conta);
  const arq = arquivoAuth(ap, conta, "-gestao");
  if (!fresco(arq)) {
    await loginPorUI(ap, conta);
    const { ctx, page } = await contextoLogado(ap, conta);
    try {
      await page.goto("/service", { waitUntil: "domcontentloaded" });
      await esperar(page);
      try {
        if (!(await page.locator("h1.ph-title").first().isVisible())) {
          await abaApp(page, "Perfil");
          await clicarTexto(page, "button, a, .m6-row", "Abrir o painel da igreja");
        }
      } catch (e) {
        await capturarFalha(page, `falhas/setup-${ap}-${conta}-painel.png`);
        throw new Error(`Entrada no painel falhou pela interface: ${e.message}`);
      }
      await esperarH1(page, /./);
      await ctx.storageState({ path: arq });
    } finally { await ctx.close(); }
  }
  return criarContexto(ap, { storageState: arq });
}

/** Contexto no app do membro. Quem tem gestão no desktop troca pelo menu do usuário. */
export async function contextoApp(ap, conta, { gestao = false } = {}) {
  if (ap === "celular" || !gestao) return contextoLogado(ap, conta);
  const arq = arquivoAuth(ap, conta, "-app");
  if (!fresco(arq)) {
    await loginPorUI(ap, conta);
    const { ctx, page } = await contextoLogado(ap, conta);
    try {
      await page.goto("/service", { waitUntil: "domcontentloaded" });
      await esperarH1(page, /./);
      await page.locator("button.top-user-btn").first().click();
      await clicarTexto(page, '[role="menuitem"]', "Abrir o app");
      await page.locator("nav.m-tab").first().waitFor({ timeout: 15000 });
      await ctx.storageState({ path: arq });
    } finally { await ctx.close(); }
  }
  return criarContexto(ap, { storageState: arq });
}
