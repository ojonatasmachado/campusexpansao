"use client";

import { avisar } from "./lib/avisar";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { Icon, Caret } from "./lib/icons";
import { formatDateBR, joinDot, parseISODate, saudacao, todayISO, weekdayFromISO } from "./lib/date";
import { plural } from "./lib/plural";
import { suggestKidsClassId, imageAuthorizationCopy } from "./lib/kids";
import { PhotoPicker } from "./PhotoPicker";
import CepInput from "./CepInput";
import ChurchLockup from "./ChurchLockup";
import { TEXT_SCALES, useTextScale } from "./lib/text-scale";
import { requirementLabel, type RequirementKind } from "./lib/requirements";
import { checkinAberto, horaQueAbre, sessaoDoCulto, statusDaCrianca, useKidsCheckin } from "./lib/kids-checkin";
import { INSTRUCAO_QR, aulasDoCurso, proximaAula, textoDaAula, type ProximaAula } from "./lib/aulas";

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
  postalCode?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  /* ficha com e-mail, telefone, aniversário e CEP (calculado no servidor):
     sem isso o app abre no primeiro acesso, em qualquer aparelho */
  contactComplete?: boolean;
  journey: number[];
  volunteerId: string | null;
};

/* dados de contato que o membro preenche no primeiro acesso e no perfil */
export type MemberContactInput = { name: string; email: string; phone: string; nasc: string; cep: string; rua: string; bairro: string; cidade: string; estado: string };

/* o servidor troca vazio por "Telefone não informado" / "E-mail não
   informado" (page.tsx toMemberView); em campo editável isso vira vazio */
const realValue = (v: string | null | undefined) => (v && !/não informado$/.test(v) ? v : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const contactErrors = (c: MemberContactInput) => ({
  name: c.name.trim().split(/\s+/).length < 2 ? "Coloque nome e sobrenome." : "",
  email: !EMAIL_RE.test(c.email.trim()) ? "Coloque um e-mail válido." : "",
  phone: c.phone.replace(/\D/g, "").length < 10 ? "Coloque o telefone com DDD." : "",
  nasc: !c.nasc ? "Coloque a data do seu aniversário." : "",
  cep: c.cep.replace(/\D/g, "").length !== 8 ? "Coloque o CEP com 8 números." : "",
});
type Ministry = {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  positions?: Array<{ id: string; name: string }>;
  appModules?: string[];
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
type Ev = { id: string; name: string; weekday: string; eventDate: string; time: string; location?: string; kind?: string };
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
type Course = { id: string; name: string; kind: string | null; level: string | null; description: string | null; published?: boolean };
type Enrollment = { id: string; course_id: string; member_id: string; done_count: number; status: string };

/* ── caminhada do membro no app (Fase 4, migração 0046) ─────────────────────────
   O que falta pra cada curso/time/"Quero servir" vem do banco
   (service.my_missing_requirements) e as ações passam por funções que
   conferem os requisitos no servidor. As abas leem daqui via contexto. */
export type MissingRequirement = { target_kind: "course" | "ministry" | "serve"; target_id: string | null; req_kind: RequirementKind; req_ref: string };
export type ServeRequest = { id: string; member_id: string; ministry_id: string; status: "pendente" | "aprovado" | "recusado" };
export type BaptismCandidateRef = { class_id: string; member_id: string | null };
type JourneyActions = {
  missing: MissingRequirement[];
  serveRequests: ServeRequest[];
  baptismCandidates: BaptismCandidateRef[];
  onEnrollCourse?: (courseId: string) => Promise<string>;
  onRequestBaptism?: (classId: string) => Promise<string>;
  onRequestServe?: (ministryId: string) => Promise<string>;
  /* nomes pra explicar o que falta ("Concluiu: Fundamentos") */
  names: { courses: { id: string; name: string }[]; events: { id: string; name: string }[]; groupsLabel?: string };
};
const JourneyContext = createContext<JourneyActions>({ missing: [], serveRequests: [], baptismCandidates: [], names: { courses: [], events: [] } });

/* o que falta pra um alvo, já em texto */
function useFaltas() {
  const j = useContext(JourneyContext);
  return (kind: MissingRequirement["target_kind"], id: string | null) =>
    j.missing
      .filter((m) => m.target_kind === kind && (m.target_id ?? null) === id)
      .map((m) => requirementLabel({ kind: m.req_kind, ref: m.req_ref }, j.names));
}

const RESULTADO_ACAO: Record<string, string> = {
  faltam_requisitos: "Ainda falta cumprir os pré-requisitos.",
  inscricoes_fechadas: "As inscrições desta turma estão fechadas.",
  ja_serve: "Você já serve neste time.",
  sem_ficha: "Sua ficha ainda não está ligada ao app. Fale com a liderança.",
};
const mensagemAcao = (r: string) => RESULTADO_ACAO[r] ?? "Não foi possível agora. Tente de novo.";
type CourseModule = { id: string; course_id: string; name: string; sort_order: number };
type CourseLesson = { id: string; module_id: string; name: string; sort_order?: number | null; kind?: string | null; link?: string | null; conteudo?: string | null; lesson_date?: string | null; lesson_time?: string | null; location?: string | null };
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
  kind?: string | null;
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
type ChildGuardian = { id: string; child_id: string; guardian_person_id: string; relationship: string | null; can_pickup: boolean; is_primary?: boolean };
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
type BibleMark = { id: string; book: string; chapter: number; verse: number; color: string | null; note: string | null; updated_at: string };

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
  bibleMarks?: BibleMark[];
  onSaveBibleMark?: (book: string, chapter: number, verse: number, data: { color: string | null; note: string | null }) => void;
  onReadAnnouncement?: (personId: string, announcementId: string) => void;
  onCompleteOnboarding?: (personId: string, memberId: string | null, data: MemberContactInput) => Promise<{ error?: string }>;
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
  onUpdateProfile?: (personId: string, memberId: string | null, data: MemberContactInput) => Promise<{ error?: string }>;
  journeyRequests?: JourneyRequest[];
  onRequestJourneyStep?: (memberId: string, step: JourneyStep, eventDate: string, note: string) => void;
  missingRequirements?: MissingRequirement[];
  serveRequests?: ServeRequest[];
  baptismCandidates?: BaptismCandidateRef[];
  onEnrollCourse?: (courseId: string) => Promise<string>;
  onRequestBaptism?: (classId: string) => Promise<string>;
  onRequestServe?: (ministryId: string) => Promise<string>;
  onConfirmarEscala?: (assignmentId: string) => void;
  onRecusarEscala?: (assignmentId: string) => void;
  onClose: () => void;
  /* "preview" (padrão) : lideranca espiando o app do voluntario, com
     seletor de pessoa e texto de marketing. "self" : o proprio voluntario
     logado de verdade, direto na conta dele, sem seletor e sem "voltar
     ao painel" (nao existe painel pra essa pessoa). */
  mode?: "preview" | "self";
  /* só pra quem tem função de gestão: volta pro painel */
  onSwitchToPanel?: () => void;
  selfPersonId?: string | null;
  onLogout?: () => void;
  /* nome que a igreja dá aos pequenos grupos (gruposCfg.termoP) */
  groupTerm?: string;
  /* publicações do Mural que esta pessoa já leu (service.announcement_reads) */
  readAnnouncementIds?: string[];
  /* cartão "Nossa igreja" na Caminhada (Identidade e propósito) */
  churchPurpose?: { kick?: string | null; title?: string | null; text?: string | null } | null;
  /* "Quando posso servir" (0049) */
  onSaveAvailability?: (availability: Record<string, boolean>) => Promise<boolean>;
  /* "Vou / Não vou" nas publicações de evento do Mural (0049) */
  onRespondAnnouncement?: (announcementId: string, response: "vou" | "nao" | null) => Promise<boolean>;
  announcementResponses?: { announcement_id: string; response: "vou" | "nao" }[];
};

// ── constantes ────────────────────────────────────────────────────────────────

/* etapas da caminhada; a 4ª usa o nome que a igreja deu aos grupos
   (Configurações → Grupos), nunca a sigla */
const GroupTermContext = createContext("Grupo");
function useJornada() {
  const grupo = useContext(GroupTermContext);
  return ["Decisão", "Batismo", "Fundamentos", grupo, "Servindo"];
}
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

function Av({ name, size = "sm", photoUrl }: { name: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; photoUrl?: string | null }) {
  return (
    <div className={`av av-${size}${photoUrl ? " has-foto" : ""}`} style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
      {ini(name)}
    </div>
  );
}

function ChipSt({ status, label }: { status: "ok" | "wait" | "no"; label?: string }) {
  const cls = status === "ok" ? "chip-ok" : status === "wait" ? "chip-wait" : "chip-no";
  return <span className={`chip ${cls}`}>{label ?? status}</span>;
}

function TabIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <Icon name={name} size={size} />;
}

/* módulo extra vem do time (ministries.app_modules, escolhido em Editar
   ministério), não do nome do time */
function hasTeamModule(person: P, ministries: Ministry[], module: string) {
  return ministries.some((m) => (m.appModules ?? []).includes(module) && m.people.some((mp) => mp.personId === person.id));
}

function isRecepPerson(person: P, ministries: Ministry[]) {
  return hasTeamModule(person, ministries, "visitantes");
}

function isKidsPerson(person: P, ministries: Ministry[]) {
  return hasTeamModule(person, ministries, "kids");
}

// ── aba: Inicio ───────────────────────────────────────────────────────────────

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
          <span className="m-task-caret"><Caret open={isOpen} /></span>
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
      <div className="m-section-t">Tarefas com você · {pending.length} {pending.length === 1 ? "aberta" : "abertas"}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        O que a liderança deixou no quadro para você. Atualize e comente.
      </div>
      {pending.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nada pendente com você agora.</div>
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
  member, chats, chatMembers, messages, members, ministries, onSendMessage, onStartChat, openChatId, startNew, onChatOpen,
}: {
  /* abre direto nesta conversa (ex.: depois de "Pedir troca") */
  openChatId?: string | null;
  /* abre já na escolha de com quem falar ("Nova mensagem → Falar com um líder") */
  startNew?: boolean;
  /* avisa a casca quando entra ou sai de uma conversa (título e voltar) */
  onChatOpen?: (name: string | null) => void;
  member: M | null;
  chats: Chat[];
  chatMembers: ChatMember[];
  messages: Message[];
  members: M[];
  ministries: Ministry[];
  onSendMessage?: (chatId: string, senderId: string, body: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const [selId, setSelIdRaw] = useState<string | null>(openChatId ?? null);
  const [texto, setTexto] = useState("");
  const [novo, setNovo] = useState(!!startNew);
  const [novoMsg, setNovoMsg] = useState("");
  const [starting, setStarting] = useState(false);

  const myChats = member
    ? chats.filter((c) =>
        chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === member.id),
      )
    : [];

  const chat = myChats.find((c) => c.id === selId);
  const setSelId = (id: string | null) => {
    setSelIdRaw(id);
    onChatOpen?.(id ? (myChats.find((c) => c.id === id)?.name ?? "Conversa") : null);
  };

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
        {!onChatOpen && (
          <button className="m-chat-back" onClick={() => setSelId(null)}>
            ← {chat.name ?? "Conversa"}
          </button>
        )}
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
                        fontSize: 12,
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
      <div className="m-section-t">Conversas</div>

      {novo && (
        <div className="m-card" style={{ marginBottom: 14 }}>
          <div className="m-section-t" style={{ marginTop: 0 }}>{souLider ? "Falar com alguém do time" : "Falar com um líder"}</div>
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
            <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhum líder disponível ainda.</div>
          )}
        </div>
      )}

      {myChats.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: 15, color: "var(--muted)" }}>Nenhuma conversa ainda. Toque em Nova mensagem para falar com um líder.</div>
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

// ── aba: Biblia (leitura, marcacao, anotacao e busca) ─────────────────────────

type BibleBook = { abbrev: string; name: string; chapters: string[][] };
type BibleFlatVerse = { abbrev: string; name: string; chapter: number; verse: number; text: string; norm: string };

let bibleCache: BibleBook[] | null = null;
let bibleCachePromise: Promise<BibleBook[]> | null = null;
function loadBible(): Promise<BibleBook[]> {
  if (bibleCache) return Promise.resolve(bibleCache);
  if (!bibleCachePromise) {
    bibleCachePromise = fetch("/bible/acf.json")
      .then((r) => r.json())
      .then((data: BibleBook[]) => { bibleCache = data; return data; });
  }
  return bibleCachePromise;
}
function normalizeBusca(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const BIBLE_CORES: { key: string; label: string }[] = [
  { key: "sand", label: "Areia" },
  { key: "wheat", label: "Trigo" },
  { key: "amber", label: "Ambar" },
  { key: "clay", label: "Barro" },
  { key: "terra", label: "Terracota" },
  { key: "rust", label: "Ferrugem" },
  { key: "cocoa", label: "Cacau" },
  { key: "olive", label: "Oliva" },
];

function TabBiblia({
  bibleMarks, onSaveBibleMark,
}: {
  bibleMarks: BibleMark[];
  onSaveBibleMark?: (book: string, chapter: number, verse: number, data: { color: string | null; note: string | null }) => void;
}) {
  const [bible, setBible] = useState<BibleBook[] | null>(bibleCache);
  const [view, setView] = useState<"livros" | "capitulos" | "leitor" | "marcacoes">("livros");
  const [bookAbbrev, setBookAbbrev] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [actionVerse, setActionVerse] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    loadBible().then((data) => { if (alive) setBible(data); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const flatIndex = useMemo<BibleFlatVerse[]>(() => {
    if (!bible) return [];
    const out: BibleFlatVerse[] = [];
    bible.forEach((b) => {
      b.chapters.forEach((verses, ci) => {
        verses.forEach((text, vi) => {
          out.push({ abbrev: b.abbrev, name: b.name, chapter: ci + 1, verse: vi + 1, text, norm: normalizeBusca(text) });
        });
      });
    });
    return out;
  }, [bible]);

  const searchResults = useMemo(() => {
    if (debouncedQuery.length < 3) return [];
    const q = normalizeBusca(debouncedQuery);
    const out: BibleFlatVerse[] = [];
    for (const v of flatIndex) {
      if (v.norm.includes(q)) {
        out.push(v);
        if (out.length >= 80) break;
      }
    }
    return out;
  }, [flatIndex, debouncedQuery]);

  const marksByRef = useMemo(() => {
    const map = new Map<string, BibleMark>();
    bibleMarks.forEach((m) => map.set(`${m.book}:${m.chapter}:${m.verse}`, m));
    return map;
  }, [bibleMarks]);

  const book = bible?.find((b) => b.abbrev === bookAbbrev) ?? null;
  const versesAtuais = book && chapter ? book.chapters[chapter - 1] : null;

  const irPara = (abbrev: string, c: number) => {
    setBookAbbrev(abbrev);
    setChapter(c);
    setView("leitor");
    setQuery("");
  };
  const abrirAcaoVerso = (v: number) => {
    const mark = bookAbbrev && chapter ? marksByRef.get(`${bookAbbrev}:${chapter}:${v}`) : undefined;
    setNoteDraft(mark?.note ?? "");
    setCopied(false);
    setActionVerse(v);
  };
  const copiarVerso = () => {
    if (actionVerse == null || !book || !chapter || !versesAtuais) return;
    const texto = `"${versesAtuais[actionVerse - 1]}"\n${book.name} ${chapter}:${actionVerse} · ACF`;
    navigator.clipboard?.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* clipboard indisponivel : nao quebra nada, so nao copia */ });
  };
  const escolherCor = (color: string | null) => {
    if (actionVerse == null || !bookAbbrev || !chapter) return;
    const mark = marksByRef.get(`${bookAbbrev}:${chapter}:${actionVerse}`);
    onSaveBibleMark?.(bookAbbrev, chapter, actionVerse, { color, note: mark?.note ?? null });
  };
  const salvarNota = () => {
    if (actionVerse == null || !bookAbbrev || !chapter) return;
    const mark = marksByRef.get(`${bookAbbrev}:${chapter}:${actionVerse}`);
    onSaveBibleMark?.(bookAbbrev, chapter, actionVerse, { color: mark?.color ?? null, note: noteDraft.trim() || null });
    setActionVerse(null);
  };
  const removerMarcacao = () => {
    if (actionVerse == null || !bookAbbrev || !chapter) return;
    onSaveBibleMark?.(bookAbbrev, chapter, actionVerse, { color: null, note: null });
    setActionVerse(null);
  };

  const marcaAtual = actionVerse != null && bookAbbrev && chapter ? marksByRef.get(`${bookAbbrev}:${chapter}:${actionVerse}`) : undefined;

  if (!bible) {
    return (
      <>
        <div className="empty" style={{ marginTop: 12 }}>
          <div className="empty-mark"><Icon name="biblia" size={22} /></div>
          <h3 className="empty-title">Baixando a Bíblia...</h3>
          <p className="empty-desc">So acontece uma vez. Depois fica salva no seu celular.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {view === "livros" && (
        <>
          <div className="bib-search">
            <input className="input" placeholder="Buscar palavra ou trecho..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {debouncedQuery.length >= 3 ? (
            <>
              <div className="m-section-t">{searchResults.length} {searchResults.length === 1 ? "resultado" : "resultados"}</div>
              {searchResults.map((r) => (
                <button key={`${r.abbrev}${r.chapter}:${r.verse}`} className="bib-result" onClick={() => irPara(r.abbrev, r.chapter)}>
                  <b>{r.name} {r.chapter}:{r.verse}</b>
                  <small>{r.text}</small>
                </button>
              ))}
              {searchResults.length === 0 && <div className="empty"><p className="empty-desc">Nada encontrado com esse termo.</p></div>}
            </>
          ) : (
            <>
              <button className="bib-marks-cta" type="button" onClick={() => setView("marcacoes")}>
                <span className="bib-marks-cta-ic"><Icon name="estrela" size={16} /></span>
                <div><b>Minhas marcações</b><small>{bibleMarks.length} {bibleMarks.length === 1 ? "versículo marcado ou anotado" : "versículos marcados ou anotados"}</small></div>
                <span className="m-alert-go">→</span>
              </button>
              <div className="m-section-t">Antigo Testamento</div>
              <div className="bib-books">
                {bible.slice(0, 39).map((b) => (
                  <button key={b.abbrev} className="bib-book" onClick={() => { setBookAbbrev(b.abbrev); setView("capitulos"); }}>{b.name}</button>
                ))}
              </div>
              <div className="m-section-t">Novo Testamento</div>
              <div className="bib-books">
                {bible.slice(39).map((b) => (
                  <button key={b.abbrev} className="bib-book" onClick={() => { setBookAbbrev(b.abbrev); setView("capitulos"); }}>{b.name}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view === "capitulos" && book && (
        <>
          <button className="back-link" type="button" onClick={() => setView("livros")}>← Livros</button>
          <div className="m-h1" style={{ fontSize: 20, marginBottom: 14 }}>{book.name}</div>
          <div className="bib-chapters">
            {book.chapters.map((_, i) => (
              <button key={i} className="bib-chapter" onClick={() => irPara(book.abbrev, i + 1)}>{i + 1}</button>
            ))}
          </div>
        </>
      )}

      {view === "leitor" && book && chapter && versesAtuais && (
        <>
          <button className="back-link" type="button" onClick={() => setView("capitulos")}>← Capitulos</button>
          <div className="bib-reader-head">
            <button className="bib-chnav" disabled={chapter <= 1} onClick={() => irPara(book.abbrev, chapter - 1)}>‹</button>
            <div className="m-h1" style={{ fontSize: 18 }}>{book.name} {chapter}</div>
            <button className="bib-chnav" disabled={chapter >= book.chapters.length} onClick={() => irPara(book.abbrev, chapter + 1)}>›</button>
          </div>
          <div className="bib-verses">
            {versesAtuais.map((text, i) => {
              const v = i + 1;
              const mark = marksByRef.get(`${book.abbrev}:${chapter}:${v}`);
              return (
                <button
                  key={v}
                  className={`bib-verse${mark?.color ? ` tone-${mark.color}` : ""}${mark ? " marked" : ""}`}
                  onClick={() => abrirAcaoVerso(v)}
                >
                  <span className="bib-verse-n">{v}</span>
                  <span className="bib-verse-t">{text}</span>
                  {mark?.note ? <span className="bib-verse-note-ic"><Icon name="documento" size={11} /></span> : null}
                </button>
              );
            })}
          </div>
        </>
      )}

      {view === "marcacoes" && (
        <>
          <button className="back-link" type="button" onClick={() => setView("livros")}>← Livros</button>
          <div className="m-h1" style={{ fontSize: 20, marginBottom: 14 }}>Minhas marcações</div>
          {bibleMarks.length === 0 && <div className="empty"><p className="empty-desc">Toque num versículo na leitura pra marcar ou anotar.</p></div>}
          {bibleMarks
            .slice()
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .map((m) => {
              const nome = bible.find((b) => b.abbrev === m.book)?.name ?? m.book;
              return (
                <button key={m.id} className={`bib-result${m.color ? ` tone-${m.color}` : ""}`} onClick={() => irPara(m.book, m.chapter)}>
                  <b>{nome} {m.chapter}:{m.verse}</b>
                  {m.note ? <small>{m.note}</small> : null}
                </button>
              );
            })}
        </>
      )}

      {actionVerse != null && book && chapter && (
        <div className="m-sheet-bg" onClick={() => setActionVerse(null)}>
          <div className="ob-card" onClick={(e) => e.stopPropagation()}>
            <div className="bib-action-ref">{book.name} {chapter}:{actionVerse}</div>
            <p className="bib-action-text">{versesAtuais?.[actionVerse - 1]}</p>
            <button className="btn btn-sec btn-sm bib-copy" type="button" onClick={copiarVerso} style={{ marginTop: 10 }}>
              <Icon name="copiar" size={13} /> {copied ? "Copiado!" : "Copiar versículo"}
            </button>
            <div className="bib-swatches">
              {BIBLE_CORES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  className={`bib-swatch tone-${c.key}${marcaAtual?.color === c.key ? " on" : ""}`}
                  onClick={() => escolherCor(c.key)}
                />
              ))}
              {marcaAtual?.color && (
                <button type="button" className="bib-swatch-clear" title="Remover cor" onClick={() => escolherCor(null)}>✕</button>
              )}
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label className="field-label">Anotacao</label>
              <textarea className="input" rows={3} placeholder="O que esse versículo significa pra você?" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {(marcaAtual?.color || marcaAtual?.note) && (
                <button className="btn btn-sec btn-sm" type="button" onClick={removerMarcacao}>Remover marcação</button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn btn-sec btn-sm" type="button" onClick={() => setActionVerse(null)}>Fechar</button>
              <button className="btn btn-pri btn-sm" type="button" onClick={salvarNota}>Salvar</button>
            </div>
          </div>
        </div>
      )}
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
              <span className="m-task-caret"><Caret open={isOpen} /></span>
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
                          fontSize: 12,
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
                  <div className="m-confirmed" style={{ marginTop: 10 }}><Icon name="ok" size={15} /> Pronto para virar membro</div>
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
  people,
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
  people: P[];
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
    if (!targetMember || !organizationId) { avisar("Não encontrei um contato no app para esse responsável.", "warn"); return; }
    const child = childById.get(childId);
    await fetch("/api/service/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, recipientMemberIds: [targetMember.id], title: "Aviso da sala Kids", body: `${child?.name ?? "Sua criança"} precisa de você na sala Kids.` }),
    }).catch(() => {});
    avisar("Aviso enviado.");
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
  const respMatch = form.respNome.trim() ? people.find((p) => p.name.toLowerCase().trim() === form.respNome.toLowerCase().trim()) : null;
  const fotoRespEfetiva = respMatch?.photoUrl ?? fotoResp;

  const criarFicha = async () => {
    if (!form.nome.trim() || !organizationId || !churchId) return;
    if (!fotoCrianca) { setFichaError("A foto da criança é obrigatória."); return; }
    if (!fotoRespEfetiva) { setFichaError("A foto do responsável é obrigatória."); return; }
    setFichaError("");
    const supabase = createServiceBrowserClient();
    const guardianPersonId = respMatch?.id ?? fichaIds.personId;
    let personError = null;
    if (!respMatch) {
      const { error } = await supabase.schema("service").from("people").insert({ id: fichaIds.personId, organization_id: organizationId, church_id: churchId, name: form.respNome.trim() || "Responsavel", phone: form.respTel.trim() || null, status: "ativo", photo_url: fotoResp });
      personError = error;
    } else if (fotoResp) {
      await supabase.schema("service").from("people").update({ photo_url: fotoResp }).eq("id", respMatch.id);
    }
    const { error: childError } = await supabase.schema("service").from("children").insert({ id: fichaIds.childId, organization_id: organizationId, church_id: churchId, class_id: sugestaoTurmaId ?? session?.class_id ?? null, name: form.nome.trim(), birth: form.nascimento || null, photo_url: fotoCrianca, gender: form.genero || null, emergency_contact_name: form.emergenciaNome.trim() || null, emergency_contact_phone: form.emergenciaTel.trim() || null, image_authorized: form.autorizaImagem });
    if (!personError && !childError) {
      await supabase.schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: fichaIds.childId, guardian_person_id: guardianPersonId, relationship: form.respParentesco.trim() || null, can_pickup: true, is_primary: true });
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
      setFichaError("Não foi possível salvar a ficha agora.");
    }
  };

  if (!session) {
    return (
      <>
        <div className="m-section-t">Kids</div>
        <div className="empty" style={{ marginTop: 12 }}>Nenhuma sessão Kids aberta agora. Peça para a liderança abrir o QR do culto de hoje em Cultos & Agenda.</div>
      </>
    );
  }

  return (
    <>
      <div className="m-section-t">Kids · {kidsClass?.name ?? "Turma"}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{joinDot(event?.name, `${event?.weekday ?? ""} ${formatDateBR(event?.eventDate)}`.trim())}</div>

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
                <div className="m-fn">Compare o responsável na porta antes de confirmar.</div>
                <button className="m-btn m-btn-ok" style={{ width: "100%", marginTop: 8 }} onClick={() => confirmarRetirada(att)}>Confirmar retirada</button>
              </div>
            );
          })}
        </>
      )}

      <div className="m-when" style={{ marginBottom: 8, marginTop: pending.length ? 14 : 0 }}>Na sala · {present.length}</div>
      {present.length === 0 && <div className="empty">Nenhuma criança na sala ainda.</div>}
      {present.map((att) => {
        const child = childById.get(att.child_id);
        return (
          <div className="m-card" key={att.id}>
            <div className="m-vis-head">
              <Av name={child?.name ?? "?"} size="sm" photoUrl={child?.photo_url} />
              <div className="m-vis-main">
                <div className="m-culto" style={{ fontSize: 14 }}>{child?.name ?? "Crianca"}</div>
                <div className="m-fn">{child?.allergies ? `⚠ ${child.allergies}` : (att.dropped_off_via === "manual" ? "manual" : "QR")}</div>
              </div>
              <button className="m-btn m-btn-swap" style={{ padding: "6px 10px" }} onClick={() => avisarResponsavel(att.child_id)}>Avisar</button>
            </div>
          </div>
        );
      })}

      <input className="input" placeholder="Buscar criança para check-in manual..." value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 16, marginBottom: 8 }} />
      {notYetIn.slice(0, 5).map((child) => (
        <div className="m-vis-head" key={child.id} style={{ cursor: "pointer" }} onClick={() => checkinManual(child.id)}>
          <Av name={child.name} size="sm" photoUrl={child.photo_url} />
          <div className="m-vis-main"><div className="m-culto" style={{ fontSize: 14 }}>{child.name}</div></div>
          <span style={{ color: "var(--olive)", fontSize: 12 }}>+ check-in</span>
        </div>
      ))}

      <button className="m-btn m-btn-swap" style={{ width: "100%", marginTop: 16 }} onClick={() => setNovaFicha((v) => !v)}>
        {novaFicha ? "Cancelar" : "+ Criar ficha na hora"}
      </button>
      {novaFicha && (
        <div className="m-card" style={{ borderColor: "var(--olive-line)", marginTop: 10 }}>
          <PhotoPicker label="Foto da criança (obrigatória)" photoUrl={fotoCrianca} path={`${organizationId}/kids/children/${fichaIds.childId}`} onUploaded={setFotoCrianca} />
          <input className="input" placeholder="Nome da criança" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} style={{ marginTop: 10, marginBottom: 8 }} />
          <input className="input" type="date" value={form.nascimento} onChange={(e) => setForm((f) => ({ ...f, nascimento: e.target.value }))} style={{ marginBottom: 8 }} />
          <select className="select" value={form.genero} onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))} style={{ marginBottom: 8 }}>
            <option value="">Genero (opcional)</option>
            <option value="menino">Menino</option>
            <option value="menina">Menina</option>
          </select>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (session ? kidsClasses.find((kc) => kc.id === session.class_id)?.name ?? "nenhuma turma cobre essa idade" : "informe o nascimento")}</div>

          <input className="input" list="service-kids-people-names" placeholder="Nome do responsável" value={form.respNome} onChange={(e) => setForm((f) => ({ ...f, respNome: e.target.value }))} style={{ marginBottom: 8 }} />
          <datalist id="service-kids-people-names">
            {people.map((p) => <option key={p.id} value={p.name} />)}
          </datalist>
          {respMatch ? (
            <div className="cell-sub" style={{ marginBottom: 8 }}>Ja tem cadastro no Service{fotoRespEfetiva ? ", foto reaproveitada do perfil" : ""}.</div>
          ) : (
            <PhotoPicker label="Foto do responsável (obrigatória)" photoUrl={fotoResp} path={`${organizationId}/kids/guardians/${fichaIds.personId}`} onUploaded={setFotoResp} />
          )}
          <input className="input" placeholder="Telefone do responsável" value={form.respTel} onChange={(e) => setForm((f) => ({ ...f, respTel: e.target.value }))} style={{ marginTop: 8, marginBottom: 8 }} />
          <input className="input" placeholder="Parentesco (mãe, avó...)" value={form.respParentesco} onChange={(e) => setForm((f) => ({ ...f, respParentesco: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Contato de emergencia: nome" value={form.emergenciaNome} onChange={(e) => setForm((f) => ({ ...f, emergenciaNome: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Contato de emergencia: telefone" value={form.emergenciaTel} onChange={(e) => setForm((f) => ({ ...f, emergenciaTel: e.target.value }))} style={{ marginBottom: 12 }} />

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: 13, lineHeight: 1.4 }}>
            <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} style={{ marginTop: 3 }} />
            <span>{imageAuthorizationCopy(form.nome)}</span>
          </label>
          {fichaError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>{fichaError}</div>}
          <button className="m-btn m-btn-ok" style={{ width: "100%" }} onClick={criarFicha}>Salvar e fazer check-in</button>
        </div>
      )}
    </>
  );
}


// ── aba: Cursos ───────────────────────────────────────────────────────────────

/* próxima aula do curso (v7 2.1): o que é, como concluir e, só se houver
   conteúdo para abrir, o botão. Presença de aula presencial/ao vivo é pelo QR. */
function ProximaAulaBloco({ prox }: { prox: ProximaAula<CourseLesson> | null }) {
  const ui = useContext(MemberUiContext);
  if (!prox) return <div className="m6-meta" style={{ marginTop: 10 }}>As aulas deste curso ainda não foram publicadas.</div>;
  const { aula, n, total, abrir, porQr } = prox;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="m6-kick">Próxima aula · {n} de {total}</div>
      <div className="m6-rt">{aula.name}</div>
      <AulaQuando aula={aula} />
      {porQr ? (
        <div className="m6-meta" style={{ marginTop: 4 }}>{INSTRUCAO_QR}</div>
      ) : !abrir ? (
        <div className="m6-meta" style={{ marginTop: 4 }}>O conteúdo desta aula ainda não foi publicado.</div>
      ) : null}
      {abrir === "link" && (
        <a className="m6-btn pri full" style={{ marginTop: 12 }} href={aula.link!.trim()} target="_blank" rel="noopener noreferrer">
          <Icon name="play" size={20} />Assistir à aula
        </a>
      )}
      {abrir === "texto" && (
        <button className="m6-btn pri full" style={{ marginTop: 12 }} type="button" onClick={() => ui.sheet(<SheetAula aula={aula} n={n} total={total} porQr={porQr} />)}>
          <Icon name="documento" size={20} />{porQr ? "Ver o material da aula" : "Ler a aula"}
        </button>
      )}
    </div>
  );
}

/* dia, hora e sala da aula (0051), quando o curso informou */
function AulaQuando({ aula }: { aula: CourseLesson }) {
  if (!aula.lesson_date && !aula.lesson_time && !aula.location) return null;
  return (
    <ul className="m6-facts">
      {(aula.lesson_date || aula.lesson_time) && <li><Icon name="agenda" size={20} /><span>{joinDot(dataLonga(aula.lesson_date), aula.lesson_time)}</span></li>}
      {aula.location && <li><Icon name="mapapin" size={20} /><span>{aula.location}</span></li>}
    </ul>
  );
}

/* aulas com data dos cursos em andamento, na Agenda (v7 2.2) */
function AulasAgenda({ member, courses, enrollments, courseModules, courseLessons }: { member: M | null; courses: Course[]; enrollments: Enrollment[]; courseModules: CourseModule[]; courseLessons: CourseLesson[] }) {
  if (!member) return null;
  const hoje = todayISO();
  const aulas = enrollments
    .filter((e) => e.member_id === member.id && e.status !== "concluido")
    .flatMap((e) => {
      const curso = courses.find((c) => c.id === e.course_id);
      return curso ? aulasDoCurso(curso.id, courseModules, courseLessons).map((aula) => ({ aula, curso })) : [];
    })
    .filter(({ aula }) => (aula.kind === "presencial" || aula.kind === "ao_vivo") && !!aula.lesson_date && aula.lesson_date >= hoje)
    .sort((a, b) => `${a.aula.lesson_date}${a.aula.lesson_time ?? ""}`.localeCompare(`${b.aula.lesson_date}${b.aula.lesson_time ?? ""}`));
  if (!aulas.length) return null;
  return (
    <div className="m6-sec">
      <div className="m6-lbl">Suas aulas</div>
      <div className="m6-list">
        {aulas.map(({ aula, curso }) => (
          <div className="m6-row" key={aula.id}>
            <M6Date iso={aula.lesson_date!} />
            <div className="m6-rb">
              <div className="m6-rt">{aula.name}</div>
              <div className="m6-rs">{joinDot(curso.name, aula.lesson_time, aula.location)}</div>
              <div className="m6-rs">{INSTRUCAO_QR}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SheetAula({ aula, n, total, porQr }: { aula: CourseLesson; n: number; total: number; porQr: boolean }) {
  return (
    <div>
      <div className="m6-kick">Aula {n} de {total}</div>
      <h2 className="m6-sh">{aula.name}</h2>
      <p className="m6-txt" style={{ whiteSpace: "pre-wrap" }}>{textoDaAula(aula.conteudo)}</p>
      {porQr && <div className="m6-meta">{INSTRUCAO_QR}</div>}
    </div>
  );
}

function TabCursos({
  member, courses, enrollments, courseModules, courseLessons,
}: {
  member: M | null;
  courses: Course[];
  enrollments: Enrollment[];
  courseModules: CourseModule[];
  courseLessons: CourseLesson[];
}) {
  const myEnrollments = member ? enrollments.filter((e) => e.member_id === member.id) : [];
  const enrolledIds = new Set(myEnrollments.map((e) => e.course_id));
  const toExplore = courses.filter((c) => !enrolledIds.has(c.id));

  return (
    <>

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
                <ChipSt status="ok" label="Concluído" />
              ) : (
                <span className="m-when" style={{ color: "var(--amber)" }}>{pct}%</span>
              )}
            </div>
            <div className="m-culto" style={{ fontSize: 16 }}>{course.name}</div>
            <div className="bar" style={{ marginTop: 10 }}>
              <div className={`bar-fill ${en.status === "concluido" ? "" : "amber"}`} style={{ width: `${pct}%` }} />
            </div>
            {en.status !== "concluido" && <ProximaAulaBloco prox={proximaAula(course.id, en.done_count, courseModules, courseLessons)} />}
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
              <CursoInscricao courseId={c.id} />
            </div>
          ))}
        </>
      )}
    </>
  );
}

/* "Quero servir" (service.request_to_serve): times em que a pessoa ainda não
   está. A igreja define o que precisa antes (requisitos de "servir" e do
   time); com algo faltando, o app mostra o que falta. O pedido vai pra
   liderança aprovar no painel (Times). */
function ServirSection({ person, member, ministries, members = [], people = [] }: { person: P; member: M | null; ministries: Ministry[]; members?: M[]; people?: P[] }) {
  const j = useContext(JourneyContext);
  const faltas = useFaltas();
  const [enviados, setEnviados] = useState<Record<string, string>>({});
  if (!member || !j.onRequestServe) return null;
  const fora = ministries.filter((m) => !m.people.some((mp) => mp.personId === person.id));
  if (fora.length === 0) return null;
  const faltasServir = faltas("serve", null);
  const pendente = (ministryId: string) =>
    enviados[ministryId] === "ok" || j.serveRequests.some((r) => r.member_id === member.id && r.ministry_id === ministryId && r.status === "pendente");

  return (
    <>
            {faltasServir.length > 0 ? (
        <div className="m-card">
          <div className="m-fn" style={{ marginBottom: 0 }}>
            <b>Antes de servir num time:</b> {faltasServir.join(" · ")}
          </div>
        </div>
      ) : (
        fora.map((m) => {
          const faltasTime = faltas("ministry", m.id);
          const resultado = enviados[m.id];
          return (
            <div className="m-card" key={m.id}>
              <div className="m-culto" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={m.icon || "times"} size={18} /> {m.name}
              </div>
              {m.description && <p className="m6-txt" style={{ margin: "6px 0 0" }}>{m.description}</p>}
              {(() => {
                const lider = m.people.find((x) => x.isLeader);
                const nome = lider ? (people.find((pp) => pp.id === lider.personId)?.name ?? members.find((mm) => mm.volunteerId === lider.personId)?.name) : null;
                return nome ? <div className="m6-meta" style={{ marginTop: 4 }}>Líder · {nome}</div> : null;
              })()}
              {pendente(m.id) ? (
                <div className="m-confirmed" style={{ marginTop: 10 }}><Icon name="ok" size={15} /> Pedido enviado · o líder vai falar com você.</div>
              ) : faltasTime.length > 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                  <b style={{ color: "var(--light)" }}>Para entrar:</b> {faltasTime.join(" · ")}
                </div>
              ) : (
                <>
                  <button
                    className="m-btn m-btn-ok ghost"
                    style={{ width: "100%", marginTop: 10 }}
                    disabled={resultado === "enviando"}
                    onClick={async () => {
                      setEnviados((p) => ({ ...p, [m.id]: "enviando" }));
                      const r = await j.onRequestServe!(m.id);
                      setEnviados((p) => ({ ...p, [m.id]: r === "ok" ? "ok" : mensagemAcao(r) }));
                    }}
                  >
                    {resultado === "enviando" ? "Enviando..." : "Quero servir neste time"}
                  </button>
                  {resultado && resultado !== "enviando" && resultado !== "ok" && (
                    <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{resultado}</div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

/* Inscrição de verdade (service.enroll_me): com pré-requisito faltando, mostra
   o que falta em vez do botão */
function CursoInscricao({ courseId }: { courseId: string }) {
  const j = useContext(JourneyContext);
  const faltas = useFaltas()("course", courseId);
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | string>("");
  if (faltas.length > 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
        <b style={{ color: "var(--light)" }}>Para se inscrever:</b> {faltas.join(" · ")}
      </div>
    );
  }
  if (estado === "ok") return <div className="m-confirmed" style={{ marginTop: 12 }}><Icon name="ok" size={15} /> Inscrição feita. O curso aparece em Meus cursos.</div>;
  return (
    <>
      <button
        className="m-btn m-btn-ok ghost"
        style={{ width: "100%", marginTop: 12 }}
        disabled={estado === "enviando" || !j.onEnrollCourse}
        onClick={async () => {
          if (!j.onEnrollCourse) return;
          setEstado("enviando");
          const r = await j.onEnrollCourse(courseId);
          setEstado(r === "ok" ? "ok" : mensagemAcao(r));
        }}
      >
        {estado === "enviando" ? "Inscrevendo..." : "Inscrever-se"}
      </button>
      {estado && estado !== "enviando" && estado !== "ok" && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{estado}</div>}
    </>
  );
}

// ── aba: Batismo ──────────────────────────────────────────────────────────────

function TabBatismo({ baptismClasses, memberId }: { baptismClasses: BaptismClass[]; memberId: string | null }) {
  /* inscrição de verdade (service.request_baptism): antes só mudava a tela */
  const j = useContext(JourneyContext);
  const [inscrito, setInscrito] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(j.baptismCandidates.filter((c) => memberId && c.member_id === memberId).map((c) => [c.class_id, true])),
  );
  const [erro, setErro] = useState<Record<string, string>>({});
  const openClasses = baptismClasses.filter((b) => b.status !== "concluida");

  return (
    <>
      <div className="m-section-t">Próximos batismos</div>
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
              <ChipSt status="ok" label="Inscrições abertas" />
            ) : (
              <ChipSt status="wait" label="Em preparação" />
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
                <Icon name="ok" size={15} /> Inscrição enviada! O responsável vai te chamar.
              </div>
            ) : (
              <button
                className="m-btn m-btn-ok"
                style={{ width: "100%", marginTop: 12 }}
                disabled={!j.onRequestBaptism}
                onClick={async () => {
                  if (!j.onRequestBaptism) return;
                  const r = await j.onRequestBaptism(b.id);
                  if (r === "ok") setInscrito((p) => ({ ...p, [b.id]: true }));
                  else setErro((p) => ({ ...p, [b.id]: mensagemAcao(r) }));
                }}
              >
                Quero me inscrever →
              </button>
            )
          ) : (
            <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 12 }}>
              Inscrições ainda não abertas para esta turma.
            </div>
          )}
          {erro[b.id] && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{erro[b.id]}</div>}
        </div>
      ))}
    </>
  );
}

// ── aba: Perfil ───────────────────────────────────────────────────────────────

/* notificações do celular (push): usado no Perfil e no primeiro acesso */
function usePush(organizationId?: string) {
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

  return { pushOn, pushBusy, pushMsg, pushSupported, ligarPush, desligarPush };
}

function TabPerfil({
  person, member, organizationId, theme, setTheme, onChangePassword, onUpdateProfile, onLogout, onSwitchToPanel, view = "home", openSub,
}: {
  view?: "home" | "dados" | "senha";
  openSub?: (sub: string) => void;
  onLogout?: () => void;
  onSwitchToPanel?: () => void;
  person: P;
  member: M | null;
  organizationId?: string;
  theme?: "dark" | "light";
  setTheme?: (t: "dark" | "light") => void;
  onChangePassword?: (senha: string) => Promise<{ error?: string }>;
  onUpdateProfile?: (personId: string, memberId: string | null, data: MemberContactInput) => Promise<{ error?: string }>;
}) {
  const [sair, setSair] = useState(false);

  const [editing, setEditing] = useState(false);
  const [perfil, setPerfil] = useState<MemberContactInput>({
    name: member?.name ?? person.name,
    email: realValue(member?.email),
    phone: realValue(member?.phone),
    nasc: member?.birth ?? "",
    cep: member?.postalCode ?? "",
    rua: member?.street ?? "",
    bairro: member?.neighborhood ?? "",
    cidade: member?.city ?? "",
    estado: member?.state ?? "",
  });
  const [perfilTentou, setPerfilTentou] = useState(false);
  const perfilErros = contactErrors(perfil);

  const [perfilErroSalvar, setPerfilErroSalvar] = useState("");
  const salvarPerfil = async () => {
    if (Object.values(perfilErros).some(Boolean)) {
      setPerfilTentou(true);
      return;
    }
    if (!onUpdateProfile) return;
    setPerfilErroSalvar("");
    const { error } = await onUpdateProfile(person.id, member?.id ?? null, perfil);
    if (error) {
      setPerfilErroSalvar(error);
      return;
    }
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

  const { pushOn, pushBusy, pushMsg, pushSupported, ligarPush, desligarPush } = usePush(organizationId);
  const [tour, setTour] = useState(false);

  /* Perfil no modelo de Ajustes do celular (S24): a lista abre telas
     próprias (Meus dados, Trocar senha, Minha família) com "voltar" no topo */
  if (view === "dados") {
    return (
      <div className="m6-sec0">
        {member ? (
          <div className="m6-card">
            {!editing ? (
              <>
                <ul className="m6-facts">
                  <li><Icon name="telefone" size={20} /><span>{realValue(member.phone)}</span></li>
                  <li><Icon name="link" size={20} /><span>{realValue(member.email)}</span></li>
                  {member.birth && <li><Icon name="presente" size={20} /><span>Aniversário · {formatDateBR(member.birth)}</span></li>}
                  {(member.neighborhood || member.city) && <li><Icon name="mapapin" size={20} /><span>{[member.neighborhood, member.city].filter(Boolean).join(", ")}</span></li>}
                </ul>
                {onUpdateProfile && (
                  <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={() => setEditing(true)}>Editar meus dados</button></div>
                )}
              </>
            ) : (
              <>
                <MemberContactFields d={perfil} set={(k, v) => setPerfil((p) => ({ ...p, [k]: v }))} erros={perfilTentou ? perfilErros : null} />
                {perfilErroSalvar && <div className="m6-err">{perfilErroSalvar}</div>}
                <div className="m6-btns">
                  <button className="m6-btn sec" type="button" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="m6-btn pri" type="button" onClick={salvarPerfil}>Salvar</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="m6-card"><div className="m6-meta">Sua ficha ainda não está ligada ao app. Fale com a liderança.</div></div>
        )}
      </div>
    );
  }

  if (view === "senha") {
    return (
      <div className="m6-sec0">
        <div className="m6-card">
          <div className="field"><label className="field-label">Senha nova</label><input className="input" type="password" autoComplete="new-password" placeholder="Pelo menos 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <div className="field"><label className="field-label">Repita a senha</label><input className="input" type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></div>
          {senhaMsg && <div className="m6-meta" style={{ marginBottom: 8 }}>{senhaMsg}</div>}
          <div className="m6-btns"><button className="m6-btn pri" type="button" disabled={!senhaValida || senhaSaving || !onChangePassword} onClick={trocarSenha}>{senhaSaving ? "Salvando..." : "Salvar senha nova"}</button></div>
        </div>
      </div>
    );
  }

  const papel = onSwitchToPanel ? "Liderança" : "Membro";
  return (
    <>
      <div className="m6-sec0">
        <div className="m6-card m6-me">
          <Av name={person.name} size="xl" photoUrl={person.photoUrl} />
          <div className="m6-rb">
            <div className="m6-ct">{person.name}</div>
            <div className="m6-meta">{papel}</div>
            {member?.firstContact ? <div className="m6-meta">Na igreja desde {formatDateBR(member.firstContact)}</div> : null}
          </div>
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Você</div>
        <div className="m6-list">
          <M6Row ic="pessoa" t="Meus dados" s="Telefone, e-mail, endereço e aniversário" onClick={() => openSub?.("dados")} />
          <M6Row ic="kids" t="Minha família" s="Filhos no Kids, check-in e eventos" onClick={() => openSub?.("familia")} />
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Preferências</div>
        <div className="m6-card">
          <div className="m6-rt">Tamanho do texto</div>
          <div className="m6-meta">Vale para o app inteiro.</div>
          <TextSizePicker />
          {theme && setTheme && (
            <>
              <div className="m6-hr" />
              <div className="m6-rt">Tema</div>
              <div className="ts-seg two" role="radiogroup" aria-label="Tema">
                {(["light", "dark"] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={theme === m} className={theme === m ? "on" : ""} onClick={() => setTheme(m)}>{m === "light" ? "Claro" : "Escuro"}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="m6-list">
          <div className="m6-row">
            <span className="m6-ic"><Icon name="sino" size={22} /></span>
            <span className="m6-rb">
              <span className="m6-rt">Notificações</span>
              <span className="m6-rs">{pushMsg || (pushSupported ? (pushOn ? "Escala, Mural e conversas chegam no celular" : "Desligadas") : "Disponível quando o app está instalado")}</span>
            </span>
            <button type="button" role="switch" aria-checked={pushOn} aria-label="Notificações" className={`m6-tg${pushOn ? " on" : ""}`} disabled={!pushSupported || pushBusy} onClick={() => (pushOn ? desligarPush() : ligarPush())} />
          </div>
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Conta</div>
        <div className="m6-list">
          {onChangePassword && <M6Row ic="cadeado" t="Trocar senha" onClick={() => openSub?.("senha")} />}
          <M6Row ic="lampada" t="Conheça o app" s="Um passeio de um minuto" onClick={() => setTour(true)} />
          {onSwitchToPanel && <M6Row ic="painel" t="Abrir o painel da igreja" s="Gestão de pessoas, escalas e agenda" onClick={onSwitchToPanel} />}
        </div>
      </div>

      {onLogout && (
        <div className="m6-sec">
          <div className="m6-list">
            <M6Row cls="m6-danger" ic="sair" t="Sair do app" right={null} onClick={() => setSair(true)} />
          </div>
        </div>
      )}
      {tour && <AppTourModal onClose={() => setTour(false)} />}
      {sair && onLogout && (
        <M6Sheet onClose={() => setSair(false)}>
          <h2 className="m6-sh">Sair do app?</h2>
          <p className="m6-txt">Para entrar de novo, você vai precisar do seu e-mail e da sua senha.</p>
          <div className="m6-btns col">
            <button className="m6-btn danger" type="button" onClick={onLogout}>Sair</button>
            <button className="m6-btn sec" type="button" onClick={() => setSair(false)}>Cancelar</button>
          </div>
        </M6Sheet>
      )}
    </>
  );
}

// ── Onboarding (primeiro acesso do membro) ───────────────────────────────────

const APP_TABS_INFO = [
  { ic: "inicio", t: "Início", s: "O que precisa de você agora e o que acontece na igreja." },
  { ic: "agenda", t: "Agenda", s: "Sua escala, suas tarefas e a agenda da igreja." },
  { ic: "conversas", t: "Mensagens", s: "O Mural da igreja e as conversas com a liderança." },
  { ic: "cursos", t: "Caminhada", s: "Seus passos na igreja, cursos e a Bíblia." },
  { ic: "perfil", t: "Perfil", s: "Seus dados, família, tamanho do texto e tema." },
];

function AppTabsInfoGrid() {
  return (
    <div className="ob-tabs-grid">
      {APP_TABS_INFO.map((x) => (
        <div className="ob-tab-item" key={x.t}>
          <span className="ob-tab-ic"><Icon name={x.ic} size={18} /></span>
          <div><b>{x.t}</b><small>{x.s}</small></div>
        </div>
      ))}
    </div>
  );
}

function AppTourModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="m-sheet-bg" onClick={onClose}>
      <div className="ob-card" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div className="ob-welcome-x" style={{ marginBottom: 14, fontWeight: 700, fontSize: 15 }}>Conheça o app</div>
        <AppTabsInfoGrid />
        <button className="btn btn-pri" type="button" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}


function Onboarding({ person, member, churchName, churchLogoUrl, organizationId, onCompleteOnboarding, onDone }: { person: P; member: M | null; churchName?: string; churchLogoUrl?: string | null; organizationId?: string; onCompleteOnboarding?: (personId: string, memberId: string | null, data: MemberContactInput) => Promise<{ error?: string }>; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<MemberContactInput>({
    name: member?.name ?? person.name,
    email: realValue(member?.email),
    phone: realValue(member?.phone),
    nasc: member?.birth ?? "",
    cep: member?.postalCode ?? "",
    rua: member?.street ?? "",
    bairro: member?.neighborhood ?? "",
    cidade: member?.city ?? "",
    estado: member?.state ?? "",
  });
  const [foto, setFoto] = useState<string | null>(null);
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const set = (k: keyof MemberContactInput, v: string) => setD((p) => ({ ...p, [k]: v }));
  const erros = contactErrors(d);
  const dadosOk = !Object.values(erros).some(Boolean);

  const nome = person.name.split(" ")[0];
  const push = usePush(organizationId);

  const steps = [
    {
      t: `Que bom ter você aqui, ${nome}`,
      s: "Que bom ter você aqui. Vamos completar seu cadastro, leva um minuto.",
      body: (
        <div className="ob-welcome">
          <div className="ob-mark"><Icon name="ok" size={28} /></div>
          <div className="ob-welcome-x">
            Seu acesso foi liberado. Antes de começar, confirme seus dados. O resto dá para pular.
          </div>
        </div>
      ),
      ok: "Começar →",
      valid: true,
    },
    {
      t: "Seus dados",
      s: "Confirme as informações para a igreja manter contato com você e celebrar suas datas.",
      body: <MemberContactFields d={d} set={set} erros={tentou ? erros : null} />,
      ok: "Continuar →",
      valid: dadosOk,
      onInvalid: () => setTentou(true),
    },
    {
      t: "Sua foto",
      s: "Coloque uma foto sua. Aparece no lugar das iniciais e deixa tudo com mais cara de casa.",
      body: (
        <div className="ob-foto">
          <PhotoPicker
            photoUrl={foto}
            path={`${organizationId}/kids/guardians/${person.id}`}
            onUploaded={(url) => {
              setFoto(url);
              createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", person.id);
            }}
          />
        </div>
      ),
      ok: foto ? "Continuar →" : "Pular por agora →",
      valid: true,
    },
    {
      t: "Tamanho do texto",
      s: "Escolha como fica mais confortável ler. Dá para mudar depois no Perfil.",
      body: (
        <div className="ob-textsize">
          <TextSizePicker />
        </div>
      ),
      ok: "Continuar →",
      valid: true,
    },
    {
      t: "Notificações",
      s: "Avisamos quando você for escalado, quando a igreja publicar no Mural e quando alguém responder suas mensagens. Nada além disso.",
      body: (
        <div className="ob-textsize">
          {push.pushOn ? (
            <div className="m-confirmed"><Icon name="ok" size={15} /> Notificações ligadas</div>
          ) : push.pushSupported ? (
            <button className="m6-btn pri full" type="button" disabled={push.pushBusy} onClick={push.ligarPush}><Icon name="sino" size={20} />Ligar notificações</button>
          ) : (
            <p className="ob-sub" style={{ margin: 0 }}>No iPhone, as notificações funcionam depois de colocar o app na tela de início (próximo passo).</p>
          )}
          {push.pushMsg && <p className="ob-sub" style={{ margin: "8px 0 0" }}>{push.pushMsg}</p>}
        </div>
      ),
      ok: push.pushOn ? "Continuar →" : "Pular por agora →",
      valid: true,
    },
    {
      t: "Na tela de início",
      s: "Coloque o app da igreja junto dos outros apps do celular, para abrir com um toque.",
      body: (
        <ul className="m6-facts ob-home">
          <li><Icon name="compartilhar" size={20} /><span><b>iPhone:</b> no Safari, toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.</span></li>
          <li><Icon name="menu" size={20} /><span><b>Android:</b> no Chrome, toque no menu de três pontos e depois em &quot;Instalar app&quot;.</span></li>
        </ul>
      ),
      ok: "Entrar no app →",
      valid: true,
    },
  ] as const;

  const cur = steps[step];

  const next = async () => {
    if (!cur.valid) {
      cur.onInvalid?.();
      return;
    }
    /* grava os dados já ao sair do passo "Seus dados" e só avança se gravou:
       se a pessoa fechar o app na foto, a ficha já está completa e o
       primeiro acesso não volta */
    if (step === 1 && onCompleteOnboarding) {
      setSalvando(true);
      setErroSalvar("");
      const { error } = await onCompleteOnboarding(person.id, member?.id ?? null, d);
      setSalvando(false);
      if (error) {
        setErroSalvar(error);
        return;
      }
    }
    if (step < steps.length - 1) setStep(step + 1);
    else onDone();
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
          <ChurchLockup size="sm" logoUrl={churchLogoUrl} name={churchName} />
        </div>
        <div className="ob-eyebrow">Primeiro acesso · passo {step + 1} de {steps.length}</div>
        <h2 className="ob-title">{cur.t}</h2>
        <p className="ob-sub">{cur.s}</p>
        <div className="ob-body">{cur.body}</div>
        {erroSalvar && <div style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 10 }}>{erroSalvar}</div>}
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
            disabled={salvando}
            onClick={next}
          >
            {salvando ? "Salvando..." : cur.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Campos de contato do membro, obrigatórios: usados no primeiro acesso e na
   edição do perfil (fonte única). O CEP consulta a API pública e preenche
   rua, bairro, cidade e estado, que ficam na ficha pra análises da igreja. */
export function MemberContactFields({ d, set, erros }: { d: MemberContactInput; set: (k: keyof MemberContactInput, v: string) => void; erros: ReturnType<typeof contactErrors> | null }) {
  const err = (k: keyof ReturnType<typeof contactErrors>) =>
    erros?.[k] ? <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{erros[k]}</div> : null;
  return (
    <div className="ob-form">
      <div className="field">
        <label className="field-label req">Nome e sobrenome</label>
        <input className="input" value={d.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
        {err("name")}
      </div>
      <div className="field">
        <label className="field-label req">E-mail</label>
        <input className="input" type="email" value={d.email} autoComplete="email" placeholder="voce@email.com" onChange={(e) => set("email", e.target.value)} />
        {err("email")}
      </div>
      <div className="field">
        <label className="field-label req">Telefone (WhatsApp)</label>
        <input className="input" type="tel" value={d.phone} autoComplete="tel" placeholder="(11) 90000-0000" onChange={(e) => set("phone", e.target.value)} />
        {err("phone")}
      </div>
      <div className="field">
        <label className="field-label req">Aniversário</label>
        <input className="input" type="date" value={d.nasc} onChange={(e) => set("nasc", e.target.value)} />
        {err("nasc")}
      </div>
      <div className="field">
        <label className="field-label req">CEP</label>
        <CepInput
          value={d.cep}
          onChange={(v) => set("cep", v)}
          onResult={(r) => {
            if (!r) return;
            if (r.street) set("rua", r.street);
            if (r.neighborhood) set("bairro", r.neighborhood);
            if (r.city) set("cidade", r.city);
            if (r.state) set("estado", r.state);
          }}
        />
        {err("cep")}
        {(d.cidade || d.rua) && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {[d.rua, d.cidade && d.estado ? `${d.cidade}/${d.estado}` : d.cidade].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <div className="field">
        <label className="field-label">Bairro</label>
        <input className="input" value={d.bairro} placeholder="Onde você mora" onChange={(e) => set("bairro", e.target.value)} />
      </div>
    </div>
  );
}

// ── aba: Kids (area do responsavel, drill-down do Perfil) ────────────────────────

function TabKidsArea({
  checkinHoje,
  person,
  people,
  kidsClasses,
  kidsChildren,
  childGuardians,
  kidsAttendance,
  kidsEvents,
  kidsEventEnrollments,
  wallPosts,
  organizationId,
  churchId,
}: {
  person: P;
  people: P[];
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
  /* check-in de hoje (v7 2.3), o mesmo bloco do Início */
  checkinHoje?: React.ReactNode;
}) {
  const emptyForm = { nome: "", nascimento: "", genero: "", autorizaImagem: false, alergias: "", restricoes: "", saude: "", medicamento: "", emergenciaNome: "", emergenciaTel: "", notas: "" };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fotoFilho, setFotoFilho] = useState<string | null>(null);
  const [novoFilhoId, setNovoFilhoId] = useState(() => crypto.randomUUID());
  const [ficarError, setFicarError] = useState("");
  const [enrollments, setEnrollments] = useState(kidsEventEnrollments);
  const [myChildren, setMyChildren] = useState(kidsChildren);
  const [myGuardians, setMyGuardians] = useState(childGuardians);
  const [minhaFoto, setMinhaFoto] = useState(person.photoUrl ?? null);
  const sugestaoTurmaId = suggestKidsClassId(form.nascimento, kidsClasses);
  const sugestaoTurma = kidsClasses.find((kc) => kc.id === sugestaoTurmaId);

  const meusFilhos = myChildren.filter((c) => myGuardians.some((g) => g.child_id === c.id && g.guardian_person_id === person.id));
  const kidsWall = wallPosts.filter((w) => (w.audience ?? "").toLowerCase().includes("kids")).slice(0, 5);

  const salvarMinhaFoto = (url: string) => {
    setMinhaFoto(url);
    createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", person.id);
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

  const fotoFilhoTargetId = editingId && editingId !== "novo" ? editingId : novoFilhoId;

  const salvarFilho = async () => {
    if (!form.nome.trim() || !organizationId || !churchId) return;
    if (!fotoFilho) { setFicarError("A foto da criança é obrigatória."); return; }
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
      else { setFicarError("Não consegui salvar agora."); return; }
    } else {
      const { error } = await supabase.schema("service").from("children").insert({ id: novoFilhoId, organization_id: organizationId, church_id: churchId, ...payload });
      if (!error) {
        await supabase.schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: novoFilhoId, guardian_person_id: person.id, relationship: "responsavel", can_pickup: true, is_primary: true });
        setMyChildren((prev) => [...prev, { id: novoFilhoId, church_id: churchId, ...payload } as Child]);
        setMyGuardians((prev) => [...prev, { id: `local-${novoFilhoId}`, child_id: novoFilhoId, guardian_person_id: person.id, relationship: "responsavel", can_pickup: true, is_primary: true }]);
      } else { setFicarError("Não consegui salvar agora."); return; }
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

  const isPrimaryFor = (childId: string) => myGuardians.some((g) => g.child_id === childId && g.guardian_person_id === person.id && g.is_primary);
  const guardiansOf = (childId: string) => myGuardians.filter((g) => g.child_id === childId);

  const [coForm, setCoForm] = useState({ nome: "", relationship: "", canPickup: true, photoUrl: null as string | null });
  const [coError, setCoError] = useState("");

  const adicionarCoResponsavel = async (childId: string) => {
    if (!organizationId) return;
    setCoError("");
    const matched = people.find((p) => p.name.toLowerCase().trim() === coForm.nome.toLowerCase().trim());
    if (!matched) { setCoError("Pessoa não encontrada. Ela precisa já ter cadastro no Service."); return; }
    if (matched.id === person.id) { setCoError("Você já é responsável."); return; }
    if (guardiansOf(childId).some((g) => g.guardian_person_id === matched.id)) { setCoError("Essa pessoa já é responsável."); return; }
    const photo = coForm.photoUrl ?? matched.photoUrl ?? null;
    if (!photo) { setCoError("O corresponsável precisa ter uma foto (envie abaixo)."); return; }
    const { data } = await createServiceBrowserClient().schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: childId, guardian_person_id: matched.id, relationship: coForm.relationship.trim() || null, can_pickup: coForm.canPickup, is_primary: false }).select("id,child_id,guardian_person_id,relationship,can_pickup,is_primary").single();
    if (data) {
      setMyGuardians((prev) => [...prev, data as ChildGuardian]);
      setCoForm({ nome: "", relationship: "", canPickup: true, photoUrl: null });
    } else {
      setCoError("Não consegui adicionar agora.");
    }
  };

  const removerCoResponsavel = async (guardianRowId: string) => {
    await createServiceBrowserClient().schema("service").from("child_guardians").delete().eq("id", guardianRowId);
    setMyGuardians((prev) => prev.filter((g) => g.id !== guardianRowId));
  };

  const fichaForm = (
    <div className="m-card" style={{ borderColor: "var(--olive-line)", marginTop: 10 }}>
      <PhotoPicker label="Foto da criança (obrigatória)" photoUrl={fotoFilho} path={`${organizationId}/kids/children/${fotoFilhoTargetId}`} onUploaded={setFotoFilho} />
      <input className="input" placeholder="Nome da criança" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} style={{ marginTop: 10, marginBottom: 8 }} />
      <input className="input" type="date" value={form.nascimento} onChange={(e) => setForm((f) => ({ ...f, nascimento: e.target.value }))} style={{ marginBottom: 8 }} />
      <select className="select" value={form.genero} onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))} style={{ marginBottom: 8 }}>
        <option value="">Genero (opcional)</option>
        <option value="menino">Menino</option>
        <option value="menina">Menina</option>
      </select>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (form.nascimento ? "nenhuma turma cobre essa idade ainda" : "calculada pelo nascimento")}</div>
      <input className="input" placeholder="Alergias" value={form.alergias} onChange={(e) => setForm((f) => ({ ...f, alergias: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Restrições alimentares" value={form.restricoes} onChange={(e) => setForm((f) => ({ ...f, restricoes: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Plano de saúde ou convênio" value={form.saude} onChange={(e) => setForm((f) => ({ ...f, saude: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Medicamento em uso continuo" value={form.medicamento} onChange={(e) => setForm((f) => ({ ...f, medicamento: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergencia: nome" value={form.emergenciaNome} onChange={(e) => setForm((f) => ({ ...f, emergenciaNome: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergencia: telefone" value={form.emergenciaTel} onChange={(e) => setForm((f) => ({ ...f, emergenciaTel: e.target.value }))} style={{ marginBottom: 12 }} />
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: 13, lineHeight: 1.4 }}>
        <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} style={{ marginTop: 3 }} />
        <span>{imageAuthorizationCopy(form.nome)}</span>
      </label>
      {ficarError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>{ficarError}</div>}
      <button className="m-btn m-btn-ok" style={{ width: "100%" }} onClick={salvarFilho}>Salvar</button>
    </div>
  );

  return (
    <>
      {checkinHoje}
      <div className="m-section-t">Sua foto de responsável</div>
      <PhotoPicker label="Foto do responsável" photoUrl={minhaFoto} path={`${organizationId}/kids/guardians/${person.id}`} onUploaded={salvarMinhaFoto} />

      <div className="m-section-t">Minhas crianças</div>
      {meusFilhos.map((child) => {
        const turma = kidsClasses.find((kc) => kc.id === child.class_id);
        const historico = kidsAttendance.filter((a) => a.child_id === child.id).sort((a, b) => b.dropped_off_at.localeCompare(a.dropped_off_at)).slice(0, 3);
        return (
          <div key={child.id}>
            <button className="m-card" style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => abrirEdicao(child)}>
              <div className="m-vis-head">
                <Av name={child.name} size="sm" photoUrl={child.photo_url} />
                <div className="m-vis-main">
                  <div className="m-culto" style={{ fontSize: 14 }}>{child.name}</div>
                  <div className="m-fn">{turma?.name ?? "sem turma"}{child.allergies ? ` · ⚠ ${child.allergies}` : ""}</div>
                </div>
                <span className="m-task-caret">✎</span>
              </div>
              {historico.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--subtle)" }}>
                  {historico.map((h) => <div key={h.id}>{formatDateBR(h.dropped_off_at.slice(0, 10))} · {h.status === "retirado" ? "retirado" : "na sala"}</div>)}
                </div>
              )}
            </button>
            {editingId === child.id && (
              <>
                {fichaForm}
                <div className="m-card" style={{ marginTop: 8 }}>
                  <div className="m-when" style={{ marginBottom: 8 }}>Responsaveis autorizados a retirar</div>
                  {guardiansOf(child.id).map((g) => {
                    const p = people.find((pp) => pp.id === g.guardian_person_id);
                    return (
                      <div className="m-vis-head" key={g.id} style={{ marginBottom: 8 }}>
                        <Av name={p?.name ?? "?"} size="sm" photoUrl={p?.photoUrl} />
                        <div className="m-vis-main">
                          <div className="m-culto" style={{ fontSize: 13 }}>{p?.name ?? "Responsavel"}{g.is_primary ? " · principal" : ""}</div>
                          <div className="m-fn">{g.relationship || "sem parentesco informado"}</div>
                        </div>
                        {isPrimaryFor(child.id) && !g.is_primary && (
                          <button className="ob-foto-remover" type="button" onClick={() => removerCoResponsavel(g.id)}>Remover</button>
                        )}
                      </div>
                    );
                  })}
                  {isPrimaryFor(child.id) ? (
                    <>
                      <div className="cell-sub" style={{ margin: "10px 0" }}>Só você, como responsável principal, pode adicionar corresponsáveis.</div>
                      <input className="input" list="service-mobile-people-names" placeholder="Nome (já precisa ter cadastro)" value={coForm.nome} onChange={(e) => setCoForm((f) => ({ ...f, nome: e.target.value, photoUrl: people.find((p) => p.name === e.target.value)?.photoUrl ?? null }))} style={{ marginBottom: 8 }} />
                      <datalist id="service-mobile-people-names">
                        {people.map((p) => <option key={p.id} value={p.name} />)}
                      </datalist>
                      <input className="input" placeholder="Parentesco (mãe, avó, tio...)" value={coForm.relationship} onChange={(e) => setCoForm((f) => ({ ...f, relationship: e.target.value }))} style={{ marginBottom: 8 }} />
                      {coForm.nome && !coForm.photoUrl && (
                        <div style={{ marginBottom: 8 }}>
                          <PhotoPicker label="Foto do corresponsável (obrigatória)" photoUrl={coForm.photoUrl} path={`${organizationId}/kids/guardians/${people.find((p) => p.name === coForm.nome)?.id ?? "novo"}`} onUploaded={(url) => setCoForm((f) => ({ ...f, photoUrl: url }))} />
                        </div>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                        <input type="checkbox" checked={coForm.canPickup} onChange={(e) => setCoForm((f) => ({ ...f, canPickup: e.target.checked }))} /> Pode retirar
                      </label>
                      {coError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>{coError}</div>}
                      <button className="m-btn m-btn-swap" style={{ width: "100%" }} onClick={() => adicionarCoResponsavel(child.id)}>+ Adicionar corresponsável</button>
                    </>
                  ) : (
                    <div className="cell-sub">Só o responsável principal pode adicionar outros corresponsáveis.</div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
      {meusFilhos.length === 0 && <div className="cell-sub" style={{ marginBottom: 4 }}>Você ainda não tem nenhuma criança vinculada por aqui.</div>}

      <button className="m-btn m-btn-swap" style={{ width: "100%", marginTop: 10 }} onClick={abrirNovo}>
        {editingId === "novo" ? "Cancelar" : "+ Adicionar criança"}
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
          <div className="m-section-t" style={{ marginTop: 22 }}>Eventos de crianças</div>
          {kidsEvents.map((event) => (
            <div className="m-card" key={event.id}>
              <div className="m-culto">{event.title}</div>
              <div className="m-fn">{[event.event_date, event.time, event.location].filter(Boolean).join(" · ") || "sem data definida"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {meusFilhos.map((child) => {
                  const inscrito = enrollments.some((e) => e.kids_event_id === event.id && e.child_id === child.id);
                  return (
                    <button key={child.id} className={`chip ${inscrito ? "chip-ok" : "chip-neutral"}`} type="button" disabled={inscrito} onClick={() => inscrever(event.id, child.id)}>
                      {child.name.split(" ")[0]}{inscrito ? <> <Icon name="ok" size={13} /></> : " + inscrever"}
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

// ── App do membro v6: 5 destinos fixos, uma ação por cartão ───────────────────
/* Início · Agenda · Mensagens · Caminhada · Perfil, na mesma ordem para todo
   mundo (S15). Cada função mora numa aba de casa (registro MEMBER_MODULES) e
   pode aparecer como cartão em "Para você agora". Nenhum módulo cria aba:
   um módulo novo (Contribuir, Eventos com inscrição, Meu grupo) entra no
   registro sem mexer na barra. */

type MemberTab = "inicio" | "agenda" | "mensagens" | "caminhada" | "perfil";
const MEMBER_TABS: { id: MemberTab; l: string; ic: string }[] = [
  { id: "inicio", l: "Início", ic: "inicio" },
  { id: "agenda", l: "Agenda", ic: "agenda" },
  { id: "mensagens", l: "Mensagens", ic: "conversas" },
  { id: "caminhada", l: "Caminhada", ic: "cursos" },
  { id: "perfil", l: "Perfil", ic: "perfil" },
];

type ModuleCtx = { serves: boolean; isRecep: boolean; isKids: boolean; isGuardian: boolean };
type MemberModule = {
  id: string;
  /* aba onde o módulo mora */
  home: MemberTab;
  /* título da tela própria (quando abre como subtela com "voltar") */
  title?: string;
  /* quem vê */
  visible: (c: ModuleCtx) => boolean;
  /* tipo de notificação que o módulo dispara (push) */
  notify?: "escala" | "mural" | "mensagem" | "caminhada";
};
const MEMBER_MODULES: MemberModule[] = [
  { id: "escala", home: "agenda", visible: (c) => c.serves, notify: "escala" },
  { id: "tarefas", home: "agenda", visible: (c) => c.serves },
  { id: "visitantes", home: "agenda", title: "Visitantes", visible: (c) => c.isRecep },
  { id: "kids-sala", home: "agenda", title: "Sala do Kids", visible: (c) => c.isKids },
  { id: "mural", home: "mensagens", title: "Mural da igreja", visible: () => true, notify: "mural" },
  { id: "conversas", home: "mensagens", visible: () => true, notify: "mensagem" },
  { id: "cursos", home: "caminhada", title: "Cursos", visible: () => true, notify: "caminhada" },
  { id: "batismo", home: "caminhada", title: "Batismo", visible: () => true },
  { id: "biblia", home: "caminhada", title: "Bíblia", visible: () => true },
  { id: "dados", home: "perfil", title: "Meus dados", visible: () => true },
  { id: "senha", home: "perfil", title: "Trocar senha", visible: () => true },
  { id: "familia", home: "perfil", title: "Minha família", visible: () => true },
];
const moduleTitle = (id: string) => MEMBER_MODULES.find((m) => m.id === id)?.title ?? "";

/* casca: folha de baixo, aviso com "Desfazer" e navegação entre abas */
type MemberUi = {
  go: (tab: MemberTab, sub?: string | null, extra?: { agSeg?: "minha" | "igreja"; chatId?: string | null; newChat?: boolean }) => void;
  sheet: (el: React.ReactNode | null) => void;
  toast: (msg: string, action?: { label: string; fn: () => void }) => void;
};
const MemberUiContext = createContext<MemberUi>({ go: () => {}, sheet: () => {}, toast: () => {} });

function M6Row({ ic, t, s, onClick, right, cls }: { ic?: string; t: React.ReactNode; s?: React.ReactNode; onClick?: () => void; right?: React.ReactNode | null; cls?: string }) {
  return (
    <button type="button" className={`m6-row${cls ? ` ${cls}` : ""}`} onClick={onClick}>
      {ic && <span className="m6-ic"><Icon name={ic} size={22} /></span>}
      <span className="m6-rb">
        <span className="m6-rt">{t}</span>
        {s ? <span className="m6-rs">{s}</span> : null}
      </span>
      {right !== undefined ? right : <span className="m6-chev"><Icon name="avancar" size={18} /></span>}
    </button>
  );
}

function M6Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="m6-scrim" onClick={onClose}>
      <div className="m6-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="m6-grab" />
        {children}
      </div>
    </div>
  );
}

function M6St({ k, ic, children }: { k: "ok" | "warn" | "neutral" | "danger"; ic?: string; children: React.ReactNode }) {
  return <span className={`m6-st ${k}`}>{ic && <Icon name={ic} size={16} />}<span>{children}</span></span>;
}

/* data em bloquinho: "DOM 04" */
function M6Date({ iso }: { iso: string }) {
  const d = parseISODate(iso);
  if (!d) return <span className="m6-date"><span>·</span><b>·</b></span>;
  const dia = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][d.getDay()];
  return <span className="m6-date"><span>{dia}</span><b>{String(d.getDate()).padStart(2, "0")}</b></span>;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function dataLonga(iso?: string | null) {
  const d = parseISODate(iso);
  if (!d) return "";
  return `${weekdayFromISO(iso)}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/* quem lidera os times da pessoa (ou qualquer líder, se ela não serve) */
function leadersFor(person: P, ministries: Ministry[], members: M[], only?: (m: Ministry) => boolean) {
  const mine = ministries.filter((m) => m.people.some((mp) => mp.personId === person.id));
  const pool = (only ? ministries.filter(only) : mine.length ? mine : ministries);
  const out: { member: M; ministry: Ministry }[] = [];
  for (const min of pool) {
    for (const lp of min.people.filter((x) => x.isLeader)) {
      const lm = members.find((m) => m.volunteerId === lp.personId);
      if (lm && lm.volunteerId !== person.id && !out.some((o) => o.member.id === lm.id)) out.push({ member: lm, ministry: min });
    }
  }
  return out;
}

// ── cartão de escala (S18) ────────────────────────────────────────────────────
/* Confirmar e Não posso de 52px. A resposta só vai pro banco depois de alguns
   segundos: dá tempo de tocar em "Desfazer" no aviso. Pedir troca abre uma
   conversa com o líder do time, com a mensagem já escrita. */
const UNDO_MS = 5000;
function EscalaCard({ slot, ev, ministry, person, member, members, onConfirmarEscala, onRecusarEscala, onStartChat }: {
  slot: Slot; ev: Ev; ministry?: Ministry; person: P; member: M | null; members: M[];
  onConfirmarEscala?: (id: string) => void; onRecusarEscala?: (id: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  const [st, setSt] = useState(slot.status);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* resposta esperando o "Desfazer": se o cartão sair da tela antes (trocou
     de aba), grava na hora em vez de perder */
  const pendente = useRef<(() => void) | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    pendente.current?.();
  }, []);
  const funcao = ministry?.positions?.find((p) => p.id === slot.position_id)?.name;
  const responder = (v: "ok" | "no") => {
    const antes = st;
    setSt(v);
    if (timer.current) clearTimeout(timer.current);
    const gravar = () => {
      timer.current = null;
      pendente.current = null;
      if (v === "ok") onConfirmarEscala?.(slot.id); else onRecusarEscala?.(slot.id);
    };
    pendente.current = gravar;
    timer.current = setTimeout(gravar, UNDO_MS);
    ui.toast(v === "ok" ? "Presença confirmada" : `Avisamos o líder${ministry ? ` do ${ministry.name}` : ""}`, {
      label: "Desfazer",
      fn: () => { if (timer.current) clearTimeout(timer.current); timer.current = null; pendente.current = null; setSt(antes); },
    });
  };
  const pedirTroca = async () => {
    const lider = ministry ? leadersFor(person, [ministry], members, () => true)[0] : leadersFor(person, [], members)[0];
    if (!member || !lider || !onStartChat) { ui.toast("Não achamos o líder do time. Fale com a liderança."); return; }
    const id = await onStartChat(member.id, lider.member.id, `Oi! Preciso trocar minha escala de ${joinDot(ev.name, dataLonga(ev.eventDate), ev.time)}. Pode me ajudar?`);
    if (id) { ui.toast("Pedido de troca enviado ao líder"); ui.go("mensagens", null, { chatId: id }); }
  };
  return (
    <div className="m6-card">
      <div className="m6-kick">{st === "wait" ? "Escala para confirmar" : "Sua escala"}</div>
      <div className="m6-ct">{ev.name}</div>
      <ul className="m6-facts">
        <li><Icon name="agenda" size={20} /><span>{joinDot(dataLonga(ev.eventDate) || ev.weekday, ev.time)}</span></li>
        {(ministry || funcao) && <li><Icon name="times" size={20} /><span>{joinDot(ministry?.name, funcao)}</span></li>}
        {ev.location && <li><Icon name="mapapin" size={20} /><span>{ev.location}</span></li>}
      </ul>
      {st === "wait" && (
        <div className="m6-btns">
          <button className="m6-btn pri" type="button" onClick={() => responder("ok")}><Icon name="ok" size={20} />Confirmar</button>
          <button className="m6-btn sec" type="button" onClick={() => responder("no")}>Não posso</button>
        </div>
      )}
      {st === "ok" && (
        <div className="m6-after">
          <M6St k="ok" ic="ok">Presença confirmada</M6St>
          {onStartChat && <button type="button" className="m6-link" onClick={pedirTroca}>Pedir troca</button>}
        </div>
      )}
      {st === "no" && (
        <div className="m6-after">
          <M6St k="warn" ic="recusou">Você avisou que não pode</M6St>
          <button type="button" className="m6-link" onClick={() => responder("ok")}>Mudei de ideia</button>
        </div>
      )}
    </div>
  );
}

function EventoRow({ ev }: { ev: Ev }) {
  return (
    <div className="m6-row">
      <M6Date iso={ev.eventDate} />
      <div className="m6-rb">
        <div className="m6-rt">{ev.name}</div>
        <div className="m6-rs">{joinDot(ev.weekday, ev.time, ev.location)}</div>
      </div>
    </div>
  );
}

// ── pedido de oração: vai como conversa para quem cuida da intercessão ──────
function SheetOracao({ person, member, ministries, members, onStartChat }: {
  person: P; member: M | null; ministries: Ministry[]; members: M[];
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  const [txt, setTxt] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const interc = (m: Ministry) => m.icon === "intercessao" || /interce|ora[cç][aã]o/i.test(m.name);
  const destino = leadersFor(person, ministries, members, interc)[0] ?? leadersFor(person, ministries, members)[0];
  if (ok) {
    return (
      <div className="m6-donesh">
        <span className="m6-dot feito big"><Icon name="ok" size={28} /></span>
        <h2 className="m6-sh">Pedido enviado</h2>
        <p className="m6-txt">{destino ? `${destino.member.name.split(" ")[0]} recebeu e vai orar por você.` : "A liderança recebeu seu pedido."} A conversa fica em Mensagens.</p>
        <div className="m6-btns"><button className="m6-btn pri" type="button" onClick={() => ui.sheet(null)}>Fechar</button></div>
      </div>
    );
  }
  return (
    <div>
      <h2 className="m6-sh">Pedido de oração</h2>
      <div className="m6-meta">{destino ? `Vai para ${destino.member.name.split(" ")[0]}${interc(destino.ministry) ? ", da intercessão" : ", da liderança"}. Só essa pessoa lê.` : "Ainda não há um líder no app para receber."}</div>
      <textarea className="m6-ta" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Pelo que podemos orar?" aria-label="Pedido de oração" />
      <div className="m6-btns">
        <button className="m6-btn pri" type="button" disabled={!txt.trim() || !destino || !member || !onStartChat || enviando} onClick={async () => {
          if (!destino || !member || !onStartChat) return;
          setEnviando(true);
          const id = await onStartChat(member.id, destino.member.id, `Pedido de oração: ${txt.trim()}`);
          setEnviando(false);
          if (id) setOk(true); else ui.toast("Não foi possível enviar agora. Tente de novo.");
        }}>{enviando ? "Enviando..." : "Enviar pedido"}</button>
      </div>
    </div>
  );
}

// ── check-in Kids pelo app (v7 2.3) ───────────────────────────────────────────
/* No dia do culto, um bloco por filho com o check-in. Abre 60 minutos antes
   do culto; a mesma lógica da rota do QR (lib/kids-checkin.ts). Aparece no
   Início e em Minha família. */
function cultoDeHoje(events: Ev[]): Ev | null {
  const hoje = todayISO();
  const doDia = events.filter((e) => e.eventDate === hoje).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  if (!doDia.length) return null;
  /* o próximo que ainda não terminou (2h depois do início), senão o último */
  const agora = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const fim = (t: string) => { const m = (t ?? "").match(/^(\d{1,2}):(\d{2})/); return m ? `${String(Math.min(23, Number(m[1]) + 2)).padStart(2, "0")}:${m[2]}` : "23:59"; };
  return doDia.find((e) => fim(e.time) >= agora) ?? doDia[doDia.length - 1];
}

function CheckinKidsHoje({ person, events, kidsChildren, childGuardians, kidsClasses, kidsSessions, kidsAttendance, organizationId }: {
  person: P; events: Ev[]; kidsChildren: Child[]; childGuardians: ChildGuardian[]; kidsClasses: KidsClass[];
  kidsSessions: KidsSession[]; kidsAttendance: KidsAttendance[]; organizationId?: string;
}) {
  const culto = cultoDeHoje(events);
  const vinculos = childGuardians.filter((g) => g.guardian_person_id === person.id);
  const filhos = vinculos.map((g) => kidsChildren.find((c) => c.id === g.child_id)).filter(Boolean) as Child[];
  const inicial: Record<string, { id: string; status: string }> = {};
  if (culto) {
    for (const c of filhos) {
      const sessao = kidsSessions.find((ks) => ks.event_id === culto.id && ks.class_id === c.class_id);
      const att = sessao ? kidsAttendance.find((a) => a.session_id === sessao.id && a.child_id === c.id && a.status !== "retirado") : undefined;
      if (att) inicial[c.id] = { id: att.id, status: att.status };
    }
  }
  const router = useRouter();
  const ck = useKidsCheckin({
    organizationId, personId: person.id, inicial,
    sessionFor: (childId) => (culto ? sessaoDoCulto(culto.id, childId) : Promise.resolve(null)),
    aoMudar: () => router.refresh(),
  });
  /* a hora de abrir passa com a tela aberta */
  const [, setTick] = useState(0);
  useEffect(() => { const h = setInterval(() => setTick((t) => t + 1), 60000); return () => clearInterval(h); }, []);
  if (!culto || !filhos.length) return null;
  const abre = horaQueAbre(culto.time);
  const aberto = checkinAberto(culto.time);
  return (
    <div className="m6-card">
      <div className="m6-kick">Kids hoje</div>
      <div className="m6-ct">{joinDot(culto.name, culto.time)}</div>
      {!aberto && abre && <div className="m6-meta">O check-in abre às {abre}, 1 hora antes do culto.</div>}
      {filhos.map((c, i) => {
        const att = ck.attendance[c.id];
        const turma = kidsClasses.find((kc) => kc.id === c.class_id);
        const podeRetirar = vinculos.find((g) => g.child_id === c.id)?.can_pickup;
        const busy = ck.loadingChild === c.id;
        return (
          <div key={c.id} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Av name={c.name} photoUrl={c.photo_url} />
              <div className="m6-rb">
                <div className="m6-rt">{c.name.split(" ")[0]}</div>
                <div className="m6-rs">{turma ? joinDot(turma.name, statusDaCrianca(att)) : "Sem turma: fale com a recepção do Kids"}</div>
              </div>
            </div>
            {turma && !att && aberto && (
              <div className="m6-btns"><button className={`m6-btn ${i === 0 ? "pri" : "sec"}`} type="button" disabled={busy} onClick={() => ck.checkin(c.id)}>{busy ? "Aguarde..." : `Fazer check-in de ${c.name.split(" ")[0]}`}</button></div>
            )}
            {att?.status === "presente" && podeRetirar && (
              <div className="m6-btns"><button className="m6-btn sec" type="button" disabled={busy} onClick={() => ck.pedirRetirada(c.id)}>{busy ? "Aguarde..." : "Solicitar retirada"}</button></div>
            )}
          </div>
        );
      })}
      {ck.error && <div className="m6-meta" style={{ color: "var(--danger)", marginTop: 8 }}>{ck.error}</div>}
    </div>
  );
}

// ── Início (S17) ──────────────────────────────────────────────────────────────
function InicioV6({ person, member, ministries, members, events, roster, cards, announcements, unreadIds, kidsChildren, childGuardians, kidsCheckin, onConfirmarEscala, onRecusarEscala, onStartChat, nextStep, onServir }: {
  person: P; member: M | null; ministries: Ministry[]; members: M[]; events: Ev[]; roster: Slot[]; cards: Card[];
  announcements: Announcement[]; unreadIds: Set<string>; kidsChildren: Child[]; childGuardians: ChildGuardian[];
  kidsCheckin?: React.ReactNode;
  onConfirmarEscala?: (id: string) => void; onRecusarEscala?: (id: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  nextStep: StepView | null;
  onServir: () => void;
}) {
  const ui = useContext(MemberUiContext);
  const hoje = todayISO();
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const evById = new Map(events.map((e) => [e.id, e]));
  const aConfirmar = roster
    .filter((r) => r.person_id === person.id && r.status === "wait")
    .filter((r) => (evById.get(r.event_id)?.eventDate ?? "") >= hoje)
    .sort((a, b) => (evById.get(a.event_id)?.eventDate ?? "").localeCompare(evById.get(b.event_id)?.eventDate ?? ""));
  const minhasTarefas = cards.filter((c) => c.assignees.includes(person.id) && c.column_id !== "done" && c.due);
  const tarefa = [...minhasTarefas].sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))[0];
  const novo = announcements.find((a) => unreadIds.has(a.id));
  const meusFilhos = childGuardians.filter((g) => g.guardian_person_id === person.id).map((g) => kidsChildren.find((c) => c.id === g.child_id)).filter(Boolean) as Child[];
  const cultoHoje = events.find((e) => e.eventDate === hoje);
  const proximos = events.filter((e) => e.eventDate >= hoje).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time));
  const timesAbertos = ministries.filter((m) => !m.people.some((mp) => mp.personId === person.id));
  const ministryOf = (slot: Slot) => ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  const incompleto = member && !member.contactComplete;

  return (
    <>
      <div className="m6-sec0">
        <div className="m6-lbl">Para você agora</div>
        {incompleto && (
          <div className="m6-card">
            <div className="m6-kick">Seu cadastro</div>
            <div className="m6-ct">Complete seu cadastro</div>
            <div className="m6-meta">Faltam alguns dados para a igreja manter contato com você.</div>
            <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={() => ui.go("perfil", "dados")}>Completar →</button></div>
          </div>
        )}
        {aConfirmar.slice(0, 2).map((slot) => {
          const ev = evById.get(slot.event_id);
          return ev ? <EscalaCard key={slot.id} slot={slot} ev={ev} ministry={ministryOf(slot)} person={person} member={member} members={members} onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala} onStartChat={onStartChat} /> : null;
        })}
        {meusFilhos.length > 0 && cultoHoje && kidsCheckin}
        {serve && tarefa && (
          <div className="m6-card">
            <div className="m6-kick">Tarefa com prazo</div>
            <div className="m6-ct">{tarefa.title}</div>
            <div className="m6-meta">Prazo · {formatDateBR(tarefa.due)}</div>
            <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={() => ui.go("agenda", null, { agSeg: "minha" })}>Ver minhas tarefas</button></div>
          </div>
        )}
        {novo && (
          <div className="m6-card">
            <div className="m6-kick"><Icon name="bandeira" size={16} />Novo no Mural</div>
            <div className="m6-ct">{novo.title}</div>
            {novo.when_label && <div className="m6-meta">{novo.when_label}</div>}
            <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={() => ui.go("mensagens", "mural")}>Ler a publicação</button></div>
          </div>
        )}
        {nextStep && (
          <div className="m6-card">
            <div className="m6-kick">Seu próximo passo</div>
            <div className="m6-ct">{nextStep.nome}</div>
            {nextStep.info && <div className="m6-meta">{nextStep.info}</div>}
            <div className="m6-btns"><button className={`m6-btn ${nextStep.st === "andamento" ? "pri" : "sec"}`} type="button" onClick={() => (nextStep.run ? nextStep.run() : ui.go("caminhada"))}>{nextStep.acao ?? "Ver a caminhada"} →</button></div>
          </div>
        )}
        {!serve && timesAbertos.length > 0 && (
          <div className="m6-card">
            <div className="m6-kick">Servir</div>
            <div className="m6-ct">{timesAbertos.length === 1 ? "1 time procura pessoas" : `${timesAbertos.length} times procuram pessoas`}</div>
            <div className="m6-meta">{timesAbertos.slice(0, 3).map((m) => m.name).join(", ")}. Veja o que cada um faz antes de decidir.</div>
            <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={onServir}>Conhecer os times</button></div>
          </div>
        )}
        {!incompleto && aConfirmar.length === 0 && !tarefa && !novo && !nextStep && (serve || timesAbertos.length === 0) && (
          <div className="m6-card"><div className="m6-ct">Tudo em dia</div><div className="m6-meta">Quando a liderança precisar de você, aparece aqui.</div></div>
        )}
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Na igreja</div>
        {proximos.length > 0 ? (
          <div className="m6-list">{proximos.slice(0, 3).map((ev) => <EventoRow key={ev.id} ev={ev} />)}</div>
        ) : (
          <div className="m6-card"><div className="m6-meta">Os próximos cultos e eventos aparecem aqui.</div></div>
        )}
        <div className="m6-more"><button type="button" className="m6-link" onClick={() => ui.go("agenda", null, { agSeg: "igreja" })}>Ver a agenda completa →</button></div>
      </div>

      <div className="m6-sec">
        <div className="m6-card">
          <div className="m6-ct">Podemos orar por você?</div>
          <div className="m6-meta">Seu pedido vai para quem cuida da intercessão, com cuidado.</div>
          <div className="m6-btns">
            <button className="m6-btn sec" type="button" onClick={() => ui.sheet(<SheetOracao person={person} member={member} ministries={ministries} members={members} onStartChat={onStartChat} />)}>
              <Icon name="coracao" size={20} />Enviar pedido de oração
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Agenda (S19) ──────────────────────────────────────────────────────────────
function AgendaV6({ seg, setSeg, person, member, members, ministries, events, roster, cards, boards, isRecep, isKids, onConfirmarEscala, onRecusarEscala, onStartChat, onAddCardComment, onSaveAvailability, aulas }: {
  onSaveAvailability?: (availability: Record<string, boolean>) => Promise<boolean>;
  aulas?: React.ReactNode;
  seg: "minha" | "igreja"; setSeg: (s: "minha" | "igreja") => void;
  person: P; member: M | null; members: M[]; ministries: Ministry[]; events: Ev[]; roster: Slot[]; cards: Card[]; boards: Board[];
  isRecep: boolean; isKids: boolean;
  onConfirmarEscala?: (id: string) => void; onRecusarEscala?: (id: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  onAddCardComment?: (cardId: string, author: string, body: string) => void;
}) {
  const ui = useContext(MemberUiContext);
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const atual = serve ? seg : "igreja";
  const hoje = todayISO();
  const evById = new Map(events.map((e) => [e.id, e]));
  const meus = roster
    .filter((r) => r.person_id === person.id && (evById.get(r.event_id)?.eventDate ?? "") >= hoje)
    .sort((a, b) => (evById.get(a.event_id)?.eventDate ?? "").localeCompare(evById.get(b.event_id)?.eventDate ?? ""));
  const pend = meus.filter((r) => r.status === "wait");
  const outras = meus.filter((r) => r.status !== "wait");
  const ministryOf = (slot: Slot) => ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  const avisarFalta = async () => {
    const lider = leadersFor(person, ministries, members)[0];
    if (!member || !lider || !onStartChat) { ui.toast("Não achamos o líder do seu time."); return; }
    const id = await onStartChat(member.id, lider.member.id, "Oi! Queria avisar que vou faltar num dos próximos cultos. Posso te contar qual?");
    if (id) ui.go("mensagens", null, { chatId: id });
  };
  const futuros = events.filter((e) => e.eventDate >= hoje).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time));
  const semanaDe = (iso: string) => {
    const d = parseISODate(iso);
    if (!d) return "Sem data";
    const h = parseISODate(hoje)!;
    const dias = Math.floor((d.getTime() - h.getTime()) / 86400000);
    if (dias < 7 - h.getDay()) return "Esta semana";
    if (dias < 14 - h.getDay()) return "Próxima semana";
    return `${MESES[d.getMonth()].charAt(0).toUpperCase()}${MESES[d.getMonth()].slice(1)}`;
  };
  const grupos = [...new Set(futuros.map((e) => semanaDe(e.eventDate)))];

  return (
    <>
      {serve && (
        <div className="m6-segwrap">
          <div className="ts-seg two m6-seg" role="radiogroup" aria-label="O que ver">
            {([["minha", "Minha escala"], ["igreja", "Igreja"]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={atual === v} className={atual === v ? "on" : ""} onClick={() => setSeg(v)}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {aulas}
      {atual === "minha" ? (
        <>
          {pend.length > 0 && (
            <div className="m6-sec">
              <div className="m6-lbl">A confirmar · {pend.length}</div>
              {pend.map((slot) => {
                const ev = evById.get(slot.event_id);
                return ev ? <EscalaCard key={slot.id} slot={slot} ev={ev} ministry={ministryOf(slot)} person={person} member={member} members={members} onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala} onStartChat={onStartChat} /> : null;
              })}
            </div>
          )}
          <div className="m6-sec">
            <div className="m6-lbl">Próximas</div>
            {outras.length > 0 ? (
              <div className="m6-list">
                {outras.map((slot) => {
                  const ev = evById.get(slot.event_id);
                  if (!ev) return null;
                  const min = ministryOf(slot);
                  return (
                    <div className="m6-row" key={slot.id}>
                      <M6Date iso={ev.eventDate} />
                      <div className="m6-rb">
                        <div className="m6-rt">{ev.name}</div>
                        <div className="m6-rs">{joinDot(ev.time, min?.name, min?.positions?.find((p) => p.id === slot.position_id)?.name)}</div>
                        <div className="m6-mt">{slot.status === "ok" ? <M6St k="ok" ic="ok">Confirmado</M6St> : <M6St k="warn" ic="recusou">Você não pode</M6St>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="m6-card"><div className="m6-meta">{pend.length ? "As escalas confirmadas aparecem aqui." : "Nenhuma escala marcada para você por enquanto."}</div></div>
            )}
          </div>
          <div className="m6-sec m6-legacy">
            <TabTarefas person={person} cards={cards} boards={boards} onAddCardComment={onAddCardComment} />
          </div>
          {(isRecep || isKids) && (
            <div className="m6-sec">
              <div className="m6-lbl">No seu time</div>
              <div className="m6-list">
                {isRecep && <M6Row ic="visitante" t="Visitantes" s="Cadastrar e acompanhar quem chegou" onClick={() => ui.go("agenda", "visitantes")} />}
                {isKids && <M6Row ic="kids" t="Sala do Kids" s="Check-in, presença e retirada" onClick={() => ui.go("agenda", "kids-sala")} />}
              </div>
            </div>
          )}
          <div className="m6-sec">
            <div className="m6-lbl">Quando posso servir</div>
            {onSaveAvailability ? <Disponibilidade person={person} onSave={onSaveAvailability} /> : null}
            <div className="m6-pad"><button className="m6-btn sec full" type="button" onClick={avisarFalta}>Avisar que vou faltar</button></div>
          </div>
        </>
      ) : (
        futuros.length > 0 ? grupos.map((g) => (
          <div className="m6-sec" key={g}>
            <div className="m6-lbl">{g}</div>
            <div className="m6-list">{futuros.filter((e) => semanaDe(e.eventDate) === g).map((ev) => <EventoRow key={ev.id} ev={ev} />)}</div>
          </div>
        )) : (
          <div className="m6-sec"><div className="m6-card"><div className="m6-ct">Agenda vazia</div><div className="m6-meta">Os cultos e eventos da igreja aparecem aqui assim que forem marcados.</div></div></div>
        )
      )}
    </>
  );
}

// ── Mensagens (S20) ───────────────────────────────────────────────────────────
function RespostaEvento({ id, inicial, onRespond }: { id: string; inicial: "vou" | "nao" | null; onRespond: (id: string, r: "vou" | "nao" | null) => Promise<boolean> }) {
  const ui = useContext(MemberUiContext);
  const [r, setR] = useState(inicial);
  const set = async (v: "vou" | "nao" | null) => {
    const antes = r;
    setR(v);
    const ok = await onRespond(id, v);
    if (!ok) setR(antes);
    else if (v) ui.toast(`Resposta enviada · ${v === "vou" ? "Vou" : "Não vou"}`);
  };
  if (r) {
    return (
      <div className="m6-after">
        <M6St k={r === "vou" ? "ok" : "neutral"} ic={r === "vou" ? "ok" : "recusou"}>{r === "vou" ? "Você vai" : "Você não vai"}</M6St>
        <button type="button" className="m6-link" onClick={() => set(null)}>Mudar resposta</button>
      </div>
    );
  }
  return (
    <div className="m6-btns">
      <button className="m6-btn pri" type="button" onClick={() => set("vou")}>Vou</button>
      <button className="m6-btn sec" type="button" onClick={() => set("nao")}>Não vou</button>
    </div>
  );
}

/* "Quando posso servir": uma chave por culto que se repete (S19) */
const DISPONIBILIDADE: { key: string; nome: string }[] = [
  { key: "dom_m", nome: "Domingo de manhã" },
  { key: "dom_n", nome: "Domingo à noite" },
  { key: "qua", nome: "Quarta à noite" },
];
function Disponibilidade({ person, onSave }: { person: P; onSave: (a: Record<string, boolean>) => Promise<boolean> }) {
  const [disp, setDisp] = useState<Record<string, boolean>>(() => {
    const atual = person.availability ?? {};
    return Object.fromEntries(DISPONIBILIDADE.map((d) => [d.key, atual[d.key] ?? true]));
  });
  const trocar = async (key: string) => {
    const novo = { ...disp, [key]: !disp[key] };
    setDisp(novo);
    if (!(await onSave(novo))) setDisp(disp);
  };
  return (
    <div className="m6-list">
      {DISPONIBILIDADE.map((d) => (
        <div className="m6-row" key={d.key}>
          <span className="m6-rb">
            <span className="m6-rt">{d.nome}</span>
            <span className="m6-rs">{disp[d.key] ? "O líder pode escalar você" : "O líder não vai escalar você"}</span>
          </span>
          <button type="button" role="switch" aria-checked={disp[d.key]} aria-label={d.nome} className={`m6-tg${disp[d.key] ? " on" : ""}`} onClick={() => trocar(d.key)} />
        </div>
      ))}
    </div>
  );
}

function MuralV6({ announcements, unreadIds, person, onReadAnnouncement, responses = [], onRespond }: {
  announcements: Announcement[]; unreadIds: Set<string>; person: P;
  onReadAnnouncement?: (personId: string, announcementId: string) => void;
  responses?: { announcement_id: string; response: "vou" | "nao" }[];
  onRespond?: (announcementId: string, response: "vou" | "nao" | null) => Promise<boolean>;
}) {
  /* "Nova" fica marcada nesta visita; abrir o Mural registra a leitura */
  const [novas] = useState(() => new Set(unreadIds));
  const enviado = useRef(new Set<string>());
  useEffect(() => {
    announcements.forEach((a) => {
      if (!unreadIds.has(a.id) || enviado.current.has(a.id)) return;
      enviado.current.add(a.id);
      onReadAnnouncement?.(person.id, a.id);
    });
  }, [announcements, unreadIds, person.id, onReadAnnouncement]);
  if (announcements.length === 0) {
    return <div className="m6-sec0"><div className="m6-card"><div className="m6-ct">Nada no Mural ainda</div><div className="m6-meta">As publicações da igreja aparecem aqui.</div></div></div>;
  }
  return (
    <div className="m6-sec0">
      {announcements.map((a) => (
        <article className="m6-card" key={a.id}>
          {novas.has(a.id) && <span className="m6-new">Nova</span>}
          <div className="m6-ct">{a.title}</div>
          {a.body && <p className="m6-txt">{a.body}</p>}
          <div className="m6-meta">{joinDot(a.when_label, a.audience ? `para ${a.audience}` : null)}</div>
          {a.kind === "evento" && onRespond && <RespostaEvento id={a.id} inicial={responses.find((r) => r.announcement_id === a.id)?.response ?? null} onRespond={onRespond} />}
        </article>
      ))}
      <p className="m6-help">Quando você abre o Mural, a igreja sabe que a mensagem chegou.</p>
    </div>
  );
}

// ── Caminhada (S21, S22, S23, S43) ────────────────────────────────────────────
type StepView = { id: JourneyStep; nome: string; st: "feito" | "andamento" | "afazer"; info?: string; acao?: string; run?: () => void };
const STW = { feito: "Concluída", andamento: "Em andamento", afazer: "A fazer" } as const;

function useSteps({ person, member, ministries, courses, enrollments, courseModules = [], courseLessons = [], baptismClasses, journeyRequests, onOpenSub, onRequestStep, onServir }: {
  person: P; member: M | null; ministries: Ministry[]; courses: Course[]; enrollments: Enrollment[]; baptismClasses: BaptismClass[];
  courseModules?: CourseModule[]; courseLessons?: CourseLesson[];
  journeyRequests: JourneyRequest[]; onOpenSub: (sub: string) => void; onRequestStep: (step: JourneyStep) => void; onServir: () => void;
}): StepView[] {
  const j = useContext(JourneyContext);
  const JORNADA = useJornada();
  const journey = member?.journey ?? [];
  const pedidos = new Set(journeyRequests.filter((r) => r.memberId === member?.id && r.status === "pendente").map((r) => r.step));
  const cursando = member ? enrollments.find((e) => e.member_id === member.id && e.status !== "concluido") : undefined;
  const cursoNome = cursando ? courses.find((c) => c.id === cursando.course_id)?.name : undefined;
  const turmaInscrita = member ? baptismClasses.find((b) => j.baptismCandidates.some((c) => c.class_id === b.id && c.member_id === member.id)) : undefined;
  const turmaAberta = baptismClasses.find((b) => b.open_enrollment && b.status !== "concluida");
  const pedidoServir = member ? j.serveRequests.find((r) => r.member_id === member.id && r.status === "pendente") : undefined;
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const ids: JourneyStep[] = ["decisao", "batismo", "curso", "integracao", "time"];
  return ids.map((id, i) => {
    const nome = JORNADA[i];
    if (journey[i] || (id === "time" && serve)) return { id, nome, st: "feito" };
    if (pedidos.has(id)) return { id, nome, st: "andamento", info: "Pedido enviado · aguardando a liderança" };
    if (id === "batismo") {
      if (turmaInscrita) return { id, nome, st: "andamento", info: joinDot("Inscrição feita", turmaInscrita.label, formatDateBR(turmaInscrita.baptism_date)) };
      if (turmaAberta) return { id, nome, st: "afazer", info: joinDot("Inscrições abertas", turmaAberta.label), acao: "Quero me batizar", run: () => onOpenSub("batismo") };
      return { id, nome, st: "afazer", acao: "Já fui batizado", run: () => onRequestStep(id) };
    }
    if (id === "curso") {
      if (cursando) {
        const prox = proximaAula(cursando.course_id, cursando.done_count, courseModules, courseLessons);
        return { id, nome, st: "andamento", info: joinDot(cursoNome, prox && `Próxima aula: ${prox.aula.name}`, dataLonga(prox?.aula.lesson_date), prox?.aula.lesson_time, prox?.aula.location), acao: prox ? "Ver a próxima aula" : "Ver o curso", run: () => onOpenSub("cursos") };
      }
      return { id, nome, st: "afazer", acao: "Ver os cursos", run: () => onOpenSub("cursos") };
    }
    if (id === "time") {
      if (pedidoServir) return { id, nome, st: "andamento", info: "Pedido enviado · o líder vai falar com você" };
      return { id, nome, st: "afazer", acao: "Conhecer os times", run: onServir };
    }
    if (id === "integracao") return { id, nome, st: "afazer", acao: "Já participo", run: () => onRequestStep(id) };
    return { id, nome, st: "afazer", acao: "Contar que já decidi", run: () => onRequestStep(id) };
  });
}

function SheetPedidoEtapa({ step, nome, member, onRequestJourneyStep }: { step: JourneyStep; nome: string; member: M | null; onRequestJourneyStep?: (memberId: string, step: JourneyStep, eventDate: string, note: string) => void }) {
  const ui = useContext(MemberUiContext);
  const [data, setData] = useState("");
  const [nota, setNota] = useState("");
  return (
    <div>
      <h2 className="m6-sh">{nome}</h2>
      <div className="m6-meta">Conte quando aconteceu. A liderança confirma e a etapa fica marcada na sua caminhada.</div>
      <div className="field" style={{ marginTop: 14 }}><label className="field-label">Quando foi?</label><input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
      <div className="field"><label className="field-label">Quer contar mais? (opcional)</label><input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: aconteceu em outra igreja" /></div>
      <div className="m6-btns">
        <button className="m6-btn pri" type="button" disabled={!data || !member || !onRequestJourneyStep} onClick={() => {
          if (!member || !onRequestJourneyStep) return;
          onRequestJourneyStep(member.id, step, data, nota);
          ui.sheet(null);
          ui.toast("Pedido enviado · a liderança vai confirmar");
        }}>Enviar</button>
      </div>
    </div>
  );
}

function SheetTimes({ person, member, ministries, members, people }: { person: P; member: M | null; ministries: Ministry[]; members: M[]; people: P[] }) {
  return (
    <div>
      <h2 className="m6-sh">Times que procuram pessoas</h2>
      <div className="m6-meta">Escolha um time. O líder recebe seu pedido e fala com você.</div>
      <ServirSection person={person} member={member} ministries={ministries} members={members} people={people} />
    </div>
  );
}

function CaminhadaV6({ steps, courses, purpose }: { steps: StepView[]; courses: React.ReactNode; purpose?: { kick?: string | null; title?: string | null; text?: string | null } | null }) {
  const ui = useContext(MemberUiContext);
  const done = steps.filter((s) => s.st === "feito").length;
  return (
    <>
      <div className="m6-sec0">
        <div className="m6-card">
          <div className="m6-ct">{done} de {steps.length} etapas concluídas</div>
          <div className="m6-segbar">{steps.map((s) => <i key={s.id} className={s.st} />)}</div>
          <div className="m6-meta">Cada etapa acontece no seu tempo, em qualquer ordem.</div>
        </div>
      </div>
      <div className="m6-sec">
        <div className="m6-lbl">Etapas</div>
        <div className="m6-steps">
          {steps.map((s) => (
            <div className="m6-step" key={s.id}>
              <span className={`m6-dot ${s.st}`}>{s.st === "feito" ? <Icon name="ok" size={18} /> : s.st === "andamento" ? <Icon name="pendente" size={18} /> : null}</span>
              <div className="m6-rb">
                <div className="m6-rt">{s.nome}</div>
                <div className="m6-stw"><b>{STW[s.st]}</b>{s.info ? ` · ${s.info}` : ""}</div>
                {s.acao && s.run && <div className="m6-mt"><button className={`m6-btn small ${s.st === "andamento" ? "pri" : "sec"}`} type="button" onClick={s.run}>{s.acao} →</button></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="m6-sec">
        <div className="m6-lbl">Cursos</div>
        {courses}
      </div>
      <div className="m6-sec">
        <div className="m6-lbl">Bíblia</div>
        <div className="m6-list"><M6Row ic="biblia" t="Ler a Bíblia" s="Marque versículos e faça anotações" onClick={() => ui.go("caminhada", "biblia")} /></div>
      </div>
      {purpose && (purpose.title || purpose.text) && (
        <div className="m6-sec">
          <div className="m6-lbl">Nossa igreja</div>
          <div className="m6-card">
            {purpose.kick && <div className="m6-kick">{purpose.kick}</div>}
            {purpose.title && <div className="m6-ct">{purpose.title}</div>}
            {purpose.text && <p className="m6-txt">{purpose.text}</p>}
          </div>
        </div>
      )}
    </>
  );
}

/* cursos em andamento, disponíveis (sem os já cumpridos) e concluídos */
function CursosResumo({ member, courses, enrollments, courseModules, courseLessons }: { member: M | null; courses: Course[]; enrollments: Enrollment[]; courseModules: CourseModule[]; courseLessons: CourseLesson[] }) {
  const ui = useContext(MemberUiContext);
  const meus = member ? enrollments.filter((e) => e.member_id === member.id) : [];
  const andando = meus.find((e) => e.status !== "concluido");
  const feitos = meus.filter((e) => e.status === "concluido").length;
  const disponiveis = courses.filter((c) => !meus.some((e) => e.course_id === c.id));
  const curso = andando ? courses.find((c) => c.id === andando.course_id) : undefined;
  const total = curso ? courseLessons.filter((l) => courseModules.some((m) => m.id === l.module_id && m.course_id === curso.id)).length : 0;
  const pct = andando && total ? Math.min(100, Math.round((andando.done_count / total) * 100)) : 0;
  return (
    <>
      {curso && andando && (
        <div className="m6-card">
          <div className="m6-kick">Em andamento</div>
          <div className="m6-ct">{curso.name}</div>
          {total > 0 && <div className="m6-meta">{andando.done_count} de {plural(total, "aula")}</div>}
          {(() => {
            const prox = proximaAula(curso.id, andando.done_count, courseModules, courseLessons);
            return prox ? <div className="m6-meta">Próxima aula: {prox.aula.name}</div> : null;
          })()}
          <div className="m6-prog"><i style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      <div className="m6-list">
        {disponiveis.slice(0, 3).map((c) => <M6Row key={c.id} ic="cursos" t={c.name} s={c.level ?? c.description ?? undefined} onClick={() => ui.go("caminhada", "cursos")} />)}
        {feitos > 0 && <M6Row ic="ok" t={`Concluídos · ${feitos}`} onClick={() => ui.go("caminhada", "cursos")} />}
        {disponiveis.length === 0 && feitos === 0 && !curso && <div className="m6-row"><span className="m6-rb"><span className="m6-rs">Os cursos da igreja aparecem aqui quando forem publicados.</span></span></div>}
      </div>
    </>
  );
}

function MobileMembro({
  person, member, ...rest
}: MobileOverlayProps & { person: P; member: M | null }) {
  const [tab, setTab] = useState<MemberTab>("inicio");
  const [sub, setSub] = useState<string | null>(null);
  const [agSeg, setAgSeg] = useState<"minha" | "igreja">("minha");
  const [chatTarget, setChatTarget] = useState<{ id: string | null; novo: boolean; n: number }>({ id: null, novo: false, n: 0 });
  const [chatAberto, setChatAberto] = useState<string | null>(null);
  const [sheetEl, setSheetEl] = useState<React.ReactNode | null>(null);
  const [toastO, setToastO] = useState<{ msg: string; action?: { label: string; fn: () => void }; id: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textScale] = useTextScale();
  /* primeiro acesso termina quando a ficha tem os dados obrigatórios
     (member.contactComplete, calculado no servidor): vale em qualquer
     aparelho e não diverge entre o HTML do servidor e o do navegador */
  const [onboarded, setOnboarded] = useState<boolean>(() => !member || !!member.contactComplete);
  const { people, ministries, events, roster, cards, boards, enrollments, courseModules = [], courseLessons = [],
          visitors, baptismClasses, announcements, chats, chatMembers, messages, members, onReadAnnouncement, onCompleteOnboarding, onAddCardComment,
          onAdvanceVisitorStage, onRegisterVisitor, onSendMessage, onStartChat,
          organizationId, churchName, churchLogoUrl, theme, setTheme, onChangePassword, onUpdateProfile,
          journeyRequests = [], onRequestJourneyStep, onConfirmarEscala, onRecusarEscala,
          kidsClasses = [], kidsChildren = [], childGuardians = [], kidsSessions = [], kidsAttendance = [],
          kidsEvents = [], kidsEventEnrollments = [], wallPosts = [], bibleMarks = [], onSaveBibleMark,
          missingRequirements = [], serveRequests = [], baptismCandidates = [], onEnrollCourse, onRequestBaptism, onRequestServe,
          mode, onLogout, onSwitchToPanel, groupTerm, readAnnouncementIds = [], churchPurpose,
          onSaveAvailability, onRespondAnnouncement, announcementResponses = [] } = rest;
  /* curso em rascunho não aparece no app */
  const courses = rest.courses.filter((c) => c.published !== false);
  const journey: JourneyActions = {
    missing: missingRequirements, serveRequests, baptismCandidates, onEnrollCourse, onRequestBaptism, onRequestServe,
    names: { courses: courses.map((c) => ({ id: c.id, name: c.name })), events: events.map((e) => ({ id: e.id, name: e.name })) },
  };

  const isRecep = isRecepPerson(person, ministries);
  const isKids = isKidsPerson(person, ministries);
  const serves = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const isGuardian = childGuardians.some((g) => g.guardian_person_id === person.id);
  const ctx: ModuleCtx = { serves, isRecep, isKids, isGuardian };
  const subAllowed = (id: string | null) => !id || (MEMBER_MODULES.find((m) => m.id === id)?.visible(ctx) ?? false);

  const lidos = useMemo(() => new Set(readAnnouncementIds), [readAnnouncementIds]);
  const [lidosAgora, setLidosAgora] = useState<Set<string>>(() => new Set());
  const unreadIds = useMemo(() => new Set(announcements.filter((a) => !lidos.has(a.id) && !lidosAgora.has(a.id)).map((a) => a.id)), [announcements, lidos, lidosAgora]);
  const marcarLido = (personId: string, id: string) => {
    setLidosAgora((p) => (p.has(id) ? p : new Set(p).add(id)));
    onReadAnnouncement?.(personId, id);
  };
  const hoje = todayISO();
  const evDate = new Map(events.map((e) => [e.id, e.eventDate]));
  const pendEscala = roster.filter((r) => r.person_id === person.id && r.status === "wait" && (evDate.get(r.event_id) ?? "") >= hoje).length;
  const badges: Partial<Record<MemberTab, number>> = { agenda: serves ? pendEscala : 0, mensagens: unreadIds.size };

  const toast = (msg: string, action?: { label: string; fn: () => void }) => setToastO({ msg, action, id: Date.now() });
  useEffect(() => {
    if (!toastO) return;
    const h = setTimeout(() => setToastO(null), toastO.action ? UNDO_MS : 3600);
    return () => clearTimeout(h);
  }, [toastO]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab, sub]);

  const go: MemberUi["go"] = (t, s = null, extra = {}) => {
    /* tocar na aba ativa volta ao topo */
    if (t === tab && !s && !sub && !extra.chatId && !extra.newChat) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (extra.agSeg) setAgSeg(extra.agSeg);
    if (extra.chatId !== undefined || extra.newChat) setChatTarget((c) => ({ id: extra.chatId ?? null, novo: !!extra.newChat, n: c.n + 1 }));
    else if (t === "mensagens" && !s) setChatTarget((c) => ({ id: null, novo: false, n: c.n + 1 }));
    setChatAberto(null);
    setTab(t);
    setSub(subAllowed(s) ? s : null);
  };
  const ui: MemberUi = { go, sheet: setSheetEl, toast };

  const pedirEtapa = (step: JourneyStep) => {
    const nome = { decisao: "Decisão", batismo: "Batismo", curso: "Fundamentos", integracao: groupTerm || "Grupo", time: "Servindo" }[step];
    setSheetEl(<SheetPedidoEtapa step={step} nome={nome} member={member} onRequestJourneyStep={onRequestJourneyStep} />);
  };
  const abrirTimes = () => setSheetEl(<SheetTimes person={person} member={member} ministries={ministries} members={members} people={people} />);

  if (!onboarded) {
    return (
      <div className="phone" style={{ "--m-scale": textScale } as React.CSSProperties}>
        <div className="phone-screen">
          <div className="phone-notch" />
          <Onboarding person={person} member={member} churchName={churchName} churchLogoUrl={churchLogoUrl} organizationId={organizationId} onCompleteOnboarding={onCompleteOnboarding} onDone={() => setOnboarded(true)} />
        </div>
      </div>
    );
  }

  const tabTitle = MEMBER_TABS.find((t) => t.id === tab)!.l;
  const subTitle = sub === "chat" ? (chatAberto ?? "Conversa") : sub ? moduleTitle(sub) : "";
  const voltar = () => { if (sub === "chat") { setChatTarget((c) => ({ id: null, novo: false, n: c.n + 1 })); setChatAberto(null); } setSub(null); };

  return (
    <GroupTermContext.Provider value={groupTerm || "Grupo"}>
    <JourneyContext.Provider value={journey}>
    <MemberUiContext.Provider value={ui}>
    <StepsHost
      person={person} member={member} ministries={ministries} courses={courses} enrollments={enrollments} baptismClasses={baptismClasses}
      courseModules={courseModules} courseLessons={courseLessons}
      journeyRequests={journeyRequests} onOpenSub={(s) => go("caminhada", s)} onRequestStep={pedirEtapa} onServir={abrirTimes}
    >
    {(steps) => (
    <div className="phone" style={{ "--m-scale": textScale } as React.CSSProperties}>
      <div className="phone-screen">
        <div className="phone-notch" />
        <div className="m-statusbar">
          <span>9:41</span>
          <span>{churchName || "Service"} </span>
        </div>
        <div className="m-head">
          {sub ? (
            <>
              <button type="button" className="m6-back" onClick={voltar}><span className="m6-back-ic"><Icon name="voltar" size={22} /></span>{tabTitle}</button>
              <h1 className="m-h1 sub">{subTitle}</h1>
            </>
          ) : (
            <>
              <div className="m-head-top">
                <ChurchLockup size="sm" logoUrl={churchLogoUrl} name={churchName} />
                <button className="m-head-av" type="button" onClick={() => go("perfil")} aria-label="Abrir meu perfil">
                  <Av name={person.name} size="sm" photoUrl={person.photoUrl} />
                </button>
              </div>
              {tab === "inicio" ? (
                <>
                  <h1 className="m-h1">{saudacao()}, <em>{person.name.split(" ")[0]}</em></h1>
                  <p className="m-hsub">{dataLonga(hoje)}</p>
                </>
              ) : (
                <h1 className="m-h1">{tabTitle}</h1>
              )}
            </>
          )}
        </div>

        <div className="m-scroll" ref={scrollRef}>
          {tab === "inicio" && (
            <InicioV6 person={person} member={member} ministries={ministries} members={members} events={events} roster={roster} cards={cards}
              announcements={announcements} unreadIds={unreadIds} kidsChildren={kidsChildren} childGuardians={childGuardians}
              kidsCheckin={<CheckinKidsHoje person={person} events={events} kidsChildren={kidsChildren} childGuardians={childGuardians} kidsClasses={kidsClasses}
                kidsSessions={kidsSessions} kidsAttendance={kidsAttendance} organizationId={organizationId} />}
              onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala} onStartChat={onStartChat}
              nextStep={steps.find((s) => s.st === "andamento" && s.acao) ?? steps.find((s) => s.st === "afazer" && s.acao && s.id !== "time") ?? null}
              onServir={abrirTimes} />
          )}

          {tab === "agenda" && !sub && (
            <AgendaV6 seg={agSeg} setSeg={setAgSeg} person={person} member={member} members={members} ministries={ministries} events={events} roster={roster}
              cards={cards} boards={boards} isRecep={isRecep} isKids={isKids} onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala}
              onStartChat={onStartChat} onAddCardComment={onAddCardComment} onSaveAvailability={onSaveAvailability}
              aulas={<AulasAgenda member={member} courses={courses} enrollments={enrollments} courseModules={courseModules} courseLessons={courseLessons} />} />
          )}
          {tab === "agenda" && sub === "visitantes" && <div className="m6-legacy"><TabVisitantes visitors={visitors} onAdvanceVisitorStage={onAdvanceVisitorStage} onRegisterVisitor={onRegisterVisitor} /></div>}
          {tab === "agenda" && sub === "kids-sala" && (
            <div className="m6-legacy">
            <TabKids person={person} people={people} members={members} events={events} kidsClasses={kidsClasses} kidsChildren={kidsChildren}
              childGuardians={childGuardians} kidsSessions={kidsSessions} kidsAttendance={kidsAttendance} organizationId={organizationId} churchId={kidsClasses[0]?.church_id} />
            </div>
          )}

          {tab === "mensagens" && sub === "mural" && <MuralV6 announcements={announcements} unreadIds={unreadIds} person={person} onReadAnnouncement={marcarLido} responses={announcementResponses} onRespond={onRespondAnnouncement} />}
          {tab === "mensagens" && (!sub || sub === "chat") && (
            <>
              {!sub && (
                <div className="m6-sec0">
                  <div className="m6-list">
                    <button type="button" className="m6-row" onClick={() => go("mensagens", "mural")}>
                      <span className="m6-ic accent"><Icon name="bandeira" size={22} /></span>
                      <span className="m6-rb">
                        <span className="m6-rt">Mural da igreja</span>
                        <span className={`m6-rs m6-1l${unreadIds.size ? " m6-strong" : ""}`}>{announcements[0]?.title ?? "As publicações da igreja ficam aqui"}</span>
                      </span>
                      {unreadIds.size > 0 && <span className="m6-count">{unreadIds.size}</span>}
                    </button>
                  </div>
                </div>
              )}
              <div className={sub ? "" : "m6-sec m6-conv"}>
                <TabConversas key={chatTarget.n} member={member} chats={chats} chatMembers={chatMembers} messages={messages} members={members} ministries={ministries}
                  onSendMessage={onSendMessage} onStartChat={onStartChat} openChatId={chatTarget.id} startNew={chatTarget.novo}
                  onChatOpen={(name) => { setChatAberto(name); setSub(name ? "chat" : null); }} />
              </div>
              {!sub && (
                <div className="m6-pad">
                  <button className="m6-btn pri full" type="button" onClick={() => setSheetEl(
                    <div>
                      <h2 className="m6-sh">Nova mensagem</h2>
                      <div className="m6-list flat">
                        <M6Row ic="conversas" t="Falar com um líder" s="Pastor ou líder do seu time" onClick={() => { setSheetEl(null); go("mensagens", null, { newChat: true }); }} />
                        <M6Row ic="coracao" t="Pedido de oração" s="Vai para quem cuida da intercessão" onClick={() => setSheetEl(<SheetOracao person={person} member={member} ministries={ministries} members={members} onStartChat={onStartChat} />)} />
                      </div>
                    </div>,
                  )}><Icon name="add" size={20} />Nova mensagem</button>
                </div>
              )}
            </>
          )}

          {tab === "caminhada" && !sub && (
            <CaminhadaV6 steps={steps} purpose={churchPurpose}
              courses={<CursosResumo member={member} courses={courses} enrollments={enrollments} courseModules={courseModules} courseLessons={courseLessons} />} />
          )}
          {tab === "caminhada" && sub === "cursos" && (
            <div className="m6-legacy">
            <TabCursos member={member} courses={courses} enrollments={enrollments} courseModules={courseModules} courseLessons={courseLessons} />
            </div>
          )}
          {tab === "caminhada" && sub === "batismo" && <div className="m6-legacy"><TabBatismo baptismClasses={baptismClasses} memberId={member?.id ?? null} /></div>}
          {tab === "caminhada" && sub === "biblia" && <div className="m6-legacy"><TabBiblia bibleMarks={bibleMarks} onSaveBibleMark={onSaveBibleMark} /></div>}

          {tab === "perfil" && (!sub || sub === "dados" || sub === "senha") && (
            <TabPerfil
              person={person}
              member={member}
              organizationId={organizationId}
              theme={theme}
              setTheme={setTheme}
              onChangePassword={onChangePassword}
              onUpdateProfile={onUpdateProfile}
              onLogout={mode === "self" ? onLogout : undefined}
              onSwitchToPanel={mode === "self" ? onSwitchToPanel : undefined}
              view={sub === "dados" ? "dados" : sub === "senha" ? "senha" : "home"}
              openSub={(s) => go("perfil", s)}
            />
          )}
          {tab === "perfil" && sub === "familia" && (
            <div className="m6-legacy">
            <TabKidsArea
              checkinHoje={<CheckinKidsHoje person={person} events={events} kidsChildren={kidsChildren} childGuardians={childGuardians} kidsClasses={kidsClasses}
                kidsSessions={kidsSessions} kidsAttendance={kidsAttendance} organizationId={organizationId} />}
              person={person}
              people={people}
              kidsClasses={kidsClasses}
              kidsChildren={kidsChildren}
              childGuardians={childGuardians}
              kidsAttendance={kidsAttendance}
              kidsEvents={kidsEvents}
              kidsEventEnrollments={kidsEventEnrollments}
              wallPosts={wallPosts}
              organizationId={organizationId}
              churchId={kidsClasses[0]?.church_id}
            />
            </div>
          )}
        </div>

        <nav className="m-tab" aria-label="Navegação principal">
          {MEMBER_TABS.map((t) => {
            const on = tab === t.id;
            const b = badges[t.id] ?? 0;
            return (
              <button key={t.id} type="button" className={on ? "on" : ""} aria-current={on ? "page" : undefined} onClick={() => go(t.id)}>
                <span className="ic">
                  <TabIcon name={t.ic} size={24} />
                  {b > 0 && <span className="m6-badge" aria-label={`${b} novos`}>{b}</span>}
                </span>
                <span className="m-tab-l">{t.l}</span>
              </button>
            );
          })}
        </nav>

        {toastO && (
          <div className="m6-toast" key={toastO.id} role="status">
            <span>{toastO.msg}</span>
            {toastO.action && <button type="button" onClick={() => { toastO.action!.fn(); setToastO(null); }}>{toastO.action.label}</button>}
          </div>
        )}
        {sheetEl && <M6Sheet onClose={() => setSheetEl(null)}>{sheetEl}</M6Sheet>}
      </div>
    </div>
    )}
    </StepsHost>
    </MemberUiContext.Provider>
    </JourneyContext.Provider>
    </GroupTermContext.Provider>
  );
}

/* calcula as etapas dentro dos contextos (precisa do JourneyContext) */
function StepsHost({ children, ...p }: Parameters<typeof useSteps>[0] & { children: (steps: StepView[]) => React.ReactNode }) {
  const steps = useSteps(p);
  return <>{children(steps)}</>;
}

// ── overlay principal (desktop) ───────────────────────────────────────────────

export default function MobileOverlay(props: MobileOverlayProps) {
  const { people, members, onClose, mode = "preview", selfPersonId, onLogout, onSwitchToPanel } = props;
  const isSelf = mode === "self";

  const personas = isSelf ? [] : people.filter((p) => p.status === "ativo").slice(0, 3);
  const [idx, setIdx] = useState(0);

  const person = isSelf ? (people.find((p) => p.id === selfPersonId) ?? null) : (personas[idx] ?? people[0]);
  const member = person
    ? (members.find((m) => m.volunteerId === person.id) ?? null)
    : null;

  const closeAction = isSelf ? onLogout ?? onClose : onClose;
  const closeLabel = isSelf ? "Sair" : "← Voltar ao painel";

  if (!person) {
    return (
      <div className="mob-bg" onClick={isSelf ? undefined : onClose}>
        <div className="mob-side" onClick={(e) => e.stopPropagation()}>
          <div className="mob-side-eyebrow">App do voluntário</div>
          <h3>{isSelf ? "Cadastro não encontrado" : "Nenhum voluntário ativo"}</h3>
          <p>
            {isSelf
              ? "Não encontramos seu cadastro de pessoa nesta igreja. Fale com a liderança."
              : "Cadastre voluntários em Pessoas para pré-visualizar o app deles aqui."}
          </p>
          <button className="mob-close" onClick={closeAction}>{closeLabel}</button>
          {isSelf && onSwitchToPanel && <button className="mob-close mob-to-panel" onClick={onSwitchToPanel}>Gerenciar →</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={`mob-bg${isSelf ? " mob-self" : ""}`} onClick={isSelf ? undefined : onClose}>
      <div className="mob-side" onClick={(e) => e.stopPropagation()}>
        {!isSelf && (
          <>
            <div className="mob-side-eyebrow">Mesma conta · outra superfície</div>
            <h3>
              O app do <span className="ol">membro</span>
            </h3>
            <p>
              O membro acompanha a caminhada, confirma escala, resolve tarefas do quadro,
              conversa com o time e o líder, faz cursos e pede oração, tudo pelo celular.
            </p>

            <div className="mob-persona">
              <div className="mob-persona-t">Pré-visualizar como</div>
              {personas.map((p, i) => {
                const m = members.find((m) => m.volunteerId === p.id);
                return (
                  <button
                    key={p.id}
                    className={`mob-persona-opt ${i === idx ? "on" : ""}`}
                    onClick={() => setIdx(i)}
                  >
                    <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                    <div>
                      <b>{p.name}</b>
                      <small>
                        {m ? "Membro" : "Voluntario"}
                        {p.tags.length > 0 ? ` · ${p.tags[0]}` : ""}
                      </small>
                    </div>
                    {i === idx && <span className="mob-persona-chk"><Icon name="ok" size={14} /></span>}
                  </button>
                );
              })}
              <div className="mob-persona-hint">
                O voluntário da Recepção vê o módulo de visitantes no lugar de Cursos.
              </div>
            </div>
          </>
        )}

        <button className="mob-close" onClick={closeAction}>{closeLabel}</button>
        {isSelf && onSwitchToPanel && <button className="mob-close mob-to-panel" onClick={onSwitchToPanel}>Gerenciar →</button>}
      </div>

      <div className="mob-phone-wrap" onClick={(e) => e.stopPropagation()}>
        <MobileMembro key={person.id} {...props} person={person} member={member} />
      </div>
    </div>
  );
}

/* Padrão · Grande · Muito grande, com a prévia logo abaixo (a escala já
   vale no app inteiro ao tocar). */
function TextSizePicker() {
  const [scale, setScale] = useTextScale();
  return (
    <div className="ts-pick">
      <div className="ts-seg" role="radiogroup" aria-label="Tamanho do texto">
        {TEXT_SCALES.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={scale === o.value} className={scale === o.value ? "on" : ""} onClick={() => setScale(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="ts-prev">Assim fica o texto do app.</p>
    </div>
  );
}
