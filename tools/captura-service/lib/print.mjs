// esperar, tirarPrint, manifest (mesclado por arquivo) e bloqueios.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { SAIDA, TEXTOS_CARREGANDO, norm } from "./config.mjs";
import { auditar } from "./auditoria.mjs";
import { avaliar } from "./leis.mjs";
import { referenciaAtual } from "./fontes.mjs";

const PASTAS = ["telas", "estados", "jornadas", "temas", "texto-grande", "textos", "auditoria", "falhas"];
export function prepararSaida() {
  for (const p of PASTAS) mkdirSync(join(SAIDA, p), { recursive: true });
}

// ---------- manifest ----------
const ARQ_MANIFEST = () => join(SAIDA, "manifest.json");
export function lerManifest() {
  return existsSync(ARQ_MANIFEST()) ? JSON.parse(readFileSync(ARQ_MANIFEST(), "utf8")) : {};
}
function gravarManifest(m) {
  const ordenado = Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(ARQ_MANIFEST(), JSON.stringify(ordenado, null, 1));
}
export function removerDoManifest(arquivo) {
  const m = lerManifest();
  if (m[arquivo]) { delete m[arquivo]; gravarManifest(m); }
}

// ---------- bloqueios ----------
const ARQ_BLQ = () => join(SAIDA, ".bloqueios.json");
const lerBlq = () => (existsSync(ARQ_BLQ()) ? JSON.parse(readFileSync(ARQ_BLQ(), "utf8")) : {});
function gravarBlq(b) {
  writeFileSync(ARQ_BLQ(), JSON.stringify(b, null, 1));
  const linhas = ["# Bloqueios e itens que não existem no app", "", "Gerado por tools/captura-service (mesclado entre execuções). Bug que impede captura não é corrigido: só registrado aqui.", ""];
  const falhas = Object.entries(b).filter(([, v]) => v.tipo === "falha");
  const naoExiste = Object.entries(b).filter(([, v]) => v.tipo === "nao-existe");
  linhas.push(`## Falhas de captura (${falhas.length})`, "");
  if (!falhas.length) linhas.push("Nenhuma.", "");
  for (const [k, v] of falhas) linhas.push(`- **${v.tela}** (${k})`, `  - passo: ${v.passo}`, `  - erro: ${v.erro}`, `  - print: ${v.print ?? "sem print"}`, "");
  linhas.push(`## Não existe no app / não alcançável (${naoExiste.length})`, "");
  if (!naoExiste.length) linhas.push("Nenhum.", "");
  for (const [k, v] of naoExiste) linhas.push(`- **${v.tela}** (${k}): ${v.erro}${v.print ? ` · print: ${v.print}` : ""}`);
  writeFileSync(join(SAIDA, "BLOQUEIOS.md"), linhas.join("\n") + "\n");
}
export function registrarBloqueio(chave, { tela, passo, erro, print = null }) {
  const b = lerBlq(); b[chave] = { tipo: "falha", tela, passo, erro, print, horario: new Date().toISOString() }; gravarBlq(b);
  console.log(`  BLOQUEIO ${chave}: ${erro}`);
}
export function registrarNaoExiste(chave, tela, texto, print = null) {
  const b = lerBlq(); b[chave] = { tipo: "nao-existe", tela, erro: texto, print }; gravarBlq(b);
  console.log(`  NAO-EXISTE ${chave}: ${texto}`);
}
export function limparBloqueio(chave) {
  const b = lerBlq(); if (b[chave]) { delete b[chave]; gravarBlq(b); }
}

// ---------- esperas ----------
export async function esperar(page, { extra = 250 } = {}) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForFunction((ts) => !ts.some((t) => document.body && document.body.innerText.includes(t)), TEXTOS_CARREGANDO, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(extra);
}

// ---------- captura completa ----------
async function medirAltura(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    let extra = 0;
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > vh * 0.35) extra = Math.max(extra, el.scrollHeight - el.clientHeight);
    }
    return { doc: document.documentElement.scrollHeight, extra, vh };
  });
}

/** Fullpage. Se a rolagem é de um contêiner interno, amplia o viewport (não mexe em dados) até caber tudo. */
async function fullPage(page, caminho, semExpandir = false) {
  const vp = page.viewportSize();
  let truncada = false, interno = false, restaurarEstilos = false;
  let m = await medirAltura(page);
  // folhas de baixo (sheet) ficam ancoradas no rodapé do viewport: ampliar distorce. Fotografa o que se vê.
  const folha = await page.evaluate(() => !!document.querySelector(".m6-scrim, .m6-sheet"));
  if (folha || semExpandir) m.extra = 0;
  if (m.extra > 0) {
    interno = true;
    let alvo = Math.max(m.vh + m.extra, m.doc);
    for (let i = 0; i < 4; i++) {
      alvo = Math.min(alvo, page.__maxAltura ?? 15000);
      await page.setViewportSize({ width: vp.width, height: Math.ceil(alvo) });
      await page.waitForTimeout(350);
      m = await medirAltura(page);
      if (m.extra <= 1 || alvo >= (page.__maxAltura ?? 15000)) break;
      alvo = alvo + m.extra;
    }
    truncada = m.extra > 1;
    if (truncada) {
      // rolagem interna de modal com max-height: libera temporariamente (só estilo inline, restaurado depois)
      await page.evaluate(() => {
        window.__capRestaurar = [];
        for (const el of document.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) {
            for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
              window.__capRestaurar.push([a, a.getAttribute("style")]);
              const c = getComputedStyle(a);
              a.style.maxHeight = "none";
              if (/(auto|scroll|hidden)/.test(c.overflowY)) a.style.overflowY = "visible";
              if (c.position === "fixed" && a.clientHeight < a.scrollHeight) a.style.height = "auto";
            }
          }
        }
      });
      await page.waitForTimeout(300);
      m = await medirAltura(page);
      const doc = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
      const alvo2 = Math.min(Math.max(doc, vp.height + 200, m.vh + m.extra), page.__maxAltura ?? 15000);
      await page.setViewportSize({ width: vp.width, height: Math.ceil(alvo2) });
      await page.waitForTimeout(350);
      const sobra = await page.evaluate(() => { let x = 0; for (const el of document.querySelectorAll("*")) { const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > innerHeight * 0.35) x = Math.max(x, el.scrollHeight - el.clientHeight); } return x; });
      truncada = sobra > 1;
      restaurarEstilos = true;
    }
  } else if (m.doc > (page.__maxAltura ?? 15000)) truncada = true;
  await page.screenshot({ path: caminho, fullPage: true, animations: "disabled", timeout: 60000 });
  if (restaurarEstilos) await page.evaluate(() => { for (const [el, st] of window.__capRestaurar ?? []) { if (st == null) el.removeAttribute("style"); else el.setAttribute("style", st); } window.__capRestaurar = []; });
  if (interno) { await page.setViewportSize(vp); await page.waitForTimeout(250); }
  return { truncada, rolagem_interna: interno };
}

export async function capturarFalha(page, rel) {
  const base = rel.replace(/\.png$/, "");
  for (const path of [rel, `textos/${base}.txt`, `auditoria/${base}.json`]) mkdirSync(dirname(join(SAIDA, path)), { recursive: true });
  await page.screenshot({ path: join(SAIDA, rel), fullPage: false, animations: "disabled" }).catch(() => {});
  const texto = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  writeFileSync(join(SAIDA, `textos/${base}.txt`), texto);
  const aud = await auditar(page).catch((e) => ({ erro_medicao: e.message }));
  writeFileSync(join(SAIDA, `auditoria/${base}.json`), JSON.stringify(aud, null, 2));
}

const FALHA_TEXTO = /Application error|Unhandled Runtime Error|Internal Server Error|This page could not be found|Build Error|Runtime Error|Cannot read propert/i;

/**
 * Tira o print + txt + auditoria e atualiza o manifest.
 * meta: {pasta, nome, conta, papel, tela, estado, jornada, passo, cliques, componente, antes, espera, permiteLogin, semAuditoria}
 */
export async function tirarPrint(page, meta) {
  const rel = `${meta.pasta}/${meta.nome}.png`;
  const relBase = `${meta.pasta}/${meta.nome}`;
  const abs = (r) => join(SAIDA, r);
  mkdirSync(dirname(abs(rel)), { recursive: true });
  await esperar(page);
  const aparelho = page.__aparelho;
  const url = page.url();
  const caminho = new URL(url).pathname;
  const esperados = [].concat(meta.espera ?? []).map((e) => e instanceof RegExp ? { re: e.source, flags: e.flags } : { texto: norm(e) });
  if (esperados.length) await page.waitForFunction((itens) => {
    const texto = document.body?.innerText ?? "";
    const normal = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    return itens.every((e) => e.re ? new RegExp(e.re, e.flags).test(texto) || new RegExp(e.re, e.flags).test(normal) : normal.includes(e.texto));
  }, esperados, { timeout: 60000 }).catch(() => {});
  const texto = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  // ---- validação ----
  let erro = null;
  if (!meta.permiteLogin && /\/service\/login\/?$/.test(caminho) && !/login/.test(meta.nome)) erro = `caiu no login (${url})`;
  else if (texto.trim().length < 15) erro = "tela branca (sem texto)";
  else if (FALHA_TEXTO.test(texto)) erro = "erro do Next/aplicação na tela: " + (texto.match(FALHA_TEXTO)?.[0] ?? "");
  else {
    const t = norm(texto);
    for (const e of [].concat(meta.espera ?? [])) {
      const ok = e instanceof RegExp ? e.test(texto) || e.test(t) : t.includes(norm(e));
      if (!ok) { erro = `texto esperado ausente: ${e}`; break; }
    }
  }
  if (erro) {
    const f = `falhas/${rel}`;
    await capturarFalha(page, f);
    registrarBloqueio(rel, { tela: meta.tela, passo: (meta.cliques ?? []).join(" > ") || meta.passo || "-", erro, print: f });
    for (const r of [rel, `textos/${relBase}.txt`, `auditoria/${relBase}.json`]) rmSync(abs(r), { force: true });
    removerDoManifest(rel);
    return { ok: false, erro };
  }
  limparBloqueio(rel);
  for (const f of [`falhas/${rel}`, `textos/falhas/${relBase}.txt`, `auditoria/falhas/${relBase}.json`]) rmSync(abs(f), { force: true });
  // ---- print ----
  let dobra = null;
  if (aparelho === "celular") {
    dobra = `${relBase}--dobra.png`;
    await page.screenshot({ path: abs(dobra), fullPage: false, animations: "disabled" });
  }
  const auditPath = process.env.CAPTURA_BASELINE ? join(process.env.CAPTURA_BASELINE, `auditoria/${relBase}.json`) : "";
  const anterior = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, "utf8")) : null;
  // Medir antes de ampliar o viewport para o fullPage.
  const aud = meta.semAuditoria ? { erro_medicao: "Auditoria desativada" } : await auditar(page);
  aud.leis = avaliar(aud, anterior, /membro|app/i.test(meta.papel ?? ""));
  const info = await fullPage(page, abs(rel), !!meta.semExpandir);
  mkdirSync(dirname(abs(`textos/${relBase}.txt`)), { recursive: true });
  mkdirSync(dirname(abs(`auditoria/${relBase}.json`)), { recursive: true });
  writeFileSync(abs(`textos/${relBase}.txt`), texto);

  if (info.truncada) aud.captura_truncada = true;
  writeFileSync(abs(`auditoria/${relBase}.json`), JSON.stringify(aud, null, 1));
  const entrada = {
    arquivo: rel, dobra, aparelho, conta: meta.conta ?? null, papel: meta.papel ?? null, tela: meta.tela, estado: meta.estado ?? null,
    jornada: meta.jornada ?? null, passo: meta.passo ?? null, url, cliques: meta.cliques ?? [], componente: referenciaAtual(meta.componente), componente_original: meta.componente ?? null,
    antes_0210: meta.antes ?? null, erros_console: (aud.erros_console ?? []).map((e) => e.texto), requisicoes_falhas: (aud.requisicoes_com_falha ?? []).length,
    violacoes_axe: aud.axe?.total_violacoes ?? null, rolagem_interna: info.rolagem_interna, truncada: info.truncada, horario: new Date().toISOString(),
  };
  const m = lerManifest(); m[rel] = entrada; gravarManifest(m);
  if (aud.leis.length) registrarBloqueio(rel, { tela: meta.tela, passo: meta.passo ?? "captura", erro: aud.leis.join("; "), print: rel });
  console.log(`  ${aud.leis.length ? "FALHA" : "ok"} ${rel}`);
  return { ok: true, qualidadeOk: aud.leis.length === 0, entrada };
}

/** Registro textual de uma confirmação nativa (window.confirm) que não dá para fotografar. */
export function registrarDialogo(meta, dialogos) {
  const rel = `${meta.pasta}/${meta.nome}.txt`;
  const arq = join(SAIDA, rel);
  mkdirSync(dirname(arq), { recursive: true });
  writeFileSync(arq, dialogos.map((d) => `[${d.tipo}] ${d.mensagem}`).join("\n") + "\n(recusada pela ferramenta: nunca confirma)\n");
  const m = lerManifest();
  m[rel] = { arquivo: rel, tipo: "dialogo_nativo", aparelho: meta.aparelho, conta: meta.conta, papel: meta.papel, tela: meta.tela, estado: meta.estado, cliques: meta.cliques, componente: referenciaAtual(meta.componente), componente_original: meta.componente ?? null, antes_0210: null, mensagem: dialogos.map((d) => d.mensagem), horario: new Date().toISOString() };
  gravarManifest(m);
  console.log(`  ok (diálogo nativo) ${rel}`);
}
