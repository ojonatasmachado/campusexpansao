// Captura específica da história E1: Escalas por time
import { contextoGestao } from "../lib/sessoes.mjs";
import { abrirPainel } from "../lib/nav.mjs";
import { tirarPrint, registrarNaoExiste } from "../lib/print.mjs";
import { tentar } from "../lib/runner.mjs";

export async function rodar({ aparelhos }) {
  for (const ap of aparelhos) {
    const { ctx, page } = await contextoGestao(ap, "lider");
    const base = { ap, conta: "lider@teste.local", papel: "lider", pasta: "telas", grupo: "e1" };
    try {
      await abrirPainel(page, /./);

      // Navegar para Escalas
      await page.getByRole('link', { name: /Escalas/i }).click();
      await page.waitForURL(/\/service\/escalas/, { timeout: 10000 });

      // Foto 1: Visão geral desktop com seletor de time
      if (ap === "desktop") {
        const nome = `${ap}-E1-escala-visao-geral`;
        await tentar(`telas/${nome}.png`, { page, tela: "Escalas por time - visão geral", passo: "verificar critérios E1" }, async () => {
          await page.setViewportSize({ width: 1366, height: 860 });

          // Verificar seletor de time no topo
          const seletorTime = page.locator('[class*="segmentado"], [class*="seg-"], select').first();
          const seletorVisivel = await seletorTime.isVisible();

          // Verificar que NÃO tem "Como gerar" nem "Pendências da semana"
          const comoGerar = await page.getByText(/Como gerar/i).count() > 0;
          const pendenciasSemana = await page.getByText(/Pendências da semana/i).count() > 0;

          console.log(`[${ap}] Seletor de time visível: ${seletorVisivel}`);
          console.log(`[${ap}] "Como gerar" presente: ${comoGerar}`);
          console.log(`[${ap}] "Pendências da semana" presente: ${pendenciasSemana}`);

          // Contar itens clicáveis na primeira dobra
          const itensClicaveis = await page.locator('button, a, [role="button"], input, select, [tabindex="0"]').count();
          console.log(`[${ap}] Itens clicáveis na dobra (1366x860): ${itensClicaveis}`);

          // Contar palavras visíveis
          const textoVisivel = await page.locator('body').textContent();
          const palavras = textoVisivel ? textoVisivel.trim().split(/\s+/).length : 0;
          console.log(`[${ap}] Palavras visíveis: ${palavras}`);

          await tirarPrint(page, {
            pasta: "telas",
            nome,
            conta: base.conta,
            papel: "lider",
            tela: "Escalas por time - visão geral",
            cliques: ["navegação para Escalas"],
            componente: "app/service/modules/escalas/Escalas.tsx",
            espera: ["Escalas"]
          });
        });

        // Foto 2: Verificar tabela função × culto
        const nomeTabela = `${ap}-E1-escala-tabela`;
        await tentar(`telas/${nomeTabela}.png`, { page, tela: "Escalas - tabela função x culto", passo: "verificar tabela" }, async () => {
          await tirarPrint(page, {
            pasta: "telas",
            nome: nomeTabela,
            conta: base.conta,
            papel: "lider",
            tela: "Escalas - tabela função x culto",
            cliques: [],
            componente: "app/service/modules/escalas/Escalas.tsx",
            espera: ["função", "culto"]
          });
        });
      }

      // Foto 3: Modo mobile (390px)
      if (ap === "celular") {
        const nomeMobile = `${ap}-E1-escala-mobile`;
        await tentar(`telas/${nomeMobile}.png`, { page, tela: "Escalas por time - mobile", passo: "verificar mobile" }, async () => {
          await page.setViewportSize({ width: 390, height: 844 });

          await tirarPrint(page, {
            pasta: "telas",
            nome: nomeMobile,
            conta: base.conta,
            papel: "lider",
            tela: "Escalas por time - mobile (390px)",
            cliques: ["navegação para Escalas"],
            componente: "app/service/modules/escalas/Escalas.tsx",
            espera: ["Escalas"]
          });
        });
      }

    } finally {
      await ctx.close();
    }
  }
}