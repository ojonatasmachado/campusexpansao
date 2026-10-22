// Etapa 3: temas. Login da igreja, Início do painel (master@) e Início do app (membro@, celular),
// em claro e escuro, com 3 cores de destaque de ACCENT_PRESETS (app/service/lib/theme.ts):
// a padrão (Oliva CE.X, DEFAULT_ACCENT), a mais clara (Dourado, luminância 0,381) e a mais escura (Azul marinho, 0,043).
// A cor é trocada pela UI (Configurações > Personalização > chip > Salvar personalização).
// O modo é trocado pelo meio real: menu do usuário (painel) e Perfil > Tema (app); ambos gravam o cookie cex_theme.
import { contextoGestao, contextoApp } from "../lib/sessoes.mjs";
import { criarContexto } from "../lib/contexto.mjs";
import { SLUG, BASE_URL } from "../lib/config.mjs";
import { abrirPainel, abrirConfigAba, abaApp, clicarTexto, irPara } from "../lib/nav.mjs";
import { tela } from "../lib/catalogo.mjs";
import { tirarPrint } from "../lib/print.mjs";
import { tentar } from "../lib/runner.mjs";
import { abrirInicioApp, esperarTexto } from "../lib/jkit.mjs";

export const ACENTOS = [
  { id: "padrao", label: "Oliva CE.X", hex: "#7A9E3F", regra: "cor padrão do sistema (DEFAULT_ACCENT)" },
  { id: "clara", label: "Dourado", hex: "#C8A13A", regra: "a mais clara da lista (luminância 0,381)" },
  { id: "escura", label: "Azul marinho", hex: "#1F3A68", regra: "a mais escura da lista (luminância 0,043)" },
];
const MODOS = ["claro", "escuro"];

async function trocarCorPelaUI(cor) {
  const { ctx, page } = await contextoGestao("desktop", "master");
  try {
    await abrirPainel(page, /./);
    await irPara(page, tela("config"));
    await abrirConfigAba(page, { label: "Personalização" });
    await clicarTexto(page, "button.seg-chip", cor.label, { exato: false });
    await clicarTexto(page, "button", "Salvar personalização");
    await esperarTexto(page, "Salvo!", 15000).catch(() => {});
    await page.waitForTimeout(1500);
    const on = await page.locator("button.seg-chip.on").first().innerText().catch(() => "");
    console.log(`  cor aplicada pela UI: ${on.trim()}`);
  } finally { await ctx.close(); }
}

/** Painel: garante o modo pelo menu do usuário. Devolve os cliques e o valor do cookie. */
async function modoNoPainel(page, ap, modo, cliques) {
  const botao = page.locator("button.top-user-btn").first();
  await botao.click(); await page.waitForTimeout(350);
  const txt = await page.locator('.top-user-pop [role="menuitem"]').allInnerTexts();
  const escuroAgora = txt.some((t) => /Tema claro/.test(t));
  const querEscuro = modo === "escuro";
  if (escuroAgora !== querEscuro) {
    await clicarTexto(page, '[role="menuitem"]', querEscuro ? "Tema escuro" : "Tema claro");
    cliques.push(`menu do usuário > ${querEscuro ? "Tema escuro" : "Tema claro"}`);
    await page.waitForTimeout(700);
  } else {
    cliques.push(`(modo ${modo} já ativo: modo padrão da igreja)`);
    await page.keyboard.press("Escape");
  }
  await page.mouse.click(5, 400).catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);
}

async function modoNoApp(page, modo, cliques) {
  await abaApp(page, "Perfil"); cliques.push('aba "Perfil"');
  const rotulo = modo === "escuro" ? "Escuro" : "Claro";
  const ja = await page.locator('[role="radiogroup"][aria-label="Tema"] button[aria-checked="true"]').first().innerText().catch(() => "");
  if (ja.trim() !== rotulo) {
    await clicarTexto(page, '[role="radiogroup"][aria-label="Tema"] button', rotulo, { exato: true });
    cliques.push(`Perfil > Tema > ${rotulo}`);
    await page.waitForTimeout(700);
  } else cliques.push(`(Tema ${rotulo} já ativo: modo padrão da igreja)`);
  await page.locator("nav.m-tab button").first().click(); cliques.push('aba "Início"');
  await page.waitForTimeout(500);
}

export async function rodar({ aparelhos }) {
  for (const cor of ACENTOS) {
    console.log(`\n-- tema cor ${cor.label} ${cor.hex} --`);
    const ok = await tentar(`temas/troca-${cor.id}`, { tela: "Personalização", passo: `cor ${cor.label}` }, async () => { await trocarCorPelaUI(cor); return true; });
    if (!ok) continue;
    for (const modo of MODOS) {
      const estado = `modo ${modo} · cor ${cor.label} ${cor.hex} (${cor.id})`;
      const base = (ap, extra) => ({ pasta: "temas", estado, ...extra });
      let cookieTema = null;
      for (const ap of aparelhos) {
        // Início do painel (master@)
        const nomeP = `${ap}-${cor.id}-${modo}-painel-inicio`;
        await tentar(`temas/${nomeP}.png`, { tela: "Tema: Início do painel", passo: estado }, async () => {
          const { ctx, page } = await contextoGestao(ap, "master");
          try {
            await abrirPainel(page, /./);
            const cliques = [];
            await modoNoPainel(page, ap, modo, cliques);
            const ck = (await ctx.cookies()).find((c) => c.name === "cex_theme");
            if (ck) cookieTema = ck.value;
            await abrirPainel(page, /./);
            await tirarPrint(page, base(ap, { nome: nomeP, conta: "master@teste.local", papel: "master (painel)", tela: "Tema: Início do painel", cliques, componente: "app/service/ServiceExactApp.tsx:2097 (Painel) + app/service/TopUserMenu.tsx:77", espera: [/bom dia|boa tarde|boa noite/i] }));
          } finally { await ctx.close(); }
        });
        // login com a identidade da igreja (sem sessão; cookie de tema como o app gravou)
        const nomeL = `${ap}-${cor.id}-${modo}-login-igreja`;
        await tentar(`temas/${nomeL}.png`, { tela: "Tema: login da igreja", passo: estado }, async () => {
          const { ctx, page } = await criarContexto(ap);
          try {
            if (cookieTema) await ctx.addCookies([{ name: "cex_theme", value: cookieTema, url: BASE_URL }]);
            await page.goto(`/${SLUG}/entrar`, { waitUntil: "domcontentloaded" });
            await page.waitForTimeout(1200);
            await tirarPrint(page, base(ap, { nome: nomeL, conta: null, papel: "visitante (sem login)", tela: "Tema: login da igreja", cliques: [`abrir /${SLUG}/entrar`, `cookie cex_theme=${cookieTema} (gravado pelo menu do usuário)`], componente: "app/[slug]/entrar/page.tsx:14", espera: ["Entrar"], permiteLogin: true }));
          } finally { await ctx.close(); }
        });
      }
      // Início do app do membro (celular)
      if (aparelhos.includes("celular")) {
        const nomeA = `celular-${cor.id}-${modo}-app-inicio`;
        await tentar(`temas/${nomeA}.png`, { tela: "Tema: Início do app", passo: estado }, async () => {
          const { ctx, page } = await contextoApp("celular", "membro");
          try {
            await abrirInicioApp(page);
            const cliques = [];
            await modoNoApp(page, modo, cliques);
            await tirarPrint(page, base("celular", { nome: nomeA, conta: "membro@teste.local", papel: "membro (app)", tela: "Tema: Início do app", cliques, componente: "app/service/MobileApp.tsx:2591 (Início) + MobileApp.tsx:1748 (Tema)", espera: ["Para você agora"] }));
          } finally { await ctx.close(); }
        });
      }
    }
  }
}
