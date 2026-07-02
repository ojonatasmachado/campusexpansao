"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type ChurchView = {
  id: string;
  organizationId: string;
  nome: string;
  cidade: string;
  matriz: boolean;
};

type PersonView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "ativo" | "pausa" | "ferias";
  engagement: number | null;
  availability: Record<string, boolean>;
  tags: string[];
};

type MemberView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  situation: "membro" | "novo";
  firstContact: string;
  neighborhood: string;
  journey: number[];
};

type MinistryView = {
  id: string;
  name: string;
  icon: string;
  description: string;
  positions: Array<{ id: string; ministry_id: string; name: string; need_count: number }>;
  people: Array<{ personId: string; personName: string; isLeader: boolean; functions: string[] }>;
};

type EventView = {
  id: string;
  name: string;
  kind: string;
  weekday: string;
  eventDate: string;
  time: string;
  location: string;
  ministries: string[];
  schedule: Array<{ id: string; item: string; time: string | null; category: string | null }>;
  setlist: Array<{ id: string; title: string; song_key: string | null }>;
};

type RosterAssignmentView = {
  id: string;
  event_id: string;
  position_id: string;
  person_id: string;
  status: "ok" | "wait" | "no";
};

type DecisionView = {
  id: string;
  name: string;
  phone: string | null;
  happened_on: string | null;
  kind: "decisao" | "reconciliacao" | null;
  service_name: string | null;
  responsible_id: string | null;
  status: "novo" | "acompanhando" | "encaminhado";
  member_id: string | null;
  age: number | null;
  notes: string | null;
  created_at: string;
};

type VisitorView = {
  id: string;
  name: string;
  phone: string | null;
  stage: "novo" | "contato" | "integrando" | "membro";
  visited_on: string | null;
  responsible_id: string | null;
  due: string | null;
  due_status: "soon" | "ok" | "late" | null;
  reply_status: "respondeu" | "sem_resposta" | null;
  origin: string | null;
  member_id: string | null;
  created_at: string;
};

type VisitorNoteView = {
  id: string;
  visitor_id: string;
  happened_on: string | null;
  body: string;
  author: string | null;
  is_milestone: boolean;
  created_at: string;
};

type AnnouncementView = {
  id: string;
  title: string;
  audience: string | null;
  body: string | null;
  author: string | null;
  when_label: string | null;
};

type WallPostView = {
  id: string;
  author: string | null;
  audience: string | null;
  body: string;
  pinned: boolean;
  channels: string[];
  created_at: string;
};

type BaptismClassView = {
  id: string;
  label: string;
  baptism_date: string | null;
  location: string | null;
  status: "aberta" | "preparacao" | "agendada" | "concluida" | null;
  pastor: string | null;
  notes: string | null;
  open_enrollment: boolean;
};

type BaptismCandidateView = {
  id: string;
  class_id: string;
  member_id: string | null;
  decision_id: string | null;
};

type CourseView = {
  id: string;
  name: string;
  kind: "trilha" | "conteudo" | "presencial" | null;
  level: string | null;
  description: string | null;
  category: string | null;
};

type EnrollmentView = {
  id: string;
  course_id: string;
  member_id: string;
  done_count: number;
  status: "cursando" | "concluido";
};

type BoardView = {
  id: string;
  name: string;
  scope: "time" | "geral" | null;
  ministry_id: string | null;
  description: string | null;
  columns: Array<{ id: string; nome?: string; name?: string }>;
};

type CardView = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignees: string[];
  due: string | null;
  priority: "alta" | "media" | "baixa" | null;
  source_type: string | null;
  moved_days_ago: number | null;
};

type ChatView = {
  id: string;
  kind: "time" | "grupo" | "dm";
  ministry_id: string | null;
  name: string | null;
};

type ChatMemberView = {
  chat_id: string;
  member_id: string;
};

type MessageView = {
  id: string;
  chat_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};

type MeetingView = {
  id: string;
  title: string;
  meeting_date: string | null;
  time: string | null;
  location: string | null;
  author_id: string | null;
  status: "agendada" | "realizada";
  ministries: string[];
  attendees: string[];
  agenda: unknown[];
  minutes: string | null;
};

type MeetingActionView = {
  id: string;
  meeting_id: string;
  description: string;
  assignee_id: string | null;
  status: "pendente" | "andamento" | "feito";
};

type RehearsalView = {
  id: string;
  ministry_id: string | null;
  title: string;
  kind: string | null;
  rehearsal_date: string | null;
  time: string | null;
  location: string | null;
  recurrence: string | null;
  audience: string | null;
  attendees: string[];
  repertoire: unknown[];
  attachments: unknown[];
  notes: string | null;
};

type RoomView = {
  id: string;
  name: string;
  capacity: number | null;
  location: string | null;
  resources: string[];
};

type ReservationView = {
  id: string;
  room_id: string;
  title: string;
  kind: string | null;
  reserved_date: string | null;
  start_time: string | null;
  end_time: string | null;
  source_type: string | null;
  source_id: string | null;
};

type Props = {
  churches: ChurchView[];
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  roster: RosterAssignmentView[];
  visitorsInCare: number;
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  announcements: AnnouncementView[];
  wallPosts: WallPostView[];
  decisions: DecisionView[];
  baptismClasses: BaptismClassView[];
  baptismCandidates: BaptismCandidateView[];
  courses: CourseView[];
  enrollments: EnrollmentView[];
  boards: BoardView[];
  cards: CardView[];
  chats: ChatView[];
  chatMembers: ChatMemberView[];
  messages: MessageView[];
  meetings: MeetingView[];
  meetingActions: MeetingActionView[];
  rehearsals: RehearsalView[];
  rooms: RoomView[];
  reservations: ReservationView[];
  error: string;
};

type DrawerState =
  | { kind: "person"; id: string }
  | { kind: "member"; id: string }
  | { kind: "ministry"; id: string }
  | { kind: "event"; id: string }
  | null;

type ModalState =
  | {
      title: string;
      eyebrow: string;
      subtitle: string;
      fields: string[];
      action?:
        | { kind: "decision" }
        | { kind: "baptismClass" }
        | { kind: "course" }
        | { kind: "board" }
        | { kind: "card"; boardId: string; columnId: string }
        | { kind: "chat" }
        | { kind: "message"; chatId: string }
        | { kind: "visitor" }
        | { kind: "meeting" }
        | { kind: "rehearsal" }
        | { kind: "announcement" }
        | { kind: "wallPost" }
        | { kind: "room" }
        | { kind: "reservation"; roomId?: string };
    }
  | null;

const ICONS: Record<string, string> = {
  painel: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  relatorios: '<path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-6"/>',
  config: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
  identidade: '<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.6 5-5 2.6 2.6-5 5-2.6Z"/>',
  historia: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
  membros: '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7.5" r="3.5"/><path d="M22 19v-1a4 4 0 0 0-3-3.87"/><path d="M16 3.63a4 4 0 0 1 0 7.75"/>',
  pessoa: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  times: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2"/>',
  visitante: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  decisoes: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7A5 5 0 1 0 3.2 12.7l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/>',
  batismos: '<path d="M12 3s6 5.7 6 10a6 6 0 0 1-12 0c0-4.3 6-10 6-10Z"/>',
  cursos: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  escalas: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  cultos: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/>',
  reunioes: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="m9 14 2 2 4-4"/>',
  ensaios: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  quadros: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M9 5v14"/><path d="M15 5v14"/>',
  espacos: '<path d="M3 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M2 21h20"/><path d="M11 8h.01"/>',
  agenda: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
  comunicacao: '<path d="M3 11 18 5v14L3 13Z"/><path d="M7 12.5V18a1 1 0 0 0 1 1h2"/><path d="M18 9a3 3 0 0 1 0 6"/>',
  conversas: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
  tarefas: '<path d="m9 11 3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  perfil: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  oracao: '<path d="M12 3v9"/><path d="M8 7c0-2 1.8-4 4-4s4 2 4 4c0 3-4 5-4 5s-4-2-4-5Z"/><path d="M5 21c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/>',
  louvor: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  recepcao: '<path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  kids: '<circle cx="12" cy="12" r="9.5"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M8.5 15a4 4 0 0 0 7 0"/>',
  midia: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3Z"/>',
  diaconia: '<path d="M3 7h18l-1.2 13a1 1 0 0 1-1 .9H5.2a1 1 0 0 1-1-.9Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>',
  intercessao: '<path d="M12 3v9"/><path d="M8 7c0-2 1.8-4 4-4s4 2 4 4c0 3-4 5-4 5s-4-2-4-5Z"/><path d="M5 21c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/>',
  ok: '<circle cx="12" cy="12" r="9.5"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
  pendente: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  recusou: '<circle cx="12" cy="12" r="9.5"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
  alerta: '<path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  add: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  editar: '<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filtro: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
  voltar: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  avancar: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  enviar: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
  globo: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  lua: '<path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};

const CEX_ICON_FOR: Record<string, string> = {
  painel: "painel", membros: "membros", pessoas: "pessoa", times: "times", visitantes: "visitante",
  decisoes: "decisoes", batismos: "batismos", cursos: "cursos",
  escalas: "escalas", reunioes: "reunioes", ensaios: "ensaios", quadros: "quadros", espacos: "espacos",
  cultos: "cultos", comunicacao: "comunicacao", conversas: "conversas",
  relatorios: "relatorios", config: "config", identidade: "identidade", historia: "historia",
};

const ROUTES = {
  painel: "CE.X SERVICE · PAINEL",
  membros: "CE.X SERVICE · MEMBROS",
  pessoas: "CE.X SERVICE · VOLUNTÁRIOS",
  times: "CE.X SERVICE · TIMES",
  visitantes: "CE.X SERVICE · VISITANTES",
  decisoes: "CE.X SERVICE · DECISÕES",
  batismos: "CE.X SERVICE · BATISMOS",
  cursos: "CE.X SERVICE · CURSOS",
  escalas: "CE.X SERVICE · ESCALAS",
  reunioes: "CE.X SERVICE · REUNIÕES",
  ensaios: "CE.X SERVICE · ENSAIOS",
  espacos: "CE.X SERVICE · ESPAÇOS",
  quadros: "CE.X SERVICE · QUADROS",
  cultos: "CE.X SERVICE · AGENDA",
  comunicacao: "CE.X SERVICE · COMUNICAÇÃO",
  conversas: "CE.X SERVICE · CONVERSAS",
  relatorios: "CE.X SERVICE · RELATÓRIOS",
  config: "CE.X SERVICE · CONFIGURAÇÕES",
  identidade: "CE.X SERVICE · IDENTIDADE",
  historia: "CE.X SERVICE · NOSSA HISTÓRIA",
};

function Icon({ name, size = 18, stroke = 1.75 }: { name: string; size?: number; stroke?: number }) {
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
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

function TeamMark({ ministry, size = 16 }: { ministry?: { icon?: string; name?: string }; size?: number }) {
  const iconName = (ministry?.icon && ICONS[ministry.icon]) ? ministry.icon :
    (ministry?.name?.toLowerCase().includes("louvor") ? "louvor" :
    ministry?.name?.toLowerCase().includes("kids") ? "kids" :
    ministry?.name?.toLowerCase().includes("mídia") || ministry?.name?.toLowerCase().includes("media") ? "midia" :
    ministry?.name?.toLowerCase().includes("recep") ? "recepcao" :
    ministry?.name?.toLowerCase().includes("diacon") ? "diaconia" :
    ministry?.name?.toLowerCase().includes("intercess") ? "intercessao" : "times");
  return <Icon name={iconName} size={size} />;
}

function IgrejaLogo() {
  return (
    <div className="brand brand-row">
      <span className="sb-logo">CE<span className="ol">.X</span></span>
      <span className="brand-div" aria-hidden="true" />
      <span className="brand-service">Service</span>
    </div>
  );
}

function CongSwitcher({ churches, activeId, setActiveId }: { churches: ChurchView[]; activeId: string; setActiveId: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = churches.find((c) => c.id === activeId) ?? churches[0];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="cong" ref={ref}>
      <button className="cong-btn" type="button" onClick={() => setOpen((o) => !o)}>
        <span className="cong-mark"><Icon name="identidade" size={16} /></span>
        <span className="cong-info">
          <span className="cong-name">{active?.nome ?? "CE.X Central"}</span>
          <span className="cong-role">{active?.matriz ? "Matriz · rede" : "Congregação"}</span>
        </span>
        <span className="cong-caret">▾</span>
      </button>
      {open && churches.length > 1 && (
        <div className="cong-menu">
          <div className="cong-group">Matriz</div>
          {churches.filter((c) => c.matriz).map((c) => (
            <button key={c.id} className={`cong-opt ${c.id === activeId ? "on" : ""}`} type="button"
              onClick={() => { setActiveId(c.id); setOpen(false); }}>
              <span className="cong-opt-mark"><Icon name="identidade" size={14} /></span>
              <span className="cong-opt-info">
                <span className="cong-opt-name">{c.nome}</span>
                <span className="cong-opt-sub">{c.cidade}</span>
              </span>
            </button>
          ))}
          {churches.some((c) => !c.matriz) && (
            <>
              <div className="cong-group">Congregações</div>
              {churches.filter((c) => !c.matriz).map((c) => (
                <button key={c.id} className={`cong-opt ${c.id === activeId ? "on" : ""}`} type="button"
                  onClick={() => { setActiveId(c.id); setOpen(false); }}>
                  <span className="cong-opt-mark"><Icon name="identidade" size={14} /></span>
                  <span className="cong-opt-info">
                    <span className="cong-opt-name">{c.nome}</span>
                    <span className="cong-opt-sub">{c.cidade}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ViewSwitcher({ ministries }: { ministries: MinistryView[] }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<string>("direcao");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeMinistry = ministries.find((m) => m.id === view);
  const label = view === "direcao" ? "Direção" : activeMinistry?.name ?? "Time";
  const role = view === "direcao" ? "Visão geral · master" : "Líder de time";

  return (
    <div className="view-sw" ref={ref}>
      <button className="view-sw-btn" type="button" onClick={() => setOpen((o) => !o)}>
        <span className="view-sw-ic"><Icon name={view === "direcao" ? "identidade" : "times"} size={14} /></span>
        <span className="view-sw-info">
          <span className="view-sw-name">{label}</span>
          <span className="view-sw-role">{role}</span>
        </span>
        <span className="view-sw-caret">▾</span>
      </button>
      {open && (
        <div className="view-sw-menu">
          <div className="view-sw-group">Perspectiva</div>
          <button className={`view-sw-opt ${view === "direcao" ? "on" : ""}`} type="button"
            onClick={() => { setView("direcao"); setOpen(false); }}>
            <span className="view-sw-opt-ic"><Icon name="identidade" size={14} /></span>
            <span className="view-sw-opt-main"><b>Direção</b><small>Visão completa da Igreja</small></span>
          </button>
          {ministries.slice(0, 8).map((m) => (
            <button key={m.id} className={`view-sw-opt ${view === m.id ? "on" : ""}`} type="button"
              onClick={() => { setView(m.id); setOpen(false); }}>
              <span className="view-sw-opt-ic"><TeamMark ministry={m} size={14} /></span>
              <span className="view-sw-opt-main"><b>{m.name}</b><small>Líder · {m.people.length} vol.</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Av({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  return <div className={`av av-${size}`}>{initials(name)}</div>;
}

function Chip({ status }: { status: string }) {
  const cls = status === "ativo" || status === "membro" || status === "ok" ? "chip-ok" : status === "pausa" || status === "wait" ? "chip-wait" : "chip-neutral";
  return <span className={`chip ${cls}`}>{status}</span>;
}

function formatAvailability(value: Record<string, boolean>) {
  const labels: Record<string, string> = { dom_m: "Domingo manhã", dom_n: "Domingo noite", qua: "Quarta" };
  const items = Object.entries(value).filter(([, ok]) => ok).map(([key]) => labels[key] ?? key);
  return items.length ? items.join(" · ") : "Disponibilidade não informada";
}

function Spark({ value }: { value: number }) {
  const series = [62, 66, 61, 72, 70, 78, 76, 84, 80, 87, 86, 94, Math.max(70, value)];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const x = (index: number) => 4 + (index * 232) / (series.length - 1);
  const y = (point: number) => 56 - 4 - ((point - min) / (max - min || 1)) * 48;
  const line = series.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 240 56" preserveAspectRatio="none" style={{ width: "100%", height: 56 }}>
      <defs>
        <linearGradient id="service-sp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--olive)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--olive)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L236,56 L4,56 Z`} fill="url(#service-sp)" />
      <path d={line} fill="none" stroke="var(--olive)" strokeWidth="2" />
    </svg>
  );
}

export default function ServiceExactApp({
  churches,
  people,
  members,
  ministries,
  events,
  roster,
  visitorsInCare,
  visitors,
  visitorNotes,
  announcements,
  wallPosts,
  decisions,
  baptismClasses,
  baptismCandidates,
  courses,
  enrollments,
  boards,
  cards,
  chats,
  chatMembers,
  messages,
  meetings,
  meetingActions,
  rehearsals,
  rooms,
  reservations,
  error,
}: Props) {
  const [route, setRoute] = useState<keyof typeof ROUTES>("painel");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeChurchId, setActiveChurchId] = useState<string>(churches[0]?.id ?? "");

  useEffect(() => {
    document.body.dataset.theme = theme === "light" ? "light" : "";
    return () => { document.body.dataset.theme = ""; };
  }, [theme]);

  const firstChurch = churches.find((c) => c.id === activeChurchId) ?? churches[0];
  const activePeople = people.filter((person) => person.status === "ativo").length;
  const rosterOk = roster.filter((assignment) => assignment.status === "ok").length;
  const confirmationRate = roster.length ? Math.round((rosterOk / roster.length) * 100) : 0;
  const positionsByEvent = useMemo(() => {
    return events.flatMap((event) => {
      const eventMinistries = event.ministries.length ? new Set(event.ministries) : null;
      return ministries.flatMap((ministry) =>
        ministry.positions
          .filter((position) => !eventMinistries || eventMinistries.has(position.ministry_id))
          .map((position) => ({ event, ministry, position })),
      );
    });
  }, [events, ministries]);
  const gaps = positionsByEvent.filter(({ event, position }) =>
    !roster.some((assignment) => assignment.event_id === event.id && assignment.position_id === position.id && assignment.status !== "no"),
  );

  const nav = [
    { group: "Visão geral", items: [{ id: "painel", icon: "painel", label: "Painel" }] },
    {
      group: "Pessoas",
      items: [
        { id: "membros", icon: "membros", label: "Membros", count: members.length },
        { id: "pessoas", icon: "pessoa", label: "Voluntários", count: people.length },
        { id: "times", icon: "times", label: "Times & Ministérios", count: ministries.length },
        { id: "visitantes", icon: "visitante", label: "Visitantes", badge: visitors.length || visitorsInCare },
      ],
    },
    {
      group: "Jornada",
      items: [
        { id: "decisoes", icon: "decisoes", label: "Decisões", count: decisions.length },
        { id: "batismos", icon: "batismos", label: "Batismos", count: baptismClasses.length },
        { id: "cursos", icon: "cursos", label: "Cursos & Trilhas", count: courses.length },
      ],
    },
    {
      group: "Operação",
      items: [
        { id: "escalas", icon: "escalas", label: "Escalas", badge: gaps.length },
        { id: "reunioes", icon: "reunioes", label: "Reuniões", count: meetings.length },
        { id: "ensaios", icon: "ensaios", label: "Ensaios", count: rehearsals.length },
        { id: "quadros", icon: "quadros", label: "Quadros" },
        { id: "cultos", icon: "cultos", label: "Cultos & Agenda", count: events.length },
        { id: "comunicacao", icon: "comunicacao", label: "Comunicação", count: announcements.length + wallPosts.length },
        { id: "conversas", icon: "conversas", label: "Conversas" },
      ],
    },
    {
      group: "Gestão",
      items: [
        { id: "relatorios", icon: "relatorios", label: "Relatórios" },
        { id: "config", icon: "config", label: "Configurações" },
      ],
    },
    {
      group: "Nossa igreja",
      items: [
        { id: "identidade", icon: "identidade", label: "Identidade & propósito" },
        { id: "historia", icon: "historia", label: "Nossa história" },
      ],
    },
  ] as const;

  return (
    <div className="app">
      <aside className="sb">
        <div className="sb-top">
          <IgrejaLogo />
        </div>
        <CongSwitcher churches={churches} activeId={activeChurchId} setActiveId={setActiveChurchId} />
        <nav className="sb-nav">
          {nav.map((group) => (
            <div key={group.group}>
              <div className="sb-group">{group.group}</div>
              {group.items.map((item) => (
                <button key={item.id} className={`sb-link ${route === item.id ? "on" : ""}`} type="button" onClick={() => setRoute(item.id as keyof typeof ROUTES)}>
                  <span className="sb-ic"><Icon name={CEX_ICON_FOR[item.id] ?? item.icon} size={17} /></span>
                  {item.label}
                  {"badge" in item && item.badge ? <span className="sb-badge">{item.badge}</span> : null}
                  {"count" in item && item.count !== undefined ? <span className="sb-count">{item.count}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link className="sb-link" href="/">
            <span className="sb-ic"><Icon name="globo" size={17} /></span> Ver o site público
          </Link>
          <Link className="sb-link" href="/service/login">
            <span className="sb-ic"><Icon name="sair" size={17} /></span> Sair
          </Link>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <div className="top-crumb">{ROUTES[route]}</div>
          <div className="top-search">
            <span className="si"><Icon name="buscar" size={15} /></span>
            <GlobalSearch
              people={people}
              members={members}
              ministries={ministries}
              setRoute={setRoute}
              setDrawer={setDrawer}
            />
          </div>
          <div className="top-actions">
            <ViewSwitcher ministries={ministries} />
            <button className="theme-tog" type="button" title="Mudar tema" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}>
              <Icon name={theme === "dark" ? "sol" : "lua"} size={16} />
            </button>
            <button className="top-icon" type="button" title="Avisos"><Icon name="sino" size={17} /></button>
            <div className="av av-md" style={{ background: "var(--olive-dim)", color: "var(--olive)", border: "0.5px solid var(--olive-line)", cursor: "pointer" }}>
              {firstChurch?.nome ? firstChurch.nome.slice(0, 2).toUpperCase() : "CE"}
            </div>
          </div>
        </header>

        {error ? <ErrorPanel message={error} /> : null}
        {route === "painel" ? <Painel people={people} activePeople={activePeople} confirmationRate={confirmationRate} gaps={gaps} events={events} visitorsInCare={visitorsInCare} setRoute={setRoute} setDrawer={setDrawer} /> : null}
        {route === "membros" ? <Membros members={members} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "pessoas" ? <Pessoas people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "times" ? <Times ministries={ministries} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "visitantes" ? <Visitantes visitors={visitors} visitorNotes={visitorNotes} people={people} setModal={setModal} /> : null}
        {route === "decisoes" ? <Decisoes decisions={decisions} members={members} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "batismos" ? <Batismos baptismClasses={baptismClasses} baptismCandidates={baptismCandidates} decisions={decisions} members={members} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "cursos" ? <CursosTrilhas courses={courses} enrollments={enrollments} members={members} setModal={setModal} /> : null}
        {route === "escalas" ? <Escalas gaps={gaps} roster={roster} people={people} ministries={ministries} events={events} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "reunioes" ? <Reunioes meetings={meetings} meetingActions={meetingActions} ministries={ministries} people={people} setModal={setModal} /> : null}
        {route === "ensaios" ? <Ensaios rehearsals={rehearsals} ministries={ministries} setModal={setModal} /> : null}
        {route === "espacos" ? <Espacos rooms={rooms} reservations={reservations} setModal={setModal} /> : null}
        {route === "quadros" ? <Quadros boards={boards} cards={cards} ministries={ministries} people={people} setModal={setModal} /> : null}
        {route === "cultos" ? <Cultos events={events} ministries={ministries} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "comunicacao" ? <Comunicacao announcements={announcements} wallPosts={wallPosts} setModal={setModal} /> : null}
        {route === "conversas" ? <Conversas chats={chats} chatMembers={chatMembers} messages={messages} ministries={ministries} members={members} setModal={setModal} /> : null}
        {route === "relatorios" ? <Relatorios people={people} members={members} ministries={ministries} events={events} decisions={decisions} baptismClasses={baptismClasses} courses={courses} boards={boards} chats={chats} confirmationRate={confirmationRate} setRoute={setRoute} /> : null}
        {route === "config" ? <Config church={firstChurch} /> : null}
        {route === "identidade" ? <Identidade church={firstChurch} setModal={setModal} /> : null}
        {route === "historia" ? <Historia church={firstChurch} setModal={setModal} /> : null}
      </div>

      <button className="mob-launch" type="button">◷ Ver app do voluntário</button>

      {drawer ? (
        <EntityDrawer
          drawer={drawer}
          people={people}
          members={members}
          ministries={ministries}
          events={events}
          roster={roster}
          setDrawer={setDrawer}
          setRoute={setRoute}
          setModal={setModal}
        />
      ) : null}
      {modal ? (
        <ServiceModal
          modal={modal}
          church={firstChurch}
          people={people}
          members={members}
          ministries={ministries}
          rooms={rooms}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="content">
      <div className="panel">
        <div className="panel-head"><span className="panel-title"><Icon name="config" size={14} /> Aviso</span></div>
        <div className="panel-body"><p className="mini-sub">{message}</p></div>
      </div>
    </div>
  );
}

function PageHead({ title, eyebrow, subtitle, action }: { title: string; eyebrow: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="ph">
      <div>
        <div className="ph-eyebrow">{eyebrow}</div>
        <h1 className="ph-title">{title}</h1>
        <p className="ph-sub">{subtitle}</p>
      </div>
      {action ? <div className="ph-actions">{action}</div> : null}
    </div>
  );
}

function GlobalSearch({
  people,
  members,
  ministries,
  setRoute,
  setDrawer,
}: {
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  setRoute: (route: keyof typeof ROUTES) => void;
  setDrawer: (drawer: DrawerState) => void;
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const results = term
    ? [
        ...members
          .filter((member) => member.name.toLowerCase().includes(term))
          .slice(0, 4)
          .map((member) => ({
            key: `member-${member.id}`,
            type: "Membro",
            icon: "membros",
            name: member.name,
            sub: member.situation,
            action: () => {
              setRoute("membros");
              setDrawer({ kind: "member", id: member.id });
            },
          })),
        ...people
          .filter((person) => person.name.toLowerCase().includes(term))
          .slice(0, 4)
          .map((person) => ({
            key: `person-${person.id}`,
            type: "Voluntário",
            icon: "pessoa",
            name: person.name,
            sub: person.tags.join(" · ") || person.status,
            action: () => {
              setRoute("pessoas");
              setDrawer({ kind: "person", id: person.id });
            },
          })),
        ...ministries
          .filter((ministry) => ministry.name.toLowerCase().includes(term))
          .slice(0, 4)
          .map((ministry) => ({
            key: `ministry-${ministry.id}`,
            type: "Time",
            icon: "times",
            name: ministry.name,
            sub: `${ministry.people.length} voluntários`,
            action: () => {
              setRoute("times");
              setDrawer({ kind: "ministry", id: ministry.id });
            },
          })),
      ]
    : [];

  return (
    <>
      <input
        placeholder="Buscar membro, voluntário, time ou função..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) {
            results[0].action();
            setQuery("");
          }
          if (event.key === "Escape") setQuery("");
        }}
      />
      {term ? (
        <div className="gsearch-pop">
          {results.length === 0 ? <div className="gsearch-empty">Nada encontrado para &quot;{query}&quot;.</div> : null}
          {results.map((result) => (
            <button
              className="gsearch-row"
              key={result.key}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                result.action();
                setQuery("");
              }}
            >
              <span className="gsearch-ic"><Icon name={result.icon} size={15} /></span>
              <span className="gsearch-main"><span className="gsearch-nome">{result.name}</span><span className="gsearch-sub">{result.sub}</span></span>
              <span className="gsearch-tag">{result.type}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function Painel({
  people,
  activePeople,
  confirmationRate,
  gaps,
  events,
  visitorsInCare,
  setRoute,
  setDrawer,
}: {
  people: PersonView[];
  activePeople: number;
  confirmationRate: number;
  gaps: Array<{ event: EventView; ministry: MinistryView; position: { id: string; name: string } }>;
  events: EventView[];
  visitorsInCare: number;
  setRoute: (route: keyof typeof ROUTES) => void;
  setDrawer: (drawer: DrawerState) => void;
}) {
  const topPeople = [...people].sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)).slice(0, 5);
  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Painel</div>
          <h1 className="ph-title">Bom domingo, <em>liderança</em></h1>
          <p className="ph-sub">Visão da semana: quem está escalado, o que falta preencher e quem precisa de acompanhamento.</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-sec" type="button" onClick={() => setRoute("cultos")}>Ver agenda</button>
          <button className="btn btn-pri" type="button" onClick={() => setRoute("escalas")}>Montar escala →</button>
        </div>
      </div>
      <div className="kpi-row">
        <Kpi icon="pessoa" label="Voluntários ativos" value={activePeople} foot={`${people.length} cadastrados`} />
        <Kpi icon="identidade" label="Taxa de confirmação" value={`${confirmationRate}%`} foot="da escala da semana" />
        <Kpi icon="config" label="Vagas em aberto" value={gaps.length} foot={`${gaps.length} pendência(s) nesta semana`} amber />
        <Kpi icon="visitante" label="Visitantes em acomp." value={visitorsInCare} foot="a contatar esta semana" />
      </div>
      <div className="dash-3col">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title"><Icon name="escalas" size={14} /> Pendências da escala</span>
            <button className="panel-link" type="button" onClick={() => setRoute("escalas")}>Resolver</button>
          </div>
          <div className="panel-body flush">
            {gaps.slice(0, 6).map((gap) => (
              <div className="gap-row" key={`${gap.event.id}-${gap.position.id}`}>
                <div className="gap-ic wait">!</div>
                <div className="mini-main">
                  <div className="mini-title">{gap.position.name} <span style={{ color: "var(--subtle)", fontWeight: 400 }}>· {gap.ministry.name}</span></div>
                  <div className="mini-sub">{gap.event.weekday} · {gap.event.time} · 1 vaga(s)</div>
                </div>
                <button className="btn btn-sec btn-sm" type="button" onClick={() => setRoute("escalas")}>Escalar</button>
              </div>
            ))}
            {gaps.length === 0 ? <div className="mini-row"><div className="mini-main"><div className="mini-title">Escala coberta</div><div className="mini-sub">Nenhuma pendência no recorte atual.</div></div></div> : null}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={14} /> Engajamento</span><span className="panel-meta">90 dias</span></div>
            <div className="panel-body">
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em" }}>{confirmationRate || 82}%<span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>presença média</span></div>
              <div style={{ marginTop: 6 }}><Spark value={confirmationRate || 82} /></div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> Próximos cultos</span><button className="panel-link" type="button" onClick={() => setRoute("cultos")}>Agenda</button></div>
            <div className="panel-body flush">
            {events.slice(0, 3).map((event) => <MiniEvent key={event.id} event={event} setDrawer={setDrawer} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="dash-2col">
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={14} /> Voluntários mais engajados</span><button className="panel-link" type="button" onClick={() => setRoute("pessoas")}>Todos</button></div>
          <div className="panel-body flush">
            {topPeople.map((person, index) => <PersonMini key={person.id} person={person} index={index} setDrawer={setDrawer} />)}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} /> Comunicação recente</span><button className="panel-link" type="button" onClick={() => setRoute("comunicacao")}>Ver tudo</button></div>
          <div className="panel-body flush">
            <div className="mini-row"><div className="mini-main"><div className="mini-title">Agenda da semana</div><div className="mini-sub">Liderança · agora</div></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, foot, amber }: { icon: string; label: string; value: string | number; foot: string; amber?: boolean }) {
  return (
    <div className="kpi">
      <div className="kpi-label"><Icon name={icon} size={13} /> {label}</div>
      <div className="kpi-value" style={amber ? { color: "var(--amber)" } : undefined}>{value}</div>
      <div className="kpi-foot">{foot}</div>
    </div>
  );
}

function MiniEvent({ event, setDrawer }: { event: EventView; setDrawer: (drawer: DrawerState) => void }) {
  return (
    <button className="mini-row click" type="button" onClick={() => setDrawer({ kind: "event", id: event.id })}>
      <div className="mini-main">
        <div className="mini-title">{event.name}</div>
        <div className="mini-sub">{event.weekday} · {event.eventDate} · {event.location}</div>
      </div>
      <div className="mini-right">{event.time}</div>
    </button>
  );
}

function PersonMini({ person, index, setDrawer }: { person: PersonView; index: number; setDrawer: (drawer: DrawerState) => void }) {
  return (
    <button className="mini-row click" type="button" onClick={() => setDrawer({ kind: "person", id: person.id })}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--subtle)", width: 18 }}>{String(index + 1).padStart(2, "0")}</span>
      <Av name={person.name} />
      <div className="mini-main">
        <div className="mini-title">{person.name}</div>
        <div className="mini-sub">{person.tags.join(" · ") || person.status}</div>
      </div>
      <div style={{ width: 90 }}><div className="bar"><div className="bar-fill" style={{ width: `${person.engagement ?? 0}%` }} /></div></div>
    </button>
  );
}

function Membros({ members, setDrawer, setModal }: { members: MemberView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content">
      <PageHead title="Membros" eyebrow="Pessoas" subtitle="Membros, novos decididos e jornada de acompanhamento." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Novo membro", title: "Quem chegou na igreja", subtitle: "Cadastre contato, situação e primeiros passos da jornada.", fields: ["Nome completo", "Telefone", "E-mail", "Bairro"] })}>+ Novo membro</button>} />
      <div className="toolbar"><div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar membro..." /></div><div className="seg"><button className="on">Todos</button><button>Novos</button><button>Membros</button></div><div className="tb-spacer" /><span className="panel-meta">{members.length} membros</span></div>
      <div className="tbl">
        <div className="tr th"><div>Membro</div><div>Contato</div><div>Jornada</div><div>Status</div></div>
        {members.map((member) => <button className="tr click" type="button" key={member.id} onClick={() => setDrawer({ kind: "member", id: member.id })}><div className="who"><Av name={member.name} /><div><strong>{member.name}</strong><small>{member.neighborhood}</small></div></div><div>{member.phone}<small>{member.email}</small></div><div>{member.journey.length} passos</div><div><Chip status={member.situation} /></div></button>)}
      </div>
    </div>
  );
}

function Pessoas({ people, setDrawer, setModal }: { people: PersonView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content">
      <PageHead title="Voluntários" eyebrow="Pessoas" subtitle="Quem serve, em quais times e funções. Toque para ver perfil, disponibilidade e histórico." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Novo voluntário", title: "Quem vai servir", subtitle: "Cadastre e já escolha os ministérios. Depois dá para ajustar funções e disponibilidade no perfil.", fields: ["Nome completo", "Telefone", "E-mail", "Frentes"] })}>+ Novo voluntário</button>} />
      <div className="toolbar"><div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar por nome..." /></div><div className="seg"><button className="on">Todos</button><button>Ativos</button><button>Pausa</button></div><div className="tb-spacer" /><span className="panel-meta">{people.length} pessoas</span></div>
      <div className="tbl">
        <div className="tr th"><div>Voluntário</div><div>Disponibilidade</div><div>Frentes</div><div>Status</div></div>
        {people.map((person) => <button className="tr click" type="button" key={person.id} onClick={() => setDrawer({ kind: "person", id: person.id })}><div className="who"><Av name={person.name} /><div><strong>{person.name}</strong><small>{person.phone}</small></div></div><div>{formatAvailability(person.availability)}</div><div>{person.tags.join(" · ") || "sem tags"}</div><div><Chip status={person.status} /></div></button>)}
      </div>
    </div>
  );
}

function Times({ ministries, people, setDrawer, setModal }: { ministries: MinistryView[]; people: PersonView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content">
      <PageHead title="Times & Ministérios" eyebrow="Pessoas" subtitle="Times, líderes, funções e voluntários vinculados." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Novo time", title: "Ministério da igreja", subtitle: "Crie o time, defina funções e depois vincule voluntários.", fields: ["Nome do time", "Descrição", "Funções necessárias"] })}>+ Novo time</button>} />
      <div className="team-grid">
        {ministries.map((ministry) => <button className="team-card" type="button" key={ministry.id} onClick={() => setDrawer({ kind: "ministry", id: ministry.id })}><div className="team-card-top"><div className="team-mark"><TeamMark ministry={ministry} size={20} /></div><div className="av-stack">{ministry.people.slice(0, 4).map((link) => <Av key={link.personId} name={people.find((person) => person.id === link.personId)?.name ?? link.personName} />)}</div></div><div className="team-name">{ministry.name}</div><div className="team-lead">Líder: <em>{ministry.people.find((link) => link.isLeader)?.personName ?? "a definir"}</em></div><div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginTop: 12 }}>{ministry.description}</div><div className="team-foot"><span className="team-stat"><b>{ministry.people.length}</b> voluntários</span><span className="team-stat"><b>{ministry.positions.length}</b> funções</span></div></button>)}
      </div>
    </div>
  );
}

function Escalas({
  gaps,
  roster,
  people,
  ministries,
  events,
  setDrawer,
  setModal,
}: {
  gaps: Array<{ event: EventView; ministry: MinistryView; position: { id: string; name: string } }>;
  roster: RosterAssignmentView[];
  people: PersonView[];
  ministries: MinistryView[];
  events: EventView[];
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
}) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [mode, setMode] = useState<"manual" | "assistido" | "automatico">("manual");
  const [slotAction, setSlotAction] = useState<{
    kind: "slot" | "assign" | "swap";
    event: EventView;
    ministry: MinistryView;
    position: { id: string; name: string; need_count: number };
    assignment?: RosterAssignmentView;
  } | null>(null);

  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0] ?? null;
  const eventRoster = selectedEvent ? roster.filter((assignment) => assignment.event_id === selectedEvent.id) : [];
  const occupiedPeople = new Set(eventRoster.map((assignment) => assignment.person_id));
  const visibleMinistries = selectedEvent?.ministries.length
    ? ministries.filter((ministry) => selectedEvent.ministries.includes(ministry.id))
    : ministries;
  const confirmed = eventRoster.filter((assignment) => assignment.status === "ok").length;
  const totalSlots = visibleMinistries.reduce((sum, ministry) => sum + ministry.positions.reduce((total, position) => total + Math.max(1, position.need_count), 0), 0);
  const openSlots = Math.max(0, totalSlots - eventRoster.filter((assignment) => assignment.status !== "no").length);

  function assignmentsFor(positionId: string) {
    return eventRoster.filter((assignment) => assignment.position_id === positionId);
  }

  function candidatePeople(ministry: MinistryView) {
    const linked = ministry.people
      .map((link) => people.find((person) => person.id === link.personId))
      .filter(Boolean) as PersonView[];
    return linked.length ? linked : people;
  }

  return (
    <div className="content wide">
      <PageHead
        title="Escalas por evento"
        eyebrow="Operação"
        subtitle="Escolha o culto e monte a escala. Cada coluna é um time. Toque numa pessoa para confirmar, trocar ou remover; na vaga para escalar."
        action={
          <>
            <button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Delegar gestão da escala", title: "Quem mais pode montar a escala", subtitle: "As pessoas escolhidas passam a ver e gerir a escala deste time.", fields: ["Voluntário", "Time"] })}><Icon name="membros" size={15} /> Delegar</button>
            <button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "QR Check-in", title: selectedEvent?.name ?? "Culto", subtitle: "Mostre este acesso para registrar presença no culto.", fields: ["Código", "Responsável"] })}><Icon name="cultos" size={15} /> QR Check-in</button>
            <button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Relatório", title: "Baixar escala", subtitle: "Exportar a escala atual para conferência da equipe.", fields: ["Formato"] })}><Icon name="relatorios" size={15} /> Baixar</button>
            <button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Publicar", title: "Publicar & avisar", subtitle: "A equipe recebe a escala pelo app e pelas notificações configuradas.", fields: ["Mensagem"] })}>Publicar & avisar →</button>
          </>
        }
      />

      <div className="esc-modo">
        <span className="esc-modo-lbl">Geração da escala</span>
        <div className="seg seg-sm">
          {[
            ["manual", "Manual"],
            ["assistido", "Assistida"],
            ["automatico", "Automática"],
          ].map(([key, label]) => (
            <button key={key} className={mode === key ? "on" : ""} type="button" onClick={() => setMode(key as typeof mode)}>{label}</button>
          ))}
        </div>
        <span className="esc-modo-hint">
          {mode === "manual" ? "Você monta tudo na mão." : null}
          {mode === "assistido" ? "O sistema sugere os nomes; você confirma cada um." : null}
          {mode === "automatico" ? "O sistema gera e já confirma. Na recusa, chama o próximo apto." : null}
        </span>
        <span className="tb-spacer" />
        <button className="esc-modo-cfg" type="button" onClick={() => setModal({ eyebrow: "Regras", title: "Configuração padrão", subtitle: "Defina intervalo, folgas e prioridade de rodízio.", fields: ["Intervalo mínimo", "Limite por pessoa", "Prioridade"] })}><Icon name="config" size={13} /> Regras</button>
      </div>

      <div className="esc-events">
        {events.map((event) => (
          <button className={`esc-event ${selectedEvent?.id === event.id ? "on" : ""}`} key={event.id} type="button" onClick={() => setEventId(event.id)}>
            <span className="esc-event-day">{event.weekday} · {event.eventDate}</span>
            <span className="esc-event-name">{event.name}</span>
            <span className="esc-event-time">{event.time} · {event.location}</span>
          </button>
        ))}
      </div>

      <div className="toolbar" style={{ marginTop: 4 }}>
        <span className="panel-meta">{selectedEvent ? <><b style={{ color: "var(--light)" }}>{selectedEvent.name}</b> · {selectedEvent.weekday} · {selectedEvent.time}</> : "Selecione um evento"}</span>
        <div className="tb-spacer" />
        <span className="panel-meta" style={{ marginRight: 14 }}><span style={{ color: "var(--olive-soft)" }}>{confirmed}</span> confirmados</span>
        {openSlots > 0 ? <span className="panel-meta"><span style={{ color: "var(--amber)" }}>{openSlots}</span> vagas</span> : null}
      </div>

      <div className="esc-cols">
        {visibleMinistries.map((ministry) => {
          const ministryPositions = ministry.positions.length ? ministry.positions : [{ id: `${ministry.id}-geral`, ministry_id: ministry.id, name: "Equipe", need_count: 1, sort_order: 0 }];
          const ministryNeed = ministryPositions.reduce((sum, position) => sum + Math.max(1, position.need_count), 0);
          const ministryConfirmed = ministryPositions.reduce((sum, position) => sum + assignmentsFor(position.id).filter((assignment) => assignment.status === "ok").length, 0);
          const complete = ministryConfirmed >= ministryNeed;
          return (
            <div className="esc-col" key={ministry.id}>
              <div className="esc-col-head">
                <span className="esc-col-mark"><Icon name="times" size={17} /></span>
                <div className="esc-col-info">
                  <div className="esc-col-tname">{ministry.name}</div>
                  <div className="esc-col-tmeta">{ministryConfirmed}/{ministryNeed} confirmados</div>
                </div>
                <span className={`esc-col-badge ${complete ? "ok" : ""}`}>{complete ? "completo" : `${Math.max(0, ministryNeed - ministryConfirmed)} falta`}</span>
                <button className="esc-col-edit" title="Editar funções deste time" type="button" onClick={() => setModal({ eyebrow: `Funções · ${ministry.name}`, title: "Quem o time precisa", subtitle: "Adicione, renomeie ou remova funções e diga quantas pessoas cada uma precisa.", fields: ["Função", "Quantidade"] })}><Icon name="config" size={14} /></button>
              </div>
              <div className="esc-col-body">
                {ministryPositions.map((position) => {
                  const assignments = assignmentsFor(position.id);
                  const validAssignments = assignments.filter((assignment) => assignment.status !== "no");
                  const missing = Math.max(0, Math.max(1, position.need_count) - validAssignments.length);
                  return (
                    <div className="esc-fnblock" key={position.id}>
                      <div className="esc-fnblock-head">
                        <span className="esc-fnblock-name">{position.name}</span>
                        <span className={`esc-fnblock-need ${missing > 0 ? "gap" : ""}`}>{validAssignments.length}/{Math.max(1, position.need_count)}</span>
                      </div>
                      <div className="esc-fnblock-slots">
                        {assignments.map((assignment) => {
                          const person = people.find((candidate) => candidate.id === assignment.person_id);
                          return (
                            <button
                              key={assignment.id}
                              className={`esc-person ${assignment.status === "no" ? "is-no" : ""}`}
                              type="button"
                              onClick={() => selectedEvent && setSlotAction({ kind: "slot", event: selectedEvent, ministry, position, assignment })}
                            >
                              <Av name={person?.name ?? "Voluntário"} size="xs" />
                              <span className="esc-person-name">{person?.name.split(" ")[0] ?? "Pessoa"}</span>
                              <span className={`slot-st ${assignment.status}`} />
                            </button>
                          );
                        })}
                        {Array.from({ length: missing }).map((_, index) => (
                          <button
                            key={`missing-${position.id}-${index}`}
                            className="esc-vaga"
                            type="button"
                            onClick={() => selectedEvent && setSlotAction({ kind: "assign", event: selectedEvent, ministry, position })}
                          >
                            + escalar
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {visibleMinistries.length === 0 ? <div className="empty" style={{ flex: 1 }}>Nenhum time neste evento.</div> : null}
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 18, flexWrap: "wrap" }}>
        {[["ok", "Confirmado"], ["wait", "Pendente"], ["no", "Recusou"], ["vago", "Vaga aberta"]].map(([key, label]) => (
          <span key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>
            {key === "vago" ? <span style={{ width: 11, height: 11, border: "1px dashed var(--border-3)", borderRadius: 3 }} /> : <span className={`slot-st ${key}`} style={{ width: 9, height: 9 }} />}
            {label}
          </span>
        ))}
      </div>

      {gaps.length > 0 ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="panel-head"><span className="panel-title"><Icon name="escalas" size={14} /> Pendências da semana</span><span className="panel-meta">{gaps.length} vagas</span></div>
          <div className="panel-body flush">
            {gaps.slice(0, 5).map((gap) => <div className="gap-row" key={`${gap.event.id}-${gap.position.id}`}><div className="gap-ic wait">!</div><div className="mini-main"><div className="mini-title">{gap.position.name} <span style={{ color: "var(--subtle)", fontWeight: 400 }}>· {gap.ministry.name}</span></div><div className="mini-sub">{gap.event.name} · {gap.event.time}</div></div></div>)}
          </div>
        </div>
      ) : null}

      {slotAction ? (
        <RosterActionModal
          action={slotAction}
          people={candidatePeople(slotAction.ministry)}
          occupiedPeople={occupiedPeople}
          onClose={() => setSlotAction(null)}
          setDrawer={setDrawer}
          setModal={setModal}
        />
      ) : null}
    </div>
  );
}

function Cultos({ events, ministries, setDrawer, setModal }: { events: EventView[]; ministries: MinistryView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content">
      <PageHead title="Cultos & Agenda" eyebrow="Operação" subtitle="Agenda, roteiro, setlist e ministérios envolvidos em cada culto." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Novo culto", title: "Agenda da igreja", subtitle: "Crie o culto, defina local, horário e os ministérios envolvidos.", fields: ["Nome", "Data", "Horário", "Local"] })}>+ Novo culto</button>} />
      <div className="grid-2">
        {events.map((event) => <button className="panel click" type="button" key={event.id} onClick={() => setDrawer({ kind: "event", id: event.id })}><div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> {event.name}</span><span className="panel-meta">{event.time}</span></div><div className="panel-body"><p className="mini-sub">{event.weekday} · {event.eventDate} · {event.location}</p><div className="divider" style={{ margin: "14px 0" }} />{event.schedule.slice(0, 4).map((item) => <div className="mini-row" key={item.id} style={{ paddingInline: 0 }}><div className="mini-main"><div className="mini-title">{item.item}</div><div className="mini-sub">{item.time ?? "sem horário"} · {item.category ?? "roteiro"}</div></div></div>)}<div className="mini-sub">{event.ministries.map((id) => ministries.find((ministry) => ministry.id === id)?.name).filter(Boolean).join(" · ")}</div></div></button>)}
      </div>
    </div>
  );
}

function RosterActionModal({
  action,
  people,
  occupiedPeople,
  onClose,
  setDrawer,
  setModal,
}: {
  action: {
    kind: "slot" | "assign" | "swap";
    event: EventView;
    ministry: MinistryView;
    position: { id: string; name: string; need_count: number };
    assignment?: RosterAssignmentView;
  };
  people: PersonView[];
  occupiedPeople: Set<string>;
  onClose: () => void;
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
}) {
  const assignedPerson = action.assignment ? people.find((person) => person.id === action.assignment?.person_id) : null;
  if (action.kind === "slot" && action.assignment) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-eyebrow">{action.position.name} · {action.ministry.name} · {action.event.weekday}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <Av name={assignedPerson?.name ?? "Voluntário"} size="lg" />
              <div>
                <div className="modal-title">{assignedPerson?.name ?? "Voluntário"}</div>
                <div style={{ marginTop: 7 }}><Chip status={action.assignment.status} /></div>
              </div>
            </div>
          </div>
          <div className="modal-body">
            <div style={{ display: "grid", gap: 8 }}>
              <button className="btn btn-pri" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Confirmar escala", title: assignedPerson?.name ?? "Voluntário", subtitle: "Marcar como confirmado nesta escala.", fields: ["Observação"] })}>✓ Marcar como confirmado</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Reenviar convite", title: action.event.name, subtitle: "Deixar pendente e reenviar convite pelo app.", fields: ["Mensagem"] })}>Deixar pendente</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Recusa", title: assignedPerson?.name ?? "Voluntário", subtitle: "Registrar recusa e chamar próxima pessoa apta.", fields: ["Motivo"] })}>Marcar que recusou</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Check-in", title: action.event.name, subtitle: "Registrar presença no culto.", fields: ["Presença", "Observação"] })}>● Check-in</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Pedir troca", title: action.position.name, subtitle: "Escolha quem pode substituir nesta função.", fields: ["Substituto", "Mensagem"] })}>⇄ Pedir troca / substituir</button>
              {assignedPerson ? <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setDrawer({ kind: "person", id: assignedPerson.id })}>Ver perfil do voluntário</button> : null}
              <button className="btn btn-danger" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Remover da escala", title: assignedPerson?.name ?? "Voluntário", subtitle: "Remover esta pessoa da escala atual.", fields: ["Motivo"] })}>Remover da escala</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{action.kind === "swap" ? "Pedir troca" : "Escalar"} · {action.position.name} · {action.ministry.name}</div>
          <div className="modal-title">{action.event.name}</div>
          <div className="modal-sub">{action.event.weekday} · {action.event.time}. Verde: disponível. Quem já está em outro time aparece ocupado.</div>
        </div>
        <div className="modal-body">
          {people.length === 0 ? <div className="empty">Ninguém disponível neste time.</div> : null}
          {people.map((person) => {
            const occupied = occupiedPeople.has(person.id);
            return (
              <button className={`cand ${occupied ? "is-block" : ""}`} type="button" key={person.id} onClick={() => occupied ? undefined : setModal({ eyebrow: "Escalar", title: person.name, subtitle: `${action.position.name} · ${action.event.name}`, fields: ["Mensagem do convite"] })}>
                <Av name={person.name} size="md" />
                <div className="cand-main">
                  <div className="cand-name">{person.name}</div>
                  <div className="cand-meta">{person.tags.join(" · ") || person.status} · {person.engagement ?? 0}% engajamento</div>
                </div>
                <span className={`cand-fit ${occupied ? "busy" : "good"}`}>{occupied ? "○ ocupado" : "● disponível"}</span>
              </button>
            );
          })}
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  );
}

const VISITOR_STAGES = [
  { id: "novo", name: "Novo", color: "var(--amber)" },
  { id: "contato", name: "Contato", color: "var(--clay)" },
  { id: "integrando", name: "Integrando", color: "var(--olive)" },
  { id: "membro", name: "Membro", color: "var(--wheat)" },
] as const;

function Visitantes({
  visitors,
  visitorNotes,
  people,
  setModal,
}: {
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  people: PersonView[];
  setModal: (modal: ModalState) => void;
}) {
  const [view, setView] = useState<"pipe" | "list" | "painel">("pipe");
  const personById = new Map(people.map((person) => [person.id, person]));
  const contacted = visitors.filter((visitor) => visitor.reply_status);
  const answered = visitors.filter((visitor) => visitor.reply_status === "respondeu");
  const members = visitors.filter((visitor) => visitor.stage === "membro");
  const replyRate = contacted.length ? Math.round((answered.length / contacted.length) * 100) : 0;
  const integrationRate = visitors.length ? Math.round((members.length / visitors.length) * 100) : 0;
  const byService = visitors.reduce<Record<string, number>>((acc, visitor) => {
    const key = visitor.visited_on || "Sem registro";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxService = Math.max(...Object.values(byService), 1);

  return (
    <div className="content wide">
      <PageHead
        title="Visitantes"
        eyebrow="Pessoas"
        subtitle="Da primeira visita ao discipulado. Cada visitante tem um próximo passo e histórico de contato."
        action={<><div className="seg"><button className={view === "pipe" ? "on" : ""} type="button" onClick={() => setView("pipe")}>Funil</button><button className={view === "list" ? "on" : ""} type="button" onClick={() => setView("list")}>Lista</button><button className={view === "painel" ? "on" : ""} type="button" onClick={() => setView("painel")}>Painel</button></div><button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Visitante", title: "Novo visitante", subtitle: "Registre quem chegou e o próximo contato.", fields: ["Nome", "Telefone", "Como chegou", "Visitou"], action: { kind: "visitor" } })}>+ Visitante</button></>}
      />
      <div className="contato-banner">
        <div className="contato-pill"><span className="contato-pill-n">24h</span><span>1º contato</span></div>
        <div className="contato-main"><div className="contato-t">Primeiro contato em até <em>24h</em> por <em>WhatsApp</em> · meta de integração: <em>30 dias</em></div><div className="contato-s">A equipe acompanha sem dono fixo: qualquer líder pode registrar contato e avançar a jornada.</div></div>
        <button className="btn btn-sec btn-sm" type="button">Ajustar</button>
      </div>

      {view === "painel" ? (
        <div className="vpanel">
          <div className="kpi-row"><Kpi icon="visitante" label="Visitantes" value={visitors.length} foot="no acompanhamento" /><Kpi icon="comunicacao" label="Respondem" value={`${replyRate}%`} foot={`${answered.length} de ${contacted.length} contatados`} /><Kpi icon="membros" label="Integram" value={`${integrationRate}%`} foot={`${members.length} de ${visitors.length}`} /><Kpi icon="config" label="Sem resposta" value={visitors.filter((visitor) => visitor.reply_status === "sem_resposta").length} foot="precisam novo contato" amber /></div>
          <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> Visitantes por culto</span></div><div className="panel-body flush">{Object.entries(byService).map(([name, count]) => <div className="dist-row" key={name}><span className="dist-name">{name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(count / maxService) * 100}%` }} /></div><span className="dist-num">{count}</span></div>)}{visitors.length === 0 ? <div className="empty">Nenhum visitante ainda.</div> : null}</div></div>
        </div>
      ) : view === "pipe" ? (
        <div className="pipe">
          {VISITOR_STAGES.map((stage) => {
            const items = visitors.filter((visitor) => visitor.stage === stage.id);
            return <div className="pipe-col" key={stage.id}><div className="pipe-head"><span className="pipe-dot" style={{ background: stage.color }} /><span className="pipe-name">{stage.name}</span><span className="pipe-num">{items.length}</span></div><div className="pipe-body">{items.map((visitor) => { const owner = visitor.responsible_id ? personById.get(visitor.responsible_id) : null; return <button className="vcard" type="button" key={visitor.id} onClick={() => setModal({ eyebrow: "Visitante", title: visitor.name, subtitle: visitorNotes.find((note) => note.visitor_id === visitor.id)?.body || "Registrar contato ou avanço.", fields: ["Observação"], action: undefined })}><div className="vcard-top"><Av name={visitor.name} size="sm" /><div style={{ minWidth: 0 }}><div className="vcard-name">{visitor.name}</div><div className="vcard-when">{visitor.origin || "Visitante"}</div></div></div><div className="vcard-foot"><div className="vcard-owner">{owner?.name || visitor.origin || "sem dono"}</div><span className={`vcard-due ${visitor.due_status || "ok"}`}>{visitor.due || "próximo contato"}</span></div></button>; })}{items.length === 0 ? <div className="empty" style={{ padding: 14 }}>vazio</div> : null}</div></div>;
          })}
        </div>
      ) : (
        <div className="tbl">
          <div className="tr head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }}><span>Visitante</span><span>Etapa</span><span>Como chegou</span><span>Próximo passo</span><span>Visitou</span></div>
          {visitors.map((visitor) => <div className="tr" key={visitor.id} style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }}><div className="cell-person"><Av name={visitor.name} size="md" /><div><div className="cell-name">{visitor.name}</div><div className="cell-sub">{visitor.phone || "Telefone não informado"}</div></div></div><div><Chip status={visitor.stage === "membro" ? "ok" : "wait"} /></div><div className="cell-sub">{visitor.origin || "Visitante"}</div><div><span className={`vcard-due ${visitor.due_status || "ok"}`}>{visitor.due || "sem prazo"}</span></div><div className="mini-right">{visitor.visited_on || "sem data"}</div></div>)}
        </div>
      )}
    </div>
  );
}

function Reunioes({ meetings, meetingActions, ministries, people, setModal }: { meetings: MeetingView[]; meetingActions: MeetingActionView[]; ministries: MinistryView[]; people: PersonView[]; setModal: (modal: ModalState) => void }) {
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const scheduled = meetings.filter((meeting) => meeting.status === "agendada");
  const finished = meetings.filter((meeting) => meeting.status === "realizada");
  return (
    <div className="content wide">
      <PageHead title="Reuniões" eyebrow="Liderança" subtitle="Pautas, ata e responsabilidades para validar na próxima reunião." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Reunião", title: "Marcar reunião", subtitle: "Defina tema, data, local e time envolvido.", fields: ["Título", "Data", "Horário", "Local", "Time"], action: { kind: "meeting" } })}>+ Marcar reunião</button>} />
      <div className="section-divide"><Icon name="cultos" size={15} /><span className="label">Agendadas</span><span className="line" /></div>
      <div className="reu-grid">{scheduled.map((meeting) => { const author = meeting.author_id ? personById.get(meeting.author_id) : null; return <button className="reu-card" type="button" key={meeting.id} onClick={() => setModal({ eyebrow: meeting.status === "agendada" ? "Reunião agendada" : "Reunião realizada", title: meeting.title, subtitle: meeting.minutes || "Ata e responsabilidades desta reunião.", fields: ["Ata"] })}><div className="reu-card-top"><div><div className="reu-date">{meeting.meeting_date || "Sem data"} · {meeting.time || "sem horário"}</div><div className="reu-title">{meeting.title}</div></div><span className="chip chip-ok">Agendada</span></div><div className="reu-meta">{meeting.location || "Local não informado"} · marcada por {author?.name.split(" ")[0] || "líder"}</div><div className="reu-foot"><div className="reu-times">{meeting.ministries.map((id) => <span className="tag" key={id}>{ministryById.get(id)?.name || "Time"}</span>)}</div><span className="team-stat"><b>{meeting.attendees.length}</b> presentes</span></div></button>; })}{scheduled.length === 0 ? <div className="empty">Nenhuma reunião agendada.</div> : null}</div>
      <div className="section-divide"><Icon name="relatorios" size={15} /><span className="label">Realizadas</span><span className="line" /></div>
      <div className="tbl">{finished.map((meeting) => { const actions = meetingActions.filter((action) => action.meeting_id === meeting.id); const pending = actions.filter((action) => action.status !== "feito").length; return <div className="tr" key={meeting.id} style={{ gridTemplateColumns: "130px 1.6fr 1fr 120px" }}><div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--olive)" }}>{meeting.meeting_date || "sem data"}</div><div><div className="cell-name">{meeting.title}</div><div className="cell-sub">{meeting.ministries.length} time(s) · {meeting.attendees.length} presentes</div></div><div className="cell-sub">{actions.length} responsabilidade(s)</div><div>{pending > 0 ? <span className="chip chip-wait">{pending} em aberto</span> : <span className="chip chip-ok">Tudo feito</span>}</div></div>; })}</div>
    </div>
  );
}

function Ensaios({ rehearsals, ministries, setModal }: { rehearsals: RehearsalView[]; ministries: MinistryView[]; setModal: (modal: ModalState) => void }) {
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  return (
    <div className="content wide">
      <PageHead title="Ensaios" eyebrow="Liderança" subtitle="Ensaios por ministério, presença, repertório e materiais." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Ensaio", title: "Novo ensaio", subtitle: "Marque ensaio com time, data, local e repertório.", fields: ["Título", "Data", "Horário", "Local", "Time"], action: { kind: "rehearsal" } })}>+ Novo ensaio</button>} />
      <div className="reu-grid">{rehearsals.map((rehearsal) => { const ministry = rehearsal.ministry_id ? ministryById.get(rehearsal.ministry_id) : null; return <button className="ens-card" type="button" key={rehearsal.id} onClick={() => setModal({ eyebrow: rehearsal.kind || "Ensaio", title: rehearsal.title, subtitle: rehearsal.notes || "Detalhes do ensaio.", fields: ["Observação"] })}><div className="ens-top"><span className="ens-rec">{rehearsal.recurrence || "eventual"}</span><span className="ens-pub">{rehearsal.kind || "Ensaio"}</span></div><div className="ens-title">{rehearsal.title}</div><div className="ens-when">{rehearsal.rehearsal_date || "sem data"} · {rehearsal.time || "sem horário"} · {rehearsal.location || "sem local"}</div><div className="ens-team"><span className="ens-team-ic"><Icon name="times" size={15} /></span>{ministry?.name || "Vários times"} · {rehearsal.attendees.length} pessoas</div>{rehearsal.repertoire.length ? <div className="ens-obs"><Icon name="cultos" size={13} /> {rehearsal.repertoire.length} item(ns) no repertório</div> : null}{rehearsal.notes ? <div className="ens-obs">{rehearsal.notes}</div> : null}</button>; })}{rehearsals.length === 0 ? <div className="empty">Nenhum ensaio criado.</div> : null}</div>
    </div>
  );
}

function Comunicacao({ announcements, wallPosts, setModal }: { announcements: AnnouncementView[]; wallPosts: WallPostView[]; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content wide">
      <PageHead title="Comunicação" eyebrow="Operação" subtitle="Avisos oficiais, mural da igreja e mensagens que chegam ao app." action={<><button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Mural", title: "Nova publicação", subtitle: "Publique algo para a igreja ou para um público específico.", fields: ["Mensagem", "Público"], action: { kind: "wallPost" } })}>+ Mural</button><button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Aviso", title: "Novo aviso", subtitle: "Envie um aviso oficial para o app.", fields: ["Título", "Mensagem", "Público"], action: { kind: "announcement" } })}>+ Aviso</button></>} />
      <div className="dash-2col">
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} /> Avisos</span><span className="panel-meta">{announcements.length}</span></div><div className="panel-body flush">{announcements.map((item) => <div className="mini-row" key={item.id}><span className="chat-row-ic"><Icon name="sino" size={15} /></span><div className="mini-main"><div className="mini-title">{item.title}</div><div className="mini-sub">{item.body || "Sem texto"} · {item.audience || "todos"}</div></div><span className="chip chip-ok">{item.when_label || "agora"}</span></div>)}{announcements.length === 0 ? <div className="empty">Nenhum aviso publicado.</div> : null}</div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="membros" size={14} /> Mural</span><span className="panel-meta">{wallPosts.length}</span></div><div className="panel-body flush">{wallPosts.map((post) => <div className="mini-row" key={post.id}><Av name={post.author || "CE.X"} /><div className="mini-main"><div className="mini-title">{post.author || "Liderança"}</div><div className="mini-sub">{post.body}</div></div>{post.pinned ? <span className="chip chip-wait">fixado</span> : null}</div>)}{wallPosts.length === 0 ? <div className="empty">Nenhuma publicação no mural.</div> : null}</div></div>
      </div>
    </div>
  );
}

function Espacos({ rooms, reservations, setModal }: { rooms: RoomView[]; reservations: ReservationView[]; setModal: (modal: ModalState) => void }) {
  const [filter, setFilter] = useState("todas");
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const visibleReservations = reservations.filter((reservation) => filter === "todas" || reservation.room_id === filter);
  return (
    <div className="content wide">
      <PageHead
        title="Espaços & reservas"
        eyebrow="Operação"
        subtitle="Salas da igreja e quem usa cada espaço. Reuniões, eventos, cursos e ensaios reservam aqui sem misturar agenda."
        action={<><button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Sala", title: "Nova sala", subtitle: "Cadastre um espaço físico da igreja.", fields: ["Nome", "Capacidade", "Local", "Recursos"], action: { kind: "room" } })}>+ Nova sala</button><button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Reserva", title: "Reservar espaço", subtitle: "Escolha o compromisso, data e horário.", fields: ["Título", "Tipo", "Data", "Início", "Fim"], action: { kind: "reservation", roomId: filter !== "todas" ? filter : undefined } })}>+ Reservar espaço</button></>}
      />
      <div className="sala-grid">
        {rooms.map((room) => {
          const count = reservations.filter((reservation) => reservation.room_id === room.id).length;
          return <button key={room.id} className={`sala-card ${filter === room.id ? "on" : ""}`} type="button" onClick={() => setFilter(filter === room.id ? "todas" : room.id)}><div className="sala-card-top"><span className="sala-mark"><Icon name="config" size={18} /></span><span className="sala-cap">{room.capacity ?? 0} <small>lugares</small></span></div><div className="sala-nome">{room.name}</div><div className="sala-local">{room.location || "Local não informado"}</div>{room.resources.length ? <div className="sala-rec">{room.resources.map((resource) => <span className="tag" key={resource}>{resource}</span>)}</div> : null}<div className="sala-foot">{count} reserva(s)</div></button>;
        })}
        {rooms.length === 0 ? <div className="empty">Nenhuma sala cadastrada ainda.</div> : null}
      </div>
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> Calendário de reservas</span><span className="panel-meta">{visibleReservations.length} reserva(s)</span></div>
        <div className="panel-body flush">
          {visibleReservations.map((reservation) => {
            const room = roomById.get(reservation.room_id);
            return <div className="mini-row" key={reservation.id}><span className="chat-row-ic"><Icon name="config" size={15} /></span><div className="mini-main"><div className="mini-title">{reservation.title}</div><div className="mini-sub">{room?.name || "Sala"} · {reservation.reserved_date || "sem data"} · {reservation.start_time || "sem início"} até {reservation.end_time || "sem fim"}</div></div><span className="chip chip-ok">{reservation.kind || "reserva"}</span></div>;
          })}
          {visibleReservations.length === 0 ? <div className="empty">Nenhuma reserva encontrada.</div> : null}
        </div>
      </div>
    </div>
  );
}

function Decisoes({
  decisions,
  members,
  people,
  setDrawer,
  setModal,
}: {
  decisions: DecisionView[];
  members: MemberView[];
  people: PersonView[];
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
}) {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const newDecisions = decisions.filter((decision) => decision.status === "novo");
  const following = decisions.filter((decision) => decision.status === "acompanhando");
  const forwarded = decisions.filter((decision) => decision.status === "encaminhado");
  return (
    <div className="content wide">
      <PageHead
        title="Decisões por Jesus"
        eyebrow="Jornada"
        subtitle="Quem aceitou ou se reconciliou. Cada decisão vira uma pessoa no sistema e começa uma jornada: registre, acompanhe e encaminhe."
        action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Registrar decisão", title: "Nova decisão", subtitle: "Registre quem decidiu, o culto e quem fará o acompanhamento.", fields: ["Nome", "Telefone", "Culto", "Responsável"], action: { kind: "decision" } })}>+ Registrar decisão</button>}
      />
      <div className="kpi-row">
        <Kpi icon="visitante" label="Decisões no mês" value={decisions.length} foot="registradas na jornada" />
        <Kpi icon="config" label="A contatar" value={newDecisions.length} foot="aguardando primeiro contato" amber />
        <Kpi icon="pessoa" label="Em acompanhamento" value={following.length} foot="discipulado em andamento" />
        <Kpi icon="relatorios" label="Encaminhados" value={forwarded.length} foot="já viraram membros" />
      </div>
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar por nome..." /></div>
        <div className="seg"><button className="on">Todas</button><button>A contatar</button><button>Acompanhando</button><button>Encaminhados</button></div>
        <div className="tb-spacer" />
        <span className="panel-meta">{decisions.length} decisões</span>
      </div>
      <div className="tbl">
        <div className="tr head" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 130px" }}><span>Pessoa</span><span>Quando & culto</span><span>Responsável</span><span>Situação</span></div>
        {decisions.map((decision) => {
          const member = decision.member_id ? memberById.get(decision.member_id) : null;
          const responsible = decision.responsible_id ? personById.get(decision.responsible_id) : null;
          return (
          <button className="tr click" key={decision.id} style={{ gridTemplateColumns: "1.5fr 1fr 1fr 130px" }} type="button" onClick={() => member ? setDrawer({ kind: "member", id: member.id }) : setModal({ eyebrow: "Decisão", title: decision.name, subtitle: decision.notes || "Pessoa ainda sem vínculo com membro.", fields: ["Responsável", "Observação"] })}>
            <div className="cell-person"><Av name={decision.name} size="md" /><div><div className="cell-name">{decision.name} <span className="chip chip-ok" style={{ marginLeft: 6, transform: "scale(0.92)" }}>{decision.kind === "reconciliacao" ? "Reconciliação" : "Decisão"}</span></div><div className="cell-sub">{decision.phone || "Telefone não informado"}</div></div></div>
            <div><div style={{ fontSize: 13, color: "var(--light)" }}>{decision.happened_on || "Data não informada"}</div><div className="cell-sub">{decision.service_name || "Culto não informado"}</div></div>
            <div className="cell-person">{responsible ? <Av name={responsible.name} size="sm" /> : null}<div className="cell-sub" style={{ marginTop: 0 }}>{responsible?.name ?? "a definir"}</div></div>
            <div><Chip status={decision.status === "novo" ? "wait" : decision.status === "encaminhado" ? "ok" : "ativo"} /></div>
          </button>
          );
        })}
        {decisions.length === 0 ? <div className="empty">Nenhuma decisão registrada ainda.</div> : null}
      </div>
    </div>
  );
}

function Batismos({
  baptismClasses,
  baptismCandidates,
  decisions,
  members,
  setDrawer,
  setModal,
}: {
  baptismClasses: BaptismClassView[];
  baptismCandidates: BaptismCandidateView[];
  decisions: DecisionView[];
  members: MemberView[];
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
}) {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const decisionById = new Map(decisions.map((decision) => [decision.id, decision]));
  const currentClass = baptismClasses[0];
  const currentCandidates = currentClass ? baptismCandidates.filter((candidate) => candidate.class_id === currentClass.id) : [];
  const concluded = baptismClasses.filter((item) => item.status === "concluida").length;
  return (
    <div className="content wide">
      <PageHead title="Batismos" eyebrow="Jornada" subtitle="Turmas de batismo nas águas. Inscrições, curso pré-batismo, agenda e histórico na linha do tempo da pessoa." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Turma de batismo", title: "Nova turma", subtitle: "Crie a turma, defina data, local e candidatos.", fields: ["Nome da turma", "Data", "Local", "Pastor"], action: { kind: "baptismClass" } })}>+ Nova turma</button>} />
      <div className="kpi-row"><Kpi icon="identidade" label="Turmas abertas" value={baptismClasses.filter((item) => item.open_enrollment).length} foot="com inscrições disponíveis" /><Kpi icon="pessoa" label="Candidatos" value={baptismCandidates.length} foot="em preparação" /><Kpi icon="cultos" label="Próximo batismo" value={currentClass?.baptism_date ? "1" : "0"} foot={currentClass?.baptism_date || "sem data"} /><Kpi icon="relatorios" label="Concluídos" value={concluded} foot="histórico da igreja" /></div>
      <div className="dash-2col">
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="identidade" size={14} /> Turma atual</span><span className="chip chip-ok">{currentClass?.status ?? "sem turma"}</span></div>
          <div className="panel-body"><div className="profile-name" style={{ fontSize: 22 }}>{currentClass?.label ?? "Nenhuma turma criada"}</div><p className="mini-sub">{currentClass?.baptism_date || "Sem data"} · {currentClass?.location || "Local não informado"} · {currentClass?.pastor || "Pastor não informado"}</p><button className="btn btn-sec btn-sm" style={{ marginTop: 14 }} type="button" onClick={() => setModal({ eyebrow: "Adicionar candidato", title: currentClass?.label ?? "Turma de batismo", subtitle: "Escolha quem será batizado nesta turma.", fields: ["Candidato"] })}>+ Adicionar candidato</button></div>
        </div>
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={14} /> Candidatos</span><span className="panel-meta">{currentCandidates.length} pessoas</span></div>
          <div className="panel-body flush">
            {currentCandidates.map((candidate) => {
              const member = candidate.member_id ? memberById.get(candidate.member_id) : null;
              const decision = candidate.decision_id ? decisionById.get(candidate.decision_id) : null;
              const name = member?.name ?? decision?.name ?? "Candidato";
              return <button className="mini-row click" type="button" key={candidate.id} onClick={() => member ? setDrawer({ kind: "member", id: member.id }) : setModal({ eyebrow: "Candidato", title: name, subtitle: "Candidato vindo de uma decisão.", fields: ["Observação"] })}><Av name={name} /><div className="mini-main"><div className="mini-title">{name}</div><div className="mini-sub">{member?.phone ?? decision?.phone ?? "Telefone não informado"}</div></div><span className="chip chip-wait">preparação</span></button>;
            })}
            {currentCandidates.length === 0 ? <div className="empty">Nenhum candidato nesta turma.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CursosTrilhas({ courses, enrollments, members, setModal }: { courses: CourseView[]; enrollments: EnrollmentView[]; members: MemberView[]; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content wide">
      <PageHead title="Cursos & Trilhas" eyebrow="Jornada" subtitle="Trilhas internas de formação, aulas e participantes. Não mistura com cursos comerciais CE.X." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Nova trilha", title: "Curso interno", subtitle: "Crie a trilha de formação da igreja.", fields: ["Nome", "Nível", "Descrição"], action: { kind: "course" } })}>+ Nova trilha</button>} />
      <div className="team-grid">
        {courses.map((course) => {
          const courseEnrollments = enrollments.filter((item) => item.course_id === course.id);
          const concluded = courseEnrollments.filter((item) => item.status === "concluido").length;
          return <button className="team-card" type="button" key={course.id} onClick={() => setModal({ eyebrow: "Curso", title: course.name, subtitle: "Gerencie módulos, aulas e matrículas.", fields: ["Módulo", "Aula", "Participante"] })}><div className="team-card-top"><div className="team-mark"><Icon name="relatorios" size={20} /></div><span className="chip chip-ok">{course.level || course.category || "trilha"}</span></div><div className="team-name">{course.name}</div><div className="team-lead">Matrículas: <em>{courseEnrollments.length}</em></div><p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, marginTop: 12 }}>{course.description || "Acompanhamento de progresso e conclusão na linha do tempo do membro."}</p><div className="bar" style={{ marginTop: 14 }}><div className="bar-fill" style={{ width: `${courseEnrollments.length ? (concluded / courseEnrollments.length) * 100 : Math.min(100, members.length * 2)}%` }} /></div></button>;
        })}
        {courses.length === 0 ? <div className="empty">Nenhuma trilha interna criada ainda.</div> : null}
      </div>
    </div>
  );
}

function Quadros({
  boards,
  cards,
  ministries,
  people,
  setModal,
}: {
  boards: BoardView[];
  cards: CardView[];
  ministries: MinistryView[];
  people: PersonView[];
  setModal: (modal: ModalState) => void;
}) {
  const [boardId, setBoardId] = useState<string | null>(null);
  const selected = boards.find((board) => board.id === boardId);
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  if (selected) {
    const columns = selected.columns.length ? selected.columns.map((column) => ({ id: column.id, name: column.nome ?? column.name ?? column.id })) : [
      { id: "todo", name: "A fazer" },
      { id: "doing", name: "Em andamento" },
      { id: "done", name: "Concluído" },
    ];
    const boardCards = cards.filter((card) => card.board_id === selected.id);
    const ministry = selected.ministry_id ? ministryById.get(selected.ministry_id) : null;
    return (
      <div className="content wide">
        <div className="ph"><div><button className="back-link" type="button" onClick={() => setBoardId(null)}>Voltar para quadros</button><h1 className="ph-title" style={{ marginTop: 8 }}>{selected.name}</h1><p className="ph-sub">{selected.description || ministry?.description || "Quadro de tarefas da operação."}</p></div><div className="ph-actions"><button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Novo card", title: selected.name, subtitle: "Crie uma responsabilidade para este quadro.", fields: ["Título", "Responsável", "Prazo"], action: { kind: "card", boardId: selected.id, columnId: columns[0]?.id ?? "todo" } })}>+ Card</button></div></div>
        <div className="kb-board">
          {columns.map((column) => {
            const columnCards = boardCards.filter((card) => card.column_id === column.id);
            return <div className="kb-col" key={column.id}><div className="kb-col-head"><span className="kb-col-name">{column.name}</span><span className="kb-col-count">{columnCards.length}</span></div><div className="kb-col-body">{columnCards.map((card) => { const assignee = card.assignees[0] ? peopleById.get(card.assignees[0]) : null; return <button className="kb-card" type="button" key={card.id} onClick={() => setModal({ eyebrow: selected.name, title: card.title, subtitle: card.description || "Card do quadro. Responsável, prazo e comentários.", fields: ["Comentário"] })}><div className="kb-card-top"><span className={`prio-dot prio-${card.priority ?? "media"}`} /><span className="kb-origem"><Icon name="cultos" size={11} /> {card.source_type || selected.scope || "tarefa"}</span></div><div className="kb-card-title">{card.title}</div><div className="kb-card-foot"><span className="kb-prazo soon">{card.due || "sem prazo"}</span>{assignee ? <Av name={assignee.name} /> : null}</div></button>; })}<button className="kb-add" type="button" onClick={() => setModal({ eyebrow: "Novo card", title: column.name, subtitle: "Criar card nesta coluna.", fields: ["Título", "Responsável", "Prazo"], action: { kind: "card", boardId: selected.id, columnId: column.id } })}>+ Card</button></div></div>;
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="content wide">
      <PageHead title="Quadros de tarefas" eyebrow="Operação" subtitle="Um quadro por time ou da Direção. Cada tarefa é um card com responsável, prazo e status." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Novo quadro", title: "Quadro de tarefas", subtitle: "Crie um quadro para um time ou para a liderança.", fields: ["Nome", "Time", "Descrição"], action: { kind: "board" } })}>+ Novo quadro</button>} />
      <div className="kb-explain"><span className="kb-explain-ic"><Icon name="cultos" size={18} /></span><div><div className="kb-explain-t">De onde vêm os cards</div><div className="kb-explain-s">Toda responsabilidade definida numa reunião pode virar um card aqui, com responsável e prazo já preenchidos.</div></div></div>
      <div className="bd-grid">
        {boards.map((board) => {
          const ministry = board.ministry_id ? ministryById.get(board.ministry_id) : null;
          const boardCards = cards.filter((card) => card.board_id === board.id);
          return <button className="bd-card" key={board.id} type="button" onClick={() => setBoardId(board.id)}><div className="bd-card-top"><div className="bd-mark"><Icon name="times" size={18} /></div></div><div className="bd-name">{board.name}</div><div className="bd-desc">{board.description || ministry?.description || "Quadro geral da liderança."}</div><div className="bd-foot"><span className="team-stat"><b>{boardCards.length}</b> cards · <b>{ministry?.people.length ?? 0}</b> pessoas</span></div><div className="bar" style={{ marginTop: 10 }}><div className="bar-fill" style={{ width: `${Math.min(100, boardCards.length * 20)}%` }} /></div></button>;
        })}
        {boards.length === 0 ? <div className="empty">Nenhum quadro criado ainda.</div> : null}
      </div>
    </div>
  );
}

function Conversas({
  chats,
  chatMembers,
  messages,
  ministries,
  members,
  setModal,
}: {
  chats: ChatView[];
  chatMembers: ChatMemberView[];
  messages: MessageView[];
  ministries: MinistryView[];
  members: MemberView[];
  setModal: (modal: ModalState) => void;
}) {
  const [selected, setSelected] = useState(chats[0]?.id ?? "");
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const chat = chats.find((item) => item.id === selected) ?? chats[0];
  const selectedMessages = chat ? messages.filter((message) => message.chat_id === chat.id) : [];
  const chatCount = (chatId: string) => chatMembers.filter((member) => member.chat_id === chatId).length;
  const chatName = (item: ChatView) => item.name || (item.ministry_id ? ministryById.get(item.ministry_id)?.name : null) || "Conversa";
  return (
    <div className="content wide">
      <PageHead title="Conversas" eyebrow="Operação" subtitle="Canais por time, grupos e mensagens diretas da equipe. Conversas são privadas para os envolvidos." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Nova conversa", title: "Chamar para conversar", subtitle: "Fale com alguém em particular ou crie um grupo.", fields: ["Nome", "Participantes", "Mensagem"], action: { kind: "chat" } })}>+ Nova conversa</button>} />
      <div className="chat-layout">
        <div className="chat-list">{chats.map((item) => <button className={`chat-row ${item.id === selected ? "on" : ""}`} type="button" key={item.id} onClick={() => setSelected(item.id)}><span className="chat-row-ic"><Icon name={item.kind === "time" ? "times" : "membros"} size={16} /></span><span className="chat-row-main"><span className="chat-row-top"><b>{chatName(item)}</b><small>agora</small></span><span className="chat-row-prev">{messages.find((message) => message.chat_id === item.id)?.body || "Canal de alinhamento"}</span></span><span className="chat-row-count">{chatCount(item.id)}</span></button>)}</div>
        <div className="chat-main"><div className="chat-head"><span className="chat-head-ic"><Icon name={chat?.kind === "time" ? "times" : "membros"} size={16} /></span><div><div className="chat-head-name">{chat ? chatName(chat) : "Nenhuma conversa"}</div><div className="chat-head-sub">{chat?.kind === "time" ? "Canal do time" : "Grupo"} · {chat ? chatCount(chat.id) : 0} pessoas</div></div></div><div className="chat-thread"><div className="chat-msgs">{selectedMessages.map((message) => { const sender = message.sender_id ? memberById.get(message.sender_id) : null; return <div className="chat-msg" key={message.id}>{sender ? <Av name={sender.name} size="xs" /> : null}<div className="chat-bubble-wrap"><div className="chat-bubble">{message.body}</div><div className="chat-when">{new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>; })}{chat && selectedMessages.length === 0 ? <div className="empty">Nenhuma mensagem nesta conversa.</div> : null}</div><div className="chat-compose"><input className="input" placeholder="Escreva uma mensagem..." /><button className="btn btn-pri btn-sm" type="button" onClick={() => chat ? setModal({ eyebrow: "Mensagem", title: chatName(chat), subtitle: "Enviar mensagem nesta conversa.", fields: ["Mensagem"], action: { kind: "message", chatId: chat.id } }) : undefined}>Enviar</button></div></div></div>
      </div>
    </div>
  );
}

function Bars({ series, labels }: { series: number[]; labels: string[] }) {
  const max = Math.max(...series, 1);
  return <div className="bars">{series.map((value, index) => <div className="bars-col" key={labels[index] ?? index}><div className={`bars-bar ${index === series.length - 1 ? "hi" : ""}`} style={{ height: `${(value / max) * 100}%` }} /><span className="bars-x">{labels[index]}</span></div>)}</div>;
}

function Relatorios({
  people,
  members,
  ministries,
  events,
  decisions,
  baptismClasses,
  courses,
  boards,
  chats,
  confirmationRate,
  setRoute,
}: {
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  decisions: DecisionView[];
  baptismClasses: BaptismClassView[];
  courses: CourseView[];
  boards: BoardView[];
  chats: ChatView[];
  confirmationRate: number;
  setRoute: (route: keyof typeof ROUTES) => void;
}) {
  const activePeople = people.filter((person) => person.status === "ativo").length;
  const attention = people.filter((person) => (person.engagement ?? 0) < 70 || person.status !== "ativo");
  const series = [members.length - 5, members.length - 3, members.length - 2, members.length].map((value) => Math.max(0, value));
  const maxMinistry = Math.max(...ministries.map((ministry) => ministry.people.length), 1);
  return (
    <div className="content wide">
      <PageHead title="Relatórios & indicadores" eyebrow="Gestão" subtitle="A saúde da igreja num lugar: crescimento, integração, cobertura de escala e o bem-estar de quem serve." action={<><button className="btn btn-sec" type="button"><Icon name="cultos" size={14} /> Trimestre</button><button className="btn btn-pri" type="button">Baixar relatório →</button></>} />
      <div className="kpi-row"><Kpi icon="membros" label="Membros na rede" value={members.length} foot="cadastrados" /><Kpi icon="visitante" label="Decisões registradas" value={decisions.length} foot="jornada espiritual" /><Kpi icon="escalas" label="Cobertura de escala" value={`${confirmationRate}%`} foot="das posições preenchidas" /><Kpi icon="cultos" label="Cultos na agenda" value={events.length} foot="programação ativa" /></div>
      <div className="dash-3col">
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={13} /> Crescimento de membros</span><span className="panel-meta">12 meses</span></div><div className="panel-body"><div style={{ fontSize: 30, fontWeight: 700 }}>{members.length}<span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>membros no total</span></div><div style={{ marginTop: 14 }}><Bars series={series} labels={["mar", "abr", "mai", "jun"]} /></div></div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="visitante" size={13} /> Funil de visitantes</span><button className="panel-link" type="button" onClick={() => setRoute("visitantes")}>Abrir</button></div><div className="panel-body flush">{["Novo", "Contato", "Integrando", "Membro"].map((label, index) => <div className="dist-row" key={label}><span className="dist-name" style={{ width: 140 }}>{label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${Math.max(10, 80 - index * 18)}%` }} /></div><span className="dist-num">{index === 0 ? 0 : "-"}</span></div>)}</div></div>
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">02</span><span className="label">Termômetro de bem-estar</span><span className="line" /></div>
      <div className="well-sum">{[["saudavel", activePeople], ["atencao", attention.length], ["sobrecarga", 0], ["afastando", people.filter((person) => person.status === "pausa").length]].map(([level, count]) => <div className="well-pill" key={level}><div className="n">{count}</div><div className="l"><span className={`well-dot ${level}`} />{String(level)}</div></div>)}</div>
      <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={13} /> Quem precisa de atenção</span><button className="panel-link" type="button" onClick={() => setRoute("pessoas")}>Voluntários</button></div><div className="panel-body flush">{(attention.length ? attention : people).slice(0, 8).map((person) => <div className="well-row" key={person.id}><Av name={person.name} size="md" /><div className="mini-main"><div className="mini-title">{person.name}</div><div className="mini-sub">{person.status !== "ativo" ? "Em pausa ou férias." : "Engajamento abaixo da média."}</div></div><div className="well-meter"><div className="well-track"><div className="well-fill atencao" style={{ width: `${person.engagement ?? 50}%` }} /></div><div className="well-tag atencao">Atenção</div></div></div>)}</div></div>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="times" size={13} /> Voluntários por ministério</span><button className="panel-link" type="button" onClick={() => setRoute("times")}>Times</button></div><div className="panel-body flush">{ministries.map((ministry) => <div className="dist-row" key={ministry.id}><span className="dist-name">{ministry.name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(ministry.people.length / maxMinistry) * 100}%` }} /></div><span className="dist-num">{ministry.people.length}</span></div>)}</div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="membros" size={13} /> Membros por jornada</span><span className="panel-meta">{members.length} pessoas</span></div><div className="panel-body flush">{["Decisão", "Batismo", "Fundamentos", "GC", "Servindo"].map((step, index) => { const count = members.filter((member) => member.journey[index]).length; return <div className="dist-row" key={step}><span className="dist-name">{step}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${members.length ? (count / members.length) * 100 : 0}%` }} /></div><span className="dist-num">{count}</span></div>; })}</div></div>
      </div>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="identidade" size={13} /> Jornada e formação</span><span className="panel-meta">Service</span></div><div className="panel-body flush">{[["Decisões", decisions.length], ["Turmas de batismo", baptismClasses.length], ["Cursos internos", courses.length]].map(([label, count]) => <div className="dist-row" key={label}><span className="dist-name">{label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${Math.max(8, Number(count) * 18)}%` }} /></div><span className="dist-num">{count}</span></div>)}</div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={13} /> Operação conectada</span><span className="panel-meta">Kanban & chat</span></div><div className="panel-body flush">{[["Quadros", boards.length], ["Conversas", chats.length], ["Eventos", events.length]].map(([label, count]) => <div className="dist-row" key={label}><span className="dist-name">{label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${Math.max(8, Number(count) * 18)}%` }} /></div><span className="dist-num">{count}</span></div>)}</div></div>
      </div>
    </div>
  );
}

function Config({ church }: { church?: ChurchView }) {
  return (
    <div className="content">
      <PageHead title="Configurações" eyebrow="Gestão" subtitle="Identidade da igreja, preferências e ajustes do Service." />
      <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="identidade" size={14} /> Igreja</span></div><div className="panel-body"><div className="cfg-row"><div><div className="cfg-row-t">{church?.nome ?? "Igreja"}</div><div className="cfg-row-s">{church?.cidade ?? "Cidade não informada"}</div></div><button className="btn btn-sec btn-sm" type="button">Editar</button></div></div></div>
    </div>
  );
}

function Identidade({ church, setModal }: { church?: ChurchView; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content wide">
      <PageHead
        title="Identidade & propósito"
        eyebrow="Nossa igreja"
        subtitle="Missão, visão, valores e tema atual da comunidade. Exibido no app do membro e na vitrine da Igreja."
        action={<button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Identidade", title: "Editar identidade", subtitle: "Atualize a declaração de missão e visão da Igreja.", fields: ["Missão", "Visão", "Versículo"] })}>Editar</button>}
      />
      <div className="ident-hero">
        <div className="ident-hero-label">Declaração de missão</div>
        <div className="ident-hero-text">
          {church?.nome ? `${church.nome} existe para fazer discípulos de Jesus Cristo que transformem a cidade.` : "A Igreja existe para fazer discípulos de Jesus Cristo que transformem a cidade."}
        </div>
        <div className="ident-verse">§ Mateus 28:18-20 · A Grande Comissão</div>
      </div>
      <div className="ident-grid">
        <div className="ident-card">
          <div className="ident-card-ic"><Icon name="identidade" size={18} /></div>
          <div className="ident-card-t">Missão</div>
          <div className="ident-card-x">Fazer discípulos que transformam a cidade pela graça de Deus.</div>
        </div>
        <div className="ident-card">
          <div className="ident-card-ic"><Icon name="painel" size={18} /></div>
          <div className="ident-card-t">Visão</div>
          <div className="ident-card-x">Uma rede de igrejas saudáveis que impacta cada bairro da cidade.</div>
        </div>
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">02</span><span className="label">Valores</span><span className="line" /></div>
      <div className="val-grid">
        {[
          { ic: "membros", t: "Comunidade", x: "Somos família. A vida cristã é vivida juntos, não individualmente." },
          { ic: "identidade", t: "Palavra", x: "A Bíblia é nossa autoridade suprema em doutrina e prática." },
          { ic: "decisoes", t: "Missão", x: "Existimos para os de fora. Toda nossa estrutura serve ao alcance." },
        ].map(({ ic, t, x }) => (
          <div className="val-card" key={t}>
            <div className="val-ic"><Icon name={ic} size={14} /></div>
            <div className="val-t">{t}</div>
            <div className="val-x">{x}</div>
          </div>
        ))}
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">03</span><span className="label">Tema do ciclo atual</span><span className="line" /></div>
      <div className="ciclo">
        <div className="ciclo-banner">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, var(--olive-deep), #2d3d18)" }} />
          <span className="ciclo-banner-tag">2026 · 1º semestre</span>
        </div>
        <div className="ciclo-body">
          <div className="ciclo-tema">Raízes profundas</div>
          <div className="ciclo-verse">§ Salmos 1:3 · "Será como árvore plantada junto a ribeiros de águas"</div>
          <div className="ciclo-text">Um chamado a aprofundar a vida com Deus — na Palavra, na oração e na comunidade — para que o crescimento externo seja fruto de raízes internas sólidas.</div>
          <div className="ciclo-obj" style={{ marginTop: 22 }}>
            <div className="ciclo-obj-t">Objetivos do ciclo</div>
            {["Crescimento pessoal na leitura bíblica diária", "Multiplicação de grupos de discipulado", "Integração de 80% dos visitantes em GCs"].map((obj, i) => (
              <div className="ciclo-obj-row" key={obj}><span className="ciclo-obj-n">0{i + 1}</span>{obj}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Historia({ church, setModal }: { church?: ChurchView; setModal: (modal: ModalState) => void }) {
  const marcos = [
    { year: "2012", title: "Fundação", text: "Início do ministério com 12 pessoas comprometidas com a visão de alcançar a cidade por meio de discipulado intencional.", rev: false },
    { year: "2016", title: "Primeira expansão", text: "Abertura da primeira congregação em bairro vizinho. A rede começa a tomar forma: mesma visão, mesma doutrina, mesma cultura.", rev: true },
    { year: "2020", title: "Transformação digital", text: "Migração completa para plataforma digital durante a pandemia. A comunidade descobriu a força dos grupos online.", rev: false },
    { year: "2024", title: "CE.X Service", text: "Lançamento da plataforma de gestão ministerial: pessoas, escala, jornada e comunicação num único lugar.", rev: true },
  ];
  return (
    <div className="content wide">
      <PageHead
        title="Nossa história"
        eyebrow="Nossa igreja"
        subtitle="Marcos, momentos e a linha do tempo de como chegamos até aqui. Cada capítulo é uma prova da fidelidade de Deus."
        action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Marco histórico", title: "Adicionar marco", subtitle: "Registre um momento importante da história da Igreja.", fields: ["Ano", "Título", "Descrição"], action: undefined })}>+ Marco</button>}
      />
      <div className="hist">
        {marcos.map((marco) => (
          <div key={marco.year} className={`hist-item ${marco.rev ? "rev" : ""}`}>
            <div className="hist-photo">
              <div style={{ position: "absolute", inset: 0, background: marco.rev ? "linear-gradient(150deg, var(--olive-deep), #243012)" : "linear-gradient(150deg, #7a6526, #3d3415)" }} />
              <span className="hist-year">{marco.year}</span>
            </div>
            <div className="hist-text">
              <div className="hist-t">{marco.title}</div>
              <div className="hist-x">{marco.text}</div>
              <div className="hist-foot">
                <button className="hist-edit" type="button" onClick={() => setModal({ eyebrow: "Marco histórico", title: marco.title, subtitle: "Edite este marco da história da Igreja.", fields: ["Ano", "Título", "Descrição"] })}>Editar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleModule({ title, subtitle, empty, setModal }: { title: string; subtitle: string; empty: string; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content">
      <PageHead title={title} eyebrow="Service" subtitle={subtitle} action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: title, title: `Criar ${title.toLowerCase()}`, subtitle, fields: ["Nome", "Responsável", "Observações"] })}>+ Criar</button>} />
      <div className="empty"><div className="empty-mark">0</div><h3 className="empty-title">{empty}</h3><p className="empty-desc">Este módulo está pronto para receber os registros do banco.</p></div>
    </div>
  );
}

function EntityDrawer({
  drawer,
  people,
  members,
  ministries,
  events,
  roster,
  setDrawer,
  setRoute,
  setModal,
}: {
  drawer: NonNullable<DrawerState>;
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  roster: RosterAssignmentView[];
  setDrawer: (drawer: DrawerState) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  setModal: (modal: ModalState) => void;
}) {
  if (drawer.kind === "person") {
    const person = people.find((item) => item.id === drawer.id);
    if (!person) return null;
    const personRoster = roster.filter((item) => item.person_id === person.id);
    const linkedMinistries = ministries.filter((ministry) => ministry.people.some((link) => link.personId === person.id));
    return (
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <button className="drawer-close" type="button" onClick={() => setDrawer(null)}>✕</button>
          <div className="profile-top">
            <Av name={person.name} size="lg" />
            <div>
              <div className="profile-name">{person.name}</div>
              <div className="profile-role">Voluntário · desde o cadastro</div>
              <div style={{ marginTop: 10 }}><Chip status={person.status} /></div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <DrawerSection title="Contato">
            <dl className="kv"><dt>Telefone</dt><dd>{person.phone}</dd><dt>E-mail</dt><dd>{person.email}</dd><dt>Engajamento</dt><dd>{person.engagement ?? 0}% nos últimos 90 dias</dd></dl>
          </DrawerSection>
          <DrawerSection title="Times & funções">
            <div className="cell-tags" style={{ gap: 8 }}>{linkedMinistries.map((ministry) => <button className="tag" type="button" key={ministry.id} onClick={() => setDrawer({ kind: "ministry", id: ministry.id })}>{ministry.name}</button>)}</div>
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>Frentes: {person.tags.join(" · ") || "sem tags"}</div>
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
          <DrawerSection title={`Meu calendário · ${personRoster.length} compromisso(s)`}>
            {personRoster.length ? personRoster.map((item) => <div className="mini-row" key={item.id}><div className="mini-main"><div className="mini-title">Escala</div><div className="mini-sub">Status: {item.status}</div></div><Chip status={item.status} /></div>) : <p className="mini-sub">Nenhum compromisso encontrado.</p>}
          </DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => { setDrawer(null); setRoute("escalas"); }}>Escalar</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Mensagem", title: person.name, subtitle: "Abrir conversa com o voluntário.", fields: ["Mensagem"] })}>Enviar mensagem</button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  if (drawer.kind === "member") {
    const member = members.find((item) => item.id === drawer.id);
    if (!member) return null;
    return (
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <button className="drawer-close" type="button" onClick={() => setDrawer(null)}>✕</button>
          <div className="profile-top"><Av name={member.name} size="lg" /><div><div className="profile-name">{member.name}</div><div className="profile-role">{member.situation} · {member.neighborhood}</div><div style={{ marginTop: 10 }}><Chip status={member.situation} /></div></div></div>
        </div>
        <div className="drawer-body">
          <DrawerSection title="Contato"><dl className="kv"><dt>Telefone</dt><dd>{member.phone}</dd><dt>E-mail</dt><dd>{member.email}</dd><dt>Primeiro contato</dt><dd>{member.firstContact}</dd></dl></DrawerSection>
          <DrawerSection title="Jornada"><div className="journey-steps">{["Decisão", "Batismo", "Fundamentos", "GC", "Servindo"].map((step, index) => <div className={`journey-step ${member.journey[index] ? "done" : ""}`} key={step}><span>{index + 1}</span><b>{step}</b></div>)}</div></DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Jornada", title: member.name, subtitle: "Atualize o próximo passo de acompanhamento.", fields: ["Próximo passo", "Responsável", "Data"] })}>Atualizar jornada</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Mensagem", title: member.name, subtitle: "Abrir conversa com o membro.", fields: ["Mensagem"] })}>Enviar mensagem</button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  if (drawer.kind === "ministry") {
    const ministry = ministries.find((item) => item.id === drawer.id);
    if (!ministry) return null;
    const leader = ministry.people.find((link) => link.isLeader);
    return (
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <button className="drawer-close" type="button" onClick={() => setDrawer(null)}>✕</button>
          <div className="profile-top"><div className="team-mark" style={{ width: 56, height: 56 }}><TeamMark ministry={ministry} size={26} /></div><div><div className="profile-name">{ministry.name}</div><div className="profile-role">Líder: <span style={{ color: "var(--olive)" }}>{leader?.personName ?? "a definir"}</span> · {ministry.people.length} voluntários</div></div></div>
          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, marginTop: 14 }}>{ministry.description}</p>
        </div>
        <div className="drawer-body">
          <DrawerSection title="Funções & quem cobre">
            {ministry.positions.map((position) => <div key={position.id} style={{ marginBottom: 18 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div className="esc-fn">{position.name}</div><span className="panel-meta">{position.need_count} vaga(s)</span></div>{ministry.people.map((link) => <button className="cand" type="button" key={`${position.id}-${link.personId}`} onClick={() => setDrawer({ kind: "person", id: link.personId })}><Av name={link.personName} /><div className="cand-main"><div className="cand-name">{link.personName}</div><div className="cand-meta">{link.isLeader ? "Líder do time" : "Voluntário"}</div></div></button>)}</div>)}
          </DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => { setDrawer(null); setRoute("escalas"); }}>Ver escala do time →</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Adicionar ao time", title: ministry.name, subtitle: "Escolha voluntários para incluir neste ministério.", fields: ["Voluntário", "Função"] })}>Adicionar pessoa</button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  const event = events.find((item) => item.id === drawer.id);
  if (!event) return null;
  return (
    <EventDrawer
      event={event}
      ministries={ministries}
      people={people}
      roster={roster}
      onClose={() => setDrawer(null)}
      setDrawer={setDrawer}
      setRoute={setRoute}
      setModal={setModal}
    />
  );
}

function EventDrawer({
  event,
  ministries,
  people,
  roster,
  onClose,
  setDrawer,
  setRoute,
  setModal,
}: {
  event: EventView;
  ministries: MinistryView[];
  people: PersonView[];
  roster: RosterAssignmentView[];
  onClose: () => void;
  setDrawer: (drawer: DrawerState) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  setModal: (modal: ModalState) => void;
}) {
  const [tab, setTab] = useState<"crono" | "posicoes">("crono");
  const eventRoster = roster.filter((assignment) => assignment.event_id === event.id);
  const eventMinistries = event.ministries.length ? ministries.filter((ministry) => event.ministries.includes(ministry.id)) : ministries;

  return (
    <DrawerShell onClose={onClose} wide>
      <div className="drawer-head">
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{event.weekday} · {event.eventDate}</div>
        <div className="profile-name">{event.name}</div>
        <div className="profile-role">{event.time} · {event.location} · {event.kind}</div>
        <div className="seg" style={{ marginTop: 14 }}>
          <button className={tab === "crono" ? "on" : ""} type="button" onClick={() => setTab("crono")}>Cronograma</button>
          <button className={tab === "posicoes" ? "on" : ""} type="button" onClick={() => setTab("posicoes")}>Posições</button>
        </div>
      </div>
      <div className="drawer-body">
        {tab === "crono" ? (
          <>
            <DrawerSection title="Roteiro do culto · etapa por etapa">
              {event.schedule.length ? event.schedule.map((item) => <div className="mini-row" key={item.id}><div className="mini-main"><div className="mini-title">{item.item}</div><div className="mini-sub">{item.time ?? "sem horário"} · {item.category ?? "roteiro"}</div></div></div>) : <p className="mini-sub">Nenhum item de cronograma.</p>}
            </DrawerSection>
            <DrawerSection title="Setlist">
              {event.setlist.length ? event.setlist.map((song) => <div className="mini-row" key={song.id}><div className="mini-main"><div className="mini-title">{song.title}</div><div className="mini-sub">Tom: {song.song_key ?? "não informado"}</div></div></div>) : <p className="mini-sub">Nenhuma música cadastrada.</p>}
            </DrawerSection>
          </>
        ) : (
          <>
            {eventMinistries.map((ministry) => (
              <DrawerSection title={ministry.name} key={ministry.id}>
                {(ministry.positions.length ? ministry.positions : [{ id: `${ministry.id}-geral`, ministry_id: ministry.id, name: "Equipe", need_count: 1, sort_order: 0 }]).map((position) => {
                  const assignments = eventRoster.filter((assignment) => assignment.position_id === position.id);
                  const valid = assignments.filter((assignment) => assignment.status !== "no").length;
                  const missing = Math.max(0, Math.max(1, position.need_count) - valid);
                  return (
                    <div key={position.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                        <span className="esc-fn" style={{ fontSize: 13 }}>{position.name}</span>
                        <span className="panel-meta">{valid}/{Math.max(1, position.need_count)}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {assignments.map((assignment) => {
                          const person = people.find((candidate) => candidate.id === assignment.person_id);
                          return (
                            <button key={assignment.id} className="slot" style={{ margin: 0, width: "auto" }} type="button" onClick={() => person && setDrawer({ kind: "person", id: person.id })}>
                              <Av name={person?.name ?? "Voluntário"} size="xs" />
                              <span className="slot-name" style={{ maxWidth: 120 }}>{person?.name.split(" ")[0] ?? "Pessoa"}</span>
                              <span className={`slot-st ${assignment.status}`} />
                            </button>
                          );
                        })}
                        {Array.from({ length: missing }).map((_, index) => (
                          <button key={`${position.id}-missing-${index}`} className="slot-empty" style={{ width: "auto", padding: "7px 14px" }} type="button" onClick={() => { onClose(); setRoute("escalas"); }}>+ vaga</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </DrawerSection>
            ))}
          </>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => { onClose(); setRoute("escalas"); }}>Editar escala →</button>
          <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Setup da celebração", title: event.name, subtitle: "Compartilhe cronograma, posições e observações do culto.", fields: ["Mensagem", "Equipe"] })}><Icon name="comunicacao" size={15} /> Setup da celebração</button>
        </div>
      </div>
    </DrawerShell>
  );
}

function DrawerShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className={`drawer ${wide ? "drawer-wide" : ""}`}>{children}</div>
    </>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dsec">
      <div className="dsec-title">{title}</div>
      {children}
    </div>
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function findPersonByName(people: PersonView[], value: string) {
  const term = normalize(value);
  if (!term) return null;
  return people.find((person) => normalize(person.name) === term || normalize(person.name).includes(term)) ?? null;
}

function findMemberByName(members: MemberView[], value: string) {
  const term = normalize(value);
  if (!term) return null;
  return members.find((member) => normalize(member.name) === term || normalize(member.name).includes(term)) ?? null;
}

function findMinistryByName(ministries: MinistryView[], value: string) {
  const term = normalize(value);
  if (!term) return null;
  return ministries.find((ministry) => normalize(ministry.name) === term || normalize(ministry.name).includes(term)) ?? null;
}

function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) return "O banco bloqueou a gravação por segurança. Confirme se seu usuário tem permissão nesta igreja.";
  if (lower.includes("violates foreign key")) return "Algum vínculo escolhido não existe mais no banco. Recarregue a página e tente de novo.";
  if (lower.includes("duplicate key")) return "Esse registro já existe.";
  if (lower.includes("invalid schema")) return "O schema service não está exposto na API do Supabase.";
  return message || "Não conseguimos salvar agora.";
}

function ServiceModal({
  modal,
  church,
  people,
  members,
  ministries,
  rooms,
  onClose,
}: {
  modal: NonNullable<ModalState>;
  church?: ChurchView;
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  rooms: RoomView[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!modal.action) {
      onClose();
      return;
    }
    const action = modal.action;
    if (!church?.organizationId || !church.id) {
      setError("Nenhuma igreja foi encontrada para vincular este registro.");
      return;
    }

    const supabase = createServiceBrowserClient();
    const value = (field: string) => values[field]?.trim() ?? "";
    const namedPerson = (field: string) => findPersonByName(people, value(field));
    const namedMember = (field: string) => findMemberByName(members, value(field));
    const namedMinistry = (field: string) => findMinistryByName(ministries, value(field));
    let result: { error: { message: string } | null } = { error: null };

    setSaving(true);
    if (action.kind === "decision") {
      if (!value("Nome")) {
        setSaving(false);
        setError("Digite o nome da pessoa.");
        return;
      }
      result = await supabase.schema("service").from("decisions").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("Nome"),
        phone: value("Telefone") || null,
        service_name: value("Culto") || null,
        responsible_id: namedPerson("Responsável")?.id ?? null,
        happened_on: new Date().toLocaleDateString("pt-BR"),
        kind: "decisao",
        status: "novo",
      });
    } else if (action.kind === "baptismClass") {
      if (!value("Nome da turma")) {
        setSaving(false);
        setError("Digite o nome da turma.");
        return;
      }
      result = await supabase.schema("service").from("baptism_classes").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        label: value("Nome da turma"),
        baptism_date: value("Data") || null,
        location: value("Local") || null,
        pastor: value("Pastor") || null,
        status: "aberta",
        open_enrollment: true,
      });
    } else if (action.kind === "course") {
      if (!value("Nome")) {
        setSaving(false);
        setError("Digite o nome do curso.");
        return;
      }
      result = await supabase.schema("service").from("courses").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("Nome"),
        level: value("Nível") || null,
        description: value("Descrição") || null,
        kind: "trilha",
        category: value("Nível") || "discipulado",
        color: "clay",
      });
    } else if (action.kind === "board") {
      if (!value("Nome")) {
        setSaving(false);
        setError("Digite o nome do quadro.");
        return;
      }
      result = await supabase.schema("service").from("boards").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("Nome"),
        ministry_id: namedMinistry("Time")?.id ?? null,
        description: value("Descrição") || null,
        scope: namedMinistry("Time") ? "time" : "geral",
        columns: [
          { id: "todo", nome: "A fazer" },
          { id: "doing", nome: "Em andamento" },
          { id: "done", nome: "Concluído" },
        ],
      });
    } else if (action.kind === "card") {
      if (!value("Título")) {
        setSaving(false);
        setError("Digite o título do card.");
        return;
      }
      const assignee = namedPerson("Responsável");
      result = await supabase.schema("service").from("cards").insert({
        organization_id: church.organizationId,
        board_id: action.boardId,
        column_id: action.columnId,
        title: value("Título"),
        due: value("Prazo") || null,
        assignees: assignee ? [assignee.id] : [],
        priority: "media",
        source_type: "manual",
      });
    } else if (action.kind === "chat") {
      if (!value("Nome")) {
        setSaving(false);
        setError("Digite o nome da conversa.");
        return;
      }
      const { data: chat, error: chatError } = await supabase.schema("service").from("chats").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("Nome"),
        kind: "grupo",
      }).select("id").single();
      if (chatError) {
        result = { error: chatError };
      } else {
        const member = namedMember("Participantes");
        if (member) {
          await supabase.schema("service").from("chat_members").insert({
            organization_id: church.organizationId,
            chat_id: chat.id,
            member_id: member.id,
          });
        }
        result = value("Mensagem")
          ? await supabase.schema("service").from("messages").insert({
              organization_id: church.organizationId,
              chat_id: chat.id,
              sender_id: member?.id ?? null,
              body: value("Mensagem"),
            })
          : { error: null };
      }
    } else if (action.kind === "message") {
      if (!value("Mensagem")) {
        setSaving(false);
        setError("Digite a mensagem.");
        return;
      }
      result = await supabase.schema("service").from("messages").insert({
        organization_id: church.organizationId,
        chat_id: action.chatId,
        sender_id: members[0]?.id ?? null,
        body: value("Mensagem"),
      });
    } else if (action.kind === "visitor") {
      if (!value("Nome")) {
        setSaving(false);
        setError("Digite o nome do visitante.");
        return;
      }
      result = await supabase.schema("service").from("visitors").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("Nome"),
        phone: value("Telefone") || null,
        origin: value("Como chegou") || null,
        visited_on: value("Visitou") || null,
        stage: "novo",
        due: "1º contato",
        due_status: "soon",
      });
    } else if (action.kind === "meeting") {
      if (!value("Título")) {
        setSaving(false);
        setError("Digite o título da reunião.");
        return;
      }
      const ministry = namedMinistry("Time");
      result = await supabase.schema("service").from("meetings").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("Título"),
        meeting_date: value("Data") || null,
        time: value("Horário") || null,
        location: value("Local") || null,
        ministries: ministry ? [ministry.id] : [],
        attendees: [],
        agenda: [],
        status: "agendada",
      });
    } else if (action.kind === "rehearsal") {
      if (!value("Título")) {
        setSaving(false);
        setError("Digite o título do ensaio.");
        return;
      }
      const ministry = namedMinistry("Time");
      result = await supabase.schema("service").from("rehearsals").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("Título"),
        rehearsal_date: value("Data") || null,
        time: value("Horário") || null,
        location: value("Local") || null,
        ministry_id: ministry?.id ?? null,
        kind: "louvor",
        recurrence: "eventual",
        attendees: [],
        repertoire: [],
        attachments: [],
      });
    } else if (action.kind === "announcement") {
      if (!value("Título")) {
        setSaving(false);
        setError("Digite o título do aviso.");
        return;
      }
      result = await supabase.schema("service").from("announcements").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("Título"),
        body: value("Mensagem") || null,
        audience: value("Público") || "todos",
        author: "Liderança",
        when_label: "agora",
      });
    } else if (action.kind === "wallPost") {
      if (!value("Mensagem")) {
        setSaving(false);
        setError("Digite a mensagem do mural.");
        return;
      }
      result = await supabase.schema("service").from("wall_posts").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        body: value("Mensagem"),
        audience: value("Público") || "todos",
        author: "Liderança",
        channels: ["app"],
      });
    } else if (action.kind === "room") {
      if (!value("Nome")) {
        setSaving(false);
        setError("Digite o nome da sala.");
        return;
      }
      result = await supabase.schema("service").from("rooms").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("Nome"),
        capacity: Number.parseInt(value("Capacidade"), 10) || null,
        location: value("Local") || null,
        resources: value("Recursos") ? value("Recursos").split(",").map((item) => item.trim()).filter(Boolean) : [],
      });
    } else if (action.kind === "reservation") {
      if (!value("Título")) {
        setSaving(false);
        setError("Digite o título da reserva.");
        return;
      }
      const room = action.roomId ? rooms.find((item) => item.id === action.roomId) : rooms[0];
      if (!room) {
        setSaving(false);
        setError("Crie uma sala antes de reservar.");
        return;
      }
      result = await supabase.schema("service").from("reservations").insert({
        organization_id: church.organizationId,
        room_id: room.id,
        title: value("Título"),
        kind: value("Tipo") || "outro",
        reserved_date: value("Data") || null,
        start_time: value("Início") || null,
        end_time: value("Fim") || null,
      });
    }

    setSaving(false);
    if (result.error) {
      setError(friendlyWriteError(result.error.message));
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{modal.eyebrow}</div>
          <div className="modal-title">{modal.title}</div>
          <div className="modal-sub">{modal.subtitle}</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          {modal.fields.map((field) => (
            <label className="field" key={field}>
              <span className="field-label">{field}</span>
              <input
                className="input"
                placeholder={field}
                value={values[field] ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
              />
            </label>
          ))}
          {error ? <p className="mini-sub" style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p> : null}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-pri" type="button" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
