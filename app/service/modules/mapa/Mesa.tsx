"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { useTermos } from "../../lib/vocabulario-context";
import MapaBase from "./MapaBase";
import { carregarRegioes, type Acesso, type Cidade, type Regiao } from "./dados";
import { LEITURA, SITUACAO, frenteCidade, milhar, pessoasNaRegiao } from "./linguagem";
import { caixaDaGeometria, dentroDe } from "./geo";
import { CATEGORIAS, carregarPontos, type Ponto } from "./Pontos";
import { baixarCsv } from "./csv";

/* Mesa de trabalho (tela 2 do design): uma, várias ou todas as regiões,
   para analisar e baixar CSV. Pessoas só com nome de quem aceitou o termo;
   o CSV nunca leva endereço e cada download fica registrado. */

type Pessoa = { id: string; nome: string; situacao: string; grupo: string | null; regiao: string; ministerios: string[]; serve: boolean; km_sede: number | null; desde: string | null };
type Nivel = "bairro" | "setor" | "area";

export function Mesa({ org, acesso, cidade, nivel: nivelInicial, regioesIniciais, igreja, onVoltar, onAbrirMembro, onMensagem }: {
  org: string; acesso: Acesso; cidade: Cidade | null; nivel: Nivel; regioesIniciais: string[]; igreja: string;
  onVoltar: () => void; onAbrirMembro: (id: string) => void; onMensagem: (id: string) => void;
}) {
  const { comTermos: ct } = useTermos();
  const [nivel, setNivel] = useState<Nivel>(nivelInicial);
  const [todas, setTodas] = useState<Regiao[]>([]);
  const [sel, setSel] = useState<string[]>(regioesIniciais);
  const [pessoasCarregadas, setPessoas] = useState<Pessoa[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "servem" | "sem_grupo">("todas");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [partes, setPartes] = useState({ regioes: true, pessoas: true, pontos: false });
  const [mapa, setMapa] = useState<MlMap | null>(null);
  const [carregadoNivel, setCarregadoNivel] = useState<Nivel | null>(null);
  const carregando = carregadoNivel !== nivel;

  useEffect(() => {
    let vivo = true;
    carregarRegioes(org, nivel).then((r) => { if (vivo) { setTodas(r); setCarregadoNivel(nivel); } }).catch(() => setCarregadoNivel(nivel));
    return () => { vivo = false; };
  }, [org, nivel]);
  useEffect(() => { carregarPontos(org).then(setPontos).catch(() => setPontos([])); }, [org]);
  useEffect(() => {
    if (!sel.length) return;
    let vivo = true;
    createServiceBrowserClient().schema("service").rpc("mapa_mesa_pessoas", { p_org: org, p_codigos: sel, p_nivel: nivel }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { avisar("Não foi possível carregar as pessoas.", "warn"); return; }
      setPessoas((data ?? []) as Pessoa[]);
    });
    return () => { vivo = false; };
  }, [org, sel, nivel]);

  const pessoas = sel.length ? pessoasCarregadas : [];
  const escolhidas = useMemo(() => todas.filter((r) => sel.includes(r.codigo)), [todas, sel]);
  const tot = useMemo(() => {
    const moradores = escolhidas.reduce((s, r) => s + r.moradores, 0);
    const n = escolhidas.reduce((s, r) => s + Math.max(r.pessoas, 0), 0);
    return { moradores, pessoas: n, grupos: escolhidas.reduce((s, r) => s + r.grupos, 0), umACada: n ? moradores / n : null };
  }, [escolhidas]);
  const lista = pessoas.filter((p) => filtro === "todas" || (filtro === "servem" ? p.serve : !p.grupo));
  const pontosDentro = pontos.filter((p) => !p.oculto && escolhidas.some((r) => dentroDe(p, r.geojson)));
  const contaPontos = (grupo: string) => pontosDentro.filter((p) => CATEGORIAS.find((c) => c.id === p.categoria)?.grupo === grupo).length;
  const titulo = sel.length === 0 ? "Escolha as regiões" : sel.length === todas.length ? "A cidade inteira" : escolhidas.length && escolhidas.every((r) => r.leitura === "falta") ? `${plural(escolhidas.length, "lugar", "lugares")} onde falta igreja` : escolhidas.length === 1 ? escolhidas[0].nome : `${escolhidas.length} regiões`;

  useEffect(() => {
    if (!mapa) return;
    (mapa.getSource("ms-reg") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: escolhidas.map((r) => ({ type: "Feature", properties: { leitura: r.leitura }, geometry: r.geojson })) });
    const pts = escolhidas.flatMap((r) => { const c = caixaDaGeometria(r.geojson); return c ? [c[0], c[1]] : []; });
    if (pts.length) mapa.fitBounds([[Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))], [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]], { padding: 24, duration: 0 });
  }, [mapa, escolhidas]);

  const baixar = async () => {
    const linhasCsv: string[][] = [];
    const cab: string[] = ["Parte", "Região", "Nome", "Moradores", "Pessoas da igreja", "1 da igreja a cada", "Situação", ct("{Grupo}"), "Ministérios", "Até a sede (km)"];
    if (partes.regioes) escolhidas.forEach((r) => linhasCsv.push(["Região", r.nome, "", String(r.moradores), pessoasNaRegiao(r.pessoas), r.um_a_cada ? String(r.um_a_cada) : "", LEITURA[r.leitura], String(r.grupos), "", ""]));
    if (partes.pessoas) lista.forEach((p) => linhasCsv.push(["Pessoa", p.regiao, p.nome, "", "", "", SITUACAO[p.situacao] ?? p.situacao, p.grupo ?? "", p.ministerios.join(", "), p.km_sede != null ? String(p.km_sede).replace(".", ",") : ""]));
    if (partes.pontos) pontosDentro.forEach((p) => linhasCsv.push(["Ponto", "", p.nome, "", "", "", CATEGORIAS.find((c) => c.id === p.categoria)?.nome ?? p.categoria, "", "", ""]));
    const { error } = await createServiceBrowserClient().schema("service").rpc("mapa_registrar_csv", { p_org: org, p_partes: Object.entries(partes).filter(([, v]) => v).map(([k]) => k), p_regioes: sel, p_linhas: linhasCsv.length });
    if (error) { avisar("Não foi possível baixar agora.", "warn"); return; }
    baixarCsv(`mapa-${igreja}-${titulo}`, cab, linhasCsv);
  };

  return (
    <div className="content wide mesa">
      <header className="mesa-cab">
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onVoltar}><Icon name="voltar" size={14} />Mapa da igreja</button>
          <div className="mp-sobre" style={{ marginTop: 10 }}>Mesa de trabalho</div>
          <h1 className="mesa-titulo">{titulo}</h1>
        </div>
        {acesso.pode_csv && <button type="button" className="btn btn-pri" disabled={!sel.length} onClick={baixar}><Icon name="baixar" size={16} />Baixar CSV</button>}
      </header>

      <div className="mesa-caixa mesa-regioes">
        <span className="mp-fraco">Regiões</span>
        {escolhidas.map((r) => (
          <span key={r.codigo} className="mesa-tag"><span className="mp-sw" style={{ background: `var(--mapa-${r.leitura})`, width: 8, height: 8, borderRadius: 4 }} />{r.nome}<button type="button" aria-label={`Tirar ${r.nome}`} onClick={() => setSel((s) => s.filter((x) => x !== r.codigo))}><Icon name="recusou" size={12} /></button></span>
        ))}
        <select className="input mesa-add" value="" aria-label="Adicionar região" onChange={(e) => e.target.value && setSel((s) => [...s, e.target.value])}>
          <option value="">+ Região</option>
          {todas.filter((r) => !sel.includes(r.codigo)).map((r) => <option key={r.codigo} value={r.codigo}>{r.nome}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <span className="mp-fraco">Atalhos</span>
        <button type="button" className="mp-chip" onClick={() => setSel(todas.map((r) => r.codigo))}>Todas</button>
        <button type="button" className="mp-chip" onClick={() => setSel(todas.filter((r) => r.leitura === "falta").map((r) => r.codigo))}>Só onde falta igreja</button>
        <button type="button" className="mp-chip" onClick={() => setSel(todas.filter((r) => r.leitura === "forte").map((r) => r.codigo))}>Só onde somos fortes</button>
        <div className="mp-seg" style={{ ["--n" as string]: 3, minWidth: 240 } as React.CSSProperties} role="group" aria-label="Agrupar por">
          {(["bairro", "setor", "area"] as const).map((n) => <button key={n} type="button" aria-pressed={nivel === n} disabled={n === "bairro" && !cidade?.tem_bairros} onClick={() => { setNivel(n); setSel([]); }}>{n === "area" ? "Áreas" : n === "bairro" ? "Bairros" : "Setores"}</button>)}
        </div>
      </div>

      {carregando && <p className="mp-fraco" role="status">Carregando...</p>}
      {!carregando && !cidade?.tem_ibge && <p className="mp-texto">Sem dados do IBGE desta cidade ainda: os números de moradores aparecem quando forem importados.</p>}

      <div className="mesa-kpis">
        <div className="mp-kpi"><small>Moradores (IBGE)</small><strong>{milhar(tot.moradores)}</strong>{cidade?.moradores ? <small>{Math.round((tot.moradores / cidade.moradores) * 100)}% da cidade</small> : null}</div>
        <div className="mp-kpi"><small>Pessoas da igreja</small><strong>{milhar(tot.pessoas)}</strong>{cidade?.pessoas ? <small>{Math.round((tot.pessoas / cidade.pessoas) * 100)}% da igreja</small> : null}</div>
        <div className="mp-kpi"><small>1 pessoa da igreja a cada</small><strong>{tot.umACada ? milhar(tot.umACada) : "-"}</strong><small>moradores{cidade?.um_a_cada ? ` · cidade: ${milhar(cidade.um_a_cada)}` : ""}</small></div>
        <div className="mp-kpi"><small>{ct("{Grupos}")}</small><strong>{tot.grupos}</strong></div>
        <div className="mp-kpi"><small>Já servem em ministério</small><strong>{pessoas.filter((p) => p.serve).length}</strong><small>podem ajudar numa ação</small></div>
        <div className="mp-kpi"><small>Sem nome no mapa</small><strong>{Math.max(0, tot.pessoas - pessoas.length)}</strong><small>não aceitaram o termo</small></div>
      </div>

      <div className="mesa-corpo">
        <div className="mesa-principal">
          <section className="mesa-caixa">
            <div className="mesa-sec"><h2>Moradores e igreja, por região</h2><span className="mp-fraco">Fonte: IBGE · Censo <span className="mp-num">2022</span></span></div>
            <div className="mesa-tabela">
              <table>
                <thead><tr><th>Região</th><th className="n">Moradores</th><th className="n">Área km²</th><th className="n">Moradores/km²</th><th className="n">Pessoas</th><th className="n">1 da igreja a cada</th><th>Frente à cidade</th><th className="n">{ct("{Grupos}")}</th></tr></thead>
                <tbody>
                  {escolhidas.map((r) => (
                    <tr key={r.codigo}>
                      <td><b>{r.nome}</b><span className="mp-fraco" style={{ display: "block" }}>{LEITURA[r.leitura]}</span></td>
                      <td className="n mp-num">{milhar(r.moradores)}</td>
                      <td className="n mp-num">{String(r.area_km2).replace(".", ",")}</td>
                      <td className="n mp-num">{milhar(r.moradores / Number(r.area_km2))}</td>
                      <td className="n mp-num">{pessoasNaRegiao(r.pessoas)}</td>
                      <td className="n mp-num" style={{ color: r.leitura === "falta" ? "var(--mapa-falta)" : undefined }}>{r.um_a_cada ? milhar(r.um_a_cada) : "-"}</td>
                      <td>{frenteCidade(r.vezes) || "-"}</td>
                      <td className="n mp-num">{r.grupos}</td>
                    </tr>
                  ))}
                  {cidade?.um_a_cada ? <tr className="fraca"><td>Cidade inteira</td><td className="n mp-num">{milhar(cidade.moradores)}</td><td /><td /><td className="n mp-num">{milhar(cidade.pessoas)}</td><td className="n mp-num">{milhar(cidade.um_a_cada)}</td><td>referência</td><td /></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mesa-caixa">
            <div className="mesa-sec">
              <h2>Pessoas da igreja nessas regiões <span className="mp-num mp-fraco">{pessoas.length}</span></h2>
              <div className="mp-chips">
                <button type="button" className="mp-chip" aria-pressed={filtro === "todas"} onClick={() => setFiltro("todas")}>Todas</button>
                <button type="button" className="mp-chip" aria-pressed={filtro === "servem"} onClick={() => setFiltro("servem")}>Já servem</button>
                <button type="button" className="mp-chip" aria-pressed={filtro === "sem_grupo"} onClick={() => setFiltro("sem_grupo")}>{ct("Sem {grupo}")}</button>
              </div>
            </div>
            {acesso.detalhe === "numeros" ? <p className="mp-texto" style={{ padding: "0 18px 18px" }}>Sua liberação mostra só os números por região.</p> : (
              <>
                {marcadas.length > 0 && (
                  <div className="mesa-acoes">
                    <span><span className="mp-num">{marcadas.length}</span> {marcadas.length === 1 ? "selecionada" : "selecionadas"}</span>
                    {marcadas.length === 1 && <button type="button" className="btn btn-sec btn-sm" onClick={() => onMensagem(marcadas[0])}>Mensagem</button>}
                    {marcadas.length === 1 && <button type="button" className="btn btn-sec btn-sm" onClick={() => onAbrirMembro(marcadas[0])}>Ver ficha</button>}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMarcadas([])}>Limpar</button>
                  </div>
                )}
                <div className="mesa-tabela">
                  <table>
                    <thead><tr><th style={{ width: 32 }} aria-label="Selecionar" /><th>Nome</th><th>Região</th><th>Situação</th><th>{ct("{Grupo}")}</th><th>Ministérios</th><th className="n">Até a sede</th></tr></thead>
                    <tbody>
                      {lista.map((p) => (
                        <tr key={p.id}>
                          <td><input type="checkbox" aria-label={`Selecionar ${p.nome}`} checked={marcadas.includes(p.id)} onChange={(e) => setMarcadas((m) => (e.target.checked ? [...m, p.id] : m.filter((x) => x !== p.id)))} /></td>
                          <td><b>{p.nome}</b></td><td>{p.regiao}</td><td>{SITUACAO[p.situacao] ?? p.situacao}</td><td>{p.grupo ?? <span className="mp-fraco">nenhum</span>}</td>
                          <td>{p.ministerios.length ? p.ministerios.join(", ") : <span className="mp-fraco">nenhum</span>}</td>
                          <td className="n mp-num">{p.km_sede != null ? `${String(p.km_sede).replace(".", ",")} km` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sel.length > 0 && lista.length === 0 && <p className="mp-fraco" style={{ padding: 18 }}>Ninguém com nome no mapa nessas regiões.</p>}
                </div>
              </>
            )}
          </section>
        </div>

        <div className="mesa-lado">
          <section className="mesa-caixa" style={{ overflow: "hidden", padding: 0 }}>
            <MapaBase rotulo="Recorte do mapa com as regiões escolhidas" style={{ height: 260 }} onPronto={({ map, cores }) => {
              map.addSource("ms-reg", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
              map.addLayer({ id: "ms-reg", type: "fill", source: "ms-reg", paint: { "fill-color": ["match", ["get", "leitura"], "falta", cores.falta, "forte", cores.forte, cores.media], "fill-opacity": 0.7 } });
              map.addLayer({ id: "ms-reg-l", type: "line", source: "ms-reg", paint: { "line-color": cores.papel, "line-width": 2 } });
              setMapa(map);
              return () => setMapa(null);
            }} />
          </section>
          <section className="mesa-caixa" style={{ padding: "16px 18px" }}>
            <h2 className="mesa-h2">O que tem nessas regiões</h2>
            <dl className="mp-dados">
              <dt>Escolas, praças e quadras</dt><dd className="mp-num">{contaPontos("escolas")}</dd>
              <dt>CRAS e saúde</dt><dd className="mp-num">{contaPontos("saude")}</dd>
              <dt>Paradas de ônibus</dt><dd className="mp-num">{contaPontos("onibus")}</dd>
              <dt>Igrejas na região</dt><dd className="mp-num">{contaPontos("igrejas")}</dd>
              <dt>Pontos da igreja</dt><dd className="mp-num">{contaPontos("igreja")}</dd>
            </dl>
          </section>
          {acesso.pode_csv && (
            <section className="mesa-caixa" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 className="mesa-h2">O que vai no CSV</h2>
              <label className="mp-linha"><span>Números por região (IBGE e igreja)</span><input type="checkbox" checked={partes.regioes} onChange={(e) => setPartes((p) => ({ ...p, regioes: e.target.checked }))} /></label>
              <label className="mp-linha"><span>Pessoas, sem endereço</span><input type="checkbox" checked={partes.pessoas} onChange={(e) => setPartes((p) => ({ ...p, pessoas: e.target.checked }))} /></label>
              <label className="mp-linha"><span>Pontos de interesse</span><input type="checkbox" checked={partes.pontos} onChange={(e) => setPartes((p) => ({ ...p, pontos: e.target.checked }))} /></label>
              <p className="mp-fraco">Nunca leva endereço nem telefone. Fica registrado quem baixou e quando.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
