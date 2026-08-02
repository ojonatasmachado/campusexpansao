// Script pontual: extrai "problema" + "objetivo espiritual" dos textos de
// apresentacao ja convertidos em /tmp/cex_cat2_extract e /tmp/cex_lote2_extract,
// pra montar o campo como_usar ("Sobre a serie") sem re-digitar manualmente.
import fs from "node:fs";

const HEADINGS = {
  pt: { problema: "O problema que esta série enfrenta", problemaAlt: "O problema que a série enfrenta", objetivo: "Objetivo espiritual", stop: "Como a série avança" },
  en: { problema: "The problem this series addresses", objetivo: "Spiritual goal", stop: "How the series progresses" },
  es: { problema: "El problema que esta serie aborda", objetivo: "Objetivo espiritual", stop: "Cómo avanza la serie" },
};

function extract(txtPath, lang) {
  const lines = fs.readFileSync(txtPath, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
  const h = HEADINGS[lang];
  const idxProblema = lines.findIndex((l) => l === h.problema || l === h.problemaAlt);
  const idxObjetivo = lines.findIndex((l) => l === h.objetivo);
  const idxStop = lines.findIndex((l) => l === h.stop);
  if (idxProblema < 0 || idxObjetivo < 0 || idxStop < 0) {
    throw new Error(`Headings nao encontrados em ${txtPath} (problema=${idxProblema}, objetivo=${idxObjetivo}, stop=${idxStop})`);
  }
  const problema = lines.slice(idxProblema + 1, idxObjetivo).join(" ");
  const objetivo = lines.slice(idxObjetivo + 1, idxStop).join(" ");
  return { problema, objetivo };
}

const [txtPath, lang] = process.argv.slice(2);
if (!txtPath) throw new Error("Uso: node scripts/extract-problema-objetivo.mjs <arquivo.txt> <pt|en|es>");
console.log(JSON.stringify(extract(txtPath, lang)));
