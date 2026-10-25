import { getTexto } from "../../../../service/lib/internacional/servidor";
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { ordemMaisPerto, trajetoReto, type Lnglat } from "../../../../service/modules/mapa/rota-calculo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Trajeto da rota do mapa da igreja (PLANO.md 2.7). Recebe só coordenadas
   de paradas, nunca nome de pessoa. Com ORS_API_KEY usa o OpenRouteService
   (gratuito: 2.000 trajetos e 500 "melhor ordem" por dia); sem a chave, ou
   se ele falhar, devolve a conta aproximada (vizinho mais próximo, linha reta).
   Exige login: a chave não pode virar proxy aberto. */

const PERFIL = { pe: "foot-walking", carro: "driving-car" } as const;

/* quem tem o mapa desta igreja; e um limite simples por pessoa (a cota do ORS é da igreja inteira) */
const JANELA_MS = 60_000;
const LIMITE = 30;
const usos = new Map<string, number[]>();
async function podeUsar(org: unknown): Promise<"ok" | "login" | "acesso" | "limite"> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "login";
  if (typeof org !== "string" || !/^[0-9a-f-]{36}$/i.test(org)) return "acesso";
  const { data: acesso } = await supabase.schema("service").rpc("mapa_acesso", { p_org: org });
  if (!(acesso as { pode: boolean }[] | null)?.[0]?.pode) return "acesso";
  const agora = Date.now();
  const recentes = (usos.get(data.user.id) ?? []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  usos.set(data.user.id, recentes);
  if (usos.size > 5000) usos.clear();
  return recentes.length > LIMITE ? "limite" : "ok";
}

export async function POST(request: Request) {
  const traduzirUi = await getTexto(request);
  let body: { org?: unknown; paradas?: unknown; como?: unknown; otimizar?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: traduzirUi("Envie dados válidos.") }, { status: 400 }); }
  const pode = await podeUsar(body.org);
  if (pode === "login") return NextResponse.json({ error: traduzirUi("Entre de novo para traçar a rota.") }, { status: 401 });
  if (pode === "acesso") return NextResponse.json({ error: traduzirUi("Sem acesso ao mapa.") }, { status: 403 });
  if (pode === "limite") return NextResponse.json({ error: traduzirUi("Muitas rotas em pouco tempo. Espere um minuto.") }, { status: 429 });
  const como = body.como === "carro" ? "carro" : "pe";
  const paradas = (Array.isArray(body.paradas) ? body.paradas : [])
    .filter((p): p is Lnglat => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n)) && Math.abs(p[1]) <= 90 && Math.abs(p[0]) <= 180)
    .slice(0, 50);
  if (paradas.length < 2) return NextResponse.json({ error: traduzirUi("A rota precisa de pelo menos duas paradas.") }, { status: 400 });

  let ordem = body.otimizar ? ordemMaisPerto(paradas) : paradas.map((_, i) => i);
  const chave = process.env.ORS_API_KEY;
  if (chave) {
    try {
      if (body.otimizar && paradas.length >= 3) {
        const r = await fetch("https://api.openrouteservice.org/optimization", {
          method: "POST", headers: { Authorization: chave, "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ jobs: paradas.slice(1).map((p, i) => ({ id: i + 1, location: p })), vehicles: [{ id: 1, profile: PERFIL[como], start: paradas[0] }] }),
        });
        if (r.ok) {
          const j = await r.json() as { routes?: { steps: { type: string; id?: number }[] }[] };
          const passos = j.routes?.[0]?.steps.filter((s) => s.type === "job").map((s) => s.id as number) ?? [];
          if (passos.length === paradas.length - 1) ordem = [0, ...passos];
        }
      }
      const r = await fetch(`https://api.openrouteservice.org/v2/directions/${PERFIL[como]}/geojson`, {
        method: "POST", headers: { Authorization: chave, "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ coordinates: ordem.map((i) => paradas[i]) }),
      });
      if (r.ok) {
        const j = await r.json() as { features?: { geometry: GeoJSON.LineString; properties: { summary: { distance: number; duration: number } } }[] };
        const f = j.features?.[0];
        if (f) return NextResponse.json({ ordem, trajeto: f.geometry, distancia_km: Math.round(f.properties.summary.distance / 100) / 10, duracao_min: Math.max(1, Math.round(f.properties.summary.duration / 60)), aproximado: false });
      }
    } catch { /* cai na conta aproximada */ }
  }
  return NextResponse.json({ ordem, ...trajetoReto(ordem.map((i) => paradas[i]), como) });
}
