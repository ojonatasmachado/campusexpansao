// 3.4 lider@: menu, Início, Escalas e Pessoas, nos dois aparelhos.
import { tela, antes } from "../lib/catalogo.mjs";
import { contextoGestao } from "../lib/sessoes.mjs";
import { abrirPainel, abrirMenuLateral } from "../lib/nav.mjs";
import { tirarPrint, registrarNaoExiste } from "../lib/print.mjs";
import { tentar } from "../lib/runner.mjs";
import { telaBase, abrirVoluntarios } from "../lib/painelkit.mjs";

export async function rodar({ aparelhos }) {
  for (const ap of aparelhos) {
    const { ctx, page } = await contextoGestao(ap, "lider");
    const base = { ap, conta: "lider@teste.local", papel: "lider", pasta: "telas", grupo: "lider" };
    try {
      await abrirPainel(page, /./);
      const nome = `${ap}-01-lider-menu`;
      await tentar(`telas/${nome}.png`, { tela: "Menu do líder", passo: "abrir menu" }, async () => {
        await abrirMenuLateral(page);
        await tirarPrint(page, { pasta: "telas", nome, conta: base.conta, papel: "lider", tela: "Menu (itens visíveis para líder)", cliques: ap === "celular" ? ["botão de menu (topo)"] : ["menu lateral visível"], componente: "app/service/ServiceExactApp.tsx:1668", espera: ["Início"] });
      });
      for (const [n, id] of [[2, "painel"], [3, "escalas"]]) await telaBase(page, { ...base, t: { ...tela(id), n } });
      // Pessoas: o menu do líder não tem o item (registrado). Captura o que ele alcança: Voluntários pela busca.
      if (!(await page.locator('button.sb-link[data-tour="membros"]').count()) && ap === "desktop") registrarNaoExiste("telas/lider-pessoas", "Pessoas (líder)", "O item Pessoas não aparece no menu do líder@ (só Voluntários pela busca global, se a busca o encontra). Ver desktop-01-lider-menu.");
      const nomeV = `${ap}-04-lider-voluntarios`;
      await tentar(`telas/${nomeV}.png`, { tela: "Voluntários (líder, pela busca)", passo: "busca global" }, async () => {
        await abrirPainel(page, /./);
        const cliques = await abrirVoluntarios(page, ap);
        await tirarPrint(page, { pasta: "telas", nome: nomeV, conta: base.conta, papel: "lider", tela: "Voluntários (líder, pela busca)", cliques, componente: "app/service/ServiceExactApp.tsx:2519 (Pessoas)", antes: antes(ap, ["07-painel-voluntarios"]), espera: ["Voluntários"] });
      });
    } finally { await ctx.close(); }
  }
}
