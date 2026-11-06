// Uso: npx tsx scripts/ibge/importar-cep-centros.ts <arquivo.csv> [--local]
//
// Centro de cada CEP a partir do CNEFE 2022 do IBGE (cadastro de endereços
// do Censo, com CEP, latitude e longitude). Baixe o CSV do município no site
// do IBGE (Cadastro Nacional de Endereços para Fins Estatísticos, Censo
// 2022, arquivos por município) e descompacte antes: o arquivo é lido linha
// a linha, então cidades grandes não estouram a memória.
//
// Para cada CEP: média das coordenadas dos endereços e o trecho da rua (direção
// principal dos endereços e metade do comprimento, até 250 m), que espalha as
// pessoas do mesmo CEP perto da rua (G5, migração 0099). Grava em
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

/* somas relativas ao primeiro endereço do CEP (evita perder precisão com
   coordenadas grandes): médias, variâncias e covariância em graus */
type Soma = { municipio: string; lat0: number; lng0: number; lat: number; lng: number; lat2: number; lng2: number; latlng: number; n: number };

const METROS_POR_GRAU = 111320;
const MEIA_MAX_M = 250;

/* trecho da rua: eixo principal dos endereços (maior variância) e metade do
   comprimento ~ 1,6 desvio ao longo dele. Um endereço só vira prédio único (0). */
function trecho(s: Soma): { angulo: number | null; meia: number } {
  if (s.n < 2) return { angulo: null, meia: 0 };
  const mlat = s.lat / s.n, mlng = s.lng / s.n;
  const kx = METROS_POR_GRAU * Math.cos(((s.lat0 + mlat) * Math.PI) / 180), ky = METROS_POR_GRAU;
  const vx = Math.max(0, s.lng2 / s.n - mlng * mlng) * kx * kx;
  const vy = Math.max(0, s.lat2 / s.n - mlat * mlat) * ky * ky;
  const cxy = (s.latlng / s.n - mlat * mlng) * kx * ky;
  const l1 = (vx + vy) / 2 + Math.sqrt(((vx - vy) / 2) ** 2 + cxy ** 2);
  return { angulo: 0.5 * Math.atan2(2 * cxy, vx - vy), meia: Math.min(MEIA_MAX_M, 1.6 * Math.sqrt(l1)) };
}

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
    const s = somas.get(cep) ?? { municipio: (c[col.COD_MUNICIPIO] ?? "").replace(/\D/g, ""), lat0: lat, lng0: lng, lat: 0, lng: 0, lat2: 0, lng2: 0, latlng: 0, n: 0 };
    const dlat = lat - s.lat0, dlng = lng - s.lng0;
    s.lat += dlat; s.lng += dlng; s.lat2 += dlat * dlat; s.lng2 += dlng * dlng; s.latlng += dlat * dlng; s.n++;
    somas.set(cep, s);
  }
  console.log(`${lidas} endereços lidos, ${descartadas} descartados, ${somas.size} CEPs.`);
  return somas;
}

async function main() {
  const somas = await lerCsv(arquivo);
  if (somas.size === 0) throw new Error("Nenhum CEP válido no arquivo.");
  const agora = new Date().toISOString();
  const linhas = [...somas].map(([cep, s]) => {
    const t = trecho(s);
    return {
      cep,
      municipio_ibge: s.municipio,
      latitude: Number((s.lat0 + s.lat / s.n).toFixed(6)),
      longitude: Number((s.lng0 + s.lng / s.n).toFixed(6)),
      eixo_angulo: t.angulo === null ? null : Number(t.angulo.toFixed(4)),
      eixo_meia_m: Number(t.meia.toFixed(1)),
      enderecos: s.n,
      fonte: "ibge:cnefe:2022",
      atualizado_em: agora,
    };
  });
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
