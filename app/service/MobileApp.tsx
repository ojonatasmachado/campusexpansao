"use client";

import { avisar } from "./lib/avisar";
import { Fragment, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { Icon, Caret } from "./lib/icons";
import { aindaVaiAcontecer, quandoMensagem, formatDateBR, joinDot, paraPublico, parseISODate, porPublicacao, quandoPublicado, saudacao, somaDias, todayISO, weekdayFromISO } from "./lib/date";
import { plural } from "./lib/plural";
import { formatarTelefone } from "./lib/telefone";
import { suggestKidsClassId, imageAuthorizationCopy } from "./lib/kids";
import { PhotoPicker } from "./PhotoPicker";
import CepInput from "./CepInput";
import ChurchLockup from "./ChurchLockup";
import { NOMES_POSICAO, fatorDa, sincronizarComPerfil, useTextSize } from "./lib/text-scale";
import { TextSizeSheet, TextSizeSlider } from "./TextSizeSlider";
import { useTermos } from "./lib/vocabulario-context";
import { requirementLabel, type RequirementKind } from "./lib/requirements";
import { candidatosParaVaga, papelDoDestinatario, useDestinatario, type Destinatario } from "./lib/destinatario";
import { checkinAberto, horaQueAbre, sessaoDoCulto, statusDaCrianca, useKidsCheckin } from "./lib/kids-checkin";
import { INSTRUCAO_QR, aulasDoCurso, proximaAula, textoDaAula, type ProximaAula } from "./lib/aulas";
import { modulosLigados, telasDoMembro, type EstadoModulos } from "./modules/registry";
import type { CategoriaAviso, ContextoMembro } from "./modules/define";
import { FILA_DOBRA, ordenarFila, type EntradaFila } from "./modules/fila";
import { conflitos, horaDeChegada } from "./lib/agenda";
import { baixarIcs } from "./lib/ics";
import { porData, quandoFoi, tipoDoFato, type FatoView } from "./lib/historico";
import { linhaDoMembro, mesmoDiaDaSemana } from "./lib/contexto-dia";
import { videoDoLink } from "./lib/video";
import { medir, medirCartaoVisto } from "./lib/medicao";

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
  /* primeiro acesso feito: nome e sobrenome e telefone (v7 4.10) */
  firstAccessDone?: boolean;
  journey: number[];
  volunteerId: string | null;
  groupId?: string | null;
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
  /* "Horário de chegada" do time (texto livre: "18:30", "1h antes") */
  profile?: Record<string, unknown> | null;
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
type Ev = {
  id: string; name: string; weekday: string; eventDate: string; time: string; location?: string; kind?: string;
  /* o que o evento pede, valor e instruções (0058, v7 4.5) */
  pede?: "aviso" | "presenca" | "inscricao"; valor?: string; instrucoes?: string;
};
type EventRsvp = { event_id: string; person_id: string; kind: "presenca" | "inscricao" };
type MeetingLite = { id: string; title: string; meeting_date: string | null; time: string | null; location: string | null; status: string; ministries: string[]; attendees: string[] };
type RehearsalLite = { id: string; ministry_id: string | null; title: string; rehearsal_date: string | null; time: string | null; location: string | null; attendees: string[] };
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
  const { comTermos: ct } = useTermos();
  return (kind: MissingRequirement["target_kind"], id: string | null) =>
    j.missing
      .filter((m) => m.target_kind === kind && (m.target_id ?? null) === id)
      .map((m) => ct(requirementLabel({ kind: m.req_kind, ref: m.req_ref }, j.names)));
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
  created_at?: string | null;
  /* destaque no Início (0063, v7 4.4) */
  highlight_until?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  video_url?: string | null;
};
type Chat = { id: string; kind: string; ministry_id: string | null; name: string | null };
type ChatMember = { chat_id: string; member_id: string; last_read_at?: string | null };
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
  /* exceções da igreja ao padrão dos módulos (service.churches, 0055) */
  modulos?: EstadoModulos;
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
  /* tamanho do texto guardado no perfil (0 a 6); o aparelho segue o perfil */
  textSizePerfil?: number | null;
  onLogout?: () => void;
  /* publicações do Mural que esta pessoa já leu (service.announcement_reads) */
  readAnnouncementIds?: string[];
  /* cartão "Nossa igreja" na Caminhada (Identidade e propósito) */
  churchPurpose?: { kick?: string | null; title?: string | null; text?: string | null } | null;
  /* "Quando posso servir" (0049) */
  onSaveAvailability?: (availability: Record<string, boolean>) => Promise<boolean>;
  /* "Vou / Não vou" nas publicações de evento do Mural (0049) */
  onRespondAnnouncement?: (announcementId: string, response: "vou" | "nao" | null) => Promise<boolean>;
  announcementResponses?: { announcement_id: string; response: "vou" | "nao" }[];
  /* presença e inscrição em evento (0058, v7 4.5) */
  eventRsvps?: EventRsvp[];
  onRespondEvent?: (eventId: string, vai: boolean) => Promise<boolean>;
  meetings?: MeetingLite[];
  rehearsals?: RehearsalLite[];
  /* página pública da igreja ("/slug"), para o link de Compartilhar */
  paginaUrl?: string | null;
  /* fatos da história da própria pessoa (v7 4.8; o banco só entrega os dela) */
  timelineEvents?: FatoView[];
  /* marca a conversa como lida no servidor (0060, v7 4.15) */
  onMarkChatRead?: (chatId: string) => void;
  /* grupos (dia e hora), para "Hoje: GC Centro às 20h" (v7 4.19) */
  fellowshipGroups?: { id: string; name: string; weekday: string | null; time: string | null }[];
};

// ── constantes ────────────────────────────────────────────────────────────────

/* etapas da caminhada; a 4ª usa o nome que a igreja deu aos grupos
   (vocabulário, lei 7), nunca a sigla */
function useJornada() {
  const { termo } = useTermos();
  return ["Decisão", "Batismo", "Fundamentos", termo("grupo"), "Servindo"];
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
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        O que a liderança deixou no quadro para você. Atualize e comente.
      </div>
      {pending.map(cardEl)}
      {done.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Concluídas · {done.length}</div>
          {done.map(cardEl)}
        </>
      )}
    </>
  );
}

// ── aba: Conversas ────────────────────────────────────────────────────────────

/* v7 4.15: mensagens de outros depois da última leitura (0060). Sem a coluna
   (antes da migração), nada conta como não lido. */
function naoLidasPorConversa(chatMembers: ChatMember[], messages: Message[], memberId: string | null | undefined, lidasAgora: Record<string, string>): Map<string, number> {
  const out = new Map<string, number>();
  if (!memberId) return out;
  for (const cm of chatMembers) {
    if (cm.member_id !== memberId || !cm.last_read_at) continue;
    const desde = lidasAgora[cm.chat_id] && lidasAgora[cm.chat_id] > cm.last_read_at ? lidasAgora[cm.chat_id] : cm.last_read_at;
    const n = messages.filter((m) => m.chat_id === cm.chat_id && m.sender_id !== memberId && m.created_at > desde).length;
    if (n) out.set(cm.chat_id, n);
  }
  return out;
}

function TabConversas({
  member, chats, chatMembers, messages, members, ministries, people = [], onSendMessage, onStartChat, openChatId, startNew, onChatOpen, naoLidas, onLida,
}: {
  people?: P[];
  /* não lidas por conversa e o aviso de que a pessoa abriu uma (v7 4.15) */
  naoLidas?: Map<string, number>;
  onLida?: (chatId: string) => void;
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

  /* conversa a dois: nome e foto da outra pessoa; canal e grupo: o nome dado */
  const outro = (c: Chat) => {
    if (c.kind !== "dm") return null;
    const outros = chatMembers.filter((cm) => cm.chat_id === c.id && cm.member_id !== member?.id);
    if (outros.length !== 1) return null;
    return members.find((m) => m.id === outros[0].member_id) ?? null;
  };
  const nomeDa = (c: Chat) => outro(c)?.name ?? c.name ?? "Conversa";
  const fotoDa = (c: Chat) => {
    const o = outro(c);
    return o?.volunteerId ? people.find((p) => p.id === o.volunteerId)?.photoUrl ?? null : null;
  };
  const ultimaDe = (id: string) => {
    let last: Message | undefined;
    for (const m of messages) if (m.chat_id === id && (!last || m.created_at > last.created_at)) last = m;
    return last;
  };

  const chat = myChats.find((c) => c.id === selId);
  const setSelId = (id: string | null) => {
    setSelIdRaw(id);
    const c = id ? myChats.find((x) => x.id === id) : undefined;
    onChatOpen?.(c ? nomeDa(c) : id ? "Conversa" : null);
    if (id) onLida?.(id);
  };
  /* aberta direto (depois de "Pedir troca" ou de um aviso): já conta como lida */
  useEffect(() => { if (openChatId) onLida?.(openChatId); }, [openChatId]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>Nenhuma mensagem ainda.</div>
            )}
            {chatMsgs.map((msg) => {
              const sender = members.find((m) => m.id === msg.sender_id);
              const isMine = member && msg.sender_id === member.id;
              return (
                <div key={msg.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  {!isMine && sender && (
                    <div
                      style={{
                        fontSize: "var(--fs-app-13)",
                        color: "var(--muted)",
                        marginBottom: 3,
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
            <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>Nenhum líder disponível ainda.</div>
          )}
        </div>
      )}

      {myChats.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: "var(--fs-app-15)", color: "var(--muted)" }}>Nenhuma conversa ainda. Toque em Nova mensagem para falar com um líder.</div>
        </div>
      )}
      {[...myChats].sort((a, b) => (ultimaDe(b.id)?.created_at ?? "").localeCompare(ultimaDe(a.id)?.created_at ?? "")).map((c) => {
        const last = ultimaDe(c.id);
        const n = naoLidas?.get(c.id) ?? 0;
        const nome = nomeDa(c);
        const autor = last && !outro(c) ? members.find((m) => m.id === last.sender_id)?.name.split(" ")[0] : undefined;
        const quem = !last ? "" : last.sender_id === member?.id ? "Você: " : autor ? `${autor}: ` : "";
        return (
          <button className={`m-conv${n ? " unread" : ""}`} key={c.id} type="button" onClick={() => setSelId(c.id)}
            aria-label={n ? `${nome}, ${n === 1 ? "1 mensagem não lida" : `${n} mensagens não lidas`}` : undefined}>
            <Av name={nome} photoUrl={fotoDa(c)} />
            <div className="m-conv-main">
              <div className="m-conv-name">{nome}</div>
              <div className="m-conv-prev">{last ? `${quem}${last.body}` : "Nenhuma mensagem ainda"}</div>
            </div>
            <div className="m-conv-side">
              {last && <span className="m-conv-when">{quandoMensagem(last.created_at)}</span>}
              {n > 0 && <span className="m6-count" aria-hidden="true">{n}</span>}
            </div>
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
          <div className="m-h1" style={{ fontSize: "var(--fs-app-20)", marginBottom: 14 }}>{book.name}</div>
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
            <div className="m-h1" style={{ fontSize: "var(--fs-app-17)" }}>{book.name} {chapter}</div>
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
          <div className="m-h1" style={{ fontSize: "var(--fs-app-20)", marginBottom: 14 }}>Minhas marcações</div>
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
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
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
                <div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{v.name}</div>
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
                          fontSize: "var(--fs-app-13)",
                          color: i <= etIdx ? "var(--light)" : "var(--muted)",
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
  const { comTermos: ct } = useTermos();
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
        <div className="empty" style={{ marginTop: 12 }}>Nenhuma sessão Kids aberta agora. Peça para a liderança abrir o QR do {ct("{culto}")} de hoje em {ct("{Cultos} e eventos")}.</div>
      </>
    );
  }

  return (
    <>
      <div className="m-section-t">Kids · {kidsClass?.name ?? "Turma"}</div>
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginBottom: 12 }}>{joinDot(event?.name, `${event?.weekday ?? ""} ${formatDateBR(event?.eventDate)}`.trim())}</div>

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
                <div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{child?.name ?? "Crianca"}</div>
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
          <div className="m-vis-main"><div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{child.name}</div></div>
          <span style={{ color: "var(--olive)", fontSize: "var(--fs-app-13)" }}>+ check-in</span>
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
          <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (session ? kidsClasses.find((kc) => kc.id === session.class_id)?.name ?? "nenhuma turma cobre essa idade" : "informe o nascimento")}</div>

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

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: "var(--fs-app-13)", lineHeight: 1.4 }}>
            <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} style={{ marginTop: 3 }} />
            <span>{imageAuthorizationCopy(form.nome)}</span>
          </label>
          {fichaError && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 8 }}>{fichaError}</div>}
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

/* aulas com data dos cursos em andamento, na Minha agenda (v7 2.2, 4.5) */
function minhasAulas(member: M | null, courses: Course[], enrollments: Enrollment[], courseModules: CourseModule[], courseLessons: CourseLesson[]) {
  if (!member) return [];
  const hoje = todayISO();
  return enrollments
    .filter((e) => e.member_id === member.id && e.status !== "concluido")
    .flatMap((e) => {
      const curso = courses.find((c) => c.id === e.course_id);
      return curso ? aulasDoCurso(curso.id, courseModules, courseLessons).map((aula) => ({ aula, curso })) : [];
    })
    .filter(({ aula }) => (aula.kind === "presencial" || aula.kind === "ao_vivo") && !!aula.lesson_date && aula.lesson_date >= hoje);
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
            <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{course.name}</div>
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
              <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{c.name}</div>
              {c.description && (
                <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", lineHeight: 1.5, marginTop: 6 }}>
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
                <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
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
                    <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 6 }}>{resultado}</div>
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
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
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
      {estado && estado !== "enviando" && estado !== "ok" && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 6 }}>{estado}</div>}
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
          <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>Nenhuma turma agendada por ora.</div>
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
          <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{b.label}</div>
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
            <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 12 }}>
              Inscrições ainda não abertas para esta turma.
            </div>
          )}
          {erro[b.id] && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 8 }}>{erro[b.id]}</div>}
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
  const ui = useContext(MemberUiContext);
  const [textPos] = useTextSize();
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
  /* a foto saiu do primeiro acesso (v7 4.10) e mora em Meus dados */
  const [foto, setFoto] = useState<string | null>(person.photoUrl ?? null);

  /* Perfil no modelo de Ajustes do celular (S24): a lista abre telas
     próprias (Meus dados, Trocar senha, Minha família) com "voltar" no topo */
  if (view === "dados") {
    return (
      <div className="m6-sec0">
        <div className="m6-card ob-foto">
          <PhotoPicker
            label="Sua foto"
            photoUrl={foto}
            path={`${organizationId}/kids/guardians/${person.id}`}
            onUploaded={(url) => {
              setFoto(url);
              createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", person.id);
            }}
          />
          <div className="m6-meta">Aparece no lugar das iniciais.</div>
        </div>
        {member ? (
          <div className="m6-card">
            {!editing ? (
              <>
                <ul className="m6-facts">
                  <li><Icon name="telefone" size={20} /><span>{formatarTelefone(realValue(member.phone))}</span></li>
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
          <M6Row ic="historia" t="Minha história" s="O que você já viveu na igreja" onClick={() => openSub?.("minha-historia")} />
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Preferências</div>
        <div className="m6-list">
          <M6Row ic="documento" t="Tamanho do texto" s={NOMES_POSICAO[textPos]} onClick={ui.tamanhoTexto} />
        </div>
        {theme && setTheme && (
          <div className="m6-card m6-mt">
            <div className="m6-rt">Tema</div>
            <div className="ts-seg two" role="radiogroup" aria-label="Tema">
              {(["light", "dark"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={theme === m} className={theme === m ? "on" : ""} onClick={() => setTheme(m)}>{m === "light" ? "Claro" : "Escuro"}</button>
              ))}
            </div>
          </div>
        )}
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
  { ic: "cursos", t: "{Caminhada}", s: "Seus passos na igreja, cursos e a Bíblia." },
  { ic: "perfil", t: "Perfil", s: "Toque na sua foto no alto: seus dados, família, tamanho do texto e tema." },
];

function AppTabsInfoGrid() {
  const { comTermos: ct } = useTermos();
  return (
    <div className="ob-tabs-grid">
      {APP_TABS_INFO.map((x) => (
        <div className="ob-tab-item" key={x.t}>
          <span className="ob-tab-ic"><Icon name={x.ic} size={18} /></span>
          <div><b>{ct(x.t)}</b><small>{x.s}</small></div>
        </div>
      ))}
    </div>
  );
}

function AppTourModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="m-sheet-bg" onClick={onClose}>
      <div className="ob-card" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div className="ob-welcome-x" style={{ marginBottom: 14, fontWeight: 700, fontSize: "var(--fs-app-15)" }}>Conheça o app</div>
        <AppTabsInfoGrid />
        <button className="btn btn-pri" type="button" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}


/* Primeiro acesso em 2 passos (v7 4.10): nome e telefone; tamanho do texto
   (a própria tela é a prévia: ela já muda de tamanho enquanto a pessoa
   arrasta). Foto, e-mail, aniversário e CEP viram o cartão "Complete seus
   dados" no Início; o atalho na tela de início é pedido no segundo acesso. */
function Onboarding({ person, member, churchName, churchLogoUrl, onCompleteOnboarding, onDone }: { person: P; member: M | null; churchName?: string; churchLogoUrl?: string | null; organizationId?: string; onCompleteOnboarding?: (personId: string, memberId: string | null, data: MemberContactInput) => Promise<{ error?: string }>; onDone: () => void }) {
  const { comTermos: ct } = useTermos();
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
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const set = (k: keyof MemberContactInput, v: string) => setD((p) => ({ ...p, [k]: v }));
  const todos = contactErrors(d);
  const erros = { name: todos.name, phone: todos.phone };
  const dadosOk = !erros.name && !erros.phone;
  const err = (k: "name" | "phone") => (tentou && erros[k] ? <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 4 }}>{erros[k]}</div> : null);

  const steps = [
    {
      t: `Que bom ter você aqui, ${person.name.split(" ")[0]}`,
      s: "Confirme seu nome e seu telefone. É o que a liderança usa para falar com você.",
      body: (
        <div className="ob-form">
          <div className="field">
            <label className="field-label req">Nome e sobrenome</label>
            <input className="input" value={d.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
            {err("name")}
          </div>
          <div className="field">
            <label className="field-label req">Telefone (WhatsApp)</label>
            <input className="input" type="tel" value={d.phone} autoComplete="tel" placeholder="(11) 90000-0000" onChange={(e) => set("phone", e.target.value)} />
            {err("phone")}
          </div>
        </div>
      ),
      ok: "Continuar →",
    },
    {
      t: "Tamanho do texto",
      s: "Arraste até ler com conforto. A tela inteira já muda junto. Dá para trocar depois no Perfil.",
      body: (
        <div className="ob-textsize">
          <TextSizeSlider previa={false} />
          <div className="m6-card flat ob-previa" aria-hidden="true">
            <div className="m6-kick">Domingo · 9:30</div>
            <div className="m6-ct">{ct("{Culto} da manhã")}</div>
            <div className="m6-meta">Você serve na Recepção · chegar às 9:00</div>
          </div>
        </div>
      ),
      ok: "Entrar no app →",
    },
  ] as const;

  const cur = steps[step];

  const next = async () => {
    if (step === 0) {
      if (!dadosOk) { setTentou(true); return; }
      /* grava ao sair do passo 1 e só avança se gravou: fechar o app no passo 2
         não traz o primeiro acesso de volta. Os outros campos vão como estão
         (vazio não apaga nada no servidor). */
      if (onCompleteOnboarding) {
        setSalvando(true);
        setErroSalvar("");
        const { error } = await onCompleteOnboarding(person.id, member?.id ?? null, d);
        setSalvando(false);
        if (error) { setErroSalvar(error); return; }
      }
      setStep(1);
      return;
    }
    onDone();
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
        {erroSalvar && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 10 }}>{erroSalvar}</div>}
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
    erros?.[k] ? <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 4 }}>{erros[k]}</div> : null;
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
          <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 6 }}>
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
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (form.nascimento ? "nenhuma turma cobre essa idade ainda" : "calculada pelo nascimento")}</div>
      <input className="input" placeholder="Alergias" value={form.alergias} onChange={(e) => setForm((f) => ({ ...f, alergias: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Restrições alimentares" value={form.restricoes} onChange={(e) => setForm((f) => ({ ...f, restricoes: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Plano de saúde ou convênio" value={form.saude} onChange={(e) => setForm((f) => ({ ...f, saude: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Medicamento em uso continuo" value={form.medicamento} onChange={(e) => setForm((f) => ({ ...f, medicamento: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergencia: nome" value={form.emergenciaNome} onChange={(e) => setForm((f) => ({ ...f, emergenciaNome: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergencia: telefone" value={form.emergenciaTel} onChange={(e) => setForm((f) => ({ ...f, emergenciaTel: e.target.value }))} style={{ marginBottom: 12 }} />
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: "var(--fs-app-13)", lineHeight: 1.4 }}>
        <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} style={{ marginTop: 3 }} />
        <span>{imageAuthorizationCopy(form.nome)}</span>
      </label>
      {ficarError && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 8 }}>{ficarError}</div>}
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
                  <div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{child.name}</div>
                  <div className="m-fn">{turma?.name ?? "sem turma"}{child.allergies ? ` · ⚠ ${child.allergies}` : ""}</div>
                </div>
                <span className="m-task-caret">✎</span>
              </div>
              {historico.length > 0 && (
                <div style={{ marginTop: 10, fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>
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
                          <div className="m-culto" style={{ fontSize: "var(--fs-app-13)" }}>{p?.name ?? "Responsavel"}{g.is_primary ? " · principal" : ""}</div>
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
                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: "var(--fs-app-13)" }}>
                        <input type="checkbox" checked={coForm.canPickup} onChange={(e) => setCoForm((f) => ({ ...f, canPickup: e.target.checked }))} /> Pode retirar
                      </label>
                      {coError && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 8 }}>{coError}</div>}
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
              <div style={{ fontSize: "var(--fs-app-13)", marginTop: 4 }}>{post.body}</div>
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
  { id: "caminhada", l: "{Caminhada}", ic: "cursos" },
  { id: "perfil", l: "Perfil", ic: "perfil" },
];
/* barra de abas: 4 abas (lei 1). O Perfil abre pelo avatar no topo, como subtela */
const BAR_TABS = MEMBER_TABS.filter((t) => t.id !== "perfil");
/* o avatar mostra o rótulo "Perfil" no primeiro acesso; depois some */
const AVATAR_VISTO = "cex_avatar_visto";

type ModuleCtx = ContextoMembro;
type MemberModule = {
  id: string;
  /* aba onde o módulo mora */
  home: MemberTab;
  /* título da tela própria (quando abre como subtela com "voltar") */
  title?: string;
  /* quem vê */
  visible: (c: ModuleCtx) => boolean;
  /* categoria do aviso que o módulo dispara (push) */
  notify?: CategoriaAviso;
};
/* gerado pelo registro de módulos (modules/registry.ts), a partir das telas de
   cada manifesto; a igreja desliga módulos em service.churches (0055) */
const membrosDoRegistro = (ligados?: Set<string>): MemberModule[] =>
  telasDoMembro(ligados).map((t) => ({ id: t.id, home: t.aba, title: t.titulo, visible: t.quem, notify: t.aviso }));
const MEMBER_MODULES: MemberModule[] = membrosDoRegistro();
const moduleTitle = (id: string) => MEMBER_MODULES.find((m) => m.id === id)?.title ?? "";

/* casca: folha de baixo, aviso com "Desfazer" e navegação entre abas */
type MemberUi = {
  go: (tab: MemberTab, sub?: string | null, extra?: { agSeg?: "minha" | "igreja"; chatId?: string | null; newChat?: boolean }) => void;
  sheet: (el: React.ReactNode | null) => void;
  toast: (msg: string, action?: { label: string; fn: () => void }) => void;
  /* resposta da escala já dada na tela (antes de o banco gravar, no tempo do "Desfazer"); null desfaz */
  respostas: Record<string, "ok" | "no">;
  responderEscala: (id: string, v: "ok" | "no" | null) => void;
  /* abre a folha do tamanho do texto (Perfil) */
  tamanhoTexto: () => void;
  /* abre o detalhe do evento numa folha (v7 4.5) */
  abrirEvento: (eventId: string) => void;
};
const MemberUiContext = createContext<MemberUi>({ go: () => {}, sheet: () => {}, toast: () => {}, respostas: {}, responderEscala: () => {}, tamanhoTexto: () => {}, abrirEvento: () => {} });

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

/* data em bloquinho: "Dom 04" */
function M6Date({ iso }: { iso: string }) {
  const d = parseISODate(iso);
  if (!d) return <span className="m6-date"><span>·</span><b>·</b></span>;
  const dia = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
  return <span className="m6-date"><span>{dia}</span><b>{String(d.getDate()).padStart(2, "0")}</b></span>;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function dataLonga(iso?: string | null) {
  const d = parseISODate(iso);
  if (!d) return "";
  return `${weekdayFromISO(iso)}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// ── cartão de escala (S18) ────────────────────────────────────────────────────
/* Confirmar e Não posso de 52px. A resposta só vai pro banco depois de alguns
   segundos: dá tempo de tocar em "Desfazer" no aviso. Pedir troca abre uma
   conversa com o líder do time, com a mensagem já escrita. */
const UNDO_MS = 5000;
function EscalaCard({ slot, ev, ministry, person, member, members, onConfirmarEscala, onRecusarEscala, onStartChat, destaque = true }: {
  slot: Slot; ev: Ev; ministry?: Ministry; person: P; member: M | null; members: M[];
  /* botão cheio só no primeiro cartão da fila do Início (lei 5) */
  destaque?: boolean;
  onConfirmarEscala?: (id: string) => void; onRecusarEscala?: (id: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  const [st, setStLocal] = useState<Slot["status"]>(ui.respostas[slot.id] ?? slot.status);
  /* o selo da aba Agenda acompanha a resposta na hora, não só depois de gravar */
  const setSt = (v: Slot["status"]) => { setStLocal(v); ui.responderEscala(slot.id, v === "ok" || v === "no" ? v : null); };
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
  /* troca: destinatário em cadeia, resolvido no banco (v7 2.4). Sem ninguém, sem o botão */
  const destTroca = useDestinatario("troca", ministry?.id ?? null);
  const pedirTroca = () => {
    if (!member || !destTroca || !onStartChat) return;
    ui.sheet(<SheetTroca slot={slot} ev={ev} funcao={funcao} member={member} dest={destTroca} onStartChat={onStartChat} />);
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
          <button className={`m6-btn ${destaque ? "pri" : "sec"}`} type="button" onClick={() => responder("ok")}><Icon name="ok" size={20} />Confirmar</button>
          <button className="m6-btn sec" type="button" onClick={() => responder("no")}>Não posso</button>
        </div>
      )}
      {st === "ok" && (
        <div className="m6-after">
          <M6St k="ok" ic="ok">Presença confirmada</M6St>
          {onStartChat && member && destTroca && <button type="button" className="m6-link" onClick={pedirTroca}>Pedir troca</button>}
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

/* Pedir troca (M3): pede ao destinatário da cadeia ou oferece a vaga a quem
   faz a mesma função e está livre. As duas saídas abrem a conversa. */
function SheetTroca({ slot, ev, funcao, member, dest, onStartChat }: {
  slot: Slot; ev: Ev; funcao?: string; member: M; dest: Destinatario;
  onStartChat: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  const [candidatos, setCandidatos] = useState<{ member_id: string; name: string }[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  useEffect(() => { let vivo = true; candidatosParaVaga(slot.id).then((c) => { if (vivo) setCandidatos(c.filter((x) => x.member_id !== member.id && x.member_id !== dest.member_id)); }); return () => { vivo = false; }; }, [slot.id, member.id, dest.member_id]);
  const quando = joinDot(ev.name, dataLonga(ev.eventDate) || ev.weekday, ev.time);
  const abrir = async (alvo: string, texto: string, aviso: string) => {
    setEnviando(alvo);
    const id = await onStartChat(member.id, alvo, texto);
    setEnviando(null);
    if (!id) { ui.toast("Não foi possível enviar agora. Tente de novo."); return; }
    ui.sheet(null);
    ui.toast(aviso);
    ui.go("mensagens", null, { chatId: id });
  };
  return (
    <div>
      <h2 className="m6-sh">Pedir troca</h2>
      <div className="m6-meta">{joinDot(quando, funcao)}</div>
      <p className="m6-txt">O pedido vai para {papelDoDestinatario(dest)}. A conversa fica em Mensagens.</p>
      <div className="m6-btns">
        <button className="m6-btn pri" type="button" disabled={!!enviando} onClick={() => abrir(dest.member_id, `Oi! Preciso trocar minha escala de ${joinDot(quando, funcao)}. Pode me ajudar?`, "Pedido de troca enviado")}>
          {enviando === dest.member_id ? "Enviando..." : `Pedir a ${dest.name.split(" ")[0]}`}
        </button>
      </div>
      {candidatos.length > 0 && (
        <>
          <div className="m6-lbl" style={{ marginTop: 20 }}>Ou ofereça a vaga</div>
          <div className="m6-meta">{funcao ? `Quem também é ${funcao} e está livre nesse horário.` : "Quem faz a mesma função e está livre nesse horário."}</div>
          {candidatos.map((c) => (
            <div key={c.member_id} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <Av name={c.name} />
              <div className="m6-rb"><div className="m6-rt">{c.name}</div></div>
              <button className="m6-btn small sec" type="button" disabled={!!enviando} onClick={() => abrir(c.member_id, `Oi! Você pode assumir minha vaga${funcao ? ` de ${funcao}` : ""} em ${quando}? Se puder, me avise que eu combino com a liderança.`, "Vaga oferecida")}>
                {enviando === c.member_id ? "Enviando..." : "Oferecer"}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* `serve`: a pessoa está na escala confirmada deste culto (aparece uma vez, com o selo) */
function EventoRow({ ev, serve }: { ev: Ev; serve?: string | null }) {
  const ui = useContext(MemberUiContext);
  return (
    <button type="button" className="m6-row" onClick={() => ui.abrirEvento(ev.id)}>
      <M6Date iso={ev.eventDate} />
      <span className="m6-rb">
        <span className="m6-rt">{ev.name}</span>
        <span className="m6-rs">{joinDot(ev.weekday, ev.time, ev.location)}</span>
        {serve !== undefined && serve !== null && <span className="m6-serve"><M6St k="ok" ic="ok">{joinDot("Você serve", serve)}</M6St></span>}
      </span>
      <span className="m6-chev"><Icon name="avancar" size={18} /></span>
    </button>
  );
}

// ── pedido de oração: vai como conversa para quem cuida da intercessão ──────
/* destinatário em cadeia (v7 2.5): intercessão, depois a gestão. Quem abre
   esta folha já sabe que há alguém para receber (a entrada some sem ninguém) */
function SheetOracao({ member, dest, onStartChat }: {
  member: M | null; dest: Destinatario;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  const [txt, setTxt] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const nome = dest.name.split(" ")[0];
  if (chatId) {
    return (
      <div className="m6-donesh">
        <span className="m6-dot feito big"><Icon name="ok" size={28} /></span>
        <h2 className="m6-sh">Pedido enviado</h2>
        <p className="m6-txt">{nome} recebeu e vai orar por você. A conversa fica em Mensagens.</p>
        <div className="m6-btns"><button className="m6-btn pri" type="button" onClick={() => { ui.sheet(null); ui.go("mensagens", null, { chatId }); }}>Ver em Mensagens</button></div>
      </div>
    );
  }
  return (
    <div>
      <h2 className="m6-sh">Pedido de oração</h2>
      <div className="m6-meta">Vai para {papelDoDestinatario(dest)}. Só essa pessoa lê.</div>
      <textarea className="m6-ta" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Pelo que podemos orar?" aria-label="Pedido de oração" />
      <div className="m6-btns">
        <button className="m6-btn pri" type="button" disabled={!txt.trim() || !member || !onStartChat || enviando} onClick={async () => {
          if (!member || !onStartChat) return;
          setEnviando(true);
          const id = await onStartChat(member.id, dest.member_id, `Pedido de oração: ${txt.trim()}`);
          setEnviando(false);
          if (id) setChatId(id); else ui.toast("Não foi possível enviar agora. Tente de novo.");
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

function CheckinKidsHoje({ person, events, kidsChildren, childGuardians, kidsClasses, kidsSessions, kidsAttendance, organizationId, destaque = true }: {
  person: P; events: Ev[]; kidsChildren: Child[]; childGuardians: ChildGuardian[]; kidsClasses: KidsClass[];
  kidsSessions: KidsSession[]; kidsAttendance: KidsAttendance[]; organizationId?: string;
  /* botão cheio só no primeiro cartão da fila do Início (lei 5) */
  destaque?: boolean;
}) {
  const { comTermos: ct } = useTermos();
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
      {!aberto && abre && <div className="m6-meta">O check-in abre às {abre}, 1 hora antes do {ct("{culto}")}.</div>}
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
              <div className="m6-btns"><button className={`m6-btn ${destaque && i === 0 ? "pri" : "sec"}`} type="button" disabled={busy} onClick={() => ck.checkin(c.id)}>{busy ? "Aguarde..." : `Fazer check-in de ${c.name.split(" ")[0]}`}</button></div>
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

// ── Início (S17, v7 4.3) ──────────────────────────────────────────────────────
/* Duas zonas (decisão 2): "Para você agora" é a fila da casca (lei 5: ordem
   por prioridade e prazo, até 3 na primeira dobra, botão cheio só no
   primeiro, "Tudo em dia" quando vazia); "Da igreja" mostra os eventos da
   semana, até 3. O culto em que a pessoa serve aparece uma vez: com escala a
   confirmar, só o cartão da fila; confirmada, na lista com o selo "Você serve". */
type ItemInicio =
  | { k: "escala"; slot: Slot; ev: Ev }
  | { k: "kids" }
  | { k: "tarefa"; card: Card }
  | { k: "mural"; aviso: Announcement }
  | { k: "passo"; step: StepView }
  | { k: "servir"; times: Ministry[] }
  | { k: "cadastro"; falta: string[] }
  | { k: "atalho" };

const ADIADOS_KEY = "cex_inicio_adiados";
const ouvirAdiados = (cb: () => void) => { window.addEventListener(ADIADOS_KEY, cb); return () => window.removeEventListener(ADIADOS_KEY, cb); };
const lerAdiados = () => { try { return localStorage.getItem(ADIADOS_KEY) ?? "{}"; } catch { return "{}"; } };
/* quantas vezes o app abriu neste aparelho: conta uma vez por carregamento (v7 4.10) */
let acessosDaSessao: number | null = null;
const contarAcesso = () => {
  if (acessosDaSessao === null) {
    try {
      acessosDaSessao = Number(localStorage.getItem("cex_acessos") ?? "0") + 1;
      localStorage.setItem("cex_acessos", String(acessosDaSessao));
    } catch { acessosDaSessao = 0; }
  }
  return acessosDaSessao;
};
const semAssinatura = () => () => {};
const estaInstalado = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
function InicioV6({ person, member, ministries, members, events, roster, cards, announcements, unreadIds, kidsChildren, childGuardians, kidsCheckin, onConfirmarEscala, onRecusarEscala, onStartChat, nextStep, inscricoes, onServir, ligados, acessos = 0, instalado = false, destaque = null, onAbrirDestaque, organizationId }: {
  /* quantas vezes a pessoa abriu o app neste aparelho e se ele já está na tela de início (v7 4.10) */
  acessos?: number; instalado?: boolean;
  /* destaque da igreja (v7 4.4): o mais recente ainda valendo; abrir lê o artigo no app */
  destaque?: Announcement | null; onAbrirDestaque?: (a: Announcement) => void;
  /* medição padrão (lei 11) */
  organizationId?: string;
  person: P; member: M | null; ministries: Ministry[]; members: M[]; events: Ev[]; roster: Slot[]; cards: Card[];
  announcements: Announcement[]; unreadIds: Set<string>; kidsChildren: Child[]; childGuardians: ChildGuardian[];
  kidsCheckin?: (destaque: boolean) => React.ReactNode;
  onConfirmarEscala?: (id: string) => void; onRecusarEscala?: (id: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  nextStep: StepView | null;
  /* etapas ainda não feitas com inscrição aberta (v7 4.7) */
  inscricoes: StepView[];
  onServir: () => void;
  /* módulos ligados na igreja: entrada de módulo desligado não entra na fila */
  ligados?: Set<string>;
}) {
  const { comTermos: ct } = useTermos();
  const ui = useContext(MemberUiContext);
  const [maisFila, setMaisFila] = useState(false);
  const hoje = todayISO();
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const evById = new Map(events.map((e) => [e.id, e]));
  const meusSlots = roster.filter((r) => r.person_id === person.id);
  const aConfirmar = meusSlots
    .filter((r) => r.status === "wait")
    .filter((r) => (evById.get(r.event_id)?.eventDate ?? "") >= hoje);
  /* tarefas (v7 4.6): cada tarefa aberta é um cartão enquanto estiver aberta */
  const minhasTarefas = cards.filter((c) => c.assignees.includes(person.id) && c.column_id !== "done");
  const novo = announcements.find((a) => unreadIds.has(a.id));
  const meusFilhos = childGuardians.filter((g) => g.guardian_person_id === person.id).map((g) => kidsChildren.find((c) => c.id === g.child_id)).filter(Boolean) as Child[];
  const cultoHoje = events.find((e) => e.eventDate === hoje);
  const timesAbertos = ministries.filter((m) => !m.people.some((mp) => mp.personId === person.id));
  const ministryOf = (slot: Slot) => ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  /* v7 4.10: o que ficou fora do primeiro acesso vira cartão de prioridade baixa */
  const faltaDados = member ? [
    !person.photoUrl && "foto",
    !realValue(member.email) && "e-mail",
    !member.birth && "aniversário",
    (member.postalCode ?? "").replace(/\D/g, "").length !== 8 && "CEP",
  ].filter(Boolean) as string[] : [];
  /* cartões adiados neste aparelho; no servidor, nenhum (o HTML começa igual) */
  const adiadosTxt = useSyncExternalStore(ouvirAdiados, lerAdiados, () => "{}");
  const adiados = useMemo(() => { try { return JSON.parse(adiadosTxt) as Record<string, string>; } catch { return {}; } }, [adiadosTxt]);
  const adiar = (id: string, dias: number) => {
    try { localStorage.setItem(ADIADOS_KEY, JSON.stringify({ ...adiados, [id]: somaDias(hoje, dias) })); } catch { /* sem armazenamento */ }
    window.dispatchEvent(new Event(ADIADOS_KEY));
  };
  const adiado = (id: string) => !!adiados[id] && adiados[id] > hoje;
  const incompleto = faltaDados.length > 0 && !adiado("dados");
  const pedirAtalho = acessos === 2 && !instalado && !adiado("atalho");
  const destOracao = useDestinatario("oracao");

  /* entradas dos módulos; a casca ordena */
  const entradas: EntradaFila<ItemInicio>[] = [];
  if (meusFilhos.length > 0 && cultoHoje && kidsCheckin) entradas.push({ id: "kids-hoje", modulo: "kids", tipo: "acao", prioridade: 95, prazo: hoje, conteudo: { k: "kids" } });
  for (const slot of aConfirmar) {
    const ev = evById.get(slot.event_id);
    if (ev) entradas.push({ id: `escala-${slot.id}`, modulo: "escalas", tipo: "acao", prioridade: 90, prazo: `${ev.eventDate} ${ev.time ?? ""}`, conteudo: { k: "escala", slot, ev } });
  }
  for (const t of minhasTarefas) entradas.push({ id: `tarefa-${t.id}`, modulo: "quadros", tipo: "acao", prioridade: t.due ? 70 : 45, prazo: t.due, conteudo: { k: "tarefa", card: t } });
  if (novo) entradas.push({ id: `mural-${novo.id}`, modulo: "mural", tipo: "aviso", prioridade: 50, conteudo: { k: "mural", aviso: novo } });
  if (nextStep) entradas.push({ id: `passo-${nextStep.id}`, modulo: "inicio", tipo: "passo", prioridade: 40, conteudo: { k: "passo", step: nextStep } });
  /* inscrição aberta numa etapa que a pessoa ainda não fez (v7 4.7); se já é o próximo passo, o mesmo cartão serve */
  for (const st of inscricoes) {
    if (st.id === nextStep?.id) continue;
    entradas.push({ id: `inscricao-${st.id}`, modulo: st.id === "batismo" ? "batismos" : "cursos", tipo: "passo", prioridade: 38, conteudo: { k: "passo", step: st } });
  }
  if (incompleto) entradas.push({ id: "cadastro", modulo: "perfil", tipo: "acao", prioridade: 15, conteudo: { k: "cadastro", falta: faltaDados } });
  if (pedirAtalho) entradas.push({ id: "atalho", modulo: "inicio", tipo: "acao", prioridade: 25, conteudo: { k: "atalho" } });
  if (!serve && timesAbertos.length > 0) entradas.push({ id: "servir", modulo: "times", tipo: "passo", prioridade: 20, conteudo: { k: "servir", times: timesAbertos } });
  const fila = ordenarFila(entradas, ligados);
  const visiveis = maisFila ? fila : fila.slice(0, FILA_DOBRA);
  /* lei 11: card_shown dos cartões na tela (uma vez por sessão) */
  const vistosIds = visiveis.map((e) => e.id).join("|");
  useEffect(() => {
    for (const e of visiveis) medirCartaoVisto(organizationId, { id: e.id, modulo: e.modulo, tipo: e.tipo });
  }, [vistosIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const resto = fila.length - visiveis.length;

  const cartao = (e: EntradaFila<ItemInicio>, destaque: boolean) => {
    const c = e.conteudo;
    const btn = `m6-btn ${destaque ? "pri" : "sec"}`;
    switch (c.k) {
      case "kids":
        return <Fragment key={e.id}>{kidsCheckin?.(destaque)}</Fragment>;
      case "escala":
        return <EscalaCard key={e.id} slot={c.slot} ev={c.ev} ministry={ministryOf(c.slot)} person={person} member={member} members={members} onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala} onStartChat={onStartChat} destaque={destaque} />;
      case "tarefa":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Tarefa</div>
            <div className="m6-ct">{c.card.title}</div>
            <div className="m6-meta">{c.card.due ? `Prazo · ${formatDateBR(c.card.due)}` : "Sem prazo"}</div>
            <div className="m6-btns"><button className={btn} type="button" onClick={() => ui.go("agenda", null, { agSeg: "minha" })}>Ver a tarefa</button></div>
          </div>
        );
      case "mural":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick"><Icon name="bandeira" size={16} />Novo no Mural</div>
            <div className="m6-ct">{c.aviso.title}</div>
            {c.aviso.created_at && <div className="m6-meta">{quandoPublicado(c.aviso.created_at)}</div>}
            <div className="m6-btns"><button className={btn} type="button" onClick={() => ui.go("mensagens", "mural")}>Ler a publicação</button></div>
          </div>
        );
      case "passo":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">{c.step.inscricao ? "Inscrições abertas" : "Seu próximo passo"}</div>
            <div className="m6-ct">{c.step.nome}</div>
            {(c.step.inscricao ?? c.step.info) && <div className="m6-meta">{c.step.inscricao ?? c.step.info}</div>}
            <div className="m6-btns"><button className={btn} type="button" onClick={() => (c.step.run ? c.step.run() : ui.go("caminhada"))}>{c.step.acao ?? ct("Ver a {caminhada}")} →</button></div>
          </div>
        );
      case "cadastro":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Seu cadastro</div>
            <div className="m6-ct">Complete seus dados</div>
            <div className="m6-meta">{`Falta ${c.falta.join(", ").replace(/, ([^,]*)$/, " e $1")}. Ajuda a igreja a cuidar de você.`}</div>
            <div className="m6-btns">
              <button className={btn} type="button" onClick={() => ui.go("perfil", "dados")}>Completar →</button>
              <button className="m6-link" type="button" data-dispensa="1" onClick={() => adiar("dados", 30)}>Agora não</button>
            </div>
          </div>
        );
      case "atalho":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Dica</div>
            <div className="m6-ct">Coloque o app na tela de início</div>
            <ul className="m6-facts">
              <li><Icon name="compartilhar" size={20} /><span><b>iPhone:</b> no Safari, toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.</span></li>
              <li><Icon name="menu" size={20} /><span><b>Android:</b> no Chrome, toque no menu de três pontos e depois em &quot;Instalar app&quot;.</span></li>
            </ul>
            <div className="m6-btns">
              <button className={btn} type="button" onClick={() => adiar("atalho", 3650)}>Já coloquei</button>
              <button className="m6-link" type="button" data-dispensa="1" onClick={() => adiar("atalho", 3650)}>Agora não</button>
            </div>
          </div>
        );
      case "servir":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Servir</div>
            <div className="m6-ct">{c.times.length === 1 ? "1 time procura pessoas" : `${c.times.length} times procuram pessoas`}</div>
            <div className="m6-meta">{c.times.slice(0, 3).map((m) => m.name).join(", ")}. Veja o que cada um faz antes de decidir.</div>
            <div className="m6-btns"><button className={btn} type="button" onClick={onServir}>Conhecer os times</button></div>
          </div>
        );
    }
  };

  /* Da igreja: eventos dos próximos 7 dias (sem os que já estão na fila), até 3;
     sem nenhum na semana, o próximo */
  const naFila = new Set(aConfirmar.map((r) => r.event_id));
  const confirmados = new Map<string, string>();
  for (const r of meusSlots) {
    if (r.status !== "ok" || confirmados.has(r.event_id)) continue;
    const m = ministryOf(r);
    confirmados.set(r.event_id, m?.positions?.find((p) => p.id === r.position_id)?.name ?? m?.name ?? "");
  }
  const proximos = events
    .filter((e) => aindaVaiAcontecer(e.eventDate, e.time) && !naFila.has(e.id))
    .sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time));
  const fimDaSemana = somaDias(hoje, 6);
  const daSemana = proximos.filter((e) => e.eventDate <= fimDaSemana);
  const daIgreja = (daSemana.length ? daSemana : proximos.slice(0, 1)).slice(0, 3);

  /* um destaque, parado; com a fila vazia sobe para o topo */
  const cartaoDestaque = destaque && onAbrirDestaque ? <DestaqueCard a={destaque} onAbrir={() => onAbrirDestaque(destaque)} /> : null;
  return (
    <>
      {fila.length === 0 && cartaoDestaque && <div className="m6-sec0">{cartaoDestaque}</div>}
      <div className={fila.length === 0 && cartaoDestaque ? "m6-sec" : "m6-sec0"}>
        <div className="m6-lbl">Para você agora</div>
        {fila.length === 0 ? (
          <div className="m6-card"><div className="m6-ct">Tudo em dia</div><div className="m6-meta">Quando a liderança precisar de você, aparece aqui.</div></div>
        ) : (
          visiveis.map((e, i) => (
            /* lei 11: botão do cartão = card_acted; botão marcado data-dispensa ("Agora não") = card_dismissed */
            <div key={e.id} data-cartao={e.id} onClickCapture={(ev) => {
              const b = (ev.target as HTMLElement).closest("button");
              if (!b) return;
              medir(organizationId, b.dataset.dispensa ? "card_dismissed" : "card_acted", { modulo: e.modulo, tipo: e.tipo, ref: e.id });
            }}>
              {cartao(e, i === 0)}
            </div>
          ))
        )}
        {resto > 0 && (
          <div className="m6-more"><button type="button" className="m6-link" onClick={() => setMaisFila(true)}>{`Ver mais ${plural(resto, "item", "itens")}`}</button></div>
        )}
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Da igreja</div>
        {fila.length > 0 && cartaoDestaque}
        {daIgreja.length > 0 ? (
          <div className="m6-list">{daIgreja.map((ev) => <EventoRow key={ev.id} ev={ev} serve={confirmados.has(ev.id) ? confirmados.get(ev.id) : null} />)}</div>
        ) : (
          <div className="m6-card"><div className="m6-meta">{ct("Os próximos {cultos} e eventos aparecem aqui.")}</div></div>
        )}
        <div className="m6-more"><button type="button" className="m6-link" onClick={() => ui.go("agenda", null, { agSeg: "igreja" })}>Ver a agenda completa →</button></div>
      </div>

      {destOracao && member && onStartChat && (
        <div className="m6-sec">
          <div className="m6-card">
            <div className="m6-ct">Podemos orar por você?</div>
            <div className="m6-meta">Seu pedido vai para {destOracao.via === "intercessao" ? "quem cuida da intercessão" : "a liderança da igreja"}, com cuidado.</div>
            <div className="m6-btns">
              <button className="m6-btn sec" type="button" onClick={() => ui.sheet(<SheetOracao member={member} dest={destOracao} onStartChat={onStartChat} />)}>
                <Icon name="coracao" size={20} />Enviar pedido de oração
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Destaque da igreja (v7 4.4) ───────────────────────────────────────────────
/* Cartão `destaque`: imagem 16:9 (com texto alternativo), título e prazo. Um
   por vez, parado, sem carrossel. Abre o artigo dentro do app. */
function DestaqueCard({ a, onAbrir }: { a: Announcement; onAbrir: () => void }) {
  const video = videoDoLink(a.video_url);
  return (
    <button type="button" className="m6-card m6-destaque" onClick={onAbrir}>
      {a.image_url && <img className="m6-destaque-img" src={a.image_url} alt={a.image_alt ?? ""} />}
      <span className="m6-kick">{video ? "Destaque · vídeo" : "Destaque"}</span>
      <span className="m6-ct">{a.title}</span>
      {a.body && <span className="m6-meta m6-2l">{a.body}</span>}
      <span className="m6-link">{video ? "Assistir" : "Ler"} →</span>
    </button>
  );
}

function SheetArtigo({ a }: { a: Announcement }) {
  const video = videoDoLink(a.video_url);
  return (
    <div className="m6-artigo">
      <div className="m6-kick">{joinDot("Da igreja", a.created_at ? quandoPublicado(a.created_at) : null)}</div>
      <h2 className="m6-sh">{a.title}</h2>
      {video ? (
        <div className={`m6-video ${video.tipo}`}>
          <iframe src={video.src} title={`Vídeo: ${a.title}`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      ) : a.image_url ? (
        <img className="m6-destaque-img" src={a.image_url} alt={a.image_alt ?? ""} />
      ) : null}
      {a.body && <p className="m6-txt" style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>}
    </div>
  );
}

// ── Minha história (v7 4.8, lei 10) ───────────────────────────────────────────
/* Só os fatos, com data, do mais recente para o mais antigo. Sem contagem,
   sem pontos e sem comparação com outras pessoas. */
function MinhaHistoria({ fatos }: { fatos: FatoView[] }) {
  const { comTermos: ct } = useTermos();
  const lista = porData(fatos);
  if (!lista.length) {
    return (
      <div className="m6-sec0">
        <div className="m6-card"><div className="m6-ct">Sua história começa aqui</div><div className="m6-meta">{ct("Quando você servir, concluir uma aula ou der um passo na {caminhada}, fica registrado aqui. Só você vê.")}</div></div>
      </div>
    );
  }
  return (
    <div className="m6-sec0">
      <div className="m6-meta m6-pad">Só você vê esta página.</div>
      <div className="m6-list">
        {lista.map((f) => {
          const t = tipoDoFato(f.event_type);
          return (
            <div className="m6-row" key={f.id}>
              <span className="m6-ic"><Icon name={t.icone} size={22} /></span>
              <span className="m6-rb">
                <span className="m6-rt">{f.title}</span>
                <span className="m6-rs">{joinDot(quandoFoi(f), f.body)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agenda (S19, v7 4.5) ──────────────────────────────────────────────────────
/* "Minha agenda" reúne tudo que envolve a pessoa, por dia, com o tipo escrito
   (Serve, Ensaio, Reunião, Aula, Tarefa, Evento, Culto) e o conflito de horário
   marcado. "Igreja" é a programação pública. Escala a confirmar continua em
   cartão no alto (com Confirmar e Não posso). */
const chegadaDoTime = (m?: Ministry) => (typeof m?.profile?.chegada === "string" ? m.profile.chegada : null);
type TipoAgenda = "Serve" | "Ensaio" | "Reunião" | "Aula" | "Tarefa" | "Evento" | "Culto";
type ItemAgenda = { id: string; data: string; hora?: string | null; tipo: TipoAgenda; titulo: string; sub?: string; selo?: React.ReactNode; abrir?: () => void };

function AgendaV6({ seg, setSeg, person, member, members, ministries, events, roster, cards, boards, isRecep, isKids, onConfirmarEscala, onRecusarEscala, onStartChat, onAddCardComment, onSaveAvailability, aulas, meetings, rehearsals, rsvps }: {
  onSaveAvailability?: (availability: Record<string, boolean>) => Promise<boolean>;
  aulas: { aula: CourseLesson; curso: Course }[];
  meetings: MeetingLite[]; rehearsals: RehearsalLite[]; rsvps: EventRsvp[];
  seg: "minha" | "igreja"; setSeg: (s: "minha" | "igreja") => void;
  person: P; member: M | null; members: M[]; ministries: Ministry[]; events: Ev[]; roster: Slot[]; cards: Card[]; boards: Board[];
  isRecep: boolean; isKids: boolean;
  onConfirmarEscala?: (id: string) => void; onRecusarEscala?: (id: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  onAddCardComment?: (cardId: string, author: string, body: string) => void;
}) {
  const { comTermos: ct } = useTermos();
  const ui = useContext(MemberUiContext);
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const meusTimes = new Set(ministries.filter((m) => m.people.some((mp) => mp.personId === person.id)).map((m) => m.id));
  /* tarefas abertas (v7 4.6): seção só com tarefa aberta; no dia do prazo, também na lista por data */
  const tarefasAbertas = cards.filter((c) => c.assignees.includes(person.id) && c.column_id !== "done");
  const atual = seg;
  const hoje = todayISO();
  const evById = new Map(events.map((e) => [e.id, e]));
  const meus = roster
    .filter((r) => r.person_id === person.id && (evById.get(r.event_id)?.eventDate ?? "") >= hoje)
    .sort((a, b) => (evById.get(a.event_id)?.eventDate ?? "").localeCompare(evById.get(b.event_id)?.eventDate ?? ""));
  const pend = meus.filter((r) => r.status === "wait");
  const outras = meus.filter((r) => r.status !== "wait");
  const ministryOf = (slot: Slot) => ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  /* avisar falta: mesmo destinatário em cadeia da troca (v7 2.4), pelo time
     da próxima escala ou, sem escala, pelo primeiro time da pessoa. Sem ninguém, sem o botão */
  const timeFalta = (meus[0] ? ministryOf(meus[0]) : undefined) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  const destFalta = useDestinatario("troca", timeFalta?.id ?? null);
  const avisarFalta = async () => {
    if (!member || !destFalta || !onStartChat) return;
    const id = await onStartChat(member.id, destFalta.member_id, ct("Oi! Queria avisar que vou faltar num dos próximos {cultos}. Posso te contar qual?"));
    if (id) ui.go("mensagens", null, { chatId: id });
  };

  /* Minha agenda: tudo que envolve a pessoa */
  const itens: ItemAgenda[] = [];
  for (const slot of outras) {
    const ev = evById.get(slot.event_id);
    if (!ev) continue;
    const min = ministryOf(slot);
    const funcao = min?.positions?.find((p) => p.id === slot.position_id)?.name;
    const chegar = slot.status === "ok" ? horaDeChegada(ev.time, chegadaDoTime(min)) : null;
    itens.push({
      id: `s-${slot.id}`, data: ev.eventDate, hora: ev.time, tipo: "Serve", titulo: ev.name,
      sub: joinDot(min?.name, funcao, chegar && `chegar ${chegar}`),
      selo: slot.status === "ok" ? <M6St k="ok" ic="ok">Confirmado</M6St> : <M6St k="warn" ic="recusou">Você não pode</M6St>,
      abrir: () => ui.abrirEvento(ev.id),
    });
  }
  const servindo = new Set(meus.map((r) => r.event_id));
  for (const r of rsvps) {
    const ev = evById.get(r.event_id);
    if (!ev || servindo.has(ev.id) || !aindaVaiAcontecer(ev.eventDate, ev.time)) continue;
    itens.push({
      id: `e-${ev.id}`, data: ev.eventDate, hora: ev.time, tipo: ev.kind === "Culto" ? "Culto" : "Evento", titulo: ev.name, sub: ev.location,
      selo: <M6St k="ok" ic="ok">{r.kind === "inscricao" ? "Inscrito" : "Você vai"}</M6St>,
      abrir: () => ui.abrirEvento(ev.id),
    });
  }
  for (const e of rehearsals) {
    if (!e.rehearsal_date || e.rehearsal_date < hoje) continue;
    if (!(e.ministry_id && meusTimes.has(e.ministry_id)) && !e.attendees?.includes(person.id)) continue;
    itens.push({ id: `r-${e.id}`, data: e.rehearsal_date, hora: e.time, tipo: "Ensaio", titulo: e.title, sub: joinDot(ministries.find((m) => m.id === e.ministry_id)?.name, e.location) });
  }
  for (const m of meetings) {
    if (!m.meeting_date || m.meeting_date < hoje || m.status === "realizada") continue;
    if (!m.ministries?.some((id) => meusTimes.has(id)) && !m.attendees?.includes(person.id)) continue;
    itens.push({ id: `m-${m.id}`, data: m.meeting_date, hora: m.time, tipo: "Reunião", titulo: m.title, sub: m.location ?? undefined });
  }
  for (const { aula, curso } of aulas) {
    itens.push({ id: `a-${aula.id}`, data: aula.lesson_date!, hora: aula.lesson_time, tipo: "Aula", titulo: aula.name, sub: joinDot(curso.name, aula.location) });
  }
  for (const t of tarefasAbertas) {
    const d = (t.due ?? "").slice(0, 10);
    if (d < hoje) continue;
    itens.push({ id: `t-${t.id}`, data: d, tipo: "Tarefa", titulo: t.title, sub: boards.find((b) => b.id === t.board_id)?.name });
  }
  itens.sort((a, b) => `${a.data} ${a.hora || "99"}`.localeCompare(`${b.data} ${b.hora || "99"}`));
  const emConflito = conflitos(itens.filter((i) => i.tipo !== "Tarefa").map((i) => ({ id: i.id, data: i.data, hora: i.hora })));
  const dias = [...new Set(itens.map((i) => i.data))];
  const amanha = somaDias(hoje, 1);
  const nomeDia = (d: string) => (d === hoje ? `Hoje · ${dataLonga(d)}` : d === amanha ? `Amanhã · ${dataLonga(d)}` : dataLonga(d));

  /* Igreja: programação pública, por semana */
  const futuros = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time));
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
      <div className="m6-segwrap">
        <div className="ts-seg two m6-seg" role="radiogroup" aria-label="O que ver">
          {([["minha", "Minha agenda"], ["igreja", "Igreja"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={atual === v} className={atual === v ? "on" : ""} onClick={() => setSeg(v)}>{l}</button>
          ))}
        </div>
      </div>
      {atual === "minha" ? (
        <>
          {pend.length > 0 && (
            <div className="m6-sec">
              <div className="m6-lbl">Escala a confirmar · {pend.length}</div>
              {pend.map((slot) => {
                const ev = evById.get(slot.event_id);
                return ev ? <EscalaCard key={slot.id} slot={slot} ev={ev} ministry={ministryOf(slot)} person={person} member={member} members={members} onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala} onStartChat={onStartChat} /> : null;
              })}
            </div>
          )}
          {dias.map((d) => (
            <div className="m6-sec" key={d}>
              <div className="m6-lbl">{nomeDia(d)}</div>
              <div className="m6-list">
                {itens.filter((i) => i.data === d).map((i) => {
                  const corpo = (
                    <>
                      <span className="m6-ag-h">{i.hora || ""}</span>
                      <span className="m6-rb">
                        <span className="m6-rt">{i.titulo}</span>
                        <span className="m6-rs">{joinDot(i.tipo, i.sub)}</span>
                        {(i.selo || emConflito.has(i.id)) && (
                          <span className="m6-selos">
                            {i.selo}
                            {emConflito.has(i.id) && <M6St k="warn" ic="alerta">Conflito de horário</M6St>}
                          </span>
                        )}
                      </span>
                    </>
                  );
                  return i.abrir ? (
                    <button type="button" className="m6-row" key={i.id} onClick={i.abrir}>{corpo}<span className="m6-chev"><Icon name="avancar" size={18} /></span></button>
                  ) : (
                    <div className="m6-row" key={i.id}>{corpo}</div>
                  );
                })}
              </div>
            </div>
          ))}
          {itens.length === 0 && pend.length === 0 && (
            <div className="m6-sec">
              <div className="m6-card"><div className="m6-ct">Nada marcado para você</div><div className="m6-meta">{ct("O que você tiver na igreja aparece aqui por dia. A programação de {cultos} e eventos está em Igreja.")}</div></div>
            </div>
          )}
          {serve && meus.length === 0 && <div className="m6-pad m6-meta">{ct("Você não está na escala dos próximos {cultos}.")}</div>}
          {tarefasAbertas.length > 0 && (
            <div className="m6-sec m6-legacy">
              <TabTarefas person={person} cards={cards} boards={boards} onAddCardComment={onAddCardComment} />
            </div>
          )}
          {(isRecep || isKids) && (
            <div className="m6-sec">
              <div className="m6-lbl">No seu time</div>
              <div className="m6-list">
                {isRecep && <M6Row ic="visitante" t="Visitantes" s="Cadastrar e acompanhar quem chegou" onClick={() => ui.go("agenda", "visitantes")} />}
                {isKids && <M6Row ic="kids" t="Sala do Kids" s="Check-in, presença e retirada" onClick={() => ui.go("agenda", "kids-sala")} />}
              </div>
            </div>
          )}
          {serve && (
            <div className="m6-sec">
              <div className="m6-lbl">Quando posso servir</div>
              {onSaveAvailability ? <Disponibilidade person={person} onSave={onSaveAvailability} /> : null}
              {member && destFalta && onStartChat && <div className="m6-pad"><button className="m6-btn sec full" type="button" onClick={avisarFalta}>Avisar que vou faltar</button></div>}
            </div>
          )}
        </>
      ) : (
        futuros.length > 0 ? grupos.map((g) => (
          <div className="m6-sec" key={g}>
            <div className="m6-lbl">{g}</div>
            <div className="m6-list">{futuros.filter((e) => semanaDe(e.eventDate) === g).map((ev) => <EventoRow key={ev.id} ev={ev} />)}</div>
          </div>
        )) : (
          <div className="m6-sec"><div className="m6-card"><div className="m6-ct">Agenda vazia</div><div className="m6-meta">{ct("Os {cultos} e eventos da igreja aparecem aqui assim que forem marcados.")}</div></div></div>
        )
      )}
    </>
  );
}

/* Detalhe do evento numa folha (v7 4.5): uma área de ação só, conforme o que o
   evento pede (só aviso, confirmar presença, inscrição); valor e instruções da
   igreja; quem serve vê "Serve · função · chegar HH:MM"; Compartilhar e
   Adicionar ao calendário. */
function SheetEvento({ ev, slot, ministry, rsvp, onRespond, paginaUrl, churchName }: {
  ev: Ev; slot?: Slot; ministry?: Ministry; rsvp: EventRsvp["kind"] | null;
  onRespond?: (eventId: string, vai: boolean) => Promise<boolean>;
  paginaUrl?: string | null; churchName?: string;
}) {
  const ui = useContext(MemberUiContext);
  const [resp, setResp] = useState<EventRsvp["kind"] | null>(rsvp);
  const [enviando, setEnviando] = useState(false);
  const pede = ev.pede ?? "aviso";
  const funcao = slot ? ministry?.positions?.find((p) => p.id === slot.position_id)?.name : undefined;
  const chegar = slot ? horaDeChegada(ev.time, chegadaDoTime(ministry)) : null;
  const responder = async (vai: boolean) => {
    if (!onRespond) return;
    setEnviando(true);
    const ok = await onRespond(ev.id, vai);
    setEnviando(false);
    if (!ok) return;
    setResp(vai ? (pede === "inscricao" ? "inscricao" : "presenca") : null);
    ui.toast(vai ? (pede === "inscricao" ? "Inscrição feita" : "Presença confirmada") : (pede === "inscricao" ? "Inscrição cancelada" : "Presença desfeita"));
  };
  const link = paginaUrl && typeof window !== "undefined" ? `${window.location.origin}${paginaUrl}` : "";
  const texto = [ev.name, joinDot(dataLonga(ev.eventDate) || ev.weekday, ev.time), ev.location, churchName, link].filter(Boolean).join("\n");
  const compartilhar = async () => {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ title: ev.name, text: texto }); return; } catch { return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  };
  const calendario = () => baixarIcs({ id: ev.id, titulo: ev.name, data: ev.eventDate, hora: ev.time, local: ev.location, descricao: churchName ?? null });
  const servindo = slot && slot.status !== "no";
  return (
    <div>
      <div className="m6-kick">{ev.kind && ev.kind !== "Culto" ? ev.kind : "Na igreja"}</div>
      <h2 className="m6-sh">{ev.name}</h2>
      <ul className="m6-facts">
        <li><Icon name="agenda" size={20} /><span>{joinDot(dataLonga(ev.eventDate) || ev.weekday, ev.time)}</span></li>
        {ev.location && <li><Icon name="mapapin" size={20} /><span>{ev.location}</span></li>}
        {servindo && <li><Icon name="times" size={20} /><span>{joinDot("Serve", funcao ?? ministry?.name, chegar && `chegar ${chegar}`)}</span></li>}
      </ul>
      {(ev.valor || ev.instrucoes) && (
        <div className="m6-card m6-ev-info">
          {ev.valor && <div className="m6-ct">{ev.valor}</div>}
          {ev.instrucoes && <p className="m6-txt" style={{ whiteSpace: "pre-wrap" }}>{ev.instrucoes}</p>}
          <div className="m6-meta">O pagamento não passa pelo app.</div>
        </div>
      )}
      {pede !== "aviso" && !servindo && onRespond && (
        resp ? (
          <div className="m6-after">
            <M6St k="ok" ic="ok">{resp === "inscricao" ? "Você está inscrito" : "Presença confirmada"}</M6St>
            <button type="button" className="m6-link" disabled={enviando} onClick={() => responder(false)}>{pede === "inscricao" ? "Cancelar inscrição" : "Desfazer"}</button>
          </div>
        ) : (
          <div className="m6-btns"><button className="m6-btn pri" type="button" disabled={enviando} onClick={() => responder(true)}>{enviando ? "Enviando..." : pede === "inscricao" ? "Fazer inscrição" : "Vou"}</button></div>
        )
      )}
      <div className="m6-btns">
        <button className="m6-btn sec" type="button" onClick={compartilhar}><Icon name="compartilhar" size={20} />Compartilhar</button>
        <button className="m6-btn sec" type="button" onClick={calendario}><Icon name="agenda" size={20} />Adicionar ao calendário</button>
      </div>
    </div>
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
          <div className="m6-meta">{joinDot(quandoPublicado(a.created_at), paraPublico(a.audience))}</div>
          {a.kind === "evento" && onRespond && <RespostaEvento id={a.id} inicial={responses.find((r) => r.announcement_id === a.id)?.response ?? null} onRespond={onRespond} />}
        </article>
      ))}
      <p className="m6-help">Quando você abre o Mural, a igreja sabe que a mensagem chegou.</p>
    </div>
  );
}

// ── Caminhada (S21, S22, S23, S43) ────────────────────────────────────────────
type StepView = {
  id: JourneyStep; nome: string; st: "feito" | "andamento" | "afazer"; info?: string; acao?: string; run?: () => void;
  /* convite com inscrição aberta (v7 4.7): vira cartão próprio no Início, só para quem ainda não fez a etapa */
  inscricao?: string;
};
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
      if (turmaAberta) return { id, nome, st: "afazer", info: joinDot("Inscrições abertas", turmaAberta.label), acao: "Quero me batizar", run: () => onOpenSub("batismo"), inscricao: joinDot(turmaAberta.label, formatDateBR(turmaAberta.baptism_date)) };
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
  const { comTermos: ct } = useTermos();
  const ui = useContext(MemberUiContext);
  const [data, setData] = useState("");
  const [nota, setNota] = useState("");
  return (
    <div>
      <h2 className="m6-sh">{nome}</h2>
      <div className="m6-meta">Conte quando aconteceu. {ct("A liderança confirma e a etapa fica marcada na sua {caminhada}.")}</div>
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
  const [textPos] = useTextSize();
  const textScale = fatorDa(textPos);
  /* Perfil › Tamanho do texto: folha fixa embaixo; ao fechar, a linha que a
     abriu volta ao mesmo lugar da tela (o conteúdo mudou de altura atrás) */
  const [tsAberto, setTsAberto] = useState(false);
  const tsAncora = useRef<{ el: HTMLElement | null; top: number } | null>(null);
  const abrirTamanhoTexto = () => {
    const el = (document.activeElement as HTMLElement | null) ?? null;
    tsAncora.current = { el, top: el?.getBoundingClientRect().top ?? 0 };
    setTsAberto(true);
  };
  const fecharTamanhoTexto = () => {
    setTsAberto(false);
    requestAnimationFrame(() => {
      const a = tsAncora.current;
      const box = scrollRef.current;
      tsAncora.current = null;
      if (!a?.el || !box || !a.el.isConnected) return;
      const delta = a.el.getBoundingClientRect().top - a.top;
      /* a rolagem da coluna conta em pixels já ampliados pelo zoom */
      if (Math.abs(delta) >= 1) box.scrollTop += delta / (parseFloat(getComputedStyle(box).zoom) || 1);
    });
  };
  const { termo, comTermos: ct } = useTermos();
  /* pedido de oração só aparece com alguém para receber (v7 2.5) */
  const destOracao = useDestinatario("oracao");
  /* primeiro acesso termina quando a ficha tem os dados obrigatórios
     (member.contactComplete, calculado no servidor): vale em qualquer
     aparelho e não diverge entre o HTML do servidor e o do navegador */
  const [onboarded, setOnboarded] = useState<boolean>(() => !member || !!(member.firstAccessDone ?? member.contactComplete));
  const { people, ministries, events, roster, cards, boards, enrollments, courseModules = [], courseLessons = [],
          visitors, baptismClasses, announcements: avisosRecebidos, chats, chatMembers, messages, members, onReadAnnouncement, onCompleteOnboarding, onAddCardComment,
          onAdvanceVisitorStage, onRegisterVisitor, onSendMessage, onStartChat,
          organizationId, churchName, churchLogoUrl, theme, setTheme, onChangePassword, onUpdateProfile,
          journeyRequests = [], onRequestJourneyStep, onConfirmarEscala, onRecusarEscala,
          kidsClasses = [], kidsChildren = [], childGuardians = [], kidsSessions = [], kidsAttendance = [],
          kidsEvents = [], kidsEventEnrollments = [], wallPosts = [], bibleMarks = [], onSaveBibleMark,
          missingRequirements = [], serveRequests = [], baptismCandidates = [], onEnrollCourse, onRequestBaptism, onRequestServe,
          mode, onLogout, onSwitchToPanel, readAnnouncementIds = [], churchPurpose,
          onSaveAvailability, onRespondAnnouncement, announcementResponses = [],
          eventRsvps = [], onRespondEvent, meetings = [], rehearsals = [], paginaUrl, timelineEvents = [], fellowshipGroups = [], onMarkChatRead } = rest;
  /* Mural sempre do mais recente para o mais antigo, pela data de publicação */
  const announcements = useMemo(() => porPublicacao(avisosRecebidos), [avisosRecebidos]);
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
  const ligadosMembro = useMemo(() => modulosLigados(rest.modulos), [rest.modulos]);
  const modulosMembro = useMemo(() => membrosDoRegistro(ligadosMembro), [ligadosMembro]);
  const subAllowed = (id: string | null) => !id || (modulosMembro.find((m) => m.id === id)?.visible(ctx) ?? false);
  /* Mural desligado na igreja: sem entrada em Mensagens nem cartão no Início (lei 6) */
  const muralOn = subAllowed("mural");

  const lidos = useMemo(() => new Set(readAnnouncementIds), [readAnnouncementIds]);
  const [lidosAgora, setLidosAgora] = useState<Set<string>>(() => new Set());
  const unreadIds = useMemo(() => new Set(announcements.filter((a) => !lidos.has(a.id) && !lidosAgora.has(a.id)).map((a) => a.id)), [announcements, lidos, lidosAgora]);
  const marcarLido = (personId: string, id: string) => {
    setLidosAgora((p) => (p.has(id) ? p : new Set(p).add(id)));
    onReadAnnouncement?.(personId, id);
  };
  const hoje = todayISO();
  /* destaque valendo: o mais recente com prazo ainda por vir (v7 4.4) */
  const [abriuEm] = useState(() => new Date().toISOString());
  const destaqueAtivo = useMemo(() => announcements.find((a) => !!a.highlight_until && a.highlight_until > abriuEm) ?? null, [announcements, abriuEm]);
  const evDate = new Map(events.map((e) => [e.id, e.eventDate]));
  const [respostas, setRespostas] = useState<Record<string, "ok" | "no">>({});
  const responderEscalaUi = (id: string, v: "ok" | "no" | null) => setRespostas((r) => {
    if (v === null) { if (!(id in r)) return r; const n = { ...r }; delete n[id]; return n; }
    return r[id] === v ? r : { ...r, [id]: v };
  });
  const pendEscala = roster.filter((r) => r.person_id === person.id && ((respostas[r.id] as string | undefined) ?? r.status) === "wait" && (evDate.get(r.event_id) ?? "") >= hoje).length;
  /* conversas não lidas (v7 4.15): lida na hora em que abre, sem esperar o servidor */
  const [conversasLidas, setConversasLidas] = useState<Record<string, string>>({});
  const naoLidas = useMemo(() => naoLidasPorConversa(chatMembers, messages, member?.id, conversasLidas), [chatMembers, messages, member?.id, conversasLidas]);
  const marcarConversaLida = (chatId: string) => {
    setConversasLidas((p) => ({ ...p, [chatId]: new Date().toISOString() }));
    onMarkChatRead?.(chatId);
  };
  const badges: Partial<Record<MemberTab, number>> = { agenda: serves ? pendEscala : 0, mensagens: (muralOn ? unreadIds.size : 0) + naoLidas.size };

  const toast = (msg: string, action?: { label: string; fn: () => void }) => setToastO({ msg, action, id: Date.now() });
  useEffect(() => {
    if (!toastO) return;
    const h = setTimeout(() => setToastO(null), toastO.action ? UNDO_MS : 3600);
    return () => clearTimeout(h);
  }, [toastO]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab, sub]);

  /* v7 4.10: o atalho na tela de início é pedido no segundo acesso (contador no aparelho) */
  const acessos = useSyncExternalStore(semAssinatura, contarAcesso, () => 0);
  const instalado = useSyncExternalStore(semAssinatura, estaInstalado, () => false);
  /* aba de onde o Perfil foi aberto: o "voltar" do Perfil leva para ela */
  const [tabAntesPerfil, setTabAntesPerfil] = useState<MemberTab>("inicio");
  /* rótulo "Perfil" sob o avatar só no primeiro acesso: lido uma vez, gravado na hora */
  const [rotuloAvatar, setRotuloAvatar] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(AVATAR_VISTO)) {
        setRotuloAvatar(true);
        localStorage.setItem(AVATAR_VISTO, "1");
      }
    } catch { /* sem armazenamento: sem rótulo */ }
  }, []);
  const go: MemberUi["go"] = (t, s = null, extra = {}) => {
    if (t === "perfil" && tab !== "perfil") setTabAntesPerfil(tab);
    /* tocar na aba ativa volta ao topo */
    if (t === tab && !s && !sub && !extra.chatId && !extra.newChat) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (extra.agSeg) setAgSeg(extra.agSeg);
    if (extra.chatId !== undefined || extra.newChat) setChatTarget((c) => ({ id: extra.chatId ?? null, novo: !!extra.newChat, n: c.n + 1 }));
    else if (t === "mensagens" && !s) setChatTarget((c) => ({ id: null, novo: false, n: c.n + 1 }));
    setChatAberto(null);
    setTab(t);
    setSub(subAllowed(s) ? s : null);
  };
  const abrirEvento = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const slot = roster.find((r) => r.event_id === ev.id && r.person_id === person.id);
    const ministry = slot ? ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) : undefined;
    const rsvp = eventRsvps.find((r) => r.event_id === ev.id)?.kind ?? null;
    setSheetEl(<SheetEvento key={ev.id} ev={ev} slot={slot} ministry={ministry} rsvp={rsvp} onRespond={onRespondEvent} paginaUrl={paginaUrl} churchName={churchName} />);
  };
  const ui: MemberUi = { go, sheet: setSheetEl, toast, respostas, responderEscala: responderEscalaUi, tamanhoTexto: abrirTamanhoTexto, abrirEvento };

  const pedirEtapa = (step: JourneyStep) => {
    const nome = { decisao: "Decisão", batismo: "Batismo", curso: "Fundamentos", integracao: termo("grupo"), time: "Servindo" }[step];
    setSheetEl(<SheetPedidoEtapa step={step} nome={nome} member={member} onRequestJourneyStep={onRequestJourneyStep} />);
  };
  const abrirTimes = () => setSheetEl(<SheetTimes person={person} member={member} ministries={ministries} members={members} people={people} />);

  /* o primeiro acesso termina na escala pendente (Agenda) ou no próximo culto (detalhe) */
  const terminarPrimeiroAcesso = () => {
    setOnboarded(true);
    if (pendEscala > 0) { go("agenda", null, { agSeg: "minha" }); return; }
    const prox = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time))[0];
    if (prox) abrirEvento(prox.id);
  };

  if (!onboarded) {
    return (
      <div className="phone" data-ts={textPos} style={{ "--m-scale": textScale } as React.CSSProperties}>
        <div className="phone-screen">
          <div className="phone-notch" />
          <Onboarding person={person} member={member} churchName={churchName} churchLogoUrl={churchLogoUrl} organizationId={organizationId} onCompleteOnboarding={onCompleteOnboarding} onDone={terminarPrimeiroAcesso} />
        </div>
      </div>
    );
  }

  const tabTitle = ct(MEMBER_TABS.find((t) => t.id === tab)!.l);
  const subTitle = sub === "chat" ? (chatAberto ?? "Conversa") : sub ? moduleTitle(sub) : "";
  const voltar = () => { if (sub === "chat") { setChatTarget((c) => ({ id: null, novo: false, n: c.n + 1 })); setChatAberto(null); } setSub(null); };

  return (
    <JourneyContext.Provider value={journey}>
    <MemberUiContext.Provider value={ui}>
    <StepsHost
      person={person} member={member} ministries={ministries} courses={courses} enrollments={enrollments} baptismClasses={baptismClasses}
      courseModules={courseModules} courseLessons={courseLessons}
      journeyRequests={journeyRequests} onOpenSub={(s) => go("caminhada", s)} onRequestStep={pedirEtapa} onServir={abrirTimes}
    >
    {(steps) => (
    <div className="phone" data-ts={textPos} style={{ "--m-scale": textScale } as React.CSSProperties}>
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
          ) : tab === "perfil" ? (
            <>
              <button type="button" className="m6-back" onClick={() => go(tabAntesPerfil)}><span className="m6-back-ic"><Icon name="voltar" size={22} /></span>{ct(MEMBER_TABS.find((t) => t.id === tabAntesPerfil)!.l)}</button>
              <h1 className="m-h1 sub">{tabTitle}</h1>
            </>
          ) : (
            <>
              <div className="m-head-top">
                <ChurchLockup size="sm" logoUrl={churchLogoUrl} name={churchName} />
                <button className={`m-head-av${rotuloAvatar ? " has-l" : ""}`} type="button" onClick={() => { setRotuloAvatar(false); go("perfil"); }} aria-label="Perfil">
                  <Av name={person.name} size="sm" photoUrl={person.photoUrl} />
                  {rotuloAvatar && <span className="m-head-av-l" aria-hidden="true">Perfil</span>}
                </button>
              </div>
              {tab === "inicio" ? (
                <>
                  <h1 className="m-h1">{saudacao()}, {person.name.split(" ")[0]}</h1>
                  <p className="m-hsub">{(() => {
                    /* v7 4.19: o mais relevante de hoje; sem nada, a data */
                    const doDia = events.filter((e) => e.eventDate === hoje);
                    const minhaVaga = roster.find((r) => r.person_id === person.id && r.status !== "no" && doDia.some((e) => e.id === r.event_id));
                    const evServe = minhaVaga ? doDia.find((e) => e.id === minhaVaga.event_id) : undefined;
                    const timeServe = minhaVaga ? ministries.find((m) => m.positions?.some((p) => p.id === minhaVaga.position_id)) : undefined;
                    const culto = doDia.filter((e) => aindaVaiAcontecer(e.eventDate, e.time)).sort((a, b) => a.time.localeCompare(b.time))[0];
                    const grupo = member?.groupId ? fellowshipGroups.find((g) => g.id === member.groupId && mesmoDiaDaSemana(g.weekday, hoje)) : undefined;
                    const aula = minhasAulas(member, courses, enrollments, courseModules, courseLessons).find(({ aula: a }) => a.lesson_date === hoje);
                    return linhaDoMembro({
                      serve: evServe ? { hora: evServe.time, chegar: horaDeChegada(evServe.time, chegadaDoTime(timeServe)) } : null,
                      culto: culto ? { nome: culto.name, hora: culto.time } : null,
                      grupo: grupo ? { nome: grupo.name, hora: grupo.time } : null,
                      aula: aula ? { nome: aula.aula.name, hora: aula.aula.lesson_time } : null,
                    }, hoje);
                  })()}</p>
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
              announcements={muralOn ? announcements : []} unreadIds={unreadIds} kidsChildren={kidsChildren} childGuardians={childGuardians}
              kidsCheckin={(destaque) => <CheckinKidsHoje person={person} events={events} kidsChildren={kidsChildren} childGuardians={childGuardians} kidsClasses={kidsClasses}
                kidsSessions={kidsSessions} kidsAttendance={kidsAttendance} organizationId={organizationId} destaque={destaque} />}
              onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala} onStartChat={onStartChat}
              nextStep={steps.find((s) => s.st === "andamento" && s.acao) ?? steps.find((s) => s.st === "afazer" && s.acao && s.id !== "time") ?? null}
              inscricoes={steps.filter((s) => s.st === "afazer" && !!s.inscricao)}
              onServir={abrirTimes} ligados={ligadosMembro} acessos={acessos} instalado={instalado}
              destaque={muralOn ? destaqueAtivo : null}
              organizationId={organizationId}
              onAbrirDestaque={(a) => { setSheetEl(<SheetArtigo a={a} />); marcarLido(person.id, a.id); }} />
          )}

          {tab === "agenda" && !sub && (
            <AgendaV6 seg={agSeg} setSeg={setAgSeg} person={person} member={member} members={members} ministries={ministries} events={events} roster={roster}
              cards={cards} boards={boards} isRecep={isRecep} isKids={isKids} onConfirmarEscala={onConfirmarEscala} onRecusarEscala={onRecusarEscala}
              onStartChat={onStartChat} onAddCardComment={onAddCardComment} onSaveAvailability={onSaveAvailability}
              aulas={minhasAulas(member, courses, enrollments, courseModules, courseLessons)} meetings={meetings} rehearsals={rehearsals} rsvps={eventRsvps} />
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
              {!sub && muralOn && (
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
                  people={people} naoLidas={naoLidas} onLida={marcarConversaLida}
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
                        {destOracao && member && onStartChat && (
                          <M6Row ic="coracao" t="Pedido de oração" s={destOracao.via === "intercessao" ? "Vai para quem cuida da intercessão" : "Vai para a liderança da igreja"} onClick={() => setSheetEl(<SheetOracao member={member} dest={destOracao} onStartChat={onStartChat} />)} />
                        )}
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
          {tab === "perfil" && sub === "minha-historia" && <MinhaHistoria fatos={member ? timelineEvents.filter((f) => f.member_id === member.id) : []} />}
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
          {BAR_TABS.map((t) => {
            const on = tab === t.id;
            const b = badges[t.id] ?? 0;
            return (
              <button key={t.id} type="button" className={on ? "on" : ""} aria-current={on ? "page" : undefined} onClick={() => go(t.id)}>
                <span className="ic">
                  <TabIcon name={t.ic} size={24} />
                  {b > 0 && <span className="m6-badge" aria-label={`${b} novos`}>{b}</span>}
                </span>
                <span className="m-tab-l">{ct(t.l.replace("}", ":curto}"))}</span>
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
        {tsAberto && <TextSizeSheet onClose={fecharTamanhoTexto} />}
      </div>
    </div>
    )}
    </StepsHost>
    </MemberUiContext.Provider>
    </JourneyContext.Provider>
  );
}

/* calcula as etapas dentro dos contextos (precisa do JourneyContext) */
function StepsHost({ children, ...p }: Parameters<typeof useSteps>[0] & { children: (steps: StepView[]) => React.ReactNode }) {
  const steps = useSteps(p);
  return <>{children(steps)}</>;
}

// ── overlay principal (desktop) ───────────────────────────────────────────────

export default function MobileOverlay(props: MobileOverlayProps) {
  const { comTermos: ct } = useTermos();
  const { people, members, onClose, mode = "preview", selfPersonId, onLogout, onSwitchToPanel, textSizePerfil } = props;
  const isSelf = mode === "self";
  /* o aparelho segue o tamanho guardado no perfil (só no app da própria pessoa) */
  useEffect(() => { if (isSelf) sincronizarComPerfil(textSizePerfil); }, [isSelf, textSizePerfil]);

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
          <div className="mob-side-eyebrow">{ct("App do {voluntario}")}</div>
          <h3>{isSelf ? "Cadastro não encontrado" : ct("Nenhum {voluntario} ativo")}</h3>
          <p>
            {isSelf
              ? "Não encontramos seu cadastro de pessoa nesta igreja. Fale com a liderança."
              : ct("Cadastre {voluntarios} em Pessoas para pré-visualizar o app deles aqui.")}
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
              O membro acompanha a {ct("{caminhada}")}, confirma escala, resolve tarefas do quadro,
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
                        {m ? "Membro" : ct("{Voluntario}")}
                        {p.tags.length > 0 ? ` · ${p.tags[0]}` : ""}
                      </small>
                    </div>
                    {i === idx && <span className="mob-persona-chk"><Icon name="ok" size={14} /></span>}
                  </button>
                );
              })}
              <div className="mob-persona-hint">
                {ct("O {voluntario}")} da Recepção vê o módulo de visitantes no lugar de Cursos.
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
