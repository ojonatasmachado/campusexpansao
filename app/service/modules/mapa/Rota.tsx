"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { caixaDaGeometria, temPonto } from "./geo";

import { Botao, botaoClasse, BotaoIcone } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Campo, Entrada, Marcar } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
/* Ferramentas › Traçar rota (tela 12 do design). O objetivo vem primeiro e
   muda o que vira parada: na Visita, as pessoas (com nome no mapa); em
   oração, panfletagem e carro de som, lugares e ruas, nunca casas. */

type Objetivo = "visita" | "oracao" | "panfletagem" | "som" | "outro";
type Parada = { nome: string; tipo: string; lnglat: [number, number] };
type Resultado = { trajeto: GeoJSON.LineString; distancia_km: number; duracao_min: number; aproximado: boolean };

const OBJETIVOS: { id: Objetivo; nome: string; dica: string }[] = [
  { id: "visita", nome: "Visita", dica: "Clique nas pessoas do mapa para incluir. O ponto mostra a região do CEP; o endereço fica na ficha." },
  { id: "oracao", nome: "Oração", dica: "As paradas são lugares e ruas. Casas de pessoas só entram quando o objetivo é Visita." },
  { id: "panfletagem", nome: "Panfletagem", dica: "As paradas são lugares e ruas. Ligue \"Percorrer a área\" para contornar uma área inteira." },
  { id: "som", nome: "Carro de som", dica: "Use \"Percorrer a área\" e o carro para cobrir as ruas da área." },
  { id: "outro", nome: "Outro", dica: "Clique no mapa para marcar as paradas." },
];

function linkMapas(pts: [number, number][], como: "pe" | "carro") {
  const p = pts.slice(0, 10).map(([lng, lat]) => `${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${p[0]}&destination=${p[p.length - 1]}${p.length > 2 ? `&waypoints=${p.slice(1, -1).join("|")}` : ""}&travelmode=${como === "pe" ? "walking" : "driving"}`;
}

export function Rota({ ctx }: { ctx: ContextoMapa }) {
  const sede = ctx.locais.find((l) => l.tipo === "sede" && temPonto(l));
  const [objetivo, setObjetivo] = useState<Objetivo>("oracao");
  const [paradas, setParadas] = useState<Parada[]>(sede ? [{ nome: `Saída: ${sede.nome}`, tipo: "Sede", lnglat: [sede.longitude as number, sede.latitude as number] }] : []);
  const [como, setComo] = useState<"pe" | "carro">("pe");
  const [areaId, setAreaId] = useState("");
  const [res, setRes] = useState<Resultado | null>(null);
  const [nome, setNome] = useState("");
  const [quando, setQuando] = useState("");
  const [equipe, setEquipe] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const estado = useRef({ objetivo, paradas });
  useEffect(() => { estado.current = { objetivo, paradas }; });

  /* só a resposta do último pedido vale (as antigas chegam fora de ordem) */
  const pedido = useRef(0);
  const calcular = async (lista: Parada[], otimizar: boolean) => {
    const n = ++pedido.current;
    if (lista.length < 2) { setRes(null); return lista; }
    try {
      const r = await fetch("/api/service/mapa/rota", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org: ctx.org, paradas: lista.map((p) => p.lnglat), como, otimizar }) });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json() as Resultado & { ordem: number[] };
      if (n !== pedido.current) return lista;
      setRes(j);
      return j.ordem.map((i) => lista[i]);
    } catch {
      if (n === pedido.current) avisar("Não foi possível traçar a rota agora.", "warn");
      return lista;
    }
  };

  /* camadas e clique para incluir parada */
  useEffect(() => {
    const { mapa, cores } = ctx;
    mapa.addSource("rt-trajeto", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "rt-trajeto-borda", type: "line", source: "rt-trajeto", paint: { "line-color": cores.papel, "line-width": 9 }, layout: { "line-join": "round", "line-cap": "round" } });
    mapa.addLayer({ id: "rt-trajeto", type: "line", source: "rt-trajeto", paint: { "line-color": cores.rota, "line-width": 4 }, layout: { "line-join": "round", "line-cap": "round" } });
    mapa.addSource("rt-paradas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "rt-paradas", type: "circle", source: "rt-paradas", paint: { "circle-radius": 13, "circle-color": cores.tinta, "circle-stroke-color": cores.papel, "circle-stroke-width": 3 } });
    mapa.addLayer({ id: "rt-paradas-n", type: "symbol", source: "rt-paradas", layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-allow-overlap": true }, paint: { "text-color": cores.papel } });
    const clique = (e: MapMouseEvent) => {
      const s = estado.current;
      if (s.paradas.length >= 25) { avisar("Uma rota tem no máximo 25 paradas.", "warn"); return; }
      /* visita: encosta na pessoa mais perto do clique (só com nome) */
      if (s.objetivo === "visita") {
        let melhor: { nome: string; ll: [number, number]; d: number } | null = null;
        for (const p of ctx.pessoas) {
          if (p.anonimo || !p.nome) continue;
          const pt = mapa.project([p.longitude, p.latitude]);
          const d = Math.hypot(pt.x - e.point.x, pt.y - e.point.y);
          if (d < 24 && (!melhor || d < melhor.d)) melhor = { nome: p.nome, ll: [p.longitude, p.latitude], d };
        }
        if (!melhor) { avisar("Na visita, clique em cima de uma pessoa do mapa.", "info"); return; }
        setParadas((ps) => [...ps, { nome: melhor!.nome, tipo: "Pessoa", lnglat: melhor!.ll }]);
        return;
      }
      const local = ctx.locais.filter(temPonto).map((l) => ({ l, d: Math.hypot(mapa.project([l.longitude as number, l.latitude as number]).x - e.point.x, mapa.project([l.longitude as number, l.latitude as number]).y - e.point.y) })).sort((a, b) => a.d - b.d)[0];
      if (local && local.d < 20) setParadas((ps) => [...ps, { nome: local.l.nome, tipo: local.l.tipo === "grupo" ? "Célula" : "Igreja", lnglat: [local.l.longitude as number, local.l.latitude as number] }]);
      else setParadas((ps) => [...ps, { nome: `Ponto ${ps.length + 1}`, tipo: "Lugar", lnglat: [e.lngLat.lng, e.lngLat.lat] }]);
    };
    mapa.on("click", clique);
    mapa.getCanvas().style.cursor = "crosshair";
    return () => { mapa.off("click", clique); mapa.getCanvas().style.cursor = ""; limparCamadas(mapa, "rt-"); };
  }, [ctx]);

  /* redesenha e recalcula o trajeto quando muda a lista ou o jeito */
  useEffect(() => {
    (ctx.mapa.getSource("rt-paradas") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: paradas.map((p, i) => ({ type: "Feature", properties: { n: String(i + 1) }, geometry: { type: "Point", coordinates: p.lnglat } })) });
    const t = setTimeout(() => { calcular(paradas, false); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, paradas, como]);
  useEffect(() => {
    (ctx.mapa.getSource("rt-trajeto") as GeoJSONSource | undefined)?.setData(res ? { type: "Feature", properties: {}, geometry: res.trajeto } : { type: "FeatureCollection", features: [] });
  }, [ctx, res]);

  /* percorrer a área: saída + pontos do contorno da área escolhida */
  const percorrerArea = (id: string) => {
    setAreaId(id);
    const a = ctx.areas.find((x) => x.id === id);
    if (!a) return;
    const anel = a.geojson.type === "Polygon" ? a.geojson.coordinates[0] : a.geojson.type === "MultiPolygon" ? a.geojson.coordinates[0][0] : [];
    const passo = Math.max(1, Math.floor(anel.length / 12));
    const contorno = anel.filter((_, i) => i % passo === 0).map((c, i) => ({ nome: `${a.nome} · trecho ${i + 1}`, tipo: "Rua", lnglat: [c[0], c[1]] as [number, number] }));
    setParadas((ps) => [...ps.slice(0, sede ? 1 : 0), ...contorno]);
    const caixa = caixaDaGeometria(a.geojson);
    if (caixa) ctx.mapa.fitBounds(caixa, { padding: 80 });
  };

  const tirar = (i: number) => setParadas((ps) => ps.filter((_, j) => j !== i));
  const subir = (i: number) => setParadas((ps) => { if (i < 1) return ps; const n = [...ps]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });
  const organizar = async () => { setOcupado(true); const nova = await calcular(paradas, true); setParadas(nova); setOcupado(false); };
  const obj = OBJETIVOS.find((o) => o.id === objetivo)!;
  /* na visita o nome das pessoas não vai na mensagem: a equipe recebe só a ordem e o trajeto */
  const resumo = useMemo(() => `${obj.nome}: ${nome || "rota"}${quando ? `, ${new Date(quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}. Paradas: ${paradas.map((p, i) => `${i + 1}. ${p.tipo === "Pessoa" ? `Visita ${i}` : p.nome}`).join("; ")}.`, [obj, nome, quando, paradas]);

  const salvar = async (enviar: boolean) => {
    if (paradas.length < 2) return;
    setOcupado(true);
    const db = createServiceBrowserClient().schema("service");
    const { error } = await db.from("map_routes").insert({
      organization_id: ctx.org, nome: nome.trim() || `${obj.nome} ${new Date().toLocaleDateString("pt-BR")}`, objetivo, paradas, ruas_da_area: !!areaId, como,
      quando: quando ? new Date(quando).toISOString() : null, equipe, trajeto: res?.trajeto ?? null, distancia_km: res?.distancia_km ?? null, duracao_min: res?.duracao_min ?? null,
    });
    if (error) { setOcupado(false); avisar("Não foi possível salvar a rota.", "warn"); return; }
    if (enviar && equipe.length) {
      const { data: fichas } = await db.rpc("mapa_fichas_de", { p_org: ctx.org, p_people: equipe });
      const texto = `${resumo} Trajeto: ${linkMapas(paradas.map((p) => p.lnglat), como)}`;
      let enviados = 0;
      for (const f of (fichas ?? []) as { member_id: string }[]) {
        const { data } = await db.rpc("start_dm", { p_target_member: f.member_id, p_body: texto });
        if (data) enviados++;
      }
      avisar(enviados ? `Rota salva e enviada para ${plural(enviados, "pessoa")}.` : "Rota salva. Não foi possível mandar a mensagem: confira se você tem ficha de membro.", enviados ? "ok" : "warn");
    } else avisar("Rota salva.");
    setOcupado(false);
  };

  return (
    <>
      <div className="mp-faixa" role="region" aria-label="Traçar rota">
        <strong>Traçar rota</strong>
        <span className="mp-texto">{objetivo === "visita" ? "Clique nas pessoas do mapa." : "Clique no mapa para marcar as paradas."}</span>
        <Botao tamanho="mapa" onClick={ctx.fechar}>Sair</Botao>
      </div>
      <aside className="mp-painel mp-dir" aria-label="Rota" style={{ width: 400 }}>
        <div className="mp-cab">
          <div className="mp-sobre">Traçar rota</div>
          <div className="field" style={{ marginTop: 10 }}>
            <span className="field-label">Objetivo</span>
            <div className="mp-seg" role="group" aria-label="Objetivo" style={{ ["--n" as string]: 3 } as React.CSSProperties}>
              {OBJETIVOS.map((o) => <Acao key={o.id} aria-pressed={objetivo === o.id} onClick={() => { setObjetivo(o.id); setParadas((ps) => ps.slice(0, sede ? 1 : 0)); setAreaId(""); }}>{o.nome}</Acao>)}
            </div>
          </div>
          <p className="mp-fraco" style={{ marginTop: 8 }}>{obj.dica}</p>
        </div>
        <div className="mp-corpo">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mp-pergunta">Paradas <span className="mp-num mp-fraco">{paradas.length}</span></span>
            <Botao compacto desativado={paradas.length < 3 || ocupado} onClick={organizar}>Organizar na melhor ordem</Botao>
          </div>
          {paradas.length === 0 && <p className="mp-fraco">Nenhuma parada ainda.</p>}
          {paradas.map((p, i) => (
            <div key={`${i}-${p.nome}`} className="mp-lista-pessoa">
              <span className="mp-av mp-num">{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{p.nome}<span className="mp-fraco" style={{ display: "block" }}>{p.tipo}</span></span>
              {i > 0 && <BotaoIcone className="mp-fechar" rotulo={`Subir ${p.nome}`} onClick={() => subir(i)}><Icon name="voltar" size={14} /></BotaoIcone>}
              <BotaoIcone className="mp-fechar" rotulo={`Tirar ${p.nome}`} onClick={() => tirar(i)}><Icon name="recusou" size={14} /></BotaoIcone>
            </div>
          ))}
          {objetivo !== "visita" && ctx.areas.length > 0 && (
            <Campo rotulo="Percorrer a área" id="rt-area" ajuda="Contorna a área com paradas nos trechos. Para cobrir cada rua, divida a área em partes menores.">
              <Selecao valor={areaId} aoMudar={percorrerArea} vazio="Não, só as paradas"
                opcoes={ctx.areas.map((a) => ({ v: a.id, l: a.nome }))} />
            </Campo>
          )}
          <div className="field">
            <span className="field-label">Como</span>
            <div className="mp-seg" style={{ ["--n" as string]: 2 } as React.CSSProperties}>
              <Acao aria-pressed={como === "pe"} onClick={() => setComo("pe")}>A pé</Acao>
              <Acao aria-pressed={como === "carro"} onClick={() => setComo("carro")}>Carro</Acao>
            </div>
          </div>
          {res && <div className="mp-destaque" style={{ fontSize: "var(--fs-pn-14)" }}><span className="mp-num">{String(res.distancia_km).replace(".", ",")}</span> km · cerca de <span className="mp-num">{res.duracao_min >= 60 ? `${Math.floor(res.duracao_min / 60)}h${String(res.duracao_min % 60).padStart(2, "0")}` : `${res.duracao_min} min`}</span>{res.aproximado && <span className="mp-fraco" style={{ display: "block" }}>Conta aproximada, em linha reta.</span>}</div>}
          <Campo rotulo="Nome" id="rt-nome"><Entrada maxLength={80} placeholder={`ex: ${obj.nome} em Bela Vista`} value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
          <div className="field"><label className="field-label" htmlFor="rt-quando">Quando</label><input id="rt-quando" className="input" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></div>
          <details>
            <summary className="mp-pergunta" style={{ cursor: "pointer", minHeight: 32 }}>Equipe · <span className="mp-num">{equipe.length}</span></summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", marginTop: 6 }}>
              {ctx.people.map((p) => <Marcar key={p.id} className="mp-linha" lado="direita" checked={equipe.includes(p.id)} onChange={(e) => setEquipe((q) => (e.target.checked ? [...q, p.id] : q.filter((x) => x !== p.id)))}>{p.name}</Marcar>)}
            </div>
          </details>
        </div>
        <div className="mp-pe">
          <Botao variante="principal" desativado={paradas.length < 2 || ocupado || !equipe.length} onClick={() => salvar(true)}>Enviar para a equipe</Botao>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <a className={`${botaoClasse({ compacto: true })}${paradas.length < 2 ? " disabled" : ""}`} href={paradas.length >= 2 ? linkMapas(paradas.map((p) => p.lnglat), como) : undefined} target="_blank" rel="noreferrer" aria-disabled={paradas.length < 2}>Abrir no app de mapas</a>
            <Botao compacto desativado={paradas.length < 2 || ocupado} onClick={() => salvar(false)}>Salvar rota</Botao>
          </div>
        </div>
      </aside>
    </>
  );
}
