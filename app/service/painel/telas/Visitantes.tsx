"use client";

import { telefoneParaWhatsapp } from "../../lib/telefone";
import { plural } from "../../lib/plural";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot, parseISODate } from "../../lib/date";
import AutocadastroPainel from "../../modules/visitantes/AutocadastroPainel";
import { HelpDot } from "../../HelpSystem";
import { Av, EmptyState, MenuMais, PageHead } from "../ui";
import { Kpi, VISITOR_STAGES, semContato48h } from "../comum";
import type { ChurchView, ContatoCfg, DrawerState, ModalState, PersonView, VisitorNoteView, VisitorView } from "../tipos";

import { Botao, botaoClasse } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Cartao } from "../../ui/Cartao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Selo } from "../../ui/Selo";
import { Segmentado } from "../../ui/Segmentado";
import { Campo, Entrada, TextoLongo } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { Vazio } from "../../ui/Estados";
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
  const fone = telefoneParaWhatsapp(visitor.phone);
  return (
    <div className={`vcard${alerta ? " vcard-alerta" : ""}`}>
      <Acao className="vcard-open" onClick={onOpen}>
        <div className="vcard-top">
          <Av name={visitor.name} size="sm" />
          <div style={{ minWidth: 0 }}>
            <div className="vcard-name">{visitor.name}</div>
            <div className="vcard-when">{joinDot(dias === null ? null : dias === 0 ? "visitou hoje" : `há ${plural(dias, "dia")}`, visitor.origin)}</div>
          </div>
        </div>
        {alerta && <div className="vcard-alert"><Icon name="alerta" size={14} /> Sem contato há mais de 48h</div>}
        {!alerta && visitor.reply_status && <div className="vcard-foot">{visitor.reply_status === "respondeu" ? <span className="vcard-resp">respondeu</span> : <span className="vcard-noresp">sem resposta</span>}</div>}
      </Acao>
      <div className="vcard-acts">
        {fone && <a className={botaoClasse({ compacto: true })} href={`https://wa.me/${fone}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> WhatsApp</a>}
        <Botao compacto onClick={onOpen} aria-label={`Registrar contato com ${visitor.name}`}>Registrar</Botao>
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
        action={<><MenuMais rotulo="Mais opções" acoes={[
          { rotulo: "Indicadores de visitantes", onClick: () => setView("painel") },
          { rotulo: "Regras de acolhimento", onClick: () => setView("regras") },
          ...(church ? [{ rotulo: "QR e link de visita", onClick: () => setQrOpen(true) }] : []),
        ]} /><Botao variante="principal" onClick={() => setModal({ eyebrow: "Criar", title: "Novo visitante", subtitle: "Quem chegou pela primeira vez. Entra no acompanhamento automaticamente.", saveLabel: "Registrar visitante", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"Quem visitou" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"origem", label:"Como chegou", type:"select", half:true, options:[{v:"Convite de membro",l:"Convite de membro"},{v:"Instagram",l:"Instagram"},{v:"Indicação",l:"Indicação"},{v:"Evangelismo",l:"Evangelismo"},{v:"Tomou decisão no culto",l:"Tomou decisão no culto"},{v:"Passava na rua",l:"Passava na rua"}] }], action: { kind: "visitor" } })}>Registrar visitante</Botao></>}
      />
      <div className="toolbar">
        <Segmentado role="group" aria-label="Acompanhamento de visitantes">
          <Opcao marcada={view === "pipe"} aria-pressed={view === "pipe"} onClick={() => setView("pipe")}>Funil</Opcao>
          <Opcao marcada={view === "list"} aria-pressed={view === "list"} onClick={() => setView("list")}>Lista</Opcao>
        </Segmentado>
        {(view === "painel" || view === "regras") && <span className="panel-meta">{view === "painel" ? "Indicadores de visitantes" : "Regras de acolhimento"}</span>}
      </div>
      {view === "regras" && (
        <>
          <div className="contato-banner">
            <div className="contato-pill"><span className="contato-pill-n">{cc.prazoHoras}h</span><span>1º contato</span></div>
            <div className="contato-main"><div className="contato-t">Primeiro contato em até <em>{cc.prazoHoras}h</em> por <em>{cc.canal}</em> · meta de integração: <em>{cc.metaIntegracaoDias} dias</em></div><div className="contato-s">{cc.abordagem}</div></div>
            <Botao compacto onClick={() => setCfgOpen(true)}>Ajustar</Botao>
          </div>
          <p className="ph-sub" style={{ marginTop: 10 }}>Os visitantes sem nenhum contato registrado depois desse prazo aparecem com alerta no funil, no Início e no menu.</p>
        </>
      )}
      {qrOpen && church && <AutocadastroPainel church={church} people={people} onClose={() => setQrOpen(false)} onRefresh={() => router.refresh()} />}
      {cfgOpen && church && <ContatoCfgModal church={church} cfg={cc} onClose={() => setCfgOpen(false)} onRefresh={() => router.refresh()} />}

      {view === "regras" ? null : view === "painel" ? (
        <div className="vpanel">
          <div className="kpi-row"><Kpi icon="visitante" label="Visitantes" value={visitors.length} foot="no acompanhamento" help="Todo mundo que visitou e ainda está sendo acompanhado, antes de virar membro." /><Kpi icon="comunicacao" label="Respondem o contato" value={contacted.length ? `${replyRate}%` : "Sem dados"} foot={`${answered.length} de ${contacted.length} contatados`} help="De quem a equipe já contatou, quantos responderam de volta." /><Kpi icon="ok" label="Integram (viram membro)" value={visitors.length ? `${integrationRate}%` : "Sem dados"} foot={`${members.length} de ${visitors.length} · ${visitors.filter((v) => v.stage === "integrando" || v.stage === "membro").length} em integração`} help="De todos os visitantes, quantos completaram o caminho até virar membro." /><Kpi icon="alerta" label="Sem resposta" value={visitors.filter((visitor) => visitor.reply_status === "sem_resposta").length} foot="precisam de novo contato" amber help="Visitantes contatados que ainda não responderam. Vale tentar de novo." /></div>
          <div className="vpanel-grid">
            <Cartao><div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> Visitantes por culto <HelpDot text="Em qual culto os visitantes mais chegam." /></span></div><div className="panel-body flush">{Object.entries(byService).map(([name, count]) => <div className="dist-row" key={name}><span className="dist-name">{name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(count / maxService) * 100}%` }} /></div><span className="dist-num">{count}</span></div>)}{visitors.length === 0 ? <Vazio titulo="Nenhum visitante ainda." /> : null}</div></Cartao>
            <Cartao>
              <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} /> Resposta ao 1º contato <HelpDot text="Quantos visitantes já responderam o primeiro contato da equipe." /></span></div>
              <div className="panel-body">
                {(() => {
                  const semResposta = visitors.filter((v) => v.reply_status === "sem_resposta");
                  const naoContatados = visitors.filter((v) => !v.reply_status);
                  return (
                    <>
                      <div className="resp-split">
                        {answered.length > 0 && <div className="resp-seg respondeu" style={{ flex: answered.length }} title="Responderam" />}
                        {semResposta.length > 0 && <div className="resp-seg sem" style={{ flex: semResposta.length }} title="Sem resposta" />}
                        {naoContatados.length > 0 && <div className="resp-seg nao" style={{ flex: naoContatados.length }} title="Ainda não contatados" />}
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
                          <Acao className="flag-row click" key={visitor.id} style={{ cursor: "pointer" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}>
                            <Av name={visitor.name} size="sm" />
                            <div className="flag-main"><div className="flag-nome">{visitor.name}</div><div className="flag-meta">{formatDateBR(visitor.visited_on) || "sem data"} · {owner ? `resp. ${owner.name.split(" ")[0]}` : "sem dono"}</div></div>
                            <span className="vcard-noresp" style={{ marginLeft: "auto" }}>sem resposta</span>
                          </Acao>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </Cartao>
          </div>
        </div>
      ) : visitors.length === 0 ? (
        <EmptyState title="A primeira visita começa o acompanhamento" text="Use Registrar visitante para cadastrar quem chegou. Em Mais opções, você encontra o QR e o link para a própria pessoa preencher." />
      ) : view === "pipe" ? (
        <div className="pipe">
          {VISITOR_STAGES.map((stage) => {
            const items = visitors.filter((visitor) => visitor.stage === stage.id);
            return <div className={`pipe-col${items.length ? "" : " vazia"}`} key={stage.id}><div className="pipe-head"><span className="pipe-dot" style={{ background: stage.color }} /><span className="pipe-name">{stage.name}</span><span className="pipe-num">{items.length}</span></div><div className="pipe-body">{items.map((visitor) => <VisitanteCard key={visitor.id} visitor={visitor} notes={visitorNotes} onOpen={() => setDrawer({ kind: "visitor", id: visitor.id })} />)}{items.length === 0 ? <Vazio titulo="vazio" /> : null}</div></div>;
          })}
        </div>
      ) : (
        <div className="tbl">
          <Linha estilo="tabela" className="head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }}><span>Visitante</span><span>Etapa</span><span>Como chegou</span><span>Próximo passo</span><span>Visitou</span></Linha>
          {visitors.map((visitor) => { const stage = VISITOR_STAGES.find((s) => s.id === visitor.stage); return <Acao className={`${linhaClasse({ estilo: "tabela" })} click`} key={visitor.id} style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}><div className="cell-person"><Av name={visitor.name} size="md" /><div><div className="cell-name">{visitor.name}</div><div className="cell-sub">{visitor.phone}</div></div></div><div><Selo style={{ color: stage?.color, borderColor: "var(--border-2)" }}>{stage?.name ?? visitor.stage}</Selo></div><div className="cell-sub">{visitor.origin || "Visitante"}</div><div><span className={`vcard-due ${visitor.due_status || "ok"}`}>{visitor.due || "sem prazo"}</span></div><div className="mini-right">{formatDateBR(visitor.visited_on) || "sem data"}</div></Acao>; })}
        </div>
      )}
    </div>
  );
}

export function ContatoCfgModal({ church, cfg, onClose, onRefresh }: { church: ChurchView; cfg: ContatoCfg; onClose: () => void; onRefresh: () => void }) {
  const fid = useId();
  const [erro, setErro] = useState("");
  const [prazoHoras, setPrazoHoras] = useState(cfg.prazoHoras);
  const [canal, setCanal] = useState(cfg.canal);
  const [metaIntegracaoDias, setMetaIntegracaoDias] = useState(cfg.metaIntegracaoDias);
  const [mensagem, setMensagem] = useState(cfg.mensagem);
  const [abordagem, setAbordagem] = useState(cfg.abordagem);
  const [saving, setSaving] = useState(false);

  const valoresValidos = Number.isInteger(prazoHoras) && prazoHoras > 0 && Number.isInteger(metaIntegracaoDias) && metaIntegracaoDias > 0;
  const salvar = async () => {
    if (saving || !valoresValidos) return;
    setErro("");
    setSaving(true);
    const next: ContatoCfg = { prazoHoras, canal, metaIntegracaoDias, mensagem, abordagem };
    try {
      const result = await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, contatoCfg: next } }).eq("id", church.id).select("id");
      if (result.error || !result.data?.length) { setErro("Não conseguimos salvar as regras. Verifique seu acesso e tente novamente."); return; }
      onRefresh();
      onClose();
    } catch { setErro("Não conseguimos salvar agora. Tente novamente."); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-bg" onClick={saving ? undefined : onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby={`${fid}-titulo`} aria-busy={saving} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Líder da integração</div>
          <div className="modal-title" id={`${fid}-titulo`}>Como acolhemos quem chega</div>
          <div className="modal-sub">Defina o prazo e a abordagem do primeiro contato. Fica claro para a equipe e deixa visível quanto tempo leva para integrar.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <Campo rotulo="Prazo do 1º contato (horas)" className="field-half"><Entrada id={`${fid}-prazo`} type="number" min={1} step={1} value={prazoHoras} onChange={(e) => setPrazoHoras(+e.target.value)} /></Campo>
          <Campo rotulo="Canal" className="field-half">
            <Selecao id={`${fid}-canal`} valor={canal} aoMudar={setCanal} opcoes={["WhatsApp", "Ligação", "Mensagem", "Presencial"].map((o) => ({ v: o, l: o }))} />
          </Campo>
          <Campo rotulo="Meta de integração (dias)" className="field-half"><Entrada id={`${fid}-meta`} type="number" min={1} step={1} value={metaIntegracaoDias} onChange={(e) => setMetaIntegracaoDias(+e.target.value)} /></Campo>
          <Campo rotulo="Mensagem padrão" ajuda={<>Use {"{nome}"}, {"{evento}"} e {"{igreja}"}: preenchemos automaticamente.</>}>
            <TextoLongo id={`${fid}-mensagem`} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </Campo>
          <Campo rotulo="Abordagem / postura"><TextoLongo id={`${fid}-abordagem`} value={abordagem} onChange={(e) => setAbordagem(e.target.value)} /></Campo>
        </div>
        {!valoresValidos && <p className="fs-error" role="alert">Informe horas e dias como números inteiros maiores que zero.</p>}
        {erro && <p className="fs-error" role="alert">{erro}</p>}
        <div className="modal-foot">
          <Botao desativado={saving} onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving || !valoresValidos} onClick={salvar}>{saving ? "Salvando..." : "Salvar"}</Botao>
        </div>
      </div>
    </div>
  );
}
