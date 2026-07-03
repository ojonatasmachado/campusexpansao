"use client";

import { useEffect, useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

// ── tipos (subconjunto dos tipos de ServiceExactApp) ──────────────────────────

type P = {
  id: string;
  name: string;
  availability: Record<string, boolean>;
  tags: string[];
  status: string;
};
type M = {
  id: string;
  name: string;
  phone: string;
  email: string;
  situation: string;
  firstContact: string;
  neighborhood: string | null;
  journey: number[];
};
type Ministry = {
  id: string;
  name: string;
  icon: string;
  people: Array<{ personId: string; isLeader: boolean; functions: string[] }>;
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
  onReadAnnouncement?: (personId: string, announcementId: string) => void;
  onCompleteOnboarding?: (personId: string, memberId: string | null, data: { email: string; nasc: string; bairro: string }) => void;
  onAddCardComment?: (cardId: string, author: string, body: string) => void;
  onClose: () => void;
};

// ── constantes ────────────────────────────────────────────────────────────────

const JORNADA = ["Decisao", "Batismo", "Fundamentos", "GC", "Servindo"];
const AVAIL_LABELS: Record<string, string> = { dom_m: "Domingo manha", dom_n: "Domingo noite", qua: "Quarta" };
const ETAPAS = [
  { id: "novo", nome: "Novo" },
  { id: "contato", nome: "Contato" },
  { id: "integrando", nome: "Integrando" },
  { id: "membro", nome: "Membro" },
];

const ICONS: Record<string, string> = {
  inicio:    '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
  escalas:   '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  tarefas:   '<path d="m9 11 3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  conversas: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  cursos:    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  visitante: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  perfil:    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};

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
  const inner = ICONS[name];
  if (!inner) return <span style={{ fontSize: size * 0.7 }}>◆</span>;
  return (
    <svg
      className="cex-ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

function isRecepPerson(person: P, ministries: Ministry[]) {
  return ministries.some((m) => /recep/i.test(m.name) && m.people.some((mp) => mp.personId === person.id));
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
          <span className="m-alert-ic">!</span>
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
            ◆
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
                {proxEvent.weekday} · {proxEvent.eventDate} · {proxEvent.time}
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
          <span style={{ color: "var(--olive)" }}>◇</span>Minhas tarefas
        </button>
        <button className="m-quick-b" onClick={() => setTab("conversas")}>
          <span style={{ color: "var(--olive)" }}>→</span>Conversas
        </button>
        <button className="m-quick-b" onClick={() => setTab("cursos")}>
          <span style={{ color: "var(--olive)" }}>◆</span>Meus cursos
        </button>
        {isRecep ? (
          <button className="m-quick-b" onClick={() => setTab("visitantes")}>
            <span style={{ color: "var(--olive)" }}>◇</span>Visitantes
          </button>
        ) : (
          <button className="m-quick-b" onClick={() => setTab("avisos")}>
            <span style={{ color: "var(--olive)" }}>◆</span>Pedir oracao
          </button>
        )}
      </div>
    </>
  );
}

// ── aba: Escala ───────────────────────────────────────────────────────────────

function TabEscala({ person, events, roster }: { person: P; events: Ev[]; roster: Slot[] }) {
  const mySlots = roster.filter((r) => r.person_id === person.id);
  const [stMap, setStMap] = useState<Record<string, "ok" | "wait" | "no">>(
    () => Object.fromEntries(mySlots.map((r) => [r.id, r.status])),
  );
  const [swapId, setSwapId] = useState<string | null>(null);
  const [avail, setAvail] = useState<Record<string, boolean>>({ ...(person.availability ?? {}) });
  const setSt = (id: string, v: "ok" | "wait" | "no") => setStMap((p) => ({ ...p, [id]: v }));

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
                {ev.weekday} · {ev.eventDate} · {ev.time}
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
  member, chats, chatMembers, messages, members,
}: {
  member: M | null;
  chats: Chat[];
  chatMembers: ChatMember[];
  messages: Message[];
  members: M[];
}) {
  const [selId, setSelId] = useState<string | null>(null);

  const myChats = member
    ? chats.filter((c) =>
        chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === member.id),
      )
    : [];

  const chat = myChats.find((c) => c.id === selId);

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
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="m-section-t">Conversas</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        Fale com o seu time, com o seu lider ou com um pastor.
      </div>
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

type LocalVisitor = { id: string; name: string; phone: string; origin: string; stage: string };

function TabVisitantes({ visitors }: { visitors: Visitor[] }) {
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [stages, setStages] = useState<Record<string, string>>({});
  const [novos, setNovos] = useState<LocalVisitor[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", origin: "Primeira visita" });

  const allVisitors: LocalVisitor[] = [
    ...visitors
      .filter((v) => v.stage !== "membro")
      .map((v) => ({ id: v.id, name: v.name, phone: v.phone ?? "", origin: v.origin ?? "", stage: v.stage })),
    ...novos,
  ];

  const getStage = (id: string, base: string) => stages[id] ?? base;

  const salvar = () => {
    if (!form.name.trim()) return;
    setNovos((p) => [
      ...p,
      { id: `new_${Date.now()}`, name: form.name.trim(), phone: form.phone, origin: form.origin, stage: "novo" },
    ]);
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
        const stageId = getStage(v.id, v.stage);
        const etIdx = ETAPAS.findIndex((e) => e.id === stageId);
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
                      setStages((p) => ({ ...p, [v.id]: ETAPAS[etIdx + 1].id }));
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
            <span className="m-when">{b.baptism_date ?? "A definir"}</span>
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
          <span style={{ color: "var(--olive)" }}>◆</span>Pedir oracao
        </button>
        <button
          className={`m-quick-b ${tipo === "testemunho" ? "on" : ""}`}
          onClick={() => { setTipo("testemunho"); setSent(false); setTexto(""); }}
        >
          <span style={{ color: "var(--olive)" }}>◇</span>Compartilhar testemunho
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

function TabPerfil({ person, member }: { person: P; member: M | null }) {
  const journey = member?.journey ?? [];
  const done = journey.filter(Boolean).length;

  return (
    <>
      <div className="m-profile">
        <Av name={person.name} size="xl" />
        <div className="m-profile-name">{person.name}</div>
        <div className="m-profile-role">
          Voluntario{member?.firstContact ? ` · desde ${member.firstContact}` : ""}
        </div>
      </div>

      {member && (
        <>
          <div className="m-section-t">Meus dados</div>
          <div className="m-card">
            {member.phone && (
              <div className="m-data">
                <span>Telefone</span>
                <b>{member.phone}</b>
              </div>
            )}
            {member.email && (
              <div className="m-data">
                <span>Email</span>
                <b>{member.email}</b>
              </div>
            )}
            {member.neighborhood && (
              <div className="m-data" style={{ borderBottom: "none" }}>
                <span>Bairro</span>
                <b>{member.neighborhood}</b>
              </div>
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
          {JORNADA.map((s, i) => (
            <div className={`m-jp ${journey[i] ? "on" : ""}`} key={i}>
              <span>{journey[i] ? "✓" : i + 1}</span>
              <small>{s}</small>
            </div>
          ))}
        </div>
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

function Onboarding({ person, member, onCompleteOnboarding, onDone }: { person: P; member: M | null; onCompleteOnboarding?: (personId: string, memberId: string | null, data: { email: string; nasc: string; bairro: string }) => void; onDone: () => void }) {
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
      t: `Bem-vindo(a) a casa`,
      s: `Que bom ter voce aqui, ${nome}. Vamos completar seu cadastro em um minuto.`,
      body: (
        <div className="ob-welcome">
          <div className="ob-mark">◆</div>
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
      s: "Troque a senha inicial (os 4 ultimos do telefone) por uma so sua.",
      body: (
        <div className="ob-form">
          <div className="field">
            <label className="field-label">Nova senha</label>
            <input className="input" type="password" value={d.senha} placeholder="ao menos 4 caracteres" onChange={(e) => set("senha", e.target.value)} />
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
      valid: !d.senha || (d.senha.length >= 4 && d.senha === d.senha2),
    },
  ] as const;

  const cur = steps[step];

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      try { localStorage.setItem(`cex_onboarded_${person.id}`, "1"); } catch {}
      onCompleteOnboarding?.(person.id, member?.id ?? null, { email: d.email, nasc: d.nasc, bairro: d.bairro });
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
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
            CE<span style={{ color: "var(--olive)" }}>.X</span>
          </span>
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

// ── frame: celular ────────────────────────────────────────────────────────────

function MobileMembro({
  person, member, ...rest
}: MobileOverlayProps & { person: P; member: M | null }) {
  const [tab, setTab] = useState("inicio");
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try { return !!localStorage.getItem(`cex_onboarded_${person.id}`); } catch { return false; }
  });
  const { ministries, events, roster, cards, boards, courses, enrollments, courseModules = [], courseLessons = [],
          visitors, baptismClasses, announcements, chats, chatMembers, messages, members, onReadAnnouncement, onCompleteOnboarding, onAddCardComment } = rest;

  const isRecep = isRecepPerson(person, ministries);

  const TABS = [
    { id: "inicio",     ic: "inicio",     l: "Inicio"   },
    { id: "escalas",    ic: "escalas",    l: "Escala"   },
    { id: "tarefas",    ic: "tarefas",    l: "Tarefas"  },
    { id: "conversas",  ic: "conversas",  l: "Chat"     },
    isRecep
      ? { id: "visitantes", ic: "visitante", l: "Visitas" }
      : { id: "cursos",     ic: "cursos",    l: "Cursos"  },
    { id: "perfil",     ic: "perfil",     l: "Perfil"   },
  ];

  if (!onboarded) {
    return (
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-notch" />
          <Onboarding person={person} member={member} onCompleteOnboarding={onCompleteOnboarding} onDone={() => setOnboarded(true)} />
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
          <span>CE.X ◆</span>
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
          {tab === "escalas" && <TabEscala person={person} events={events} roster={roster} />}
          {tab === "tarefas" && <TabTarefas person={person} cards={cards} boards={boards} onAddCardComment={onAddCardComment} />}
          {tab === "conversas" && (
            <TabConversas member={member} chats={chats} chatMembers={chatMembers} messages={messages} members={members} />
          )}
          {tab === "visitantes" && <TabVisitantes visitors={visitors} />}
          {tab === "cursos" && (
            <TabCursos member={member} courses={courses} enrollments={enrollments} courseModules={courseModules} courseLessons={courseLessons} baptismClasses={baptismClasses} setTab={setTab} />
          )}
          {tab === "batismo" && <TabBatismo baptismClasses={baptismClasses} />}
          {tab === "avisos" && <TabAvisos announcements={announcements} person={person} onReadAnnouncement={onReadAnnouncement} />}
          {tab === "perfil" && <TabPerfil person={person} member={member} />}
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
    ? (members.find(
        (m) =>
          m.name.split(" ")[0].toLowerCase() === person.name.split(" ")[0].toLowerCase(),
      ) ?? null)
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
            const m = members.find(
              (m) => m.name.split(" ")[0].toLowerCase() === p.name.split(" ")[0].toLowerCase(),
            );
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

      <div onClick={(e) => e.stopPropagation()}>
        <MobileMembro key={person.id} {...props} person={person} member={member} />
      </div>
    </div>
  );
}
