// 3.2 Painel com master@: um print por item do menu + Configurações (índice e abas) + menu do usuário + menu lateral + telas fora da lista.
import { TELAS, antes } from "../lib/catalogo.mjs";
import { contextoGestao } from "../lib/sessoes.mjs";
import { abrirMenuLateral, clicarTexto, esperarH1, abrirPainel } from "../lib/nav.mjs";
import { tirarPrint } from "../lib/print.mjs";
import { tentar } from "../lib/runner.mjs";
import { telaBase, configCompleta } from "../lib/painelkit.mjs";

const CONTA = "master", PAPEL = "master";

export async function rodar({ aparelhos }) {
  for (const ap of aparelhos) {
    const { ctx, page } = await contextoGestao(ap, CONTA);
    try {
      await abrirPainel(page, /./);
      for (const t of TELAS) await telaBase(page, { ap, conta: CONTA, papel: PAPEL, t });
      // Novos módulos entram pelo menu real, sem manter outra lista paralela.
      const entradas = await page.locator("button.sb-link[data-tour]").evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-tour"), label: e.textContent.trim() })));
      for (const [i, item] of entradas.filter((e) => !TELAS.some((t) => t.id === e.id)).entries()) {
        await telaBase(page, { ap, conta: CONTA, papel: PAPEL, t: { ...item, n: 100 + i, nome: item.id, grupo: "Menu atual", h1: /./, comp: "app/service/modules/registry.ts" } });
      }
      await configCompleta(page, { ap, conta: CONTA, papel: PAPEL });

      // menu do usuário aberto (30)
      await tentar(`telas/${ap}-30-painel-menu-do-usuario.png`, { tela: "Menu do usuário", passo: "abrir menu do usuário" }, async () => {
        await abrirPainel(page, /./);
        await page.locator("button.top-user-btn").first().click();
        await page.waitForTimeout(400);
        await tirarPrint(page, { pasta: "telas", nome: `${ap}-30-painel-menu-do-usuario`, conta: CONTA, papel: PAPEL, tela: "Menu do usuário (aberto)", cliques: ["botão do usuário (topo)"], componente: "app/service/TopUserMenu.tsx:53", espera: ["Sair"] });
        await page.keyboard.press("Escape");
      });

      // menu lateral aberto no celular (31)
      if (ap === "celular") {
        await tentar(`telas/${ap}-31-painel-menu-lateral.png`, { tela: "Menu lateral (celular)", passo: "abrir menu" }, async () => {
          await abrirPainel(page, /./);
          await abrirMenuLateral(page);
          await tirarPrint(page, { pasta: "telas", nome: `${ap}-31-painel-menu-lateral`, conta: CONTA, papel: PAPEL, tela: "Menu lateral aberto (celular)", cliques: ["botão de menu (topo)"], componente: "app/service/ServiceExactApp.tsx:1690", espera: ["Configurações"] });
        });
      }

      // Voluntários (fora do menu): só pela busca global
      await tentar(`telas/${ap}-32-painel-voluntarios.png`, { tela: "Voluntários (fora do menu)", passo: "busca global > Voluntário" }, async () => {
        await abrirPainel(page, /./);
        const cliques = [];
        if (ap === "celular") { await page.locator('button.top-search-btn[aria-label="Buscar"]').first().click(); cliques.push("botão Buscar (topo)"); await page.waitForTimeout(300); }
        const campo = page.locator('input[placeholder^="Buscar membro"]').first();
        await campo.click();
        await campo.fill("Lucas");
        cliques.push("busca global: digitar Lucas");
        await page.waitForTimeout(600);
        await page.screenshot({ path: "/dev/null" }).catch(() => {});
        await clicarTexto(page, "button, a, [role=option], li", /volunt/i, { timeout: 4000 });
        cliques.push("clicar no resultado do tipo Voluntário");
        await esperarH1(page, /^voluntarios$/);
        const fechar = page.locator("button.drawer-close").first();
        if (await fechar.isVisible().catch(() => false)) { await fechar.click(); cliques.push("fechar a ficha que abre junto"); await page.waitForTimeout(400); }
        await tirarPrint(page, { pasta: "telas", nome: `${ap}-32-painel-voluntarios`, conta: CONTA, papel: PAPEL, tela: "Voluntários (rota pessoas, fora do menu)", cliques, componente: "app/service/ServiceExactApp.tsx:2519 (Pessoas)", antes: antes(ap, ["07-painel-voluntarios"]), espera: ["Voluntários"] });
      });
    } finally { await ctx.close(); }
  }
}
