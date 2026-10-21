"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { useTermos } from "../../lib/vocabulario-context";
import { avisar } from "../../lib/avisar";
import { CORES_AREA, NOME_COR, previaArea, salvarArea, type Area, type CorArea } from "./dados";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { milhar, pessoasNaRegiao, umACada } from "./linguagem";

/* Ferramentas › Criar uma área (tela 9 do design). Padrão: juntar bairros,
   clicando neles. Desenhar à mão fica como segunda opção. Os números
   (pessoas, moradores, células) mudam a cada bairro ou ponto. */
export function CriarArea({ ctx, bairrosIniciais, nivel }: { ctx: ContextoMapa; bairrosIniciais: string[]; nivel: "bairro" | "setor" }) {
  const { comTermos: ct } = useTermos();
  const temBairros = nivel === "bairro" && ctx.regioes.length > 0;
  const [jeito, setJeito] = useState<"bairros" | "mao">(temBairros ? "bairros" : "mao");
  const [bairros, setBairros] = useState<string[]>(bairrosIniciais);
  const [pontos, setPontos] = useState<[number, number][]>([]);
  const [fechado, setFechado] = useState(false);
  const [previa, setPrevia] = useState<{ pessoas: number; moradores: number; grupos: number } | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Area["tipo"]>("setor");
  const [cor, setCor] = useState<CorArea>("amber");
  const [resp, setResp] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const estado = useRef({ jeito, pontos, fechado });
  useEffect(() => { estado.current = { jeito, pontos, fechado }; });

  const desenho: GeoJSON.Polygon | null = useMemo(() => (fechado && pontos.length >= 3 ? { type: "Polygon", coordinates: [[...pontos, pontos[0]]] } : null), [fechado, pontos]);

  /* camadas do modo */
  useEffect(() => {
    const { mapa, cores } = ctx;
    mapa.addSource("ca-bairros", { type: "geojson", data: { type: "FeatureCollection", features: ctx.regioes.map((r) => ({ type: "Feature", properties: { codigo: r.codigo }, geometry: r.geojson })) } });
    mapa.addLayer({ id: "ca-bairros-fill", type: "fill", source: "ca-bairros", paint: { "fill-color": cores.amber, "fill-opacity": ["case", ["in", ["get", "codigo"], ["literal", []]], 0.45, 0.04] } });
    mapa.addLayer({ id: "ca-bairros-linha", type: "line", source: "ca-bairros", paint: { "line-color": cores.tinta, "line-width": ["case", ["in", ["get", "codigo"], ["literal", []]], 2.5, 0.8], "line-opacity": 0.8 } });
    mapa.addSource("ca-desenho", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "ca-desenho-fill", type: "fill", source: "ca-desenho", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": cores.amber, "fill-opacity": 0.35 } });
    mapa.addLayer({ id: "ca-desenho-linha", type: "line", source: "ca-desenho", paint: { "line-color": cores.tinta, "line-width": 2.5 } });
    mapa.addLayer({ id: "ca-desenho-pontos", type: "circle", source: "ca-desenho", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": cores.papel, "circle-stroke-color": cores.tinta, "circle-stroke-width": 2.5 } });
    const clique = (e: MapMouseEvent) => {
      const s = estado.current;
      if (s.jeito === "bairros") {
        const f = mapa.queryRenderedFeatures(e.point, { layers: ["ca-bairros-fill"] })[0];
        const cod = f?.properties?.codigo as string | undefined;
        if (cod) setBairros((b) => (b.includes(cod) ? b.filter((x) => x !== cod) : [...b, cod]));
        return;
      }
      if (s.fechado) return;
      const novo: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (s.pontos.length >= 3) {
        const p0 = mapa.project(s.pontos[0]);
        if (Math.hypot(p0.x - e.point.x, p0.y - e.point.y) < 14) { setFechado(true); return; }
      }
      setPontos((p) => [...p, novo]);
    };
    mapa.on("click", clique);
    mapa.getCanvas().style.cursor = "crosshair";
    return () => { mapa.off("click", clique); mapa.getCanvas().style.cursor = ""; limparCamadas(mapa, "ca-"); };
  }, [ctx]);

  useEffect(() => {
    const { mapa } = ctx;
    const sel: maplibregl.ExpressionSpecification = ["in", ["get", "codigo"], ["literal", jeito === "bairros" ? bairros : []]];
    if (mapa.getLayer("ca-bairros-fill")) {
      mapa.setPaintProperty("ca-bairros-fill", "fill-opacity", ["case", sel, 0.5, jeito === "bairros" ? 0.12 : 0]);
      mapa.setPaintProperty("ca-bairros-linha", "line-width", ["case", sel, 3, jeito === "bairros" ? 1.5 : 0]);
    }
    const feats: GeoJSON.Feature[] = pontos.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: p } }));
    if (jeito === "mao" && pontos.length >= 2) feats.unshift({ type: "Feature", properties: {}, geometry: desenho ?? { type: "LineString", coordinates: pontos } });
    (mapa.getSource("ca-desenho") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: jeito === "mao" ? feats : [] });
  }, [ctx, jeito, bairros, pontos, desenho]);

  /* números ao vivo (com uma pequena espera para não chamar a cada clique) */
  useEffect(() => {
    const t = setTimeout(async () => {
      const b = jeito === "bairros" ? bairros : [];
      const g = jeito === "mao" ? desenho : null;
      if (!b.length && !g) { setPrevia(null); return; }
      try { setPrevia(await previaArea(ctx.org, b, g)); } catch (e) { setPrevia(null); if (e instanceof Error && e.message.includes("area_complexa")) avisar("Área com pontos demais. Desenhe com menos cliques.", "warn"); }
    }, 250);
    return () => clearTimeout(t);
  }, [ctx.org, jeito, bairros, desenho]);

  const pronto = (jeito === "bairros" ? bairros.length > 0 : !!desenho) && nome.trim().length > 0;
  const salvar = async () => {
    if (!pronto) return;
    setSalvando(true); setErro("");
    try {
      await salvarArea(ctx.org, { nome: nome.trim(), tipo, cor, responsavel_id: resp || null, bairros: jeito === "bairros" ? bairros : [], geojson: jeito === "mao" ? desenho : null });
      avisar("Área criada.");
      ctx.recarregar();
      ctx.fechar();
    } catch (e) {
      setErro(e instanceof Error && e.message.includes("sem_acesso") ? "Só quem vê a cidade inteira e pode editar cria áreas." : "Não foi possível salvar a área. Tente de novo.");
      setSalvando(false);
    }
  };
  const nomesBairros = ctx.regioes.filter((r) => bairros.includes(r.codigo)).map((r) => r.nome);

  return (
    <>
      <div className="mp-faixa" role="region" aria-label="Criar área">
        <strong>Criar área</strong>
        <span className="mp-texto">{jeito === "bairros" ? "Clique nos bairros para juntar. Clique de novo para tirar." : fechado ? "Área fechada. Dê um nome ao lado." : "Clique para marcar os cantos. Clique no primeiro ponto para fechar."}</span>
        {temBairros && (
          <div className="mp-seg" style={{ ["--n" as string]: 2, minWidth: 260 } as React.CSSProperties}>
            <button type="button" aria-pressed={jeito === "bairros"} onClick={() => setJeito("bairros")}>Juntar bairros</button>
            <button type="button" aria-pressed={jeito === "mao"} onClick={() => setJeito("mao")}>Desenhar à mão</button>
          </div>
        )}
        {jeito === "mao" && pontos.length > 0 && <button type="button" className="mp-botao" onClick={() => { setFechado(false); setPontos((p) => p.slice(0, -1)); }}>Desfazer ponto</button>}
        {jeito === "mao" && !fechado && pontos.length >= 3 && <button type="button" className="mp-botao" onClick={() => setFechado(true)}>Fechar área</button>}
        <button type="button" className="mp-botao" onClick={ctx.fechar}>Sair</button>
      </div>

      <aside className="mp-painel mp-dir" aria-label="Nova área">
        <div className="mp-cab">
          <div className="mp-sobre">Nova área</div>
          <h2 className="mp-titulo">Dentro da área agora</h2>
          <div className="mp-kpis" style={{ marginTop: 12 }}>
            <div className="mp-kpi"><small>Pessoas</small><strong>{previa ? pessoasNaRegiao(previa.pessoas) : "0"}</strong></div>
            <div className="mp-kpi"><small>Moradores (IBGE)</small><strong>{previa ? milhar(previa.moradores) : "0"}</strong></div>
            <div className="mp-kpi"><small>1 da igreja a cada</small><strong>{previa && previa.pessoas >= 3 ? milhar(previa.moradores / previa.pessoas) : "-"}</strong></div>
            <div className="mp-kpi"><small>{ct("{Grupos}")}</small><strong>{previa ? previa.grupos : 0}</strong></div>
          </div>
          <p className="mp-fraco" style={{ marginTop: 8 }}>{nomesBairros.length ? nomesBairros.join(", ") : "Os números mudam a cada bairro ou ponto."}{previa && previa.pessoas >= 3 ? ` ${umACada(previa.moradores / previa.pessoas)}.` : ""}</p>
        </div>
        <div className="mp-corpo">
          <div className="field"><label className="field-label req" htmlFor="ca-nome">Nome</label><input id="ca-nome" className="input" value={nome} maxLength={60} placeholder="ex: Setor Norte" onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field">
            <span className="field-label">Tipo</span>
            <div className="mp-seg" role="group" aria-label="Tipo" style={{ ["--n" as string]: 3 } as React.CSSProperties}>
              {([["setor", "Setor"], ["regiao", "Região pastoral"], ["alcance", "Alcance"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={tipo === v} onClick={() => setTipo(v)}>{l}</button>)}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Cor no mapa</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CORES_AREA.map((c) => <button key={c} type="button" aria-label={NOME_COR[c]} aria-pressed={cor === c} onClick={() => setCor(c)} style={{ width: 32, height: 32, borderRadius: 16, border: 0, background: `var(--mapa-${c})`, boxShadow: cor === c ? "0 0 0 2px var(--graphite), 0 0 0 4px var(--white)" : "none", cursor: "pointer" }} />)}
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ca-resp">Responsável</label>
            <select id="ca-resp" className="input" value={resp} onChange={(e) => setResp(e.target.value)}>
              <option value="">Escolher depois</option>
              {ctx.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <p className="mp-fraco">Quem receber o mapa com esta área verá só o que está dentro dela.</p>
          {erro && <p className="mp-texto" role="alert" style={{ color: "var(--danger)" }}>{erro}</p>}
        </div>
        <div className="mp-pe" style={{ flexDirection: "row" }}>
          <button type="button" className="btn btn-sec" style={{ flex: 1 }} onClick={ctx.fechar}>Cancelar</button>
          <button type="button" className="btn btn-pri" style={{ flex: 2 }} disabled={!pronto || salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar área"}</button>
        </div>
      </aside>
    </>
  );
}
