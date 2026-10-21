"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MlMap } from "maplibre-gl";
import { ESTILO_URL, aquecerEstilo, coresDoMapa, type CorMapa } from "./estilo";

export type MapaPronto = { map: MlMap; ml: typeof import("maplibre-gl"); cores: Record<CorMapa, string> };

/* Componente único de mapa do Service (regra de componentes compartilhados):
   app do membro ("Onde"), mapa da liderança, mesa de trabalho e modos. Cada
   tela recebe o mapa pronto em onPronto e põe as próprias camadas. O fundo e
   a paleta dos dados são fixos; o chrome em volta segue o tema da igreja. */
export default function MapaBase({
  centro = [-46.6333, -23.5505], zoom = 11, onPronto, rotulo, className, style, children,
}: {
  centro?: [number, number];
  zoom?: number;
  onPronto?: (p: MapaPronto) => void | (() => void);
  rotulo: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const alvo = useRef<HTMLDivElement>(null);
  const pronto = useRef(onPronto);
  useEffect(() => { pronto.current = onPronto; });
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    let map: MlMap | null = null;
    let limpar: void | (() => void);
    (async () => {
      const ml = await import("maplibre-gl");
      if (!vivo || !alvo.current || !raiz.current) return;
      const cores = coresDoMapa(raiz.current);
      map = new ml.Map({
        container: alvo.current,
        style: ESTILO_URL,
        center: centro,
        zoom,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.on("error", () => { if (!map?.isStyleLoaded()) setFalhou(true); });
      map.once("load", () => {
        if (!vivo || !map) return;
        /* depuração local: o último mapa aberto fica em window.__mapa */
        if (process.env.NODE_ENV !== "production") (window as unknown as { __mapa?: MlMap }).__mapa = map;
        aquecerEstilo(map, cores);
        limpar = pronto.current?.({ map, ml, cores });
      });
    })().catch(() => setFalhou(true));
    return () => {
      vivo = false;
      if (typeof limpar === "function") limpar();
      map?.remove();
    };
    /* o mapa nasce uma vez: centro e zoom iniciais não recriam o mapa */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={raiz} className={`mapa-root${className ? ` ${className}` : ""}`} style={style}>
      <div ref={alvo} role="region" aria-label={rotulo} style={{ position: "absolute", inset: 0 }} />
      {falhou && <div className="mapa-falha" role="status">Não foi possível carregar o mapa agora. Confira a conexão e tente de novo.</div>}
      {children}
    </div>
  );
}
