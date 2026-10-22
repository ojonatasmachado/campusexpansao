import type { supabaseAdmin } from "./supabase";

/* Pontos de interesse do OpenStreetMap para o mapa da igreja (PLANO.md 2.6
   e 2.10). Uma vez por mês por município com mapa em uso, num job: a tela
   só lê do nosso banco (service.map_osm_cache). Uma categoria por rodada
   para não pesar no Overpass (servidor público e gratuito). */

type Db = ReturnType<ReturnType<typeof supabaseAdmin>["schema"]>;
/* servidor principal e reserva: os públicos às vezes ficam lotados */
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const MES_MS = 30 * 24 * 3600 * 1000;

const CONSULTAS: Record<string, string> = {
  igrejas: 'nwr["amenity"="place_of_worship"]["religion"="christian"]',
  onibus: 'node["highway"="bus_stop"]',
  escolas: 'nwr["amenity"="school"];nwr["leisure"~"^(park|pitch|playground)$"]["name"]',
  saude: 'nwr["amenity"~"^(clinic|hospital|doctors|social_facility|community_centre)$"]',
};

type Elemento = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

export async function atualizarPontosOsm(db: Db): Promise<{ atualizados: number }> {
  const { data: municipios, error } = await db.rpc("mapa_municipios_ativos");
  if (error) throw error;
  const { data: cache } = await db.from("map_osm_cache").select("municipio_ibge, categoria, atualizado_em");
  const recente = new Set((cache ?? []).filter((c) => Date.now() - new Date(c.atualizado_em as string).getTime() < MES_MS).map((c) => `${c.municipio_ibge}|${c.categoria}`));
  for (const m of (municipios ?? []) as { municipio_ibge: string; oeste: number; sul: number; leste: number; norte: number }[]) {
    for (const [categoria, filtro] of Object.entries(CONSULTAS)) {
      if (recente.has(`${m.municipio_ibge}|${categoria}`)) continue;
      const caixa = `(${m.sul},${m.oeste},${m.norte},${m.leste})`;
      const consulta = `[out:json][timeout:25];(${filtro.split(";").map((f) => `${f}${caixa};`).join("")});out center 3000;`;
      let j: { elements?: Elemento[] } | null = null;
      for (const servidor of OVERPASS) {
        try {
          const r = await fetch(servidor, { method: "POST", body: new URLSearchParams({ data: consulta }), headers: { "User-Agent": "CE.X Service (mapa da igreja)", Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
          if (r.ok) { j = await r.json(); break; }
        } catch { /* tenta o próximo */ }
      }
      /* todos lotados: tenta na próxima rodada do cron */
      if (!j) return { atualizados: 0 };
      const dados = (j.elements ?? []).map((e) => ({
        osm_id: `${e.type}/${e.id}`,
        nome: e.tags?.name ?? "",
        lat: e.lat ?? e.center?.lat,
        lng: e.lon ?? e.center?.lon,
      })).filter((d) => typeof d.lat === "number" && typeof d.lng === "number" && (categoria === "onibus" || d.nome));
      const { error: e2 } = await db.from("map_osm_cache").upsert({ municipio_ibge: m.municipio_ibge, categoria, dados, atualizado_em: new Date().toISOString() });
      if (e2) throw e2;
      /* uma consulta por rodada: o cron roda de hora em hora */
      return { atualizados: 1 };
    }
  }
  return { atualizados: 0 };
}
