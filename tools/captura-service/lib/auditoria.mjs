// auditar(page): coleta métricas de UX/acessibilidade do que está visível na página.
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./config.mjs";
const MEDIDOR = readFileSync(join(RAIZ, "scripts/medir-densidade.js"), "utf8");

function medirNaPagina() {
  const vis = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) if (p.matches("details:not([open])") && !p.querySelector(":scope > summary")?.contains(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0.01;
  };
  const escopo = [...document.querySelectorAll('[role="dialog"][aria-modal="true"],dialog[open]')].filter(vis).at(-1) ?? document.body;
  const cw = document.documentElement.clientWidth;
  const foraDaTelaX = (r) => r.right <= 0 || r.left >= cw;
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const cls = [...el.classList].slice(0, 3);
    if (cls.length) s += "." + cls.join(".");
    return s;
  };
  const seletor = (el) => {
    const p = el.parentElement;
    const i = p ? [...p.children].indexOf(el) + 1 : 1;
    return (p && p !== document.body ? desc(p) + " > " : "") + desc(el) + (el.id ? "" : `:nth-child(${i})`);
  };
  const combos = new Map();
  let menor12 = 0, menor13 = 0, menor14 = 0;
  const exemplos12 = [];
  for (const el of escopo.querySelectorAll("*")) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH)$/i.test(el.tagName)) continue;
    let temTexto = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { temTexto = true; break; }
    if (!temTexto || !vis(el) || foraDaTelaX(el.getBoundingClientRect())) continue;
    const cs = getComputedStyle(el);
    const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const size = parseFloat(cs.fontSize);
    const caps = cs.textTransform === "uppercase";
    const k = `${fam}|${size}|${cs.fontWeight}|${caps}`;
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join(" ").slice(0, 40);
    const c = combos.get(k) ?? { familia: fam, tamanho_px: size, peso: cs.fontWeight, caixa_alta: caps, contagem: 0, exemplo: txt };
    c.contagem++; combos.set(k, c);
    if (size < 14) menor14++;
    if (size < 12.95) menor13++;
    if (size < 12) { menor12++; if (exemplos12.length < 15) exemplos12.push({ texto: txt, seletor: seletor(el), tamanho_px: size }); }
  }
  const alvos = [];
  let totalPequenos = 0, menor24 = 0;
  const q = 'a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch],[role=radio],[role=menuitem],[role=checkbox],[role=slider],[role=option],summary';
  for (const el of escopo.querySelectorAll(q)) {
    const r = el.getBoundingClientRect();
    if (!vis(el) || foraDaTelaX(r) || (r.width <= 1 && r.height <= 1)) continue;
    const pseudo = getComputedStyle(el, "::before");
    const amplia = pseudo.content !== "none" && pseudo.position === "absolute";
    const w = Math.max(r.width, amplia ? parseFloat(pseudo.width) || 0 : 0);
    const h = Math.max(r.height, amplia ? parseFloat(pseudo.height) || 0 : 0);
    const lab = el.labels?.[0]?.getBoundingClientRect();
    if (Math.max(w, lab?.width || 0) < 24 || Math.max(h, lab?.height || 0) < 24) menor24++;
    if (w < 44 || h < 44) {
      totalPequenos++;
      if (alvos.length < 150) alvos.push({ texto: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.title || "").trim().replace(/\s+/g, " ").slice(0, 40), seletor: seletor(el), largura: Math.round(r.width), altura: Math.round(r.height) });
    }
  }
  const sw = document.documentElement.scrollWidth;
  const rolagem = { rolagem_lateral: sw > cw + 1, scrollWidth: sw, clientWidth: cw, causadores: [] };
  if (rolagem.rolagem_lateral) {
    const cand = [];
    for (const el of escopo.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > cw + 1 && r.left < cw && vis(el)) cand.push({ seletor: seletor(el), direita_px: Math.round(r.right), largura: Math.round(r.width) });
    }
    cand.sort((a, b) => b.direita_px - a.direita_px);
    rolagem.causadores = cand.slice(0, 8);
  }
  return {
    fontes: [...combos.values()].sort((a, b) => b.contagem - a.contagem),
    textos_menores_que_12px: menor12, textos_menores_que_13px: menor13, textos_menores_que_14px: menor14, exemplos_menores_que_12px: exemplos12,
    alvos_menores_que_24px: menor24,
    clicaveis_menores_que_44px_total: totalPequenos, clicaveis_menores_que_44px: alvos,
    ...rolagem,
  };
}

export async function auditar(page) {
  const out = {};
  try {
    await page.evaluate(MEDIDOR);
    out.densidade = await page.evaluate(() => window.__medir(24));
  } catch (e) { out.erro_medicao = String(e.message); }
  try { Object.assign(out, await page.evaluate(medirNaPagina)); } catch (e) { out.erro_medicao = String(e.message ?? e).slice(0, 200); }
  // coletores de console/rede acumulados desde a última auditoria
  const col = page.__col ?? { console: [], falhas: [], dialogos: [] };
  out.erros_console = col.console.splice(0);
  out.requisicoes_com_falha = col.falhas.splice(0);
  out.dialogos_nativos = col.dialogos.splice(0);
  try {
    const r = await new AxeBuilder({ page }).analyze();
    out.axe = {
      total_violacoes: r.violations.length,
      violacoes: r.violations.map((v) => ({ id: v.id, impacto: v.impact, descricao: v.help, nos: v.nodes.length, exemplos: v.nodes.slice(0, 5).map((n) => n.target.join(" ")) })),
      contraste: (r.violations.find((v) => v.id === "color-contrast")?.nodes ?? []).slice(0, 60).map((n) => {
        const d = n.any?.[0]?.data ?? {};
        return { alvo: n.target.join(" "), cor_texto: d.fgColor, cor_fundo: d.bgColor, razao: d.contrastRatio, minimo: d.expectedContrastRatio, fonte_px: d.fontSize, peso: d.fontWeight };
      }),
      contraste_nos_total: r.violations.find((v) => v.id === "color-contrast")?.nodes.length ?? 0,
      contraste_incompleto: r.incomplete.find((v) => v.id === "color-contrast")?.nodes.length ?? 0,
    };
  } catch (e) { out.axe = { erro: String(e.message ?? e).slice(0, 200) }; }
  return out;
}
