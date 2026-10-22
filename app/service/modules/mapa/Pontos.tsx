"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { limparCamadas, type ContextoMapa } from "./contexto";

/* Pontos de interesse (tela 10 do design). Desligados por padrão; do
   OpenStreetMap (atualizados todo mês) ou adicionados à mão. Cada ponto
   mostra a origem e tem editar, ocultar e excluir (excluir só os manuais). */

export type Ponto = { id: string; nome: string; categoria: string; origem: "osm" | "manual"; latitude: number; longitude: number; endereco: string | null; observacao: string | null; oculto: boolean; ponto_id: string | null };

export const CATEGORIAS: { id: string; nome: string; grupo: "igrejas" | "onibus" | "escolas" | "saude" | "igreja" }[] = [
  { id: "igrejas", nome: "Igrejas na região", grupo: "igrejas" },
  { id: "onibus", nome: "Parada de ônibus", grupo: "onibus" },
  { id: "escolas", nome: "Escola, praça ou quadra", grupo: "escolas" },
  { id: "saude", nome: "CRAS, posto de saúde, hospital ou asilo", grupo: "saude" },
  { id: "igreja_acao", nome: "Pontos da igreja · Local de ação já feita", grupo: "igreja" },
  { id: "igreja_casa", nome: "Pontos da igreja · Casa que oferece espaço", grupo: "igreja" },
  { id: "igreja_parceiro", nome: "Pontos da igreja · Parceiro", grupo: "igreja" },
  { id: "igreja_encontro", nome: "Pontos da igreja · Ponto de encontro", grupo: "igreja" },
];
const GRUPOS = [
  { id: "igrejas", nome: "Igrejas na região" },
  { id: "onibus", nome: "Ônibus: paradas" },
  { id: "escolas", nome: "Escolas, praças e quadras" },
  { id: "saude", nome: "Assistência e saúde" },
  { id: "igreja", nome: "Pontos da igreja" },
] as const;
const grupoDe = (categoria: string) => CATEGORIAS.find((c) => c.id === categoria)?.grupo ?? "igreja";

export async function carregarPontos(org: string): Promise<Ponto[]> {
  const { data, error } = await createServiceBrowserClient().schema("service").rpc("mapa_pontos", { p_org: org });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Ponto[]).filter((p) => typeof p.latitude === "number");
}

export function Pontos({ ctx, soCamada = false }: { ctx: ContextoMapa; soCamada?: boolean }) {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [ligados, setLigados] = useState<Set<string>>(() => new Set(soCamada ? ["escolas", "saude", "igreja"] : ["igreja"]));
  const [verOcultos, setVerOcultos] = useState(false);
  const [aberto, setAberto] = useState<Ponto | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [form, setForm] = useState<null | { ponto?: Ponto; nome: string; categoria: string; local: [number, number] | null; endereco: string; observacao: string }>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const db = () => createServiceBrowserClient().schema("service");
  const recarregar = useCallback(() => { carregarPontos(ctx.org).then(setPontos).catch(() => setPontos([])); }, [ctx.org]);
  useEffect(() => { recarregar(); }, [recarregar]);
  const estado = useRef({ escolhendo, pontos });
  useEffect(() => { estado.current = { escolhendo, pontos }; });

  useEffect(() => {
    const { mapa, cores } = ctx;
    const p = soCamada ? "pc-" : "pm-";
    mapa.addSource(`${p}pontos`, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: `${p}pontos`, type: "circle", source: `${p}pontos`, paint: {
      "circle-radius": ["case", ["==", ["get", "grupo"], "igreja"], 8, 6],
      "circle-color": ["case", ["==", ["get", "grupo"], "igreja"], cores.tinta, cores.papel],
      "circle-stroke-color": ["case", ["==", ["get", "grupo"], "igreja"], cores.papel, cores.poi],
      "circle-stroke-width": 2, "circle-opacity": ["case", ["get", "oculto"], 0.35, 1],
    } });
    const clique = (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => {
      const id = e.features?.[0]?.properties?.id;
      const pt = estado.current.pontos.find((x) => x.id === id);
      if (pt && !estado.current.escolhendo) setAberto(pt);
    };
    mapa.on("click", `${p}pontos`, clique);
    return () => { mapa.off("click", `${p}pontos`, clique); limparCamadas(mapa, p); };
  }, [ctx, soCamada]);

  useEffect(() => {
    const p = soCamada ? "pc-" : "pm-";
    const vis = pontos.filter((x) => ligados.has(grupoDe(x.categoria)) && (verOcultos || !x.oculto));
    (ctx.mapa.getSource(`${p}pontos`) as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: vis.map((x) => ({ type: "Feature", properties: { id: x.id, grupo: grupoDe(x.categoria), oculto: x.oculto }, geometry: { type: "Point", coordinates: [x.longitude, x.latitude] } })),
    });
  }, [ctx, pontos, ligados, verOcultos, soCamada]);

  /* "clicar no mapa" do formulário */
  useEffect(() => {
    if (!escolhendo) return;
    const { mapa } = ctx;
    mapa.getCanvas().style.cursor = "crosshair";
    const pegar = (e: MapMouseEvent) => { setForm((f) => (f ? { ...f, local: [e.lngLat.lng, e.lngLat.lat] } : f)); setEscolhendo(false); };
    mapa.once("click", pegar);
    return () => { mapa.off("click", pegar); mapa.getCanvas().style.cursor = ""; };
  }, [ctx, escolhendo]);

  if (soCamada) return null;

  const ocultar = async (pt: Ponto, oculto: boolean) => {
    setMenu(null);
    const r = pt.ponto_id
      ? await db().from("map_points").update({ oculto, updated_at: new Date().toISOString() }).eq("id", pt.ponto_id)
      : await db().from("map_points").insert({ organization_id: ctx.org, nome: pt.nome || "Sem nome", categoria: pt.categoria, origem: "osm", osm_id: pt.id.replace(/^osm:/, ""), latitude: pt.latitude, longitude: pt.longitude, oculto });
    if (r.error) { avisar("Não foi possível salvar agora.", "warn"); return; }
    avisar(oculto ? "Ponto oculto." : "Ponto de volta no mapa.");
    recarregar();
  };
  const excluir = async (pt: Ponto) => {
    setMenu(null);
    if (!pt.ponto_id || pt.origem !== "manual") return;
    setConfirmar(null);
    const { error } = await db().from("map_points").delete().eq("id", pt.ponto_id);
    if (error) { avisar("Não foi possível excluir agora.", "warn"); return; }
    setAberto(null);
    avisar("Ponto excluído.");
    recarregar();
  };
  const salvar = async () => {
    if (!form || !form.nome.trim() || !form.local) return;
    setSalvando(true);
    const dados = { nome: form.nome.trim(), categoria: form.categoria, latitude: form.local[1], longitude: form.local[0], endereco: form.endereco.trim() || null, observacao: form.observacao.trim() || null, updated_at: new Date().toISOString() };
    const r = form.ponto?.ponto_id
      ? await db().from("map_points").update(form.ponto.origem === "osm" ? { observacao: dados.observacao, updated_at: dados.updated_at } : dados).eq("id", form.ponto.ponto_id)
      : form.ponto?.origem === "osm"
        ? await db().from("map_points").insert({ organization_id: ctx.org, origem: "osm", osm_id: form.ponto.id.replace(/^osm:/, ""), ...dados })
        : await db().from("map_points").insert({ organization_id: ctx.org, origem: "manual", ...dados });
    setSalvando(false);
    if (r.error) { avisar("Não foi possível salvar o ponto.", "warn"); return; }
    avisar(form.ponto ? "Ponto atualizado." : "Ponto adicionado.");
    setForm(null);
    recarregar();
  };
  const podeEditar = ctx.acesso.pode_editar;
  const contagem = (g: string) => pontos.filter((x) => grupoDe(x.categoria) === g && !x.oculto).length;
  const lista = pontos.filter((x) => ligados.has(grupoDe(x.categoria)) && (verOcultos || !x.oculto)).slice(0, 60);

  return (
    <>
      <div className="mp-faixa" role="region" aria-label="Pontos de interesse">
        <strong>Pontos de interesse</strong>
        {escolhendo && <span className="mp-texto">Clique no mapa onde fica o ponto.</span>}
        <button type="button" className="mp-botao" onClick={ctx.fechar}>Sair</button>
      </div>
      <aside className="mp-painel mp-esq aberto" aria-label="Pontos de interesse">
        <div className="mp-cab"><h2 className="mp-titulo">Pontos de interesse</h2><p className="mp-fraco" style={{ marginTop: 4 }}>Ligue só o que ajudar agora.</p></div>
        <div className="mp-corpo">
          {GRUPOS.map((g) => (
            <label key={g.id} className="mp-linha"><span>{g.nome}{g.id === "igrejas" ? <span className="mp-fraco"> · só liderança</span> : null}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-num mp-fraco">{contagem(g.id)}</span>
                <button type="button" role="switch" aria-checked={ligados.has(g.id)} aria-label={g.nome} className={`sw${ligados.has(g.id) ? " on" : ""}`} onClick={() => setLigados((atuais) => { const n = new Set(atuais); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })} />
              </span>
            </label>
          ))}
          <label className="mp-linha">Mostrar os ocultos<button type="button" role="switch" aria-checked={verOcultos} aria-label="Mostrar os ocultos" className={`sw${verOcultos ? " on" : ""}`} onClick={() => setVerOcultos((v) => !v)} /></label>
          {pontos.length === 0 && <p className="mp-fraco">Ainda sem pontos do OpenStreetMap para esta cidade. Eles chegam na próxima atualização mensal. Pontos da igreja você adiciona abaixo.</p>}
          <div>
            {lista.map((pt) => (
              <div key={pt.id} className="mp-lista-pessoa" style={{ position: "relative" }}>
                <button type="button" style={{ all: "unset", cursor: "pointer", flex: 1 }} onClick={() => { setAberto(pt); ctx.mapa.easeTo({ center: [pt.longitude, pt.latitude], zoom: 16 }); }}>
                  <span style={{ display: "block", opacity: pt.oculto ? 0.6 : 1 }}>{pt.nome || "Sem nome"}</span>
                  <span className="mp-fraco">{CATEGORIAS.find((c) => c.id === pt.categoria)?.nome.replace("Pontos da igreja · ", "")} · {pt.origem === "osm" ? "OpenStreetMap" : "manual"}{pt.oculto ? " · oculto" : ""}</span>
                </button>
                {podeEditar && <button type="button" className="mp-fechar" aria-label={`Ações de ${pt.nome}`} aria-expanded={menu === pt.id} onClick={() => setMenu((m) => (m === pt.id ? null : pt.id))}><Icon name="menu" size={14} /></button>}
                {menu === pt.id && (
                  <div className="mp-menu" role="menu" style={{ top: 40, width: 180 }}>
                    <button type="button" role="menuitem" onClick={() => { setMenu(null); setForm({ ponto: pt, nome: pt.nome, categoria: pt.categoria, local: [pt.longitude, pt.latitude], endereco: pt.endereco ?? "", observacao: pt.observacao ?? "" }); }}>Editar</button>
                    <button type="button" role="menuitem" onClick={() => ocultar(pt, !pt.oculto)}>{pt.oculto ? "Mostrar no mapa" : "Ocultar do mapa"}</button>
                    {pt.origem === "manual" && (confirmar === pt.id
                      ? <button type="button" role="menuitem" style={{ color: "var(--danger)" }} onClick={() => excluir(pt)}>Excluir de vez (não dá para desfazer)</button>
                      : <button type="button" role="menuitem" style={{ color: "var(--danger)" }} onClick={() => setConfirmar(pt.id)}>Excluir</button>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {podeEditar && <div className="mp-pe"><button type="button" className="btn btn-sec" onClick={() => setForm({ nome: "", categoria: "igreja_acao", local: null, endereco: "", observacao: "" })}>+ Adicionar ponto</button></div>}
      </aside>

      {aberto && !form && (
        <aside className="mp-painel mp-dir" aria-label={aberto.nome} style={{ bottom: "auto" }}>
          <div className="mp-cab" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div><div className="mp-sobre">{CATEGORIAS.find((c) => c.id === aberto.categoria)?.nome.replace("Pontos da igreja · ", "")}</div><h2 className="mp-titulo">{aberto.nome || "Sem nome"}</h2></div>
            <button type="button" className="mp-fechar" aria-label="Fechar" onClick={() => setAberto(null)}><Icon name="recusou" size={14} /></button>
          </div>
          <div className="mp-corpo">
            <dl className="mp-dados">
              <dt>Origem</dt><dd>{aberto.origem === "osm" ? "OpenStreetMap" : "Adicionado à mão"}</dd>
              {aberto.endereco && <><dt>Endereço</dt><dd>{aberto.endereco}</dd></>}
            </dl>
            {aberto.observacao && <p className="mp-texto">{aberto.observacao}</p>}
          </div>
          {podeEditar && (
            <div className="mp-pe" style={{ flexDirection: "row" }}>
              <button type="button" className="btn btn-sec btn-sm" onClick={() => setForm({ ponto: aberto, nome: aberto.nome, categoria: aberto.categoria, local: [aberto.longitude, aberto.latitude], endereco: aberto.endereco ?? "", observacao: aberto.observacao ?? "" })}>Editar</button>
              <button type="button" className="btn btn-sec btn-sm" onClick={() => ocultar(aberto, !aberto.oculto)}>{aberto.oculto ? "Mostrar" : "Ocultar"}</button>
            </div>
          )}
        </aside>
      )}

      {form && !escolhendo && (
        <div className="modal-bg" onClick={() => setForm(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mp-ponto-t" style={{ width: 520, maxWidth: "calc(100% - 32px)", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="mp-cab" style={{ display: "flex", justifyContent: "space-between" }}><h2 id="mp-ponto-t" className="mp-titulo">{form.ponto ? "Editar ponto" : "Adicionar ponto"}</h2><button type="button" className="mp-fechar" aria-label="Fechar" onClick={() => setForm(null)}><Icon name="recusou" size={14} /></button></div>
            <div className="mp-corpo">
              <div className="field"><label className="field-label req" htmlFor="pt-nome">Nome</label><input id="pt-nome" className="input" maxLength={80} value={form.nome} disabled={form.ponto?.origem === "osm"} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="field">
                <label className="field-label" htmlFor="pt-cat">Categoria</label>
                <select id="pt-cat" className="input" value={form.categoria} disabled={form.ponto?.origem === "osm"} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              {form.ponto?.origem !== "osm" && (
                <div className="field">
                  <span className="field-label req">Onde fica</span>
                  <div className="mp-dados" style={{ alignItems: "center" }}>
                    <dt>{form.local ? "Marcado no mapa" : "Ainda não marcado"}</dt>
                    <dd><button type="button" className="btn btn-sec btn-sm" onClick={() => setEscolhendo(true)}>{form.local ? "Mudar" : "Clicar no mapa"}</button></dd>
                  </div>
                  <input className="input" style={{ marginTop: 8 }} placeholder="Endereço (opcional)" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} aria-label="Endereço" />
                </div>
              )}
              <div className="field"><label className="field-label" htmlFor="pt-obs">Observação</label><textarea id="pt-obs" className="input" rows={3} maxLength={500} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
              <p className="mp-fraco">Origem: {form.ponto?.origem === "osm" ? "OpenStreetMap (nome e local vêm de lá)" : "adicionado à mão"}</p>
            </div>
            <div className="mp-pe" style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-sec" onClick={() => setForm(null)}>Cancelar</button>
              <button type="button" className="btn btn-pri" disabled={salvando || !form.nome.trim() || !form.local} onClick={salvar}>{form.ponto ? "Salvar" : "Adicionar"}</button>
            </div>
          </div>
        </div>
      )}
      {lista.length === 60 && <p className="mp-fraco" style={{ position: "absolute", left: 332, bottom: 16, zIndex: 3 }}>Mostrando 60. Aproxime o mapa ou ligue menos categorias. Total: {plural(pontos.length, "ponto")}.</p>}
    </>
  );
}
