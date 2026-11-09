import type { Map as MlMap, MapGeoJSONFeature } from "maplibre-gl";
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode, type GeoJSONStoreFeatures, type SnapToCustom, type TerraDrawMouseEvent } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

/* Desenho da área (G10, prancha P5), por cima do terra-draw.
   - quadrado e círculo nascem no meio da tela, já selecionados;
   - quadrado: cantos redimensionam (Shift mantém a proporção), arrastar move,
     ponto do meio vira canto novo e a forma passa a ser livre;
   - círculo: a borda muda o raio, arrastar move;
   - livre: toque marca os cantos, toque no primeiro fecha; depois edita
     como o quadrado que virou livre;
   - ímã: o canto gruda na rua mais perto (Alt solta).
   Juntar bairros não passa por aqui (é clique em camada do mapa). */

export type Forma = "quadrado" | "circulo" | "bairros" | "livre";
type Hex = `#${string}`;

export type OpcoesDesenho = {
  cor: string;
  tinta: string;
  papel: string;
  celular: boolean;
  /* geometria mudou (durante o arraste também): números ao vivo */
  aoMudar: (g: GeoJSON.Polygon | null) => void;
  /* um gesto terminou (soltou o canto, fechou a forma): vira passo do Desfazer */
  aoTerminar: (forma: Forma, g: GeoJSON.Polygon) => void;
  /* nome da rua em que o canto grudou, ou null */
  aoGrudar: (rua: string | null) => void;
};

export type Desenho = {
  comecar: (f: Forma) => void;
  restaurar: (f: Forma, g: GeoJSON.Polygon | null) => void;
  geometria: () => GeoJSON.Polygon | null;
  ima: (ligado: boolean) => void;
  cor: (c: string) => void;
  destruir: () => void;
};

const MODOS_AREA = ["quadrado", "circulo", "livre"] as const;
const RAIO_IMA = 18;

/* terra-draw só aceita #rrggbb: o canvas converte qualquer cor do CSS */
function hex(c: string): Hex {
  const s = c.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s as Hex;
  let v = s;
  try { const g = document.createElement("canvas").getContext("2d"); if (g) { g.fillStyle = s; v = String(g.fillStyle); } } catch { /* sem canvas */ }
  if (/^#[0-9a-f]{6}$/i.test(v)) return v as Hex;
  const m = v.match(/\d+(\.\d+)?/g) ?? ["128", "128", "128"];
  return (`#${m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, "0")).join("")}`) as Hex;
}

const arred = (n: number) => Math.round(n * 1e7) / 1e7;
const anel = (pts: [number, number][]): GeoJSON.Polygon => {
  const r = pts.map(([x, y]) => [arred(x), arred(y)] as [number, number]);
  return { type: "Polygon", coordinates: [[...r, r[0]]] };
};

/* ponto mais perto num segmento (em pixels) */
function pertoNoSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  const x = ax + t * dx, y = ay + t * dy;
  return { x, y, d: Math.hypot(px - x, py - y) };
}

export function criarDesenho(mapa: MlMap, o: OpcoesDesenho): Desenho {
  let imaLigado = true;
  let cor = hex(o.cor);
  const tinta = hex(o.tinta), papel = hex(o.papel);
  let atual: string | null = null;
  let forma: Forma = "quadrado";

  /* ímã: a rua mais perto do dedo, nas camadas de rua do fundo do mapa */
  const ima: SnapToCustom = (ev: TerraDrawMouseEvent) => {
    if (!imaLigado || ev.heldKeys.includes("Alt")) { o.aoGrudar(null); return undefined; }
    const { containerX: x, containerY: y } = ev;
    let ruas: MapGeoJSONFeature[] = [];
    try {
      ruas = mapa.queryRenderedFeatures([[x - RAIO_IMA, y - RAIO_IMA], [x + RAIO_IMA, y + RAIO_IMA]])
        .filter((f) => (f.sourceLayer === "transportation" || f.sourceLayer === "transportation_name") && /LineString/.test(f.geometry.type));
    } catch { ruas = []; }
    type Perto = { x: number; y: number; d: number; nome: string | null };
    let melhor = null as Perto | null;
    for (const f of ruas) {
      const nome = typeof f.properties?.name === "string" ? (f.properties.name as string) : null;
      const linhas = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [];
      for (const l of linhas) {
        for (let i = 1; i < l.length; i++) {
          const a = mapa.project(l[i - 1] as [number, number]), b = mapa.project(l[i] as [number, number]);
          const p = pertoNoSegmento(x, y, a.x, a.y, b.x, b.y);
          if (p.d <= RAIO_IMA && (!melhor || p.d < melhor.d)) melhor = { ...p, nome };
        }
      }
    }
    if (!melhor) { o.aoGrudar(null); return undefined; }
    /* o nome da rua mora na camada de rótulos: vale o primeiro com nome por perto */
    let nomeRua = melhor.nome;
    if (!nomeRua) {
      try {
        const r = 60, { x: mx, y: my } = melhor;
        nomeRua = mapa.queryRenderedFeatures([[mx - r, my - r], [mx + r, my + r]])
          .filter((f) => f.sourceLayer === "transportation_name")
          .map((f) => f.properties?.name).find((n): n is string => typeof n === "string") ?? null;
      } catch { nomeRua = null; }
    }
    o.aoGrudar(nomeRua ?? "");
    const ll = mapa.unproject([melhor.x, melhor.y]);
    return [arred(ll.lng), arred(ll.lat)];
  };

  const estiloPoligono = () => ({
    fillColor: cor, fillOpacity: 0.18, outlineColor: cor, outlineWidth: 2.5,
    closingPointColor: papel, closingPointOutlineColor: tinta, closingPointWidth: 7, closingPointOutlineWidth: 2,
    snappingPointColor: tinta, snappingPointOutlineColor: papel, snappingPointWidth: 6, snappingPointOutlineWidth: 2,
    coordinatePointColor: papel, coordinatePointOutlineColor: tinta, coordinatePointWidth: 5, coordinatePointOutlineWidth: 2,
  });
  const soUmaAlca = (f: GeoJSONStoreFeatures) => forma === "circulo" && f.properties?.selectionPointFeatureId === atual && f.properties?.index !== 0;
  const estiloSelecao = () => ({
    selectedPolygonColor: cor, selectedPolygonFillOpacity: 0.22, selectedPolygonOutlineColor: cor, selectedPolygonOutlineWidth: 2.5,
    selectionPointColor: papel, selectionPointOutlineColor: tinta,
    /* no círculo, uma alça só (à direita); as outras seguem pegáveis, sem desenho */
    selectionPointWidth: (f: GeoJSONStoreFeatures) => (soUmaAlca(f) ? 0 : o.celular ? 9 : 7),
    selectionPointOutlineWidth: (f: GeoJSONStoreFeatures) => (soUmaAlca(f) ? 0 : 2),
    midPointColor: papel, midPointOutlineColor: cor, midPointWidth: o.celular ? 7 : 5, midPointOutlineWidth: 2,
  });
  /* alvo de toque de 44 px no celular (raio de 22) */
  const alcance = o.celular ? 22 : 12;
  const flagsLivre = { feature: { draggable: true, coordinates: { draggable: true, midpoints: { draggable: true }, deletable: true, snappable: { toCustom: ima } } } };
  const flagsQuadrado = (fixo: boolean) => ({ feature: { draggable: true, coordinates: { resizable: (fixo ? "opposite-fixed" : "opposite") as "opposite" | "opposite-fixed", midpoints: { draggable: true }, snappable: { toCustom: ima } } } });
  const flagsCirculo = { feature: { draggable: true, coordinates: { resizable: "center-fixed" as const } } };

  const draw = new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map: mapa, prefixId: "ca-td" }),
    modes: [
      new TerraDrawSelectMode({
        pointerDistance: alcance,
        allowManualDeselection: false,
        keyEvents: { deselect: null, delete: null, rotate: null, scale: null },
        flags: { quadrado: flagsQuadrado(false), circulo: flagsCirculo, livre: flagsLivre },
        styles: estiloSelecao(),
      }),
      new TerraDrawPolygonMode({ modeName: "quadrado", styles: estiloPoligono() }),
      new TerraDrawPolygonMode({ modeName: "circulo", styles: estiloPoligono() }),
      new TerraDrawPolygonMode({ modeName: "livre", pointerDistance: alcance, snapping: { toCustom: ima }, styles: estiloPoligono() }),
    ],
  });
  draw.start();

  const geo = (): GeoJSON.Polygon | null => {
    if (!atual) return null;
    const f = draw.getSnapshotFeature(atual);
    return f && f.geometry.type === "Polygon" ? (f.geometry as GeoJSON.Polygon) : null;
  };

  const colocar = (modo: (typeof MODOS_AREA)[number], g: GeoJSON.Polygon) => {
    draw.setMode("select");
    if (atual) { try { draw.removeFeatures([atual]); } catch { /* já saiu */ } }
    const id = crypto.randomUUID();
    const r = draw.addFeatures([{ id, type: "Feature", geometry: g, properties: { mode: modo } } as GeoJSONStoreFeatures]);
    if (!r[0]?.valid) { atual = null; o.aoMudar(null); return; }
    atual = id;
    draw.selectFeature(id);
    o.aoMudar(g);
  };

  /* forma inicial no meio da tela, com um terço da menor medida */
  const noMeio = (f: "quadrado" | "circulo"): GeoJSON.Polygon => {
    const c = mapa.getContainer();
    const w = c.clientWidth, h = c.clientHeight;
    /* no celular a folha cobre a metade de baixo: a forma nasce no meio do que sobra */
    const cx = w / 2 + (o.celular ? 0 : 180), cy = o.celular ? h * 0.42 : h / 2;
    const r = o.celular ? Math.min(w * 0.28, h * 0.12) : Math.min(w - 360, h) * 0.22;
    const un = (x: number, y: number) => { const ll = mapa.unproject([x, y]); return [ll.lng, ll.lat] as [number, number]; };
    if (f === "quadrado") return anel([un(cx - r, cy - r), un(cx + r, cy - r), un(cx + r, cy + r), un(cx - r, cy + r)]);
    const pts: [number, number][] = [];
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push(un(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
    return anel(pts);
  };

  draw.on("change", (ids) => {
    if (atual && ids.includes(atual)) o.aoMudar(geo());
  });
  draw.on("finish", (id, ctx) => {
    const f = draw.getSnapshotFeature(id);
    if (!f || f.geometry.type !== "Polygon") return;
    const g = f.geometry as GeoJSON.Polygon;
    o.aoGrudar(null);
    /* trocar a feição no meio de um gesto quebra o terra-draw: troca no fim */
    if (ctx.mode === "livre" && ctx.action === "draw") {
      atual = String(id);
      depois(() => { const v = draw.getSnapshotFeature(id); if (v) { colocar("livre", v.geometry as GeoJSON.Polygon); o.aoTerminar("livre", v.geometry as GeoJSON.Polygon); } });
      return;
    }
    /* ponto do meio no quadrado: deixa de ser quadrado quando o dedo solta
       (num clique o terra-draw avisa depois do pointerup: troca já) */
    if (forma === "quadrado" && ctx.action === "insertMidpoint") {
      forma = "livre";
      const virar = () => depois(() => { const v = geo(); if (v) { colocar("livre", v); o.aoTerminar("livre", v); } });
      if (pressionado) aoSoltar = virar; else virar();
      return;
    }
    o.aoTerminar(forma, g);
  });

  /* gesto em curso: a troca de feição espera o dedo soltar */
  let vivo = true;
  let pressionado = false;
  let aoSoltar: (() => void) | null = null;
  const depois = (fn: () => void) => setTimeout(() => { if (vivo) fn(); }, 0);
  const desceu = () => { pressionado = true; };
  const subiu = () => { pressionado = false; const f = aoSoltar; aoSoltar = null; f?.(); };
  const caixaMapa = mapa.getContainer();
  caixaMapa.addEventListener("pointerdown", desceu, true);
  window.addEventListener("pointerup", subiu, true);
  window.addEventListener("pointercancel", subiu, true);

  /* Shift mantém a proporção do quadrado */
  const tecla = (e: KeyboardEvent) => {
    if (e.key !== "Shift") return;
    try { draw.updateModeOptions<typeof TerraDrawSelectMode>("select", { flags: { quadrado: flagsQuadrado(e.type === "keydown"), circulo: flagsCirculo, livre: flagsLivre } }); } catch { /* fora do modo */ }
  };
  window.addEventListener("keydown", tecla);
  window.addEventListener("keyup", tecla);

  return {
    comecar(f) {
      forma = f;
      if (atual) { try { draw.removeFeatures([atual]); } catch { /* já saiu */ } atual = null; }
      o.aoGrudar(null);
      if (f === "bairros") { draw.setMode("static"); o.aoMudar(null); return; }
      if (f === "livre") { draw.setMode("livre"); o.aoMudar(null); return; }
      const g = noMeio(f);
      colocar(f, g);
      o.aoTerminar(f, g);
    },
    restaurar(f, g) {
      forma = f;
      if (f === "bairros") { if (atual) { try { draw.removeFeatures([atual]); } catch { /* já saiu */ } atual = null; } draw.setMode("static"); return; }
      if (!g) { if (atual) { try { draw.removeFeatures([atual]); } catch { /* já saiu */ } atual = null; } draw.setMode(f === "livre" ? "livre" : "select"); o.aoMudar(null); return; }
      colocar(f === "livre" ? "livre" : f, g);
    },
    geometria: geo,
    ima(l) { imaLigado = l; if (!l) o.aoGrudar(null); },
    cor(c) {
      cor = hex(c);
      draw.updateModeOptions<typeof TerraDrawSelectMode>("select", { styles: estiloSelecao() });
      for (const m of MODOS_AREA) draw.updateModeOptions<typeof TerraDrawPolygonMode>(m, { styles: estiloPoligono() });
    },
    destruir() {
      vivo = false;
      aoSoltar = null;
      caixaMapa.removeEventListener("pointerdown", desceu, true);
      window.removeEventListener("pointerup", subiu, true);
      window.removeEventListener("pointercancel", subiu, true);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("keyup", tecla);
      try { draw.stop(); } catch { /* mapa já saiu */ }
    },
  };
}
