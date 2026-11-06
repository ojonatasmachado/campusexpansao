"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { plural } from "../../lib/plural";
import { limparCamadas, type ContextoMapa } from "./contexto";
import { caixaDaGeometria } from "./geo";
import { baixarCsv } from "./csv";
import { BarraForma, useAreaDesenhada } from "./AreaDesenhada";
import { usePosicaoNoMapa } from "./posicao";

import { Botao, botaoClasse } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Segmentado } from "../../ui/Segmentado";
import { Selo, type SeloTom } from "../../ui/Selo";
import { PainelMapa } from "../../ui/PainelMapa";
import { Balao, LinhaBalao } from "../../ui/Balao";
import { Campo, Entrada, TextoLongo } from "../../ui/Campo";
import { confirmar } from "../../ui/confirmar";

/* Ferramentas › Emergência (G14, pranchas P12 e P13). Quem coordena marca a
   área atingida com as formas do Criar área, vê cada família como um ponto
   pela situação (sem resposta, está bem, precisa de ajuda), abre o endereço
   com registro e pergunta a quem não respondeu com o texto pronto e
   editável. O endereço só abre aqui, e cada abertura fica registrada. */

type Emerg = { id: string; titulo: string; status: "aberta" | "encerrada"; aberta_em: string; geojson: GeoJSON.Geometry };
type Situacao = "sem_resposta" | "bem" | "ajuda";
type Familia = {
  chave: string; nome: string; pessoas: number; bairro: string | null; contato_member_id: string; telefone: string | null;
  status: Situacao; atualizado_em: string | null; membros: { id: string; nome: string }[];
  latitude: number | null; longitude: number | null; marcado_por: string | null;
};
type Endereco = { rua: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; cep: string | null; quando: string };

const SITUACAO: Record<Situacao, string> = { sem_resposta: "Sem resposta", bem: "Está bem", ajuda: "Precisa de ajuda" };
const TOM: Record<Situacao, SeloTom> = { sem_resposta: "neutro", bem: "ok", ajuda: "cuidado" };
const PERGUNTA = "Oi! Aqui é da igreja. Soubemos da situação na sua região. Vocês estão bem? Precisam de alguma ajuda?";
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function Emergencia({ ctx }: { ctx: ContextoMapa }) {
  const db = () => createServiceBrowserClient().schema("service");
  const [atual, setAtual] = useState<Emerg | null>(null);
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    db().rpc("mapa_emergencias", { p_org: ctx.org }).then(({ data }) => {
      setAtual(((data ?? []) as Emerg[]).find((e) => e.status === "aberta") ?? null);
      setCarregou(true);
    });
  }, [ctx.org]);

  if (!carregou) return null;
  if (!atual) return <MarcarArea ctx={ctx} aoAbrir={setAtual} />;
  return <EmergenciaAberta ctx={ctx} atual={atual} />;
}

/* P12: marcar a área atingida e dar um nome */
function MarcarArea({ ctx, aoAbrir }: { ctx: ContextoMapa; aoAbrir: (e: Emerg) => void }) {
  const db = () => createServiceBrowserClient().schema("service");
  const temBairros = ctx.regioes.length > 0;
  const area = useAreaDesenhada(ctx, { prefixo: "em", corHex: ctx.cores.alerta, inicial: "circulo", temBairros });
  const [titulo, setTitulo] = useState("");
  const [conta, setConta] = useState<{ familias: number; pessoas: number } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const { forma, bairros, geo } = area;

  /* famílias e pessoas contam ao vivo (só a última resposta vale) */
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      const g = area.geometria();
      if (!g) { setConta(null); return; }
      const { data, error } = await db().rpc("mapa_emergencia_previa", { p_org: ctx.org, p_geojson: g });
      if (!vivo) return;
      setConta(error ? null : ((data ?? [])[0] as { familias: number; pessoas: number }) ?? null);
    }, 200);
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a geometria deriva de forma, bairros e geo
  }, [ctx.org, forma, bairros, geo]);

  const abrir = async () => {
    const g = area.geometria();
    if (!g) { setErro("Marque a área atingida no mapa."); return; }
    if (!titulo.trim()) { setErro("Dê um nome para a emergência."); return; }
    setOcupado(true); setErro("");
    const { data, error } = await db().rpc("mapa_emergencia_abrir", { p_org: ctx.org, p_titulo: titulo.trim(), p_geojson: g });
    setOcupado(false);
    if (error || !data) { setErro(error?.message.includes("area_grande") ? "A área passou de 30 km². Marque só a parte atingida." : "Não foi possível abrir a emergência. Tente de novo."); return; }
    aoAbrir({ id: data as string, titulo: titulo.trim(), status: "aberta", aberta_em: new Date().toISOString(), geojson: g });
  };

  return (
    <>
      <BarraForma area={area} celular={ctx.celular} rotulo="Área atingida" id="em" />
      <PainelMapa rotulo="Abrir emergência" sobretitulo="Emergência" titulo="O que aconteceu?" voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="ca-numeros">
            <div className="ca-num"><span>Famílias na área</span><b className="mp-num">{conta?.familias ?? 0}</b></div>
            <div className="ca-num"><span>Pessoas</span><b className="mp-num">{conta?.pessoas ?? 0}</b></div>
          </div>
        )}
        rodape={(
          <div className="ca-pe">
            {erro && <p className="ca-erro" role="alert">{erro}</p>}
            <Botao variante="principal" desativado={ocupado} onClick={abrir}>{ocupado ? "Abrindo..." : "Abrir emergência"}</Botao>
          </div>
        )}>
        <div className="ca-form">
          <Campo rotulo="Nome" id="em-titulo"><Entrada maxLength={80} placeholder="ex: Enchente do Rio das Pedras" value={titulo} onChange={(e) => { setTitulo(e.target.value); setErro(""); }} /></Campo>
          <p className="ca-obs">Só quem coordena vê esta tela. Aqui o endereço das famílias pode ser aberto, e cada abertura fica registrada com nome e hora.</p>
        </div>
      </PainelMapa>
    </>
  );
}

/* P13: emergência aberta, uma família por ponto */
function EmergenciaAberta({ ctx, atual }: { ctx: ContextoMapa; atual: Emerg }) {
  const db = () => createServiceBrowserClient().schema("service");
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [filtro, setFiltro] = useState<"todas" | Situacao>("todas");
  const [sel, setSel] = useState<string | null>(null);
  const [enderecos, setEnderecos] = useState<Record<string, Endereco>>({});
  const [compondo, setCompondo] = useState(false);
  const [texto, setTexto] = useState(PERGUNTA);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await db().rpc("mapa_emergencia_familias", { p_id: atual.id });
    if (!error) setFamilias((data ?? []) as Familia[]);
  }, [atual.id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga do servidor ao abrir
  useEffect(() => { carregar(); }, [carregar]);

  /* área e pontos das famílias */
  useEffect(() => {
    const { mapa, cores } = ctx;
    mapa.addSource("em-area", { type: "geojson", data: { type: "Feature", properties: {}, geometry: atual.geojson } });
    mapa.addLayer({ id: "em-area-fill", type: "fill", source: "em-area", paint: { "fill-color": cores.alerta, "fill-opacity": 0.14 } });
    mapa.addLayer({ id: "em-area-linha", type: "line", source: "em-area", paint: { "line-color": cores.alerta, "line-width": 2.5, "line-dasharray": [3, 2] } });
    mapa.addSource("em-fam", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({ id: "em-fam-anel", type: "circle", source: "em-fam", filter: ["==", ["get", "st"], "ajuda"], paint: { "circle-radius": 13, "circle-color": cores.alerta, "circle-opacity": 0.22 } });
    mapa.addLayer({ id: "em-fam", type: "circle", source: "em-fam", paint: {
      "circle-radius": ["case", ["get", "sel"], 9, 7],
      "circle-color": ["match", ["get", "st"], "bem", cores.membro, "ajuda", cores.alerta, cores.afastado],
      "circle-stroke-color": ["case", ["get", "sel"], cores.tinta, cores.papel], "circle-stroke-width": ["case", ["get", "sel"], 3, 2],
    } });
    const caixa = caixaDaGeometria(atual.geojson);
    if (caixa) mapa.fitBounds(caixa, { padding: ctx.celular ? 40 : { top: 90, bottom: 60, left: 420, right: 60 }, maxZoom: 16 });
    const clique = (e: MapMouseEvent) => {
      const f = mapa.queryRenderedFeatures(e.point, { layers: ["em-fam"] })[0];
      setSel((f?.properties?.k as string | undefined) ?? null);
    };
    const sobre = () => { mapa.getCanvas().style.cursor = "pointer"; };
    const fora = () => { mapa.getCanvas().style.cursor = ""; };
    mapa.on("click", clique);
    mapa.on("mouseenter", "em-fam", sobre);
    mapa.on("mouseleave", "em-fam", fora);
    return () => { mapa.off("click", clique); mapa.off("mouseenter", "em-fam", sobre); mapa.off("mouseleave", "em-fam", fora); fora(); limparCamadas(mapa, "em-"); };
  }, [ctx, atual]);

  useEffect(() => {
    (ctx.mapa.getSource("em-fam") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: familias.filter((f) => f.latitude != null && f.longitude != null).map((f) => ({ type: "Feature", properties: { k: f.chave, st: f.status, sel: f.chave === sel }, geometry: { type: "Point", coordinates: [f.longitude as number, f.latitude as number] } })),
    });
  }, [ctx, familias, sel]);

  const marcar = async (f: Familia, status: Situacao) => {
    setFamilias((fs) => fs.map((x) => (x.chave === f.chave ? { ...x, status, atualizado_em: new Date().toISOString(), marcado_por: "você" } : x)));
    const { error } = await db().rpc("mapa_emergencia_status", { p_id: atual.id, p_chave: f.chave, p_status: status });
    if (error) { avisar("Não foi possível salvar a situação agora. Tente de novo.", "warn"); carregar(); }
  };
  const verEndereco = async (f: Familia) => {
    const { data, error } = await db().rpc("mapa_revelar_endereco", { p_id: atual.id, p_member_id: f.contato_member_id });
    const e = ((data ?? []) as Omit<Endereco, "quando">[])[0];
    if (error || !e) { avisar("Não foi possível abrir o endereço. Tente de novo.", "warn"); return; }
    setEnderecos((m) => ({ ...m, [f.chave]: { ...e, quando: hora(new Date().toISOString()) } }));
  };
  const semResposta = familias.filter((f) => f.status === "sem_resposta");
  const enviar = async () => {
    if (!texto.trim()) return;
    setOcupado(true);
    let n = 0;
    for (const f of semResposta) { const { data } = await db().rpc("start_dm", { p_target_member: f.contato_member_id, p_body: texto.trim() }); if (data) n++; }
    setOcupado(false);
    setCompondo(false);
    avisar(n ? `Mensagem enviada para ${plural(n, "família", "famílias")}.` : "Não foi possível mandar. Confira se você tem ficha de membro.", n ? "ok" : "warn");
  };
  const encerrar = async () => {
    const faltam = familias.filter((f) => f.status !== "bem").length;
    const ok = await confirmar({ titulo: "Encerrar a emergência?", texto: faltam ? `${plural(faltam, "família ainda não está bem", "famílias ainda não estão bem")}. Depois de encerrar, os endereços deixam de abrir.` : "Depois de encerrar, os endereços deixam de abrir.", acao: "Encerrar" });
    if (!ok) return;
    const { error } = await db().rpc("mapa_emergencia_encerrar", { p_id: atual.id });
    if (error) { avisar("Não foi possível encerrar. Tente de novo.", "warn"); return; }
    avisar("Emergência encerrada.");
    ctx.fechar();
  };
  const baixar = async () => {
    await db().rpc("mapa_emergencia_registrar_csv", { p_id: atual.id });
    baixarCsv(`emergencia-${atual.titulo}`, ["Família", "Pessoas", "Bairro", "Situação"], familias.map((f) => [f.nome, String(f.pessoas), f.bairro ?? "", SITUACAO[f.status]]));
  };

  const conta = useMemo(() => ({ bem: familias.filter((f) => f.status === "bem").length, ajuda: familias.filter((f) => f.status === "ajuda").length }), [familias]);
  const lista = familias.filter((f) => filtro === "todas" || f.status === filtro);
  const aberta = familias.find((f) => f.chave === sel) ?? null;
  const meta = (f: Familia) => [plural(f.pessoas, "pessoa"), f.bairro, f.status === "sem_resposta" ? "aguardando" : f.marcado_por && f.atualizado_em ? `marcado por ${f.marcado_por} às ${hora(f.atualizado_em)}` : null].filter(Boolean).join(" · ");

  return (
    <>
      <div className="em-legenda" aria-label="Legenda">
        <span><span className="em-bola st-sem_resposta" aria-hidden="true" />Sem resposta</span>
        <span><span className="em-bola st-bem" aria-hidden="true" />Está bem</span>
        <span><span className="em-bola st-ajuda" aria-hidden="true" />Precisa de ajuda</span>
      </div>

      <PainelMapa rotulo="Emergência aberta" sobretitulo={<>Emergência · aberta às <span className="mp-num">{hora(atual.aberta_em)}</span></>} titulo={atual.titulo} voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="em-topo">
            <div className="em-numeros">
              <div className="ca-num"><span>Famílias</span><b className="mp-num">{familias.length}</b></div>
              <div className="ca-num"><span>Estão bem</span><b className="mp-num">{conta.bem}</b></div>
              <div className="ca-num"><span>Precisam</span><b className="mp-num">{conta.ajuda}</b></div>
            </div>
            <Segmentado role="group" aria-label="Mostrar" rolavel>
              {(["todas", "sem_resposta", "ajuda", "bem"] as const).map((v) => (
                <Opcao key={v} marcada={filtro === v} onClick={() => setFiltro(v)}>{v === "todas" ? "Todas" : v === "ajuda" ? "Precisam" : v === "bem" ? "Estão bem" : "Sem resposta"}</Opcao>
              ))}
            </Segmentado>
          </div>
        )}
        rodape={compondo ? (
          <section className="em-compor" aria-label="Prévia da mensagem">
            <div className="em-compor-cab"><b>Para quem não respondeu</b><span>{plural(semResposta.length, "família", "famílias")}</span></div>
            <TextoLongo aria-label="Texto da mensagem" rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <div className="ca-pe-botoes">
              <Botao onClick={() => setCompondo(false)}>Cancelar</Botao>
              <Botao variante="principal" className="ca-salvar" desativado={ocupado || !texto.trim() || !semResposta.length} onClick={enviar}>{ocupado ? "Enviando..." : `Enviar para ${plural(semResposta.length, "família", "famílias")}`}</Botao>
            </div>
          </section>
        ) : (
          <div className="ca-pe">
            <Botao variante="principal" desativado={!semResposta.length} onClick={() => setCompondo(true)}>Perguntar a quem não respondeu · <span className="mp-num">{semResposta.length}</span></Botao>
            <div className="ca-pe-botoes">
              <Botao compacto desativado={!familias.length} onClick={baixar}>Baixar lista (sem endereço)</Botao>
              <Botao variante="discreto" compacto onClick={encerrar}>Encerrar</Botao>
            </div>
          </div>
        )}>
        <div className="em-lista">
          {lista.length === 0 && <p className="mp-fraco">{familias.length ? "Nenhuma família neste filtro." : "Nenhuma pessoa da igreja mora na área marcada."}</p>}
          {lista.map((f) => (
            <Acao key={f.chave} className="em-familia" aria-pressed={sel === f.chave} onClick={() => { setSel(f.chave); if (f.latitude != null && f.longitude != null) ctx.mapa.easeTo({ center: [f.longitude, f.latitude], duration: 400 }); }}>
              <span className={`em-bola st-${f.status}`} aria-hidden="true" />
              <span className="em-familia-txt"><b>{f.nome}</b><span>{meta(f)}</span></span>
              <Selo tom={TOM[f.status]}>{SITUACAO[f.status]}</Selo>
            </Acao>
          ))}
        </div>
      </PainelMapa>

      {aberta && aberta.latitude != null && aberta.longitude != null && (
        <BalaoFamilia key={aberta.chave} ctx={ctx} f={aberta} endereco={enderecos[aberta.chave]} meta={meta(aberta)}
          aoFechar={() => setSel(null)} aoMarcar={(sit) => marcar(aberta, sit)} aoVerEndereco={() => verEndereco(aberta)} />
      )}
    </>
  );
}

function BalaoFamilia({ ctx, f, endereco, meta, aoFechar, aoMarcar, aoVerEndereco }: {
  ctx: ContextoMapa; f: Familia; endereco?: Endereco; meta: string;
  aoFechar: () => void; aoMarcar: (s: Situacao) => void; aoVerEndereco: () => void;
}) {
  const pos = usePosicaoNoMapa(ctx.mapa, [f.longitude as number, f.latitude as number]);
  const linhaEndereco = endereco ? [[endereco.rua, endereco.numero].filter(Boolean).join(", "), endereco.complemento, endereco.bairro].filter(Boolean).join(" · ") || "Endereço não cadastrado" : "";
  return (
    <Balao x={pos.x} y={pos.y} oculto={pos.fora && !ctx.celular} folha={ctx.celular} aoFechar={aoFechar}
      sobretitulo={SITUACAO[f.status]} titulo={f.nome}
      rodape={(
        <>
          {f.telefone && <a className={botaoClasse({})} href={`tel:${f.telefone.replace(/[^\d+]/g, "")}`}>Ligar</a>}
          <Botao onClick={() => ctx.mensagem(f.contato_member_id)}>Mensagem</Botao>
        </>
      )}>
      <LinhaBalao icone="membros">{meta}</LinhaBalao>
      <Segmentado role="group" aria-label={`Situação de ${f.nome}`}>
        {(["sem_resposta", "bem", "ajuda"] as const).map((sit) => <Opcao key={sit} marcada={f.status === sit} onClick={() => aoMarcar(sit)}>{sit === "ajuda" ? "Precisa" : SITUACAO[sit]}</Opcao>)}
      </Segmentado>
      {endereco
        ? <LinhaBalao icone="mapapin"><b>{linhaEndereco}</b> · aberto por você às {endereco.quando}, registrado</LinhaBalao>
        : <Botao variante="discreto" compacto onClick={aoVerEndereco}>Ver endereço · fica registrado</Botao>}
      <LinhaBalao icone="pessoa">{f.membros.map((m) => m.nome).join(", ")}</LinhaBalao>
    </Balao>
  );
}
