"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { plural } from "../../lib/plural";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { caixaDaGeometria } from "./geo";
import { baixarCsv } from "./csv";

/* Ferramentas › Emergência (tela 11 do design). Quem coordena desenha a
   área atingida, vê as famílias, pergunta a todas se estão bem e marca a
   situação de cada uma. O endereço abre só aqui, com registro de quem abriu. */

type Emerg = { id: string; titulo: string; status: "aberta" | "encerrada"; aberta_em: string; geojson: GeoJSON.Geometry };
type Familia = { chave: string; nome: string; pessoas: number; bairro: string | null; contato_member_id: string; telefone: string | null; status: "sem_resposta" | "bem" | "ajuda"; atualizado_em: string | null; membros: { id: string; nome: string }[] };
type Endereco = { rua: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; cep: string | null; quando: string };

const STATUS: Record<Familia["status"], string> = { sem_resposta: "Sem resposta", bem: "Está bem", ajuda: "Precisa de ajuda" };
const PERGUNTA = "Oi! Aqui é da igreja. Soubemos da situação na sua região. Vocês estão bem? Precisam de alguma ajuda?";

export function Emergencia({ ctx }: { ctx: ContextoMapa }) {
  const db = () => createServiceBrowserClient().schema("service");
  const [atual, setAtual] = useState<Emerg | null>(null);
  const [carregou, setCarregou] = useState(false);
  const [pontos, setPontos] = useState<[number, number][]>([]);
  const [fechado, setFechado] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [filtro, setFiltro] = useState<"todas" | Familia["status"]>("todas");
  const [enderecos, setEnderecos] = useState<Record<string, Endereco>>({});
  const [ocupado, setOcupado] = useState(false);
  const [confirmaFim, setConfirmaFim] = useState(false);
  const estado = useRef({ atual, pontos, fechado });
  useEffect(() => { estado.current = { atual, pontos, fechado }; });

  useEffect(() => {
    db().rpc("mapa_emergencias", { p_org: ctx.org }).then(({ data }) => {
      const aberta = ((data ?? []) as Emerg[]).find((e) => e.status === "aberta") ?? null;
      setAtual(aberta);
      setCarregou(true);
    });
  }, [ctx.org]);

  const carregarFamilias = useCallback(async (id: string) => {
    const { data, error } = await db().rpc("mapa_emergencia_familias", { p_id: id });
    if (!error) setFamilias((data ?? []) as Familia[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga do servidor ao abrir a emergência
  useEffect(() => { if (atual) carregarFamilias(atual.id); }, [atual, carregarFamilias]);

  useEffect(() => {
    const { mapa, cores } = ctx;
    mapa.addSource("em-area", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "em-area-fill", type: "fill", source: "em-area", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": cores.alerta, "fill-opacity": 0.22 } });
    mapa.addLayer({ id: "em-area-linha", type: "line", source: "em-area", paint: { "line-color": cores.alerta, "line-width": 2.5, "line-dasharray": [3, 2] } });
    mapa.addLayer({ id: "em-area-pontos", type: "circle", source: "em-area", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": cores.papel, "circle-stroke-color": cores.alerta, "circle-stroke-width": 2.5 } });
    const clique = (e: MapMouseEvent) => {
      const s = estado.current;
      if (s.atual || s.fechado) return;
      if (s.pontos.length >= 3) {
        const p0 = mapa.project(s.pontos[0]);
        if (Math.hypot(p0.x - e.point.x, p0.y - e.point.y) < 14) { setFechado(true); return; }
      }
      setPontos((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
    };
    mapa.on("click", clique);
    return () => { mapa.off("click", clique); mapa.getCanvas().style.cursor = ""; limparCamadas(mapa, "em-"); };
  }, [ctx]);

  useEffect(() => {
    const src = ctx.mapa.getSource("em-area") as GeoJSONSource | undefined;
    ctx.mapa.getCanvas().style.cursor = atual ? "" : "crosshair";
    if (atual) {
      src?.setData({ type: "Feature", properties: {}, geometry: atual.geojson });
      const caixa = caixaDaGeometria(atual.geojson);
      if (caixa) ctx.mapa.fitBounds(caixa, { padding: { top: 90, bottom: 60, left: 60, right: 460 }, maxZoom: 16 });
      return;
    }
    const feats: GeoJSON.Feature[] = pontos.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: p } }));
    if (pontos.length >= 2) feats.unshift({ type: "Feature", properties: {}, geometry: fechado ? { type: "Polygon", coordinates: [[...pontos, pontos[0]]] } : { type: "LineString", coordinates: pontos } });
    src?.setData({ type: "FeatureCollection", features: feats });
  }, [ctx, atual, pontos, fechado]);

  const abrir = async () => {
    if (!fechado || !titulo.trim()) return;
    setOcupado(true);
    const geo: GeoJSON.Polygon = { type: "Polygon", coordinates: [[...pontos, pontos[0]]] };
    const { data, error } = await db().rpc("mapa_emergencia_abrir", { p_org: ctx.org, p_titulo: titulo.trim(), p_geojson: geo });
    setOcupado(false);
    if (error || !data) { avisar(error?.message.includes("area_grande") ? "A área passou de 30 km². Desenhe só a parte atingida." : "Não foi possível abrir a emergência.", "warn"); return; }
    setAtual({ id: data as string, titulo: titulo.trim(), status: "aberta", aberta_em: new Date().toISOString(), geojson: geo });
  };
  const marcar = async (f: Familia, status: Familia["status"]) => {
    if (!atual) return;
    setFamilias((fs) => fs.map((x) => (x.chave === f.chave ? { ...x, status, atualizado_em: new Date().toISOString() } : x)));
    const { error } = await db().rpc("mapa_emergencia_status", { p_id: atual.id, p_chave: f.chave, p_status: status });
    if (error) { avisar("Não foi possível salvar agora.", "warn"); carregarFamilias(atual.id); }
  };
  const verEndereco = async (f: Familia) => {
    if (!atual) return;
    const { data, error } = await db().rpc("mapa_revelar_endereco", { p_id: atual.id, p_member_id: f.contato_member_id });
    const e = ((data ?? []) as Omit<Endereco, "quando">[])[0];
    if (error || !e) { avisar("Não foi possível abrir o endereço.", "warn"); return; }
    setEnderecos((m) => ({ ...m, [f.chave]: { ...e, quando: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) } }));
  };
  const perguntar = async (lista: Familia[]) => {
    setOcupado(true);
    let n = 0;
    for (const f of lista) { const { data } = await db().rpc("start_dm", { p_target_member: f.contato_member_id, p_body: PERGUNTA }); if (data) n++; }
    setOcupado(false);
    avisar(n ? `Mensagem enviada para ${plural(n, "família", "famílias")}.` : "Não foi possível mandar: confira se você tem ficha de membro.", n ? "ok" : "warn");
  };
  const encerrar = async () => {
    if (!atual) return;
    const { error } = await db().rpc("mapa_emergencia_encerrar", { p_id: atual.id });
    if (error) { avisar("Não foi possível encerrar.", "warn"); return; }
    avisar("Emergência encerrada. Os endereços deixam de abrir.");
    ctx.fechar();
  };

  if (!carregou) return null;
  const pessoasTotal = familias.reduce((s, f) => s + f.pessoas, 0);
  const responderam = familias.filter((f) => f.status !== "sem_resposta").length;
  const lista = familias.filter((f) => filtro === "todas" || f.status === filtro);

  if (!atual) return (
    <>
      <div className="mp-faixa alerta" role="region" aria-label="Emergência">
        <strong>Modo emergência</strong>
        <span>{fechado ? "Área fechada. Dê um nome e abra." : "Desenhe a área atingida: clique nos cantos e no primeiro ponto para fechar."}</span>
        {pontos.length > 0 && <button type="button" className="mp-botao" onClick={() => { setFechado(false); setPontos((p) => p.slice(0, -1)); }}>Desfazer ponto</button>}
        {!fechado && pontos.length >= 3 && <button type="button" className="mp-botao" onClick={() => setFechado(true)}>Fechar área</button>}
        <button type="button" className="mp-botao" onClick={ctx.fechar}>Sair</button>
      </div>
      <aside className="mp-painel mp-dir" aria-label="Nova emergência" style={{ bottom: "auto" }}>
        <div className="mp-cab"><div className="mp-sobre">Emergência</div><h2 className="mp-titulo">O que aconteceu?</h2></div>
        <div className="mp-corpo">
          <div className="field"><label className="field-label req" htmlFor="em-titulo">Nome</label><input id="em-titulo" className="input" maxLength={80} placeholder="ex: Enchente do Rio das Pedras" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <p className="mp-fraco">Só quem coordena vê esta tela. O endereço das famílias pode ser aberto aqui, e cada abertura fica registrada com nome e hora.</p>
        </div>
        <div className="mp-pe"><button type="button" className="btn btn-pri" disabled={!fechado || !titulo.trim() || ocupado} onClick={abrir}>Abrir emergência</button></div>
      </aside>
    </>
  );

  return (
    <>
      <div className="mp-faixa alerta" role="status">
        <strong>Modo emergência</strong>
        <span>{atual.titulo}</span>
        <button type="button" className="mp-botao" onClick={ctx.fechar}>Voltar ao mapa</button>
      </div>
      <aside className="mp-painel mp-dir" aria-label="Famílias na área" style={{ width: 430 }}>
        <div className="mp-cab">
          <div className="mp-sobre" style={{ color: "var(--mapa-falta)" }}>Emergência · aberta às <span className="mp-num">{new Date(atual.aberta_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
          <h2 className="mp-titulo">{atual.titulo}</h2>
          <p className="mp-fraco" style={{ marginTop: 6 }}>Só aqui, só para quem coordena, o endereço pode ser aberto. Cada abertura fica registrada com nome e hora.</p>
          <div className="mp-kpis" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 12 }}>
            <div className="mp-kpi"><small>Famílias</small><strong>{familias.length}</strong></div>
            <div className="mp-kpi"><small>Pessoas</small><strong>{pessoasTotal}</strong></div>
            <div className="mp-kpi"><small>Responderam</small><strong>{responderam}</strong></div>
          </div>
        </div>
        <div className="mp-chips" style={{ padding: "12px 18px", borderBottom: "0.5px solid var(--border-2)" }}>
          {(["todas", "sem_resposta", "ajuda", "bem"] as const).map((v) => (
            <button key={v} type="button" className="mp-chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{v === "todas" ? "Todas" : STATUS[v]} <span className="mp-num">{v === "todas" ? familias.length : familias.filter((f) => f.status === v).length}</span></button>
          ))}
        </div>
        <div className="mp-corpo" style={{ gap: 0, padding: 0 }}>
          {lista.length === 0 && <p className="mp-fraco" style={{ padding: 18 }}>{familias.length ? "Nenhuma família neste filtro." : "Nenhuma pessoa da igreja mora na área desenhada."}</p>}
          {lista.map((f) => {
            const end = enderecos[f.chave];
            return (
              <div key={f.chave} style={{ padding: "12px 18px", borderBottom: "0.5px solid var(--border-2)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mp-pergunta">{f.nome}</div>
                    <div className="mp-fraco">{plural(f.pessoas, "pessoa")}{f.bairro ? ` · ${f.bairro}` : ""}</div>
                  </div>
                  {f.telefone && <a className="btn btn-sec btn-sm" href={`tel:${f.telefone.replace(/[^\d+]/g, "")}`} aria-label={`Ligar para ${f.nome}`}>Ligar</a>}
                </div>
                <div className="mp-seg" role="group" aria-label={`Situação de ${f.nome}`} style={{ ["--n" as string]: 3 } as React.CSSProperties}>
                  {(["sem_resposta", "bem", "ajuda"] as const).map((s) => <button key={s} type="button" aria-pressed={f.status === s} onClick={() => marcar(f, s)}>{STATUS[s]}</button>)}
                </div>
                {end ? (
                  <div className="mp-destaque" style={{ fontSize: "var(--fs-pn-13)" }}>{[[end.rua, end.numero].filter(Boolean).join(", "), end.complemento, end.bairro].filter(Boolean).join(" · ") || "Endereço não cadastrado"}<span className="mp-fraco" style={{ display: "block" }}>Aberto por você às {end.quando} · registrado</span></div>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => verEndereco(f)}>Ver endereço</button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mp-pe">
          <button type="button" className="btn btn-pri" disabled={ocupado || !familias.length} onClick={() => perguntar(familias.filter((f) => f.status === "sem_resposta"))}>Perguntar a quem não respondeu: &quot;Vocês estão bem?&quot;</button>
          <button type="button" className="btn btn-sec btn-sm" disabled={!familias.length} onClick={async () => { await db().rpc("mapa_emergencia_registrar_csv", { p_id: atual.id }); baixarCsv(`emergencia-${atual.titulo}`, ["Família", "Pessoas", "Bairro", "Situação"], familias.map((f) => [f.nome, String(f.pessoas), f.bairro ?? "", STATUS[f.status]])); }}>Baixar lista (sem endereço)</button>
          {confirmaFim
            ? <button type="button" className="btn btn-danger btn-sm" onClick={encerrar}>Encerrar de vez{familias.some((f) => f.status !== "bem") ? ` (${plural(familias.filter((f) => f.status !== "bem").length, "família ainda não está bem", "famílias ainda não estão bem")})` : ""}. Os endereços deixam de abrir.</button>
            : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmaFim(true)}>Encerrar emergência</button>}
        </div>
      </aside>
    </>
  );
}
