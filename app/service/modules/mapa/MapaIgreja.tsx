"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MlMap, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { useTermos } from "../../lib/vocabulario-context";
import MapaBase from "./MapaBase";
import { ligarPredios3D, type CorMapa } from "./estilo";
import { caixaDaGeometria, caixaDosPontos, circulo, dentroDe, distanciaKm, formatarDistancia, mascaraFora, sedeComPonto, temPonto, type Ponto } from "./geo";
import {
  carregarAcesso, carregarAreas, carregarCidade, carregarLocais, carregarPessoas, carregarRegioes, carregarSemPonto, carregarTotais,
  type Acesso, type Area, type Cidade, type LocalMapa, type PessoaMapa, type Regiao, type Totais,
} from "./dados";
import { SITUACAO, milhar, pessoasNaRegiao, tomPresenca, umACada } from "./linguagem";
import { IDS, OPACIDADE, TOCAVEIS, marcarGrupo, montarCamadas, mostrar, opacidade, type ChaveCamada } from "./camadas";
import { registrarMarcadores, svgMarcador, type Marcador } from "./marcadores";
import type { ContextoMapa, PessoaLider } from "./contexto";
import { CriarArea } from "./CriarArea";
import { Rota } from "./Rota";
import { Emergencia } from "./Emergencia";
import { LinhaDoTempo } from "./LinhaDoTempo";
import { CATEGORIAS, Pontos, carregarPontos, type Ponto as Lugar } from "./Pontos";
import { Mesa } from "./Mesa";
import { LiberarMapa } from "./LiberarMapa";

import { Acao } from "../../ui/Acao";
import { Botao, BotaoIcone } from "../../ui/Botao";
import { Entrada } from "../../ui/Campo";
import { Janela } from "../../ui/Janela";
import { linhaClasse } from "../../ui/Linha";
import { Balao, LinhaBalao } from "../../ui/Balao";
import { BarraFerramentas, type ItemFerramenta } from "../../ui/BarraFerramentas";
import { EscalaTons, GrupoCamadas, LinhaCamada, MarcaCamada, PainelMapa, TransparenciaCamada } from "../../ui/PainelMapa";

/* Painel › Pessoas › Mapa da igreja (G7, mapa/PLANO.md §10, prancha P1).
   O mapa mostra o que existe; quem decide é a igreja: nenhuma visão pronta,
   nenhum aviso de "falta igreja". Camadas que se somam num painel à esquerda,
   ferramentas numa barra embaixo, um balão preso ao ponto tocado com tudo dele,
   e 3D, aproximar e afastar no canto. As ferramentas (criar área, rota, linha
   do tempo, marcar lugar, emergência) abrem os modos sobre o mesmo mapa. */

type Selecao =
  | { tipo: "pessoa"; i: number; p: PessoaMapa }
  | { tipo: "local"; l: LocalMapa & Ponto }
  | { tipo: "regiao"; r: Regiao }
  | { tipo: "area"; a: Area }
  | { tipo: "lugar"; pt: Lugar };
type Aberto = Selecao & { onde: [number, number] };
type Modo = null | "area" | "rota" | "emergencia" | "linha" | "pontos";
type GrupoLugar = "igreja" | "escolas" | "saude" | "onibus" | "igrejas";

const LUGARES: { id: GrupoLugar; nome: string; icone: string }[] = [
  { id: "igreja", nome: "Lugares da igreja", icone: "bandeira" },
  { id: "escolas", nome: "Escolas e praças", icone: "cursos" },
  { id: "saude", nome: "Assistência e saúde", icone: "coracao" },
  { id: "onibus", nome: "Ônibus", icone: "transporte" },
  { id: "igrejas", nome: "Igrejas na região", icone: "cruz" },
];
const grupoDoLugar = (categoria: string) => (CATEGORIAS.find((c) => c.id === categoria)?.grupo ?? "igreja") as GrupoLugar;
const TIPO_AREA: Record<Area["tipo"], string> = { setor: "Setor", regiao: "Região pastoral", alcance: "Atuação" };
const LARGURA_PAINEL = 360; /* 16 de margem + 344 do painel (biblioteca.css, .pm-painel) */
const LARGURA_TRILHO = 80;
const RESERVA_AJUDA = 156; /* o botão de ajuda "?" fica embaixo, à direita, a 96 px da borda */
const primeiroNome = (nome: string | null | undefined) => (nome ?? "").trim().split(/\s+/)[0] ?? "";
const ic = (n: string) => <Icon name={n} size={20} stroke={1.9} />;
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
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [totais, setTotais] = useState<Totais | null>(null);
  const [cidade, setCidade] = useState<Cidade | null>(null);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [nivel, setNivel] = useState<"bairro" | "setor">("bairro");
  const [areas, setAreas] = useState<Area[]>([]);

  const [camadas, setCamadas] = useState<Record<ChaveCamada, boolean>>({ pessoas: true, calor: false, igrejas: true, grupos: true, presenca: false, raios: false });
  const [transp, setTransp] = useState({ calor: 0, presenca: 20 });
  const [areasOcultas, setAreasOcultas] = useState<string[]>([]);
  const [lugaresLigados, setLugaresLigados] = useState<GrupoLugar[]>([]);
  const [grupoAberto, setGrupoAberto] = useState({ areas: false, lugares: false });
  const [recolhido, setRecolhido] = useState(false);
  const [celular, setCelular] = useState(false);
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [modo, setModo] = useState<Modo>(null);
  const [tela, setTela] = useState<"mapa" | "mesa" | "liberar">("mapa");
  const [mesaRegioes, setMesaRegioes] = useState<string[]>([]);
  const [mesaNivel, setMesaNivel] = useState<"bairro" | "setor" | "area">("bairro");
  const [areaInicial, setAreaInicial] = useState<string[]>([]);
  const [janela, setJanela] = useState<null | "entenda" | "semcep">(null);
  const [semPonto, setSemPonto] = useState<{ id: string; nome: string; tem_cep: boolean }[] | null>(null);
  const [busca, setBusca] = useState("");
  const [tres, setTres] = useState(false);
  const [mapa, setMapa] = useState<{ map: MlMap; cores: Record<CorMapa, string> } | null>(null);

  /* celular: o painel começa recolhido e a barra vira fileira (G16 refina as folhas) */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const aplicar = () => { setCelular(mq.matches); if (mq.matches) setRecolhido(true); };
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

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
      /* dados novos: um balão aberto apontaria para a lista antiga */
      setAberto(null);
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
  /* lugares: ao abrir e ao voltar de Marcar lugar */
  useEffect(() => {
    if (modo || !acesso?.pode) return;
    let vivo = true;
    carregarPontos(organizationId).then((x) => { if (vivo) setLugares(x); }).catch(() => { if (vivo) setLugares([]); });
    return () => { vivo = false; };
  }, [organizationId, acesso, modo]);

  const grupos = useMemo(() => locais.filter((l) => l.tipo === "grupo" && temPonto(l)) as (LocalMapa & Ponto)[], [locais]);
  const usaGrupos = grupos.length > 0 || pessoas.some((p) => p.grupo_id);
  const sede = useMemo(() => sedeComPonto(locais), [locais]);
  const areaDoLider = acesso?.area_id ? areas.find((a) => a.id === acesso.area_id) ?? null : null;
  const lugaresVisiveis = useMemo(() => lugares.filter((x) => !x.oculto), [lugares]);
  const contaLugares = (g: GrupoLugar) => lugaresVisiveis.filter((x) => grupoDoLugar(x.categoria) === g).length;
  const comIbge = !!cidade?.tem_ibge && regioes.length > 0;
  /* a lista traz nomes de qualquer membro: só pastor e administração (0098) */
  const semCep = podeLiberar && totais ? totais.pessoas - totais.com_ponto : 0;

  /* ── mapa: camadas e toques ── */
  const toqueRef = useRef<(e: MapMouseEvent) => void>(() => {});
  /* com uma ferramenta aberta o cursor é dela (mira): o mapa principal não mexe */
  const modoRef = useRef<Modo>(null);
  useEffect(() => { modoRef.current = modo; });
  const pronto = ({ map, cores }: { map: MlMap; cores: Record<CorMapa, string> }) => {
    let vivo = true;
    (async () => {
      await registrarMarcadores(map, cores);
      if (!vivo) return;
      montarCamadas(map, cores);
      map.on("click", (e) => toqueRef.current(e));
      map.on("mousemove", (e) => {
        if (modoRef.current) return;
        const alvo = map.queryRenderedFeatures(e.point, { layers: TOCAVEIS.filter((id) => map.getLayer(id)) });
        const cursor = alvo.length ? "pointer" : "";
        if (map.getCanvas().style.cursor !== cursor) map.getCanvas().style.cursor = cursor;
      });
      setMapa({ map, cores });
    })();
    return () => { vivo = false; setMapa(null); enquadrou.current = false; };
  };

  useEffect(() => {
    toqueRef.current = (e) => {
      if (!mapa || modo) return;
      const { map } = mapa;
      const f = map.queryRenderedFeatures(e.point, { layers: TOCAVEIS.filter((id) => map.getLayer(id)) })[0];
      const onde: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const props = f?.properties ?? {};
      if (!f) { setAberto(null); return; }
      const ponto = f.geometry.type === "Point" ? (f.geometry.coordinates as [number, number]) : onde;
      if (f.layer.id === "mp-pessoa") {
        const p = pessoas[props.i];
        if (p && !p.anonimo) setAberto({ tipo: "pessoa", i: props.i, p, onde: ponto });
      } else if (f.layer.id === "mp-igrejas" || f.layer.id === "mp-grupos") {
        const l = locais.find((x) => x.id === props.id);
        if (l && temPonto(l)) setAberto({ tipo: "local", l: l as LocalMapa & Ponto, onde: ponto });
      } else if (f.layer.id === "mp-lugares") {
        const pt = lugares.find((x) => x.id === props.id);
        if (pt) setAberto({ tipo: "lugar", pt, onde: ponto });
      } else if (f.layer.id === "mp-areas-fill") {
        const a = areas.find((x) => x.id === props.id);
        if (a) setAberto({ tipo: "area", a, onde });
      } else if (f.layer.id === "mp-regioes-fill") {
        const r = regioes.find((x) => x.codigo === props.codigo);
        if (r) setAberto({ tipo: "regiao", r, onde });
      }
    };
  });

  /* dados nas fontes */
  useEffect(() => {
    if (!mapa) return;
    const { map, cores } = mapa;
    const set = (id: string, data: GeoJSON.FeatureCollection) => (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    const pt = (lng: number, lat: number): GeoJSON.Point => ({ type: "Point", coordinates: [lng, lat] });
    set("mp-pessoas", { type: "FeatureCollection", features: pessoas.map((p, i) => ({ type: "Feature", properties: { i, situacao: p.situacao, anonimo: p.anonimo }, geometry: pt(p.longitude, p.latitude) })) });
    set("mp-calor", { type: "FeatureCollection", features: pessoas.map((p) => ({ type: "Feature", properties: {}, geometry: pt(p.longitude, p.latitude) })) });
    set("mp-locais", { type: "FeatureCollection", features: locais.filter(temPonto).map((l) => ({ type: "Feature", properties: { id: l.id, igreja: l.tipo !== "grupo", sede: l.tipo === "sede" }, geometry: pt(l.longitude as number, l.latitude as number) })) });
    set("mp-lugares", { type: "FeatureCollection", features: lugaresVisiveis.filter((x) => lugaresLigados.includes(grupoDoLugar(x.categoria))).map((x) => ({ type: "Feature", properties: { id: x.id, grupo: grupoDoLugar(x.categoria) }, geometry: pt(x.longitude, x.latitude) })) });
    set("mp-regioes", { type: "FeatureCollection", features: regioes.map((r) => ({ type: "Feature", properties: { codigo: r.codigo, tom: tomPresenca(r.um_a_cada) }, geometry: r.geojson })) });
    set("mp-areas", { type: "FeatureCollection", features: areas.filter((a) => !areasOcultas.includes(a.id)).map((a) => ({ type: "Feature", properties: { id: a.id, hex: cores[a.cor] }, geometry: a.geojson })) });
    set("mp-raios", { type: "FeatureCollection", features: sede ? [1, 3, 5].map((km) => ({ type: "Feature", properties: { km }, geometry: circulo(sede, km) })) : [] });
    set("mp-mascara", areaDoLider ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: mascaraFora(areaDoLider.geojson) }] } : vazio());
  }, [mapa, pessoas, locais, lugaresVisiveis, lugaresLigados, regioes, areas, areasOcultas, sede, areaDoLider]);

  /* camadas ligadas, transparência e seleção */
  useEffect(() => {
    if (!mapa) return;
    const { map } = mapa;
    const emModo = !!modo;
    mostrar(map, IDS.pessoas, camadas.pessoas && modo !== "linha");
    mostrar(map, IDS.calor, camadas.calor && !emModo);
    mostrar(map, IDS.igrejas, camadas.igrejas);
    mostrar(map, IDS.grupos, camadas.grupos && usaGrupos);
    mostrar(map, IDS.presenca, camadas.presenca && comIbge && modo !== "area");
    mostrar(map, IDS.raios, camadas.raios && !emModo);
    mostrar(map, IDS.areas, !emModo);
    mostrar(map, IDS.lugares, !emModo);
    if (map.getLayer("mp-calor")) map.setPaintProperty("mp-calor", "heatmap-opacity", opacidade(OPACIDADE.calor, transp.calor));
    if (map.getLayer("mp-regioes-fill")) map.setPaintProperty("mp-regioes-fill", "fill-opacity", opacidade(OPACIDADE.presenca, transp.presenca));
    if (map.getLayer("mp-regioes-sel")) map.setFilter("mp-regioes-sel", ["==", ["get", "codigo"], aberto?.tipo === "regiao" ? aberto.r.codigo : ""]);
    if (map.getLayer("mp-pessoa-sel")) map.setFilter("mp-pessoa-sel", ["==", ["get", "i"], aberto?.tipo === "pessoa" ? aberto.i : -1]);
    marcarGrupo(map, aberto?.tipo === "local" && aberto.l.tipo === "grupo" ? aberto.l.id : null);
  }, [mapa, camadas, transp, modo, aberto, usaGrupos, comIbge]);


  /* abre na sede; sem sede, enquadra a área do líder ou os pontos */
  const enquadrou = useRef(false);
  useEffect(() => {
    if (!mapa || enquadrou.current) return;
    if (sede) {
      enquadrou.current = true;
      mapa.map.jumpTo({ center: [sede.longitude, sede.latitude], zoom: 14 });
      return;
    }
    const caixa = areaDoLider ? caixaDaGeometria(areaDoLider.geojson) : caixaDosPontos([...pessoas, ...locais.filter(temPonto)] as Ponto[]);
    if (!caixa) return;
    enquadrou.current = true;
    mapa.map.fitBounds(caixa, { padding: { top: 80, bottom: 120, left: LARGURA_PAINEL + 40, right: 80 }, maxZoom: 14, duration: 0 });
  }, [mapa, pessoas, locais, areaDoLider, sede]);

  useEffect(() => {
    if (!mapa) return;
    if (tres) { ligarPredios3D(mapa.map, mapa.cores); mapa.map.easeTo({ pitch: 55 }); } else mapa.map.easeTo({ pitch: 0 });
  }, [mapa, tres]);

  const irPara = (centro: [number, number], zoom = 15) => mapa?.map.easeTo({ center: centro, zoom });
  const enquadrar = (g: GeoJSON.Geometry) => {
    const caixa = caixaDaGeometria(g);
    if (caixa && mapa) mapa.map.fitBounds(caixa, { padding: { top: 80, bottom: 120, left: (recolhido ? LARGURA_TRILHO : LARGURA_PAINEL) + 40, right: 80 }, maxZoom: 15 });
  };
  const vira = (k: ChaveCamada) => () => setCamadas((c) => ({ ...c, [k]: !c[k] }));
  const analisar = (codigos: string[], n: "bairro" | "setor" | "area" = nivel) => { setMesaRegioes(codigos); setMesaNivel(n); setAberto(null); setTela("mesa"); };
  const abrirModo = (m: Modo) => { setAberto(null); setModo(m); };

  /* ── busca: pessoa, bairro, igreja ou grupo ── */
  const termo = busca.trim().toLowerCase();
  const sugestoes = termo.length < 2 ? [] : [
    ...pessoas.flatMap((p, i) => (p.nome?.toLowerCase().includes(termo) ? [{ p, i }] : [])).slice(0, 5).map(({ p, i }) => ({
      k: `p${p.id}`, t: p.nome as string, s: SITUACAO[p.situacao] ?? "pessoa",
      ir: () => { setCamadas((c) => ({ ...c, pessoas: true })); irPara([p.longitude, p.latitude], 16); setAberto({ tipo: "pessoa", i, p, onde: [p.longitude, p.latitude] }); },
    })),
    ...locais.filter((l) => l.nome.toLowerCase().includes(termo) && temPonto(l)).slice(0, 5).map((l) => ({
      k: `l${l.id}`, t: l.nome, s: l.tipo === "grupo" ? ct("{grupo}") : l.tipo === "sede" ? "sede" : "congregação",
      ir: () => { const o: [number, number] = [l.longitude as number, l.latitude as number]; irPara(o); setAberto({ tipo: "local", l: l as LocalMapa & Ponto, onde: o }); },
    })),
    ...regioes.filter((r) => r.nome.toLowerCase().includes(termo)).slice(0, 5).map((r) => ({
      k: `r${r.codigo}`, t: r.nome, s: nivel,
      ir: () => { setCamadas((c) => ({ ...c, presenca: true })); enquadrar(r.geojson); const cx = caixaDaGeometria(r.geojson); if (cx) setAberto({ tipo: "regiao", r, onde: [(cx[0][0] + cx[1][0]) / 2, (cx[0][1] + cx[1][1]) / 2] }); },
    })),
  ];

  /* contexto estável para os modos: só muda quando mudam os dados */
  const contexto: ContextoMapa | null = useMemo(() => (mapa && acesso ? { org: organizationId, mapa: mapa.map, cores: mapa.cores, acesso, cidade, regioes, pessoas, locais, areas, people, igreja: churchName, recarregar: carregar, fechar: () => setModo(null) } : null), [mapa, acesso, organizationId, cidade, regioes, pessoas, locais, areas, people, churchName, carregar]);

  /* ── estados vazios e de acesso ── */
  if (erro) return <div className="mapa-tela"><div className="mp-vazio"><div><p className="mp-texto" role="alert">{erro}</p><Botao compacto onClick={() => { setErro(""); carregar(); }}>Tentar de novo</Botao></div></div></div>;
  if (acesso && !acesso.pode) return <div className="mapa-tela"><div className="mp-vazio"><div><p className="mp-texto">O mapa da igreja ainda não foi liberado para você. Fale com o pastor.</p></div></div></div>;
  if (tela === "mesa" && acesso) return <Mesa org={organizationId} acesso={acesso} cidade={cidade} nivel={mesaNivel} regioesIniciais={mesaRegioes} igreja={churchName} onVoltar={() => setTela("mapa")} onAbrirMembro={onAbrirMembro} onMensagem={onMensagem} />;
  if (tela === "liberar") return <LiberarMapa org={organizationId} people={people} areas={areas} onVoltar={() => { setTela("mapa"); carregar(); }} />;

  const semDados = acesso?.pode && totais && totais.com_ponto === 0 && locais.every((l) => !temPonto(l));
  const carregando = !acesso || (acesso.pode && !totais);
  const comPessoas = acesso?.detalhe === "pessoas";

  const ferramentas: ItemFerramenta[] = [
    ...(acesso?.pode_editar ? [{ id: "area", rotulo: "Criar área", icone: ic("area"), aoTocar: () => { setAreaInicial([]); abrirModo("area"); } }] : []),
    { id: "rota", rotulo: "Traçar rota", icone: ic("rota"), aoTocar: () => abrirModo("rota") },
    { id: "linha", rotulo: "Linha do tempo", icone: ic("linhadotempo"), aoTocar: () => abrirModo("linha") },
    ...(acesso?.pode_editar ? [{ id: "lugar", rotulo: "Marcar lugar", icone: ic("marcarlugar"), aoTocar: () => abrirModo("pontos") }] : []),
    ...(acesso?.pode_mesa ? [{ id: "analisar", rotulo: "Analisar", icone: ic("analisar"), aoTocar: () => analisar(aberto?.tipo === "regiao" ? [aberto.r.codigo] : []) }] : []),
    ...(acesso?.total && acesso.pode_editar ? [{ id: "emergencia", rotulo: "Emergência", icone: ic("emergencia"), alerta: true, aoTocar: () => abrirModo("emergencia") }] : []),
  ];

  return (
    <div className="mapa-tela">
      <MapaBase rotulo="Mapa da igreja" onPronto={pronto} />

      {carregando && <div className="mp-vazio"><div><p className="mp-texto" role="status">Carregando o mapa...</p></div></div>}
      {semDados && !modo && (
        <div className="mp-vazio"><div>
          <p className="mp-pergunta">Ainda não há ninguém no mapa</p>
          <p className="mp-texto">As pessoas aparecem aqui quando têm CEP no cadastro. Peça para atualizarem no Perfil do app, ou preencha na ficha de cada uma.</p>
        </div></div>
      )}

      {!modo && (
        <>
          <PainelMapa
            rotulo="Camadas do mapa"
            titulo="Mapa da igreja"
            recolhido={recolhido}
            aoRecolher={setRecolhido}
            trilho={[
              { id: "igreja", rotulo: "Igreja", icone: ic("membros") },
              ...(comIbge ? [{ id: "ibge", rotulo: "Cidade · IBGE 2022", icone: ic("presenca") }] : []),
              ...(areas.length ? [{ id: "areas", rotulo: "Áreas da igreja", icone: ic("area") }] : []),
              { id: "lugares", rotulo: "Lugares da região", icone: ic("bandeira") },
            ]}
            busca={(
              <div className="mp-busca">
                <Icon name="buscar" size={18} />
                <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape" && busca) { e.preventDefault(); setBusca(""); } }}
                  placeholder={ct("Buscar pessoa, bairro ou {grupo}")} aria-label="Buscar no mapa" autoComplete="off" />
                {sugestoes.length > 0 && (
                  <div className="mp-sugestoes" role="listbox" aria-label="Resultados da busca">
                    {sugestoes.map((s) => (
                      <Acao key={s.k} role="option" aria-selected="false" className="mp-sug" onClick={() => { s.ir(); setBusca(""); }}>
                        <span>{s.t}</span><span className="mp-fraco">{s.s}</span>
                      </Acao>
                    ))}
                  </div>
                )}
              </div>
            )}
            rodape={(
              <>
                <span className="mp-pe-linha"><Icon name="privacidade" size={16} />Nenhum endereço aparece no mapa.</span>
                {areaDoLider && <span>Você vê só {areaDoLider.nome}.</span>}
                {acesso?.detalhe === "numeros" && <span>Sua liberação mostra só os números por região, sem pessoas.</span>}
                <span className="mp-pe-links">
                  {semCep > 0 && <Botao variante="texto" onClick={() => { setJanela("semcep"); setSemPonto(null); carregarSemPonto(organizationId).then(setSemPonto).catch(() => setSemPonto([])); }}>{plural(semCep, "pessoa")} sem CEP</Botao>}
                  {podeLiberar && <Botao variante="texto" onClick={() => { setAberto(null); setTela("liberar"); }}>Quem vê o mapa</Botao>}
                  <Botao variante="texto" onClick={() => setJanela("entenda")}>Entenda o mapa</Botao>
                </span>
              </>
            )}
          >
            <GrupoCamadas titulo="Igreja">
              {comPessoas && (
                <LinhaCamada icone={ic("membros")} rotulo="Pessoas da igreja" detalhe={totais ? `${milhar(totais.com_ponto)} no mapa` : undefined} ligada={camadas.pessoas} aoAlternar={vira("pessoas")} />
              )}
              {comPessoas && (
                <LinhaCamada icone={ic("concentracao")} rotulo="Concentração da igreja" ligada={camadas.calor} aoAlternar={vira("calor")}>
                  <TransparenciaCamada valor={transp.calor} aoMudar={(v) => setTransp((t) => ({ ...t, calor: v }))} />
                </LinhaCamada>
              )}
              <LinhaCamada icone={<MarcaCamada tipo="igreja" />} rotulo="Sede e congregações" ligada={camadas.igrejas} aoAlternar={vira("igrejas")} />
              {usaGrupos && <LinhaCamada icone={<MarcaCamada tipo="celula" />} rotulo={ct("{Grupos}")} detalhe={`${milhar(grupos.length)} no mapa`} ligada={camadas.grupos} aoAlternar={vira("grupos")} />}
            </GrupoCamadas>

            {comIbge && (
              <GrupoCamadas titulo="Cidade · IBGE 2022">
                <LinhaCamada icone={ic("presenca")} rotulo="Presença da igreja" detalhe="pessoas da igreja por morador" ligada={camadas.presenca} aoAlternar={vira("presenca")}>
                  <EscalaTons inicio={`1 a cada mais de ${milhar(2000)}`} fim="1 a cada 200 ou menos" />
                  {cidade?.um_a_cada ? <span className="mp-fraco">Na cidade: {umACada(cidade.um_a_cada, true)}</span> : null}
                  <TransparenciaCamada valor={transp.presenca} aoMudar={(v) => setTransp((t) => ({ ...t, presenca: v }))} />
                </LinhaCamada>
              </GrupoCamadas>
            )}

            {areas.length > 0 && (
              <GrupoCamadas titulo="Áreas da igreja" contagem={areas.length} recolhivel aberto={grupoAberto.areas} aoAlternar={() => setGrupoAberto((g) => ({ ...g, areas: !g.areas }))}>
                {areas.map((a) => (
                  <LinhaCamada key={a.id} recuo rotulo={a.nome} detalhe={TIPO_AREA[a.tipo]} ligada={!areasOcultas.includes(a.id)}
                    aoAlternar={() => setAreasOcultas((o) => (o.includes(a.id) ? o.filter((x) => x !== a.id) : [...o, a.id]))} />
                ))}
              </GrupoCamadas>
            )}

            <GrupoCamadas titulo="Lugares da região" recolhivel aberto={grupoAberto.lugares} aoAlternar={() => setGrupoAberto((g) => ({ ...g, lugares: !g.lugares }))}>
              {LUGARES.filter((g) => contaLugares(g.id) > 0).map((g) => (
                <LinhaCamada key={g.id} icone={g.id === "igreja" ? <MarcaCamada tipo="lugar" /> : ic(g.icone)} rotulo={g.nome} detalhe={plural(contaLugares(g.id), "lugar", "lugares")}
                  ligada={lugaresLigados.includes(g.id)} aoAlternar={() => setLugaresLigados((l) => (l.includes(g.id) ? l.filter((x) => x !== g.id) : [...l, g.id]))} />
              ))}
              {sede && <LinhaCamada icone={ic("circulo")} rotulo="Raios da sede" detalhe="1, 3 e 5 km" ligada={camadas.raios} aoAlternar={vira("raios")} />}
            </GrupoCamadas>
          </PainelMapa>

          {aberto && mapa && (
            <BalaoDoPonto key={`${aberto.tipo}-${"i" in aberto ? aberto.i : aberto.tipo === "local" ? aberto.l.id : aberto.tipo === "lugar" ? aberto.pt.id : aberto.tipo === "area" ? aberto.a.id : aberto.r.codigo}`}
              sel={aberto} map={mapa.map} pessoas={pessoas} grupos={grupos} usaGrupos={usaGrupos} cidade={cidade} nivel={nivel} acesso={acesso}
              aoFechar={() => setAberto(null)} onAbrirMembro={onAbrirMembro} onMensagem={onMensagem}
              onAnalisar={analisar} onCriarArea={(cod) => { setAreaInicial(cod); abrirModo("area"); }} />
          )}

          <BarraFerramentas rotulo="Ferramentas do mapa" itens={ferramentas} fileira={celular} compacta={!celular}
            desloc={celular ? 0 : recolhido ? LARGURA_TRILHO : LARGURA_PAINEL} reservaDir={celular ? 0 : RESERVA_AJUDA} />

          <div className="mp-ctrl" role="group" aria-label="Controles do mapa">
            <BotaoIcone className="mp-ctrl-b" rotulo="Inclinar em 3D" aria-pressed={tres} onClick={() => setTres((v) => !v)}><Icon name="tresd" size={20} stroke={1.9} /></BotaoIcone>
            <BotaoIcone className="mp-ctrl-b" rotulo="Aproximar" onClick={() => mapa?.map.zoomIn()}><Icon name="add" size={20} stroke={2} /></BotaoIcone>
            <BotaoIcone className="mp-ctrl-b" rotulo="Afastar" onClick={() => mapa?.map.zoomOut()}><Icon name="menos" size={20} stroke={2} /></BotaoIcone>
          </div>
        </>
      )}

      {janela === "entenda" && mapa && <EntendaOMapa cores={mapa.cores} usaGrupos={usaGrupos} totais={totais} aoFechar={() => setJanela(null)} />}
      {janela === "semcep" && (
        <Janela titulo="Pessoas sem CEP" texto="Elas ainda não aparecem no mapa. Abra a ficha e preencha o CEP." aoFechar={() => setJanela(null)} corpoBloco>
          {!semPonto ? <p className="mp-fraco" role="status">Carregando...</p> : semPonto.length === 0 ? <p className="mp-fraco">Todo mundo já está no mapa.</p> : (
            <div className="mp-semcep">
              {semPonto.map((x) => (
                <Acao key={x.id} className={`${linhaClasse({})} click mp-semcep-linha`} onClick={() => { setJanela(null); onAbrirMembro(x.id); }}>
                  <span>{x.nome}</span><span className="mp-fraco">{x.tem_cep ? "CEP não encontrado" : "sem CEP"}</span>
                </Acao>
              ))}
            </div>
          )}
        </Janela>
      )}

      {contexto && modo === "area" && <CriarArea ctx={contexto} bairrosIniciais={areaInicial} nivel={nivel} />}
      {contexto && modo === "rota" && <Rota ctx={contexto} />}
      {contexto && modo === "emergencia" && <Emergencia ctx={contexto} />}
      {contexto && modo === "linha" && <LinhaDoTempo ctx={contexto} nivel={nivel} />}
      {contexto && modo === "pontos" && <Pontos ctx={contexto} />}
      {!contexto && modo && <div className="mp-vazio"><div><p className="mp-texto" role="status">Carregando o mapa...</p></div></div>}
    </div>
  );
}

/* Balão do ponto tocado: tudo do ponto, sem painel lateral (PLANO §10, P1). */
function BalaoDoPonto({ sel, map, pessoas, grupos, usaGrupos, cidade, nivel, acesso, aoFechar, onAbrirMembro, onMensagem, onAnalisar, onCriarArea }: {
  sel: Aberto; map: MlMap; pessoas: PessoaMapa[]; grupos: (LocalMapa & Ponto)[]; usaGrupos: boolean; cidade: Cidade | null; nivel: "bairro" | "setor"; acesso: Acesso | null;
  aoFechar: () => void; onAbrirMembro: (id: string) => void; onMensagem: (id: string) => void;
  onAnalisar: (codigos: string[], nivel?: "area") => void; onCriarArea: (codigos: string[]) => void;
}) {
  const { comTermos: ct } = useTermos();
  /* o balão acompanha o ponto quando o mapa se move; só ele redesenha. Com o
     ponto fora da tela fica escondido, mas montado (não puxa o foco de volta) */
  const projetar = useCallback(() => {
    const p = map.project(sel.onde);
    const c = map.getContainer();
    return { x: p.x, y: p.y, fora: p.x < 0 || p.y < 0 || p.x > c.clientWidth || p.y > c.clientHeight };
  }, [map, sel.onde]);
  const [pos, setPos] = useState(projetar);
  useEffect(() => {
    const mexeu = () => setPos(projetar());
    map.on("move", mexeu);
    return () => { map.off("move", mexeu); };
  }, [map, projetar]);
  const comum = { x: pos.x, y: pos.y, oculto: pos.fora, aoFechar };

  if (sel.tipo === "pessoa") {
    const p = sel.p;
    let perto: { g: LocalMapa; km: number } | null = null;
    for (const g of grupos) { const km = distanciaKm(p, g); if (!perto || km < perto.km) perto = { g, km }; }
    return (
      <Balao {...comum} sobretitulo={`${SITUACAO[p.situacao] ?? p.situacao}${p.desde ? ` desde ${p.desde}` : ""}`} titulo={p.nome ?? ""}
        rodape={p.id ? <><Botao onClick={() => onAbrirMembro(p.id!)}>Ver ficha</Botao><Botao variante="principal" onClick={() => onMensagem(p.id!)}>Falar com {primeiroNome(p.nome)}</Botao></> : undefined}>
        {usaGrupos && <LinhaBalao icone="inicio">{p.grupo ?? ct("Sem {grupo}")}</LinhaBalao>}
        {usaGrupos && perto && perto.g.id !== p.grupo_id && <LinhaBalao icone="mapapin">{ct("{Grupo} mais perto")}: {perto.g.nome} · {formatarDistancia(perto.km)}</LinhaBalao>}
        {perto?.g.lider_nome && perto.g.id !== p.grupo_id && <LinhaBalao icone="pessoa">{perto.g.lider_nome} lidera</LinhaBalao>}
      </Balao>
    );
  }

  if (sel.tipo === "local") {
    const l = sel.l;
    const perto = pessoas.filter((p) => distanciaKm(p, l) <= 1).length;
    const vagas = l.lugares ? Math.max(0, l.lugares - (l.ocupados ?? 0)) : null;
    const onde = [[l.rua, l.numero].filter(Boolean).join(", "), l.bairro].filter(Boolean).join(" · ");
    return (
      <Balao {...comum} sobretitulo={l.tipo === "sede" ? "Sede" : l.tipo === "congregacao" ? "Congregação" : ct("{Grupo}")} titulo={l.nome}
        rodape={l.lider_member_id ? <Botao variante="principal" onClick={() => onMensagem(l.lider_member_id!)}>Falar com {primeiroNome(l.lider_nome)}</Botao> : undefined}>
        {(l.dia || l.hora) && <LinhaBalao icone="agenda">{[l.dia, l.hora].filter(Boolean).join(" · ")}</LinhaBalao>}
        {onde && <LinhaBalao icone="mapapin">{onde}</LinhaBalao>}
        {l.lider_nome && <LinhaBalao icone="pessoa">{l.lider_nome} lidera</LinhaBalao>}
        {l.lugares ? <LinhaBalao icone="membros">{l.ocupados ?? 0} de {l.lugares} lugares · {vagas ? plural(vagas, "vaga") : "lotado"}</LinhaBalao> : null}
        <LinhaBalao icone="concentracao">{perto === 1 ? "1 pessoa da igreja mora" : `${milhar(perto)} pessoas da igreja moram`} a até 1 km</LinhaBalao>
      </Balao>
    );
  }

  if (sel.tipo === "area") {
    const a = sel.a;
    const dentro = pessoas.filter((p) => dentroDe(p, a.geojson)).length;
    return (
      <Balao {...comum} sobretitulo={TIPO_AREA[a.tipo]} titulo={a.nome}
        rodape={acesso?.pode_mesa ? <Botao onClick={() => onAnalisar([a.id], "area")}>Analisar</Botao> : undefined}>
        <LinhaBalao icone="membros">{plural(dentro, "pessoa da igreja", "pessoas da igreja")} no mapa</LinhaBalao>
        <LinhaBalao icone="pessoa">{a.responsavel ? `${a.responsavel} é responsável` : "Sem responsável ainda"}</LinhaBalao>
      </Balao>
    );
  }

  if (sel.tipo === "lugar") {
    const pt = sel.pt;
    return (
      <Balao {...comum} sobretitulo={CATEGORIAS.find((c) => c.id === pt.categoria)?.nome.replace("Pontos da igreja · ", "")} titulo={pt.nome || "Sem nome"}>
        {pt.endereco && <LinhaBalao icone="mapapin">{pt.endereco}</LinhaBalao>}
        {pt.observacao && <LinhaBalao icone="documento">{pt.observacao}</LinhaBalao>}
        <LinhaBalao icone={pt.origem === "osm" ? "globo" : "bandeira"}>{pt.origem === "osm" ? "Do OpenStreetMap" : "Marcado pela igreja"}</LinhaBalao>
      </Balao>
    );
  }

  const r = sel.r;
  return (
    <Balao {...comum} sobretitulo={`${nivel === "bairro" ? "Bairro" : "Setor"} · IBGE 2022`} titulo={r.nome}
      rodape={(acesso?.pode_mesa || (acesso?.pode_editar && nivel === "bairro")) ? (
        <>
          {acesso?.pode_editar && nivel === "bairro" && <Botao onClick={() => onCriarArea([r.codigo])}>Criar área</Botao>}
          {acesso?.pode_mesa && <Botao onClick={() => onAnalisar([r.codigo])}>Analisar</Botao>}
        </>
      ) : undefined}>
      <LinhaBalao icone="presenca">{umACada(r.um_a_cada)}</LinhaBalao>
      <LinhaBalao icone="moradores"><span className="mp-num">{milhar(r.moradores)}</span> moradores</LinhaBalao>
      <LinhaBalao icone="membros"><span className="mp-num">{pessoasNaRegiao(r.pessoas)}</span> da igreja</LinhaBalao>
      {usaGrupos && <LinhaBalao icone="inicio">{r.grupos ? plural(r.grupos, ct("{grupo}"), ct("{grupos}")) : ct("Nenhum {grupo}")}</LinhaBalao>}
      {cidade?.um_a_cada ? <span className="mp-fraco">Na cidade: {umACada(cidade.um_a_cada, true)}</span> : null}
    </Balao>
  );
}

/* "Entenda o mapa": a legenda fica aqui, pequena, e não no mapa (decisão de 2026-11-05). */
function EntendaOMapa({ cores, usaGrupos, totais, aoFechar }: { cores: Record<CorMapa, string>; usaGrupos: boolean; totais: Totais | null; aoFechar: () => void }) {
  const { comTermos: ct } = useTermos();
  const marca = (t: Marcador) => {
    const { svg, w, h } = svgMarcador(t, cores);
    const k = 28 / Math.max(w, h);
    // eslint-disable-next-line @next/next/no-img-element -- marcador em SVG gerado aqui, não é foto
    return <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} width={Math.round(w * k)} height={Math.round(h * k)} alt="" />;
  };
  const itens: { m: React.ReactNode; t: string }[] = [
    { m: <span className="mp-bola membro" />, t: "Membro" },
    { m: <span className="mp-bola novo" />, t: "Novo na igreja" },
    { m: marca("sede"), t: "Sede e congregações" },
    ...(usaGrupos ? [{ m: marca("celula"), t: ct("{Grupos}") }] : []),
    { m: marca("lugar-igreja"), t: "Lugar marcado pela igreja" },
    { m: marca("lugar-regiao"), t: "Lugar da região" },
  ];
  return (
    <Janela titulo="Entenda o mapa" aoFechar={aoFechar} corpoBloco>
      <div className="mp-legenda">
        {itens.map((i) => <div key={i.t} className="mp-legenda-it"><span className="mp-legenda-m" aria-hidden="true">{i.m}</span>{i.t}</div>)}
      </div>
      <p className="mp-texto mp-legenda-txt">Cada pessoa aparece perto do CEP do cadastro, nunca na casa. Só quem aceitou o termo aparece com nome; as outras são só um ponto, e só quando há 3 ou mais perto.</p>
      {totais && totais.com_ponto > 0 && <p className="mp-fraco">{milhar(totais.com_nome)} de {milhar(totais.com_ponto)} aparecem com nome.</p>}
    </Janela>
  );
}
