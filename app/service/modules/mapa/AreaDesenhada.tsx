"use client";

import { useEffect, useRef, useState } from "react";
import type { MapMouseEvent } from "maplibre-gl";
import { Icon } from "../../lib/icons";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { criarDesenho, type Desenho, type Forma } from "./desenho";

import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Interruptor } from "../../ui/Interruptor";
import { Segmentado } from "../../ui/Segmentado";

/* Área desenhada no mapa (G10, usada no Criar área e na Emergência, G14):
   formas, bairros por toque, ímã, histórico do Desfazer e a barra de cima.
   Quem usa só lê a geometria (geo ou bairros) e pinta com a própria cor. */

type Passo = { forma: Forma; geo: GeoJSON.Polygon | null; bairros: string[] };

const FORMAS: { f: Forma; rotulo: string; icone: "quadrado" | "circulo" | "bairros" | "livre" }[] = [
  { f: "quadrado", rotulo: "Quadrado", icone: "quadrado" },
  { f: "circulo", rotulo: "Círculo", icone: "circulo" },
  { f: "bairros", rotulo: "Juntar bairros", icone: "bairros" },
  { f: "livre", rotulo: "Livre", icone: "livre" },
];
const DICAS: Record<Forma, string> = {
  quadrado: "Arraste os cantos para mudar o tamanho. Puxe os pontos do meio para seguir as ruas.",
  circulo: "Arraste a borda para mudar o raio. Puxe pelo meio para mover.",
  bairros: "Toque nos bairros para juntar. Toque de novo para tirar.",
  livre: "Toque para marcar os cantos. Toque no primeiro para fechar.",
};

export type AreaDesenhada = {
  forma: Forma;
  trocar: (f: Forma) => void;
  bairros: string[];
  geo: GeoJSON.Polygon | null;
  podeDesfazer: boolean;
  desfazer: () => void;
  ima: boolean;
  alternarIma: () => void;
  temIma: boolean;
  temBairros: boolean;
  dica: string;
  /* tem área para salvar? */
  pronta: boolean;
  /* a área como geometria (bairros viram um MultiPolygon com os contornos) */
  geometria: () => GeoJSON.Geometry | null;
};

export function useAreaDesenhada(ctx: ContextoMapa, { prefixo, corHex, inicial = "quadrado", bairrosIniciais = [], temBairros }: { prefixo: string; corHex: string; inicial?: Forma; bairrosIniciais?: string[]; temBairros: boolean }): AreaDesenhada {
  const [forma, setForma] = useState<Forma>(bairrosIniciais.length && temBairros ? "bairros" : inicial);
  const [bairros, setBairros] = useState<string[]>(bairrosIniciais);
  const [geo, setGeo] = useState<GeoJSON.Polygon | null>(null);
  const [historia, setHistoria] = useState<Passo[]>(() => (bairrosIniciais.length && temBairros ? [{ forma: "bairros", geo: null, bairros: bairrosIniciais }] : []));
  const [ima, setIma] = useState(true);
  const [rua, setRua] = useState<string | null>(null);
  const desenho = useRef<Desenho | null>(null);
  const estado = useRef({ forma });
  useEffect(() => { estado.current = { forma }; });

  /* só recria se o mapa mudar: tema, largura ou pessoas novas não podem apagar o desenho */
  const ctxAtual = useRef(ctx);
  useEffect(() => { ctxAtual.current = ctx; });
  const corInicial = useRef(corHex);
  const mapaDoCtx = ctx.mapa;
  useEffect(() => {
    const ctx = ctxAtual.current;
    const { mapa, cores } = ctx;
    const fonte = `${prefixo}-bairros`;
    mapa.addSource(fonte, { type: "geojson", data: { type: "FeatureCollection", features: ctx.regioes.map((r) => ({ type: "Feature", properties: { codigo: r.codigo }, geometry: r.geojson })) } });
    mapa.addLayer({ id: `${fonte}-fill`, type: "fill", source: fonte, paint: { "fill-color": corInicial.current, "fill-opacity": 0 } });
    mapa.addLayer({ id: `${fonte}-linha`, type: "line", source: fonte, paint: { "line-color": cores.tinta, "line-width": 0, "line-opacity": 0.85 } });
    const d = criarDesenho(mapa, {
      cor: corInicial.current, tinta: cores.tinta, papel: cores.papel, celular: ctx.celular,
      aoMudar: setGeo,
      aoTerminar: (f, g) => { setForma(f); setHistoria((h) => (h.length && h[h.length - 1].forma === f && JSON.stringify(h[h.length - 1].geo) === JSON.stringify(g) ? h : [...h, { forma: f, geo: g, bairros: [] }])); },
      aoGrudar: setRua,
    });
    desenho.current = d;
    /* forma inicial: quadrado e círculo nascem no meio da tela */
    d.comecar(estado.current.forma);
    const clique = (e: MapMouseEvent) => {
      if (estado.current.forma !== "bairros") return;
      const cod = mapa.queryRenderedFeatures(e.point, { layers: [`${fonte}-fill`] })[0]?.properties?.codigo as string | undefined;
      if (!cod) return;
      setBairros((b) => {
        const nova = b.includes(cod) ? b.filter((x) => x !== cod) : [...b, cod];
        setHistoria((h) => [...h, { forma: "bairros", geo: null, bairros: nova }]);
        return nova;
      });
    };
    mapa.on("click", clique);
    return () => { mapa.off("click", clique); d.destruir(); desenho.current = null; limparCamadas(mapa, `${fonte}`); };
  }, [mapaDoCtx, prefixo]);

  /* cor no desenho e nos bairros */
  useEffect(() => {
    const { mapa } = ctx;
    desenho.current?.cor(corHex);
    const fonte = `${prefixo}-bairros`;
    if (!mapa.getLayer(`${fonte}-fill`)) return;
    const sel: maplibregl.ExpressionSpecification = ["in", ["get", "codigo"], ["literal", forma === "bairros" ? bairros : []]];
    mapa.setPaintProperty(`${fonte}-fill`, "fill-color", corHex);
    mapa.setPaintProperty(`${fonte}-fill`, "fill-opacity", ["case", sel, 0.42, forma === "bairros" ? 0.08 : 0]);
    mapa.setPaintProperty(`${fonte}-linha`, "line-width", ["case", sel, 2.5, forma === "bairros" ? 1.2 : 0]);
  }, [ctx, prefixo, corHex, forma, bairros]);

  useEffect(() => { desenho.current?.ima(ima); }, [ima]);

  const trocar = (f: Forma) => {
    if (f === forma) return;
    setForma(f);
    if (f === "bairros") { desenho.current?.comecar("bairros"); setHistoria((h) => [...h, { forma: "bairros", geo: null, bairros }]); return; }
    desenho.current?.comecar(f);
    if (f === "livre") setHistoria((h) => [...h, { forma: "livre", geo: null, bairros: [] }]);
  };

  const desfazer = () => {
    if (historia.length < 2) return;
    const h = historia.slice(0, -1);
    const p = h[h.length - 1];
    setHistoria(h);
    setForma(p.forma);
    if (p.forma === "bairros") setBairros(p.bairros);
    setGeo(p.geo);
    desenho.current?.restaurar(p.forma, p.geo);
  };

  /* o círculo só muda o raio e a posição: não gruda em rua */
  const temIma = forma === "quadrado" || forma === "livre";
  const base = forma === "livre" && geo ? "Arraste os cantos para seguir as ruas. Puxe os pontos do meio para criar cantos novos." : DICAS[forma];
  const dica = rua !== null ? (rua ? `Grudou na ${rua}` : "Grudou na rua") : base + (ima && temIma && !ctx.celular ? " Segure Alt para soltar do ímã." : "");
  const geometria = (): GeoJSON.Geometry | null => {
    if (forma !== "bairros") return geo;
    const poligonos = ctx.regioes.filter((r) => bairros.includes(r.codigo))
      .flatMap((r) => (r.geojson.type === "Polygon" ? [r.geojson.coordinates] : r.geojson.type === "MultiPolygon" ? r.geojson.coordinates : []));
    return poligonos.length ? { type: "MultiPolygon", coordinates: poligonos } : null;
  };

  return {
    forma, trocar, bairros, geo, podeDesfazer: historia.length >= 2, desfazer,
    ima, alternarIma: () => setIma((v) => !v), temIma, temBairros, dica,
    pronta: forma === "bairros" ? bairros.length > 0 : !!geo,
    geometria,
  };
}

/* a barra de cima: formas, Desfazer, ímã e a dica do gesto */
export function BarraForma({ area, celular, rotulo, id }: { area: AreaDesenhada; celular: boolean; rotulo?: string; id: string }) {
  return (
    <div className="ca-topo">
      <div className="ca-barra" role="toolbar" aria-label="Forma da área">
        {rotulo && <span className="ca-rotulo">{rotulo}</span>}
        <Segmentado role="group" aria-label="Forma" className="ca-formas" rolavel={celular}>
          {FORMAS.filter((x) => x.f !== "bairros" || area.temBairros).map((x) => (
            <Opcao key={x.f} marcada={area.forma === x.f} onClick={() => area.trocar(x.f)}><Icon name={x.icone} size={16} stroke={2} />{x.rotulo}</Opcao>
          ))}
        </Segmentado>
        <span className="ca-sep" aria-hidden="true" />
        <Botao className="ca-desfazer" desativado={!area.podeDesfazer} onClick={area.desfazer}><Icon name="desfazer" size={16} stroke={2} />Desfazer</Botao>
        {area.temIma && (
          <span className="ca-ima">
            <span id={`${id}-ima`}>Ímã nas ruas</span>
            <Interruptor rotuloId={`${id}-ima`} ligado={area.ima} onClick={area.alternarIma} />
          </span>
        )}
      </div>
      <div className="ca-dica" aria-live="polite">{area.dica}</div>
    </div>
  );
}
