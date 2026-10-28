// Uso: npx tsx scripts/check-graficos-contraste.ts
//
// Valida as cores dos gráficos do Service (I10) em todas as combinações de
// cor da igreja × família de neutros × modo. Importa theme.ts para usar os
// mesmos ajustes (adaptAccent, themeVars) que o app aplica em runtime.
//
// Regras específicas para gráficos (diferentes de UI geral):
// - Marca gráfica (barra, linha, ponto, arco): ≥ 1.5:1 contra superfície
//   (visível como dado; não é texto nem ícone de ação).
// - Texto na cor da igreja (--olive): ≥ 4.5:1 contra superfícies.
// - Estados (--ok, --warn, --danger) como MARCA: ≥ 1.5:1 contra superfície.
// - Estados como TEXTO/SELO: ≥ 4.5:1 contra superfície (já garantido por
//   theme.ts via STATUS_COLORS + deriveAccentVars).
// - Proximidade igreja ↔ estado: se contraste < 2:1, estado exige rótulo,
//   ícone ou Selo (codificação secundária). As peças atuais já usam
//   aria-label + rótulo direto + Selo com texto.
// - Cinza "resto": derivado de neutros da família, nunca hex fixo.
//
// Nota: falhas de texto sobre -dim são do tema base (theme.ts), não dos
// gráficos. Gráficos usam cor sólida sobre superfície, nunca texto sobre dim.
import { contrastRatio } from "../app/service/lib/color";
import {
  ACCENT_PRESETS,
  NEUTRAL_FAMILIES,
  adaptAccent,
  accentText,
  themeVars,
  type NeutralFamily,
} from "../app/service/lib/theme";

const PRANCHA_ACCENTS = [
  { hex: "#2F6BFF", label: "Prancha azul" },
  { hex: "#1F6B4F", label: "Prancha verde" },
  { hex: "#4B2A7B", label: "Prancha roxo" },
  { hex: "#8A6A12", label: "Prancha ouro" },
];
const ALL_ACCENTS = [...ACCENT_PRESETS, ...PRANCHA_ACCENTS];

function superficies(fam: NeutralFamily): string[] {
  return [fam.tokens.graphite, fam.tokens.ink];
}

let failed = 0;
let warnings = 0;
const warnSet = new Set<string>(); // deduplicar avisos iguais

console.log("=== Gráficos I10: contraste por combinação ===\n");

for (const fam of NEUTRAL_FAMILIES) {
  const brand = { neutralDark: fam.id, neutralLight: fam.id };
  const v = themeVars(brand, fam.mode);
  const sups = superficies(fam);
  console.log(`── ${fam.mode} · ${fam.id} (${fam.label}) ──`);

  // 1. Estados como MARCA gráfica (≥ 1.5:1 contra superfície)
  for (const st of ["ok", "warn", "danger"] as const) {
    const cor = v[`--${st}`];
    for (const s of sups) {
      const r = contrastRatio(cor, s);
      if (r < 1.5) {
        console.log(`  FALHA marca --${st} vs ${s}: ${r.toFixed(2)} < 1.5`);
        failed++;
      }
    }
  }

  // 2. Cada cor de igreja
  for (const ac of ALL_ACCENTS) {
    const fill = adaptAccent(ac.hex, fam.tokens.graphite, fam.mode, 3);
    const text = accentText(ac.hex, fam.tokens, fam.mode, 4.5);

    // Marca gráfica da igreja (≥ 1.5:1)
    for (const s of sups) {
      const r = contrastRatio(fill, s);
      if (r < 1.5) {
        console.log(`  FALHA ${ac.label} (marca) vs ${s}: ${r.toFixed(2)} < 1.5`);
        failed++;
      }
    }

    // Texto na cor da igreja (≥ 4.5:1)
    for (const s of sups) {
      const r = contrastRatio(text, s);
      if (r < 4.5) {
        console.log(`  FALHA ${ac.label} (texto) vs ${s}: ${r.toFixed(2)} < 4.5`);
        failed++;
      }
    }

    // Proximidade igreja ↔ estado
    for (const st of ["ok", "warn"] as const) {
      const stCor = v[`--${st}`];
      const r = contrastRatio(fill, stCor);
      if (r < 2) {
        const key = `${ac.label}≈${st}`;
        if (!warnSet.has(key)) {
          warnSet.add(key);
          console.log(`  WARN  ${ac.label} ≈ --${st}: contraste ${r.toFixed(2)} < 2 → estado precisa de rótulo/ícone/Selo`);
          warnings++;
        }
      }
    }
  }

  // 3. Cinza "resto" (neutro derivado)
  const neutroGrafico = v["--muted"];
  for (const s of sups) {
    const r = contrastRatio(neutroGrafico, s);
    if (r < 1.5) {
      console.log(`  FALHA neutro gráfico (--muted) vs ${s}: ${r.toFixed(2)} < 1.5`);
      failed++;
    }
  }

  console.log();
}

console.log(`\nResumo: ${failed} falha(s), ${warnings} aviso(s) únicos.`);
if (warnings > 0) {
  console.log("→ Avisos = combinações onde igreja ≈ estado. As peças já usam");
  console.log("  codificação secundária: aria-label, rótulo direto e Selo com texto.");
}
if (failed) {
  console.error(`\n${failed} regra(s) de contraste falharam.`);
  process.exit(1);
} else {
  console.log("\n✓ Todas as combinações passam nas regras de gráficos.");
}