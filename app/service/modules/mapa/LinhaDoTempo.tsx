"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { milhar } from "./linguagem";
import { movimentoReduzido } from "../../ui/movimento";

import { BotaoIcone } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Segmentado } from "../../ui/Segmentado";
import { PainelMapa } from "../../ui/PainelMapa";

/* Ferramentas › Linha do tempo (G11, mapa/PLANO.md §10, prancha P10). Só
   números, sem frase de leitura: quantas pessoas chegaram no período e onde.
   De perto, os pontos de quem chegou acendem no play; com a cidade toda,
   aparecem bolhas "+N" por bairro. A data de chegada é o ano de "membro desde"
   ou o do cadastro; o lugar é o endereço de hoje. */

type Mes = { mes: string; total: number };
type Cresc = { codigo: string; nome: string; antes: number; novos: number; latitude: number; longitude: number };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotulo = (iso: string) => { const [a, m] = iso.split("-"); return `${MESES[Number(m) - 1]} ${a}`; };
const anoDe = (iso?: string) => (iso ? Number(iso.slice(0, 4)) : 0);

export function LinhaDoTempo({ ctx, nivel }: { ctx: ContextoMapa; nivel: "bairro" | "setor" }) {
  const [serie, setSerie] = useState<Mes[]>([]);
  const [ini, setIni] = useState(0);
  const [fim, setFim] = useState(0);
  const [dados, setDados] = useState<Cresc[]>([]);
  const [vis, setVis] = useState<"perto" | "cidade">("perto");
  const [tocando, setTocando] = useState(false);
  const db = () => createServiceBrowserClient().schema("service");

  useEffect(() => {
    db().rpc("mapa_crescimento_serie", { p_org: ctx.org }).then(({ data }) => {
      const s = (data ?? []) as Mes[];
      setSerie(s);
      const n = s.length - 1;
      setFim(n);
      setIni(Math.max(0, n - 12));
    });
  }, [ctx.org]);

  const ultimo = serie.length - 1;
  const de = serie[ini]?.mes;
  const ate = serie[fim]?.mes;
  /* só a resposta do último pedido vale (no play elas chegam fora de ordem) */
  const pedido = useRef(0);
  useEffect(() => {
    if (!de || !ate) return;
    const t = setTimeout(() => {
      const n = ++pedido.current;
      db().rpc("mapa_crescimento", { p_org: ctx.org, p_de: de, p_ate: fim === ultimo ? new Date().toISOString().slice(0, 10) : ate, p_nivel: nivel }).then(({ data }) => { if (n === pedido.current) setDados((data ?? []) as Cresc[]); });
    }, 200);
    return () => clearTimeout(t);
  }, [ctx.org, de, ate, nivel, fim, ultimo]);

  /* camadas: pontos de quem chegou (de perto) e bolhas por bairro (cidade toda) */
  useEffect(() => {
    const { mapa, cores } = ctx;
    mapa.addSource("lt-chegou", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "lt-chegou-halo", type: "circle", source: "lt-chegou", paint: { "circle-radius": 11, "circle-color": cores.membro, "circle-opacity": 0.22 } });
    mapa.addLayer({ id: "lt-chegou", type: "circle", source: "lt-chegou", paint: { "circle-radius": 5.5, "circle-color": cores.membro, "circle-stroke-color": cores.papel, "circle-stroke-width": 2 } });
    mapa.addSource("lt-bolhas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "lt-bolhas", type: "circle", source: "lt-bolhas", paint: { "circle-radius": ["get", "r"], "circle-color": cores.membro, "circle-opacity": 0.9, "circle-stroke-color": cores.papel, "circle-stroke-width": 2 } });
    mapa.addLayer({ id: "lt-bolhas-n", type: "symbol", source: "lt-bolhas", layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-allow-overlap": true }, paint: { "text-color": cores.papel } });
    return () => limparCamadas(mapa, "lt-");
  }, [ctx]);

  /* de perto: acendem os pontos de quem chegou do início do período até o fim atual */
  useEffect(() => {
    const a0 = anoDe(de), a1 = anoDe(ate);
    /* "membro desde" é só o ano e conta como 1º de janeiro, igual ao servidor: entra quem
       chegou depois do ano do início e até o ano do fim */
    const chegou = vis === "perto" ? ctx.pessoas.filter((p) => { const a = Number(p.desde); return a > a0 && a <= a1; }) : [];
    (ctx.mapa.getSource("lt-chegou") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: chegou.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })) });
    (ctx.mapa.getSource("lt-bolhas") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: vis === "cidade" ? dados.filter((d) => d.novos >= 3).map((d) => ({ type: "Feature", properties: { t: `+${d.novos}`, r: 14 + Math.sqrt(d.novos) * 2.4 }, geometry: { type: "Point", coordinates: [d.longitude, d.latitude] } })) : [],
    });
  }, [ctx, dados, vis, de, ate]);

  /* play: o fim anda do início do período até hoje */
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!tocando) return;
    timer.current = setInterval(() => setFim((f) => { if (f >= ultimo) { setTocando(false); return f; } return f + 1; }), movimentoReduzido() ? 0 : 320);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [tocando, ultimo]);
  const tocar = () => {
    if (tocando) { setTocando(false); return; }
    if (movimentoReduzido()) { setFim(ultimo); return; }
    if (fim >= ultimo) setFim(ini);
    setTocando(true);
  };

  const antes = serie[ini]?.total ?? 0;
  const depois = serie[fim]?.total ?? 0;
  const chegaram = Math.max(0, depois - antes);
  const bairros = dados.filter((d) => d.novos !== 0).sort((a, b) => (b.novos < 0 ? 1 : b.novos) - (a.novos < 0 ? 1 : a.novos)).slice(0, 8);
  const maior = Math.max(1, ...bairros.map((b) => b.novos));
  const caminho = useMemo(() => {
    if (serie.length < 2) return "";
    const max = Math.max(...serie.map((p) => p.total), 1);
    return serie.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (serie.length - 1)) * 1000} ${60 - (p.total / max) * 56}`).join(" ");
  }, [serie]);
  const pct = (i: number) => (serie.length > 1 ? (i / (serie.length - 1)) * 100 : 0);
  const marcas = serie.length > 1 ? [0, Math.round(ultimo / 3), Math.round((2 * ultimo) / 3), ultimo] : [];
  const periodo = `${de ? rotulo(de) : ""} → ${fim === ultimo ? "hoje" : ate ? rotulo(ate) : ""}`;

  const periodoAno = fim === ultimo && ini === Math.max(0, ultimo - 12);
  const periodoTudo = ini === 0 && fim === ultimo;
  return (
    <>
      <div className="lt-vis">
        <Segmentado role="group" aria-label="Como ver no mapa">
          <Opcao marcada={vis === "perto"} onClick={() => setVis("perto")}>De perto</Opcao>
          <Opcao marcada={vis === "cidade"} onClick={() => setVis("cidade")}>Cidade toda</Opcao>
        </Segmentado>
        <span className="lt-legenda"><span className="lt-bola" aria-hidden="true" />Chegou no período</span>
      </div>

      <PainelMapa rotulo="Linha do tempo" sobretitulo={periodo} titulo="Linha do tempo" voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="lt-total">
            <div className="lt-total-linha"><span className="lt-n">+{milhar(chegaram)}</span><span>{chegaram === 1 ? "pessoa chegou" : "pessoas chegaram"}</span></div>
            <span className="lt-total-mapa">No mapa: <b>{milhar(antes)} → {milhar(depois)}</b></span>
          </div>
        )}
        rodape={<span>Conta onde a pessoa mora hoje. Quem mudou de bairro aparece no endereço novo.</span>}>
        <div className="lt-tabela">
          <div className="lt-tabela-cab"><span>{nivel === "bairro" ? "Bairro" : "Setor"}</span><span>Chegaram</span></div>
          {bairros.length === 0 && <p className="mp-fraco">Ninguém chegou no período.</p>}
          {bairros.map((b) => (
            <div key={b.codigo} className="lt-bairro">
              <span className="lt-bairro-nome">{b.nome}</span>
              <span className="lt-bairro-barra" aria-hidden="true"><span style={{ width: `${b.novos < 0 ? 4 : (b.novos / maior) * 100}%` }} /></span>
              <span className={`lt-bairro-n${b.novos < 0 ? " pouco" : ""}`}>{b.novos < 0 ? "menos de 3" : `+${b.novos}`}</span>
            </div>
          ))}
        </div>
      </PainelMapa>

      <section className="lt-barra" aria-label="Período">
        <BotaoIcone className="lt-play" rotulo={tocando ? "Pausar" : "Tocar a linha do tempo"} onClick={tocar}><Icon name={tocando ? "pendente" : "play"} size={20} /></BotaoIcone>
        <div className="lt-trilho">
          <div className="lt-curva-caixa">
            <svg viewBox="0 0 1000 64" preserveAspectRatio="none" className="lt-curva" aria-hidden="true">
              <path d={`${caminho} L1000 64 L0 64 Z`} className="lt-area" />
              <path d={caminho} className="lt-linha" />
            </svg>
            <span className="lt-janela" aria-hidden="true" style={{ left: `${pct(ini)}%`, width: `${pct(fim) - pct(ini)}%` }} />
            <span className="lt-cursor" aria-hidden="true" style={{ left: `${pct(fim)}%` }}><span>{fim === ultimo ? "hoje" : ate ? rotulo(ate) : ""}</span></span>
          </div>
          <div className="lt-faixas">
            <input type="range" min={0} max={Math.max(0, ultimo)} value={ini} onChange={(e) => setIni(Math.min(Number(e.target.value), fim))} aria-label="Início do período" aria-valuetext={de ? rotulo(de) : ""} />
            <input type="range" min={0} max={Math.max(0, ultimo)} value={fim} onChange={(e) => setFim(Math.max(Number(e.target.value), ini))} aria-label="Fim do período" aria-valuetext={fim === ultimo ? "hoje" : ate ? rotulo(ate) : ""} />
          </div>
          <div className="lt-meses" aria-hidden="true">{marcas.map((i, k) => <span key={k}>{i === ultimo ? "hoje" : serie[i] ? rotulo(serie[i].mes) : ""}</span>)}</div>
        </div>
        <div className="lt-periodo" role="group" aria-label="Período pronto">
          <Opcao marcada={periodoAno} onClick={() => { setTocando(false); setFim(ultimo); setIni(Math.max(0, ultimo - 12)); }}>Último ano</Opcao>
          <Opcao marcada={periodoTudo} onClick={() => { setTocando(false); setIni(0); setFim(ultimo); }}>Desde o começo</Opcao>
        </div>
      </section>
    </>
  );
}
