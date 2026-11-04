import type { Map as MlMap } from "maplibre-gl";
import type { CorMapa } from "./estilo";

/* Marcadores do mapa (G6, mapa/PLANO.md §10, prancha P6). Desenhados em SVG e
   registrados como imagens do MapLibre (`mp-<tipo>`), para as camadas usarem com
   "icon-image". Cores só da paleta fixa do mapa (coresDoMapa, lidas do CSS): o
   âmbar é reservado à igreja; célula clara com casinha; selecionado escuro com
   halo; lugar da igreja escuro com bandeirinha; lugar da região claro com borda. */

export type Marcador = "sede" | "congregacao" | "celula" | "celula-sel" | "lugar-igreja" | "lugar-regiao";

export const MARCADORES: Marcador[] = ["sede", "congregacao", "celula", "celula-sel", "lugar-igreja", "lugar-regiao"];

/* âncora do ícone no MapLibre: balões apontam para baixo; o resto é centrado */
export const ANCORA: Record<Marcador, "bottom" | "center"> = {
  sede: "bottom", congregacao: "bottom", celula: "center", "celula-sel": "center", "lugar-igreja": "center", "lugar-regiao": "center",
};

const SILHUETA = '<path d="M12 2.5v4M10.2 4.2h3.6M8.5 10 12 6.5l3.5 3.5M5 21v-8l3.5-3h7l3.5 3v8ZM10.5 21v-3.5a1.5 1.5 0 0 1 3 0V21"/>';
const CASINHA = '<path d="M5 13l7-6 7 6v6H5Z"/>';
const BANDEIRA = '<path d="M8 20V4M8 4h9l-2 4 2 4H8"/>';

function balao(c: Record<CorMapa, string>, escala: number) {
  const w = 72 * escala, h = 82 * escala;
  return {
    w, h,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-36 -70 72 82">`
      + `<ellipse cx="0" cy="8" rx="10" ry="3" fill="${c.tinta}" fill-opacity=".2"/>`
      + `<path d="M-24 -66h48a10 10 0 0 1 10 10v28a10 10 0 0 1-10 10h-16l-8 12-8-12h-16a10 10 0 0 1-10-10v-28a10 10 0 0 1 10-10z" fill="${c.amber}" stroke="${c.papel}" stroke-width="3"/>`
      + `<g transform="translate(-16 -60) scale(1.33)" fill="none" stroke="${c.tinta}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SILHUETA}</g>`
      + `</svg>`,
  };
}

function quadrado(c: Record<CorMapa, string>, escuro: boolean) {
  const fundo = escuro ? c.tinta : c.papel;
  const traco = escuro ? c.papel : c.tinta;
  const halo = escuro ? `<circle cx="28" cy="28" r="26" fill="${c.tinta}" fill-opacity=".14"/>` : "";
  return {
    w: 56, h: 56,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">${halo}`
      + `<rect x="11" y="11" width="34" height="34" rx="10" fill="${fundo}" stroke="${traco}" stroke-width="2.4"/>`
      + `<g transform="translate(16 15)" fill="none" stroke="${traco}" stroke-width="1.9" stroke-linejoin="round">${CASINHA}</g>`
      + `</svg>`,
  };
}

export function svgMarcador(tipo: Marcador, c: Record<CorMapa, string>): { svg: string; w: number; h: number } {
  switch (tipo) {
    case "sede": return balao(c, 1);
    case "congregacao": return balao(c, 0.8);
    case "celula": return quadrado(c, false);
    case "celula-sel": return quadrado(c, true);
    case "lugar-igreja":
      return {
        w: 40, h: 40,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="${c.tinta}" stroke="${c.papel}" stroke-width="2.5"/>`
          + `<g transform="translate(8 8)" fill="none" stroke="${c.papel}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${BANDEIRA}</g></svg>`,
      };
    case "lugar-regiao":
      return {
        w: 28, h: 28,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="9" fill="${c.papel}" stroke="${c.poi}" stroke-width="2"/><circle cx="14" cy="14" r="2.5" fill="${c.poi}"/></svg>`,
      };
  }
}

/* Registra os marcadores no mapa (uma vez por estilo carregado). pixelRatio 2:
   o SVG é desenhado no dobro do tamanho para ficar nítido em tela retina.
   Um marcador que falhar não derruba os outros; devolve os que não carregaram.
   Depois de trocar o estilo (setStyle), chamar de novo. */
export async function registrarMarcadores(map: MlMap, cores: Record<CorMapa, string>): Promise<Marcador[]> {
  const falhas: Marcador[] = [];
  await Promise.all(MARCADORES.map(async (tipo) => {
    const id = `mp-${tipo}`;
    if (map.hasImage(id)) return;
    try {
      const { svg, w, h } = svgMarcador(tipo, cores);
      const img = new Image(w * 2, h * 2);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(`width="${w}" height="${h}"`, `width="${w * 2}" height="${h * 2}"`))}`;
      await img.decode();
      if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 });
    } catch {
      falhas.push(tipo);
    }
  }));
  return falhas;
}
