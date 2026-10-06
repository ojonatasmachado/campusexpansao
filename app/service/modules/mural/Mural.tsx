"use client";

/* Módulo Mural (4.1): publicações, quem leu e respostas. Saiu de
   ServiceExactApp.tsx sem mudar comportamento; o manifesto está em
   ./manifest.ts. Tipos de dados do painel: import só de tipo. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { notifyPush } from "../../lib/notify-push";
import { emSilencio, foraDoSilencio, quandoLembra } from "../../lib/silencio";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { dataPublicacao, formatDateBR, joinDot, paraPublico, porPublicacao, quandoPublicado } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { Av, EmptyState, PageHead } from "../../painel/ui";
import { friendlyWriteError } from "../../painel/erros";
import { ACESSO_MSG_DEFAULT, AcessoMsgModal, type AcessoMsgCfg } from "../pessoas/acesso-msg";
import type { AnnouncementReadView, AnnouncementResponseView, AnnouncementView, ChildGuardianView, ChurchView, FellowshipGroupView, MemberView, MinistryView, ModalState, PersonView, WallPostView } from "../../ServiceExactApp";
import { useTermos, type Termos } from "../../lib/vocabulario-context";

function ComposerModal({ church, publicos, onClose, onDone }: { church: ChurchView; publicos: MuralPublico[]; onClose: () => void; onDone: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [msg, setMsg] = useState("");
  const [publico, setPublico] = useState(publicos[0]?.id ?? "todos");
  const [tipo, setTipo] = useState<"aviso" | "evento" | "acao">("aviso");
  const [canais, setCanais] = useState<string[]>(["app"]);
  /* v7 4.18: lembrar quem não viu */
  const [lembrete, setLembrete] = useState<"nao" | "24" | "48" | "data">("nao");
  const [lembreteData, setLembreteData] = useState("");
  /* hora em que a opção foi escolhida (24h e 48h contam a partir dela) */
  const [lembreteBase, setLembreteBase] = useState(0);
  const lembreteEm = (): Date | null => {
    if (lembrete === "nao") return null;
    if (lembrete === "data") return lembreteData ? new Date(`${lembreteData}:00-03:00`) : null;
    return new Date(lembreteBase + Number(lembrete) * 3600000);
  };
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const alvo = publicos.find((p) => p.id === publico) ?? publicos[0];
  const toggleCanal = (c: string) => setCanais((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));
  const publicar = async () => {
    if (!titulo.trim()) { setErro("Dê um título para a publicação."); return; }
    /* o WhatsApp abre já com o texto (precisa ser no toque, antes de esperar o banco) */
    if (canais.includes("whatsapp")) window.open(`https://wa.me/?text=${encodeURIComponent(`${titulo.trim()}\n\n${msg.trim()}`)}`, "_blank", "noopener");
    setSalvando(true);
    setErro("");
    const sb = createServiceBrowserClient().schema("service");
    const base = { organization_id: church.organizationId, church_id: church.id, title: titulo.trim(), body: msg.trim() || null, audience: alvo.label, author: "Liderança", when_label: "agora" };
    const quando = lembreteEm();
    const comLembrete = quando ? { remind_at: foraDoSilencio(quando).toISOString(), remind_to: alvo.memberIds } : {};
    let { error } = await sb.from("announcements").insert({ ...base, kind: tipo, ...comLembrete });
    /* antes da migração 0062 as colunas do lembrete não existem: publica sem ele e avisa */
    if (error && quando && /remind/i.test(error.message)) {
      ({ error } = await sb.from("announcements").insert({ ...base, kind: tipo }));
      if (!error) avisar("Publicado, mas o lembrete ainda não está disponível.", "warn");
    }
    /* antes da migração 0049 a coluna "kind" não existe: publica sem o tipo */
    if (error && /kind/i.test(error.message)) ({ error } = await sb.from("announcements").insert(base));
    setSalvando(false);
    if (error) { setErro(friendlyWriteError(error.message)); return; }
    if (canais.includes("app")) notifyPush(church.organizationId, alvo.memberIds, titulo.trim(), msg.trim() || "Nova publicação no Mural.");
    avisar("Publicado no Mural.");
    onDone();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Mural</div>
          <div className="modal-title">Nova publicação</div>
          <div className="modal-sub">Escreva uma vez e escolha quem recebe. Quem está no app vê no Mural e recebe a notificação.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field">
            <label className="field-label">Tipo</label>
            <div className="seg-check">
              {(["aviso", "evento", "acao"] as const).map((k) => (
                <button key={k} type="button" className={`seg-chip ${tipo === k ? "on" : ""}`} onClick={() => setTipo(k)}>{KIND_LABEL[k]}</button>
              ))}
            </div>
            {tipo === "evento" && <div className="field-hint">No app, a pessoa responde Vou ou Não vou.</div>}
          </div>
          <div className="field">
            <label className="field-label req">Título</label>
            <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Ensaio geral no sábado" />
          </div>
          <div className="field">
            <label className="field-label">Mensagem</label>
            <textarea className="textarea" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Chegada às 15h45, no templo principal." />
          </div>
          <div className="field">
            <label className="field-label">Para quem</label>
            <select className="select" value={publico} onChange={(e) => setPublico(e.target.value)}>
              {publicos.map((p) => <option key={p.id} value={p.id}>{p.label} · {plural(p.memberIds.length, "pessoa")}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Por onde</label>
            <div className="seg-check">
              {([["app", "App e notificação"], ["whatsapp", "WhatsApp"]] as const).map(([id, l]) => (
                <button key={id} type="button" className={`seg-chip ${canais.includes(id) ? "on" : ""}`} onClick={() => toggleCanal(id)}>{l}</button>
              ))}
            </div>
            {canais.includes("whatsapp") && <div className="field-hint">O WhatsApp abre com o texto pronto para você mandar nos grupos da igreja.</div>}
          </div>
          {canais.includes("app") && (
            <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
              <label className="field-label">Lembrar quem não viu</label>
              <div className="seg-check">
                {([["nao", "Não lembrar"], ["24", "Em 24h"], ["48", "Em 48h"], ["data", "Numa data"]] as const).map(([k, l]) => (
                  <button key={k} type="button" className={`seg-chip ${lembrete === k ? "on" : ""}`} onClick={() => { setLembrete(k); setLembreteBase(Date.now()); }}>{l}</button>
                ))}
              </div>
              {lembrete === "data" && <input className="input" type="datetime-local" style={{ marginTop: 8 }} value={lembreteData} onChange={(e) => setLembreteData(e.target.value)} aria-label="Data e hora do lembrete" />}
              {lembreteEm() && <div className="field-hint">{`Uma notificação ${quandoLembra(foraDoSilencio(lembreteEm()!))} só para quem ainda não abriu.${emSilencio(lembreteEm()!) ? " Entre 22h e 7h ninguém recebe aviso, então vai às 7h." : ""}`}</div>}
            </div>
          )}
          {erro && <p className="field-error" style={{ marginTop: 12 }}>{erro}</p>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={!titulo.trim() || salvando || canais.length === 0 || (lembrete === "data" && !lembreteData)} onClick={publicar}>{salvando ? "Publicando..." : "Publicar"}</button>
        </div>
      </div>
    </div>
  );
}

function VerQuemLeuButton({ aviso, reads, people }: { aviso: AnnouncementView; reads: AnnouncementReadView[]; people: PersonView[] }) {
  const [open, setOpen] = useState(false);
  const readerIds = new Set(reads.filter((r) => r.announcement_id === aviso.id).map((r) => r.person_id));
  const leram = people.filter((p) => readerIds.has(p.id));
  const naoLeram = people.filter((p) => !readerIds.has(p.id));
  return (
    <>
      <button className="btn btn-sec btn-sm" type="button" onClick={() => setOpen(true)}>Ver quem leu</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Confirmação de leitura</div>
              <div className="modal-title">{aviso.title}</div>
              <div className="modal-sub">{leram.length} de {people.length} já leram este aviso.</div>
            </div>
            <div className="modal-body">
              <div className="dsec-title" style={{ marginBottom: 8 }}>Leram · {leram.length}</div>
              {leram.map((p) => (
                <div className="flag-row" key={p.id} style={{ cursor: "default" }}>
                  <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                  <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
                  <span style={{ marginLeft: "auto", color: "var(--olive)" }}><Icon name="ok" size={16} /></span>
                </div>
              ))}
              {naoLeram.length > 0 && <div className="dsec-title" style={{ margin: "14px 0 8px" }}>Ainda não leram · {naoLeram.length}</div>}
              {naoLeram.map((p) => (
                <div className="flag-row is-off" key={p.id} style={{ cursor: "default" }}>
                  <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                  <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
                  <span className="cand-fit busy" style={{ marginLeft: "auto" }}>pendente</span>
                </div>
              ))}
            </div>
            <div className="modal-foot"><button className="btn btn-pri" type="button" onClick={() => setOpen(false)}>Fechar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/* Mural (S38): um nome só, "Nova publicação" com público, canais e tipo, e o
   alcance de verdade (quem leu sobre quem devia receber). */
type MuralPublico = { id: string; label: string; memberIds: string[] };
const KIND_LABEL: Record<string, string> = { aviso: "Aviso", evento: "Evento", acao: "Pedido de ação" };
function publicosDoMural({ members, ministries, fellowshipGroups, childGuardians, termo }: {
  termo: Termos["termo"];
  members: MemberView[]; ministries: MinistryView[]; fellowshipGroups: FellowshipGroupView[]; childGuardians: ChildGuardianView[];
}): MuralPublico[] {
  const membroDe = (personIds: Set<string>) => members.filter((m) => m.volunteerId && personIds.has(m.volunteerId)).map((m) => m.id);
  const voluntarios = new Set(ministries.flatMap((min) => min.people.map((p) => p.personId)));
  const pais = new Set(childGuardians.map((g) => g.guardian_person_id));
  return [
    { id: "todos", label: "Todos", memberIds: members.map((m) => m.id) },
    { id: "membros", label: "Membros", memberIds: members.filter((m) => m.situation === "membro").map((m) => m.id) },
    { id: "voluntarios", label: termo("voluntario", { plural: true }), memberIds: membroDe(voluntarios) },
    ...ministries.map((min) => ({ id: `time:${min.id}`, label: `Time ${min.name}`, memberIds: membroDe(new Set(min.people.map((p) => p.personId))) })),
    ...fellowshipGroups.map((g) => ({ id: `grupo:${g.id}`, label: `${termo("grupo")} ${g.name}`, memberIds: members.filter((m) => m.groupId === g.id).map((m) => m.id) })),
    { id: "pais-kids", label: "Pais do Kids", memberIds: membroDe(pais) },
  ].filter((p, i) => i === 0 || p.memberIds.length > 0 || p.id === "pais-kids");
}

export function Comunicacao({
  announcements,
  announcementReads,
  announcementResponses = [],
  wallPosts,
  ministries,
  people,
  members = [],
  fellowshipGroups = [],
  childGuardians = [],
  church,
}: {
  announcements: AnnouncementView[];
  announcementReads: AnnouncementReadView[];
  announcementResponses?: AnnouncementResponseView[];
  wallPosts: WallPostView[];
  ministries: MinistryView[];
  people: PersonView[];
  members?: MemberView[];
  fellowshipGroups?: FellowshipGroupView[];
  childGuardians?: ChildGuardianView[];
  church?: ChurchView;
  setModal: (modal: ModalState) => void;
}) {
  const { termo } = useTermos();
  const router = useRouter();
  const [compose, setCompose] = useState(false);
  const [msgCfgOpen, setMsgCfgOpen] = useState(false);
  const publicos = publicosDoMural({ members, ministries, fellowshipGroups, childGuardians, termo });
  const publicoDe = (a: AnnouncementView) => publicos.find((p) => p.label.toLowerCase() === (a.audience ?? "todos").toLowerCase()) ?? publicos[0];
  const acessoMsgCfg: AcessoMsgCfg = { ...ACESSO_MSG_DEFAULT, ...(church?.settings?.acessoMsgCfg ?? {}) };
  const personDoMembro = new Map(members.map((m) => [m.id, m.volunteerId]));

  const lembrar = (a: AnnouncementView, faltam: string[]) => {
    if (!church?.organizationId || faltam.length === 0) return;
    notifyPush(church.organizationId, faltam, a.title, "Tem uma publicação nova no Mural da igreja.");
    avisar(`Lembrete enviado a ${plural(faltam.length, "pessoa")}.`);
  };

  return (
    <div className="content wide">
      <PageHead
        title="Mural"
        eyebrow="Comunicação"
        subtitle="Publicações para a igreja toda ou para um grupo. Quem recebe vê no app, e você acompanha quem leu."
        action={<button className="btn btn-pri" type="button" onClick={() => setCompose(true)}>+ Nova publicação</button>}
      />
      <div className="mural-list">
        {announcements.length === 0 && <EmptyState title="Nada no Mural ainda" text="O que você publicar aparece aqui e no app de quem você escolher." action={{ label: "Nova publicação", onClick: () => setCompose(true) }} />}
        {porPublicacao(announcements).map((a) => {
          const pub = publicoDe(a);
          const leitores = new Set(announcementReads.filter((r) => r.announcement_id === a.id).map((r) => r.person_id));
          const leram = pub.memberIds.filter((id) => { const p = personDoMembro.get(id); return p && leitores.has(p); });
          const faltam = pub.memberIds.filter((id) => !leram.includes(id));
          const total = pub.memberIds.length;
          const pct = total ? Math.round((leram.length / total) * 100) : 0;
          const resp = announcementResponses.filter((r) => r.announcement_id === a.id);
          return (
            <article className="panel mural-item" key={a.id}>
              <div className="panel-body">
                <div className="mural-top">
                  <span className="chip chip-neutral">{KIND_LABEL[a.kind ?? "aviso"] ?? "Aviso"}</span>
                  <span className="mural-meta">{joinDot(paraPublico(pub.label), quandoPublicado(a.created_at), quandoPublicado(a.created_at) !== dataPublicacao(a.created_at) && dataPublicacao(a.created_at))}</span>
                </div>
                <h3 className="mural-t">{a.title}</h3>
                {a.body && <p className="mural-txt">{a.body}</p>}
                <div className="mural-reach">
                  <div className="mural-reach-n">{`Vista por ${leram.length} de ${plural(total, "pessoa")}`}{a.remind_at && !a.reminded_at && faltam.length > 0 ? ` · lembrete ${quandoLembra(new Date(a.remind_at))} para ${plural(faltam.length, "pessoa")}` : a.reminded_at ? ` · lembrete enviado em ${dataPublicacao(a.reminded_at)}` : ""}</div>
                  <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${pct}%` }} /></div>
                  {a.kind === "evento" && <div className="mural-reach-n">{plural(resp.filter((r) => r.response === "vou").length, "vai", "vão")} · {resp.filter((r) => r.response === "nao").length} não</div>}
                </div>
                <div className="mural-acts">
                  {faltam.length > 0 && <button className="btn btn-sec btn-sm" type="button" onClick={() => lembrar(a, faltam)}>Lembrar quem não leu</button>}
                  <VerQuemLeuButton aviso={a} reads={announcementReads} people={people.filter((p) => pub.memberIds.some((id) => personDoMembro.get(id) === p.id))} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {wallPosts.length > 0 && (
        <div className="panel" style={{ marginTop: 22 }}>
          <div className="panel-head"><span className="panel-title"><Icon name="kids" size={14} /> Recados para os pais do Kids</span></div>
          <div className="panel-body flush">
            {wallPosts.map((post) => (
              <div className="mini-row" key={post.id}>
                <div className="mini-main">
                  <div className="mini-title">{post.body}</div>
                  <div className="mini-sub">{joinDot(post.author || "Liderança", formatDateBR(post.created_at))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {church && (
        <div className="panel" style={{ marginTop: 22 }}>
          <div className="panel-head"><span className="panel-title"><Icon name="whatsapp" size={14} /> Automáticas</span></div>
          <div className="panel-body">
            <div className="contato-banner" style={{ margin: 0 }}>
              <div className="contato-main"><div className="contato-t">Boas-vindas pelo WhatsApp</div><div className="contato-s">O texto que abre pronto quando você envia o acesso a um membro novo.</div></div>
              <button className="btn btn-sec btn-sm" type="button" onClick={() => setMsgCfgOpen(true)}>Ajustar</button>
            </div>
          </div>
        </div>
      )}
      {msgCfgOpen && church && <AcessoMsgModal church={church} cfg={acessoMsgCfg} onClose={() => setMsgCfgOpen(false)} onRefresh={() => router.refresh()} />}
      {compose && church && <ComposerModal church={church} publicos={publicos} onClose={() => setCompose(false)} onDone={() => { setCompose(false); router.refresh(); }} />}
    </div>
  );
}

