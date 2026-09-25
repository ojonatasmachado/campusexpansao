// Uso: npx tsx scripts/check-theme-contrast.ts
//
// Valida todas as famílias de neutros do tema do Service
// (app/service/lib/theme.ts) contra as réguas de contraste e mostra como
// cada cor de destaque pronta fica em cada família. Rodar sempre que uma
// família ou cor nova for adicionada.

import { contrastRatio } from "../app/service/lib/color";
import { ACCENT_PRESETS, CONTRAST_RULES, NEUTRAL_FAMILIES, adaptAccent, validateFamily } from "../app/service/lib/theme";

let failed = 0;
for (const fam of NEUTRAL_FAMILIES) {
  const fails = validateFamily(fam);
  const ratios = CONTRAST_RULES.map((r) => contrastRatio(fam.tokens[r.a], fam.tokens[r.b]).toFixed(2)).join(" ");
  console.log(`${fails.length ? "FALHA" : "ok   "} ${fam.mode.padEnd(5)} ${fam.id.padEnd(7)} ${ratios}`);
  for (const f of fails) console.log(`        ${f.rule}: ${f.ratio.toFixed(2)} < ${f.min}`);
  failed += fails.length;
}

console.log("\nCores de destaque ajustadas (contraste com o card, mínimo 3):");
for (const fam of NEUTRAL_FAMILIES) {
  const row = ACCENT_PRESETS.map((p) => {
    const c = adaptAccent(p.hex, fam.tokens.graphite, fam.mode);
    return `${p.label}=${contrastRatio(c, fam.tokens.graphite).toFixed(1)}${c !== p.hex.toUpperCase() ? "*" : ""}`;
  }).join(" ");
  console.log(`${fam.id.padEnd(7)} ${row}`);
}
console.log("(* = cor ajustada automaticamente pra ler bem nesse fundo)");

if (failed) {
  console.error(`\n${failed} regra(s) de contraste falharam.`);
  process.exit(1);
}
