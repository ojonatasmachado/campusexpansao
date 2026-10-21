import type { Map as MlMap } from "maplibre-gl";

/* Fundo do mapa: OpenFreeMap (gratuito, sem chave, sem limite). Plano B:
   NEXT_PUBLIC_MAPA_ESTILO aponta para outro estilo (ex.: PMTiles próprio),
   sem mudar nenhuma tela. PLANO.md 2.2 e 2.8. */
export const ESTILO_URL = process.env.NEXT_PUBLIC_MAPA_ESTILO || "https://tiles.openfreemap.org/styles/positron";

export type CorMapa =
  | "fundo" | "agua" | "verde" | "tinta" | "papel"
  | "membro" | "visitante" | "novo" | "afastado" | "cluster"
  | "falta" | "forte" | "media" | "alerta" | "rota" | "poi"
  | "sand" | "wheat" | "amber" | "clay" | "terra" | "rust" | "cocoa" | "olive";

/* as cores dos dados moram no CSS (.mapa-root, service-app.css): aqui só lemos */
export function coresDoMapa(el: Element): Record<CorMapa, string> {
  const cs = getComputedStyle(el);
  const nomes: CorMapa[] = ["fundo", "agua", "verde", "tinta", "papel", "membro", "visitante", "novo", "afastado", "cluster", "falta", "forte", "media", "alerta", "rota", "poi", "sand", "wheat", "amber", "clay", "terra", "rust", "cocoa", "olive"];
  return Object.fromEntries(nomes.map((n) => [n, cs.getPropertyValue(`--mapa-${n}`).trim() || "gray"])) as Record<CorMapa, string>;
}

/* tons quentes no estilo claro: água e parques sem azul, fundo creme */
export function aquecerEstilo(map: MlMap, cores: Record<CorMapa, string>) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", cores.fundo);
      else if (layer.type === "fill" && /water|ocean|lake|river/.test(id)) map.setPaintProperty(layer.id, "fill-color", cores.agua);
      else if (layer.type === "line" && /water|river|stream|canal/.test(id)) map.setPaintProperty(layer.id, "line-color", cores.agua);
      else if (layer.type === "fill" && /park|wood|grass|forest|landcover|green/.test(id)) map.setPaintProperty(layer.id, "fill-color", cores.verde);
    } catch { /* camada sem a propriedade: segue */ }
  }
}

/* prédios em relevo ao inclinar (o "3D" da barra) */
export function ligarPredios3D(map: MlMap, cores: Record<CorMapa, string>) {
  if (map.getLayer("mapa-predios-3d")) return;
  const fonte = Object.entries(map.getStyle().sources ?? {}).find(([, s]) => s.type === "vector")?.[0];
  if (!fonte) return;
  map.addLayer({
    id: "mapa-predios-3d", type: "fill-extrusion", source: fonte, "source-layer": "building", minzoom: 14,
    paint: { "fill-extrusion-color": cores.media, "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-opacity": 0.7 },
  });
}
