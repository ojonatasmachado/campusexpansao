import type { Map as MlMap, ExpressionSpecification } from "maplibre-gl";
import type { CorMapa } from "./estilo";

/* Camadas da tela principal do mapa (G7, mapa/PLANO.md §10). As camadas se
   somam: cada uma liga e desliga sozinha, e as que cobrem o mapa (concentração e
   presença) têm transparência. Os marcadores são as imagens de marcadores.ts
   (registradas antes, `mp-<tipo>`). Ordem de baixo para cima: regiões, áreas,
   recorte do líder, raios, concentração, pessoas, lugares, grupos, igrejas. */

export type ChaveCamada = "pessoas" | "calor" | "igrejas" | "grupos" | "presenca" | "raios";

/* ids de camada do MapLibre por camada do painel */
export const IDS: Record<ChaveCamada | "areas" | "lugares", string[]> = {
  pessoas: ["mp-pessoa", "mp-pessoa-sel"],
  calor: ["mp-calor"],
  igrejas: ["mp-igrejas"],
  grupos: ["mp-grupos"],
  presenca: ["mp-regioes-fill", "mp-regioes-linha", "mp-regioes-sel"],
  raios: ["mp-raios"],
  areas: ["mp-areas-fill", "mp-areas-linha"],
  lugares: ["mp-lugares"],
};

/* camadas que respondem ao toque, da mais alta para a mais baixa: o toque
   abre o balão do primeiro item encontrado */
export const TOCAVEIS = ["mp-igrejas", "mp-grupos", "mp-lugares", "mp-pessoa", "mp-areas-fill", "mp-regioes-fill"];

/* opacidade cheia de cada camada que tem transparência */
export const OPACIDADE = { calor: 0.8, presenca: 0.85 } as const;
export const opacidade = (cheia: number, transparencia: number) => Math.round(cheia * (1 - transparencia / 100) * 100) / 100;

const vazio = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
const fonte = (map: MlMap, id: string) => map.addSource(id, { type: "geojson", data: vazio() });

export function montarCamadas(map: MlMap, c: Record<CorMapa, string>) {
  ["mp-regioes", "mp-areas", "mp-mascara", "mp-raios", "mp-calor", "mp-lugares", "mp-locais", "mp-pessoas", "mp-eu"].forEach((id) => fonte(map, id));

  const tom: ExpressionSpecification = ["match", ["get", "tom"], 1, c["tom-1"], 2, c["tom-2"], 3, c["tom-3"], 4, c["tom-4"], c["tom-5"]];
  map.addLayer({ id: "mp-regioes-fill", type: "fill", source: "mp-regioes", paint: { "fill-color": tom, "fill-opacity": OPACIDADE.presenca } });
  map.addLayer({ id: "mp-regioes-linha", type: "line", source: "mp-regioes", paint: { "line-color": c.papel, "line-width": 1.5 } });
  map.addLayer({ id: "mp-regioes-sel", type: "line", source: "mp-regioes", filter: ["==", ["get", "codigo"], ""], paint: { "line-color": c.tinta, "line-width": 3 } });

  map.addLayer({ id: "mp-areas-fill", type: "fill", source: "mp-areas", paint: { "fill-color": ["get", "hex"], "fill-opacity": 0.14 } });
  map.addLayer({ id: "mp-areas-linha", type: "line", source: "mp-areas", paint: { "line-color": ["get", "hex"], "line-width": 2.5 } });
  map.addLayer({ id: "mp-mascara", type: "fill", source: "mp-mascara", paint: { "fill-color": c.tinta, "fill-opacity": 0.45 } });
  map.addLayer({ id: "mp-raios", type: "line", source: "mp-raios", paint: { "line-color": c.tinta, "line-width": 1.2, "line-dasharray": [3, 3], "line-opacity": 0.6 } });

  map.addLayer({ id: "mp-calor", type: "heatmap", source: "mp-calor", paint: {
    "heatmap-radius": 28, "heatmap-opacity": OPACIDADE.calor,
    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.3, c.sand, 0.6, c.amber, 1, c.rust],
  } });

  /* pessoas: cada uma é um ponto, nunca um grupo com número (G5). Afastando,
     o ponto encolhe até uns 2 px; de perto, 6,5 px (anônimo um pouco menor) */
  map.addLayer({ id: "mp-pessoa", type: "circle", source: "mp-pessoas", paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1, 12, 2.5, 14, ["case", ["get", "anonimo"], 4, 5], 16, ["case", ["get", "anonimo"], 4.5, 6.5]],
    "circle-color": ["match", ["get", "situacao"], "novo", c.novo, c.membro],
    "circle-stroke-color": ["match", ["get", "situacao"], "novo", c.membro, c.papel],
    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, 0, 12, 0.8, 14, 1.5, 16, 2], "circle-opacity": ["case", ["get", "anonimo"], 0.7, 1],
  } });
  /* pessoa com o balão aberto: anel escuro em volta */
  map.addLayer({ id: "mp-pessoa-sel", type: "circle", source: "mp-pessoas", filter: ["==", ["get", "i"], -1], paint: { "circle-radius": 12, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": c.tinta, "circle-stroke-width": 2.5 } });

  const marcador = { "icon-allow-overlap": true, "icon-ignore-placement": true } as const;
  map.addLayer({ id: "mp-lugares", type: "symbol", source: "mp-lugares", layout: {
    ...marcador, "icon-size": 0.8,
    "icon-image": ["case", ["==", ["get", "grupo"], "igreja"], "mp-lugar-igreja", "mp-lugar-regiao"],
  }, paint: { "icon-opacity": ["case", ["boolean", ["get", "oculto"], false], 0.4, 1] } });
  map.addLayer({ id: "mp-grupos", type: "symbol", source: "mp-locais", filter: ["!", ["get", "igreja"]], layout: {
    ...marcador, "icon-size": 0.72, "icon-image": "mp-celula",
  } });
  map.addLayer({ id: "mp-igrejas", type: "symbol", source: "mp-locais", filter: ["get", "igreja"], layout: {
    ...marcador, "icon-size": 0.62, "icon-anchor": "bottom",
    "icon-image": ["case", ["get", "sede"], "mp-sede", "mp-congregacao"],
    "text-field": ["case", ["get", "sede"], "Sede", ""], "text-font": ["Noto Sans Regular"], "text-size": 12,
    "text-anchor": "top", "text-offset": [0, 0.4], "text-allow-overlap": true,
  }, paint: { "text-color": c.tinta, "text-halo-color": c.papel, "text-halo-width": 1.5 } });
  montarMinhaPosicao(map, c);
}

/* minha posição (celular, G16): só no aparelho; por cima de tudo */
export function montarMinhaPosicao(map: MlMap, c: Record<CorMapa, string>) {
  map.addLayer({ id: "mp-eu-halo", type: "circle", source: "mp-eu", paint: { "circle-radius": 16, "circle-color": c.tinta, "circle-opacity": 0.12 } });
  map.addLayer({ id: "mp-eu", type: "circle", source: "mp-eu", paint: { "circle-radius": 7, "circle-color": c.tinta, "circle-stroke-color": c.papel, "circle-stroke-width": 3 } });
}

/* liga e desliga um conjunto de camadas do MapLibre */
export function mostrar(map: MlMap, ids: string[], on: boolean) {
  ids.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none"));
}

/* grupo selecionado fica escuro com halo (marcador "celula-sel") */
export function marcarGrupo(map: MlMap, id: string | null) {
  if (!map.getLayer("mp-grupos")) return;
  map.setLayoutProperty("mp-grupos", "icon-image", id ? ["case", ["==", ["get", "id"], id], "mp-celula-sel", "mp-celula"] : "mp-celula");
}
