"use client";

/* Carteirinha de membro: frente e verso com a marca da igreja (logo e cor,
   exceção do tema em AGENTS.md §2: a peça é da igreja), foto, nome, situação,
   entrada no rol e validade. O QR leva à verificação pública mínima
   (/service/carteirinha/<código>). Imprime, baixa PNG e PDF sem servidor;
   html-to-image e jspdf só carregam no clique. */
import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { avisar } from "../../lib/avisar";
import { bestOnColor, normalizeHex } from "../../lib/color";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR } from "../../lib/date";
import { iniciais } from "../../lib/iniciais";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { adaptAccent } from "../../lib/theme";
import { FormScreen, FormSection } from "../../painel/form/FormScreen";
import type { ChurchView, MemberView, PersonView } from "../../ServiceExactApp";
import { FolhaDeImpressao, imprimir } from "../../painel/imprimir";
import { numeroFmt, type Registro } from "./livros";

export type Marca = { nome: string; logoUrl?: string | null; cor: string; cidade?: string | null };

type Emitida = { id: string; codigo: string; validade: string; emitida_em: string };

const LARGURA = 428; // 85,6 mm a 5 px por mm
/* papel e tinta da peça impressa (não é chrome do app: a carteirinha é da igreja) */
const PAPEL = "#FBFAF7";
const TINTA = "#16130F";

const somaAnos = (iso: string, n: number) => `${Number(iso.slice(0, 4)) + n}${iso.slice(4)}`;

export function Carteirinha({ memberId, church, marca, demo, members, people, rol, currentPersonId, onClose }: {
  memberId: string | null;
  church: ChurchView;
  marca: Marca;
  demo: boolean;
  members: MemberView[];
  people: PersonView[];
  rol: Registro[];
  currentPersonId?: string | null;
  onClose: () => void;
}) {
  const { todayISO } = useRelogioDaIgreja();
  const fid = useId();
  const [id, setId] = useState<string | null>(memberId);
  const [busca, setBusca] = useState("");
  const [anos, setAnos] = useState(2);
  const [atual, setAtual] = useState<Emitida | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [baixando, setBaixando] = useState<"" | "png" | "pdf">("");
  const [error, setError] = useState("");
  const frenteRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);

  const m = members.find((x) => x.id === id) ?? null;
  const reg = rol.find((r) => r.member_id === id) ?? null;
  const foto = m?.volunteerId ? people.find((p) => p.id === m.volunteerId)?.photoUrl ?? null : null;
  const saiu = !!reg?.saida;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- outra pessoa: limpa a carteirinha anterior antes de buscar a nova
    setAtual(null);
    if (!id || demo) return;
    let vivo = true;
    setCarregando(true);
    createServiceBrowserClient().schema("service").from("carteirinhas").select("id,codigo,validade,emitida_em")
      .eq("member_id", id).is("revogada_em", null).order("emitida_em", { ascending: false }).limit(1)
      .then(({ data }) => { if (vivo) { setAtual((data?.[0] as Emitida) ?? null); setCarregando(false); } });
    return () => { vivo = false; };
  }, [id, demo]);

  const validade = atual?.validade ?? somaAnos(todayISO(), anos);
  const vencida = !!atual && atual.validade < todayISO();
  /* já emitida e valendo: a ação principal é imprimir; emitir de novo fica secundária */
  const vigente = !!atual && !vencida;
  const url = atual && typeof window !== "undefined" ? `${window.location.origin}/service/carteirinha/${atual.codigo}` : "";

  const emitir = async () => {
    if (!m) return;
    setSaving(true);
    setError("");
    const nova = { organization_id: church.organizationId, church_id: church.id, member_id: m.id, validade: somaAnos(todayISO(), anos), emitida_por: currentPersonId ?? null };
    if (demo) {
      setAtual({ id: "demo", codigo: "demo0000000000000000", validade: nova.validade, emitida_em: new Date().toISOString() });
    } else {
      const sb = createServiceBrowserClient().schema("service");
      if (atual) await sb.from("carteirinhas").update({ revogada_em: new Date().toISOString() }).eq("id", atual.id);
      const { data, error: e } = await sb.from("carteirinhas").insert(nova).select("id,codigo,validade,emitida_em").single();
      if (e || !data) { setSaving(false); setError("Não deu para emitir a carteirinha. Confira a conexão e tente de novo."); return; }
      setAtual(data as Emitida);
    }
    setSaving(false);
    avisar(atual ? "Nova carteirinha emitida. A anterior deixou de valer." : "Carteirinha emitida");
  };

  const imagens = async () => {
    const { toPng } = await import("html-to-image");
    const op = { pixelRatio: 3, cacheBust: true, backgroundColor: PAPEL };
    return Promise.all([toPng(frenteRef.current!, op), toPng(versoRef.current!, op)]);
  };
  const nomeArquivo = `carteirinha-${(m?.name ?? "membro").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  const baixar = (href: string, nome: string) => { const a = document.createElement("a"); a.href = href; a.download = nome; a.click(); };

  const baixarPng = async () => {
    setBaixando("png");
    try {
      const [f, v] = await imagens();
      baixar(f, `${nomeArquivo}-frente.png`);
      baixar(v, `${nomeArquivo}-verso.png`);
    } catch { avisar("Não deu para gerar a imagem. Tente de novo.", "warn"); }
    setBaixando("");
  };
  const baixarPdf = async () => {
    setBaixando("pdf");
    try {
      const [[f, v], { jsPDF }] = await Promise.all([imagens(), import("jspdf")]);
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.setFontSize(9);
      pdf.text(`Carteirinha de ${m?.name ?? ""} · recorte na borda de cada face`, 15, 14);
      pdf.addImage(f, "PNG", 15, 20, 85.6, 54);
      pdf.addImage(v, "PNG", 15 + 85.6 + 6, 20, 85.6, 54);
      pdf.save(`${nomeArquivo}.pdf`);
    } catch { avisar("Não deu para gerar o PDF. Tente de novo.", "warn"); }
    setBaixando("");
  };

  const candidatos = busca.trim().length < 2 ? [] : members
    .filter((x) => x.name.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")))
    .slice(0, 8);

  const dados: Face = {
    marca, nome: m?.name ?? "", foto, numero: reg ? numeroFmt(reg.numero) : null,
    situacao: saiu ? "Desligado" : m?.situation === "novo" ? "Novo membro" : "Membro",
    entrada: reg?.data ?? m?.createdAt?.slice(0, 10) ?? null, validade, url,
  };

  return (
    <FormScreen
      eyebrow="Carteirinha de membro"
      title={m?.name ?? "Emitir carteirinha"}
      subtitle={m ? undefined : "Procure a pessoa pelo nome."}
      saveLabel={vigente ? "Imprimir" : atual ? "Emitir nova" : "Emitir carteirinha"}
      saving={saving}
      missing={[!m && "escolher a pessoa", saiu && "estar no rol (a pessoa saiu)"].filter(Boolean) as string[]}
      dirty={false}
      error={error}
      onSave={vigente ? () => imprimir("cartao", "portrait") : emitir}
      onClose={onClose}
    >
      {!m ? (
        <FormSection title="Pessoa">
          <div className="field">
            <label className="field-label" htmlFor={`${fid}-busca`}>Nome</label>
            <input id={`${fid}-busca`} className="input" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite pelo menos 2 letras" />
          </div>
          {candidatos.length ? (
            <div className="sec-busca">
              {candidatos.map((x) => (
                <button key={x.id} className="mini-row sec-busca-it" type="button" onClick={() => setId(x.id)}>
                  <div className="mini-main"><div className="mini-title">{x.name}</div><div className="mini-sub">{x.situation === "novo" ? "Novo membro" : "Membro"}</div></div>
                </button>
              ))}
            </div>
          ) : busca.trim().length >= 2 ? <p className="field-hint">Ninguém com esse nome. Confira a grafia.</p> : null}
        </FormSection>
      ) : (
        <>
          <FormSection title="Como fica">
            <Encaixe>
              <div className="cart-par">
                <Frente ref={frenteRef} d={dados} />
                <Verso ref={versoRef} d={dados} />
              </div>
            </Encaixe>
            <p className="field-hint">
              {carregando ? "Procurando carteirinha já emitida..." : atual
                ? `Emitida em ${formatDateBR(atual.emitida_em.slice(0, 10))}${vencida ? `, venceu em ${formatDateBR(atual.validade)}` : `, válida até ${formatDateBR(atual.validade)}`}. O QR confere se ela ainda vale.`
                : "Ainda não emitida. O QR aparece depois de emitir."}
            </p>
          </FormSection>

          {atual ? (
            <FormSection title="Baixar">
              <div className="sec-saidas">
                <button className="btn btn-sec" type="button" disabled={!!baixando} onClick={baixarPng}>{baixando === "png" ? "Gerando..." : "Baixar PNG"}</button>
                <button className="btn btn-sec" type="button" disabled={!!baixando} onClick={baixarPdf}>{baixando === "pdf" ? "Gerando..." : "Baixar PDF"}</button>
              </div>
              <p className="field-hint">Tamanho de cartão de crédito (85,6 × 54 mm). Ao imprimir, use 100% de escala, sem ajustar à página.</p>
            </FormSection>
          ) : null}

          <FormSection title={atual ? "Emitir de novo" : "Validade"}>
            <div className="seg" role="radiogroup" aria-label="Validade">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={anos === n} className={anos === n ? "on" : ""} onClick={() => setAnos(n)}>{n === 1 ? "1 ano" : `${n} anos`}</button>
              ))}
            </div>
            {vigente ? <button className="btn btn-sec sec-reemitir" type="button" disabled={saving} onClick={emitir}>{saving ? "Emitindo..." : "Emitir nova carteirinha"}</button> : null}
            <p className="field-hint">{atual ? `Emitir uma nova cancela a atual e vale até ${formatDateBR(somaAnos(todayISO(), anos))}. Use se ela foi perdida ou os dados mudaram.` : `Válida até ${formatDateBR(somaAnos(todayISO(), anos))}.`}</p>
          </FormSection>

          {!memberId ? <button className="btn btn-sec btn-sm" type="button" onClick={() => { setId(null); setBusca(""); }}>Escolher outra pessoa</button> : null}

          {atual ? (
            <FolhaDeImpressao folha="cartao">
              <div className="cart-papel">
                <Frente d={dados} />
                <Verso d={dados} />
              </div>
            </FolhaDeImpressao>
          ) : null}
        </>
      )}
    </FormScreen>
  );
}

/* ── faces ─────────────────────────────────────────────────────────────── */

type Face = { marca: Marca; nome: string; foto: string | null; numero: string | null; situacao: string; entrada: string | null; validade: string; url: string };

/** cores da peça: a cor da igreja como fundo do verso, ajustada para texto no papel da frente */
function cores(cor: string) {
  const fundo = normalizeHex(cor);
  return { fundo, sobre: bestOnColor(fundo, TINTA, "#FFFFFF"), texto: adaptAccent(fundo, PAPEL, "light", 4.5) };
}

const Frente = forwardRef<HTMLDivElement, { d: Face }>(function Frente({ d }, ref) {
  const c = cores(d.marca.cor);
  return (
    <div ref={ref} className="cart cart-frente" style={{ background: PAPEL, color: TINTA, ["--cart-cor" as string]: c.fundo, ["--cart-texto" as string]: c.texto }}>
      <div className="cart-faixa" aria-hidden="true" />
      <div className="cart-topo">
        {d.marca.logoUrl ? <img className="cart-logo" src={d.marca.logoUrl} alt={d.marca.nome} crossOrigin="anonymous" /> : <span className="cart-igreja">{d.marca.nome}</span>}
        <span className="cart-rotulo">Carteira de membro</span>
      </div>
      <div className="cart-corpo">
        <div className="cart-foto" style={d.foto ? { backgroundImage: `url(${d.foto})` } : undefined}>{d.foto ? null : iniciais(d.nome)}</div>
        <div className="cart-dados">
          <div className={d.nome.length > 28 ? "cart-nome longo" : "cart-nome"}>{d.nome}</div>
          <div className="cart-sit">{d.situacao}</div>
          <dl className="cart-campos">
            {d.entrada ? <div><dt>Membro desde</dt><dd>{formatDateBR(d.entrada)}</dd></div> : null}
            {d.numero ? <div><dt>Nº do rol</dt><dd>{d.numero}</dd></div> : null}
            <div><dt>Válida até</dt><dd>{formatDateBR(d.validade)}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
});

const Verso = forwardRef<HTMLDivElement, { d: Face }>(function Verso({ d }, ref) {
  const c = cores(d.marca.cor);
  return (
    <div ref={ref} className="cart cart-verso" style={{ background: c.fundo, color: c.sobre }}>
      <div className="cart-qr">{d.url ? <QRCode value={d.url} size={256} style={{ width: "100%", height: "100%" }} fgColor={TINTA} bgColor="#FFFFFF" /> : <span className="cart-qr-vazio">QR depois de emitir</span>}</div>
      <div className="cart-verso-txt">
        <div className="cart-igreja-v">{d.marca.nome}</div>
        {d.marca.cidade ? <div className="cart-cidade">{d.marca.cidade}</div> : null}
        <p className="cart-aviso">Aponte a câmera para o código para conferir se esta carteirinha vale. Pessoal e intransferível.</p>
        <div className="cart-assina"><span />Secretaria</div>
      </div>
    </div>
  );
});

/** a carteirinha tem tamanho fixo (texto nunca menor que 12px); em tela estreita ela encolhe inteira */
function Encaixe({ children }: { children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const dentro = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [alt, setAlt] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => {
      const s = Math.min(1, el.clientWidth / LARGURA);
      setK(s);
      setAlt((dentro.current?.offsetHeight ?? 0) * s);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="cart-encaixe" ref={caixa} style={{ height: alt }}>
      <div ref={dentro} style={{ transform: `scale(${k})`, transformOrigin: "top left", width: LARGURA }}>{children}</div>
    </div>
  );
}
