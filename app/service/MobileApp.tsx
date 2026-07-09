"use client";

import { useEffect, useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";
import { Icon } from "./lib/icons";
import { formatDateBR } from "./lib/date";
import { suggestKidsClassId } from "./lib/kids";

// ── tipos (subconjunto dos tipos de ServiceExactApp) ──────────────────────────

type P = {
  id: string;
  name: string;
  availability: Record<string, boolean>;
  tags: string[];
  status: string;
  photoUrl?: string | null;
};
type M = {
  id: string;
  name: string;
  phone: string;
  email: string;
  situation: string;
  firstContact: string;
  neighborhood: string | null;
  birth: string | null;
  journey: number[];
  volunteerId: string | null;
};
type Ministry = {
  id: string;
  name: string;
  icon: string;
  people: Array<{ personId: string; isLeader: boolean; functions: string[] }>;
};
type JourneyStep = "decisao" | "batismo" | "curso" | "integracao" | "time";
type JourneyRequest = {
  id: string;
  memberId: string;
  step: JourneyStep;
  eventDate: string | null;
  note: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
};
type Ev = { id: string; name: string; weekday: string; eventDate: string; time: string };
type Slot = { id: string; event_id: string; position_id: string; person_id: string; status: "ok" | "wait" | "no" };
type Card = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignees: string[];
  due: string | null;
  priority: string | null;
  moved_days_ago: number | null;
};
type Board = { id: string; name: string; columns: Array<{ id: string; nome?: string; name?: string }> };
type Course = { id: string; name: string; kind: string | null; level: string | null; description: string | null };
type Enrollment = { id: string; course_id: string; member_id: string; done_count: number; status: string };
type CourseModule = { id: string; course_id: string; name: string; sort_order: number };
type CourseLesson = { id: string; module_id: string; name: string };
type Visitor = { id: string; name: string; phone: string | null; stage: string; origin: string | null };
type BaptismClass = {
  id: string;
  label: string;
  baptism_date: string | null;
  location: string | null;
  status: string | null;
  pastor: string | null;
  open_enrollment: boolean;
};
type Announcement = {
  id: string;
  title: string;
  body: string | null;
  when_label: string | null;
  audience: string | null;
};
type Chat = { id: string; kind: string; ministry_id: string | null; name: string | null };
type ChatMember = { chat_id: string; member_id: string };
type Message = { id: string; chat_id: string; sender_id: string | null; body: string; created_at: string };
type KidsClass = { id: string; church_id: string; name: string; min_age_months: number | null; max_age_months: number | null };
type Child = {
  id: string;
  church_id: string;
  class_id: string | null;
  name: string;
  birth: string | null;
  allergies: string | null;
  photo_url?: string | null;
  gender?: "menino" | "menina" | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  image_authorized?: boolean;
  dietary_restrictions?: string | null;
  health_insurance?: string | null;
  medication?: string | null;
};
type ChildGuardian = { id: string; child_id: string; guardian_person_id: string; relationship: string | null; can_pickup: boolean };
type KidsSession = { id: string; event_id: string; class_id: string; checkin_active: boolean };
type KidsAttendance = {
  id: string;
  session_id: string;
  child_id: string;
  status: "presente" | "retirada_pendente" | "retirado";
  dropped_off_at: string;
  dropped_off_via: "qr" | "manual";
};
type KidsEvent = { id: string; church_id: string; title: string; description: string | null; event_date: string | null; time: string | null; location: string | null; capacity: number | null; open_enrollment: boolean };
type KidsEventEnrollment = { id: string; kids_event_id: string; child_id: string; enrolled_by: string | null };
type WallPost = { id: string; author: string | null; audience: string | null; body: string; pinned: boolean; created_at: string };

export type MobileOverlayProps = {
  people: P[];
  members: M[];
  ministries: Ministry[];
  events: Ev[];
  roster: Slot[];
  cards: Card[];
  boards: Board[];
  courses: Course[];
  enrollments: Enrollment[];
  courseModules?: CourseModule[];
  courseLessons?: CourseLesson[];
  visitors: Visitor[];
  baptismClasses: BaptismClass[];
  announcements: Announcement[];
  chats: Chat[];
  chatMembers: ChatMember[];
  messages: Message[];
  kidsClasses?: KidsClass[];
  kidsChildren?: Child[];
  childGuardians?: ChildGuardian[];
  kidsSessions?: KidsSession[];
  kidsAttendance?: KidsAttendance[];
  kidsEvents?: KidsEvent[];
  kidsEventEnrollments?: KidsEventEnrollment[];
  wallPosts?: WallPost[];
  onReadAnnouncement?: (personId: string, announcementId: string) => void;
  onCompleteOnboarding?: (personId: string, memberId: string | null, data: { email: string; nasc: string; bairro: string; senha: string }) => void;
  onAddCardComment?: (cardId: string, author: string, body: string) => void;
  onAdvanceVisitorStage?: (visitorId: string, nextStageId: string) => void;
  onRegisterVisitor?: (data: { name: string; phone: string; origin: string }) => void;
  onSendMessage?: (chatId: string, senderId: string, body: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  organizationId?: string;
  churchName?: string;
  churchLogoUrl?: string | null;
  theme?: "dark" | "light";
  setTheme?: (t: "dark" | "light") => void;
  onChangePassword?: (senha: string) => Promise<{ error?: string }>;
  onUpdateProfile?: (personId: string, memberId: string | null, data: { phone: string; nasc: string; bairro: string }) => void;
  journeyRequests?: JourneyRequest[];
  onRequestJourneyStep?: (memberId: string, step: JourneyStep, eventDate: string, note: string) => void;
  onConfirmarEscala?: (assignmentId: string) => void;
  onRecusarEscala?: (assignmentId: string) => void;
  onClose: () => void;
};

// ── constantes ────────────────────────────────────────────────────────────────

const JORNADA = ["Decisao", "Batismo", "Fundamentos", "GC", "Servindo"];
const JORNADA_STEPS: JourneyStep[] = ["decisao", "batismo", "curso", "integracao", "time"];
const AVAIL_LABELS: Record<string, string> = { dom_m: "Domingo manha", dom_n: "Domingo noite", qua: "Quarta" };
const ETAPAS = [
  { id: "novo", nome: "Novo" },
  { id: "contato", nome: "Contato" },
  { id: "integrando", nome: "Integrando" },
  { id: "membro", nome: "Membro" },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function ini(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Av({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" | "lg" | "xl" }) {
  return <div className={`av av-${size}`}>{ini(name)}</div>;
}

function ChipSt({ status, label }: { status: "ok" | "wait" | "no"; label?: string }) {
  const cls = status === "ok" ? "chip-ok" : status === "wait" ? "chip-wait" : "chip-no";
  return <span className={`chip ${cls}`}>{label ?? status}</span>;
}

function TabIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <Icon name={name} size={size} />;
}

function isRecepPerson(person: P, ministries: Ministry[]) {
  return ministries.some((m) => /recep/i.test(m.name) && m.people.some((mp) => mp.personId === person.id));
}

function isKidsPerson(person: P, ministries: Ministry[]) {
  return ministries.some((m) => /kids|infantil/i.test(m.name) && m.people.some((mp) => mp.personId === person.id));
}

// ── aba: Inicio ───────────────────────────────────────────────────────────────

function TabInicio({
  person, member, ministries, events, roster, cards, setTab,
}: {
  person: P; member: M | null;
  ministries: Ministry[]; events: Ev[]; roster: Slot[]; cards: Card[];
  setTab: (t: string) => void;
}) {
  const mySlots = roster.filter((r) => r.person_id === person.id);
  const pending = mySlots.filter((r) => r.status === "wait");
  const myCards = cards.filter((c) => c.assignees.includes(person.id) && c.column_id !== "done");
  const lateTasks = myCards.filter((c) => c.moved_days_ago !== null && c.moved_days_ago > 7);

  const journey = member?.journey ?? [];
  const done = journey.filter(Boolean).length;
  const nextStep = JORNADA.find((_, i) => !journey[i]) ?? "Completo";

  const proxSlot = mySlots[0];
  const proxEvent = proxSlot ? events.find((e) => e.id === proxSlot.event_id) : null;
  const proxMin = proxSlot
    ? ministries.find((m) => m.people.some((mp) => mp.personId === person.id))
    : null;

  const isRecep = isRecepPerson(person, ministries);

  return (
    <>
      {pending.length > 0 && (
        <div className="m-alert" onClick={() => setTab("escalas")} style={{ cursor: "pointer" }}>
          <span className="m-alert-ic"><Icon name="alerta" size={15} /></span>
          <div>
            <b>{pending.length} escala(s) pra confirmar</b>
            <small>Toque para responder</small>
          </div>
          <span className="m-alert-go">→</span>
        </div>
      )}
      {myCards.length > 0 && (
        <div
          className="m-alert"
          style={
            lateTasks.length
              ? undefined
              : { borderColor: "var(--olive-line)", background: "var(--olive-dim)", cursor: "pointer" }
          }
          onClick={() => setTab("tarefas")}
        >
          <span
            className="m-alert-ic"
            style={lateTasks.length ? undefined : { background: "var(--olive)", color: "var(--ink)" }}
          >
            <Icon name={lateTasks.length ? "alerta" : "ok"} size={15} />
          </span>
          <div>
            <b>{myCards.length} tarefa(s) com voce</b>
            <small>{lateTasks.length ? `${lateTasks.length} atrasada(s)` : "no seu quadro"}</small>
          </div>
          <span className="m-alert-go">→</span>
        </div>
      )}

      {member && (
        <>
          <div className="m-section-t">Sua caminhada</div>
          <div className="m-journey">
            <div className="m-journey-top">
              <div>
                <div className="m-journey-step">{done}/5 etapas</div>
                <div className="m-journey-next">
                  Proximo: <em>{nextStep}</em>
                </div>
              </div>
              <div
                className="m-ring"
                style={{ "--p": `${Math.round((done / 5) * 100)}%` } as React.CSSProperties}
              >
                <span>{Math.round((done / 5) * 100)}%</span>
              </div>
            </div>
            <div className="m-journey-pips">
              {JORNADA.map((s, i) => (
                <div className={`m-jp ${journey[i] ? "on" : ""}`} key={i}>
                  <span>{journey[i] ? "✓" : i + 1}</span>
                  <small>{s}</small>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {proxEvent && (
        <>
          <div className="m-section-t">Sua proxima escala</div>
          <div className="m-card" onClick={() => setTab("escalas")} style={{ cursor: "pointer" }}>
            <div className="m-card-top">
              <span className="m-when">
                {proxEvent.weekday} · {formatDateBR(proxEvent.eventDate)} · {proxEvent.time}
              </span>
              <ChipSt status={proxSlot!.status} label={proxSlot!.status === "wait" ? "Responder" : undefined} />
            </div>
            <div className="m-culto">{proxEvent.name}</div>
            {proxMin && <div className="m-fn">{proxMin.name}</div>}
          </div>
        </>
      )}

      <div className="m-section-t">Atalhos</div>
      <div className="m-quick">
        <button className="m-quick-b" onClick={() => setTab("tarefas")}>
          <span style={{ color: "var(--olive)" }}><Icon name="tarefas" size={15} /></span>Minhas tarefas
        </button>
        <button className="m-quick-b" onClick={() => setTab("conversas")}>
          <span style={{ color: "var(--olive)" }}><Icon name="conversas" size={15} /></span>Conversas
        </button>
        <button className="m-quick-b" onClick={() => setTab("cursos")}>
          <span style={{ color: "var(--olive)" }}><Icon name="cursos" size={15} /></span>Meus cursos
        </button>
        {isRecep ? (
          <button className="m-quick-b" onClick={() => setTab("visitantes")}>
            <span style={{ color: "var(--olive)" }}><Icon name="visitante" size={15} /></span>Visitantes
          </button>
        ) : (
          <button className="m-quick-b" onClick={() => setTab("avisos")}>
            <span style={{ color: "var(--olive)" }}><Icon name="oracao" size={15} /></span>Pedir oracao
          </button>
        )}
      </div>
    </>
  );
}

// ── aba: Escala ───────────────────────────────────────────────────────────────

function TabEscala({ person, events, roster, onConfirmarEscala, onRecusarEscala }: { person: P; events: Ev[]; roster: Slot[]; onConfirmarEscala?: (assignmentId: string) => void; onRecusarEscala?: (assignmentId: string) => void }) {
  const mySlots = roster.filter((r) => r.person_id === person.id);
  const [stMap, setStMap] = useState<Record<string, "ok" | "wait" | "no">>(
    () => Object.fromEntries(mySlots.map((r) => [r.id, r.status])),
  );
  const [swapId, setSwapId] = useState<string | null>(null);
  const [avail, setAvail] = useState<Record<string, boolean>>({ ...(person.availability ?? {}) });
  const setSt = (id: string, v: "ok" | "wait" | "no") => {
    setStMap((p) => ({ ...p, [id]: v }));
    if (v === "ok") onConfirmarEscala?.(id);
    else if (v === "no") onRecusarEscala?.(id);
  };

  return (
    <>
      <div className="m-section-t">Suas proximas escalas · {mySlots.length}</div>
      {mySlots.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhuma escala agendada para voce.</div>
        </div>
      )}
      {mySlots.map((slot) => {
        const ev = events.find((e) => e.id === slot.event_id);
        if (!ev) return null;
        const st = stMap[slot.id] ?? slot.status;
        return (
          <div className={`m-card ${st === "wait" ? "urgent" : ""}`} key={slot.id}>
            <div className="m-card-top">
              <span className="m-when">
                {ev.weekday} · {formatDateBR(ev.eventDate)} · {ev.time}
              </span>
              {st === "ok" && <ChipSt status="ok" />}
              {st === "no" && <ChipSt status="no" />}
              {st === "wait" && <ChipSt status="wait" label="Responder" />}
            </div>
            <div className="m-culto">{ev.name}</div>
            {st === "ok" ? (
              <div className="m-confirmed">
                ✓ Voce confirmou
                <button
                  className="m-btn m-btn-swap"
                  style={{ marginLeft: "auto", padding: "6px 12px" }}
                  onClick={() => setSwapId(slot.id)}
                >
                  Pedir troca
                </button>
              </div>
            ) : st === "no" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger)", padding: "8px 0" }}>
                Voce recusou
                <button
                  className="m-btn m-btn-ok ghost"
                  style={{ marginLeft: "auto", padding: "6px 14px" }}
                  onClick={() => setSt(slot.id, "ok")}
                >
                  Mudei de ideia
                </button>
              </div>
            ) : (
              <div className="m-actions three">
                <button className="m-btn m-btn-ok" onClick={() => setSt(slot.id, "ok")}>Confirmar</button>
                <button className="m-btn m-btn-swap" onClick={() => setSwapId(slot.id)}>Trocar</button>
                <button className="m-btn m-btn-no" onClick={() => setSt(slot.id, "no")}>Recusar</button>
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(avail).length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Em quais cultos voce pode servir</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(avail).map(([key, on]) => (
              <div className="m-avail" key={key}>
                <div className="m-avail-day">{AVAIL_LABELS[key] ?? key}</div>
                <button
                  className={`m-toggle ${on ? "on" : ""}`}
                  onClick={() => setAvail((p) => ({ ...p, [key]: !p[key] }))}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {swapId && (
        <div
          className="modal-bg"
          style={{ position: "absolute", borderRadius: 36 }}
          onClick={() => setSwapId(null)}
        >
          <div className="m-card" style={{ width: "86%", margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="m-when" style={{ marginBottom: 10 }}>Pedir troca</div>
            <div style={{ fontSize: 14, color: "var(--light)", lineHeight: 1.55, marginBottom: 16 }}>
              Vamos avisar o seu lider para aprovar a troca de posicao.
            </div>
            <button
              className="m-btn m-btn-ok"
              style={{ width: "100%", marginBottom: 8 }}
              onClick={() => setSwapId(null)}
            >
              Enviar pedido →
            </button>
            <button className="m-btn m-btn-swap" style={{ width: "100%" }} onClick={() => setSwapId(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── aba: Tarefas ──────────────────────────────────────────────────────────────

function TabTarefas({ person, cards, boards, onAddCardComment }: { person: P; cards: Card[]; boards: Board[]; onAddCardComment?: (cardId: string, author: string, body: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [savedComments, setSavedComments] = useState<Record<string, { author: string; body: string }[]>>({});
  const [localCards, setLocalCards] = useState<Card[]>(cards);

  useEffect(() => { setLocalCards(cards); }, [cards]);

  const myCards = localCards.filter((c) => c.assignees.includes(person.id));
  const pending = myCards.filter((c) => c.column_id !== "done");
  const done = myCards.filter((c) => c.column_id === "done");

  const loadComments = (cardId: string) => {
    createServiceBrowserClient()
      .schema("service")
      .from("card_comments")
      .select("author,body")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setSavedComments((p) => ({ ...p, [cardId]: data as { author: string; body: string }[] })); });
  };

  const toggleOpen = (cardId: string) => {
    const next = open === cardId ? null : cardId;
    setOpen(next);
    if (next) loadComments(next);
  };

  const moveCard = (cardId: string, colId: string) => {
    setLocalCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, column_id: colId } : c)));
    createServiceBrowserClient().schema("service").from("cards").update({ column_id: colId }).eq("id", cardId);
  };

  const addComment = (cardId: string) => {
    const t = commentTexts[cardId]?.trim();
    if (!t) return;
    setCommentTexts((p) => ({ ...p, [cardId]: "" }));
    const author = person.name.split(" ")[0];
    setSavedComments((p) => ({ ...p, [cardId]: [...(p[cardId] ?? []), { author, body: t }] }));
    onAddCardComment?.(cardId, author, t);
  };

  const cardEl = (c: Card) => {
    const board = boards.find((b) => b.id === c.board_id);
    const isOpen = open === c.id;
    const isLate = c.moved_days_ago !== null && c.moved_days_ago > 7;
    return (
      <div className={`m-task ${isLate ? "late" : ""}`} key={c.id}>
        <button className="m-task-head" onClick={() => toggleOpen(c.id)}>
          <span className={`prio-dot prio-${c.priority ?? "media"}`} />
          <div className="m-task-main">
            <div className="m-task-title">{c.title}</div>
            <div className="m-task-meta">{board?.name ?? "Quadro"}</div>
          </div>
          <span className="m-task-caret">{isOpen ? "▴" : "▾"}</span>
        </button>
        {isOpen && (
          <div className="m-task-body">
            {c.description && <div className="m-task-desc">{c.description}</div>}
            {board && (
              <div className="m-task-cols">
                {board.columns.map((col) => (
                  <button key={col.id} type="button" className={`seg-chip ${c.column_id === col.id ? "on" : ""}`} onClick={() => moveCard(c.id, col.id)}>
                    {col.nome ?? col.name ?? col.id}
                  </button>
                ))}
              </div>
            )}
            <div className="m-task-comments">
              {(savedComments[c.id] ?? []).map((cm, i) => (
                <div className="m-task-cm" key={i}>
                  <b>{cm.author}</b>
                  <div>{cm.body}</div>
                </div>
              ))}
              <div className="m-task-cm-add">
                <input
                  className="input"
                  placeholder="Comentar..."
                  value={commentTexts[c.id] ?? ""}
                  onChange={(e) => setCommentTexts((p) => ({ ...p, [c.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addComment(c.id)}
                />
                <button
                  className="m-btn m-btn-ok"
                  style={{ padding: "8px 14px" }}
                  onClick={() => addComment(c.id)}
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="m-section-t">Tarefas com voce · {pending.length} aberta(s)</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        O que a lideranca deixou no quadro para voce. Atualize e comente.
      </div>
      {pending.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nada pendente com voce agora.</div>
        </div>
      )}
      {pending.map(cardEl)}
      {done.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Concluidas · {done.length}</div>
          {done.map(cardEl)}
        </>
      )}
    </>
  );
}

// ── aba: Conversas ────────────────────────────────────────────────────────────

function TabConversas({
  member, chats, chatMembers, messages, members, ministries, onSendMessage, onStartChat,
}: {
  member: M | null;
  chats: Chat[];
  chatMembers: ChatMember[];
  messages: Message[];
  members: M[];
  ministries: Ministry[];
  onSendMessage?: (chatId: string, senderId: string, body: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [novo, setNovo] = useState(false);
  const [novoMsg, setNovoMsg] = useState("");
  const [starting, setStarting] = useState(false);

  const myChats = member
    ? chats.filter((c) =>
        chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === member.id),
      )
    : [];

  const chat = myChats.find((c) => c.id === selId);

  const souLider = member
    ? ministries.some((min) => min.people.some((p) => p.personId === member.volunteerId && p.isLeader))
    : false;

  const candidatos = member
    ? (souLider
        ? members.filter((m) => m.id !== member.id)
        : (() => {
            const liderIds = new Set<string>();
            ministries.forEach((min) => {
              const lider = min.people.find((p) => p.isLeader);
              const liderMember = lider ? members.find((m) => m.volunteerId === lider.personId) : undefined;
              if (liderMember && liderMember.id !== member.id) liderIds.add(liderMember.id);
            });
            return members.filter((m) => liderIds.has(m.id));
          })())
    : [];

  const nomeTimeDoLider = (targetId: string) => {
    const min = ministries.find((m) => {
      const lider = m.people.find((p) => p.isLeader);
      const liderMember = lider ? members.find((mm) => mm.volunteerId === lider.personId) : undefined;
      return liderMember?.id === targetId;
    });
    return min ? `Líder · ${min.name}` : "";
  };

  const enviar = () => {
    if (!texto.trim() || !chat || !member) return;
    onSendMessage?.(chat.id, member.id, texto.trim());
    setTexto("");
  };

  const abrir = async (targetMemberId: string) => {
    if (!member || starting) return;
    setStarting(true);
    const id = await onStartChat?.(member.id, targetMemberId, novoMsg);
    setStarting(false);
    setNovo(false);
    setNovoMsg("");
    if (id) setSelId(id);
  };

  if (chat) {
    const chatMsgs = messages.filter((m) => m.chat_id === chat.id);
    return (
      <div className="m-chat">
        <button className="m-chat-back" onClick={() => setSelId(null)}>
          ← {chat.name ?? "Conversa"}
        </button>
        <div className="chat-thread">
          <div className="chat-msgs" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
            {chatMsgs.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhuma mensagem ainda.</div>
            )}
            {chatMsgs.map((msg) => {
              const sender = members.find((m) => m.id === msg.sender_id);
              const isMine = member && msg.sender_id === member.id;
              return (
                <div key={msg.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  {!isMine && sender && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        marginBottom: 3,
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {sender.name.split(" ")[0]}
                    </div>
                  )}
                  <div
                    className="chat-bubble"
                    style={isMine ? { background: "var(--olive-dim)", borderColor: "var(--olive-line)" } : undefined}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chat-compose">
            <input
              className="input"
              placeholder="Escreva uma mensagem..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
            />
            <button className="btn btn-pri btn-sm" type="button" disabled={!texto.trim()} onClick={enviar}>Enviar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="m-section-row">
        <div className="m-section-t" style={{ margin: 0 }}>Conversas</div>
        <button className="m-mini-btn" onClick={() => setNovo((n) => !n)}>{novo ? "Fechar" : "+ Nova"}</button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        {souLider ? "Fale com qualquer pessoa do time." : "Fale com o seu lider ou com um pastor."}
      </div>

      {novo && (
        <div className="m-card" style={{ marginBottom: 14 }}>
          <div className="m-section-t" style={{ marginTop: 0 }}>Começar conversa com</div>
          <input
            className="input"
            placeholder="Primeira mensagem (opcional)"
            value={novoMsg}
            onChange={(e) => setNovoMsg(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {candidatos.map((m) => (
            <button className="m-conv" key={m.id} onClick={() => abrir(m.id)} disabled={starting}>
              <span className="m-conv-ic">→</span>
              <div className="m-conv-main">
                <div className="m-conv-name">{m.name}</div>
                <div className="m-conv-prev">{nomeTimeDoLider(m.id)}</div>
              </div>
            </button>
          ))}
          {candidatos.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhum lider disponivel ainda.</div>
          )}
        </div>
      )}

      {myChats.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhuma conversa ainda.</div>
        </div>
      )}
      {myChats.map((c) => {
        const msgs = messages.filter((m) => m.chat_id === c.id);
        const last = msgs[msgs.length - 1];
        return (
          <button className="m-conv" key={c.id} onClick={() => setSelId(c.id)}>
            <span className="m-conv-ic">→</span>
            <div className="m-conv-main">
              <div className="m-conv-name">{c.name ?? "Conversa"}</div>
              <div className="m-conv-prev">
                {last ? last.body.slice(0, 48) : "Canal"}
              </div>
            </div>
            {last && (
              <span className="m-conv-when">
                {new Date(last.created_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

// ── aba: Visitantes (Recepcao) ────────────────────────────────────────────────

function TabVisitantes({ visitors, onAdvanceVisitorStage, onRegisterVisitor }: {
  visitors: Visitor[];
  onAdvanceVisitorStage?: (visitorId: string, nextStageId: string) => void;
  onRegisterVisitor?: (data: { name: string; phone: string; origin: string }) => void;
}) {
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", origin: "Primeira visita" });

  const allVisitors = visitors
    .filter((v) => v.stage !== "membro")
    .map((v) => ({ id: v.id, name: v.name, phone: v.phone ?? "", origin: v.origin ?? "", stage: v.stage }));

  const salvar = () => {
    if (!form.name.trim()) return;
    onRegisterVisitor?.({ name: form.name.trim(), phone: form.phone, origin: form.origin });
    setForm({ name: "", phone: "", origin: "Primeira visita" });
    setNovo(false);
  };

  return (
    <>
      <div className="m-section-t">Acolhida de visitantes</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        Registre quem chegou e evolua o acompanhamento direto pelo celular.
      </div>
      <button className="m-btn m-btn-ok" style={{ width: "100%", marginBottom: 16 }} onClick={() => setNovo(true)}>
        + Registrar visitante
      </button>

      {novo && (
        <div className="m-card" style={{ borderColor: "var(--olive-line)" }}>
          <div className="m-when" style={{ marginBottom: 10 }}>Novo visitante</div>
          <input
            className="input"
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            style={{ marginBottom: 8 }}
          />
          <input
            className="input"
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            style={{ marginBottom: 8 }}
          />
          <select
            className="select"
            value={form.origin}
            onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))}
            style={{ marginBottom: 12 }}
          >
            {["Primeira visita", "Convite de membro", "Instagram", "Indicacao", "Evangelismo"].map(
              (o) => <option key={o}>{o}</option>,
            )}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="m-btn m-btn-ok" style={{ flex: 1 }} onClick={salvar}>Salvar</button>
            <button className="m-btn m-btn-swap" style={{ flex: 1 }} onClick={() => setNovo(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {allVisitors.map((v) => {
        const etIdx = ETAPAS.findIndex((e) => e.id === v.stage);
        const et = ETAPAS[Math.max(0, etIdx)];
        const isOpen = aberto === v.id;
        return (
          <div className="m-card" key={v.id}>
            <button className="m-vis-head" onClick={() => setAberto(isOpen ? null : v.id)}>
              <Av name={v.name} size="sm" />
              <div className="m-vis-main">
                <div className="m-culto" style={{ fontSize: 15 }}>{v.name}</div>
                <div className="m-fn">
                  <span className="chip chip-neutral">{et.nome}</span>
                  {v.origin ? ` · ${v.origin}` : ""}
                </div>
              </div>
              <span className="m-task-caret">{isOpen ? "▴" : "▾"}</span>
            </button>
            {isOpen && (
              <div style={{ marginTop: 12 }}>
                <div className="m-vis-track">
                  {ETAPAS.map((e, i) => (
                    <div key={e.id} style={{ flex: 1, textAlign: "center" }}>
                      <div
                        style={{ height: 5, borderRadius: 3, background: i <= etIdx ? "var(--olive)" : "var(--ink)" }}
                      />
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 8.5,
                          color: i <= etIdx ? "var(--light)" : "var(--subtle)",
                          marginTop: 6,
                        }}
                      >
                        {e.nome}
                      </div>
                    </div>
                  ))}
                </div>
                {etIdx < ETAPAS.length - 1 && (
                  <button
                    className="m-btn m-btn-ok"
                    style={{ width: "100%", marginTop: 8 }}
                    onClick={() => {
                      onAdvanceVisitorStage?.(v.id, ETAPAS[etIdx + 1].id);
                      setAberto(null);
                    }}
                  >
                    Avancar para {`"${ETAPAS[etIdx + 1].nome}"`} →
                  </button>
                )}
                {etIdx === ETAPAS.length - 1 && (
                  <div className="m-confirmed" style={{ marginTop: 10 }}>✓ Pronto para virar membro</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── aba: Kids (professor) ───────────────────────────────────────────────────────

function TabKids({
  person,
  members,
  events,
  kidsClasses,
  kidsChildren,
  childGuardians,
  kidsSessions,
  kidsAttendance,
  organizationId,
  churchId,
}: {
  person: P;
  members: M[];
  events: Ev[];
  kidsClasses: KidsClass[];
  kidsChildren: Child[];
  childGuardians: ChildGuardian[];
  kidsSessions: KidsSession[];
  kidsAttendance: KidsAttendance[];
  organizationId?: string;
  churchId?: string;
}) {
  const [attendance, setAttendance] = useState(kidsAttendance);
  const [sessionId, setSessionId] = useState<string | null>(kidsSessions.find((s) => s.checkin_active)?.id ?? null);
  const [q, setQ] = useState("");
  const [novaFicha, setNovaFicha] = useState(false);
  const [form, setForm] = useState({ nome: "", nascimento: "", genero: "", respNome: "", respTel: "", respParentesco: "", emergenciaNome: "", emergenciaTel: "", autorizaImagem: false });
  const [fotoCrianca, setFotoCrianca] = useState<string | null>(null);
  const [fotoResp, setFotoResp] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState<"crianca" | "resp" | null>(null);
  const [fichaIds, setFichaIds] = useState(() => ({ childId: crypto.randomUUID(), personId: crypto.randomUUID() }));
  const sugestaoTurmaId = suggestKidsClassId(form.nascimento, kidsClasses);
  const sugestaoTurma = kidsClasses.find((kc) => kc.id === sugestaoTurmaId);

  const activeSessions = kidsSessions.filter((s) => s.checkin_active);
  const session = activeSessions.find((s) => s.id === sessionId) ?? activeSessions[0] ?? null;
  const event = session ? events.find((e) => e.id === session.event_id) : null;
  const kidsClass = session ? kidsClasses.find((c) => c.id === session.class_id) : null;
  const childById = new Map(kidsChildren.map((c) => [c.id, c]));
  const guardianOf = (childId: string) => childGuardians.filter((g) => g.child_id === childId);
  const memberByPersonId = new Map(members.filter((m) => m.volunteerId).map((m) => [m.volunteerId as string, m]));

  const sessionAttendance = session ? attendance.filter((a) => a.session_id === session.id) : [];
  const present = sessionAttendance.filter((a) => a.status === "presente");
  const pending = sessionAttendance.filter((a) => a.status === "retirada_pendente");
  const notYetIn = kidsChildren.filter(
    (c) => q && !sessionAttendance.some((a) => a.child_id === c.id && a.status !== "retirado") && c.name.toLowerCase().includes(q.toLowerCase()),
  );

  const avisarResponsavel = async (childId: string) => {
    const guardians = guardianOf(childId);
    const targetMember = guardians.map((g) => memberByPersonId.get(g.guardian_person_id)).find(Boolean);
    if (!targetMember || !organizationId) { window.alert("Nao encontrei um contato de app pra esse responsavel."); return; }
    const child = childById.get(childId);
    await fetch("/api/service/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, recipientMemberIds: [targetMember.id], title: "Aviso da sala Kids", body: `${child?.name ?? "Seu filho"} precisa de voce na sala Kids.` }),
    }).catch(() => {});
    window.alert("Aviso enviado.");
  };

  const confirmarRetirada = async (att: KidsAttendance) => {
    setAttendance((prev) => prev.map((a) => (a.id === att.id ? { ...a, status: "retirado" } : a)));
    await createServiceBrowserClient().schema("service").from("kids_attendance").update({ status: "retirado", picked_up_at: new Date().toISOString(), picked_up_via: "manual" }).eq("id", att.id);
  };

  const checkinManual = async (childId: string) => {
    if (!session || !organizationId) return;
    const { data } = await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .insert({ organization_id: organizationId, session_id: session.id, child_id: childId, dropped_off_via: "manual" })
      .select("id,session_id,child_id,status,dropped_off_at,dropped_off_via")
      .single();
    if (data) setAttendance((prev) => [...prev, data as KidsAttendance]);
    setQ("");
  };

  const [fichaError, setFichaError] = useState("");

  const enviarFotoCrianca = async (file: File) => {
    if (!organizationId) return;
    setEnviandoFoto("crianca");
    try {
      const url = await uploadServiceImage(createServiceBrowserClient(), file, `${organizationId}/kids/children/${fichaIds.childId}.${imageExtension(file)}`);
      setFotoCrianca(url);
    } catch { setFichaError("Nao consegui enviar a foto da crianca agora."); }
    setEnviandoFoto(null);
  };

  const enviarFotoResp = async (file: File) => {
    if (!organizationId) return;
    setEnviandoFoto("resp");
    try {
      const url = await uploadServiceImage(createServiceBrowserClient(), file, `${organizationId}/kids/guardians/${fichaIds.personId}.${imageExtension(file)}`);
      setFotoResp(url);
    } catch { setFichaError("Nao consegui enviar a foto do responsavel agora."); }
    setEnviandoFoto(null);
  };

  const criarFicha = async () => {
    if (!form.nome.trim() || !organizationId || !churchId) return;
    if (!fotoCrianca) { setFichaError("A foto da crianca e obrigatoria."); return; }
    if (!fotoResp) { setFichaError("A foto do responsavel e obrigatoria."); return; }
    setFichaError("");
    const supabase = createServiceBrowserClient();
    const { error: personError } = await supabase.schema("service").from("people").insert({ id: fichaIds.personId, organization_id: organizationId, church_id: churchId, name: form.respNome.trim() || "Responsavel", phone: form.respTel.trim() || null, status: "ativo", photo_url: fotoResp });
    const { error: childError } = await supabase.schema("service").from("children").insert({ id: fichaIds.childId, organization_id: organizationId, church_id: churchId, class_id: sugestaoTurmaId ?? session?.class_id ?? null, name: form.nome.trim(), birth: form.nascimento || null, photo_url: fotoCrianca, gender: form.genero || null, emergency_contact_name: form.emergenciaNome.trim() || null, emergency_contact_phone: form.emergenciaTel.trim() || null, image_authorized: form.autorizaImagem });
    if (!personError && !childError) {
      await supabase.schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: fichaIds.childId, guardian_person_id: fichaIds.personId, relationship: form.respParentesco.trim() || null, can_pickup: true });
      if (session) {
        const { data } = await supabase.schema("service").from("kids_attendance").insert({ organization_id: organizationId, session_id: session.id, child_id: fichaIds.childId, dropped_off_via: "manual" }).select("id,session_id,child_id,status,dropped_off_at,dropped_off_via").single();
        if (data) setAttendance((prev) => [...prev, data as KidsAttendance]);
      }
      if (form.respNome.trim()) {
        await supabase.schema("service").from("visitors").insert({ organization_id: organizationId, church_id: churchId, name: form.respNome.trim(), phone: form.respTel.trim() || null, stage: "novo", origin: "Kids", due: "1o contato", due_status: "soon" });
      }
      setForm({ nome: "", nascimento: "", genero: "", respNome: "", respTel: "", respParentesco: "", emergenciaNome: "", emergenciaTel: "", autorizaImagem: false });
      setFotoCrianca(null);
      setFotoResp(null);
      setFichaIds({ childId: crypto.randomUUID(), personId: crypto.randomUUID() });
      setNovaFicha(false);
    } else {
      setFichaError("Nao foi possivel salvar a ficha agora.");
    }
  };

  if (!session) {
    return (
      <>
        <div className="m-section-t">Kids</div>
        <div className="empty" style={{ marginTop: 12 }}>Nenhuma sessao Kids aberta agora. Peca pra liderança abrir o QR do culto de hoje em Cultos & Agenda.</div>
      </>
    );
  }

  return (
    <>
      <div className="m-section-t">Kids · {kidsClass?.name ?? "Turma"}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{event?.name} · {event?.weekday} {event?.eventDate ? formatDateBR(event.eventDate) : ""}</div>

      {activeSessions.length > 1 && (
        <select className="select" style={{ marginBottom: 12 }} value={session.id} onChange={(e) => setSessionId(e.target.value)}>
          {activeSessions.map((s) => <option key={s.id} value={s.id}>{kidsClasses.find((c) => c.id === s.class_id)?.name ?? "Turma"}</option>)}
        </select>
      )}

      {pending.length > 0 && (
        <>
          <div className="m-when" style={{ marginBottom: 8 }}>Retirada pendente</div>
          {pending.map((att) => {
            const child = childById.get(att.child_id);
            return (
              <div className="m-card" key={att.id} style={{ borderColor: "var(--amber-line)" }}>
                <div className="m-culto">{child?.name ?? "Crianca"}</div>
                <div className="m-fn">Compare o responsavel na porta antes de confirmar.</div>
                <button className="m-btn m-btn-ok" style={{ width: "100%", marginTop: 8 }} onClick={() => confirmarRetirada(att)}>Confirmar retirada</button>
              </div>
            );
          })}
        </>
      )}

      <div className="m-when" style={{ marginBottom: 8, marginTop: pending.length ? 14 : 0 }}>Na sala · {present.length}</div>
      {present.length === 0 && <div className="empty">Nenhuma crianca na sala ainda.</div>}
      {present.map((att) => {
        const child = childById.get(att.child_id);
        return (
          <div className="m-card" key={att.id}>
            <div className="m-vis-head">
              <Av name={child?.name ?? "?"} size="sm" />
              <div className="m-vis-main">
                <div className="m-culto" style={{ fontSize: 14 }}>{child?.name ?? "Crianca"}</div>
                <div className="m-fn">{child?.allergies ? `⚠ ${child.allergies}` : (att.dropped_off_via === "manual" ? "manual" : "QR")}</div>
              </div>
              <button className="m-btn m-btn-swap" style={{ padding: "6px 10px" }} onClick={() => avisarResponsavel(att.child_id)}>Avisar</button>
            </div>
          </div>
        );
      })}

      <input className="input" placeholder="Buscar crianca pra check-in manual..." value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 16, marginBottom: 8 }} />
      {notYetIn.slice(0, 5).map((child) => (
        <div className="m-vis-head" key={child.id} style={{ cursor: "pointer" }} onClick={() => checkinManual(child.id)}>
          <Av name={child.name} size="sm" />
          <div className="m-vis-main"><div className="m-culto" style={{ fontSize: 14 }}>{child.name}</div></div>
          <span style={{ color: "var(--olive)", fontSize: 12 }}>+ check-in</span>
        </div>
      ))}

      <button className="m-btn m-btn-swap" style={{ width: "100%", marginTop: 16 }} onClick={() => setNovaFicha((v) => !v)}>
        {novaFicha ? "Cancelar" : "+ Criar ficha na hora"}
      </button>
      {novaFicha && (
        <div className="m-card" style={{ borderColor: "var(--olive-line)", marginTop: 10 }}>
          <MiniFotoMobile label="Foto da crianca (obrigatoria)" photoUrl={fotoCrianca} busy={enviandoFoto === "crianca"} onUpload={enviarFotoCrianca} />
          <input className="input" placeholder="Nome da crianca" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} style={{ marginTop: 10, marginBottom: 8 }} />
          <input className="input" type="date" value={form.nascimento} onChange={(e) => setForm((f) => ({ ...f, nascimento: e.target.value }))} style={{ marginBottom: 8 }} />
          <select className="select" value={form.genero} onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))} style={{ marginBottom: 8 }}>
            <option value="">Genero (opcional)</option>
            <option value="menino">Menino</option>
            <option value="menina">Menina</option>
          </select>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (session ? kidsClasses.find((kc) => kc.id === session.class_id)?.name ?? "nenhuma turma cobre essa idade" : "informe o nascimento")}</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13 }}>
            <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} /> Autoriza uso de imagem
          </label>

          <MiniFotoMobile label="Foto do responsavel (obrigatoria)" photoUrl={fotoResp} busy={enviandoFoto === "resp"} onUpload={enviarFotoResp} />
          <input className="input" placeholder="Nome do responsavel" value={form.respNome} onChange={(e) => setForm((f) => ({ ...f, respNome: e.target.value }))} style={{ marginTop: 10, marginBottom: 8 }} />
          <input className="input" placeholder="Telefone do responsavel" value={form.respTel} onChange={(e) => setForm((f) => ({ ...f, respTel: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Parentesco (mae, avo...)" value={form.respParentesco} onChange={(e) => setForm((f) => ({ ...f, respParentesco: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Contato de emergencia: nome" value={form.emergenciaNome} onChange={(e) => setForm((f) => ({ ...f, emergenciaNome: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Contato de emergencia: telefone" value={form.emergenciaTel} onChange={(e) => setForm((f) => ({ ...f, emergenciaTel: e.target.value }))} style={{ marginBottom: 10 }} />
          {fichaError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>{fichaError}</div>}
          <button className="m-btn m-btn-ok" style={{ width: "100%" }} onClick={criarFicha}>Salvar e fazer check-in</button>
        </div>
      )}
    </>
  );
}

function MiniFotoMobile({ label, photoUrl, busy, onUpload }: { label: string; photoUrl: string | null; busy?: boolean; onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {photoUrl ? (
        <img src={photoUrl} alt={label} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div className="av av-sm" style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>!</div>
      )}
      <button className="m-btn m-btn-swap" type="button" disabled={busy} onClick={() => inputRef.current?.click()} style={{ flex: 1 }}>
        {busy ? "Enviando..." : label}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); e.target.value = ""; }} />
    </div>
  );
}

// ── aba: Cursos ───────────────────────────────────────────────────────────────

function TabCursos({
  member, courses, enrollments, courseModules, courseLessons, baptismClasses, setTab,
}: {
  member: M | null;
  courses: Course[];
  enrollments: Enrollment[];
  courseModules: CourseModule[];
  courseLessons: CourseLesson[];
  baptismClasses: BaptismClass[];
  setTab: (t: string) => void;
}) {
  const myEnrollments = member ? enrollments.filter((e) => e.member_id === member.id) : [];
  const enrolledIds = new Set(myEnrollments.map((e) => e.course_id));
  const toExplore = courses.filter((c) => !enrolledIds.has(c.id)).slice(0, 4);
  const openClasses = baptismClasses.filter((b) => b.status !== "concluida");

  return (
    <>
      <button className="m-card m-curso-bat" style={{ width: "100%", textAlign: "left" }} onClick={() => setTab("batismo")}>
        <div className="m-card-top">
          <span className="m-when">◆ Batismo nas aguas</span>
          {openClasses.length > 0 && (
            <span className="m-when" style={{ color: "var(--olive-soft)" }}>{openClasses.length} turma(s)</span>
          )}
        </div>
        <div className="m-culto" style={{ fontSize: 16 }}>Decidiu seguir Jesus nas aguas?</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginTop: 6 }}>
          Inscreva-se numa turma e faca o curso pre-batismo.
        </div>
        <span className="m-btn m-btn-ok ghost" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
          Ver batismos →
        </span>
      </button>

      <div className="m-section-t">Meus cursos · {myEnrollments.length}</div>
      {myEnrollments.map((en) => {
        const course = courses.find((c) => c.id === en.course_id);
        if (!course) return null;
        const courseModuleIds = new Set(courseModules.filter((m) => m.course_id === course.id).map((m) => m.id));
        const totalAulas = courseLessons.filter((l) => courseModuleIds.has(l.module_id)).length;
        const pct = totalAulas ? Math.min(100, Math.round((en.done_count / totalAulas) * 100)) : 0;
        return (
          <div className="m-card" key={en.id}>
            <div className="m-card-top">
              <span className="m-when">{course.level ?? "Curso"}</span>
              {en.status === "concluido" ? (
                <ChipSt status="ok" label="Concluido" />
              ) : (
                <span className="m-when" style={{ color: "var(--amber)" }}>{pct}%</span>
              )}
            </div>
            <div className="m-culto" style={{ fontSize: 16 }}>{course.name}</div>
            <div className="bar" style={{ marginTop: 10 }}>
              <div className={`bar-fill ${en.status === "concluido" ? "" : "amber"}`} style={{ width: `${pct}%` }} />
            </div>
            {en.status !== "concluido" && (
              <button className="m-btn m-btn-ok" style={{ width: "100%", marginTop: 12 }}>
                Continuar →
              </button>
            )}
          </div>
        );
      })}

      {toExplore.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Explorar</div>
          {toExplore.map((c) => (
            <div className="m-card" key={c.id}>
              <div className="m-when" style={{ marginBottom: 6 }}>{c.level ?? "Curso"}</div>
              <div className="m-culto" style={{ fontSize: 16 }}>{c.name}</div>
              {c.description && (
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginTop: 6 }}>
                  {c.description}
                </div>
              )}
              <button className="m-btn m-btn-ok ghost" style={{ width: "100%", marginTop: 12 }}>
                Inscrever-se
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}

// ── aba: Batismo ──────────────────────────────────────────────────────────────

function TabBatismo({ baptismClasses }: { baptismClasses: BaptismClass[] }) {
  const [inscrito, setInscrito] = useState<Record<string, boolean>>({});
  const openClasses = baptismClasses.filter((b) => b.status !== "concluida");

  return (
    <>
      <div className="m-section-t">Proximos batismos</div>
      {openClasses.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhuma turma agendada por ora.</div>
        </div>
      )}
      {openClasses.map((b) => (
        <div className="m-card" key={b.id}>
          <div className="m-card-top">
            <span className="m-when">{formatDateBR(b.baptism_date) || "A definir"}</span>
            {b.open_enrollment ? (
              <ChipSt status="ok" label="Inscricoes abertas" />
            ) : (
              <ChipSt status="wait" label="Em preparacao" />
            )}
          </div>
          <div className="m-culto" style={{ fontSize: 16 }}>{b.label}</div>
          {(b.location || b.pastor) && (
            <div className="m-fn">
              {[b.location, b.pastor].filter(Boolean).join(" · ")}
            </div>
          )}
          {b.open_enrollment ? (
            inscrito[b.id] ? (
              <div className="m-confirmed" style={{ marginTop: 12 }}>
                ✓ Inscricao enviada! O responsavel vai te chamar.
              </div>
            ) : (
              <button
                className="m-btn m-btn-ok"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => setInscrito((p) => ({ ...p, [b.id]: true }))}
              >
                Quero me inscrever →
              </button>
            )
          ) : (
            <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 12 }}>
              Inscricoes ainda nao abertas para esta turma.
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ── aba: Avisos / Oracao ──────────────────────────────────────────────────────

function TabAvisos({
  announcements,
  person,
  onReadAnnouncement,
}: {
  announcements: Announcement[];
  person: P;
  onReadAnnouncement?: (personId: string, announcementId: string) => void;
}) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [texto, setTexto] = useState("");
  const readSent = useRef(new Set<string>());

  useEffect(() => {
    if (!onReadAnnouncement) return;
    announcements.forEach((a) => {
      const key = `${person.id}:${a.id}`;
      if (readSent.current.has(key)) return;
      readSent.current.add(key);
      onReadAnnouncement(person.id, a.id);
    });
  }, [announcements, person.id, onReadAnnouncement]);

  return (
    <>
      <div className="m-section-t">Pedir oracao</div>
      <div className="m-quick" style={{ marginBottom: 18 }}>
        <button
          className={`m-quick-b ${tipo === "oracao" ? "on" : ""}`}
          onClick={() => { setTipo("oracao"); setSent(false); setTexto(""); }}
        >
          <span style={{ color: "var(--olive)" }}><Icon name="oracao" size={15} /></span>Pedir oracao
        </button>
        <button
          className={`m-quick-b ${tipo === "testemunho" ? "on" : ""}`}
          onClick={() => { setTipo("testemunho"); setSent(false); setTexto(""); }}
        >
          <span style={{ color: "var(--olive)" }}><Icon name="comunicacao" size={15} /></span>Compartilhar testemunho
        </button>
      </div>
      {tipo && !sent && (
        <div className="m-card">
          <div className="m-when" style={{ marginBottom: 8 }}>
            {tipo === "oracao" ? "Seu pedido" : "Seu testemunho"}
          </div>
          <textarea
            className="textarea"
            placeholder={tipo === "oracao" ? "Escreva seu pedido..." : "Conte o que Deus fez..."}
            style={{ fontSize: 13, minHeight: 70 }}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button className="m-btn m-btn-ok" style={{ width: "100%", marginTop: 10 }} onClick={() => setSent(true)}>
            Enviar
          </button>
        </div>
      )}
      {sent && (
        <div className="m-card" style={{ borderColor: "var(--olive-line)", textAlign: "center" }}>
          <div style={{ color: "var(--olive-soft)", fontWeight: 600, fontSize: 14 }}>✓ Enviado</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
            A lideranca recebeu e vai te responder.
          </div>
        </div>
      )}

      {announcements.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Avisos dos seus times</div>
          {announcements.map((a) => (
            <div className="m-card" key={a.id}>
              {a.when_label && (
                <div className="m-card-top" style={{ marginBottom: 6 }}>
                  <span className="m-when">{a.when_label}</span>
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
                {a.title}
              </div>
              {a.body && (
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{a.body}</div>
              )}
              {a.audience && (
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--subtle)",
                    marginTop: 10,
                    letterSpacing: "0.06em",
                  }}
                >
                  {a.audience.toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}

// ── aba: Perfil ───────────────────────────────────────────────────────────────

function TabPerfil({
  person, member, organizationId, theme, setTheme, onChangePassword, onUpdateProfile, journeyRequests, onRequestJourneyStep, setTab,
}: {
  person: P;
  member: M | null;
  organizationId?: string;
  theme?: "dark" | "light";
  setTheme?: (t: "dark" | "light") => void;
  onChangePassword?: (senha: string) => Promise<{ error?: string }>;
  onUpdateProfile?: (personId: string, memberId: string | null, data: { phone: string; nasc: string; bairro: string }) => void;
  journeyRequests?: JourneyRequest[];
  onRequestJourneyStep?: (memberId: string, step: JourneyStep, eventDate: string, note: string) => void;
  setTab?: (tab: string) => void;
}) {
  const journey = member?.journey ?? [];
  const done = journey.filter(Boolean).length;
  const meusPedidosPendentes = new Set(
    (journeyRequests ?? []).filter((r) => r.memberId === member?.id && r.status === "pendente").map((r) => r.step),
  );
  const [requestingStep, setRequestingStep] = useState<JourneyStep | null>(null);
  const [reqDate, setReqDate] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [reqMsg, setReqMsg] = useState("");

  const abrirPedidoJornada = (step: JourneyStep) => {
    setRequestingStep(step);
    setReqDate("");
    setReqNote("");
    setReqMsg("");
  };
  const enviarPedidoJornada = () => {
    if (!requestingStep || !member || !onRequestJourneyStep) return;
    onRequestJourneyStep(member.id, requestingStep, reqDate, reqNote);
    setReqMsg("Pedido enviado. Aguardando aprovação do líder.");
    setRequestingStep(null);
  };

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [nasc, setNasc] = useState(member?.birth ?? "");
  const [bairro, setBairro] = useState(member?.neighborhood ?? "");

  const salvarPerfil = () => {
    onUpdateProfile?.(person.id, member?.id ?? null, { phone, nasc, bairro });
    setEditing(false);
  };

  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [senhaMsg, setSenhaMsg] = useState("");
  const [senhaSaving, setSenhaSaving] = useState(false);
  const senhaValida = senha.length >= 6 && senha === senha2;

  const trocarSenha = async () => {
    if (!senhaValida || !onChangePassword) return;
    setSenhaSaving(true);
    setSenhaMsg("");
    const { error } = await onChangePassword(senha);
    setSenhaSaving(false);
    if (error) {
      setSenhaMsg(error);
    } else {
      setSenhaMsg("Senha atualizada.");
      setSenha("");
      setSenha2("");
    }
  };

  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushOn(!!sub))
      .catch(() => {});
  }, [pushSupported]);

  const urlBase64ToUint8Array = (base64: string) => {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64Safe);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  };

  const ligarPush = async () => {
    if (!pushSupported || !organizationId) return;
    setPushBusy(true);
    setPushMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushMsg(perm === "denied" ? "Bloqueado no navegador. Libere nas configurações do site." : "Permissão não concedida.");
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) { setPushMsg("Push não configurado neste ambiente."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await fetch("/api/service/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, endpoint: json.endpoint, keys: json.keys }),
      });
      setPushOn(true);
    } catch {
      setPushMsg("Não foi possível ativar agora.");
    } finally {
      setPushBusy(false);
    }
  };

  const desligarPush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/service/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushOn(false);
    } catch {
      setPushMsg("Não foi possível desligar agora.");
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <>
      <div className="m-profile">
        <Av name={person.name} size="xl" />
        <div className="m-profile-name">{person.name}</div>
        <div className="m-profile-role">
          Voluntario{member?.firstContact ? ` · desde ${formatDateBR(member.firstContact)}` : ""}
        </div>
      </div>

      <button className="m-vis-head" style={{ cursor: "pointer" }} onClick={() => setTab?.("kids-area")}>
        <span className="av av-sm"><Icon name="kids" size={16} /></span>
        <div className="m-vis-main"><div className="m-culto" style={{ fontSize: 14 }}>Kids</div><div className="m-fn">Meus filhos, mural e eventos</div></div>
        <span className="m-task-caret">→</span>
      </button>

      {member && (
        <>
          <div className="m-section-t">Meus dados</div>
          <div className="m-card">
            {!editing ? (
              <>
                <div className="m-data">
                  <span>Telefone</span>
                  <b>{member.phone || "a completar"}</b>
                </div>
                {member.email && (
                  <div className="m-data">
                    <span>Email</span>
                    <b>{member.email}</b>
                  </div>
                )}
                <div className="m-data" style={{ borderBottom: "none" }}>
                  <span>Bairro</span>
                  <b>{member.neighborhood || "a completar"}</b>
                </div>
                {onUpdateProfile && (
                  <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>Editar</button>
                )}
              </>
            ) : (
              <>
                <div className="field"><label className="field-label">Telefone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div className="field"><label className="field-label">Aniversario</label><input className="input" type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} /></div>
                <div className="field"><label className="field-label">Bairro</label><input className="input" value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-sec btn-sm" type="button" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="btn btn-pri btn-sm" type="button" onClick={salvarPerfil}>Salvar</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="m-section-t" style={{ marginTop: 22 }}>Minha jornada</div>
      <div className="m-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{done}/5 etapas</div>
          <div
            className="m-ring"
            style={{ "--p": `${Math.round((done / 5) * 100)}%` } as React.CSSProperties}
          >
            <span>{Math.round((done / 5) * 100)}%</span>
          </div>
        </div>
        <div className="m-journey-pips">
          {JORNADA.map((s, i) => {
            const kind = JORNADA_STEPS[i];
            const feito = !!journey[i];
            const pendente = meusPedidosPendentes.has(kind);
            const podeClicar = !feito && !pendente && !!onRequestJourneyStep && !!member;
            return (
              <div
                className={`m-jp ${feito ? "on" : ""}`}
                key={i}
                style={{ opacity: pendente ? 0.6 : 1, cursor: podeClicar ? "pointer" : "default" }}
                onClick={() => podeClicar && abrirPedidoJornada(kind)}
              >
                <span>{feito ? "✓" : pendente ? "…" : i + 1}</span>
                <small>{s}{pendente ? " (pendente)" : ""}</small>
              </div>
            );
          })}
        </div>
        {requestingStep && (
          <div style={{ marginTop: 14 }}>
            <div className="field">
              <label className="field-label">Quando foi &quot;{JORNADA[JORNADA_STEPS.indexOf(requestingStep)]}&quot;?</label>
              <input className="input" type="date" value={reqDate} onChange={(e) => setReqDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Nota (opcional)</label>
              <input className="input" value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="ex: aconteceu na igreja anterior" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-sec btn-sm" type="button" onClick={() => setRequestingStep(null)}>Cancelar</button>
              <button className="btn btn-pri btn-sm" type="button" onClick={enviarPedidoJornada}>Enviar pedido</button>
            </div>
          </div>
        )}
        {reqMsg && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>{reqMsg}</div>}
      </div>

      {onChangePassword && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Segurança</div>
          <div className="m-card">
            <div className="field"><label className="field-label">Nova senha</label><input className="input" type="password" placeholder="ao menos 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
            <div className="field"><label className="field-label">Confirmar senha</label><input className="input" type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></div>
            <button className="btn btn-pri btn-sm" type="button" disabled={!senhaValida || senhaSaving} onClick={trocarSenha}>{senhaSaving ? "Salvando…" : "Trocar senha"}</button>
            {senhaMsg && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{senhaMsg}</div>}
          </div>
        </>
      )}

      <div className="m-section-t" style={{ marginTop: 22 }}>Preferencias</div>
      <div className="m-card">
        {theme && setTheme && (
          <div className="m-data">
            <span>Tema escuro</span>
            <button type="button" className={`m-toggle ${theme === "dark" ? "on" : ""}`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
          </div>
        )}
        <div className="m-data" style={{ borderBottom: "none" }}>
          <span>Notificacoes push</span>
          <button
            type="button"
            className={`m-toggle ${pushOn ? "on" : ""}`}
            disabled={!pushSupported || pushBusy}
            onClick={() => (pushOn ? desligarPush() : ligarPush())}
          />
        </div>
        {!pushSupported && <div style={{ fontSize: 11.5, color: "var(--subtle)", marginTop: 8 }}>Disponivel quando instalado como app.</div>}
        {pushMsg && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{pushMsg}</div>}
      </div>
    </>
  );
}

// ── Onboarding (primeiro acesso do membro) ───────────────────────────────────

function FotoUpload({
  preview, onPreview,
}: {
  preview: string | null; onPreview: (url: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = () => ref.current?.click();
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    onPreview(url);
  };
  return (
    <div className="ob-foto-area" onClick={pick} style={{ cursor: "pointer" }}>
      {preview
        ? <img src={preview} alt="Foto de perfil" className="ob-foto-img" />
        : (
          <div className="ob-foto-placeholder">
            <span>+</span>
            <small>Toque para enviar</small>
          </div>
        )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onChange} />
    </div>
  );
}

function Onboarding({ person, member, churchName, churchLogoUrl, onCompleteOnboarding, onDone }: { person: P; member: M | null; churchName?: string; churchLogoUrl?: string | null; onCompleteOnboarding?: (personId: string, memberId: string | null, data: { email: string; nasc: string; bairro: string; senha: string }) => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    email: member?.email ?? person.name.toLowerCase().replace(/\s+/g, ".") + "@email.com",
    nasc: "",
    bairro: member?.neighborhood ?? "",
    senha: "",
    senha2: "",
  });
  const [foto, setFoto] = useState<string | null>(null);
  const set = (k: keyof typeof d, v: string) => setD((p) => ({ ...p, [k]: v }));

  const nome = person.name.split(" ")[0];

  const steps = [
    {
      t: churchName ? `Bem-vindo(a) a ${churchName}` : "Bem-vindo(a) a casa",
      s: `Que bom ter voce aqui, ${nome}. Vamos completar seu cadastro em um minuto.`,
      body: (
        <div className="ob-welcome">
          <div className="ob-mark"><Icon name="ok" size={28} /></div>
          <div className="ob-welcome-x">
            Seu acesso foi liberado. Antes de comecar, confirme seus dados, escolha uma foto e crie sua senha.
          </div>
        </div>
      ),
      ok: "Comecar →",
      valid: true,
    },
    {
      t: "Seus dados",
      s: "Confirme as informacoes para mantermos contato e celebrar suas datas.",
      body: (
        <div className="ob-form">
          <div className="field">
            <label className="field-label">E-mail</label>
            <input className="input" value={d.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Aniversario</label>
            <input className="input" type="date" value={d.nasc} onChange={(e) => set("nasc", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Bairro</label>
            <input className="input" value={d.bairro} placeholder="Onde voce mora" onChange={(e) => set("bairro", e.target.value)} />
          </div>
        </div>
      ),
      ok: "Continuar →",
      valid: !!d.nasc,
    },
    {
      t: "Sua foto",
      s: "Coloque uma foto sua. Aparece no lugar das iniciais e deixa tudo com mais cara de casa.",
      body: (
        <div className="ob-foto">
          <FotoUpload preview={foto} onPreview={setFoto} />
          {foto && (
            <button className="ob-foto-remover" type="button" onClick={() => setFoto(null)}>
              Remover foto
            </button>
          )}
        </div>
      ),
      ok: foto ? "Continuar →" : "Pular por agora →",
      valid: true,
    },
    {
      t: "Crie sua senha",
      s: "Troque a senha inicial (os 6 ultimos do telefone) por uma so sua.",
      body: (
        <div className="ob-form">
          <div className="field">
            <label className="field-label">Nova senha</label>
            <input className="input" type="password" value={d.senha} placeholder="ao menos 6 caracteres" onChange={(e) => set("senha", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Repita a senha</label>
            <input className="input" type="password" value={d.senha2} onChange={(e) => set("senha2", e.target.value)} />
          </div>
          {d.senha && d.senha !== d.senha2 && (
            <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>As senhas nao conferem.</div>
          )}
          <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 8 }}>
            Quer trocar depois? Pode pular e fazer no seu perfil.
          </div>
        </div>
      ),
      ok: "Entrar no app →",
      valid: !d.senha || (d.senha.length >= 6 && d.senha === d.senha2),
    },
  ] as const;

  const cur = steps[step];

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      try { localStorage.setItem(`cex_onboarded_${person.id}`, "1"); } catch {}
      onCompleteOnboarding?.(person.id, member?.id ?? null, { email: d.email, nasc: d.nasc, bairro: d.bairro, senha: d.senha });
      onDone();
    }
  };

  return (
    <div className="ob">
      <div className="ob-card">
        <div className="ob-progress">
          {steps.map((_, i) => (
            <div key={i} className={`ob-dot${i <= step ? " on" : ""}`} />
          ))}
        </div>
        <div className="ob-logo">
          {churchLogoUrl ? (
            <img src={churchLogoUrl} alt={churchName || "Logo da igreja"} style={{ height: 22, maxWidth: 140, objectFit: "contain" }} />
          ) : (
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
              CE<span style={{ color: "var(--olive)" }}>.X</span>
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginLeft: 8 }}>Service</span>
        </div>
        <div className="ob-eyebrow">Primeiro acesso · passo {step + 1} de {steps.length}</div>
        <h2 className="ob-title">{cur.t}</h2>
        <p className="ob-sub">{cur.s}</p>
        <div className="ob-body">{cur.body}</div>
        <div className="ob-actions">
          {step > 0 && (
            <button className="btn btn-sec" type="button" onClick={() => setStep(step - 1)}>
              Voltar
            </button>
          )}
          <button
            className="btn btn-pri"
            type="button"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={!cur.valid}
            onClick={next}
          >
            {cur.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── aba: Kids (area do responsavel, drill-down do Perfil) ────────────────────────

function TabKidsArea({
  person,
  kidsClasses,
  kidsChildren,
  childGuardians,
  kidsAttendance,
  kidsEvents,
  kidsEventEnrollments,
  wallPosts,
  organizationId,
  churchId,
  setTab,
}: {
  person: P;
  kidsClasses: KidsClass[];
  kidsChildren: Child[];
  childGuardians: ChildGuardian[];
  kidsAttendance: KidsAttendance[];
  kidsEvents: KidsEvent[];
  kidsEventEnrollments: KidsEventEnrollment[];
  wallPosts: WallPost[];
  organizationId?: string;
  churchId?: string;
  setTab?: (tab: string) => void;
}) {
  const emptyForm = { nome: "", nascimento: "", genero: "", autorizaImagem: false, alergias: "", restricoes: "", saude: "", medicamento: "", emergenciaNome: "", emergenciaTel: "", notas: "" };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fotoFilho, setFotoFilho] = useState<string | null>(null);
  const [enviandoFotoFilho, setEnviandoFotoFilho] = useState(false);
  const [novoFilhoId, setNovoFilhoId] = useState(() => crypto.randomUUID());
  const [ficarError, setFicarError] = useState("");
  const [enrollments, setEnrollments] = useState(kidsEventEnrollments);
  const [myChildren, setMyChildren] = useState(kidsChildren);
  const [myGuardians, setMyGuardians] = useState(childGuardians);
  const [minhaFoto, setMinhaFoto] = useState(person.photoUrl ?? null);
  const [enviandoMinhaFoto, setEnviandoMinhaFoto] = useState(false);
  const sugestaoTurmaId = suggestKidsClassId(form.nascimento, kidsClasses);
  const sugestaoTurma = kidsClasses.find((kc) => kc.id === sugestaoTurmaId);

  const meusFilhos = myChildren.filter((c) => myGuardians.some((g) => g.child_id === c.id && g.guardian_person_id === person.id));
  const kidsWall = wallPosts.filter((w) => (w.audience ?? "").toLowerCase().includes("kids")).slice(0, 5);

  const enviarMinhaFoto = async (file: File) => {
    if (!organizationId) return;
    setEnviandoMinhaFoto(true);
    try {
      const url = await uploadServiceImage(createServiceBrowserClient(), file, `${organizationId}/kids/guardians/${person.id}.${imageExtension(file)}`);
      await createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", person.id);
      setMinhaFoto(url);
    } catch { /* falha silenciosa, tenta de novo depois */ }
    setEnviandoMinhaFoto(false);
  };

  const abrirNovo = () => {
    setEditingId((v) => (v === "novo" ? null : "novo"));
    setForm(emptyForm);
    setFotoFilho(null);
    setNovoFilhoId(crypto.randomUUID());
    setFicarError("");
  };

  const abrirEdicao = (child: Child) => {
    setEditingId(child.id);
    setForm({
      nome: child.name,
      nascimento: child.birth ?? "",
      genero: child.gender ?? "",
      autorizaImagem: child.image_authorized ?? false,
      alergias: child.allergies ?? "",
      restricoes: child.dietary_restrictions ?? "",
      saude: child.health_insurance ?? "",
      medicamento: child.medication ?? "",
      emergenciaNome: child.emergency_contact_name ?? "",
      emergenciaTel: child.emergency_contact_phone ?? "",
      notas: "",
    });
    setFotoFilho(child.photo_url ?? null);
    setFicarError("");
  };

  const enviarFotoFilho = async (file: File) => {
    if (!organizationId) return;
    const targetId = editingId && editingId !== "novo" ? editingId : novoFilhoId;
    setEnviandoFotoFilho(true);
    try {
      const url = await uploadServiceImage(createServiceBrowserClient(), file, `${organizationId}/kids/children/${targetId}.${imageExtension(file)}`);
      setFotoFilho(url);
    } catch { setFicarError("Nao consegui enviar a foto agora."); }
    setEnviandoFotoFilho(false);
  };

  const salvarFilho = async () => {
    if (!form.nome.trim() || !organizationId || !churchId) return;
    if (!fotoFilho) { setFicarError("A foto da crianca e obrigatoria."); return; }
    setFicarError("");
    const supabase = createServiceBrowserClient();
    const payload = {
      class_id: sugestaoTurmaId,
      name: form.nome.trim(),
      birth: form.nascimento || null,
      photo_url: fotoFilho,
      gender: (form.genero || null) as "menino" | "menina" | null,
      allergies: form.alergias.trim() || null,
      dietary_restrictions: form.restricoes.trim() || null,
      health_insurance: form.saude.trim() || null,
      medication: form.medicamento.trim() || null,
      emergency_contact_name: form.emergenciaNome.trim() || null,
      emergency_contact_phone: form.emergenciaTel.trim() || null,
      image_authorized: form.autorizaImagem,
    };
    if (editingId && editingId !== "novo") {
      const { error } = await supabase.schema("service").from("children").update(payload).eq("id", editingId);
      if (!error) setMyChildren((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)));
      else { setFicarError("Nao consegui salvar agora."); return; }
    } else {
      const { error } = await supabase.schema("service").from("children").insert({ id: novoFilhoId, organization_id: organizationId, church_id: churchId, ...payload });
      if (!error) {
        await supabase.schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: novoFilhoId, guardian_person_id: person.id, relationship: "responsavel", can_pickup: true });
        setMyChildren((prev) => [...prev, { id: novoFilhoId, church_id: churchId, ...payload } as Child]);
        setMyGuardians((prev) => [...prev, { id: `local-${novoFilhoId}`, child_id: novoFilhoId, guardian_person_id: person.id, relationship: "responsavel", can_pickup: true }]);
      } else { setFicarError("Nao consegui salvar agora."); return; }
    }
    setEditingId(null);
    setForm(emptyForm);
    setFotoFilho(null);
  };

  const inscrever = async (eventId: string, childId: string) => {
    if (!organizationId) return;
    const { data } = await createServiceBrowserClient().schema("service").from("kids_event_enrollments").insert({ organization_id: organizationId, kids_event_id: eventId, child_id: childId, enrolled_by: person.id }).select("id,kids_event_id,child_id,enrolled_by").single();
    if (data) setEnrollments((prev) => [...prev, data as KidsEventEnrollment]);
  };

  const fichaForm = (
    <div className="m-card" style={{ borderColor: "var(--olive-line)", marginTop: 10 }}>
      <MiniFotoMobile label="Foto da crianca (obrigatoria)" photoUrl={fotoFilho} busy={enviandoFotoFilho} onUpload={enviarFotoFilho} />
      <input className="input" placeholder="Nome da crianca" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} style={{ marginTop: 10, marginBottom: 8 }} />
      <input className="input" type="date" value={form.nascimento} onChange={(e) => setForm((f) => ({ ...f, nascimento: e.target.value }))} style={{ marginBottom: 8 }} />
      <select className="select" value={form.genero} onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))} style={{ marginBottom: 8 }}>
        <option value="">Genero (opcional)</option>
        <option value="menino">Menino</option>
        <option value="menina">Menina</option>
      </select>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (form.nascimento ? "nenhuma turma cobre essa idade ainda" : "calculada pelo nascimento")}</div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13 }}>
        <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} /> Autoriza uso de imagem
      </label>
      <input className="input" placeholder="Alergias" value={form.alergias} onChange={(e) => setForm((f) => ({ ...f, alergias: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Restricoes alimentares" value={form.restricoes} onChange={(e) => setForm((f) => ({ ...f, restricoes: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Plano de saude / convenio" value={form.saude} onChange={(e) => setForm((f) => ({ ...f, saude: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Medicamento em uso continuo" value={form.medicamento} onChange={(e) => setForm((f) => ({ ...f, medicamento: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergencia: nome" value={form.emergenciaNome} onChange={(e) => setForm((f) => ({ ...f, emergenciaNome: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergencia: telefone" value={form.emergenciaTel} onChange={(e) => setForm((f) => ({ ...f, emergenciaTel: e.target.value }))} style={{ marginBottom: 10 }} />
      {ficarError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>{ficarError}</div>}
      <button className="m-btn m-btn-ok" style={{ width: "100%" }} onClick={salvarFilho}>Salvar</button>
    </div>
  );

  return (
    <>
      <button className="m-vis-head" style={{ cursor: "pointer", marginBottom: 12 }} onClick={() => setTab?.("perfil")}>
        <span className="m-task-caret" style={{ transform: "scaleX(-1)" }}>→</span>
        <div className="m-vis-main"><div className="m-culto" style={{ fontSize: 14 }}>Voltar ao perfil</div></div>
      </button>

      <div className="m-section-t">Sua foto de responsavel</div>
      <MiniFotoMobile label="Foto do responsavel" photoUrl={minhaFoto} busy={enviandoMinhaFoto} onUpload={enviarMinhaFoto} />
      <div className="cell-sub" style={{ marginTop: 6, marginBottom: 16 }}>É essa foto que o professor compara na hora da retirada.</div>

      <div className="m-section-t">Meus filhos</div>
      {meusFilhos.map((child) => {
        const turma = kidsClasses.find((kc) => kc.id === child.class_id);
        const historico = kidsAttendance.filter((a) => a.child_id === child.id).sort((a, b) => b.dropped_off_at.localeCompare(a.dropped_off_at)).slice(0, 3);
        return (
          <div key={child.id}>
            <button className="m-card" style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => abrirEdicao(child)}>
              <div className="m-vis-head">
                {child.photo_url ? <img src={child.photo_url} alt={child.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <Av name={child.name} size="sm" />}
                <div className="m-vis-main">
                  <div className="m-culto" style={{ fontSize: 14 }}>{child.name}</div>
                  <div className="m-fn">{turma?.name ?? "sem turma"}{child.allergies ? ` · ⚠ ${child.allergies}` : ""}</div>
                </div>
                <span className="m-task-caret">✎</span>
              </div>
              {historico.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--subtle)" }}>
                  {historico.map((h) => <div key={h.id}>{formatDateBR(h.dropped_off_at.slice(0, 10))} · {h.status === "retirado" ? "retirado" : "na sala"}</div>)}
                </div>
              )}
            </button>
            {editingId === child.id && fichaForm}
          </div>
        );
      })}
      {meusFilhos.length === 0 && <div className="empty">Nenhuma crianca vinculada ao seu cadastro ainda.</div>}

      <button className="m-btn m-btn-swap" style={{ width: "100%", marginTop: 10 }} onClick={abrirNovo}>
        {editingId === "novo" ? "Cancelar" : "+ Adicionar filho"}
      </button>
      {editingId === "novo" && fichaForm}

      {kidsWall.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Mural dos professores</div>
          {kidsWall.map((post) => (
            <div className="m-card" key={post.id}>
              <div className="m-fn">{post.author ?? "Kids"}</div>
              <div style={{ fontSize: 13.5, marginTop: 4 }}>{post.body}</div>
            </div>
          ))}
        </>
      )}

      {kidsEvents.length > 0 && meusFilhos.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Eventos de criancas</div>
          {kidsEvents.map((event) => (
            <div className="m-card" key={event.id}>
              <div className="m-culto">{event.title}</div>
              <div className="m-fn">{[event.event_date, event.time, event.location].filter(Boolean).join(" · ") || "sem data definida"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {meusFilhos.map((child) => {
                  const inscrito = enrollments.some((e) => e.kids_event_id === event.id && e.child_id === child.id);
                  return (
                    <button key={child.id} className={`chip ${inscrito ? "chip-ok" : "chip-neutral"}`} type="button" disabled={inscrito} onClick={() => inscrever(event.id, child.id)}>
                      {child.name.split(" ")[0]}{inscrito ? " ✓" : " + inscrever"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}

// ── frame: celular ────────────────────────────────────────────────────────────

function MobileMembro({
  person, member, ...rest
}: MobileOverlayProps & { person: P; member: M | null }) {
  const [tab, setTab] = useState("inicio");
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try { return !!localStorage.getItem(`cex_onboarded_${person.id}`); } catch { return false; }
  });
  const { ministries, events, roster, cards, boards, courses, enrollments, courseModules = [], courseLessons = [],
          visitors, baptismClasses, announcements, chats, chatMembers, messages, members, onReadAnnouncement, onCompleteOnboarding, onAddCardComment,
          onAdvanceVisitorStage, onRegisterVisitor, onSendMessage, onStartChat,
          organizationId, churchName, churchLogoUrl, theme, setTheme, onChangePassword, onUpdateProfile,
          journeyRequests, onRequestJourneyStep, onConfirmarEscala, onRecusarEscala,
          kidsClasses = [], kidsChildren = [], childGuardians = [], kidsSessions = [], kidsAttendance = [],
          kidsEvents = [], kidsEventEnrollments = [], wallPosts = [] } = rest;

  const isRecep = isRecepPerson(person, ministries);
  const isKids = isKidsPerson(person, ministries);

  const TABS = [
    { id: "inicio",     ic: "inicio",     l: "Inicio"   },
    { id: "escalas",    ic: "escalas",    l: "Escala"   },
    { id: "tarefas",    ic: "tarefas",    l: "Tarefas"  },
    { id: "conversas",  ic: "conversas",  l: "Chat"     },
    isKids
      ? { id: "kids",       ic: "kids",      l: "Kids"     }
      : isRecep
      ? { id: "visitantes", ic: "visitante", l: "Visitas" }
      : { id: "cursos",     ic: "cursos",    l: "Cursos"  },
    { id: "perfil",     ic: "perfil",     l: "Perfil"   },
  ];

  if (!onboarded) {
    return (
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-notch" />
          <Onboarding person={person} member={member} churchName={churchName} churchLogoUrl={churchLogoUrl} onCompleteOnboarding={onCompleteOnboarding} onDone={() => setOnboarded(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="phone-screen">
        <div className="phone-notch" />
        <div className="m-statusbar">
          <span>9:41</span>
          <span>{churchName || "Service"} ◆</span>
        </div>
        <div className="m-head">
          <div className="m-app">Service · {isRecep ? "Recepcao" : "Voluntario"}</div>
          <div className="m-h1">
            Ola, <em>{person.name.split(" ")[0]}</em>
          </div>
        </div>

        <div className="m-scroll">
          {tab === "inicio" && (
            <TabInicio person={person} member={member} ministries={ministries} events={events} roster={roster} cards={cards} setTab={setTab} />
          )}
          {tab === "escalas" && <TabEscala person={person} events={events} roster={roster} onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala} />}
          {tab === "tarefas" && <TabTarefas person={person} cards={cards} boards={boards} onAddCardComment={onAddCardComment} />}
          {tab === "conversas" && (
            <TabConversas member={member} chats={chats} chatMembers={chatMembers} messages={messages} members={members} ministries={ministries} onSendMessage={onSendMessage} onStartChat={onStartChat} />
          )}
          {tab === "visitantes" && <TabVisitantes visitors={visitors} onAdvanceVisitorStage={onAdvanceVisitorStage} onRegisterVisitor={onRegisterVisitor} />}
          {tab === "kids" && (
            <TabKids
              person={person}
              members={members}
              events={events}
              kidsClasses={kidsClasses}
              kidsChildren={kidsChildren}
              childGuardians={childGuardians}
              kidsSessions={kidsSessions}
              kidsAttendance={kidsAttendance}
              organizationId={organizationId}
              churchId={kidsClasses[0]?.church_id}
            />
          )}
          {tab === "cursos" && (
            <TabCursos member={member} courses={courses} enrollments={enrollments} courseModules={courseModules} courseLessons={courseLessons} baptismClasses={baptismClasses} setTab={setTab} />
          )}
          {tab === "batismo" && <TabBatismo baptismClasses={baptismClasses} />}
          {tab === "avisos" && <TabAvisos announcements={announcements} person={person} onReadAnnouncement={onReadAnnouncement} />}
          {tab === "perfil" && (
            <TabPerfil
              person={person}
              member={member}
              organizationId={organizationId}
              theme={theme}
              setTheme={setTheme}
              onChangePassword={onChangePassword}
              onUpdateProfile={onUpdateProfile}
              journeyRequests={journeyRequests}
              onRequestJourneyStep={onRequestJourneyStep}
              setTab={setTab}
            />
          )}
          {tab === "kids-area" && (
            <TabKidsArea
              person={person}
              kidsClasses={kidsClasses}
              kidsChildren={kidsChildren}
              childGuardians={childGuardians}
              kidsAttendance={kidsAttendance}
              kidsEvents={kidsEvents}
              kidsEventEnrollments={kidsEventEnrollments}
              wallPosts={wallPosts}
              organizationId={organizationId}
              churchId={kidsClasses[0]?.church_id}
              setTab={setTab}
            />
          )}
        </div>

        <div className="m-tab">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <span className="ic">
                <TabIcon name={t.ic} size={19} />
              </span>
              {t.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── overlay principal (desktop) ───────────────────────────────────────────────

export default function MobileOverlay(props: MobileOverlayProps) {
  const { people, members, onClose } = props;

  const personas = people.filter((p) => p.status === "ativo").slice(0, 3);
  const [idx, setIdx] = useState(0);

  const person = personas[idx] ?? people[0];
  const member = person
    ? (members.find((m) => m.volunteerId === person.id) ?? null)
    : null;

  if (!person) {
    return (
      <div className="mob-bg" onClick={onClose}>
        <div className="mob-side" onClick={(e) => e.stopPropagation()}>
          <div className="mob-side-eyebrow">App do voluntario</div>
          <h3>Nenhum voluntario ativo</h3>
          <p>Cadastre voluntarios em Pessoas para pre-visualizar o app deles aqui.</p>
          <button className="mob-close" onClick={onClose}>← Voltar ao painel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mob-bg" onClick={onClose}>
      <div className="mob-side" onClick={(e) => e.stopPropagation()}>
        <div className="mob-side-eyebrow">Mesma conta · outra superficie</div>
        <h3>
          O app do <span className="ol">voluntario</span>
        </h3>
        <p>
          O membro acompanha a jornada, confirma escala, resolve tarefas do quadro,
          conversa com o time e o lider, faz cursos e pede oracao, tudo pelo celular.
        </p>

        <div className="mob-persona">
          <div className="mob-persona-t">Pre-visualizar como</div>
          {personas.map((p, i) => {
            const m = members.find((m) => m.volunteerId === p.id);
            return (
              <button
                key={p.id}
                className={`mob-persona-opt ${i === idx ? "on" : ""}`}
                onClick={() => setIdx(i)}
              >
                <Av name={p.name} size="sm" />
                <div>
                  <b>{p.name}</b>
                  <small>
                    {m ? "Membro" : "Voluntario"}
                    {p.tags.length > 0 ? ` · ${p.tags[0]}` : ""}
                  </small>
                </div>
                {i === idx && <span className="mob-persona-chk">●</span>}
              </button>
            );
          })}
          <div className="mob-persona-hint">
            O voluntario da Recepcao ve o modulo de visitantes no lugar de Cursos.
          </div>
        </div>

        <button className="mob-close" onClick={onClose}>← Voltar ao painel</button>
      </div>

      <div className="mob-phone-wrap" onClick={(e) => e.stopPropagation()}>
        <MobileMembro key={person.id} {...props} person={person} member={member} />
      </div>
    </div>
  );
}
