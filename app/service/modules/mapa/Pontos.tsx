"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { limparCamadas, type ContextoMapa } from "./contexto";

import { Botao } from "../../ui/Botao";
import { Campo, Entrada, TextoLongo } from "../../ui/Campo";
import { Opcao } from "../../ui/Opcao";
import { Balao } from "../../ui/Balao";
import { confirmar } from "../../ui/confirmar";
import { useTexto } from "../../lib/internacional/contexto";
import { sourceText, type Text } from "../../lib/internacional/mensagens";

/* Ferramentas › Marcar lugar (G11, mapa/PLANO.md §10, prancha P11). Só marca
   lugar da igreja: tocar no mapa solta o marcador e abre o balão com nome,
   tipo, endereço (opcional) e observação. Editar, ocultar e excluir ficam no
   balão do lugar, na tela principal (MapaIgreja). Os lugares da região vêm do
   OpenStreetMap: deles só a observação se edita. */

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
/* nome na tela (o CATEGORIAS.nome acima segue no CSV) */
export const nomesDasCategorias = (t: Text): Record<string, string> => ({
  igrejas: t("Igrejas na região"), onibus: t("Parada de ônibus"), escolas: t("Escola, praça ou quadra"), saude: t("CRAS, posto de saúde, hospital ou asilo"),
  igreja_acao: t("Local de ação já feita"), igreja_casa: t("Casa que oferece espaço"), igreja_parceiro: t("Parceiro"), igreja_encontro: t("Ponto de encontro"),
});
/* tipos que a igreja marca (P11) */
const tipos = (t: Text): { id: string; nome: string; icone: string }[] => [
  { id: "igreja_acao", nome: t("Local de ação"), icone: "bandeira" },
  { id: "igreja_casa", nome: t("Casa que oferece espaço"), icone: "inicio" },
  { id: "igreja_parceiro", nome: t("Parceiro"), icone: "ok" },
  { id: "igreja_encontro", nome: t("Ponto de encontro"), icone: "mapapin" },
];
export const nomeDaCategoria = (id: string, t: Text = sourceText) => nomesDasCategorias(t)[id] ?? id;

const db = () => createServiceBrowserClient().schema("service");

export async function carregarPontos(org: string): Promise<Ponto[]> {
  const { data, error } = await db().rpc("mapa_pontos", { p_org: org });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Ponto[]).filter((p) => typeof p.latitude === "number");
}

/* ocultar ou mostrar: o lugar do OpenStreetMap ganha uma linha própria na primeira vez */
export async function ocultarLugar(org: string, pt: Ponto, oculto: boolean, t: Text) {
  const r = pt.ponto_id
    ? await db().from("map_points").update({ oculto, updated_at: new Date().toISOString() }).eq("id", pt.ponto_id)
    : await db().from("map_points").insert({ organization_id: org, nome: pt.nome || "Sem nome", categoria: pt.categoria, origem: "osm", osm_id: pt.id.replace(/^osm:/, ""), latitude: pt.latitude, longitude: pt.longitude, oculto });
  if (r.error) { avisar(t("Não foi possível salvar agora. Tente de novo."), "warn"); return false; }
  avisar(oculto ? t("Lugar oculto do mapa.") : t("Lugar de volta no mapa."));
  return true;
}

/* excluir só o que a igreja marcou à mão */
export async function excluirLugar(pt: Ponto, t: Text) {
  if (!pt.ponto_id || pt.origem !== "manual") return false;
  if (!(await confirmar({ titulo: pt.nome ? t("Excluir {nome}?", { nome: pt.nome }) : t("Excluir este lugar?"), texto: t("O lugar sai do mapa para todos. Não dá para desfazer."), acao: t("Excluir") }))) return false;
  const { error } = await db().from("map_points").delete().eq("id", pt.ponto_id);
  if (error) { avisar(t("Não foi possível excluir agora. Tente de novo."), "warn"); return false; }
  avisar(t("Lugar excluído."));
  return true;
}

type Form = { ponto?: Ponto; nome: string; categoria: string; lnglat: [number, number]; endereco: string; observacao: string };

export function Pontos({ ctx, editar }: { ctx: ContextoMapa; editar?: Ponto | null }) {
  const traduzirUi = useTexto();

  const [form, setForm] = useState<Form | null>(() => (editar ? { ponto: editar, nome: editar.nome, categoria: editar.categoria, lnglat: [editar.longitude, editar.latitude], endereco: editar.endereco ?? "", observacao: editar.observacao ?? "" } : null));
  const [salvando, setSalvando] = useState(false);
  const [marcados, setMarcados] = useState<Ponto[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number; fora: boolean } | null>(null);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; });
  const recarregar = useCallback(() => { carregarPontos(ctx.org).then((x) => setMarcados(x.filter((p) => CATEGORIAS.find((c) => c.id === p.categoria)?.grupo === "igreja" && !p.oculto))).catch(() => setMarcados([])); }, [ctx.org]);
  useEffect(() => { recarregar(); }, [recarregar]);

  /* camadas: lugares da igreja já marcados e o marcador novo */
  useEffect(() => {
    const { mapa, cores } = ctx;
    mapa.addSource("ml-lugares", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "ml-lugares", type: "symbol", source: "ml-lugares", layout: { "icon-image": "mp-lugar-igreja", "icon-size": 0.8, "icon-allow-overlap": true } });
    mapa.addSource("ml-novo", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "ml-novo-halo", type: "circle", source: "ml-novo", paint: { "circle-radius": 20, "circle-color": cores.tinta, "circle-opacity": 0.14 } });
    mapa.addLayer({ id: "ml-novo", type: "symbol", source: "ml-novo", layout: { "icon-image": "mp-lugar-igreja", "icon-size": 0.95, "icon-allow-overlap": true } });
    const clique = (e: MapMouseEvent) => {
      if (formRef.current?.ponto) return; /* editando: o toque não troca de lugar */
      setForm((f) => ({ nome: f?.nome ?? "", categoria: f?.categoria ?? "igreja_casa", endereco: f?.endereco ?? "", observacao: f?.observacao ?? "", lnglat: [e.lngLat.lng, e.lngLat.lat] }));
    };
    mapa.on("click", clique);
    mapa.getCanvas().style.cursor = "crosshair";
    return () => { mapa.off("click", clique); mapa.getCanvas().style.cursor = ""; limparCamadas(mapa, "ml-"); };
  }, [ctx]);

  useEffect(() => {
    const pt = (ll: [number, number]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: ll } });
    (ctx.mapa.getSource("ml-lugares") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: marcados.filter((p) => p.ponto_id !== form?.ponto?.ponto_id).map((p) => pt([p.longitude, p.latitude])) });
    (ctx.mapa.getSource("ml-novo") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: form ? [pt(form.lnglat)] : [] });
  }, [ctx, marcados, form]);

  /* o balão acompanha o marcador quando o mapa se move */
  const lnglat = form?.lnglat;
  useEffect(() => {
    if (!lnglat) return;
    const { mapa } = ctx;
    const projetar = () => {
      const p = mapa.project(lnglat);
      const c = mapa.getContainer();
      setPos({ x: p.x, y: p.y, fora: p.x < 0 || p.y < 0 || p.x > c.clientWidth || p.y > c.clientHeight });
    };
    projetar();
    mapa.on("move", projetar);
    return () => { mapa.off("move", projetar); };
  }, [ctx, lnglat]);

  const salvar = async () => {
    if (!form || (form.ponto?.origem !== "osm" && !form.nome.trim())) return;
    setSalvando(true);
    const agora = new Date().toISOString();
    const dados = { nome: form.nome.trim(), categoria: form.categoria, latitude: form.lnglat[1], longitude: form.lnglat[0], endereco: form.endereco.trim() || null, observacao: form.observacao.trim() || null, updated_at: agora };
    const p = form.ponto;
    const r = p?.ponto_id
      ? await db().from("map_points").update(p.origem === "osm" ? { observacao: dados.observacao, updated_at: agora } : dados).eq("id", p.ponto_id)
      : p?.origem === "osm"
        ? await db().from("map_points").insert({ organization_id: ctx.org, origem: "osm", osm_id: p.id.replace(/^osm:/, ""), ...dados, nome: p.nome, categoria: p.categoria, latitude: p.latitude, longitude: p.longitude })
        : await db().from("map_points").insert({ organization_id: ctx.org, origem: "manual", ...dados });
    setSalvando(false);
    if (r.error) { avisar(traduzirUi("Não foi possível salvar o lugar. Tente de novo."), "warn"); return; }
    avisar(p ? traduzirUi("Lugar atualizado.") : traduzirUi("{nome} marcado no mapa.", { nome: dados.nome }));
    if (p) { ctx.fechar(); return; }
    setForm(null);
    recarregar();
  };

  const osm = form?.ponto?.origem === "osm";
  return (
    <>
      <div className="mp-dica" role="status">
        <span className="mp-dica-ic" aria-hidden="true"><Icon name="marcarlugar" size={16} stroke={2} /></span>
        <span>{form?.ponto ? (form.ponto.nome ? traduzirUi("Editando {nome}.", { nome: form.ponto.nome }) : traduzirUi("Editando o lugar.")) : traduzirUi("Toque no mapa onde fica o lugar.")}</span>
        <Botao compacto onClick={ctx.fechar}>{traduzirUi("Concluir")}</Botao>
      </div>
      {form && pos && (
        <Balao x={pos.x} y={pos.y} oculto={pos.fora && !ctx.celular} folha={ctx.celular} largura={340}
          sobretitulo={osm ? traduzirUi("OpenStreetMap · só a observação muda") : form.ponto ? traduzirUi("Lugar da igreja") : traduzirUi("Novo lugar da igreja")}
          titulo={form.nome.trim() || (form.ponto?.nome ?? "") || traduzirUi("Lugar sem nome")}
          aoFechar={() => (form.ponto ? ctx.fechar() : setForm(null))}
          rodape={(
            <>
              <Botao onClick={() => (form.ponto ? ctx.fechar() : setForm(null))}>{traduzirUi("Cancelar")}</Botao>
              <Botao variante="principal" className="ml-salvar" desativado={salvando || (!osm && !form.nome.trim())} onClick={salvar}>{form.ponto ? traduzirUi("Salvar") : traduzirUi("Marcar lugar")}</Botao>
            </>
          )}>
          {!osm && <Campo rotulo={traduzirUi("Nome")} obrigatorio id="ml-nome"><Entrada maxLength={80} value={form.nome} placeholder={traduzirUi("ex: Casa da Dona Lúcia")} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Campo>}
          {!osm && (
            <div className="ml-tipos-campo">
              <span className="field-label" id="ml-tipo-r">{traduzirUi("Tipo")}</span>
              <div className="ml-tipos" role="group" aria-labelledby="ml-tipo-r">
                {tipos(traduzirUi).map((t) => (
                  <Opcao key={t.id} className="ml-tipo" marcada={form.categoria === t.id} onClick={() => setForm({ ...form, categoria: t.id })}>
                    <span className="ml-tipo-ic" aria-hidden="true"><Icon name={t.icone} size={16} stroke={2} /></span>{t.nome}
                  </Opcao>
                ))}
              </div>
            </div>
          )}
          {!osm && <Campo rotulo={traduzirUi("Endereço")} id="ml-end"><Entrada maxLength={160} placeholder={traduzirUi("Opcional")} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></Campo>}
          <Campo rotulo={traduzirUi("Observação")} id="ml-obs"><TextoLongo rows={2} maxLength={500} placeholder={traduzirUi("ex: cabe 20 pessoas, tem quintal")} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></Campo>
        </Balao>
      )}
    </>
  );
}
