// Uso: npx tsx scripts/check-service-lei12.ts            (confere)
//      npx tsx scripts/check-service-lei12.ts --gravar   (grava a base atual)
//
// Service v7 5.4 · parte da lei 12 que dá para conferir sem banco e sem
// navegador, a cada versão (o workflow .github/workflows/service.yml roda
// este script). Cada regra conta ocorrências e falha só quando o número
// SOBE em relação à base gravada em scripts/lei12-base.json: o que já existia
// fica registrado, o que piora trava. O resto da lei 12 (alvo abaixo de 24px,
// contraste medido na tela, rolagem lateral, erro de console, botão sem ação)
// precisa do app rodando: fica na captura (tools/captura-service, no Mac).

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { MODULOS } from "../app/service/modules/registry";

const RAIZ = join(__dirname, "..");
const BASE = join(__dirname, "lei12-base.json");

function arquivos(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...arquivos(p, ext));
    else if (ext.test(nome)) out.push(p);
  }
  return out;
}

const TSX = arquivos(join(RAIZ, "app/service"), /\.(tsx|ts)$/);
const CSS = ["service.css", "service-v2.css", "service-v3.css", "service-v4.css", "service-v5.css", "service-v6.css"].map((f) => join(RAIZ, "evolucoes/service_app", f));

/* texto de código sem comentários (o que vale é o que aparece na tela) */
function semComentarios(src: string): string {
  /* troca o comentário por espaços e quebras: as linhas continuam no lugar */
  return src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

type Achado = { arquivo: string; linha: number; trecho: string };
function procurar(lista: string[], re: RegExp, filtro?: (m: RegExpExecArray, src: string) => boolean): Achado[] {
  const out: Achado[] = [];
  for (const arq of lista) {
    const src = semComentarios(readFileSync(arq, "utf8"));
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = g.exec(src))) {
      if (filtro && !filtro(m, src)) continue;
      out.push({ arquivo: relative(RAIZ, arq), linha: src.slice(0, m.index).split("\n").length, trecho: m[0].slice(0, 80) });
    }
  }
  return out;
}

/* folhas de impressão do QR (papel branco, fora do app) ficam de fora da regra de cor */
const IMPRESSAO = /CheckIn\.tsx|AulaCheckin\.tsx|KidsCheckin\.tsx/;
/* escolha de cor (a própria cor é o conteúdo) e as contas do tema */
const COR_PERMITIDA = /lib\/theme\.ts|lib\/color\.ts|ThemePicker\.tsx|AccentField\.tsx|IdentidadeFields\.tsx|PublicPageEditor\.tsx|configuracao\/Assistente\.tsx|EventoShare\.tsx|ImageCropper\.tsx/;

const regras: Record<string, () => Achado[]> = {
  /* lei 8 e §8 do AGENTS: sem travessão, sem losango */
  "travessao-ou-losango": () => procurar(TSX, /[—–◆◇]/),
  /* §8: sem emoji (faixas principais) */
  /* figuras (🔍, ⭐...); sinais tipográficos como ✓ e ✕ não contam */
  emoji: () => procurar(TSX, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}\u{2B06}\u{2705}\u{274C}\u{2728}]/u),
  /* AGENTS §2 (Service): aviso com avisar(), nunca window.alert */
  "window-alert": () => procurar(TSX, /\b(window\.)?alert\(/),
  /* AGENTS §2 (Service): plural() e nunca "vaga(s)" */
  "plural-com-parenteses": () => procurar(TSX, /["'`>][^"'`<>\n]*?[a-zà-ú]\(s\)/i),
  /* lei 8: nada abaixo de 12px no painel, nem meio pixel (CSS e estilo inline) */
  "fonte-abaixo-de-12": () => [
    ...procurar(CSS, /font-size\s*:\s*(\d+(?:\.\d+)?)px/, (m) => Number(m[1]) < 12),
    ...procurar(TSX.filter((f) => !IMPRESSAO.test(f)), /fontSize\s*:\s*(\d+(?:\.\d+)?)\b/, (m) => Number(m[1]) < 12),
  ],
  "fonte-meio-pixel": () => [
    ...procurar(CSS, /font-size\s*:\s*\d+\.\d+px/),
    ...procurar(TSX.filter((f) => !IMPRESSAO.test(f)), /fontSize\s*:\s*\d+\.\d+\b/),
  ],
  /* AGENTS §2 (Service): cor só por variável */
  "hex-fixo-no-codigo": () => procurar(TSX.filter((f) => !IMPRESSAO.test(f) && !COR_PERMITIDA.test(f)), /["'`]#[0-9a-fA-F]{3,8}\b/),
  /* lei 6: tela do painel sem entrada (nem no menu, nem como rota de módulo) */
  "rota-sem-entrada": () => {
    const src = readFileSync(join(RAIZ, "app/service/ServiceExactApp.tsx"), "utf8");
    const bloco = src.match(/const ROUTES = \{([\s\S]*?)\n\};/)?.[1] ?? "";
    const rotas = [...bloco.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    const comEntrada = new Set(MODULOS.flatMap((m) => [...(m.painel?.menu ?? []).map((i) => i.rota), ...(m.painel?.rotas ?? []).map((r) => r.rota)]));
    return rotas.filter((r) => !comEntrada.has(r)).map((r) => ({ arquivo: "app/service/ServiceExactApp.tsx", linha: 0, trecho: `ROUTES.${r}` }));
  },
};

const atual: Record<string, number> = {};
const achados: Record<string, Achado[]> = {};
for (const [nome, fn] of Object.entries(regras)) {
  achados[nome] = fn();
  atual[nome] = achados[nome].length;
}

if (process.argv.includes("--gravar")) {
  writeFileSync(BASE, `${JSON.stringify(atual, null, 2)}\n`);
  console.log("Base gravada em scripts/lei12-base.json:", atual);
  process.exit(0);
}

let base: Record<string, number> = {};
try { base = JSON.parse(readFileSync(BASE, "utf8")); } catch { /* sem base: tudo tem de ser zero */ }
let falhou = 0;
for (const nome of Object.keys(regras)) {
  const antes = base[nome] ?? 0;
  const agora = atual[nome];
  const piorou = agora > antes;
  console.log(`${piorou ? "FALHA" : "ok   "} ${nome.padEnd(24)} ${agora}${antes ? ` (base ${antes})` : ""}`);
  if (piorou) {
    falhou++;
    for (const a of achados[nome].slice(0, 20)) console.log(`        ${a.arquivo}:${a.linha}  ${a.trecho}`);
  }
}
if (falhou) {
  console.log(`\nRegras que pioraram: ${falhou}. Corrija ou, se for exceção justificada, regrave a base com --gravar e explique no commit.`);
  process.exit(1);
}
console.log("\nLei 12 (parte estática): nada piorou.");
