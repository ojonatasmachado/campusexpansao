"use client";

import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { Icon } from "../lib/icons";
import { joinDot } from "../lib/date";
import MapaBase from "../modules/mapa/MapaBase";
import { caixaDosPontos, distanciaKm, formatarDistancia, linkComoChegar, sedeComPonto, temPonto } from "../modules/mapa/geo";
import { MemberUiContext } from "./comum";
import type { M } from "./tipos";

import { Botao, botaoClasse } from "../ui/Botao";
import { Acao } from "../ui/Acao";
import { Opcao } from "../ui/Opcao";
import { Linha, Lista, linhaClasse } from "../ui/Linha";
import { Carregando } from "../ui/Estados";
import { Selo } from "../ui/Selo";
import { useTexto } from "../lib/internacional/contexto";

/* Agenda › Onde (mapa da igreja, etapa 2; G17, prancha P14): mapa cheio até
   as abas, filtros por cima e a folha "Perto de você", que sobe para a lista
   toda (toque ou arraste na alça) e abre o detalhe ao tocar. Sede, congregações e grupos são
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
const vagasDe = (l: Local) => (l.lugares ? Math.max(0, l.lugares - (l.ocupados ?? 0)) : null);

export function enderecoDoLocal(l: Local): string {
  return joinDot([l.rua, l.numero].filter(Boolean).join(", "), l.complemento, l.bairro, l.cidade);
}

export function TabOnde({ member, organizationId, onStartChat }: { member: M | null; organizationId: string; onStartChat?: StartChat }) {
  const traduzirUi = useTexto();
  const ui = useContext(MemberUiContext);
  const [locais, setLocais] = useState<Local[] | null>(null);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const mapa = useRef<MlMap | null>(null);
  const enquadrou = useRef(false);
  const [mapaPronto, setMapaPronto] = useState(false);
  const [folhaAberta, setFolhaAberta] = useState(false);
  /* o mapa vai do topo do Onde até o fim da área que rola (acima das abas):
     refaz quando a área muda de tamanho (texto maior, cabeçalho, rotação) */
  const caixa = useRef<HTMLDivElement | null>(null);
  const [altura, setAltura] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = caixa.current;
    const rola = el?.closest<HTMLElement>(".m-scroll") ?? null;
    if (!el) return;
    const medir = () => {
      if (!rola) { setAltura(Math.round(window.innerHeight - el.getBoundingClientRect().top)); return; }
      const fundo = parseFloat(getComputedStyle(rola).paddingBottom) || 0;
      const topo = el.getBoundingClientRect().top - rola.getBoundingClientRect().top + rola.scrollTop;
      setAltura(Math.max(240, Math.round(rola.clientHeight - fundo - topo)));
    };
    medir();
    const obs = new ResizeObserver(medir);
    if (rola) obs.observe(rola);
    obs.observe(document.documentElement);
    return () => obs.disconnect();
  }, []);
  const arraste = useRef<number | null>(null);
  const arrastou = useRef(false);
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
  const sede = useMemo(() => sedeComPonto(locais ?? []), [locais]);
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
    if (!enquadrou.current && locais !== null) {
      if (sede) {
        map.easeTo({ center: [sede.longitude, sede.latitude], zoom: 14, offset: [0, -Math.round((map.getContainer().clientHeight || 600) * 0.18)], duration: 0 });
        enquadrou.current = true;
      } else {
        const caixa = caixaDosPontos([...visiveis.filter(temPonto), ...(eu ? [eu] : [])]);
        /* a folha cobre a parte de baixo e os filtros a de cima: os pontos ficam no que sobra */
        const folha = Math.round((map.getContainer().clientHeight || 600) * 0.42);
        if (caixa) { map.fitBounds(caixa, { padding: { top: 72, bottom: folha + 16, left: 32, right: 32 }, maxZoom: 15, duration: 0 }); enquadrou.current = true; }
      }
    }
  }, [visiveis, eu, mapaPronto, sede, locais]);

  const semPonto = (locais ?? []).filter((l) => !temPonto(l)).length;

  return (
    <div className="onde" ref={caixa} style={altura ? { height: altura } : undefined}>
      <MapaBase
        className="onde-mapa"
        rotulo={traduzirUi("Mapa com a sede, as congregações e os {grupos}")}
        centro={sede ? [sede.longitude, sede.latitude] : undefined}
        zoom={14}
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
          return () => { mapa.current = null; enquadrou.current = false; setMapaPronto(false); };
        }}
      />
      <div className="onde-filtros" role="group" aria-label={traduzirUi("Mostrar")} inert={folhaAberta}>
        {([["tudo", traduzirUi("Tudo")], ["igrejas", traduzirUi("Igrejas")], ["grupos", traduzirUi("{Grupos}")]] as const).map(([v, l]) => (
          <Opcao key={v} aria-pressed={filtro === v} marcada={filtro === v} estilo="onde-chip" onClick={() => setFiltro(v)}>{l}</Opcao>
        ))}
      </div>

      <section className={`onde-folha${folhaAberta ? " aberta" : ""}`} aria-label={eu ? traduzirUi("Perto de você") : traduzirUi("Lugares da igreja")}>
        <Acao className="onde-puxar" aria-expanded={folhaAberta} aria-label={folhaAberta ? traduzirUi("Mostrar o mapa") : traduzirUi("Ver a lista toda")}
          aria-controls="onde-lista"
          onPointerDown={(e) => { arraste.current = e.clientY; arrastou.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerUp={(e) => { const y0 = arraste.current; arraste.current = null; if (y0 !== null && Math.abs(e.clientY - y0) > 24) { arrastou.current = true; setFolhaAberta(e.clientY < y0); } }}
          onClick={(e) => { const foiArraste = e.detail > 0 && arrastou.current; arrastou.current = false; if (!foiArraste) setFolhaAberta((v) => !v); }}>
          <span className="onde-alca" aria-hidden="true" />
        </Acao>
        <div className="onde-folha-cab">
          <h2 className="m6-lbl">{eu ? traduzirUi("Perto de você") : traduzirUi("Lugares da igreja")}</h2>
          {locais && <span className="m6-meta">{traduzirUi("{count, plural, =1 {# lugar} other {# lugares}}", { count: ordenados.length })}</span>}
        </div>
        <div className="onde-folha-lista" id="onde-lista">
          {!eu && <p className="m6-meta">{traduzirUi("Coloque seu CEP no Perfil para ver o que fica mais perto.")}</p>}
          {erro && <p className="m6-meta" role="alert">{traduzirUi("Não foi possível carregar agora. Tente de novo.")}</p>}
          {locais === null && !erro && <Carregando forma="lista" />}
          {locais && ordenados.length === 0 && <p className="m6-meta">{filtro === "grupos" ? traduzirUi("A igreja ainda não cadastrou {grupos}.") : traduzirUi("Nada cadastrado ainda.")}</p>}
          <Lista>
            {ordenados.map(({ l, km }) => {
              const vagas = vagasDe(l);
              return (
                <Acao key={l.id} className={linhaClasse({ estilo: "app" })} onClick={() => abrir(l)}>
                  <span className={`onde-marca${ehIgreja(l) ? " igreja" : ""}`} aria-hidden="true">{ehIgreja(l) && <Icon name="cruz" size={18} />}</span>
                  <span className="m6-rb">
                    <span className="m6-rt">{l.nome}</span>
                    <span className="m6-rs">{ehIgreja(l) ? (l.tipo === "sede" ? traduzirUi("Sede") : traduzirUi("Congregação")) : joinDot(l.dia, l.hora, l.lider_nome)}</span>
                  </span>
                  <span className="onde-lado">
                    {km !== null && <span className="onde-dist">{formatarDistancia(km)}</span>}
                    {vagas !== null && <Selo tamanho="toque" tom={vagas > 0 ? "ok" : "neutro"}>{vagas > 0 ? traduzirUi("{count, plural, =1 {# vaga} other {# vagas}}", { count: vagas }) : traduzirUi("Lotado")}</Selo>}
                  </span>
                </Acao>
              );
            })}
          </Lista>
          {semPonto > 0 && <p className="m6-meta">{traduzirUi("{count, plural, =1 {# lugar ainda sem endereço no mapa.} other {# lugares ainda sem endereço no mapa.}}", { count: semPonto })}</p>}
        </div>
      </section>
    </div>
  );
}

function SheetLocal({ local: l, member, eu, onStartChat }: { local: Local; member: M | null; eu: { latitude: number; longitude: number } | null; onStartChat?: StartChat }) {
  const traduzirUi = useTexto();
  const ui = useContext(MemberUiContext);
  const [enviando, setEnviando] = useState(false);
  const vagas = vagasDe(l);
  const km = eu && temPonto(l) ? distanciaKm(eu, l) : null;
  const podeFalar = !!(onStartChat && member && l.lider_member_id && l.lider_member_id !== member.id);
  const primeiroNome = (l.lider_nome ?? "").split(" ")[0];

  const falar = async (texto: string, aviso: string) => {
    if (!onStartChat || !member || !l.lider_member_id) return;
    setEnviando(true);
    const id = await onStartChat(member.id, l.lider_member_id, texto);
    setEnviando(false);
    if (!id) { ui.toast(traduzirUi("Não foi possível enviar agora. Tente de novo.")); return; }
    ui.sheet(null);
    ui.toast(aviso);
    ui.go("mensagens", null, { chatId: id });
  };

  const endereco = enderecoDoLocal(l);
  return (
    <div>
      <div className="m6-meta">{l.tipo === "sede" ? traduzirUi("Sede") : l.tipo === "congregacao" ? traduzirUi("Congregação") : joinDot(traduzirUi("{Grupo}"), l.bairro)}</div>
      <h2 className="m6-sh">{l.nome}</h2>
      <Lista>
        {(l.dia || l.hora) && <Linha estilo="app"><span className="m6-rb"><span className="m6-rs">{traduzirUi("Quando")}</span><span className="m6-rt">{joinDot(l.dia, l.hora)}</span></span></Linha>}
        {endereco && <Linha estilo="app"><span className="m6-rb"><span className="m6-rs">{traduzirUi("Onde")}</span><span className="m6-rt">{endereco}</span>{km !== null && <span className="m6-rs">{traduzirUi("{distancia} de você", { distancia: formatarDistancia(km) })}</span>}</span></Linha>}
        {l.lugares && <Linha estilo="app"><span className="m6-rb"><span className="m6-rs">{traduzirUi("Lugares")}</span><span className="m6-rt">{traduzirUi("{ocupados} de {lugares}", { ocupados: String(l.ocupados ?? 0), lugares: String(l.lugares) })} · {vagas ? traduzirUi("{count, plural, =1 {# vaga} other {# vagas}}", { count: vagas }) : traduzirUi("lotado")}</span></span></Linha>}
        {l.lider_nome && <Linha estilo="app"><span className="m6-rb"><span className="m6-rs">{traduzirUi("Quem lidera")}</span><span className="m6-rt">{l.lider_nome}</span></span></Linha>}
      </Lista>
      <div className="m6-btns col">
        {podeFalar && <Botao tamanho="toque" variante="principal" desativado={enviando} onClick={() => falar("Oi! Vi no app e queria saber mais.", traduzirUi("Mensagem enviada"))}><Icon name="conversas" size={20} />{traduzirUi("Mandar mensagem para {nome}", { nome: primeiroNome })}</Botao>}
        {podeFalar && l.tipo === "grupo" && (vagas === null || vagas > 0) && <Botao tamanho="toque" desativado={enviando} onClick={() => falar(`Oi! Quero participar: ${l.nome}.`, traduzirUi("Pedido enviado"))}>{traduzirUi("Quero participar")}</Botao>}
        {temPonto(l) && <a className={botaoClasse({ tamanho: "toque" })} href={linkComoChegar(l)} target="_blank" rel="noreferrer">{traduzirUi("Como chegar")}</a>}
      </div>
    </div>
  );
}
