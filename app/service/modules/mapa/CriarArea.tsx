"use client";

import { useEffect, useRef, useState } from "react";
import type { MapMouseEvent } from "maplibre-gl";
import { useTermos } from "../../lib/vocabulario-context";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { CORES_AREA, NOME_COR, previaArea, salvarArea, type Area, type CorArea } from "./dados";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { criarDesenho, type Desenho, type Forma } from "./desenho";
import { milhar, pessoasNaRegiao } from "./linguagem";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Interruptor } from "../../ui/Interruptor";
import { Segmentado } from "../../ui/Segmentado";
import { PainelMapa } from "../../ui/PainelMapa";
import { Campo, Entrada } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";

/* Ferramentas › Criar área (G10, mapa/PLANO.md §10, prancha P5). A área nasce
   como quadrado, círculo, juntar bairros ou livre e se ajusta no mapa (o
   desenho mora em desenho.ts). Os números mudam enquanto a pessoa arrasta.
   Desfazer volta um gesto de cada vez, inclusive a troca de forma. Só pastor
   e administração escolhem o responsável, que passa a ver o mapa da área. */

type Passo = { forma: Forma; geo: GeoJSON.Polygon | null; bairros: string[] };
type Previa = { pessoas: number; moradores: number; grupos: number };

const FORMAS: { f: Forma; rotulo: string; icone: "quadrado" | "circulo" | "bairros" | "livre" }[] = [
  { f: "quadrado", rotulo: "Quadrado", icone: "quadrado" },
  { f: "circulo", rotulo: "Círculo", icone: "circulo" },
  { f: "bairros", rotulo: "Juntar bairros", icone: "bairros" },
  { f: "livre", rotulo: "Livre", icone: "livre" },
];
const DICAS: Record<Forma, string> = {
  quadrado: "Arraste os cantos para mudar o tamanho. Puxe os pontos do meio para seguir as ruas.",
  circulo: "Arraste a borda para mudar o raio. Puxe pelo meio para mover.",
  bairros: "Toque nos bairros para juntar. Toque de novo para tirar.",
  livre: "Toque para marcar os cantos. Toque no primeiro para fechar.",
};
const TIPOS: [Area["tipo"], string][] = [["setor", "Setor"], ["regiao", "Região pastoral"], ["alcance", "Atuação"]];
/* o âmbar é da igreja (sede e congregações): a área usa os outros 7 */
const CORES = CORES_AREA.filter((c) => c !== "amber");

export function CriarArea({ ctx, bairrosIniciais, nivel }: { ctx: ContextoMapa; bairrosIniciais: string[]; nivel: "bairro" | "setor" }) {
  const { comTermos: ct } = useTermos();
  const temBairros = nivel === "bairro" && ctx.regioes.length > 0;
  const [forma, setForma] = useState<Forma>(bairrosIniciais.length && temBairros ? "bairros" : "quadrado");
  const [bairros, setBairros] = useState<string[]>(bairrosIniciais);
  const [geo, setGeo] = useState<GeoJSON.Polygon | null>(null);
  const [historia, setHistoria] = useState<Passo[]>(() => (bairrosIniciais.length && temBairros ? [{ forma: "bairros", geo: null, bairros: bairrosIniciais }] : []));
  const [ima, setIma] = useState(true);
  const [rua, setRua] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Area["tipo"]>("setor");
  const [cor, setCor] = useState<CorArea>("terra");
  const [resp, setResp] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const desenho = useRef<Desenho | null>(null);
  const estado = useRef({ forma });
  useEffect(() => { estado.current = { forma }; });

  /* desenho (terra-draw) e camada dos bairros. Só recria se o mapa mudar:
     tema, largura ou pessoas novas não podem apagar o que já foi desenhado */
  const ctxAtual = useRef(ctx);
  useEffect(() => { ctxAtual.current = ctx; });
  const mapaDoCtx = ctx.mapa;
  useEffect(() => {
    const ctx = ctxAtual.current;
    const { mapa, cores } = ctx;
    mapa.addSource("ca-bairros", { type: "geojson", data: { type: "FeatureCollection", features: ctx.regioes.map((r) => ({ type: "Feature", properties: { codigo: r.codigo }, geometry: r.geojson })) } });
    mapa.addLayer({ id: "ca-bairros-fill", type: "fill", source: "ca-bairros", paint: { "fill-color": cores.terra, "fill-opacity": 0 } });
    mapa.addLayer({ id: "ca-bairros-linha", type: "line", source: "ca-bairros", paint: { "line-color": cores.tinta, "line-width": 0, "line-opacity": 0.85 } });
    const d = criarDesenho(mapa, {
      cor: cores.terra, tinta: cores.tinta, papel: cores.papel, celular: ctx.celular,
      aoMudar: setGeo,
      aoTerminar: (f, g) => { setForma(f); setHistoria((h) => (h.length && h[h.length - 1].forma === f && JSON.stringify(h[h.length - 1].geo) === JSON.stringify(g) ? h : [...h, { forma: f, geo: g, bairros: [] }])); },
      aoGrudar: setRua,
    });
    desenho.current = d;
    /* forma inicial: quadrado e círculo nascem no meio da tela */
    d.comecar(estado.current.forma);
    const clique = (e: MapMouseEvent) => {
      if (estado.current.forma !== "bairros") return;
      const cod = mapa.queryRenderedFeatures(e.point, { layers: ["ca-bairros-fill"] })[0]?.properties?.codigo as string | undefined;
      if (!cod) return;
      setBairros((b) => {
        const nova = b.includes(cod) ? b.filter((x) => x !== cod) : [...b, cod];
        setHistoria((h) => [...h, { forma: "bairros", geo: null, bairros: nova }]);
        return nova;
      });
    };
    mapa.on("click", clique);
    return () => { mapa.off("click", clique); d.destruir(); desenho.current = null; limparCamadas(mapa, "ca-"); };
  }, [mapaDoCtx]);

  /* cor da área no desenho e nos bairros */
  useEffect(() => {
    const { mapa, cores } = ctx;
    desenho.current?.cor(cores[cor]);
    if (!mapa.getLayer("ca-bairros-fill")) return;
    const sel: maplibregl.ExpressionSpecification = ["in", ["get", "codigo"], ["literal", forma === "bairros" ? bairros : []]];
    mapa.setPaintProperty("ca-bairros-fill", "fill-color", cores[cor]);
    mapa.setPaintProperty("ca-bairros-fill", "fill-opacity", ["case", sel, 0.42, forma === "bairros" ? 0.08 : 0]);
    mapa.setPaintProperty("ca-bairros-linha", "line-width", ["case", sel, 2.5, forma === "bairros" ? 1.2 : 0]);
  }, [ctx, cor, forma, bairros]);

  useEffect(() => { desenho.current?.ima(ima); }, [ima]);

  /* números ao vivo (com uma pequena espera para não chamar a cada quadro do arraste) */
  useEffect(() => {
    /* só a resposta do último pedido vale (as antigas podem chegar depois) */
    let vivo = true;
    const t = setTimeout(async () => {
      const b = forma === "bairros" ? bairros : [];
      const g = forma === "bairros" ? null : geo;
      if (!b.length && !g) { setPrevia(null); return; }
      try { const r = await previaArea(ctx.org, b, g); if (vivo) setPrevia(r); } catch (e) { if (!vivo) return; setPrevia(null); if (e instanceof Error && e.message.includes("area_complexa")) avisar("Área com pontos demais. Use menos cantos.", "warn"); }
    }, 180);
    return () => { vivo = false; clearTimeout(t); };
  }, [ctx.org, forma, bairros, geo]);

  const trocar = (f: Forma) => {
    if (f === forma) return;
    setForma(f);
    if (f === "bairros") { desenho.current?.comecar("bairros"); setHistoria((h) => [...h, { forma: "bairros", geo: null, bairros }]); return; }
    desenho.current?.comecar(f);
    if (f === "livre") setHistoria((h) => [...h, { forma: "livre", geo: null, bairros: [] }]);
  };

  const desfazer = () => {
    if (historia.length < 2) return;
    const h = historia.slice(0, -1);
    const p = h[h.length - 1];
    setHistoria(h);
    setForma(p.forma);
    if (p.forma === "bairros") setBairros(p.bairros);
    setGeo(p.geo);
    desenho.current?.restaurar(p.forma, p.geo);
  };

  const pronto = (forma === "bairros" ? bairros.length > 0 : !!geo) && nome.trim().length > 0;
  const salvar = async () => {
    if (!pronto) { setErro(nome.trim() ? "Desenhe a área no mapa primeiro." : "Dê um nome para a área."); return; }
    setSalvando(true); setErro("");
    try {
      await salvarArea(ctx.org, { nome: nome.trim(), tipo, cor, responsavel_id: ctx.gestao ? resp || null : null, bairros: forma === "bairros" ? bairros : [], geojson: forma === "bairros" ? null : geo });
      const quem = ctx.people.find((p) => p.id === resp)?.name;
      avisar(ctx.gestao && quem ? `Área criada. ${quem} já vê o mapa dela.` : "Área criada.");
      ctx.recarregar();
      ctx.fechar();
    } catch (e) {
      setErro(e instanceof Error && e.message.includes("sem_acesso") ? "Só quem vê a cidade inteira e pode editar cria áreas." : "Não foi possível salvar a área. Tente de novo.");
      setSalvando(false);
    }
  };

  const presenca = previa && previa.pessoas >= 3 && previa.moradores > 0 ? milhar(previa.moradores / previa.pessoas) : "-";
  /* o círculo só muda o raio e a posição: não gruda em rua */
  const temIma = forma === "quadrado" || forma === "livre";
  const dica = (forma === "livre" && geo ? "Arraste os cantos para seguir as ruas. Puxe os pontos do meio para criar cantos novos." : DICAS[forma]) + (ima && temIma && !ctx.celular ? " Segure Alt para soltar do ímã." : "");

  return (
    <>
      <div className="ca-topo">
        <div className="ca-barra" role="toolbar" aria-label="Forma da área">
          <Segmentado role="group" aria-label="Forma" className="ca-formas" rolavel={ctx.celular}>
            {FORMAS.filter((x) => x.f !== "bairros" || temBairros).map((x) => (
              <Opcao key={x.f} marcada={forma === x.f} onClick={() => trocar(x.f)}><Icon name={x.icone} size={16} stroke={2} />{x.rotulo}</Opcao>
            ))}
          </Segmentado>
          <span className="ca-sep" aria-hidden="true" />
          <Botao className="ca-desfazer" desativado={historia.length < 2} onClick={desfazer}><Icon name="desfazer" size={16} stroke={2} />Desfazer</Botao>
          {temIma && (
            <span className="ca-ima">
              <span id="ca-ima-rot">Ímã nas ruas</span>
              <Interruptor rotuloId="ca-ima-rot" ligado={ima} onClick={() => setIma((v) => !v)} />
            </span>
          )}
        </div>
        <div className="ca-dica" aria-live="polite">{rua !== null ? (rua ? `Grudou na ${rua}` : "Grudou na rua") : dica}</div>
      </div>

      <PainelMapa rotulo="Nova área" sobretitulo="Nova área" titulo="Dentro da área agora" voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="ca-numeros">
            <div className="ca-num"><span>Pessoas da igreja</span><b className="mp-num">{previa ? pessoasNaRegiao(previa.pessoas) : 0}</b></div>
            <div className="ca-num"><span>Moradores</span><b className="mp-num">{previa ? milhar(previa.moradores) : 0}</b></div>
            <div className="ca-num"><span>Presença da igreja</span><b className="ca-num-txt">1 a cada <span className="mp-num">{presenca}</span></b></div>
            <div className="ca-num"><span>{ct("{Grupos}")}</span><b className="mp-num">{previa ? previa.grupos : 0}</b></div>
            <p className="ca-obs">Os números mudam enquanto você arrasta. Moradores: IBGE 2022.</p>
          </div>
        )}
        rodape={(
          <div className="ca-pe">
            {erro && <p className="ca-erro" role="alert">{erro}</p>}
            <div className="ca-pe-botoes">
              <Botao onClick={ctx.fechar}>Cancelar</Botao>
              <Botao variante="principal" className="ca-salvar" desativado={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar área"}</Botao>
            </div>
          </div>
        )}>
        <div className="ca-form">
          <Campo rotulo="Nome" id="ca-nome"><Entrada value={nome} maxLength={60} placeholder="ex: Setor Norte" onChange={(e) => { setNome(e.target.value); setErro(""); }} /></Campo>
          <div className="field">
            <span className="field-label" id="ca-tipo-rot">Tipo</span>
            <Segmentado role="group" aria-labelledby="ca-tipo-rot">
              {TIPOS.map(([v, l]) => <Opcao key={v} marcada={tipo === v} onClick={() => setTipo(v)}>{l}</Opcao>)}
            </Segmentado>
          </div>
          <div className="field">
            <span className="field-label" id="ca-cor-rot">Cor no mapa</span>
            <div className="ca-cores" role="group" aria-labelledby="ca-cor-rot">
              {CORES.map((c) => <Acao key={c} className={`ca-cor cor-${c}${cor === c ? " on" : ""}`} aria-label={NOME_COR[c]} aria-pressed={cor === c} onClick={() => setCor(c)} />)}
            </div>
          </div>
          {ctx.gestao && (
            <>
              <Campo rotulo="Responsável" id="ca-resp">
                <Selecao valor={resp} aoMudar={setResp} vazio="Escolher depois" opcoes={ctx.people.map((p) => ({ v: p.id, l: p.name }))} />
              </Campo>
              <p className="ca-obs">O responsável passa a ver o mapa só desta área.</p>
            </>
          )}
        </div>
      </PainelMapa>
    </>
  );
}
