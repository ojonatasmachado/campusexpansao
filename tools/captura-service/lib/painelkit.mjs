// Captura das telas-base do painel (usado por painel, estados vazios e líder).
import { antes, CFG_TABS, tela } from "./catalogo.mjs";
import { irPara, abrirConfigAba, voltarIndiceConfig, abrirPainel } from "./nav.mjs";
import { tirarPrint } from "./print.mjs";
import { tentar } from "./runner.mjs";

export const pad = (n) => String(n).padStart(2, "0");

export async function telaBase(page, { ap, conta, papel, t, pasta = "telas", grupo = "painel", sufixo = "", estado = null, extraEspera = [] }) {
  const nome = `${ap}-${pad(t.n)}-${grupo}-${t.nome}${sufixo}`;
  return tentar(`${pasta}/${nome}.png`, { page, tela: t.label, passo: `menu > ${t.label}` }, async () => {
    await abrirPainel(page);
    const cliques = ["abrir /service", ...await irPara(page, t)];
    return tirarPrint(page, { pasta, nome, conta, papel, tela: t.label, estado, cliques, componente: t.comp, antes: antes(ap, t.antes), espera: [...extraEspera] });
  });
}

/** Índice de Configurações + cada aba. Deixa a página no índice. */
export async function configCompleta(page, { ap, conta, papel, pasta = "telas", sufixo = "", estado = null, abas = CFG_TABS }) {
  await abrirPainel(page);
  await irPara(page, tela("config"));
  for (const tab of abas) {
    const nome = `${ap}-${pad(tab.n)}-${tab.nome}${sufixo}`;
    await tentar(`${pasta}/${nome}.png`, { page, tela: `Configurações > ${tab.label}`, passo: `Configurações > ${tab.label}` }, async () => {
      const cliques = ["menu > Configurações", ...(await abrirConfigAba(page, tab))];
      await tirarPrint(page, { pasta, nome, conta, papel, tela: `Configurações > ${tab.label}`, estado, cliques, componente: tab.comp, antes: antes(ap, tab.antes) });
      if (ap === "celular") await voltarIndiceConfig(page);
    });
  }
}

/** Voluntários (fora do menu): busca global > resultado do tipo Voluntário. Devolve os cliques. */
export async function abrirVoluntarios(page) {
  await abrirPainel(page);
  const cliques = ["abrir /service", ...await irPara(page, tela("membros"))];
  await page.getByRole("button", { name: /^Voluntários/ }).click();
  cliques.push("Pessoas > filtro Voluntários");
  return cliques;
}
