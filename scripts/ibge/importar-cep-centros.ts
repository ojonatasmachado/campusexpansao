// Uso: npx tsx scripts/ibge/importar-cep-centros.ts <arquivo.csv> [--local]
//
// Centro de cada CEP a partir do CNEFE 2022 do IBGE (cadastro de endereços
// do Censo, com CEP, latitude e longitude). Baixe o CSV do município no site
// do IBGE (Cadastro Nacional de Endereços para Fins Estatísticos, Censo
// 2022, arquivos por município) e descompacte antes: o arquivo é lido linha
// a linha, então cidades grandes não estouram a memória.
//
// Para cada CEP: média das coordenadas dos endereços. Grava em
// service.cep_centros e recalcula o ponto de membros, igrejas e células com
// esses CEPs (service.mapa_reprocessar_ceps). Plano: docs/service-v7/mapa/PLANO.md.
//
// Sem --local usa NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const arquivo = process.argv[2];
const local = process.argv.includes("--local");
if (!arquivo || arquivo.startsWith("--")) {
  console.error("Uso: npx tsx scripts/ibge/importar-cep-centros.ts <arquivo.csv> [--local]");
  process.exit(1);
}
const url = local ? LOCAL_URL : process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = local ? LOCAL_SERVICE : process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, ou use --local.");
  process.exit(1);
}
const db = createClient(url, chave, { auth: { persistSession: false } }).schema("service");

type Soma = { municipio: string; lat: number; lng: number; n: number };

/* o CNEFE usa ";" e vírgula decimal em algumas publicações: aceita os dois */
function numero(v: string | undefined): number {
  return Number((v ?? "").trim().replace(",", "."));
}

async function lerCsv(caminho: string): Promise<Map<string, Soma>> {
  const somas = new Map<string, Soma>();
  const linhas = createInterface({ input: createReadStream(caminho, { encoding: "utf8" }), crlfDelay: Infinity });
  let sep = ";";
  let col: Record<string, number> | null = null;
  let lidas = 0;
  let descartadas = 0;
  for await (const bruta of linhas) {
    const linha = bruta.replace(/^\uFEFF/, "");
    if (!linha.trim()) continue;
    if (!col) {
      sep = linha.includes(";") ? ";" : ",";
      const nomes = linha.split(sep).map((c) => c.trim().replace(/^"|"$/g, "").toUpperCase());
      col = Object.fromEntries(nomes.map((n, i) => [n, i]));
      for (const obrigatoria of ["CEP", "LATITUDE", "LONGITUDE", "COD_MUNICIPIO"]) {
        if (col[obrigatoria] === undefined) throw new Error(`Coluna ${obrigatoria} não encontrada. Colunas do arquivo: ${nomes.join(", ")}`);
      }
      continue;
    }
    lidas++;
    const c = linha.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
    const cep = (c[col.CEP] ?? "").replace(/\D/g, "");
    const lat = numero(c[col.LATITUDE]);
    const lng = numero(c[col.LONGITUDE]);
    /* fora do Brasil ou vazio: descarta (o IBGE avisa que há coordenadas imprecisas) */
    if (!/^\d{8}$/.test(cep) || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -34 || lat > 6 || lng < -75 || lng > -28) { descartadas++; continue; }
    const s = somas.get(cep) ?? { municipio: (c[col.COD_MUNICIPIO] ?? "").replace(/\D/g, ""), lat: 0, lng: 0, n: 0 };
    s.lat += lat; s.lng += lng; s.n++;
    somas.set(cep, s);
  }
  console.log(`${lidas} endereços lidos, ${descartadas} descartados, ${somas.size} CEPs.`);
  return somas;
}

async function main() {
  const somas = await lerCsv(arquivo);
  if (somas.size === 0) throw new Error("Nenhum CEP válido no arquivo.");
  const agora = new Date().toISOString();
  const linhas = [...somas].map(([cep, s]) => ({
    cep,
    municipio_ibge: s.municipio,
    latitude: Number((s.lat / s.n).toFixed(6)),
    longitude: Number((s.lng / s.n).toFixed(6)),
    enderecos: s.n,
    fonte: "ibge:cnefe:2022",
    atualizado_em: agora,
  }));
  for (let i = 0; i < linhas.length; i += 1000) {
    const { error } = await db.from("cep_centros").upsert(linhas.slice(i, i + 1000), { onConflict: "cep" });
    if (error) throw new Error(`Falha gravando centros de CEP: ${error.message}`);
  }
  console.log(`${linhas.length} centros de CEP gravados.`);

  let recalculados = 0;
  const ceps = linhas.map((l) => l.cep);
  for (let i = 0; i < ceps.length; i += 2000) {
    const { data, error } = await db.rpc("mapa_reprocessar_ceps", { p_ceps: ceps.slice(i, i + 2000) });
    if (error) throw new Error(`Falha recalculando pontos: ${error.message}`);
    recalculados += Number(data ?? 0);
  }
  console.log(`${recalculados} cadastros (membros, igrejas e células) com ponto recalculado.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
