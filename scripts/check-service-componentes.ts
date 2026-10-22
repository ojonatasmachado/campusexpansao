// Uso: npx tsx scripts/check-service-componentes.ts
//
// Lei 17 (AGENTS.md §13): peça de interface já centralizada não pode voltar a ser
// escrita à mão numa tela. Cada regra abaixo é uma peça da BIBLIOTECA.md que já
// tem componente; o componente em si (pasta permitida) fica de fora. O workflow
// .github/workflows/service.yml roda este script. Peça nova centralizada ganha
// uma regra aqui.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = join(__dirname, "..");

function arquivos(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...arquivos(p));
    else if (/\.tsx?$/.test(nome)) out.push(p);
  }
  return out;
}

type Regra = { peca: string; usar: string; permitido: string; re: RegExp };

const REGRAS: Regra[] = [
  {
    peca: "Botão",
    usar: "Botao / botaoClasse() de app/service/ui/Botao.tsx",
    permitido: "app/service/ui/",
    /* classe de botão escrita à mão: "btn btn-...", `btn ...`, "m6-btn ..." */
    re: /["'`](?:btn(?:\s|["'`$])|m6-btn(?:\s|["'`$]))/g,
  },
];

const PASTAS = ["app/service", "app/[slug]"].map((p) => join(RAIZ, p));
let falhas = 0;
for (const regra of REGRAS) {
  for (const arq of PASTAS.flatMap(arquivos)) {
    const rel = relative(RAIZ, arq);
    if (rel.startsWith(regra.permitido)) continue;
    const src = readFileSync(arq, "utf8");
    for (const m of src.matchAll(regra.re)) {
      const linha = src.slice(0, m.index).split("\n").length;
      console.error(`${rel}:${linha}  ${regra.peca} escrito à mão. Use ${regra.usar}.`);
      falhas++;
    }
  }
}

if (falhas) {
  console.error(`\n${falhas} uso(s) fora da biblioteca. Índice das peças: docs/service-v7/BIBLIOTECA.md`);
  process.exit(1);
}
console.log("Componentes da biblioteca: ok");
