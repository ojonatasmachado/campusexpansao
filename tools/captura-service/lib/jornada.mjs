// Jornadas passo a passo: um print a cada toque que muda a tela.
// Pasta: jornadas/{código}-{nome}[/{aparelho} nas jornadas de líder, que rodam em 2 aparelhos]/{NN}-{o-que-aconteceu}.png
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAIDA } from "./config.mjs";
import { registrarBloqueio, tirarPrint, limparBloqueio, capturarFalha } from "./print.mjs";

export const pad2 = (n) => String(n).padStart(2, "0");
class Aborta extends Error {}
export async function efeito(page) {
  return page.evaluate(() => JSON.stringify({ url: location.href, texto: document.body.innerText, campos: [...document.querySelectorAll("input,select,textarea")].map((e) => [e.value, e.checked]), estados: [...document.querySelectorAll("[aria-expanded],[aria-selected],[aria-checked],[aria-pressed],[aria-valuenow]")].map((e) => [e.getAttribute("aria-expanded"),e.getAttribute("aria-selected"),e.getAttribute("aria-checked"),e.getAttribute("aria-pressed"),e.getAttribute("aria-valuenow")]), tema: document.documentElement.getAttribute("data-theme"), x: scrollX, y: scrollY }));
}

const ARQ_RES = () => join(SAIDA, ".jornadas.json");
export function lerResultados() { return existsSync(ARQ_RES()) ? JSON.parse(readFileSync(ARQ_RES(), "utf8")) : {}; }
function gravarResultado(chave, v) {
  const r = lerResultados(); r[chave] = v;
  writeFileSync(ARQ_RES(), JSON.stringify(r, null, 1));
  // visão legível
  const linhas = ["# Resultado das jornadas (etapa 2)", "", "| jornada | aparelho | situação | passos | observação |", "|---|---|---|---|---|"];
  for (const [k, x] of Object.entries(r).sort()) linhas.push(`| ${k} | ${x.aparelho} | ${x.situacao} | ${x.passos} | ${x.obs ?? ""} |`);
  writeFileSync(join(SAIDA, "JORNADAS.md"), linhas.join("\n") + "\n");
}

/**
 * Executa uma jornada. `abrir` devolve {ctx, page}. `corpo(j)` chama j.passo(...).
 * j.passo(slug, toque, acao, opts): faz o toque (acao), espera a tela assentar, tira o print.
 *   toque: texto (ou lista) descrevendo o que a pessoa tocou. acao: async (page) => void, ou null para o estado inicial.
 *   opts.espera: textos que devem aparecer. opts.tentativas (padrão 2). opts.opcional: não aborta se falhar.
 */
export async function jornada({ codigo, nome, titulo, ap, conta, papel, abrir, corpo, subpasta = false, inicio = 1, chave = null, aceitarDialogos = false }) {
  const pasta = `jornadas/${codigo}-${nome}${subpasta ? "/" + ap : ""}`;
  mkdirSync(join(SAIDA, pasta), { recursive: true });
  console.log(`\n-- ${codigo} ${titulo} (${ap}) --`);
  let n = inicio, ok = 0, obs = [];
  let ctxPar;
  try { ctxPar = await abrir(); } catch (e) { return fim(`${chave ?? codigo}-${ap}`, ap, "não rodou", 0, `abrir sessão falhou: ${String(e.message).split("\n")[0]}`, codigo, titulo); }
  let { ctx, page } = ctxPar;
  page.__aceitarDialogo = aceitarDialogos;
  const j = {
    get page() { return page; }, ap, async trocar(abrirOutro) { const novo = await abrirOutro(); await ctx.close().catch(() => {}); ({ ctx, page } = novo); page.__aceitarDialogo = aceitarDialogos; }, get n() { return n; }, obs: (t) => obs.push(t),
    async passo(slug, toque, acao, opts = {}) {
      const toques = [].concat(toque ?? []);
      const pastaP = opts.pasta ?? pasta;
      const nomeArq = opts.nome ?? `${pad2(n)}-${slug}`;
      const chaveB = `${pastaP}/${nomeArq}.png`;
      const efeitoAntes = acao ? await efeito(page).catch(() => "") : null;
      const redeAntes = page.__requisicoes ?? 0;
      let falhou = null;
      if (acao) {
        for (let t = 0; t < (opts.tentativas ?? 1); t++) {
          try { falhou = null; await acao(page); break; } catch (e) { falhou = String(e.message ?? e).split("\n")[0].slice(0, 300); await page.waitForTimeout(1200); }
        }
      }
      if (falhou) {
        const f = `falhas/${pastaP}/${nomeArq}.png`;
        await capturarFalha(page, f);
        registrarBloqueio(chaveB, { tela: `${codigo} ${titulo} (${ap})`, passo: `${toques.join(" > ")} (passo ${pad2(n)})`, erro: falhou, print: f });
        if (opts.opcional) { obs.push(`passo ${pad2(n)} ${slug} não existe/falhou: ${falhou}`); return false; }
        throw new Aborta(falhou);
      }
      await page.waitForTimeout(opts.pausa ?? 350);
      if (acao && !opts.observacao && efeitoAntes === await efeito(page).catch(() => "") && redeAntes === (page.__requisicoes ?? 0)) {
        registrarBloqueio(chaveB + "/sem-efeito", { tela: titulo, passo: toques.join(" > "), erro: "Ação não produziu mudança observável na interface ou requisição", print: null });
      } else limparBloqueio(chaveB + "/sem-efeito");
      const r = await tirarPrint(page, {
        pasta: pastaP, nome: nomeArq, conta: `${conta}@teste.local`, papel, tela: `${codigo} ${titulo}`, estado: opts.estado ?? null,
        jornada: `${codigo} ${titulo}`, passo: `${pad2(n)} ${slug.replace(/-/g, " ")}`, cliques: toques.length ? toques : ["(estado inicial)"],
        espera: opts.espera ?? [], semExpandir: opts.semExpandir, permiteLogin: opts.permiteLogin, componente: opts.componente ?? null,
      });
      if (!opts.fora) n++;
      if (!r.ok) { if (opts.opcional) return false; throw new Aborta(r.erro); }
      ok++;
      return true;
    },
  };
  let situacao = "completa";
  try { await corpo(j); } catch (e) {
    if (e instanceof Aborta) { situacao = "incompleta"; obs.push(`parou: ${e.message}`); }
    else { situacao = "incompleta"; obs.push(`erro inesperado: ${String(e.message ?? e).split("\n")[0]}`); registrarBloqueio(`${pasta}/erro`, { tela: `${codigo} ${titulo} (${ap})`, passo: "-", erro: String(e.message ?? e).split("\n")[0], print: null }); }
  } finally { await ctx.close().catch(() => {}); }
  return fim(`${chave ?? codigo}-${ap}`, ap, situacao, ok, obs.join(" | "), codigo, titulo);
}
function fim(chave, ap, situacao, passos, obs, codigo, titulo) {
  console.log(`   => ${chave}: ${situacao}, ${passos} prints${obs ? " · " + obs : ""}`);
  gravarResultado(chave, { aparelho: ap, situacao, passos, obs, codigo, titulo });
  return { situacao, passos };
}

/** Quantos prints já existem na pasta da jornada (para a segunda parte de uma jornada continuar a numeração). */
export function proximoNumero(codigo, nome, ap, subpasta) {
  const d = join(SAIDA, `jornadas/${codigo}-${nome}${subpasta ? "/" + ap : ""}`);
  if (!existsSync(d)) return 1;
  const nums = readdirSync(d).filter((f) => /^\d\d-.*\.png$/.test(f) && !f.endsWith("--dobra.png")).map((f) => Number(f.slice(0, 2)));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}
