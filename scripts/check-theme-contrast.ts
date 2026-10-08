// Uso: npx tsx scripts/check-theme-contrast.ts
//
// Valida todas as famílias de neutros do tema do Service
// (app/service/lib/theme.ts) contra as réguas de contraste e mostra como
// cada cor de destaque pronta fica em cada família. Rodar sempre que uma
// família ou cor nova for adicionada.

import { contrastRatio, mix } from "../app/service/lib/color";
import { ACCENT_PRESETS, CONTRAST_RULES, NEUTRAL_FAMILIES, accentText, themeVars, validateFamily } from "../app/service/lib/theme";

let failed = 0;
for (const fam of NEUTRAL_FAMILIES) {
  const fails = validateFamily(fam);
  const ratios = CONTRAST_RULES.map((r) => contrastRatio(fam.tokens[r.a], fam.tokens[r.b]).toFixed(2)).join(" ");
  console.log(`${fails.length ? "FALHA" : "ok   "} ${fam.mode.padEnd(5)} ${fam.id.padEnd(7)} ${ratios}`);
  for (const f of fails) console.log(`        ${f.rule}: ${f.ratio.toFixed(2)} < ${f.min}`);
  failed += fails.length;
}

console.log("\nCores de destaque ajustadas (pior contraste entre fundo, card e card elevado, mínimo 4,5):");
const superficies = (fam: (typeof NEUTRAL_FAMILIES)[number]) => [fam.tokens.graphite, fam.tokens.ink, fam.tokens.card];
for (const fam of NEUTRAL_FAMILIES) {
  const row = ACCENT_PRESETS.map((p) => {
    const c = accentText(p.hex, fam.tokens, fam.mode);
    const pior = Math.min(...superficies(fam).map((s) => contrastRatio(c, s)));
    if (pior < 4.5) { failed++; console.log(`        ${p.label}: ${pior.toFixed(2)} < 4.5`); }
    return `${p.label}=${pior.toFixed(1)}${c !== p.hex.toUpperCase() ? "*" : ""}`;
  }).join(" ");
  console.log(`${fam.id.padEnd(7)} ${row}`);
}
console.log("(* = cor ajustada automaticamente pra ler bem nesse fundo)");

console.log("\nEstados (texto sobre a própria faixa -dim, em fundo, card e card elevado, mínimo 4,5):");
for (const fam of NEUTRAL_FAMILIES) {
  const v = themeVars({ neutralDark: fam.id, neutralLight: fam.id }, fam.mode);
  const a = fam.mode === "dark" ? 0.14 : 0.1;
  const row = ["ok", "warn", "danger"].map((k) => {
    const pior = Math.min(...superficies(fam).map((s) => contrastRatio(v[`--${k}`], mix(s, v[`--${k}`], a))));
    if (pior < 4.5) { failed++; console.log(`        ${k}: ${pior.toFixed(2)} < 4.5`); }
    return `${k}=${pior.toFixed(1)}`;
  });
  const sobre = contrastRatio(v["--danger-ink"], v["--danger"]);
  if (sobre < 4.5) { failed++; console.log(`        texto no botão de perigo: ${sobre.toFixed(2)} < 4.5`); }
  console.log(`${fam.id.padEnd(7)} ${row.join(" ")} perigo-cheio=${sobre.toFixed(1)}`);
}

if (failed) {
  console.error(`\n${failed} regra(s) de contraste falharam.`);
  process.exit(1);
}
