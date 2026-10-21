"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { Icon } from "../lib/icons";
import { joinDot } from "../lib/date";
import { plural } from "../lib/plural";
import { useTermos } from "../lib/vocabulario-context";
import MapaBase from "../modules/mapa/MapaBase";
import { caixaDosPontos, distanciaKm, formatarDistancia, linkComoChegar, temPonto } from "../modules/mapa/geo";
import { MemberUiContext } from "./comum";
import type { M } from "./tipos";

/* Agenda › Onde (mapa da igreja, etapa 2). Sede, congregações e grupos são
   públicos para quem é da igreja: endereço, horário, líder e vagas. Nenhuma
   pessoa aparece aqui, só o ponto "você" do próprio CEP. */

type Local = {
  tipo: "sede" | "congregacao" | "grupo"; id: string; nome: string; dia: string | null; hora: string | null;
  rua: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null;
  latitude: number | null; longitude: number | null;
  lider_nome: string | null; lider_member_id: string | null; lugares: number | null; ocupados: number | null;
};
type Filtro = "tudo" | "igrejas" | "grupos";
type StartChat = (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;

const ehIgreja = (l: Local) => l.tipo !== "grupo";

export function enderecoDoLocal(l: Local): string {
  return joinDot([l.rua, l.numero].filter(Boolean).join(", "), l.complemento, l.bairro, l.cidade);
}

export function TabOnde({ member, organizationId, onStartChat }: { member: M | null; organizationId: string; onStartChat?: StartChat }) {
  const ui = useContext(MemberUiContext);
  const { comTermos: ct } = useTermos();
  const [locais, setLocais] = useState<Local[] | null>(null);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const mapa = useRef<MlMap | null>(null);
  const [mapaPronto, setMapaPronto] = useState(false);
  const locaisRef = useRef<Local[]>([]);
  useEffect(() => { locaisRef.current = locais ?? []; }, [locais]);

  useEffect(() => {
    let vivo = true;
    createServiceBrowserClient().schema("service").rpc("mapa_locais_publicos", { p_org: organizationId }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { setErro(true); return; }
      setLocais((data ?? []) as Local[]);
    });
    return () => { vivo = false; };
  }, [organizationId]);

  /* memorizado pelos números: um objeto novo a cada render reenquadraria o mapa e desfaria o zoom da pessoa */
  const euLat = member?.latitude ?? null;
  const euLng = member?.longitude ?? null;
  const eu = useMemo(() => (typeof euLat === "number" && typeof euLng === "number" ? { latitude: euLat, longitude: euLng } : null), [euLat, euLng]);
  const visiveis = useMemo(() => (locais ?? []).filter((l) => filtro === "tudo" || (filtro === "igrejas") === ehIgreja(l)), [locais, filtro]);
  const ordenados = useMemo(() => {
    const comDist = visiveis.map((l) => ({ l, km: eu && temPonto(l) ? distanciaKm(eu, l) : null }));
    return comDist.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.l.nome.localeCompare(b.l.nome));
  }, [visiveis, eu]);

  const abrir = (l: Local) => ui.sheet(<SheetLocal local={l} member={member} eu={eu} onStartChat={onStartChat} />);
  const abrirRef = useRef(abrir);
  useEffect(() => { abrirRef.current = abrir; });

  /* camadas do mapa: muda quando muda o filtro ou chegam os dados */
  useEffect(() => {
    const map = mapa.current;
    const fonte = map?.getSource("onde-locais") as GeoJSONSource | undefined;
    if (!map || !fonte) return;
    fonte.setData({
      type: "FeatureCollection",
      features: visiveis.filter(temPonto).map((l) => ({ type: "Feature", properties: { id: l.id, igreja: ehIgreja(l) }, geometry: { type: "Point", coordinates: [l.longitude, l.latitude] } })),
    });
    const caixa = caixaDosPontos([...visiveis.filter(temPonto), ...(eu ? [eu] : [])]);
    if (caixa) map.fitBounds(caixa, { padding: 48, maxZoom: 15, duration: 0 });
  }, [visiveis, eu, mapaPronto]);

  const semPonto = (locais ?? []).filter((l) => !temPonto(l)).length;

  return (
    <div className="onde">
      <div className="onde-filtros" role="group" aria-label="Mostrar">
        {([["tudo", "Tudo"], ["igrejas", "Igrejas"], ["grupos", ct("{Grupos}")]] as const).map(([v, l]) => (
          <button key={v} type="button" aria-pressed={filtro === v} className={`onde-chip${filtro === v ? " on" : ""}`} onClick={() => setFiltro(v)}>{l}</button>
        ))}
      </div>
      <MapaBase
        className="onde-mapa"
        rotulo={ct("Mapa com a sede, as congregações e os {grupos}")}
        centro={eu ? [eu.longitude, eu.latitude] : undefined}
        zoom={eu ? 13 : 11}
        onPronto={({ map, cores }) => {
          mapa.current = map;
          map.addSource("onde-locais", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: "onde-grupos", type: "circle", source: "onde-locais", filter: ["!", ["get", "igreja"]], paint: { "circle-radius": 8, "circle-color": cores.papel, "circle-stroke-color": cores.tinta, "circle-stroke-width": 2.5 } });
          map.addLayer({ id: "onde-igrejas", type: "circle", source: "onde-locais", filter: ["get", "igreja"], paint: { "circle-radius": 11, "circle-color": cores.tinta, "circle-stroke-color": cores.papel, "circle-stroke-width": 3 } });
          if (eu) {
            map.addSource("onde-eu", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [eu.longitude, eu.latitude] } } });
            map.addLayer({ id: "onde-eu-halo", type: "circle", source: "onde-eu", paint: { "circle-radius": 22, "circle-color": cores.tinta, "circle-opacity": 0.08 } });
            map.addLayer({ id: "onde-eu", type: "circle", source: "onde-eu", paint: { "circle-radius": 7, "circle-color": cores.papel, "circle-stroke-color": cores.tinta, "circle-stroke-width": 3 } });
          }
          const clique = (e: { features?: { properties?: Record<string, unknown> }[] }) => {
            const id = e.features?.[0]?.properties?.id;
            const l = locaisRef.current.find((x) => x.id === id) ?? null;
            if (l) abrirRef.current(l);
          };
          for (const camada of ["onde-grupos", "onde-igrejas"]) {
            map.on("click", camada, clique);
            map.on("mouseenter", camada, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", camada, () => { map.getCanvas().style.cursor = ""; });
          }
          /* dados chegaram antes do mapa: desenha agora */
          setMapaPronto(true);
          return () => { mapa.current = null; setMapaPronto(false); };
        }}
      />

      <div className="m6-sec">
        <div className="m6-lbl">{eu ? "Perto de você" : "Lugares da igreja"}</div>
        {!eu && <p className="m6-meta">Coloque seu CEP no Perfil para ver o que fica mais perto.</p>}
        {erro && <p className="m6-meta" role="alert">Não foi possível carregar agora. Tente de novo.</p>}
        {locais === null && !erro && <p className="m6-meta" role="status">Carregando...</p>}
        {locais && ordenados.length === 0 && <p className="m6-meta">{filtro === "grupos" ? ct("A igreja ainda não cadastrou {grupos}.") : "Nada cadastrado ainda."}</p>}
        <div className="m6-list">
          {ordenados.map(({ l, km }) => (
            <button key={l.id} type="button" className="m6-row" onClick={() => abrir(l)}>
              <span className={`onde-marca${ehIgreja(l) ? " igreja" : ""}`} aria-hidden="true">{ehIgreja(l) && <Icon name="cruz" size={18} />}</span>
              <span className="m6-rb">
                <span className="m6-rt">{l.nome}</span>
                <span className="m6-rs">{ehIgreja(l) ? (l.tipo === "sede" ? "Sede" : "Congregação") : joinDot(l.dia, l.hora, l.lider_nome)}</span>
              </span>
              {km !== null && <span className="onde-dist">{formatarDistancia(km)}</span>}
            </button>
          ))}
        </div>
        {semPonto > 0 && <p className="m6-meta">{plural(semPonto, "lugar ainda sem endereço", "lugares ainda sem endereço")} no mapa.</p>}
      </div>
    </div>
  );
}

function SheetLocal({ local: l, member, eu, onStartChat }: { local: Local; member: M | null; eu: { latitude: number; longitude: number } | null; onStartChat?: StartChat }) {
  const ui = useContext(MemberUiContext);
  const { comTermos: ct } = useTermos();
  const [enviando, setEnviando] = useState(false);
  const vagas = l.lugares ? Math.max(0, l.lugares - (l.ocupados ?? 0)) : null;
  const km = eu && temPonto(l) ? distanciaKm(eu, l) : null;
  const podeFalar = !!(onStartChat && member && l.lider_member_id && l.lider_member_id !== member.id);
  const primeiroNome = (l.lider_nome ?? "").split(" ")[0];

  const falar = async (texto: string, aviso: string) => {
    if (!onStartChat || !member || !l.lider_member_id) return;
    setEnviando(true);
    const id = await onStartChat(member.id, l.lider_member_id, texto);
    setEnviando(false);
    if (!id) { ui.toast("Não foi possível enviar agora. Tente de novo."); return; }
    ui.sheet(null);
    ui.toast(aviso);
    ui.go("mensagens", null, { chatId: id });
  };

  const endereco = enderecoDoLocal(l);
  return (
    <div>
      <div className="m6-meta">{l.tipo === "sede" ? "Sede" : l.tipo === "congregacao" ? "Congregação" : joinDot(ct("{Grupo}"), l.bairro)}</div>
      <h2 className="m6-sh">{l.nome}</h2>
      <div className="m6-list">
        {(l.dia || l.hora) && <div className="m6-row"><span className="m6-rb"><span className="m6-rs">Quando</span><span className="m6-rt">{joinDot(l.dia, l.hora)}</span></span></div>}
        {endereco && <div className="m6-row"><span className="m6-rb"><span className="m6-rs">Onde</span><span className="m6-rt">{endereco}</span>{km !== null && <span className="m6-rs">{formatarDistancia(km)} de você</span>}</span></div>}
        {l.lugares && <div className="m6-row"><span className="m6-rb"><span className="m6-rs">Lugares</span><span className="m6-rt">{`${l.ocupados ?? 0} de ${l.lugares}`} · {vagas ? plural(vagas, "vaga") : "lotado"}</span></span></div>}
        {l.lider_nome && <div className="m6-row"><span className="m6-rb"><span className="m6-rs">Quem lidera</span><span className="m6-rt">{l.lider_nome}</span></span></div>}
      </div>
      <div className="m6-btns col">
        {podeFalar && <button className="m6-btn pri" type="button" disabled={enviando} onClick={() => falar("Oi! Vi no app e queria saber mais.", "Mensagem enviada")}><Icon name="conversas" size={20} />Mandar mensagem para {primeiroNome}</button>}
        {podeFalar && l.tipo === "grupo" && (vagas === null || vagas > 0) && <button className="m6-btn sec" type="button" disabled={enviando} onClick={() => falar(`Oi! Quero participar: ${l.nome}.`, "Pedido enviado")}>Quero participar</button>}
        {temPonto(l) && <a className="m6-btn sec" href={linkComoChegar(l)} target="_blank" rel="noreferrer">Como chegar</a>}
      </div>
    </div>
  );
}
