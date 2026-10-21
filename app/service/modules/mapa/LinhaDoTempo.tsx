"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { milhar } from "./linguagem";

/* Ferramentas › Linha do tempo (tela 13 do design). Quantas pessoas
   chegaram em cada parte da cidade no período. A data de entrada é o ano de
   "membro desde" ou a data do cadastro; o lugar é o endereço de hoje. */

type Ponto = { mes: string; total: number };
type Cresc = { codigo: string; nome: string; antes: number; novos: number; latitude: number; longitude: number };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotulo = (iso: string) => { const [a, m] = iso.split("-"); return `${MESES[Number(m) - 1]} ${a}`; };

export function LinhaDoTempo({ ctx, nivel }: { ctx: ContextoMapa; nivel: "bairro" | "setor" }) {
  const [serie, setSerie] = useState<Ponto[]>([]);
  const [ini, setIni] = useState(0);
  const [fim, setFim] = useState(0);
  const [dados, setDados] = useState<Cresc[]>([]);
  const [tocando, setTocando] = useState(false);
  const db = () => createServiceBrowserClient().schema("service");

  useEffect(() => {
    db().rpc("mapa_crescimento_serie", { p_org: ctx.org }).then(({ data }) => {
      const s = (data ?? []) as Ponto[];
      setSerie(s);
      const n = s.length - 1;
      setFim(n);
      setIni(Math.max(0, n - 12));
    });
  }, [ctx.org]);

  const de = serie[ini]?.mes;
  const ate = serie[fim]?.mes;
  useEffect(() => {
    if (!de || !ate) return;
    const t = setTimeout(() => {
      db().rpc("mapa_crescimento", { p_org: ctx.org, p_de: de, p_ate: fim === serie.length - 1 ? new Date().toISOString().slice(0, 10) : ate, p_nivel: nivel }).then(({ data }) => setDados((data ?? []) as Cresc[]));
    }, 200);
    return () => clearTimeout(t);
  }, [ctx.org, de, ate, nivel, fim, serie.length]);

  /* "+N" no mapa, no meio de cada região */
  useEffect(() => {
    const { mapa, cores } = ctx;
    mapa.addSource("lt-badges", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "lt-badges", type: "circle", source: "lt-badges", paint: { "circle-radius": 16, "circle-color": cores.membro, "circle-stroke-color": cores.papel, "circle-stroke-width": 2 } });
    mapa.addLayer({ id: "lt-badges-n", type: "symbol", source: "lt-badges", layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": cores.papel } });
    return () => limparCamadas(mapa, "lt-");
  }, [ctx]);
  useEffect(() => {
    (ctx.mapa.getSource("lt-badges") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: dados.filter((d) => d.novos >= 3).map((d) => ({ type: "Feature", properties: { t: `+${d.novos}` }, geometry: { type: "Point", coordinates: [d.longitude, d.latitude] } })),
    });
  }, [ctx, dados]);

  /* animar: o fim anda do início até hoje */
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!tocando) return;
    timer.current = setInterval(() => setFim((f) => { if (f >= serie.length - 1) { setTocando(false); return f; } return f + 1; }), 350);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [tocando, serie.length]);

  const antes = serie[ini]?.total ?? 0;
  const depois = serie[fim]?.total ?? 0;
  const faltas = new Set(ctx.regioes.filter((r) => r.leitura === "falta").map((r) => r.codigo));
  const fortes = new Set(ctx.regioes.filter((r) => r.leitura === "forte").map((r) => r.codigo));
  /* -1 = 1 ou 2 (o servidor esconde): conta como 1 só para a leitura geral */
  const n = (d: Cresc) => (d.novos < 0 ? 1 : d.novos);
  const novosTotal = dados.reduce((s, d) => s + n(d), 0);
  const novosFalta = dados.filter((d) => faltas.has(d.codigo)).reduce((s, d) => s + n(d), 0);
  const novosForte = dados.filter((d) => fortes.has(d.codigo)).reduce((s, d) => s + n(d), 0);
  const leitura = !novosTotal ? "Ninguém novo no mapa neste período."
    : faltas.size && novosFalta / novosTotal < 0.15 && novosForte / novosTotal > 0.4 ? "A igreja cresceu onde já era forte. As lacunas quase não mudaram."
    : faltas.size && novosFalta / novosTotal >= 0.3 ? "Boa parte de quem chegou mora onde faltava igreja."
    : "O crescimento ficou espalhado pela cidade.";

  const caminho = useMemo(() => {
    if (serie.length < 2) return "";
    const max = Math.max(...serie.map((p) => p.total), 1);
    return serie.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (serie.length - 1)) * 1000} ${60 - (p.total / max) * 56}`).join(" ");
  }, [serie]);
  const pct = (i: number) => (serie.length > 1 ? (i / (serie.length - 1)) * 100 : 0);
  const ultimoAno = () => { const n = serie.length - 1; setFim(n); setIni(Math.max(0, n - 12)); };
  const tudo = () => { setIni(0); setFim(serie.length - 1); };

  return (
    <>
      <div className="mp-faixa" role="region" aria-label="Linha do tempo">
        <strong>Linha do tempo</strong>
        <span className="mp-texto">Os números verdes são quem chegou no período.</span>
        <button type="button" className="mp-botao" onClick={ctx.fechar}>Sair</button>
      </div>

      <aside className="mp-painel" aria-label="Crescimento por região" style={{ right: 16, top: 16, width: 300, maxHeight: "calc(100% - 200px)" }}>
        <div className="mp-cab">
          <div className="mp-sobre">{de ? rotulo(de) : ""} → {fim === serie.length - 1 ? "hoje" : ate ? rotulo(ate) : ""}</div>
          <div className="mp-num" style={{ fontSize: "var(--fs-pn-32)", fontWeight: 600, marginTop: 4 }}>{milhar(antes)} → {milhar(depois)}</div>
          <div className="mp-texto" style={{ color: "var(--mapa-forte)" }}><span className="mp-num">+{milhar(Math.max(0, depois - antes))}</span> pessoas no mapa</div>
        </div>
        <div className="mp-corpo">
          {dados.filter((d) => d.novos !== 0).slice(0, 8).map((d) => <div key={d.codigo} className="mp-linha"><span>{d.nome}</span><span className="mp-num" style={{ color: "var(--mapa-forte)" }}>{d.novos < 0 ? "menos de 3" : `+${d.novos}`}</span></div>)}
          <p className="mp-fraco">{leitura}</p>
          <p className="mp-fraco">Usa o endereço de hoje: quem mudou de bairro aparece onde mora agora.</p>
        </div>
      </aside>

      <section className="mp-painel" aria-label="Período" style={{ left: 16, right: 80, bottom: 16, top: "auto", flexDirection: "row", alignItems: "center", gap: 18, padding: "14px 18px" }}>
        <button type="button" className="mp-botao" style={{ width: 44, padding: 0, justifyContent: "center", borderRadius: 22 }} aria-label={tocando ? "Pausar" : "Animar o crescimento"} onClick={() => { if (!tocando && fim >= serie.length - 1) setFim(ini); setTocando((t) => !t); }}><Icon name={tocando ? "pendente" : "play"} size={16} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <svg viewBox="0 0 1000 64" preserveAspectRatio="none" style={{ width: "100%", height: 56, display: "block" }} aria-hidden="true">
            <path d={`${caminho} L1000 64 L0 64 Z`} fill="var(--border-2)" />
            <path d={caminho} fill="none" stroke="var(--mapa-forte)" strokeWidth="2" />
            <rect x={pct(ini) * 10} y="0" width={(pct(fim) - pct(ini)) * 10} height="64" fill="var(--mapa-forte)" opacity="0.18" />
          </svg>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
            <label className="mp-linha">De {de ? rotulo(de) : ""}<input type="range" min={0} max={Math.max(0, serie.length - 1)} value={ini} onChange={(e) => setIni(Math.min(Number(e.target.value), fim))} aria-label="Início do período" style={{ flex: 1 }} /></label>
            <label className="mp-linha">Até {fim === serie.length - 1 ? "hoje" : ate ? rotulo(ate) : ""}<input type="range" min={0} max={Math.max(0, serie.length - 1)} value={fim} onChange={(e) => setFim(Math.max(Number(e.target.value), ini))} aria-label="Fim do período" style={{ flex: 1 }} /></label>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button type="button" className="mp-chip" onClick={ultimoAno}>Último ano</button>
          <button type="button" className="mp-chip" onClick={tudo}>Desde o começo</button>
        </div>
      </section>
    </>
  );
}
