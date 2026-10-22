// Uso: npx tsx scripts/ibge/importar-malha.ts <setores.geojson> <agregados.csv> <codigo_municipio> [--local]
//
// Setores censitários do Censo 2022 (IBGE) de UM município, com a população
// de cada setor, e os bairros montados a partir deles (PLANO.md 2.5).
//
// 1. Baixe no site do IBGE a malha de setores 2022 da UF (shapefile) e o
//    arquivo "Agregados por setores censitários, básico" (CSV).
// 2. Recorte o município e converta para GeoJSON simplificado, por exemplo:
//      npx mapshaper SP_setores_CD2022.shp -filter "CD_MUN === '3550308'" \
//        -simplify 10% keep-shapes -proj wgs84 -o format=geojson setores.geojson
// 3. Rode este script. Ele grava service.ibge_setores e service.ibge_bairros.
//
// Colunas usadas (nomes do IBGE 2022; mude com --setor=, --bairro=, --nome-bairro=,
// --area=, --populacao=, --domicilios= se o arquivo vier diferente):
//   GeoJSON: CD_SETOR, CD_BAIRRO, NM_BAIRRO, AREA_KM2
//   CSV:     CD_SETOR, v0001 (moradores), v0002 (domicílios)
//
// Sem --local usa NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.

import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string, d: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const [arqSetores, arqAgregados, municipio] = pos;
if (!arqSetores || !arqAgregados || !/^\d{7}$/.test(municipio ?? "")) {
  console.error("Uso: npx tsx scripts/ibge/importar-malha.ts <setores.geojson> <agregados.csv> <codigo_municipio_7_digitos> [--local]");
  process.exit(1);
}
const local = args.includes("--local");
const url = local ? LOCAL_URL : process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = local ? LOCAL_SERVICE : process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) { console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, ou use --local."); process.exit(1); }
const db = createClient(url, chave, { auth: { persistSession: false } }).schema("service");

const COL = {
  setor: opt("setor", "CD_SETOR"), bairro: opt("bairro", "CD_BAIRRO"), nomeBairro: opt("nome-bairro", "NM_BAIRRO"),
  area: opt("area", "AREA_KM2"), populacao: opt("populacao", "v0001"), domicilios: opt("domicilios", "v0002"),
};

type Geo = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Feicao = { properties: Record<string, unknown>; geometry: Geo | null };

/* GeoJSON → EWKT (MULTIPOLYGON), que o PostGIS aceita direto na coluna */
function ewkt(g: Geo): string {
  const anel = (a: number[][]) => `(${a.map(([x, y]) => `${x} ${y}`).join(",")})`;
  const poli = (p: number[][][]) => `(${p.map(anel).join(",")})`;
  const polis = g.type === "Polygon" ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][]);
  return `SRID=4326;MULTIPOLYGON(${polis.map(poli).join(",")})`;
}

async function lerAgregados(): Promise<Map<string, { pop: number; dom: number | null }>> {
  const mapa = new Map<string, { pop: number; dom: number | null }>();
  const linhas = createInterface({ input: createReadStream(arqAgregados, { encoding: "latin1" }), crlfDelay: Infinity });
  let col: Record<string, number> | null = null;
  let sep = ";";
  for await (const bruta of linhas) {
    if (!bruta.trim()) continue;
    if (!col) {
      sep = bruta.includes(";") ? ";" : ",";
      const nomes = bruta.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
      col = Object.fromEntries(nomes.map((n, i) => [n.toUpperCase(), i]));
      if (col[COL.setor.toUpperCase()] === undefined || col[COL.populacao.toUpperCase()] === undefined) throw new Error(`CSV sem ${COL.setor} ou ${COL.populacao}. Colunas: ${nomes.slice(0, 15).join(", ")}...`);
      continue;
    }
    const c = bruta.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
    const setor = (c[col[COL.setor.toUpperCase()]] ?? "").replace(/\D/g, "");
    if (!setor.startsWith(municipio)) continue;
    /* o IBGE marca dado sigiloso com "X": vira 0 (a população segue publicada na maioria) */
    const num = (v?: string) => { const n = Number((v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
    mapa.set(setor, { pop: num(c[col[COL.populacao.toUpperCase()]]) ?? 0, dom: col[COL.domicilios.toUpperCase()] !== undefined ? num(c[col[COL.domicilios.toUpperCase()]]) : null });
  }
  return mapa;
}

async function main() {
  const geo = JSON.parse(readFileSync(arqSetores, "utf8")) as { features: Feicao[] };
  const agregados = await lerAgregados();
  const nomes: Record<string, string> = {};
  const linhas = [];
  let semPop = 0;
  for (const f of geo.features) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;
    const p = f.properties;
    const setor = String(p[COL.setor] ?? "").replace(/\D/g, "");
    if (!setor.startsWith(municipio)) continue;
    const bairro = p[COL.bairro] ? String(p[COL.bairro]) : null;
    if (bairro && p[COL.nomeBairro]) nomes[bairro] = String(p[COL.nomeBairro]);
    const ag = agregados.get(setor);
    if (!ag) semPop++;
    const area = Number(String(p[COL.area] ?? "").replace(",", "."));
    linhas.push({
      codigo: setor, municipio_ibge: municipio, bairro_codigo: bairro,
      moradores: Math.round(ag?.pop ?? 0), domicilios: ag?.dom ?? null,
      area_km2: Number.isFinite(area) && area > 0 ? area : 0.01,
      geom: ewkt(f.geometry), fonte: "ibge:censo:2022", ano: 2022,
    });
  }
  if (!linhas.length) throw new Error(`Nenhum setor do município ${municipio} no GeoJSON.`);
  await db.from("ibge_setores").delete().eq("municipio_ibge", municipio);
  for (let i = 0; i < linhas.length; i += 300) {
    const { error } = await db.from("ibge_setores").insert(linhas.slice(i, i + 300));
    if (error) throw new Error(`Falha gravando setores: ${error.message}`);
  }
  console.log(`${linhas.length} setores gravados (${semPop} sem população no CSV).`);
  const { data, error } = await db.rpc("mapa_montar_bairros", { p_municipio: municipio, p_nomes: nomes });
  if (error) throw new Error(`Falha montando bairros: ${error.message}`);
  console.log(Number(data) > 0 ? `${data} bairros montados.` : "O município não tem bairros na malha do IBGE: o mapa usa setores e as áreas da igreja.");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
