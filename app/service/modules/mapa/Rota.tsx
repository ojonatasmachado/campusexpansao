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
import { Campo, Entrada, Marcar } from "../../ui/Campo";
import { Opcao } from "../../ui/Opcao";
import { Segmentado } from "../../ui/Segmentado";
import { AvatarGrupo } from "../../ui/Avatar";
import { Janela } from "../../ui/Janela";
import { PainelMapa } from "../../ui/PainelMapa";
import { Selecao } from "../../ui/Selecao";

/* Ferramentas › Traçar rota (G11, mapa/PLANO.md §10, prancha P9). O painel da
   ferramenta ocupa o lugar das camadas, com "Voltar ao mapa". O objetivo vem
   primeiro e muda o que vira parada: na Visita, as pessoas com nome no mapa; nos
   outros, lugares e ruas, nunca casas. Paradas se reordenam arrastando (ou com
   as setas do teclado na alça), a saída fica fixa. */

type Objetivo = "visita" | "oracao" | "panfletagem" | "som" | "outro";
type Parada = { id: string; nome: string; tipo: string; lnglat: [number, number] };
type Resultado = { trajeto: GeoJSON.LineString; distancia_km: number; duracao_min: number; aproximado: boolean };

const OBJETIVOS: { id: Objetivo; nome: string; dica: string }[] = [
  { id: "visita", nome: "Visita", dica: "Toque nas pessoas do mapa para incluir. O endereço fica na ficha." },
  { id: "oracao", nome: "Oração", dica: "Toque no mapa para pôr uma parada. Arraste na lista para mudar a ordem." },
  { id: "panfletagem", nome: "Panfletagem", dica: "Toque nas ruas e lugares, ou escolha uma área para percorrer." },
  { id: "som", nome: "Carro de som", dica: "Escolha uma área para o carro cobrir as ruas dela." },
  { id: "outro", nome: "Outro", dica: "Toque no mapa para pôr uma parada." },
];
const MAX_PARADAS = 25;
let seq = 0;
const novoId = () => `p${++seq}`;

/* o app de mapas abre até 11 pontos: saída, 9 no meio e a última parada.
   Com mais, os do meio são escolhidos espaçados ao longo da rota. */
const MAX_LINK = 11;
function pontosDoLink(pts: [number, number][]) {
  if (pts.length <= MAX_LINK) return pts;
  const meio = pts.slice(1, -1);
  const passo = meio.length / (MAX_LINK - 2);
  return [pts[0], ...Array.from({ length: MAX_LINK - 2 }, (_, i) => meio[Math.floor(i * passo)]), pts[pts.length - 1]];
}
function linkMapas(pts: [number, number][], como: "pe" | "carro") {
  const p = pontosDoLink(pts).map(([lng, lat]) => `${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${p[0]}&destination=${p[p.length - 1]}${p.length > 2 ? `&waypoints=${p.slice(1, -1).join("|")}` : ""}&travelmode=${como === "pe" ? "walking" : "driving"}`;
}
const tempo = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`);

export function Rota({ ctx }: { ctx: ContextoMapa }) {
  const sede = ctx.locais.find((l) => l.tipo === "sede" && temPonto(l));
  const saida = useMemo<Parada | null>(() => (sede ? { id: "saida", nome: sede.nome, tipo: "Saída", lnglat: [sede.longitude as number, sede.latitude as number] } : null), [sede]);
  const [objetivo, setObjetivo] = useState<Objetivo>("oracao");
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [como, setComo] = useState<"pe" | "carro">("pe");
  const [areaId, setAreaId] = useState("");
  const [res, setRes] = useState<Resultado | null>(null);
  const [nome, setNome] = useState("");
  const [quando, setQuando] = useState("");
  const [equipe, setEquipe] = useState<string[]>([]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const todas = useMemo(() => (saida ? [saida, ...paradas] : paradas), [saida, paradas]);
  const estado = useRef({ objetivo, total: todas.length });
  useEffect(() => { estado.current = { objetivo, total: todas.length }; });

  /* só a resposta do último pedido vale (as antigas chegam fora de ordem) */
  const pedido = useRef(0);
  const calcular = async (lista: Parada[], otimizar: boolean) => {
    const n = ++pedido.current;
    if (lista.length < 2) { setRes(null); return lista; }
    try {
      const r = await fetch("/api/service/mapa/rota", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org: ctx.org, paradas: lista.map((p) => p.lnglat), como, otimizar }) });
      if (!r.ok) {
        const msg = await r.json().then((x: { error?: string }) => x.error).catch(() => undefined);
        throw new Error(msg || "Não foi possível traçar a rota agora. Confira a conexão e tente de novo.");
      }
      const j = await r.json() as Resultado & { ordem: number[] };
      if (n !== pedido.current) return lista;
      setRes(j);
      return j.ordem.map((i) => lista[i]);
    } catch (e) {
      if (n === pedido.current) { setRes(null); avisar(e instanceof Error && e.message ? e.message : "Não foi possível traçar a rota agora. Tente de novo.", "warn"); }
      return lista;
    }
  };

  /* camadas da rota e toque para incluir parada */
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
      if (s.total >= MAX_PARADAS) { avisar(`Uma rota tem no máximo ${MAX_PARADAS} paradas. Tire uma para pôr outra.`, "warn"); return; }
      /* visita: encosta na pessoa com nome mais perto do toque */
      if (s.objetivo === "visita") {
        let melhor: { nome: string; ll: [number, number]; d: number } | null = null;
        for (const p of ctx.pessoas) {
          if (p.anonimo || !p.nome) continue;
          const pt = mapa.project([p.longitude, p.latitude]);
          const d = Math.hypot(pt.x - e.point.x, pt.y - e.point.y);
          if (d < 24 && (!melhor || d < melhor.d)) melhor = { nome: p.nome, ll: [p.longitude, p.latitude], d };
        }
        if (!melhor) { avisar("Na visita, toque em cima de uma pessoa do mapa.", "info"); return; }
        const m = melhor;
        setParadas((ps) => [...ps, { id: novoId(), nome: m.nome, tipo: "Pessoa", lnglat: m.ll }]);
        return;
      }
      const local = ctx.locais.filter(temPonto).map((l) => {
        const pt = mapa.project([l.longitude as number, l.latitude as number]);
        return { l, d: Math.hypot(pt.x - e.point.x, pt.y - e.point.y) };
      }).sort((a, b) => a.d - b.d)[0];
      if (local && local.d < 20) setParadas((ps) => [...ps, { id: novoId(), nome: local.l.nome, tipo: local.l.tipo === "grupo" ? "Grupo" : "Igreja", lnglat: [local.l.longitude as number, local.l.latitude as number] }]);
      else setParadas((ps) => [...ps, { id: novoId(), nome: `Parada ${ps.length + 1}`, tipo: "Lugar", lnglat: [e.lngLat.lng, e.lngLat.lat] }]);
    };
    mapa.on("click", clique);
    mapa.getCanvas().style.cursor = "crosshair";
    return () => { mapa.off("click", clique); mapa.getCanvas().style.cursor = ""; limparCamadas(mapa, "rt-"); };
  }, [ctx]);

  /* redesenha e recalcula quando muda a lista ou o jeito de ir */
  useEffect(() => {
    (ctx.mapa.getSource("rt-paradas") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: todas.map((p, i) => ({ type: "Feature", properties: { n: i === 0 && saida ? "S" : String(saida ? i : i + 1) }, geometry: { type: "Point", coordinates: p.lnglat } })) });
    const t = setTimeout(() => { calcular(todas, false); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, todas, como]);
  useEffect(() => {
    (ctx.mapa.getSource("rt-trajeto") as GeoJSONSource | undefined)?.setData(res ? { type: "Feature", properties: {}, geometry: res.trajeto } : { type: "FeatureCollection", features: [] });
  }, [ctx, res]);

  const escolherObjetivo = (o: Objetivo) => { setObjetivo(o); setParadas([]); setAreaId(""); };
  /* percorrer a área: pontos do contorno da área escolhida */
  const percorrer = (id: string) => {
    setAreaId(id);
    if (!id) { setParadas([]); return; }
    const a = ctx.areas.find((x) => x.id === id);
    if (!a) return;
    const anel = a.geojson.type === "Polygon" ? a.geojson.coordinates[0] : a.geojson.type === "MultiPolygon" ? a.geojson.coordinates[0][0] : [];
    const passo = Math.max(1, Math.floor(anel.length / 12));
    setParadas(anel.filter((_, i) => i % passo === 0).map((c, i) => ({ id: novoId(), nome: `${a.nome} · trecho ${i + 1}`, tipo: "Rua", lnglat: [c[0], c[1]] as [number, number] })));
    const caixa = caixaDaGeometria(a.geojson);
    if (caixa) ctx.mapa.fitBounds(caixa, { padding: 80 });
  };
  const tirar = (id: string) => setParadas((ps) => ps.filter((p) => p.id !== id));
  const mover = (de: string, para: string) => setParadas((ps) => {
    const i = ps.findIndex((p) => p.id === de), j = ps.findIndex((p) => p.id === para);
    if (i < 0 || j < 0 || i === j) return ps;
    const n = [...ps];
    const [x] = n.splice(i, 1);
    n.splice(j, 0, x);
    return n;
  });
  const moverPasso = (id: string, d: -1 | 1) => setParadas((ps) => {
    const i = ps.findIndex((p) => p.id === id), j = i + d;
    if (i < 0 || j < 0 || j >= ps.length) return ps;
    const n = [...ps];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  /* mover pela alça: o foco volta para a alça movida e o leitor de tela ouve a nova posição */
  const alcas = useRef(new Map<string, HTMLButtonElement>());
  const [movida, setMovida] = useState<{ id: string; n: number } | null>(null);
  const passo = (id: string, d: -1 | 1) => { moverPasso(id, d); setMovida((m) => ({ id, n: (m?.n ?? 0) + 1 })); };
  useEffect(() => { if (movida) alcas.current.get(movida.id)?.focus(); }, [movida]);
  const anuncio = movida ? (() => { const i = paradas.findIndex((p) => p.id === movida.id); return i < 0 ? "" : `${paradas[i].nome}: posição ${i + 1} de ${paradas.length}`; })() : "";

  const melhorOrdem = async () => {
    setOcupado(true);
    const nova = await calcular(todas, true);
    const ordenadas = nova.filter((p) => p.id !== "saida");
    const ids = new Set(ordenadas.map((p) => p.id));
    setParadas((atual) => [...ordenadas.filter((p) => atual.some((a) => a.id === p.id)), ...atual.filter((p) => !ids.has(p.id))]);
    setOcupado(false);
  };

  const obj = OBJETIVOS.find((o) => o.id === objetivo)!;
  const nomesEquipe = ctx.people.filter((p) => equipe.includes(p.id));
  /* na visita o nome das pessoas não vai na mensagem: a equipe recebe só a ordem e o trajeto */
  const resumo = useMemo(() => `${obj.nome}: ${nome || "rota"}${quando ? `, ${new Date(quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}. Paradas: ${todas.map((p, i) => `${i + 1}. ${p.tipo === "Pessoa" ? `Visita ${i + (saida ? 0 : 1)}` : p.nome}`).join("; ")}.`, [obj, nome, quando, todas, saida]);

  const salvar = async (enviar: boolean) => {
    if (todas.length < 2) return;
    setOcupado(true);
    const db = createServiceBrowserClient().schema("service");
    const { error } = await db.from("map_routes").insert({
      organization_id: ctx.org, nome: nome.trim() || `${obj.nome} ${new Date().toLocaleDateString("pt-BR")}`, objetivo,
      paradas: todas.map(({ nome: n, tipo, lnglat }) => ({ nome: n, tipo, lnglat })), ruas_da_area: !!areaId, como,
      quando: quando ? new Date(quando).toISOString() : null, equipe, trajeto: res?.trajeto ?? null, distancia_km: res?.distancia_km ?? null, duracao_min: res?.duracao_min ?? null,
    });
    if (error) { setOcupado(false); avisar("Não foi possível salvar a rota. Tente de novo.", "warn"); return; }
    if (enviar && equipe.length) {
      const { data: fichas } = await db.rpc("mapa_fichas_de", { p_org: ctx.org, p_people: equipe });
      const texto = `${resumo} Trajeto${todas.length > MAX_LINK ? ` (o link mostra ${MAX_LINK} das ${todas.length} paradas, na ordem)` : ""}: ${linkMapas(todas.map((p) => p.lnglat), como)}`;
      let enviados = 0;
      for (const f of (fichas ?? []) as { member_id: string }[]) {
        const { data } = await db.rpc("start_dm", { p_target_member: f.member_id, p_body: texto });
        if (data) enviados++;
      }
      avisar(enviados ? `Rota enviada para ${nomesEquipe.map((p) => p.name.split(" ")[0]).join(", ").replace(/, ([^,]*)$/, " e $1")}.` : "Rota salva. A mensagem não foi: confira se você tem ficha de membro.", enviados ? "ok" : "warn");
    } else avisar("Rota salva.");
    setOcupado(false);
  };

  return (
    <>
      <div className="mp-dica" role="status">{obj.dica}</div>
      <PainelMapa rotulo="Traçar rota" titulo="Traçar rota" voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="rt-objetivos" role="group" aria-label="Objetivo">
            {OBJETIVOS.map((o) => <Opcao key={o.id} estilo="chip-toggle" marcada={objetivo === o.id} onClick={() => escolherObjetivo(o.id)}>{o.nome}</Opcao>)}
          </div>
        )}
        rodape={(
          <div className="rt-acoes">
            <div className="rt-equipe">
              {nomesEquipe.length > 0 && <AvatarGrupo pessoas={nomesEquipe.map((p) => ({ id: p.id, nome: p.name }))} max={3} />}
              <span className="rt-equipe-txt">{nomesEquipe.length ? `Equipe · ${plural(nomesEquipe.length, "pessoa")}` : "Sem equipe ainda"}</span>
              <Botao compacto onClick={() => setEscolhendo(true)}>Escolher</Botao>
            </div>
            <Botao variante="principal" desativado={todas.length < 2 || ocupado || !equipe.length} onClick={() => salvar(true)}>Enviar para a equipe</Botao>
            <span className="rt-acoes-dupla">
              <a className={`${botaoClasse({ compacto: true })}${todas.length < 2 ? " disabled" : ""}`} href={todas.length >= 2 ? linkMapas(todas.map((p) => p.lnglat), como) : undefined} target="_blank" rel="noreferrer" aria-disabled={todas.length < 2}>Abrir no app de mapas</a>
              <Botao compacto desativado={todas.length < 2 || ocupado} onClick={() => salvar(false)}>Salvar rota</Botao>
            </span>
          </div>
        )}>
        <div className="rt-cab">
          <span>Paradas <span className="rt-cab-n">{paradas.length}</span></span>
          <Botao compacto desativado={todas.length < 3 || ocupado} onClick={melhorOrdem}><Icon name="multiplicar" size={14} stroke={2} />Melhor ordem</Botao>
        </div>
        <span className="sr-only" aria-live="polite">{anuncio}</span>
        <div className="rt-lista">
          {saida && (
            <div className="rt-parada">
              <span className="rt-sede" aria-hidden="true"><Icon name="igrejasilhueta" size={18} stroke={1.9} /></span>
              <span className="rt-txt"><b>{saida.nome}</b><span>Saída</span></span>
            </div>
          )}
          {paradas.length === 0 && <p className="mp-fraco rt-vazio">{objetivo === "visita" ? "Nenhuma pessoa ainda." : "Nenhuma parada ainda."}</p>}
          {paradas.map((p, i) => (
            <div key={p.id} className={`rt-parada${arrastando === p.id ? " arrastando" : ""}`} draggable
              onDragStart={(e) => { setArrastando(p.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", p.id); }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!arrastando || arrastando === p.id) return;
                /* só troca depois que o cursor passa do meio da linha (sem tremer) */
                const r = e.currentTarget.getBoundingClientRect();
                const de = paradas.findIndex((x) => x.id === arrastando);
                const meio = e.clientY - r.top > r.height / 2;
                if ((de < i && meio) || (de > i && !meio)) mover(arrastando, p.id);
              }}
              onDragEnd={() => setArrastando(null)}>
              <BotaoIcone ref={(el) => { if (el) alcas.current.set(p.id, el); else alcas.current.delete(p.id); }} className="rt-alca"
                rotulo={`Mover ${p.nome}, posição ${i + 1} de ${paradas.length}. Toque para subir; setas para cima e para baixo`}
                onClick={() => passo(p.id, -1)}
                onKeyDown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); passo(p.id, -1); } if (e.key === "ArrowDown") { e.preventDefault(); passo(p.id, 1); } }}>
                <Icon name="menu" size={16} stroke={2} />
              </BotaoIcone>
              <span className="rt-n" aria-hidden="true">{i + 1}</span>
              <span className="rt-txt"><b>{p.nome}</b><span>{p.tipo}</span></span>
              <BotaoIcone className="rt-tirar" rotulo={`Tirar ${p.nome}`} onClick={() => tirar(p.id)}><Icon name="recusou" size={14} stroke={2.2} /></BotaoIcone>
            </div>
          ))}
        </div>
        <div className="rt-bloco">
          {objetivo !== "visita" && ctx.areas.length > 0 && (
            <div className="rt-linha-campo">
              <label htmlFor="rt-area">Percorrer a área</label>
              <Selecao id="rt-area" valor={areaId} aoMudar={percorrer} vazio="Não, só as paradas" opcoes={ctx.areas.map((a) => ({ v: a.id, l: a.nome }))} />
            </div>
          )}
          <Segmentado role="group" aria-label="Como ir">
            <Opcao marcada={como === "pe"} onClick={() => setComo("pe")}><Icon name="pessoa" size={15} stroke={2} />A pé</Opcao>
            <Opcao marcada={como === "carro"} onClick={() => setComo("carro")}><Icon name="transporte" size={15} stroke={2} />Carro</Opcao>
          </Segmentado>
          {res && (
            <div className="rt-total">
              <span className="rt-total-km mp-num">{String(res.distancia_km).replace(".", ",")} km</span>
              <span>· cerca de {tempo(res.duracao_min)}</span>
              {res.aproximado && <span className="rt-total-obs">em linha reta</span>}
            </div>
          )}
          <div className="rt-campos">
            <Campo rotulo="Nome" id="rt-nome"><Entrada maxLength={80} placeholder={`ex: ${obj.nome} no Jardim América`} value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
            <Campo rotulo="Quando" id="rt-quando"><Entrada type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></Campo>
          </div>
        </div>
      </PainelMapa>

      {escolhendo && (
        <Janela titulo="Equipe da rota" texto="Quem recebe a rota por mensagem." aoFechar={() => setEscolhendo(false)} corpoBloco
          rodape={<Botao variante="principal" onClick={() => setEscolhendo(false)}>Pronto</Botao>}>
          <div className="rt-escolher">
            {ctx.people.map((p) => <Marcar key={p.id} lado="direita" checked={equipe.includes(p.id)} onChange={(e) => setEquipe((q) => (e.target.checked ? [...q, p.id] : q.filter((x) => x !== p.id)))}>{p.name}</Marcar>)}
          </div>
        </Janela>
      )}
    </>
  );
}
