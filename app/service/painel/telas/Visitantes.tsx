"use client";

import { plural } from "../../lib/plural";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot, parseISODate } from "../../lib/date";
import AutocadastroPainel from "../../modules/visitantes/AutocadastroPainel";
import { HelpDot } from "../../HelpSystem";
import { Av, PageHead } from "../ui";
import { Kpi, VISITOR_STAGES, semContato48h } from "../comum";
import type { ChurchView, ContatoCfg, DrawerState, ModalState, PersonView, VisitorNoteView, VisitorView } from "../tipos";

/* cor de destaque por tema + quem além do master pode editar, guardado em
   service.churches.settings.brandCfg (mesmo jsonb de sempre). Permite que
   cada igreja pareça uma ferramenta própria dela (logo + nome + cor), não
   um produto genérico CE.X : só "Service" continua sempre visível. */

export const CONTATO_CFG_DEFAULT: ContatoCfg = {
  prazoHoras: 48,
  canal: "WhatsApp",
  metaIntegracaoDias: 90,
  mensagem: "Oi {nome}! Que alegria ter você com a gente no {evento}. Somos a {igreja} e queremos te conhecer melhor. Posso te ajudar com algo essa semana?",
  abordagem: "Acolher sem pressão. Ouvir a história, oferecer oração e convidar para um Grupo de Comunhão. Sem cobrança, só cuidado genuíno.",
};

/* cartão do visitante no funil (S37): dias desde a visita, alerta de 48h sem
   contato, WhatsApp e registrar contato; a origem aparece uma vez só */
export function VisitanteCard({ visitor, notes, onOpen }: { visitor: VisitorView; notes: VisitorNoteView[]; onOpen: () => void }) {
  const visita = parseISODate(visitor.visited_on);
  // eslint-disable-next-line react-hooks/purity -- dias desde a visita precisam do relógio real
  const dias = visita ? Math.max(0, Math.floor((Date.now() - visita.getTime()) / 86400000)) : null;
  const alerta = semContato48h(visitor, notes);
  const fone = (visitor.phone ?? "").replace(/\D/g, "");
  return (
    <div className={`vcard${alerta ? " vcard-alerta" : ""}`}>
      <button type="button" className="vcard-open" onClick={onOpen}>
        <div className="vcard-top">
          <Av name={visitor.name} size="sm" />
          <div style={{ minWidth: 0 }}>
            <div className="vcard-name">{visitor.name}</div>
            <div className="vcard-when">{joinDot(dias === null ? null : dias === 0 ? "visitou hoje" : `há ${plural(dias, "dia")}`, visitor.origin)}</div>
          </div>
        </div>
        {alerta && <div className="vcard-alert"><Icon name="alerta" size={14} /> Sem contato há mais de 48h</div>}
        {!alerta && visitor.reply_status && <div className="vcard-foot">{visitor.reply_status === "respondeu" ? <span className="vcard-resp">respondeu</span> : <span className="vcard-noresp">sem resposta</span>}</div>}
      </button>
      <div className="vcard-acts">
        {fone.length >= 10 && <a className="btn btn-sec btn-sm" href={`https://wa.me/55${fone.replace(/^55/, "")}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> WhatsApp</a>}
        <button className="btn btn-sec btn-sm" type="button" onClick={onOpen} aria-label={`Registrar contato com ${visitor.name}`}>Registrar</button>
      </div>
    </div>
  );
}

export function Visitantes({
  visitors,
  visitorNotes,
  people,
  church,
  setDrawer,
  setModal,
}: {
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  people: PersonView[];
  church?: ChurchView;
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<"pipe" | "list" | "painel" | "regras">("pipe");
  const [cfgOpen, setCfgOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const cc: ContatoCfg = { ...CONTATO_CFG_DEFAULT, ...(church?.settings?.contatoCfg ?? {}) };
  const personById = new Map(people.map((person) => [person.id, person]));
  const contacted = visitors.filter((visitor) => visitor.reply_status);
  const answered = visitors.filter((visitor) => visitor.reply_status === "respondeu");
  const members = visitors.filter((visitor) => visitor.stage === "membro");
  const replyRate = contacted.length ? Math.round((answered.length / contacted.length) * 100) : 0;
  const integrationRate = visitors.length ? Math.round((members.length / visitors.length) * 100) : 0;
  const byService = visitors.reduce<Record<string, number>>((acc, visitor) => {
    const key = visitor.visited_on ? formatDateBR(visitor.visited_on) : "Sem registro";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxService = Math.max(...Object.values(byService), 1);

  return (
    <div className="content wide">
      <PageHead
        title="Visitantes"
        eyebrow="Pessoas"
        subtitle={plural(visitors.length, "visitante")}
        help="Quem visitou pela primeira vez. Cada visitante tem um próximo passo e o histórico de contato; acompanhe pelas etapas do funil até virar membro."
        action={<><div className="seg"><button className={view === "pipe" ? "on" : ""} type="button" onClick={() => setView("pipe")}>Funil</button><button className={view === "list" ? "on" : ""} type="button" onClick={() => setView("list")}>Lista</button><button className={view === "painel" ? "on" : ""} type="button" onClick={() => setView("painel")}>Painel</button><button className={view === "regras" ? "on" : ""} type="button" onClick={() => setView("regras")}>Regras</button></div>{church ? <button className="btn btn-sec" type="button" onClick={() => setQrOpen(true)}>QR e link</button> : null}<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo visitante", subtitle: "Quem chegou pela primeira vez. Entra no acompanhamento automaticamente.", saveLabel: "Registrar visitante", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"Quem visitou" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"origem", label:"Como chegou", type:"select", half:true, options:[{v:"Convite de membro",l:"Convite de membro"},{v:"Instagram",l:"Instagram"},{v:"Indicação",l:"Indicação"},{v:"Evangelismo",l:"Evangelismo"},{v:"Tomou decisão no culto",l:"Tomou decisão no culto"},{v:"Passava na rua",l:"Passava na rua"}] }], action: { kind: "visitor" } })}>+ Visitante</button></>}
      />
      {view === "regras" && (
        <>
          <div className="contato-banner">
            <div className="contato-pill"><span className="contato-pill-n">{cc.prazoHoras}h</span><span>1º contato</span></div>
            <div className="contato-main"><div className="contato-t">Primeiro contato em até <em>{cc.prazoHoras}h</em> por <em>{cc.canal}</em> · meta de integração: <em>{cc.metaIntegracaoDias} dias</em></div><div className="contato-s">{cc.abordagem}</div></div>
            <button className="btn btn-sec btn-sm" type="button" onClick={() => setCfgOpen(true)}>Ajustar</button>
          </div>
          <p className="ph-sub" style={{ marginTop: 10 }}>Os visitantes sem nenhum contato registrado depois desse prazo aparecem com alerta no funil, no Início e no menu.</p>
        </>
      )}
      {qrOpen && church && <AutocadastroPainel church={church} people={people} onClose={() => setQrOpen(false)} onRefresh={() => router.refresh()} />}
      {cfgOpen && church && <ContatoCfgModal church={church} cfg={cc} onClose={() => setCfgOpen(false)} onRefresh={() => router.refresh()} />}

      {view === "regras" ? null : view === "painel" ? (
        <div className="vpanel">
          <div className="kpi-row"><Kpi icon="visitante" label="Visitantes" value={visitors.length} foot="no acompanhamento" help="Todo mundo que visitou e ainda está sendo acompanhado, antes de virar membro." /><Kpi icon="comunicacao" label="Respondem o contato" value={`${replyRate}%`} foot={`${answered.length} de ${contacted.length} contatados`} help="De quem a equipe já contatou, quantos responderam de volta." /><Kpi icon="ok" label="Integram (viram membro)" value={`${integrationRate}%`} foot={`${members.length} de ${visitors.length} · ${visitors.filter((v) => v.stage === "integrando" || v.stage === "membro").length} em integração`} help="De todos os visitantes, quantos completaram o caminho até virar membro." /><Kpi icon="alerta" label="Sem resposta" value={visitors.filter((visitor) => visitor.reply_status === "sem_resposta").length} foot="precisam de novo contato" amber help="Visitantes contatados que ainda não responderam. Vale tentar de novo." /></div>
          <div className="vpanel-grid">
            <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> Visitantes por culto <HelpDot text="Em qual culto os visitantes mais chegam." /></span></div><div className="panel-body flush">{Object.entries(byService).map(([name, count]) => <div className="dist-row" key={name}><span className="dist-name">{name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(count / maxService) * 100}%` }} /></div><span className="dist-num">{count}</span></div>)}{visitors.length === 0 ? <div className="empty">Nenhum visitante ainda.</div> : null}</div></div>
            <div className="panel">
              <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} /> Resposta ao 1º contato <HelpDot text="Quantos visitantes já responderam o primeiro contato da equipe." /></span></div>
              <div className="panel-body">
                {(() => {
                  const semResposta = visitors.filter((v) => v.reply_status === "sem_resposta");
                  const naoContatados = visitors.filter((v) => !v.reply_status);
                  return (
                    <>
                      <div className="resp-split">
                        <div className="resp-seg respondeu" style={{ flex: Math.max(answered.length, 0.001) }} title="Responderam" />
                        <div className="resp-seg sem" style={{ flex: Math.max(semResposta.length, 0.001) }} title="Sem resposta" />
                        <div className="resp-seg nao" style={{ flex: Math.max(naoContatados.length, 0.001) }} title="Ainda não contatados" />
                      </div>
                      <div className="resp-legend">
                        <span><i className="resp-dot respondeu" /> {answered.length} responderam</span>
                        <span><i className="resp-dot sem" /> {semResposta.length} sem resposta</span>
                        <span><i className="resp-dot nao" /> {naoContatados.length} a contatar</span>
                      </div>
                      <div className="dsec-title" style={{ margin: "18px 0 8px" }}>Não responderam · refazer contato</div>
                      {semResposta.length === 0 && <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Ninguém sem resposta.</div>}
                      {semResposta.map((visitor) => {
                        const owner = visitor.responsible_id ? personById.get(visitor.responsible_id) : null;
                        return (
                          <button className="flag-row click" type="button" key={visitor.id} style={{ cursor: "pointer" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}>
                            <Av name={visitor.name} size="sm" />
                            <div className="flag-main"><div className="flag-nome">{visitor.name}</div><div className="flag-meta">{formatDateBR(visitor.visited_on) || "sem data"} · {owner ? `resp. ${owner.name.split(" ")[0]}` : "sem dono"}</div></div>
                            <span className="vcard-noresp" style={{ marginLeft: "auto" }}>sem resposta</span>
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : view === "pipe" ? (
        <div className="pipe">
          {VISITOR_STAGES.map((stage) => {
            const items = visitors.filter((visitor) => visitor.stage === stage.id);
            return <div className={`pipe-col${items.length ? "" : " vazia"}`} key={stage.id}><div className="pipe-head"><span className="pipe-dot" style={{ background: stage.color }} /><span className="pipe-name">{stage.name}</span><span className="pipe-num">{items.length}</span></div><div className="pipe-body">{items.map((visitor) => <VisitanteCard key={visitor.id} visitor={visitor} notes={visitorNotes} onOpen={() => setDrawer({ kind: "visitor", id: visitor.id })} />)}{items.length === 0 ? <div className="empty" style={{ padding: 14 }}>vazio</div> : null}</div></div>;
          })}
        </div>
      ) : (
        <div className="tbl">
          <div className="tr head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }}><span>Visitante</span><span>Etapa</span><span>Como chegou</span><span>Próximo passo</span><span>Visitou</span></div>
          {visitors.map((visitor) => { const stage = VISITOR_STAGES.find((s) => s.id === visitor.stage); return <button className="tr click" key={visitor.id} type="button" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}><div className="cell-person"><Av name={visitor.name} size="md" /><div><div className="cell-name">{visitor.name}</div><div className="cell-sub">{visitor.phone}</div></div></div><div><span className="chip chip-neutral" style={{ color: stage?.color, borderColor: "var(--border-2)" }}>{stage?.name ?? visitor.stage}</span></div><div className="cell-sub">{visitor.origin || "Visitante"}</div><div><span className={`vcard-due ${visitor.due_status || "ok"}`}>{visitor.due || "sem prazo"}</span></div><div className="mini-right">{formatDateBR(visitor.visited_on) || "sem data"}</div></button>; })}
        </div>
      )}
    </div>
  );
}

export function ContatoCfgModal({ church, cfg, onClose, onRefresh }: { church: ChurchView; cfg: ContatoCfg; onClose: () => void; onRefresh: () => void }) {
  const [prazoHoras, setPrazoHoras] = useState(cfg.prazoHoras);
  const [canal, setCanal] = useState(cfg.canal);
  const [metaIntegracaoDias, setMetaIntegracaoDias] = useState(cfg.metaIntegracaoDias);
  const [mensagem, setMensagem] = useState(cfg.mensagem);
  const [abordagem, setAbordagem] = useState(cfg.abordagem);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    const next: ContatoCfg = { prazoHoras, canal, metaIntegracaoDias, mensagem, abordagem };
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, contatoCfg: next } }).eq("id", church.id);
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Líder da integração</div>
          <div className="modal-title">Como acolhemos quem chega</div>
          <div className="modal-sub">Defina o prazo e a abordagem do primeiro contato. Fica claro para a equipe e deixa visível quanto tempo leva para integrar.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field field-half"><label className="field-label">Prazo do 1º contato (horas)</label><input className="input" type="number" value={prazoHoras} onChange={(e) => setPrazoHoras(+e.target.value)} /></div>
          <div className="field field-half">
            <label className="field-label">Canal</label>
            <select className="select" value={canal} onChange={(e) => setCanal(e.target.value)}>
              {["WhatsApp", "Ligação", "Mensagem", "Presencial"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field field-half"><label className="field-label">Meta de integração (dias)</label><input className="input" type="number" value={metaIntegracaoDias} onChange={(e) => setMetaIntegracaoDias(+e.target.value)} /></div>
          <div className="field">
            <label className="field-label">Mensagem padrão</label>
            <textarea className="textarea" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
            <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)", marginTop: 6 }}>Use {"{nome}"}, {"{evento}"} e {"{igreja}"}: preenchemos automaticamente.</div>
          </div>
          <div className="field"><label className="field-label">Abordagem / postura</label><textarea className="textarea" value={abordagem} onChange={(e) => setAbordagem(e.target.value)} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
