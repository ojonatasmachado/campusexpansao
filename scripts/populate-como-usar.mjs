// Script pontual: monta "Sobre a série" (como_usar) pra todos os materiais
// (problema + objetivo + resultado + uso, em pt/en/es) e grava:
//   - materiais.como_usar (pt) via supabaseAdmin
//   - guarda tambem um JSON com as 3 linguas em /tmp, pra aplicar depois na
//     tabela material_translations assim que a coluna existir (migracao 0042).
import fs from "node:fs";
import { MATERIALS as M1 } from "./build-catalogo-2.mjs";
import { MATERIALS as M2 } from "./build-catalogo-lote2.mjs";

const CAT2_DIR = "/tmp/cex_cat2_extract";
const LOTE2_DIR = "/tmp/cex_lote2_extract";

const HEADINGS = {
  pt: {
    problema: ["o problema que esta série enfrenta", "o problema que a série enfrenta"],
    objetivo: ["objetivo espiritual"],
    stop: ["como a série avança"],
  },
  en: {
    problema: ["the problem this series addresses"],
    objetivo: ["spiritual goal"],
    stop: ["how the series progresses"],
  },
  es: {
    problema: ["el problema que esta serie aborda", "el problema que aborda esta serie"],
    objetivo: ["objetivo espiritual"],
    stop: ["cómo avanza la serie", "como avanza la serie"],
  },
};

function findHeading(lines, variants) {
  return lines.findIndex((l) => variants.includes(l.toLowerCase()));
}

function extractProblemaObjetivo(txtPath, lang) {
  const lines = fs.readFileSync(txtPath, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
  const h = HEADINGS[lang];
  const idxProblema = findHeading(lines, h.problema);
  const idxObjetivo = findHeading(lines, h.objetivo);
  const idxStop = findHeading(lines, h.stop);
  if (idxProblema < 0 || idxObjetivo < 0 || idxStop < 0) {
    throw new Error(`Headings nao encontrados em ${txtPath} (problema=${idxProblema}, objetivo=${idxObjetivo}, stop=${idxStop})`);
  }
  return {
    problema: lines.slice(idxProblema + 1, idxObjetivo).join(" "),
    objetivo: lines.slice(idxObjetivo + 1, idxStop).join(" "),
  };
}

function findPresentation(dir, code, langDir) {
  const files = fs.readdirSync(dir);
  const re = new RegExp(`CEX_2026_${code}_.*__${langDir}__00_(Apresentacao_da_serie|Series_Presentation|Presentacion_de_la_serie)__CEX_2026_${code}_.*\\.txt$`);
  const match = files.find((f) => re.test(f));
  if (!match) throw new Error(`Apresentacao nao encontrada: dir=${dir} code=${code} lang=${langDir}`);
  return `${dir}/${match}`;
}

function comoUsarFor(material, dir) {
  const out = {};
  for (const [lang, langDir] of [["pt", "01_Portugues"], ["en", "02_English"], ["es", "03_Espanol"]]) {
    const path = findPresentation(dir, material.code, langDir);
    const { problema, objetivo } = extractProblemaObjetivo(path, lang);
    const langData = material[lang];
    out[lang] = [problema, objetivo, langData.resultado, langData.uso].join("\n\n");
  }
  return out;
}

const results = {};

for (const m of M1) {
  results[m.slug] = comoUsarFor(m, CAT2_DIR);
}
for (const m of M2) {
  results[m.slug] = comoUsarFor(m, LOTE2_DIR);
}

fs.writeFileSync("/tmp/como_usar_all.json", JSON.stringify(results, null, 2));
console.log(`Gerado /tmp/como_usar_all.json com ${Object.keys(results).length} materiais.`);
