"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
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
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";

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
  latitude: number | null; longitude: number | null; marcado_por: string | null; fonte: "coordenacao" | "familia" | null;
};
type Endereco = { rua: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; cep: string | null; quando: string };

/* em pt-BR no CSV; na tela, rotulosDaSituacao */
const SITUACAO: Record<Situacao, string> = { sem_resposta: "Sem resposta", bem: "Está bem", ajuda: "Precisa de ajuda" };
const rotulosDaSituacao = (t: Text): Record<Situacao, string> => ({ sem_resposta: t("Sem resposta"), bem: t("Está bem"), ajuda: t("Precisa de ajuda") });
const TOM: Record<Situacao, SeloTom> = { sem_resposta: "neutro", bem: "ok", ajuda: "cuidado" };
const PERGUNTA = "Oi! Aqui é da igreja. Soubemos da situação na sua região. Vocês estão bem? Precisam de alguma ajuda?";
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function Emergencia({ ctx, nivel, onMensagem }: { ctx: ContextoMapa; nivel: "bairro" | "setor"; onMensagem: (memberId: string) => void }) {
  const traduzirUi = useTexto();

  const db = () => createServiceBrowserClient().schema("service");
  const [atual, setAtual] = useState<Emerg | null>(null);
  const [carregou, setCarregou] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  /* sem saber se há uma aberta, não oferece abrir outra */
  useEffect(() => {
    let vivo = true;
    db().rpc("mapa_emergencias", { p_org: ctx.org }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { setFalhou(true); setCarregou(true); return; }
      setFalhou(false);
      setAtual(((data ?? []) as Emerg[]).find((e) => e.status === "aberta") ?? null);
      setCarregou(true);
    });
    return () => { vivo = false; };
  }, [ctx.org, tentativa]);

  if (!carregou) return null;
  if (falhou) return (
    <PainelMapa rotulo={traduzirUi("Emergência")} sobretitulo={traduzirUi("Emergência")} titulo={traduzirUi("Não foi possível carregar")} voltar={{ aoTocar: ctx.fechar }}
      rodape={<Botao variante="principal" onClick={() => { setCarregou(false); setTentativa((t) => t + 1); }}>{traduzirUi("Tentar de novo")}</Botao>}>
      <p className="ca-obs">{traduzirUi("Confira a conexão e tente de novo.")}</p>
    </PainelMapa>
  );
  if (!atual) return <MarcarArea ctx={ctx} nivel={nivel} aoAbrir={setAtual} />;
  return <EmergenciaAberta ctx={ctx} atual={atual} onMensagem={onMensagem} />;
}

/* P12: marcar a área atingida e dar um nome */
function MarcarArea({ ctx, nivel, aoAbrir }: { ctx: ContextoMapa; nivel: "bairro" | "setor"; aoAbrir: (e: Emerg) => void }) {
  const traduzirUi = useTexto();

  const db = () => createServiceBrowserClient().schema("service");
  const temBairros = nivel === "bairro" && ctx.regioes.length > 0;
  const area = useAreaDesenhada(ctx, { prefixo: "em", corHex: ctx.cores.alerta, inicial: "circulo", temBairros });
  const [titulo, setTitulo] = useState("");
  const [conta, setConta] = useState<{ familias: number; pessoas: number } | null>(null);
  const [contando, setContando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const { forma, bairros, geo } = area;

  /* famílias e pessoas contam ao vivo (só a última resposta vale) */
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      const g = area.geometria();
      if (!g) { setConta({ familias: 0, pessoas: 0 }); return; }
      setContando(true);
      const { data, error } = await db().rpc("mapa_emergencia_previa", { p_org: ctx.org, p_geojson: g });
      if (!vivo) return;
      setContando(false);
      setConta(error ? null : ((data ?? [])[0] as { familias: number; pessoas: number }) ?? null);
    }, 200);
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a geometria deriva de forma, bairros e geo
  }, [ctx.org, forma, bairros, geo]);

  const abrir = async () => {
    const g = area.geometria();
    if (!g) { setErro(traduzirUi("Marque a área atingida no mapa.")); return; }
    if (!titulo.trim()) { setErro(traduzirUi("Dê um nome para a emergência.")); return; }
    setOcupado(true); setErro("");
    const { data, error } = await db().rpc("mapa_emergencia_abrir", { p_org: ctx.org, p_titulo: titulo.trim(), p_geojson: g });
    setOcupado(false);
    if (error || !data) { setErro(error?.message.includes("area_grande") ? traduzirUi("A área passou de 30 km². Marque só a parte atingida.") : traduzirUi("Não foi possível abrir a emergência. Tente de novo.")); return; }
    aoAbrir({ id: data as string, titulo: titulo.trim(), status: "aberta", aberta_em: new Date().toISOString(), geojson: g });
  };

  return (
    <>
      <BarraForma area={area} celular={ctx.celular} rotulo={traduzirUi("Área atingida")} id="em" />
      <PainelMapa rotulo={traduzirUi("Abrir emergência")} sobretitulo={traduzirUi("Emergência")} titulo={traduzirUi("O que aconteceu?")} voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="ca-numeros">
            <div className="ca-num"><span>{traduzirUi("Famílias na área")}</span><b className="mp-num">{conta && !contando ? conta.familias : "-"}</b></div>
            <div className="ca-num"><span>{traduzirUi("Pessoas")}</span><b className="mp-num">{conta && !contando ? conta.pessoas : "-"}</b></div>
          </div>
        )}
        rodape={(
          <div className="ca-pe">
            {erro && <p className="ca-erro" role="alert">{erro}</p>}
            <Botao variante="principal" desativado={ocupado} onClick={abrir}>{ocupado ? traduzirUi("Abrindo...") : traduzirUi("Abrir emergência")}</Botao>
          </div>
        )}>
        <div className="ca-form">
          <Campo rotulo={traduzirUi("Nome")} id="em-titulo"><Entrada maxLength={80} placeholder={traduzirUi("ex: Enchente do Rio das Pedras")} value={titulo} onChange={(e) => { setTitulo(e.target.value); setErro(""); }} /></Campo>
          <p className="ca-obs">{traduzirUi("Só quem coordena vê esta tela. Aqui o endereço das famílias pode ser aberto, e cada abertura fica registrada com nome e hora.")}</p>
        </div>
      </PainelMapa>
    </>
  );
}

/* P13: emergência aberta, uma família por ponto */
function EmergenciaAberta({ ctx, atual, onMensagem }: { ctx: ContextoMapa; atual: Emerg; onMensagem: (memberId: string) => void }) {
  const traduzirUi = useTexto();

  const db = () => createServiceBrowserClient().schema("service");
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [filtro, setFiltro] = useState<"todas" | Situacao>("todas");
  const [sel, setSel] = useState<string | null>(null);
  const [enderecos, setEnderecos] = useState<Record<string, Endereco>>({});
  const [compondo, setCompondo] = useState(false);
  const [texto, setTexto] = useState(PERGUNTA);
  const [ocupado, setOcupado] = useState(false);

  /* com uma marcação gravando, a recarga não traz o status antigo de volta */
  const gravando = useRef(0);
  const carregar = useCallback(async () => {
    const { data, error } = await db().rpc("mapa_emergencia_familias", { p_id: atual.id });
    if (error) {
      if (error.message.includes("encerrada")) { avisar(traduzirUi("Esta emergência foi encerrada.")); ctx.fechar(); }
      return;
    }
    if (gravando.current === 0) setFamilias((data ?? []) as Familia[]);
  }, [atual.id, ctx, traduzirUi]);
  /* a resposta da família muda a situação sozinha (G15): a lista se atualiza a cada 15 s */
  useEffect(() => {
    carregar();
    const t = setInterval(() => { if (document.visibilityState === "visible") carregar(); }, 15000);
    return () => clearInterval(t);
  }, [carregar]);

  /* área e pontos das famílias */
  const mapaEm = ctx.mapa, coresEm = ctx.cores;
  useEffect(() => {
    const mapa = mapaEm, cores = coresEm;
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
  }, [mapaEm, coresEm, atual]);

  /* enquadra a área uma vez, ao abrir (sem tirar o zoom da pessoa depois) */
  const celular = ctx.celular;
  useEffect(() => {
    const caixa = caixaDaGeometria(atual.geojson);
    if (caixa) ctx.mapa.fitBounds(caixa, { padding: celular ? 40 : { top: 90, bottom: 60, left: 420, right: 60 }, maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao trocar de emergência
  }, [atual.id]);

  useEffect(() => {
    (ctx.mapa.getSource("em-fam") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: familias.filter((f) => f.latitude != null && f.longitude != null).map((f) => ({ type: "Feature", properties: { k: f.chave, st: f.status, sel: f.chave === sel }, geometry: { type: "Point", coordinates: [f.longitude as number, f.latitude as number] } })),
    });
  }, [ctx.mapa, familias, sel]);

  const marcar = async (f: Familia, status: Situacao) => {
    setFamilias((fs) => fs.map((x) => (x.chave === f.chave ? { ...x, status, atualizado_em: new Date().toISOString(), marcado_por: traduzirUi("você"), fonte: "coordenacao" } : x)));
    gravando.current += 1;
    const { error } = await db().rpc("mapa_emergencia_status", { p_id: atual.id, p_chave: f.chave, p_status: status });
    gravando.current -= 1;
    if (error) { avisar(traduzirUi("Não foi possível salvar a situação agora. Tente de novo."), "warn"); carregar(); }
  };
  const verEndereco = async (f: Familia) => {
    const { data, error } = await db().rpc("mapa_revelar_endereco", { p_id: atual.id, p_member_id: f.contato_member_id });
    const e = ((data ?? []) as Omit<Endereco, "quando">[])[0];
    if (error || !e) { avisar(traduzirUi("Não foi possível abrir o endereço. Tente de novo."), "warn"); return; }
    setEnderecos((m) => ({ ...m, [f.chave]: { ...e, quando: hora(new Date().toISOString()) } }));
  };
  const semResposta = familias.filter((f) => f.status === "sem_resposta");
  const enviar = async () => {
    if (!texto.trim()) return;
    setOcupado(true);
    /* no servidor: cada pergunta fica registrada, vai para todos da família e chega
       com "Estamos bem" e "Precisamos de ajuda"; fechar o painel não corta o envio */
    const { data, error } = await db().rpc("mapa_emergencia_perguntar_todas", { p_id: atual.id, p_body: texto.trim() });
    const n = error ? 0 : Number(data ?? 0);
    setOcupado(false);
    setCompondo(false);
    carregar();
    const falhas = semResposta.length - n;
    avisar(!n ? traduzirUi("Não foi possível mandar. Confira se você tem ficha de membro.") : falhas ? traduzirUi("Mensagem enviada para {count, plural, =1 {# família} other {# famílias}}. {falhas, plural, =1 {# família não recebeu} other {# famílias não receberam}}.", { count: n, falhas }) : traduzirUi("Mensagem enviada para {count, plural, =1 {# família} other {# famílias}}.", { count: n }), n && !falhas ? "ok" : "warn");
  };
  const encerrar = async () => {
    const faltam = familias.filter((f) => f.status !== "bem").length;
    const ok = await confirmar({ titulo: traduzirUi("Encerrar a emergência?"), texto: faltam ? traduzirUi("{count, plural, =1 {# família ainda não está bem} other {# famílias ainda não estão bem}}. Depois de encerrar, os endereços deixam de abrir.", { count: faltam }) : traduzirUi("Depois de encerrar, os endereços deixam de abrir."), acao: traduzirUi("Encerrar") });
    if (!ok) return;
    const { error } = await db().rpc("mapa_emergencia_encerrar", { p_id: atual.id });
    if (error) { avisar(traduzirUi("Não foi possível encerrar. Tente de novo."), "warn"); return; }
    avisar(traduzirUi("Emergência encerrada."));
    ctx.fechar();
  };
  const baixar = async () => {
    await db().rpc("mapa_emergencia_registrar_csv", { p_id: atual.id });
    baixarCsv(`emergencia-${atual.titulo}`, ["Família", "Pessoas", "Bairro", "Situação"], familias.map((f) => [f.nome, String(f.pessoas), f.bairro ?? "", SITUACAO[f.status]]));
  };

  const conta = useMemo(() => ({ bem: familias.filter((f) => f.status === "bem").length, ajuda: familias.filter((f) => f.status === "ajuda").length }), [familias]);
  const lista = familias.filter((f) => filtro === "todas" || f.status === filtro);
  const aberta = familias.find((f) => f.chave === sel) ?? null;
  const meta = (f: Familia) => [traduzirUi("{count, plural, =1 {# pessoa} other {# pessoas}}", { count: f.pessoas }), f.bairro, f.status === "sem_resposta" && !f.marcado_por ? traduzirUi("aguardando") : f.fonte === "familia" && f.atualizado_em ? traduzirUi("respondeu às {hora}", { hora: hora(f.atualizado_em) }) : f.marcado_por && f.atualizado_em ? traduzirUi("marcado por {nome} às {hora}", { nome: f.marcado_por, hora: hora(f.atualizado_em) }) : null].filter(Boolean).join(" · ");
  const rotulosSituacao = rotulosDaSituacao(traduzirUi);

  return (
    <>
      <div className="em-legenda" aria-label={traduzirUi("Legenda")}>
        <span><span className="em-bola st-sem_resposta" aria-hidden="true" />{traduzirUi("Sem resposta")}</span>
        <span><span className="em-bola st-bem" aria-hidden="true" />{traduzirUi("Está bem")}</span>
        <span><span className="em-bola st-ajuda" aria-hidden="true" />{traduzirUi("Precisa de ajuda")}</span>
      </div>

      <PainelMapa rotulo={traduzirUi("Emergência aberta")} sobretitulo={<>{traduzirUi.rich("Emergência · aberta às <num>{hora}</num>", { hora: hora(atual.aberta_em), num: (c) => <span className="mp-num">{c}</span> })}</>} titulo={atual.titulo} voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="em-topo">
            <div className="em-numeros">
              <div className="ca-num"><span>{traduzirUi("Famílias")}</span><b className="mp-num">{familias.length}</b></div>
              <div className="ca-num"><span>{traduzirUi("Estão bem")}</span><b className="mp-num">{conta.bem}</b></div>
              <div className="ca-num"><span>{traduzirUi("Precisam")}</span><b className="mp-num">{conta.ajuda}</b></div>
            </div>
            <Segmentado role="group" aria-label={traduzirUi("Mostrar")} rolavel>
              {(["todas", "sem_resposta", "ajuda", "bem"] as const).map((v) => (
                <Opcao key={v} marcada={filtro === v} onClick={() => setFiltro(v)}>{v === "todas" ? traduzirUi("Todas") : v === "ajuda" ? traduzirUi("Precisam") : v === "bem" ? traduzirUi("Estão bem") : traduzirUi("Sem resposta")}</Opcao>
              ))}
            </Segmentado>
          </div>
        )}
        rodape={compondo ? (
          <section className="em-compor" aria-label={traduzirUi("Prévia da mensagem")}>
            <div className="em-compor-cab"><b>{traduzirUi("Para quem não respondeu")}</b><span>{traduzirUi("{count, plural, =1 {# família} other {# famílias}}", { count: semResposta.length })}</span></div>
            <TextoLongo aria-label={traduzirUi("Texto da mensagem")} rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <p className="em-compor-nota">{traduzirUi.rich("Respondem com um toque: <ok>Estamos bem</ok> <ajuda>Precisamos de ajuda</ajuda>", { ok: (c) => <Selo tom="ok">{c}</Selo>, ajuda: (c) => <Selo tom="cuidado">{c}</Selo> })}</p>
            <div className="ca-pe-botoes">
              <Botao onClick={() => setCompondo(false)}>{traduzirUi("Cancelar")}</Botao>
              <Botao variante="principal" className="ca-salvar" desativado={ocupado || !texto.trim() || !semResposta.length} onClick={enviar}>{ocupado ? traduzirUi("Enviando...") : traduzirUi("Enviar para {count, plural, =1 {# família} other {# famílias}}", { count: semResposta.length })}</Botao>
            </div>
          </section>
        ) : (
          <div className="ca-pe">
            <Botao variante="principal" desativado={!semResposta.length} onClick={() => setCompondo(true)}>{traduzirUi.rich("Perguntar a quem não respondeu · <num>{n}</num>", { n: String(semResposta.length), num: (c) => <span className="mp-num">{c}</span> })}</Botao>
            <div className="ca-pe-botoes">
              <Botao compacto desativado={!familias.length} onClick={baixar}>{traduzirUi("Baixar lista (sem endereço)")}</Botao>
              <Botao variante="discreto" compacto onClick={encerrar}>{traduzirUi("Encerrar")}</Botao>
            </div>
          </div>
        )}>
        <div className="em-lista">
          {lista.length === 0 && <p className="mp-fraco">{familias.length ? traduzirUi("Nenhuma família neste filtro.") : traduzirUi("Nenhuma pessoa da igreja mora na área marcada.")}</p>}
          {lista.map((f) => (
            <Acao key={f.chave} className="em-familia" aria-pressed={sel === f.chave} onClick={() => { setSel(f.chave); if (f.latitude != null && f.longitude != null) ctx.mapa.easeTo({ center: [f.longitude, f.latitude], duration: 400 }); }}>
              <span className={`em-bola st-${f.status}`} aria-hidden="true" />
              <span className="em-familia-txt"><b>{f.nome}</b><span>{meta(f)}</span></span>
              <Selo tom={TOM[f.status]}>{rotulosSituacao[f.status]}</Selo>
            </Acao>
          ))}
        </div>
      </PainelMapa>

      {aberta && aberta.latitude != null && aberta.longitude != null && (
        <BalaoFamilia key={aberta.chave} ctx={ctx} f={aberta} endereco={enderecos[aberta.chave]} meta={meta(aberta)}
          aoMensagem={onMensagem} aoFechar={() => setSel(null)} aoMarcar={(sit) => marcar(aberta, sit)} aoVerEndereco={() => verEndereco(aberta)} />
      )}
    </>
  );
}

function BalaoFamilia({ ctx, f, endereco, meta, aoMensagem, aoFechar, aoMarcar, aoVerEndereco }: {
  ctx: ContextoMapa; f: Familia; endereco?: Endereco; meta: string; aoMensagem: (memberId: string) => void;
  aoFechar: () => void; aoMarcar: (s: Situacao) => void; aoVerEndereco: () => void;
}) {
  const traduzirUi = useTexto();

  const pos = usePosicaoNoMapa(ctx.mapa, [f.longitude as number, f.latitude as number]);
  const linhaEndereco = endereco ? [[endereco.rua, endereco.numero].filter(Boolean).join(", "), endereco.complemento, endereco.bairro].filter(Boolean).join(" · ") || traduzirUi("Endereço não cadastrado") : "";
  return (
    <Balao x={pos.x} y={pos.y} oculto={pos.fora && !ctx.celular} folha={ctx.celular} aoFechar={aoFechar}
      sobretitulo={rotulosDaSituacao(traduzirUi)[f.status]} titulo={f.nome}
      rodape={(
        <>
          {f.telefone && <a className={botaoClasse({})} href={`tel:${f.telefone.replace(/[^\d+]/g, "")}`}>{traduzirUi("Ligar")}</a>}
          <Botao onClick={() => aoMensagem(f.contato_member_id)}>{traduzirUi("Mensagem")}</Botao>
        </>
      )}>
      <LinhaBalao icone="membros">{meta}</LinhaBalao>
      <Segmentado role="group" className="em-situacao" aria-label={traduzirUi("Situação de {nome}", { nome: f.nome })}>
        {(["sem_resposta", "bem", "ajuda"] as const).map((sit) => <Opcao key={sit} marcada={f.status === sit} onClick={() => aoMarcar(sit)}>{sit === "ajuda" ? traduzirUi("Precisa") : rotulosDaSituacao(traduzirUi)[sit]}</Opcao>)}
      </Segmentado>
      {endereco
        ? <LinhaBalao icone="mapapin">{traduzirUi.rich("<b>{endereco}</b> · aberto por você às {hora}, registrado", { endereco: linhaEndereco, hora: endereco.quando, b: (c) => <b>{c}</b> })}</LinhaBalao>
        : <Botao variante="discreto" compacto onClick={aoVerEndereco}>{traduzirUi("Ver endereço · fica registrado")}</Botao>}
      <LinhaBalao icone="pessoa">{f.membros.map((m) => m.nome).join(", ")}</LinhaBalao>
    </Balao>
  );
}
