"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MlMap, GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { useTermos } from "../../lib/vocabulario-context";
import MapaBase from "./MapaBase";
import { ligarPredios3D, type CorMapa } from "./estilo";
import { caixaDaGeometria, caixaDosPontos, circulo, dentroDe, distanciaKm, formatarDistancia, mascaraFora, temPonto, type Ponto } from "./geo";
import {
  carregarAcesso, carregarAreas, carregarCidade, carregarLocais, carregarPessoas, carregarRegioes, carregarTotais,
  type Acesso, type Area, type Cidade, type LocalMapa, type PessoaMapa, type Regiao, type Totais,
} from "./dados";
import { LEITURA, LEITURA_BAIRRO, SITUACAO, frenteCidade, milhar, pessoasNaRegiao, umACada } from "./linguagem";
import type { ContextoMapa, PessoaLider } from "./contexto";
import { CriarArea } from "./CriarArea";
import { Rota } from "./Rota";
import { Emergencia } from "./Emergencia";
import { LinhaDoTempo } from "./LinhaDoTempo";
import { Pontos } from "./Pontos";
import { Mesa } from "./Mesa";
import { LiberarMapa } from "./LiberarMapa";

import { Botao, BotaoIcone } from "../../ui/Botao";
import { Interruptor } from "../../ui/Interruptor";
import { Acao } from "../../ui/Acao";
import { Avatar } from "../../ui/Avatar";
/* Painel › Pessoas › Mapa da igreja (PLANO.md, telas 1 e 3 do design).
   Visões prontas em vez de 12 interruptores; camadas e filtros ficam em
   "Personalizar". Ferramentas abrem os modos sobre o mesmo mapa. */

type Visao = "pessoas" | "falta" | "celulas" | "regiao";
type Camadas = { pessoas: boolean; igrejas: boolean; celulas: boolean; areas: boolean; raios: boolean; descobertos: boolean; calor: boolean; regioes: boolean; pontos: boolean };
type Selecao = { tipo: "pessoa"; p: PessoaMapa } | { tipo: "regiao"; r: Regiao } | { tipo: "local"; l: LocalMapa } | { tipo: "area"; a: Area } | null;
type Modo = null | "area" | "rota" | "emergencia" | "linha" | "pontos";

const PRESETS: Record<Visao, Camadas> = {
  pessoas: { pessoas: true, igrejas: true, celulas: true, areas: true, raios: false, descobertos: false, calor: false, regioes: false, pontos: false },
  falta: { pessoas: true, igrejas: true, celulas: false, areas: false, raios: false, descobertos: false, calor: false, regioes: true, pontos: false },
  celulas: { pessoas: true, igrejas: true, celulas: true, areas: false, raios: false, descobertos: true, calor: false, regioes: false, pontos: false },
  regiao: { pessoas: false, igrejas: true, celulas: true, areas: true, raios: false, descobertos: false, calor: false, regioes: false, pontos: true },
};
const DESCOBERTO_KM = 2;
const vazio = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });

export function MapaIgreja({ organizationId, churchName, people: pessoasDoPainel, podeLiberar, onAbrirMembro, onMensagem }: {
  organizationId: string;
  churchName: string;
  people: PessoaLider[];
  podeLiberar: boolean;
  onAbrirMembro: (memberId: string) => void;
  onMensagem: (memberId: string) => void;
}) {
  const { comTermos: ct } = useTermos();
  /* a lista chega nova a cada render do painel: só troca quando muda de fato */
  const chavePessoas = pessoasDoPainel.map((p) => `${p.id}:${p.name}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const people = useMemo(() => pessoasDoPainel, [chavePessoas]);
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [erro, setErro] = useState("");
  const [pessoas, setPessoas] = useState<PessoaMapa[]>([]);
  const [locais, setLocais] = useState<LocalMapa[]>([]);
  const [totais, setTotais] = useState<Totais | null>(null);
  const [cidade, setCidade] = useState<Cidade | null>(null);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [nivel, setNivel] = useState<"bairro" | "setor">("bairro");
  const [visao, setVisao] = useState<Visao>("pessoas");
  const [camadas, setCamadas] = useState<Camadas>(PRESETS.pessoas);
  const [personalizar, setPersonalizar] = useState(false);
  const [filtroSit, setFiltroSit] = useState<"todos" | "membro" | "novo">("todos");
  const [soSemGrupo, setSoSemGrupo] = useState(false);
  const [sel, setSel] = useState<Selecao>(null);
  const [modo, setModo] = useState<Modo>(null);
  const [tela, setTela] = useState<"mapa" | "mesa" | "liberar">("mapa");
  const [mesaRegioes, setMesaRegioes] = useState<string[]>([]);
  const [mesaNivel, setMesaNivel] = useState<"bairro" | "setor" | "area">("bairro");
  const [ferramentas, setFerramentas] = useState(false);
  const [busca, setBusca] = useState("");
  const [tip, setTip] = useState<{ x: number; y: number; r: Regiao } | null>(null);
  const [verTodos, setVerTodos] = useState(false);
  const [painelVer, setPainelVer] = useState(false);
  const [tres, setTres] = useState(false);
  const [mapa, setMapa] = useState<{ map: MlMap; cores: Record<CorMapa, string> } | null>(null);
  const [areaInicial, setAreaInicial] = useState<string[]>([]);

  /* ── dados ── */
  const carregar = useCallback(async () => {
    try {
      const a = await carregarAcesso(organizationId);
      setAcesso(a);
      if (!a?.pode) return;
      const [p, l, t, c, ar] = await Promise.all([
        a.detalhe === "pessoas" ? carregarPessoas(organizationId) : Promise.resolve([] as PessoaMapa[]),
        carregarLocais(organizationId), carregarTotais(organizationId), carregarCidade(organizationId), carregarAreas(organizationId),
      ]);
      setPessoas(p); setLocais(l); setTotais(t); setCidade(c); setAreas(ar);
      if (c?.tem_ibge) {
        const n = c.tem_bairros ? "bairro" : "setor";
        setNivel(n);
        setRegioes(await carregarRegioes(organizationId, n));
      }
    } catch {
      setErro("Não foi possível carregar o mapa agora. Tente de novo.");
    }
  }, [organizationId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga do servidor ao abrir
  useEffect(() => { carregar(); }, [carregar]);
  const trocarNivel = async (n: "bairro" | "setor") => {
    setNivel(n);
    try { setRegioes(await carregarRegioes(organizationId, n)); } catch { setErro("Não foi possível carregar as regiões. Tente de novo."); }
  };

  const grupos = useMemo(() => locais.filter((l) => l.tipo === "grupo" && temPonto(l)) as (LocalMapa & Ponto)[], [locais]);
  const sede = useMemo(() => locais.find((l) => l.tipo === "sede" && temPonto(l)) as (LocalMapa & Ponto) | undefined, [locais]);
  const pertoDeGrupo = useCallback((p: Ponto) => {
    let melhor: { g: LocalMapa; km: number } | null = null;
    for (const g of grupos) { const km = distanciaKm(p, g); if (!melhor || km < melhor.km) melhor = { g, km }; }
    return melhor;
  }, [grupos]);
  const visiveis = useMemo(() => pessoas.filter((p) => (filtroSit === "todos" || p.situacao === filtroSit) && (!soSemGrupo || !p.grupo_id)), [pessoas, filtroSit, soSemGrupo]);
  const descobertos = useMemo(() => visiveis.filter((p) => !p.grupo_id && (pertoDeGrupo(p)?.km ?? Infinity) > DESCOBERTO_KM), [visiveis, pertoDeGrupo]);
  const areaDoLider = acesso?.area_id ? areas.find((a) => a.id === acesso.area_id) ?? null : null;

  /* ── camadas do mapa ── */
  const pronto = ({ map, cores }: { map: MlMap; cores: Record<CorMapa, string> }) => {
    const add = (id: string) => map.addSource(id, { type: "geojson", data: vazio() });
    add("mp-regioes"); add("mp-areas"); add("mp-raios"); add("mp-locais"); add("mp-calor"); add("mp-descobertos"); add("mp-mascara");
    map.addSource("mp-pessoas", { type: "geojson", data: vazio(), cluster: true, clusterRadius: 44, clusterMaxZoom: 15 });
    const corLeitura: maplibregl.ExpressionSpecification = ["match", ["get", "leitura"], "falta", cores.falta, "forte", cores.forte, cores.media];
    map.addLayer({ id: "mp-regioes-fill", type: "fill", source: "mp-regioes", paint: { "fill-color": corLeitura, "fill-opacity": 0.6 } });
    map.addLayer({ id: "mp-regioes-linha", type: "line", source: "mp-regioes", paint: { "line-color": cores.papel, "line-width": 1.5 } });
    map.addLayer({ id: "mp-regioes-sel", type: "line", source: "mp-regioes", filter: ["==", ["get", "codigo"], ""], paint: { "line-color": cores.tinta, "line-width": 3 } });
    map.addLayer({ id: "mp-areas-fill", type: "fill", source: "mp-areas", paint: { "fill-color": ["get", "hex"], "fill-opacity": 0.14 } });
    map.addLayer({ id: "mp-areas-linha", type: "line", source: "mp-areas", paint: { "line-color": ["get", "hex"], "line-width": 2.5 } });
    map.addLayer({ id: "mp-raios", type: "line", source: "mp-raios", paint: { "line-color": cores.tinta, "line-width": 1.2, "line-dasharray": [3, 3], "line-opacity": 0.6 } });
    map.addLayer({ id: "mp-calor", type: "heatmap", source: "mp-calor", paint: { "heatmap-radius": 28, "heatmap-opacity": 0.75, "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.3, cores.sand, 0.6, cores.amber, 1, cores.rust] } });
    map.addLayer({ id: "mp-descobertos", type: "circle", source: "mp-descobertos", paint: { "circle-radius": 13, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": cores.alerta, "circle-stroke-width": 2 } });
    map.addLayer({ id: "mp-clusters", type: "circle", source: "mp-pessoas", filter: ["has", "point_count"], paint: { "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 25, 23], "circle-color": cores.cluster, "circle-stroke-color": cores.papel, "circle-stroke-width": 3 } });
    map.addLayer({ id: "mp-clusters-n", type: "symbol", source: "mp-pessoas", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 13 }, paint: { "text-color": cores.papel } });
    map.addLayer({ id: "mp-pessoa", type: "circle", source: "mp-pessoas", filter: ["!", ["has", "point_count"]], paint: {
      "circle-radius": ["case", ["get", "anonimo"], 4.5, 6.5],
      "circle-color": ["match", ["get", "situacao"], "novo", cores.novo, cores.membro],
      "circle-stroke-color": ["match", ["get", "situacao"], "novo", cores.membro, cores.papel],
      "circle-stroke-width": 2, "circle-opacity": ["case", ["get", "anonimo"], 0.7, 1],
    } });
    map.addLayer({ id: "mp-grupos", type: "circle", source: "mp-locais", filter: ["!", ["get", "igreja"]], paint: { "circle-radius": 7, "circle-color": cores.papel, "circle-stroke-color": cores.tinta, "circle-stroke-width": 2.5 } });
    map.addLayer({ id: "mp-igrejas", type: "circle", source: "mp-locais", filter: ["get", "igreja"], paint: { "circle-radius": ["case", ["get", "sede"], 12, 10], "circle-color": cores.tinta, "circle-stroke-color": cores.papel, "circle-stroke-width": 3 } });
    map.addLayer({ id: "mp-mascara", type: "fill", source: "mp-mascara", paint: { "fill-color": cores.tinta, "fill-opacity": 0.5 } });

    map.on("click", "mp-clusters", async (e) => {
      const f = e.features?.[0];
      const id = f?.properties?.cluster_id;
      if (id === undefined) return;
      const z = await (map.getSource("mp-pessoas") as GeoJSONSource).getClusterExpansionZoom(id);
      map.easeTo({ center: (f!.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z });
    });
    const clicar = (camada: string, fn: (e: MapLayerMouseEvent) => void) => {
      map.on("click", camada, fn);
      map.on("mouseenter", camada, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", camada, () => { map.getCanvas().style.cursor = ""; });
    };
    clicar("mp-pessoa", (e) => { const i = e.features?.[0]?.properties?.i; if (typeof i === "number") cliqueRef.current({ tipo: "pessoa", i }); });
    clicar("mp-igrejas", (e) => cliqueRef.current({ tipo: "local", id: String(e.features?.[0]?.properties?.id) }));
    clicar("mp-grupos", (e) => cliqueRef.current({ tipo: "local", id: String(e.features?.[0]?.properties?.id) }));
    clicar("mp-regioes-fill", (e) => cliqueRef.current({ tipo: "regiao", id: String(e.features?.[0]?.properties?.codigo) }));
    clicar("mp-areas-fill", (e) => cliqueRef.current({ tipo: "area", id: String(e.features?.[0]?.properties?.id) }));
    map.on("mousemove", "mp-regioes-fill", (e) => { const c = e.features?.[0]?.properties?.codigo; cliqueRef.current({ tipo: "tip", id: String(c), x: e.point.x, y: e.point.y }); });
    map.on("mouseleave", "mp-regioes-fill", () => setTip(null));
    setMapa({ map, cores });
    return () => { setMapa(null); enquadrou.current = false; };
  };

  /* cliques do mapa chegam aqui com os dados atuais */
  type Clique = { tipo: "pessoa"; i: number } | { tipo: "local" | "regiao" | "area"; id: string } | { tipo: "tip"; id: string; x: number; y: number };
  const cliqueRef = useRef<(c: Clique) => void>(() => {});
  useEffect(() => {
    cliqueRef.current = (c) => {
      if (modo) return;
      if (c.tipo === "pessoa") { const p = visiveis[c.i]; if (p && !p.anonimo) setSel({ tipo: "pessoa", p }); }
      else if (c.tipo === "local") { const l = locais.find((x) => x.id === c.id); if (l) setSel({ tipo: "local", l }); }
      else if (c.tipo === "regiao") { const r = regioes.find((x) => x.codigo === c.id); if (r) setSel({ tipo: "regiao", r }); }
      else if (c.tipo === "area") { const a = areas.find((x) => x.id === c.id); if (a && !camadas.regioes) setSel({ tipo: "area", a }); }
      else if (c.tipo === "tip") { const r = regioes.find((x) => x.codigo === c.id); setTip(r ? { x: c.x, y: c.y, r } : null); }
    };
  });

  const vis = (map: MlMap, ids: string[], on: boolean) => ids.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none"));
  useEffect(() => {
    if (!mapa) return;
    const { map, cores } = mapa;
    const set = (id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature) => (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    set("mp-pessoas", { type: "FeatureCollection", features: visiveis.map((p, i) => ({ type: "Feature", properties: { i, situacao: p.situacao, anonimo: p.anonimo }, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })) });
    set("mp-calor", { type: "FeatureCollection", features: visiveis.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })) });
    set("mp-descobertos", { type: "FeatureCollection", features: descobertos.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })) });
    set("mp-locais", { type: "FeatureCollection", features: locais.filter(temPonto).map((l) => ({ type: "Feature", properties: { id: l.id, igreja: l.tipo !== "grupo", sede: l.tipo === "sede" }, geometry: { type: "Point", coordinates: [l.longitude as number, l.latitude as number] } })) });
    set("mp-regioes", { type: "FeatureCollection", features: regioes.map((r) => ({ type: "Feature", properties: { codigo: r.codigo, leitura: r.leitura }, geometry: r.geojson })) });
    set("mp-areas", { type: "FeatureCollection", features: areas.map((a) => ({ type: "Feature", properties: { id: a.id, hex: cores[a.cor] }, geometry: a.geojson })) });
    set("mp-raios", { type: "FeatureCollection", features: sede ? [1, 3, 5].map((km) => ({ type: "Feature", properties: { km }, geometry: circulo(sede, km) })) : [] });
    set("mp-mascara", { type: "FeatureCollection", features: areaDoLider ? [{ type: "Feature", properties: {}, geometry: mascaraFora(areaDoLider.geojson) }] : [] });
  }, [mapa, visiveis, descobertos, locais, regioes, areas, sede, areaDoLider]);

  useEffect(() => {
    if (!mapa) return;
    const { map } = mapa;
    const emModo = modo === "area" || modo === "emergencia" || modo === "rota";
    vis(map, ["mp-clusters", "mp-clusters-n", "mp-pessoa"], camadas.pessoas && !camadas.calor && modo !== "linha");
    vis(map, ["mp-calor"], camadas.calor && camadas.pessoas);
    vis(map, ["mp-igrejas"], camadas.igrejas);
    vis(map, ["mp-grupos"], camadas.celulas);
    vis(map, ["mp-areas-fill", "mp-areas-linha"], camadas.areas && !emModo);
    vis(map, ["mp-raios"], camadas.raios);
    vis(map, ["mp-descobertos"], camadas.descobertos && camadas.pessoas);
    vis(map, ["mp-regioes-fill", "mp-regioes-linha", "mp-regioes-sel"], camadas.regioes && modo !== "area");
    map.setFilter("mp-regioes-sel", ["==", ["get", "codigo"], sel?.tipo === "regiao" ? sel.r.codigo : ""]);
  }, [mapa, camadas, modo, sel]);

  /* enquadra a primeira vez que os dados chegam */
  const enquadrou = useRef(false);
  useEffect(() => {
    if (!mapa || enquadrou.current) return;
    const caixa = areaDoLider ? caixaDaGeometria(areaDoLider.geojson) : caixaDosPontos([...pessoas, ...locais.filter(temPonto)] as Ponto[]);
    if (!caixa) return;
    enquadrou.current = true;
    mapa.map.fitBounds(caixa, { padding: { top: 80, bottom: 80, left: 340, right: 80 }, maxZoom: 14, duration: 0 });
  }, [mapa, pessoas, locais, areaDoLider]);

  useEffect(() => {
    if (!mapa) return;
    if (tres) { ligarPredios3D(mapa.map, mapa.cores); mapa.map.easeTo({ pitch: 55 }); } else mapa.map.easeTo({ pitch: 0 });
  }, [mapa, tres]);

  const escolherVisao = (v: Visao) => { setVisao(v); setCamadas(PRESETS[v]); setSel(null); setPainelVer(false); };
  const focar = (g: GeoJSON.Geometry | Ponto[]) => {
    const caixa = Array.isArray(g) ? caixaDosPontos(g) : caixaDaGeometria(g);
    if (caixa && mapa) mapa.map.fitBounds(caixa, { padding: { top: 80, bottom: 80, left: 340, right: 400 }, maxZoom: 15 });
  };

  /* ── insights "Comece por aqui" ── */
  const faltas = regioes.filter((r) => r.leitura === "falta");
  const fortes = regioes.filter((r) => r.leitura === "forte");
  const semCelula = regioes.filter((r) => r.pessoas >= 8 && r.grupos === 0);
  type Cartao = { id: string; titulo: string; texto: string; acao: () => void };
  const cartoes: Cartao[] = [];
  if (faltas.length) cartoes.push({ id: "falta", titulo: `${plural(faltas.length, nivel === "bairro" ? "bairro" : "setor")} onde falta igreja`, texto: `${faltas.slice(0, 3).map((r) => r.nome).join(", ")}: muita gente e quase ninguém da igreja.`, acao: () => { escolherVisao("falta"); focar(faltas.flatMap((r) => { const c = caixaDaGeometria(r.geojson); return c ? [{ longitude: c[0][0], latitude: c[0][1] }, { longitude: c[1][0], latitude: c[1][1] }] : []; })); } });
  if (fortes.length) cartoes.push({ id: "forte", titulo: `${fortes[0].nome} pode ajudar`, texto: `É onde somos mais fortes: ${umACada(fortes[0].um_a_cada, true).toLowerCase()} moradores. Base para alcançar os vizinhos.`, acao: () => { escolherVisao("falta"); setSel({ tipo: "regiao", r: fortes[0] }); focar(fortes[0].geojson); } });
  if (descobertos.length || (totais?.sem_grupo ?? 0) > 0) cartoes.push({ id: "descobertos", titulo: ct(`${plural(totais?.sem_grupo ?? descobertos.length, "pessoa")} sem {grupo}`), texto: `${plural(descobertos.length, "mora", "moram")} a mais de ${DESCOBERTO_KM} km de qualquer uma.`, acao: () => escolherVisao("celulas") });
  if (semCelula.length) cartoes.push({ id: "abrir", titulo: ct(`Sugestão: abrir {grupo} em ${semCelula[0].nome}`), texto: `${pessoasNaRegiao(semCelula[0].pessoas)} pessoas da igreja moram lá e não há nenhuma.`, acao: () => { escolherVisao("celulas"); focar(semCelula[0].geojson); } });
  if (totais && totais.pessoas > totais.com_ponto) cartoes.push({ id: "local", titulo: `${plural(totais.pessoas - totais.com_ponto, "pessoa")} sem localização`, texto: "Sem CEP ou com CEP que não achamos. Peça para atualizarem no Perfil.", acao: () => {} });

  /* ── busca ── */
  const termo = busca.trim().toLowerCase();
  const sugestoes = termo.length < 2 ? [] : [
    ...pessoas.filter((p) => p.nome?.toLowerCase().includes(termo)).slice(0, 5).map((p) => ({ k: `p${p.id}`, t: p.nome as string, s: "pessoa", ir: () => { setSel({ tipo: "pessoa", p }); mapa?.map.easeTo({ center: [p.longitude, p.latitude], zoom: 15 }); } })),
    ...regioes.filter((r) => r.nome.toLowerCase().includes(termo)).slice(0, 5).map((r) => ({ k: `r${r.codigo}`, t: r.nome, s: nivel, ir: () => { setCamadas((c) => ({ ...c, regioes: true })); setSel({ tipo: "regiao", r }); focar(r.geojson); } })),
    ...locais.filter((l) => l.nome.toLowerCase().includes(termo) && temPonto(l)).slice(0, 5).map((l) => ({ k: `l${l.id}`, t: l.nome, s: l.tipo === "grupo" ? ct("{grupo}") : "igreja", ir: () => { setSel({ tipo: "local", l }); mapa?.map.easeTo({ center: [l.longitude as number, l.latitude as number], zoom: 15 }); } })),
  ];

  /* contexto estável para os modos: só muda quando mudam os dados */
  const contexto: ContextoMapa | null = useMemo(() => (mapa && acesso ? { org: organizationId, mapa: mapa.map, cores: mapa.cores, acesso, cidade, regioes, pessoas, locais, areas, people, igreja: churchName, recarregar: carregar, fechar: () => setModo(null) } : null), [mapa, acesso, organizationId, cidade, regioes, pessoas, locais, areas, people, churchName, carregar]);

  /* ── estados vazios e de acesso ── */
  if (erro) return <div className="mapa-tela"><div className="mp-vazio"><div><p className="mp-texto" role="alert">{erro}</p><Botao compacto onClick={() => { setErro(""); carregar(); }}>Tentar de novo</Botao></div></div></div>;
  if (acesso && !acesso.pode) return <div className="mapa-tela"><div className="mp-vazio"><div><p className="mp-texto">O mapa da igreja ainda não foi liberado para você. Fale com o pastor.</p></div></div></div>;
  if (tela === "mesa" && acesso) return <Mesa org={organizationId} acesso={acesso} cidade={cidade} nivel={mesaNivel} regioesIniciais={mesaRegioes} igreja={churchName} onVoltar={() => setTela("mapa")} onAbrirMembro={onAbrirMembro} onMensagem={onMensagem} />;
  if (tela === "liberar") return <LiberarMapa org={organizationId} people={people} areas={areas} onVoltar={() => { setTela("mapa"); carregar(); }} />;

  const temDir = !!sel && !modo;
  const semDados = acesso?.pode && totais && totais.com_ponto === 0 && locais.every((l) => !temPonto(l));
  const carregando = !acesso || (acesso.pode && !totais);

  return (
    <div className="mapa-tela">
      <MapaBase rotulo="Mapa da igreja" onPronto={pronto} />

      {carregando && <div className="mp-vazio"><div><p className="mp-texto" role="status">Carregando o mapa...</p></div></div>}
      {semDados && !modo && (
        <div className="mp-vazio"><div>
          <p className="mp-pergunta">Ainda não há ninguém no mapa</p>
          <p className="mp-texto" style={{ marginTop: 6 }}>As pessoas aparecem aqui quando têm CEP no cadastro. Peça para atualizarem no Perfil do app, ou preencha na ficha de cada uma.</p>
        </div></div>
      )}

      {!modo && (
        <>
          <aside className={`mp-painel mp-esq${painelVer ? " aberto" : ""}`} aria-label="O que ver no mapa">
            <div className="mp-cab">
              <div className="mp-sobre">{churchName}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <h1 className="mp-titulo">Mapa da igreja</h1>
                {totais && <span className="mp-texto"><span className="mp-num">{milhar(totais.com_ponto)}</span> pessoas</span>}
              </div>
              {areaDoLider && <p className="mp-fraco" style={{ marginTop: 6 }}>Você vê {areaDoLider.nome}. Fora dela o mapa fica apagado.</p>}
              {acesso?.detalhe === "numeros" && <p className="mp-fraco" style={{ marginTop: 6 }}>Sua liberação mostra só os números por região, sem pessoas.</p>}
            </div>
            <div className="mp-corpo">
              <div className="mp-pergunta">O que você quer ver?</div>
              <Acao className="mp-visao" aria-pressed={visao === "pessoas"} onClick={() => escolherVisao("pessoas")}><b>Onde estão as pessoas</b><span>Membros e quem chegou há pouco</span></Acao>
              <Acao className="mp-visao" aria-pressed={visao === "falta"} desativado={!cidade?.tem_ibge} onClick={() => escolherVisao("falta")}><b>Onde falta igreja</b><span>{cidade?.tem_ibge ? "Bairros com muita gente e pouca presença" : "Precisa dos dados do IBGE da cidade"}</span></Acao>
              <Acao className="mp-visao" aria-pressed={visao === "celulas"} onClick={() => escolherVisao("celulas")}><b>{ct("{Grupos} e cobertura")}</b><span>{ct("Quem está longe de um {grupo}")}</span></Acao>
              <Acao className="mp-visao" aria-pressed={visao === "regiao"} onClick={() => escolherVisao("regiao")}><b>O que tem na região</b><span>Escolas, praças, saúde e ônibus</span></Acao>

              <Acao className="mp-abre" aria-expanded={personalizar} onClick={() => setPersonalizar((v) => !v)}>Personalizar camadas <Icon name={personalizar ? "voltar" : "avancar"} size={14} /></Acao>
              {personalizar && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {([
                    ["pessoas", "Pessoas"], ["calor", "Mancha de densidade"], ["descobertos", ct(`Sem {grupo} a mais de ${DESCOBERTO_KM} km`)],
                    ["igrejas", "Sede e congregações"], ["raios", "Raios de 1, 3 e 5 km da sede"], ["celulas", ct("{Grupos}")], ["areas", "Áreas da igreja"],
                    ["regioes", "Moradores x igreja (IBGE)"], ["pontos", "Pontos de interesse"],
                  ] as [keyof Camadas, string][]).map(([k, l]) => (
                    <label key={k} className="mp-linha">{l}<Interruptor ligado={camadas[k]} rotulo={l} desativado={k === "regioes" && !cidade?.tem_ibge} onClick={() => setCamadas((c) => ({ ...c, [k]: !c[k] }))} /></label>
                  ))}
                  {camadas.regioes && cidade?.tem_ibge && (
                    <div className="mp-linha">Agrupar por
                      <div className="mp-seg" style={{ ["--n" as string]: 2 } as React.CSSProperties}>
                        <Acao aria-pressed={nivel === "bairro"} desativado={!cidade.tem_bairros} onClick={() => trocarNivel("bairro")}>Bairro</Acao>
                        <Acao aria-pressed={nivel === "setor"} onClick={() => trocarNivel("setor")}>Setor</Acao>
                      </div>
                    </div>
                  )}
                  <div className="mp-pergunta" style={{ marginTop: 8 }}>Filtros</div>
                  <div className="mp-chips">
                    {([["todos", "Todos"], ["membro", "Membros"], ["novo", "Novos na igreja"]] as const).map(([v, l]) => <Acao key={v} className="mp-chip" aria-pressed={filtroSit === v} onClick={() => setFiltroSit(v)}>{l}</Acao>)}
                    <Acao className="mp-chip" aria-pressed={soSemGrupo} onClick={() => setSoSemGrupo((v) => !v)}>{ct("Sem {grupo}")}</Acao>
                  </div>
                  <p className="mp-fraco"><span className="mp-num">{milhar(visiveis.length)}</span> no mapa com estes filtros</p>
                </div>
              )}
            </div>
            <div className="mp-pe">
              <p className="mp-fraco" style={{ display: "flex", gap: 8 }}><Icon name="cadeado" size={14} />{totais && totais.com_nome < totais.com_ponto ? `${plural(totais.com_ponto - totais.com_nome, "pessoa aparece", "pessoas aparecem")} sem nome, porque não aceitou o termo. ` : ""}Endereço nunca é mostrado.</p>
              {podeLiberar && <Botao compacto onClick={() => setTela("liberar")}>Quem vê o mapa</Botao>}
            </div>
          </aside>

          <div className={`mp-topo${temDir ? "" : " sem-dir"}`}>
            <div className="mp-busca">
              <Icon name="buscar" size={16} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={ct("Buscar pessoa, bairro ou {grupo}")} aria-label="Buscar no mapa" />
              {sugestoes.length > 0 && (
                <div className="mp-sugestoes" role="listbox">
                  {sugestoes.map((s) => <Acao key={s.k} role="option" aria-selected="false" onClick={() => { s.ir(); setBusca(""); }}><span>{s.t}</span><span className="mp-fraco">{s.s}</span></Acao>)}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <Botao tamanho="mapa" aria-expanded={ferramentas} onClick={() => setFerramentas((v) => !v)}><Icon name="config" size={16} />Ferramentas</Botao>
              {ferramentas && (
                <div className="mp-menu" /* lei17-ok: ferramentas do mapa com descrição em duas linhas */ role="menu">
                  {acesso?.pode_editar && <Acao role="menuitem" onClick={() => { setAreaInicial([]); setModo("area"); setFerramentas(false); }}><b>Criar uma área</b><span>Junte bairros para formar um setor</span></Acao>}
                  <Acao role="menuitem" onClick={() => { setModo("rota"); setFerramentas(false); }}><b>Traçar rota</b><span>Visita, oração, panfletos ou carro de som</span></Acao>
                  <Acao role="menuitem" onClick={() => { setModo("linha"); setFerramentas(false); }}><b>Linha do tempo</b><span>Veja onde a igreja cresceu</span></Acao>
                  <Acao role="menuitem" onClick={() => { setModo("pontos"); setFerramentas(false); }}><b>Pontos de interesse</b><span>Escolas, praças e lugares da igreja</span></Acao>
                  {acesso?.total && acesso.pode_editar && <><hr /><Acao role="menuitem" onClick={() => { setModo("emergencia"); setFerramentas(false); }}><b>Emergência</b><span>Enchente ou temporal: ache as famílias atingidas</span></Acao></>}
                </div>
              )}
            </div>
            {acesso?.pode_mesa && <Botao tamanho="mapa" onClick={() => { setMesaRegioes(sel?.tipo === "regiao" ? [sel.r.codigo] : faltas.map((r) => r.codigo)); setMesaNivel(nivel); setTela("mesa"); }}><Icon name="quadros" size={16} />Mesa de trabalho</Botao>}
          </div>

          <div className={`mp-controles${temDir ? "" : " sem-dir"}`}>
            <Acao aria-label="Aproximar" onClick={() => mapa?.map.zoomIn()}>+</Acao>
            <Acao aria-label="Afastar" onClick={() => mapa?.map.zoomOut()}>−</Acao>
            <Acao aria-label="Inclinar em 3D" aria-pressed={tres} onClick={() => setTres((v) => !v)}>3D</Acao>
          </div>
          <div className="mp-so-celular">
            <Botao tamanho="mapa" onClick={() => setPainelVer((v) => !v)}><Icon name="lista" size={20} />Ver</Botao>
          </div>

          <div className="mp-legenda" aria-label="Legenda">
            {camadas.regioes ? (
              <>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-sw" style={{ background: "var(--mapa-falta)" }} />{LEITURA.falta}</span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-sw" style={{ background: "var(--mapa-forte)" }} />{LEITURA.forte}</span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-sw" style={{ background: "var(--mapa-media)" }} />{LEITURA.media}</span>
                <span className="mp-fraco">Fonte: IBGE · Censo Demográfico <span className="mp-num">2022</span></span>
              </>
            ) : (
              <>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-bola" style={{ background: "var(--mapa-membro)" }} />Membro</span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-bola" style={{ background: "var(--mapa-novo)", boxShadow: "inset 0 0 0 2px var(--mapa-membro)" }} />Novo na igreja</span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-bola" style={{ background: "var(--mapa-tinta)", boxShadow: "0 0 0 2px var(--mapa-papel)" }} />Sede e congregações</span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-bola" style={{ background: "var(--mapa-papel)", boxShadow: "inset 0 0 0 2px var(--mapa-tinta)" }} />{ct("{Grupos}")}</span>
                {camadas.descobertos && <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="mp-bola" style={{ boxShadow: "inset 0 0 0 2px var(--mapa-alerta)" }} />{ct(`Sem {grupo} perto`)}</span>}
              </>
            )}
          </div>

          {cartoes.length > 0 && !temDir && (
            <section className={`mp-comece${temDir ? "" : " sem-dir"}`} aria-label="Comece por aqui">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mp-pergunta">Comece por aqui</span>
                {cartoes.length > 2 && <Botao variante="discreto" compacto onClick={() => setVerTodos((v) => !v)}>{verTodos ? "Ver menos" : `Ver os ${cartoes.length}`}</Botao>}
              </div>
              <div className="mp-cartoes">
                {(verTodos ? cartoes : cartoes.slice(0, 2)).map((c) => (
                  <Acao key={c.id} className="mp-cartao" onClick={c.acao}><b>{c.titulo}</b>{c.texto}<i>Ver no mapa →</i></Acao>
                ))}
              </div>
            </section>
          )}

          {tip && !sel && (
            <div className="mp-tooltip" style={{ left: tip.x + 14, top: tip.y + 14 }} role="tooltip">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{tip.r.nome}</strong><span>{LEITURA[tip.r.leitura]}</span></div>
              <div style={{ marginTop: 6, color: "var(--white)" }}>{umACada(tip.r.um_a_cada)}</div>
              {cidade?.um_a_cada && <div>Na cidade: {umACada(cidade.um_a_cada, true)}</div>}
              <div style={{ marginTop: 6 }}><span className="mp-num">{milhar(tip.r.moradores)}</span> moradores · <span className="mp-num">{pessoasNaRegiao(tip.r.pessoas)}</span> da igreja</div>
            </div>
          )}

          {sel && (
            <aside className="mp-painel mp-dir" aria-label="Detalhes">
              <PainelSelecao sel={sel} cidade={cidade} nivel={nivel} pessoas={pessoas} acesso={acesso} perto={pertoDeGrupo}
                onFechar={() => setSel(null)} onAbrirMembro={onAbrirMembro} onMensagem={onMensagem}
                onMesa={(cod, n) => { setMesaRegioes(cod); setMesaNivel(n ?? nivel); setTela("mesa"); }}
                onCriarArea={(cod) => { setAreaInicial(cod); setModo("area"); setSel(null); }} />
            </aside>
          )}
        </>
      )}

      {contexto && modo === "area" && <CriarArea ctx={contexto} bairrosIniciais={areaInicial} nivel={nivel} />}
      {contexto && modo === "rota" && <Rota ctx={contexto} />}
      {contexto && modo === "emergencia" && <Emergencia ctx={contexto} />}
      {contexto && modo === "linha" && <LinhaDoTempo ctx={contexto} nivel={nivel} />}
      {contexto && modo === "pontos" && <Pontos ctx={contexto} />}
      {!contexto && modo && <div className="mp-vazio"><div><p className="mp-texto" role="status">Carregando o mapa...</p></div></div>}
      {camadas.pontos && contexto && !modo && <Pontos ctx={contexto} soCamada />}
    </div>
  );
}

function PainelSelecao({ sel, cidade, nivel, pessoas, acesso, perto, onFechar, onAbrirMembro, onMensagem, onMesa, onCriarArea }: {
  sel: NonNullable<Selecao>; cidade: Cidade | null; nivel: "bairro" | "setor"; pessoas: PessoaMapa[]; acesso: Acesso | null;
  perto: (p: Ponto) => { g: LocalMapa; km: number } | null;
  onFechar: () => void; onAbrirMembro: (id: string) => void; onMensagem: (id: string) => void; onMesa: (codigos: string[], nivel?: "area") => void; onCriarArea: (codigos: string[]) => void;
}) {
  const { comTermos: ct } = useTermos();
  const fechar = <BotaoIcone className="mp-fechar" rotulo="Fechar" onClick={onFechar}><Icon name="recusou" size={14} /></BotaoIcone>;

  if (sel.tipo === "pessoa") {
    const p = sel.p;
    const g = perto(p);
    return (
      <>
        <div className="mp-cab" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar nome={p.nome ?? ""} tamanho="md" />
          <div style={{ flex: 1, minWidth: 0 }}><h2 className="mp-titulo" style={{ fontSize: "var(--fs-pn-16)" }}>{p.nome}</h2><span className="mp-fraco">{SITUACAO[p.situacao] ?? p.situacao}{p.desde ? ` desde ${p.desde}` : ""}</span></div>
          {fechar}
        </div>
        <div className="mp-corpo">
          <dl className="mp-dados">
            <dt>{ct("{Grupo}")}</dt><dd>{p.grupo ?? "Nenhum"}</dd>
            {g && <><dt>{ct("{Grupo} mais perto")}</dt><dd>{g.g.nome} · {formatarDistancia(g.km)}</dd></>}
            {g?.g.lider_nome && <><dt>Referência</dt><dd>{g.g.lider_nome}</dd></>}
          </dl>
          <p className="mp-fraco">Aceitou aparecer com o nome no mapa. O ponto mostra a região do CEP, não a casa.</p>
        </div>
        {p.id && (
          <div className="mp-pe">
            <Botao variante="principal" onClick={() => onAbrirMembro(p.id!)}>Ver ficha</Botao>
            <Botao onClick={() => onMensagem(p.id!)}>Mensagem</Botao>
          </div>
        )}
      </>
    );
  }

  if (sel.tipo === "local") {
    const l = sel.l;
    const vagas = l.lugares ? Math.max(0, l.lugares - (l.ocupados ?? 0)) : null;
    return (
      <>
        <div className="mp-cab" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div><div className="mp-sobre">{l.tipo === "sede" ? "Sede" : l.tipo === "congregacao" ? "Congregação" : ct("{Grupo}")}</div><h2 className="mp-titulo">{l.nome}</h2></div>{fechar}
        </div>
        <div className="mp-corpo">
          <dl className="mp-dados">
            {(l.dia || l.hora) && <><dt>Quando</dt><dd>{[l.dia, l.hora].filter(Boolean).join(" · ")}</dd></>}
            <dt>Onde</dt><dd>{[[l.rua, l.numero].filter(Boolean).join(", "), l.bairro].filter(Boolean).join(" · ") || "Sem endereço"}</dd>
            {l.lider_nome && <><dt>Quem lidera</dt><dd>{l.lider_nome}</dd></>}
            {l.lugares && <><dt>Lugares</dt><dd><span className="mp-num">{l.ocupados ?? 0} de {l.lugares}</span> · {vagas ? plural(vagas, "vaga") : "lotado"}</dd></>}
          </dl>
          <p className="mp-fraco">Local público: os membros veem este endereço no app, em Agenda › Onde.</p>
        </div>
        {l.lider_member_id && <div className="mp-pe"><Botao onClick={() => onMensagem(l.lider_member_id!)}>Mensagem para quem lidera</Botao></div>}
      </>
    );
  }

  if (sel.tipo === "area") {
    const a = sel.a;
    const dentro = pessoas.filter((p) => dentroDe(p, a.geojson));
    return (
      <>
        <div className="mp-cab" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div><div className="mp-sobre">{a.tipo === "regiao" ? "Região pastoral" : a.tipo === "alcance" ? "Área de alcance" : "Setor"}</div><h2 className="mp-titulo">{a.nome}</h2></div>{fechar}
        </div>
        <div className="mp-corpo">
          <div className="mp-kpis"><div className="mp-kpi"><small>Pessoas no mapa</small><strong>{milhar(dentro.length)}</strong></div><div className="mp-kpi"><small>Responsável</small><strong style={{ fontFamily: "inherit", fontSize: "var(--fs-pn-14)" }}>{a.responsavel ?? "Ninguém ainda"}</strong></div></div>
        </div>
        {acesso?.pode_mesa && <div className="mp-pe"><Botao variante="principal" onClick={() => onMesa([a.id], "area")}>Abrir na mesa de trabalho →</Botao></div>}
      </>
    );
  }

  const r = sel.r;
  const daqui = pessoas.filter((p) => !p.anonimo && dentroDe(p, r.geojson));
  return (
    <>
      <div className="mp-cab" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div><div className="mp-sobre" style={{ color: r.leitura === "falta" ? "var(--mapa-falta)" : undefined }}>{nivel === "bairro" ? LEITURA_BAIRRO[r.leitura] : `Setor · ${LEITURA[r.leitura]}`}</div><h2 className="mp-titulo">{r.nome}</h2></div>{fechar}
      </div>
      <div className="mp-corpo">
        <div className="mp-destaque">{umACada(r.um_a_cada)}
          {cidade?.um_a_cada && <div className="mp-fraco" style={{ marginTop: 4, fontSize: "var(--fs-pn-13)" }}>A cidade tem {umACada(cidade.um_a_cada, true)}. {r.vezes ? `Aqui é ${frenteCidade(r.vezes)}.` : ""}</div>}
        </div>
        <div className="mp-kpis">
          <div className="mp-kpi"><small>Moradores</small><strong>{milhar(r.moradores)}</strong></div>
          <div className="mp-kpi"><small>Pessoas da igreja</small><strong>{pessoasNaRegiao(r.pessoas)}</strong></div>
        </div>
        <dl className="mp-dados">
          <dt>{ct("{Grupos} aqui")}</dt><dd>{r.grupos || "Nenhum"}</dd>
          <dt>Área</dt><dd><span className="mp-num">{String(r.area_km2).replace(".", ",")}</span> km²</dd>
          <dt>Densidade</dt><dd><span className="mp-num">{milhar(r.moradores / Number(r.area_km2))}</span> moradores por km²</dd>
        </dl>
        {daqui.length > 0 && (
          <div>
            <div className="mp-pergunta" style={{ marginBottom: 6 }}>Pessoas com nome no mapa · <span className="mp-num">{daqui.length}</span></div>
            {daqui.slice(0, 6).map((p) => <div key={p.id} className="mp-lista-pessoa"><Avatar nome={p.nome ?? ""} tamanho="xs" />{p.nome}<span className="mp-fraco" style={{ marginLeft: "auto" }}>{SITUACAO[p.situacao]}</span></div>)}
          </div>
        )}
        <p className="mp-fraco">Fonte: IBGE · Censo Demográfico <span className="mp-num">2022</span></p>
      </div>
      <div className="mp-pe">
        {acesso?.pode_mesa && <Botao variante="principal" onClick={() => onMesa([r.codigo])}>Abrir na mesa de trabalho →</Botao>}
        {acesso?.pode_editar && nivel === "bairro" && <Botao onClick={() => onCriarArea([r.codigo])}>Criar área com este bairro</Botao>}
      </div>
    </>
  );
}
