// Uso: npx tsx scripts/historias.ts            (estado de todas)
//      npx tsx scripts/historias.ts livres     (só as que dá pra pegar agora)
//
// Quadro de histórias do Service (docs/service-v7/PENDENTES.md). A trava de
// quem está fazendo o quê é o branch `historia/<ID>-...` no GitHub: o script
// busca os branches remotos, lê a história de dentro de cada um e mostra o que
// está reservado, o que depende de história não feita e o que esbarra em
// arquivo de outra história reservada. Não altera nada.

import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PASTA = "docs/service-v7/historias";

type Historia = { id: string; titulo: string; tipo: string; status: string; quem: string; desde: string; depende: string[]; trilho: string[] };

function ler(texto: string): Historia | null {
  const fm = texto.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const campo = (k: string) => (fm[1].match(new RegExp(`^${k}:\\s*([^#\\n]*)`, "m"))?.[1] ?? "").trim();
  const depende = campo("depende").replace(/[[\]]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  const secao = texto.split(/^## Arquivos.*$/m)[1]?.split(/^## /m)[0] ?? "";
  const trilho = [...secao.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1].replace(/\*.*$/, "").replace(/\/$/, ""));
  return { id: campo("id"), titulo: campo("titulo"), tipo: campo("tipo"), status: campo("status") || "livre", quem: campo("quem"), desde: campo("desde"), depende, trilho };
}

const sh = (c: string) => execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/* HISTORIAS_SEM_FETCH=1 usa só o que já foi buscado (teste sem rede) */
if (!process.env.HISTORIAS_SEM_FETCH) try { sh("git fetch -q --prune origin"); } catch { console.log("(sem rede: usando o que já foi buscado)"); }

const locais = readdirSync(PASTA).filter((f) => /^[A-Z]\d+.*\.md$/.test(f)).map((f) => ler(readFileSync(join(PASTA, f), "utf8"))).filter((h): h is Historia => !!h);

/* o branch remoto manda: a história reservada é lida de dentro dele */
const branches = sh("git branch -r --list 'origin/historia/*'").split("\n").map((s) => s.trim()).filter(Boolean);
const reservadas = new Map<string, Historia & { branch: string }>();
for (const b of branches) {
  const id = b.replace("origin/historia/", "").split("-")[0];
  const arq = locais.find((h) => h.id === id);
  let h: Historia | null = arq;
  try {
    const nome = sh(`git ls-tree --name-only ${b} ${PASTA}/`).split("\n").find((f) => f.split("/").pop()!.startsWith(`${id}-`));
    if (nome) h = ler(sh(`git show ${b}:${nome}`)) ?? arq;
  } catch { /* branch sem a pasta: usa a cópia local */ }
  if (h) reservadas.set(id, { ...h, status: "reservada", branch: b.replace("origin/", "") });
}

const feita = (id: string) => locais.find((h) => h.id === id)?.status === "feita";
const sobrepoe = (a: string[], b: string[]) => a.filter((x) => b.some((y) => x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`)));

const linhas = locais.filter((h) => h.status !== "feita").map((h) => {
  const r = reservadas.get(h.id);
  if (r) return { h, estado: `RESERVADA · ${r.quem || "?"} · ${r.desde || "?"} · ${r.branch}` };
  if (h.status === "bloqueada") return { h, estado: "BLOQUEADA (ver Notas)" };
  const faltam = h.depende.filter((d) => !feita(d));
  if (faltam.length) return { h, estado: `espera ${faltam.join(", ")}` };
  const choques = [...reservadas.values()].flatMap((r) => sobrepoe(h.trilho, r.trilho).map((f) => `${r.id}: ${f}`));
  if (choques.length) return { h, estado: `esbarra em ${choques.join("; ")}` };
  return { h, estado: "LIVRE" };
});

const so = process.argv[2] === "livres";
for (const { h, estado } of linhas) if (!so || estado === "LIVRE") console.log(`${h.id.padEnd(4)} ${h.tipo.padEnd(11)} ${estado.padEnd(so ? 6 : 34)} ${h.titulo}`);
for (const [id] of reservadas) if (!locais.some((h) => h.id === id)) console.log(`${id.padEnd(4)} branch sem história: ${reservadas.get(id)!.branch}`);
