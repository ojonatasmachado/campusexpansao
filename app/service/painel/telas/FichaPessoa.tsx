"use client";

import { regiaoInformada } from "../../lib/endereco";
import { recebimentoAberto } from "../../modules/times/recebimento";
import { plural } from "../../lib/plural";
import { formatarTelefone } from "../../lib/telefone";
import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot } from "../../lib/date";

import { useTermos } from "../../lib/vocabulario-context";
import { useServiceAccess } from "../../AccessContext";
import AutocadastroDados from "../../modules/visitantes/AutocadastroDados";
import { requirementsFor, requirementLabel } from "../../lib/requirements";
import { Av, Chip } from "../ui";
import { JRN_STEPS } from "../caminhada";
import { porData, tipoDoFato } from "../../lib/historico";
import { coberturaPorTime } from "../../modules/escalas/cobertura";
import { JORNADA_KIND_INDEX, ROUTES, TeamMark, VISITOR_STAGES, openMemberInviteWhatsapp, parseFlexDate, timelineEventPayload, writeJourneyStep } from "../comum";
import { DrawerSection, DrawerShell } from "../campos";
import { MiniCalendar } from "./Agenda";
import { AcessosCard } from "./Config";
import { MinisterioEditModal } from "./Times";
import { BatismoDrawer, DecisaoDrawer } from "./Caminhada";
import { EnsaioDrawer, ReuniaoDrawer } from "./Reunioes";
import { EventDrawer } from "./Evento";
import type { BaptismCandidateView, BaptismClassView, BoardView, CalEvent, CardView, ChurchView, CourseView, DecisionView, DrawerState, EnrollmentView, EventRsvpView, EventView, FellowshipGroupView, JourneyStepKind, LessonView, MeetingActionView, MeetingView, MemberView, MinistryView, ModalState, ModuleView, PersonView, RehearsalView, RosterAssignmentView, TimelineEventView, VisitorNoteView, VisitorView } from "../tipos";

import { Botao, botaoClasse, BotaoIcone } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Selo, etiquetaClasse } from "../../ui/Selo";
import { Linha } from "../../ui/Linha";
import { Campo, Entrada } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { SeletorData } from "../../ui/Data";
import { Vazio } from "../../ui/Estados";
export function PersonTimeline({ member, events, compact }: { member: MemberView; events: TimelineEventView[]; compact?: boolean }) {
  const { comTermos: ct } = useTermos();
  const sorted = porData(events);
  const stepsWithoutEvent = JRN_STEPS.filter((step, i) => !!member.journey[i] && !events.some((e) => e.event_type === step.kind));

  if (!sorted.length && !stepsWithoutEvent.length) {
    return <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)", padding: "12px 0" }}>Nada registrado ainda.</div>;
  }
  return (
    <div className={`tl jrn-tl${compact ? " compact" : ""}`}>
      {sorted.map((event) => {
        const step = JRN_STEPS.find((s) => s.kind === event.event_type);
        const icone = step?.icon ?? tipoDoFato(event.event_type).icone;
        return (
          <div className="tl-item ol tone-olive" key={event.id}>
            <div className="tl-dot" />
            <div className="tl-when"><span className="jrn-tl-kind"><Icon name={icone} size={11} /> {event.when_label ?? new Date(event.created_at).toLocaleDateString("pt-BR")}</span></div>
            <div className="tl-text"><b>{event.title}</b>{event.body ? ` · ${event.body}` : ""}</div>
          </div>
        );
      })}
      {stepsWithoutEvent.map((step) => (
        <div className="tl-item ol tone-olive" key={step.kind}>
          <div className="tl-dot" />
          <div className="tl-when"><span className="jrn-tl-kind"><Icon name={step.icon} size={11} /> {ct(step.label)}</span></div>
          <div className="tl-text"><b>{ct(step.label)}</b> · etapa concluída</div>
        </div>
      ))}
    </div>
  );
}

export function VisitanteDrawer({
  visitor: initVisitor, notes, church, people, onClose, onOpenMember, setModal,
}: {
  visitor: VisitorView; notes: VisitorNoteView[]; church: ChurchView | undefined;
  people: PersonView[]; onClose: () => void; onOpenMember: (id: string) => void;
  setModal: (modal: ModalState) => void;
}) {
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [resp, setResp] = useState<"" | "respondeu" | "sem_resposta">("");
  const [saving, setSaving] = useState(false);
  const [currentStage, setCurrentStage] = useState(initVisitor.stage);
  const [currentReply, setCurrentReply] = useState(initVisitor.reply_status);
  const stageIdx = VISITOR_STAGES.findIndex((s) => s.id === currentStage);
  const owner = initVisitor.responsible_id ? people.find((p) => p.id === initVisitor.responsible_id) : null;
  const visitorNotes = notes.filter((n) => n.visitor_id === initVisitor.id);

  const addNota = async () => {
    if (!nota.trim() && !resp) return;
    setSaving(true);
    const sb = createServiceBrowserClient().schema("service");
    if (resp) {
      await sb.from("visitors").update({ reply_status: resp }).eq("id", initVisitor.id);
      setCurrentReply(resp as "respondeu" | "sem_resposta");
    }
    if (nota.trim() || resp) {
      const body = nota.trim() || (resp === "respondeu" ? "Contato registrado: respondeu." : "Contato registrado: sem resposta.");
      await sb.from("visitor_notes").insert({ organization_id: church?.organizationId, visitor_id: initVisitor.id, body, author: "Equipe", is_milestone: false });
    }
    router.refresh();
    setNota("");
    setResp("");
    setSaving(false);
  };

  const avancar = async () => {
    if (stageIdx >= VISITOR_STAGES.length - 1) return;
    const next = VISITOR_STAGES[stageIdx + 1];
    setSaving(true);
    const sb = createServiceBrowserClient().schema("service");
    await sb.from("visitors").update({ stage: next.id }).eq("id", initVisitor.id);
    await sb.from("visitor_notes").insert({ organization_id: church?.organizationId, visitor_id: initVisitor.id, body: `Avançou para "${next.name}".`, author: "Equipe", is_milestone: true });
    setCurrentStage(next.id as VisitorView["stage"]);
    router.refresh();
    setSaving(false);
  };

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={onClose}>✕</BotaoIcone>
        <div className="profile-top">
          <Av name={initVisitor.name} size="lg" />
          <div>
            <div className="profile-name">{initVisitor.name}</div>
            <div className="profile-role">{initVisitor.origin || "Visitante"} · primeira visita {formatDateBR(initVisitor.visited_on) || "sem data"}</div>
            <div style={{ marginTop: 10 }}>
              <Selo style={{ color: VISITOR_STAGES[stageIdx]?.color }}>{VISITOR_STAGES[stageIdx]?.name ?? currentStage}</Selo>
            </div>
          </div>
        </div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Contato">
          <dl className="kv">
            <dt>Telefone</dt><dd>{initVisitor.phone || "-"}</dd>
            <AutocadastroDados visitor={initVisitor} />
            <dt>Como chegou</dt><dd>{initVisitor.origin || "Visitante"}</dd>
            <dt>Responsável</dt><dd>{owner?.name || "sem dono fixo"}</dd>
            <dt>Próximo passo</dt><dd><span className={`vcard-due ${initVisitor.due_status || "ok"}`}>{initVisitor.due || "sem prazo"}</span></dd>
          </dl>
        </DrawerSection>
        <DrawerSection title={ct("{Caminhada} de integração")}>
          <div style={{ display: "flex", gap: 6 }}>
            {VISITOR_STAGES.map((s, i) => (
              <div key={s.id} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 5, borderRadius: 3, background: i <= stageIdx ? s.color : "var(--ink)" }} />
                <div style={{ fontSize: "var(--fs-pn-12)", color: i <= stageIdx ? "var(--light)" : "var(--muted)", marginTop: 7 }}>{s.name}</div>
              </div>
            ))}
          </div>
          {stageIdx < VISITOR_STAGES.length - 1
            ? <Botao variante="principal" compacto style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={avancar} desativado={saving}>Mover para {VISITOR_STAGES[stageIdx + 1]?.name}</Botao>
            : (
              <div className="vmember-cta">
                <div className="vmember-t"><Icon name="ok" size={13} /> Chegou a membro</div>
                <div className="vmember-s">Complete os dados cadastrais para liberar o acesso ao app.</div>
                {initVisitor.member_id
                  ? <Botao variante="principal" compacto style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => { onClose(); onOpenMember(initVisitor.member_id!); }}>Ver ficha</Botao>
                  : (
                    <Botao variante="principal" compacto style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setModal({
                      eyebrow: "Criar",
                      title: "Completar dados de membro",
                      subtitle: "Finalize o cadastro para liberar o acesso ao app.",
                      saveLabel: "Adicionar membro",
                      formFields: [
                        { k: "nome", label: "Nome completo", type: "text", req: true, ph: "Como a pessoa se chama", value: initVisitor.name },
                        { k: "tel", label: "Telefone (WhatsApp)", type: "text", half: true, ph: "(11) 9...", value: initVisitor.phone ?? "" },
                        { k: "email", label: "E-mail", type: "text", half: true, req: true, ph: "usado para entrar no app" },
                        { k: "nasc", label: "Aniversário", type: "date", half: true },
                        { k: "bairro", label: "Bairro", type: "text", half: true, ph: "Onde mora" },
                      ],
                      action: { kind: "member", visitorId: initVisitor.id },
                    })}>Completar dados de membro →</Botao>
                  )}
              </div>
            )
          }
        </DrawerSection>
        <DrawerSection title="Registrar contato">
          {currentReply && <div className={`vresp-now ${currentReply}`}>{currentReply === "respondeu" ? "Último contato: respondeu" : "Último contato: sem resposta, refazer"}</div>}
          <textarea className="textarea" placeholder="O que rolou nesse contato? (ligação, WhatsApp, visita...)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <div className="vresp-pick">
            <span className="vresp-lbl">A pessoa respondeu?</span>
            <div className="seg-check">
              <Acao className={`seg-chip ${resp === "respondeu" ? "on" : ""}`} onClick={() => setResp(resp === "respondeu" ? "" : "respondeu")}>Respondeu</Acao>
              <Acao className={`seg-chip ${resp === "sem_resposta" ? "on" : ""}`} onClick={() => setResp(resp === "sem_resposta" ? "" : "sem_resposta")}>Não respondeu</Acao>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Botao variante="principal" compacto onClick={addNota} desativado={saving}>{saving ? "Salvando…" : "Salvar no histórico"}</Botao>
          </div>
        </DrawerSection>
        <DrawerSection title="Histórico de contato">
          {visitorNotes.length > 0
            ? (
              <div className="tl">
                {visitorNotes.map((n) => (
                  <div className={`tl-item ${n.is_milestone ? "ol" : ""}`} key={n.id}>
                    <div className="tl-dot" />
                    <div className="tl-when">{formatDateBR(n.happened_on || n.created_at) || "-"}</div>
                    <div className="tl-text">{n.body}</div>
                    {n.author && <div className="tl-by">por {n.author}</div>}
                  </div>
                ))}
              </div>
            )
            : <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum contato registrado ainda.</div>}
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}

export function MemberEditModal({
  member, fellowshipGroups, church, onClose, onRefresh,
}: {
  member: MemberView;
  fellowshipGroups: FellowshipGroupView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { termo } = useTermos();
  const [birth, setBirth] = useState(member.birth ?? "");
  const [neighborhood, setNeighborhood] = useState(member.neighborhood ?? "");
  const [groupId, setGroupId] = useState(member.groupId ?? "");
  const [family, setFamily] = useState(member.family ?? "");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    const sb = createServiceBrowserClient().schema("service");
    await sb.from("members").update({
      birth: birth || null,
      neighborhood: neighborhood.trim() || null,
      group_id: groupId || null,
      family: family.trim() || null,
    }).eq("id", member.id);
    if (groupId && groupId !== (member.groupId ?? "") && church?.organizationId) {
      const group = fellowshipGroups.find((g) => g.id === groupId);
      await sb.from("timeline_events").insert(
        timelineEventPayload(church.organizationId, member.id, "integracao", `Entrou no ${termo("grupo")}${group?.name ? ` "${group.name}"` : ""}`),
      );
      const journey = [...member.journey];
      journey[3] = 1;
      await sb.from("members").update({ journey }).eq("id", member.id);
    }
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Editar dados</div>
          <div className="modal-title">{member.name}</div>
          <div className="modal-sub">Aniversário, bairro, grupo de comunhão e família.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <Campo rotulo="Aniversário"><SeletorData valor={birth} aoMudar={setBirth} limpavel /></Campo>
          <Campo rotulo="Bairro"><Entrada value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Onde mora" /></Campo>
          {(church?.settings?.gruposCfg?.ativo ?? true) && (
            <Campo rotulo={termo("grupo")}>
              <Selecao valor={groupId} aoMudar={setGroupId} vazio="Sem grupo" opcoes={fellowshipGroups.map((g) => ({ v: g.id, l: g.name }))} />
            </Campo>
          )}
          <Campo rotulo="Família"><Entrada value={family} onChange={(e) => setFamily(e.target.value)} placeholder="ex: Família Lima (agrupa parentes na ficha)" /></Campo>
        </div>
        <div className="modal-foot">
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving} onClick={salvar}>Salvar</Botao>
        </div>
      </div>
    </div>
  );
}

export function JornadaEditModal({
  member, events, church, onClose, onRefresh,
}: {
  member: MemberView;
  events: TimelineEventView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const [rows, setRows] = useState<Record<JourneyStepKind, { done: boolean; date: string }>>(() =>
    Object.fromEntries(JRN_STEPS.map((step) => [step.kind, { done: false, date: "" }])) as Record<JourneyStepKind, { done: boolean; date: string }>,
  );
  const [saving, setSaving] = useState(false);

  const marcar = (kind: JourneyStepKind) => setRows((prev) => ({ ...prev, [kind]: { ...prev[kind], done: true } }));
  const setData = (kind: JourneyStepKind, date: string) => setRows((prev) => ({ ...prev, [kind]: { ...prev[kind], date } }));

  const salvar = async () => {
    if (!church?.organizationId) return;
    setSaving(true);
    for (const step of JRN_STEPS) {
      const jaConcluido = !!member.journey[JORNADA_KIND_INDEX[step.kind]];
      if (!jaConcluido && rows[step.kind].done) {
        await writeJourneyStep(church.organizationId, member, step.kind, rows[step.kind].date || null);
      }
    }
    setSaving(false);
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{ct("{Caminhada}")}</div>
          <div className="modal-title">{member.name}</div>
          <div className="modal-sub">Marque as etapas já concluídas, com a data real de cada uma.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          {JRN_STEPS.map((step) => {
            const jaConcluido = !!member.journey[JORNADA_KIND_INDEX[step.kind]];
            const event = events.find((e) => e.event_type === step.kind);
            return (
              <Linha estilo="config" key={step.kind} style={{ alignItems: "flex-start" }}>
                <div className="cfg-row-main">
                  <div className="cfg-row-t">{ct(step.label)}</div>
                  {jaConcluido ? (
                    <div className="cfg-row-s">Concluído{event?.when_label ? ` em ${event.when_label}` : ""}</div>
                  ) : rows[step.kind].done ? (
                    <Campo rotulo="Data" style={{ marginTop: 8 }}>
                      <SeletorData valor={rows[step.kind].date} aoMudar={(v) => setData(step.kind, v)} />
                    </Campo>
                  ) : (
                    <Botao compacto style={{ marginTop: 8 }} onClick={() => marcar(step.kind)}>Marcar como concluído</Botao>
                  )}
                </div>
              </Linha>
            );
          })}
        </div>
        <div className="modal-foot">
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving} onClick={salvar}>Salvar</Botao>
        </div>
      </div>
    </div>
  );
}

export function AddToMinistryModal({
  ministry, people, members, church, onClose,
}: {
  ministry: MinistryView;
  people: PersonView[];
  members: MemberView[];
  church: { id: string; organizationId: string };
  onClose: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [positionId, setPositionId] = useState("");
  const inMinistryIds = new Set(ministry.people.map((link) => link.personId));
  const fora = people.filter((p) => !inMinistryIds.has(p.id) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));

  const add = async (personId: string) => {
    const position = ministry.positions.find((p) => p.id === positionId);
    await createServiceBrowserClient().schema("service").from("person_ministries").insert({
      organization_id: church.organizationId,
      ministry_id: ministry.id,
      person_id: personId,
      is_leader: false,
      functions: position ? [position.name] : [],
    });
    const member = members.find((m) => m.volunteerId === personId);
    if (member) {
      const sb = createServiceBrowserClient().schema("service");
      await sb.from("timeline_events").insert(
        timelineEventPayload(church.organizationId, member.id, "time", `Começou a servir em "${ministry.name}"`),
      );
      const journey = [...member.journey];
      journey[4] = 1;
      await sb.from("members").update({ journey }).eq("id", member.id);
    }
    router.refresh();
    onClose();
  };

  return (
    <div className="modal-bg" style={{ zIndex: 80 }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Adicionar ao time</div>
          <div className="modal-title">{ministry.name}</div>
          <div className="modal-sub">{ct("Escolha o {voluntario} e, se souber, a função dele neste time.")}</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          {ministry.positions.length > 0 && (
            <Campo rotulo="Função (opcional)" style={{ marginBottom: 14 }}>
              <Selecao valor={positionId} aoMudar={setPositionId} vazio="Sem função definida" opcoes={ministry.positions.map((p) => ({ v: p.id, l: p.name }))} />
            </Campo>
          )}
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si"><Icon name="buscar" size={13} /></span>
            <input placeholder={ct("Buscar {voluntario}...")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          {fora.map((p) => (
            <div className="flag-row" key={p.id} style={{ cursor: "pointer" }} onClick={() => add(p.id)}>
              <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
              <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
              <span className={botaoClasse({ variante: "discreto", compacto: true })} style={{ marginLeft: "auto" }}>Adicionar</span>
            </div>
          ))}
          {fora.length === 0 && <Vazio titulo={q ? "Nenhum resultado." : ct("Todos os {voluntarios} já estão no time.")} />}
        </div>
        <div className="modal-foot">
          <Botao onClick={onClose}>Fechar</Botao>
        </div>
      </div>
    </div>
  );
}

export function EntityDrawer({
  drawer,
  people,
  members,
  ministries,
  events,
  roster,
  decisions,
  baptismClasses,
  baptismCandidates,
  visitors,
  visitorNotes,
  courses,
  enrollments,
  courseModules,
  courseLessons,
  meetings,
  meetingActions,
  rehearsals,
  boards,
  cards,
  church,
  fellowshipGroups,
  timelineEvents,
  setDrawer,
  setRoute,
  setModal,
  setShareEventId,
  eventRsvps = [],
  onAbrirVagas,
  scopeMinistryIds = null,
  onStartChatWithMember,
  currentRole = "membro",
}: {
  currentRole?: "master" | "pastor" | "lider" | "membro";
  drawer: NonNullable<DrawerState>;
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  roster: RosterAssignmentView[];
  decisions: DecisionView[];
  baptismClasses: BaptismClassView[];
  baptismCandidates: BaptismCandidateView[];
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  courses: CourseView[];
  enrollments: EnrollmentView[];
  courseModules: ModuleView[];
  courseLessons: LessonView[];
  meetings: MeetingView[];
  meetingActions: MeetingActionView[];
  rehearsals: RehearsalView[];
  boards: BoardView[];
  cards: CardView[];
  church: ChurchView | undefined;
  fellowshipGroups: FellowshipGroupView[];
  timelineEvents: TimelineEventView[];
  setDrawer: (drawer: DrawerState) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  setModal: (modal: ModalState) => void;
  setShareEventId: (id: string) => void;
  eventRsvps?: EventRsvpView[];
  onAbrirVagas?: (eventId: string, timeId?: string) => void;
  scopeMinistryIds?: string[] | null;
  onStartChatWithMember: (memberId: string) => void;
}) {
  const { termo, comTermos: ct } = useTermos();
  const router = useRouter();
  const [editingMember, setEditingMember] = useState(false);
  const [editingJourney, setEditingJourney] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [sendingAccess, setSendingAccess] = useState(false);
  const access = useServiceAccess();

  const sendMemberAccessWhatsapp = async (member: MemberView) => {
    if (!church || sendingAccess) return;
    setSendingAccess(true);
    const tab = window.open("", "_blank");
    try {
      const { error } = await openMemberInviteWhatsapp({
        memberId: member.id,
        name: member.name,
        phone: member.phone,
        churchName: church.nome ?? "sua igreja",
        template: church.settings?.acessoMsgCfg?.mensagem,
        tab,
      });
      if (error) avisar(error, "warn");
      else router.refresh();
    } finally {
      setSendingAccess(false);
    }
  };

  if (drawer.kind === "person") {
    const person = people.find((item) => item.id === drawer.id);
    if (!person) return null;
    const personRoster = roster.filter((item) => item.person_id === person.id);
    const linkedMinistries = ministries.filter((ministry) => ministry.people.some((link) => link.personId === person.id));
    const personCalEvents: CalEvent[] = [];
    personRoster.forEach((assignment) => {
      const ev = events.find((item) => item.id === assignment.event_id);
      const date = parseFlexDate(ev?.eventDate);
      if (!ev || !date) return;
      let posName = "Escala", ministryName = "";
      for (const ministry of ministries) {
        const position = ministry.positions.find((p) => p.id === assignment.position_id);
        if (position) { posName = position.name; ministryName = ministry.name; break; }
      }
      personCalEvents.push({
        date,
        label: ministryName ? `${posName} · ${ministryName}` : posName,
        sub: joinDot(ev.name, ev.time),
        tone: assignment.status === "no" ? "amber" : "olive",
        onClick: () => setDrawer({ kind: "event", id: ev.id }),
      });
    });
    meetings.filter((meeting) => meeting.attendees.includes(person.id)).forEach((meeting) => {
      const date = parseFlexDate(meeting.meeting_date);
      if (!date) return;
      personCalEvents.push({ date, label: meeting.title, sub: `Reunião · ${meeting.time ?? "sem horário"}`, tone: "amber", onClick: () => setDrawer({ kind: "meeting", id: meeting.id }) });
    });
    rehearsals.filter((rehearsal) => rehearsal.attendees.includes(person.id)).forEach((rehearsal) => {
      const date = parseFlexDate(rehearsal.rehearsal_date);
      if (!date) return;
      personCalEvents.push({ date, label: rehearsal.title, sub: `Ensaio · ${rehearsal.time ?? "sem horário"}`, tone: "olive", onClick: () => setDrawer({ kind: "rehearsal", id: rehearsal.id }) });
    });
    return (
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={() => setDrawer(null)}>✕</BotaoIcone>
          <div className="profile-top">
            <Av name={person.name} size="lg" photoUrl={person.photoUrl} />
            <div>
              <div className="profile-name">{person.name}</div>
              <div className="profile-role">{ct("{Voluntario} · desde o cadastro")}</div>
              <div style={{ marginTop: 10 }}><Chip status={person.status} /></div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <DrawerSection title="Contato">
            <dl className="kv"><dt>Telefone</dt><dd>{formatarTelefone(person.phone)}</dd><dt>E-mail</dt><dd>{person.email}</dd></dl>
          </DrawerSection>
          <DrawerSection title="Times e funções">
            <div className="cell-tags" style={{ gap: 8 }}>{linkedMinistries.map((ministry) => <Acao className={etiquetaClasse()} key={ministry.id} onClick={() => setDrawer({ kind: "ministry", id: ministry.id })}>{ministry.name}</Acao>)}</div>
            {person.tags.length > 0 && <div style={{ marginTop: 12, fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Etiquetas: {person.tags.join(" · ")}</div>}
          </DrawerSection>
          <DrawerSection title="Disponibilidade">
            <div className="avail">
              {[
                ["dom_m", "Dom manhã"],
                ["dom_n", "Dom noite"],
                ["qua", "Quarta"],
              ].map(([key, label]) => <span key={key} className={`avail-day ${person.availability[key] ? "free" : "block"}`}>{label}</span>)}
            </div>
          </DrawerSection>
          <DrawerSection title={`Meu calendário · ${plural(personCalEvents.length, "compromisso")}`}>
            <MiniCalendar events={personCalEvents} />
          </DrawerSection>
          {(currentRole === "master" || currentRole === "pastor") && (
            <DrawerSection title="Acesso ao painel">
              <AcessosCard people={people} church={church} currentRole={currentRole} onlyPersonId={person.id} />
            </DrawerSection>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setDrawer(null); setRoute("escalas"); }}>Escalar</Botao>
            {(() => {
              const linkedMember = members.find((m) => m.volunteerId === person.id);
              return (
                <Botao style={{ flex: 1, justifyContent: "center" }} desativado={!linkedMember} onClick={() => linkedMember && onStartChatWithMember(linkedMember.id)}>Enviar mensagem</Botao>
              );
            })()}
          </div>
        </div>
      </DrawerShell>
    );
  }

  if (drawer.kind === "member") {
    const member = members.find((item) => item.id === drawer.id);
    if (!member) return null;
    const temTelefone = (member.phone ?? "").replace(/\D/g, "").length >= 10;
    const linkedMinistries = ministries.filter((m) => m.people.some((p) => p.personId === member.volunteerId));
    const memberEnrollments = enrollments.filter((e) => e.member_id === member.id).map((e) => {
      const course = courses.find((c) => c.id === e.course_id);
      return course ? { ...e, course } : null;
    }).filter(Boolean) as (EnrollmentView & { course: CourseView })[];
    const isServing = member.journey[4] || linkedMinistries.length > 0;
    const grupo = fellowshipGroups.find((g) => g.id === member.groupId) ?? null;
    const grupoLider = grupo ? people.find((p) => p.id === grupo.leader_person_id) ?? null : null;
    const familiares = member.family ? members.filter((m) => m.family === member.family && m.id !== member.id) : [];
    const linkedPerson = member.volunteerId ? people.find((p) => p.id === member.volunteerId) ?? null : null;
    /* um aviso só, no lugar de "a completar" em cada campo */
    const faltando = [
      !member.phone && "telefone",
      !member.email && "e-mail",
      !member.birth && "aniversário",
      !regiaoInformada(member) && "endereço",
    ].filter(Boolean) as string[];
    return (
      <>
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={() => setDrawer(null)}>✕</BotaoIcone>
          <div className="profile-top">
            <Av name={member.name} size="lg" photoUrl={linkedPerson?.photoUrl} />
            <div>
              <div className="profile-name">{member.name}</div>
              {member.firstContact ? <div className="profile-role">Membro desde {formatDateBR(member.firstContact)}</div> : null}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip status={member.situation} />
                {isServing && <Selo tom="ok">Servindo</Selo>}
              </div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          {faltando.length > 0 && (
            <div className="cadastro-incompleto">
              <span><b>Cadastro incompleto</b> · falta {faltando.join(", ")}</span>
              <Botao compacto onClick={() => setEditingMember(true)}>Completar</Botao>
            </div>
          )}
          <DrawerSection title="Dados cadastrais">
            <dl className="kv">
              <dt>Telefone</dt><dd>{formatarTelefone(member.phone)}</dd>
              <dt>E-mail</dt><dd>{member.email}</dd>
              <dt>Aniversário</dt><dd>{currentRole === "master" || currentRole === "pastor" ? formatDateBR(member.birth) : formatDateBR(member.birth).slice(0, 5)}</dd>
              <dt>Bairro</dt><dd>{member.neighborhood}</dd>
              {(church?.settings?.gruposCfg?.ativo ?? true) && <><dt>{termo("grupo")}</dt><dd>{grupo ? <>{grupo.name}{grupoLider && <span style={{ color: "var(--muted)" }}> · líder {grupoLider.name.split(" ")[0]}</span>}</> : <span style={{ color: "var(--muted)" }}>sem grupo</span>}</dd></>}
              <dt>Acesso ao app</dt><dd>{member.volunteerId ? <span style={{ color: "var(--olive-soft)" }}>liberado</span> : temTelefone ? <span style={{ color: "var(--amber)" }}>convite ainda não aceito</span> : <span style={{ color: "var(--amber)" }}>falta o telefone</span>}</dd>
            </dl>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Botao compacto onClick={() => setEditingMember(true)}>Editar dados</Botao>
              {temTelefone && (
                <Botao variante="principal" compacto desativado={sendingAccess} onClick={() => sendMemberAccessWhatsapp(member)}>
                  <Icon name="whatsapp" size={14} />
                  {sendingAccess ? "Preparando…" : member.volunteerId ? "Reenviar acesso pelo WhatsApp" : "Enviar acesso pelo WhatsApp"}
                </Botao>
              )}
            </div>
            {temTelefone && (
              <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
                Ao clicar, o app gera um convite só de {member.name.split(" ")[0]}, válido por 7 dias,
                onde a pessoa informa o e-mail, cria a senha e coloca o CEP. Depois, abre o WhatsApp no
                seu celular já com a mensagem de boas-vindas e o link, prontos pra você conferir e
                mandar. Nada é enviado sozinho: você sempre aperta enviar por último.
              </div>
            )}
          </DrawerSection>
          {(currentRole === "master" || currentRole === "pastor") && linkedPerson && (
            <DrawerSection title="Acesso ao painel">
              <AcessosCard people={people} church={church} currentRole={currentRole} onlyPersonId={linkedPerson.id} />
            </DrawerSection>
          )}
          {familiares.length > 0 && (
            <DrawerSection title={`Família · ${familiares.length}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {familiares.map((f) => (
                  <Acao className="cand" style={{ width: "100%", textAlign: "left" }} key={f.id} onClick={() => setDrawer({ kind: "member", id: f.id })}>
                    <Av name={f.name} size="sm" />
                    <div className="cand-main"><div className="cand-name">{f.name}</div></div>
                  </Acao>
                ))}
              </div>
            </DrawerSection>
          )}
          <DrawerSection title="Serve e cargo">
            {linkedMinistries.length > 0 ? (
              <div className="ov-serve">
                {linkedMinistries.map((m) => {
                  const link = m.people.find((p) => p.personId === member.volunteerId);
                  return (
                    <Acao className="ov-serve-row" key={m.id} onClick={() => setDrawer({ kind: "ministry", id: m.id })}>
                      <span className="ov-serve-ic"><TeamMark ministry={m} size={14} /></span>
                      <span className="ov-serve-name">{m.name}</span>
                      {link?.isLeader ? <span className="lider-tag">Líder</span> : <span className="ov-serve-fn">{link?.functions.join(" · ") || ct("{Voluntario}")}</span>}
                    </Acao>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Ainda não serve em nenhum time.</div>
            )}
          </DrawerSection>
          <DrawerSection title="Cursos matriculados">
            {memberEnrollments.length > 0 ? (
              <div className="mc-list">
                {memberEnrollments.map(({ id, course, done_count, status }) => {
                  const courseModuleIds = new Set(courseModules.filter((m) => m.course_id === course.id).map((m) => m.id));
                  const totalAulas = courseLessons.filter((l) => courseModuleIds.has(l.module_id)).length;
                  const pct = totalAulas ? Math.min(100, Math.round((done_count / totalAulas) * 100)) : 0;
                  return (
                    <div className="mc-row" key={id}>
                      <div className={`mc-bar tone-${course.color ?? "olive"}`} />
                      <div className="mc-main">
                        <div className="mc-head">
                          <div className="mc-name">{course.name}</div>
                          {status === "concluido" ? <Selo tom="ok">Concluído</Selo> : <span className="mc-pct">{pct}%</span>}
                        </div>
                        <div className="mc-meta">{course.level || course.kind || "curso"} · {done_count} de {plural(totalAulas, "aula")}</div>
                        <div className="bar" style={{ marginTop: 8 }}><div className={`bar-fill ${status === "concluido" ? "" : "amber"}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum curso matriculado ainda.</div>
            )}
          </DrawerSection>
          <DrawerSection title="História"><PersonTimeline member={member} events={timelineEvents.filter((e) => e.member_id === member.id)} compact /></DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditingJourney(true)}>{ct("Atualizar {caminhada}")}</Botao>
            <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => onStartChatWithMember(member.id)}>Enviar mensagem</Botao>
            {linkedPerson && (
              <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => setDrawer({ kind: "person", id: linkedPerson.id })}>{ct("Ver como {voluntario}")}</Botao>
            )}
          </div>
        </div>
      </DrawerShell>
      {editingMember && (
        <MemberEditModal
          member={member}
          fellowshipGroups={fellowshipGroups}
          church={church}
          onClose={() => setEditingMember(false)}
          onRefresh={() => router.refresh()}
        />
      )}
      {editingJourney && (
        <JornadaEditModal
          member={member}
          events={timelineEvents.filter((e) => e.member_id === member.id)}
          church={church}
          onClose={() => setEditingJourney(false)}
          onRefresh={() => router.refresh()}
        />
      )}
      </>
    );
  }

  if (drawer.kind === "ministry") {
    const ministry = ministries.find((item) => item.id === drawer.id);
    if (!ministry) return null;
    const leader = ministry.people.find((link) => link.isLeader);
    const isOpen = recebimentoAberto(ministry);
    const profile = ministry.profile as { comoTrabalhamos?: string; chegada?: string; responsabilidades?: string[] };
    const requisitosTime = requirementsFor(access.requirements, "ministry", ministry.id);
    const matchesPosition = (link: MinistryView["people"][number], positionName: string) =>
      link.functions.some((f) => f.toLowerCase() === positionName.toLowerCase());
    const porFuncao = ministry.positions.map((position) => ({
      position,
      pessoas: ministry.people.filter((link) => matchesPosition(link, position.name)),
    }));
    const semFuncao = ministry.people.filter((link) => !ministry.positions.some((p) => matchesPosition(link, p.name)));
    return (
      <>
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={() => setDrawer(null)}>✕</BotaoIcone>
          <div className="profile-top">
            <div className="team-mark" style={{ width: 56, height: 56 }}><TeamMark ministry={ministry} size={26} /></div>
            <div>
              <div className="profile-name">{ministry.name}</div>
              <div className="profile-role">{leader?.personName ? <>Líder: <span style={{ color: "var(--olive)" }}>{leader.personName}</span></> : <span className="sem-lider">Sem líder · Definir</span>} · {plural(ministry.people.length, ct("{voluntario}"))}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <span className={`topen ${isOpen ? "yes" : "no"}`}>{isOpen ? ct("Recebendo {voluntarios}") : "Pedidos pelo app fechados"}</span>
          </div>
        </div>
        <div className="drawer-body">
          {(ministry.description || profile.comoTrabalhamos || profile.chegada || (profile.responsabilidades?.length ?? 0) > 0 || requisitosTime.length > 0) && (
            <div style={{ marginTop: 4, marginBottom: 22 }}>
              <div className="dsec-title" style={{ marginBottom: 10 }}>Sobre o time</div>
              <div className="tinfo">
                {ministry.description && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="identidade" size={13} /> Propósito</div>
                    <div className="tinfo-x">{ministry.description}</div>
                  </div>
                )}
                {profile.comoTrabalhamos && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="times" size={13} /> Como trabalhamos</div>
                    <div className="tinfo-x">{profile.comoTrabalhamos}</div>
                  </div>
                )}
                {profile.chegada && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="agenda" size={13} /> Horário de chegada</div>
                    <div className="tinfo-x">{profile.chegada}</div>
                  </div>
                )}
                {(profile.responsabilidades?.length ?? 0) > 0 && (
                  <div className="tinfo-block">
                    <div className="tinfo-label">→ O que esperamos</div>
                    {profile.responsabilidades!.map((r, i) => <div className="tinfo-li" key={i}>{r}</div>)}
                  </div>
                )}
                {requisitosTime.length > 0 && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="cursos" size={13} /> Pré-requisitos</div>
                    {requisitosTime.map((r) => (
                      <div className="tinfo-li" key={`${r.kind}-${r.ref}`}>{ct(requirementLabel(r, access))}</div>
                    ))}
                  </div>
                )}
              </div>
              <Botao compacto style={{ marginTop: 12 }} onClick={() => setEditingMinistry(true)}>Editar</Botao>
            </div>
          )}
          {!ministry.description && !profile.comoTrabalhamos && !profile.chegada && !(profile.responsabilidades?.length) && !requisitosTime.length && (
            <Botao compacto style={{ marginBottom: 22 }} onClick={() => setEditingMinistry(true)}>+ Sobre o time</Botao>
          )}
          <DrawerSection title="Funções e quem cobre">
            {porFuncao.map(({ position, pessoas }) => (
              <div key={position.id} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="esc-fn">{position.name}</div>
                  <span className="panel-meta">{position.need_count} {position.need_count === 1 ? "vaga" : "vagas"}</span>
                </div>
                {pessoas.length === 0 && <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>Ninguém habilitado ainda.</div>}
                {pessoas.map((link) => (
                  <Acao className="cand" key={`${position.id}-${link.personId}`} onClick={() => setDrawer({ kind: "person", id: link.personId })}>
                    <Av name={link.personName} photoUrl={people.find((pp) => pp.id === link.personId)?.photoUrl} />
                    <div className="cand-main">
                      <div className="cand-name">{link.personName}</div>
                      <div className="cand-meta">{link.isLeader ? "Líder do time" : link.functions.join(" · ") || ct("{Voluntario}")}</div>
                    </div>
                    {link.isLeader && <span className="lider-tag">Líder</span>}
                  </Acao>
                ))}
              </div>
            ))}
            {semFuncao.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="esc-fn">Sem função definida</div>
                </div>
                {semFuncao.map((link) => (
                  <Acao className="cand" key={`semfuncao-${link.personId}`} onClick={() => setDrawer({ kind: "person", id: link.personId })}>
                    <Av name={link.personName} photoUrl={people.find((pp) => pp.id === link.personId)?.photoUrl} />
                    <div className="cand-main">
                      <div className="cand-name">{link.personName}</div>
                      <div className="cand-meta">{link.isLeader ? "Líder do time" : ct("{Voluntario}")}</div>
                    </div>
                    {link.isLeader && <span className="lider-tag">Líder</span>}
                  </Acao>
                ))}
              </div>
            )}
            {ministry.people.length === 0 && <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>Ninguém neste time ainda.</div>}
          </DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setDrawer(null); setRoute("escalas"); }}>Ver escala</Botao>
            <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => setAddingPerson(true)}>Adicionar pessoa</Botao>
          </div>
        </div>
      </DrawerShell>
      {editingMinistry && (
        <MinisterioEditModal
          ministry={ministry}
          courses={courses}
          onClose={() => setEditingMinistry(false)}
          onRefresh={() => router.refresh()}
        />
      )}
      {addingPerson && church && (
        <AddToMinistryModal
          ministry={ministry}
          people={people}
          members={members}
          church={{ id: church.id, organizationId: church.organizationId }}
          onClose={() => setAddingPerson(false)}
        />
      )}
      </>
    );
  }

  if (drawer.kind === "visitor") {
    const visitor = visitors.find((v) => v.id === drawer.id);
    if (!visitor) return null;
    return (
      <VisitanteDrawer
        visitor={visitor}
        notes={visitorNotes}
        church={church}
        people={people}
        onClose={() => setDrawer(null)}
        onOpenMember={(id) => setDrawer({ kind: "member", id })}
        setModal={setModal}
      />
    );
  }

  if (drawer.kind === "decision") {
    const decision = decisions.find((d) => d.id === drawer.id);
    if (!decision) return null;
    return (
      <DecisaoDrawer
        decision={decision}
        people={people}
        members={members}
        church={church}
        timelineEvents={timelineEvents}
        onClose={() => setDrawer(null)}
        onOpenMember={(id) => setDrawer({ kind: "member", id })}
      />
    );
  }

  if (drawer.kind === "baptismClass") {
    const classData = baptismClasses.find((c) => c.id === drawer.id);
    if (!classData) return null;
    return (
      <BatismoDrawer
        classData={classData}
        candidates={baptismCandidates}
        members={members}
        decisions={decisions}
        church={church}
        onClose={() => setDrawer(null)}
        onOpenMember={(id) => setDrawer({ kind: "member", id })}
        onRefresh={() => setDrawer(null)}
      />
    );
  }

  if (drawer.kind === "meeting") {
    const meeting = meetings.find((m) => m.id === drawer.id);
    if (!meeting) return null;
    const mActions = meetingActions.filter((a) => a.meeting_id === meeting.id);
    return <ReuniaoDrawer meeting={meeting} actions={mActions} ministries={ministries} people={people} boards={boards} cards={cards} church={church} onClose={() => setDrawer(null)} setRoute={setRoute} />;
  }

  if (drawer.kind === "rehearsal") {
    const rehearsal = rehearsals.find((r) => r.id === drawer.id);
    if (!rehearsal) return null;
    return <EnsaioDrawer rehearsal={rehearsal} ministries={ministries} people={people} onClose={() => setDrawer(null)} />;
  }

  const event = events.find((item) => item.id === drawer.id);
  if (!event) return null;
  return (
    <EventDrawer
      event={event}
      ministries={ministries}
      people={people}
      roster={roster}
      rsvps={eventRsvps.filter((r) => r.event_id === event.id)}
      cobertura={coberturaPorTime(event, roster, ministries, scopeMinistryIds)}
      onAbrirVagas={onAbrirVagas ? (timeId) => onAbrirVagas(event.id, timeId) : undefined}
      onClose={() => setDrawer(null)}
      setDrawer={setDrawer}
      setRoute={setRoute}
      setShareEventId={setShareEventId}
    />
  );
}
