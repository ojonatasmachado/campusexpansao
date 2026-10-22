// Captura das telas-base do painel (usado por painel, estados vazios e líder).
import { antes, CFG_TABS } from "./catalogo.mjs";
import { irPara, abrirConfigAba, voltarIndiceConfig, esperarH1 } from "./nav.mjs";
import { tirarPrint } from "./print.mjs";
import { tentar } from "./runner.mjs";

export const pad = (n) => String(n).padStart(2, "0");

export async function telaBase(page, { ap, conta, papel, t, pasta = "telas", grupo = "painel", sufixo = "", estado = null, extraEspera = [] }) {
  const nome = `${ap}-${pad(t.n)}-${grupo}-${t.nome}${sufixo}`;
  return tentar(`${pasta}/${nome}.png`, { tela: t.label, passo: `menu > ${t.label}` }, async () => {
    const cliques = await irPara(page, t);
    return tirarPrint(page, { pasta, nome, conta, papel, tela: t.label, estado, cliques, componente: t.comp, antes: antes(ap, t.antes), espera: [...extraEspera] });
  });
}

/** Índice de Configurações + cada aba. Deixa a página no índice. */
export async function configCompleta(page, { ap, conta, papel, pasta = "telas", sufixo = "", estado = null, abas = CFG_TABS }) {
  for (const tab of abas) {
    const nome = `${ap}-${pad(tab.n)}-${tab.nome}${sufixo}`;
    await tentar(`${pasta}/${nome}.png`, { tela: `Configurações > ${tab.label}`, passo: `Configurações > ${tab.label}` }, async () => {
      const cliques = ["menu > Configurações", ...(await abrirConfigAba(page, tab))];
      await tirarPrint(page, { pasta, nome, conta, papel, tela: `Configurações > ${tab.label}`, estado, cliques, componente: tab.comp, antes: antes(ap, tab.antes) });
      if (ap === "celular") await voltarIndiceConfig(page);
    });
  }
}

/** Voluntários (fora do menu): busca global > resultado do tipo Voluntário. Devolve os cliques. */
export async function abrirVoluntarios(page, ap, termo = "Lucas") {
  const { clicarTexto } = await import("./nav.mjs");
  const cliques = [];
  if (ap === "celular") { await page.locator('button.top-search-btn[aria-label="Buscar"]').first().click(); cliques.push("botão Buscar (topo)"); await page.waitForTimeout(300); }
  const campo = page.locator('input[placeholder^="Buscar membro"]').first();
  await campo.click(); await campo.fill(termo); cliques.push(`busca global: digitar ${termo}`);
  await page.waitForTimeout(600);
  await clicarTexto(page, "button, a, [role=option], li", /volunt/i, { timeout: 4000 });
  cliques.push("clicar no resultado do tipo Voluntário");
  await esperarH1(page, /^voluntarios$/);
  const fechar = page.locator("button.drawer-close").first();
  if (await fechar.isVisible().catch(() => false)) { await fechar.click(); cliques.push("fechar a ficha que abre junto"); await page.waitForTimeout(400); }
  return cliques;
}
