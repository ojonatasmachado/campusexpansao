"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import MobileOverlay from "./MobileApp";
import { QRCheckinModal } from "./CheckIn";
import EventoShare from "./EventoShare";
import CursoEditor from "./CursoEditor";

type ChurchView = {
  id: string;
  organizationId: string;
  nome: string;
  cidade: string;
  matriz: boolean;
  doc?: string | null;
  foundedYear?: string | null;
  address?: string | null;
  postalCode?: string | null;
  email?: string | null;
  phone?: string | null;
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

type ChurchIdentityView = {
  church_id: string;
  purpose: string | null;
  mission: string | null;
  vision: string | null;
  verse: string | null;
  values: Array<{ title: string }>;
};

type CycleView = {
  id: string;
  year: string;
  theme: string;
  verse: string | null;
  body: string | null;
  objectives: Array<{ title: string }>;
  is_active: boolean;
};

type HistoryEntryView = {
  id: string;
  year: string | null;
  title: string;
  body: string | null;
  link: string | null;
  sort_order: number;
};

type MinisterialTitleView = {
  id: string;
  name: string;
  sort_order: number;
};

type FellowshipGroupView = {
  id: string;
  name: string;
  leader_person_id: string | null;
  weekday: string | null;
  time: string | null;
  neighborhood: string | null;
};

type TagView = {
  id: string;
  name: string;
  color: string;
  leaders: string[];
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
  churchIdentity?: ChurchIdentityView | null;
  cycles?: CycleView[];
  historyEntries?: HistoryEntryView[];
  ministerialTitles?: MinisterialTitleView[];
  fellowshipGroups?: FellowshipGroupView[];
  tags?: TagView[];
  error: string;
};

type DrawerState =
  | { kind: "person"; id: string }
  | { kind: "member"; id: string }
  | { kind: "ministry"; id: string }
  | { kind: "event"; id: string }
  | { kind: "decision"; id: string }
  | { kind: "baptismClass"; id: string }
  | { kind: "visitor"; id: string }
  | { kind: "meeting"; id: string }
  | { kind: "rehearsal"; id: string }
  | null;

type FieldDef =
  | { k: string; label: string; type: "text"; req?: boolean; half?: boolean; ph?: string; hint?: string }
  | { k: string; label: string; type: "area"; req?: boolean; half?: boolean; ph?: string; hint?: string; big?: boolean }
  | { k: string; label: string; type: "select"; req?: boolean; half?: boolean; ph?: string; hint?: string; options: { v: string; l: string }[] }
  | { k: string; label: string; type: "date"; req?: boolean; half?: boolean; hint?: string }
  | { k: string; label: string; type: "time"; req?: boolean; half?: boolean; hint?: string }
  | { k: string; label: string; type: "toggle"; req?: boolean; half?: boolean; hint?: string; onLabel?: string; offLabel?: string }
  | { k: string; label: string; type: "checks"; req?: boolean; half?: boolean; hint?: string; options: { v: string; l: string }[] };

type ModalState =
  | {
      title: string;
      eyebrow: string;
      subtitle: string;
      saveLabel?: string;
      formFields: FieldDef[];
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
        | { kind: "reservation"; roomId?: string }
        | { kind: "member" }
        | { kind: "event" }
        | { kind: "ministry" }
        | { kind: "identity" }
        | { kind: "historyEntry"; id?: string }
        | { kind: "cycle" }
        | { kind: "title" }
        | { kind: "tag" }
        | { kind: "group" };
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
  churchIdentity = null,
  cycles = [],
  historyEntries = [],
  ministerialTitles = [],
  fellowshipGroups = [],
  tags = [],
  error,
}: Props) {
  const [route, setRoute] = useState<keyof typeof ROUTES>("painel");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeChurchId, setActiveChurchId] = useState<string>(churches[0]?.id ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkinEventId, setCheckinEventId] = useState<string | null>(null);
  const [shareEventId, setShareEventId] = useState<string | null>(null);

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
        {route === "membros" ? <Membros members={members} ministries={ministries} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "pessoas" ? <Pessoas people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "times" ? <Times ministries={ministries} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "visitantes" ? <Visitantes visitors={visitors} visitorNotes={visitorNotes} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "decisoes" ? <Decisoes decisions={decisions} members={members} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "batismos" ? <Batismos baptismClasses={baptismClasses} baptismCandidates={baptismCandidates} decisions={decisions} members={members} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "cursos" ? <CursosTrilhas courses={courses} enrollments={enrollments} members={members} church={firstChurch} /> : null}
        {route === "escalas" ? <Escalas gaps={gaps} roster={roster} people={people} ministries={ministries} events={events} setDrawer={setDrawer} setModal={setModal} setCheckinEventId={setCheckinEventId} /> : null}
        {route === "reunioes" ? <Reunioes meetings={meetings} meetingActions={meetingActions} ministries={ministries} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "ensaios" ? <Ensaios rehearsals={rehearsals} ministries={ministries} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "espacos" ? <Espacos rooms={rooms} reservations={reservations} setModal={setModal} /> : null}
        {route === "quadros" ? <Quadros boards={boards} cards={cards} ministries={ministries} people={people} church={firstChurch} setModal={setModal} /> : null}
        {route === "cultos" ? <Cultos events={events} ministries={ministries} setDrawer={setDrawer} setModal={setModal} setCheckinEventId={setCheckinEventId} setShareEventId={setShareEventId} /> : null}
        {route === "comunicacao" ? <Comunicacao announcements={announcements} wallPosts={wallPosts} ministries={ministries} setModal={setModal} /> : null}
        {route === "conversas" ? <Conversas chats={chats} chatMembers={chatMembers} messages={messages} ministries={ministries} members={members} setModal={setModal} /> : null}
        {route === "relatorios" ? <Relatorios people={people} members={members} ministries={ministries} events={events} decisions={decisions} baptismClasses={baptismClasses} courses={courses} boards={boards} chats={chats} visitors={visitors} confirmationRate={confirmationRate} setRoute={setRoute} /> : null}
        {route === "config" ? <Config church={firstChurch} churches={churches} ministries={ministries} people={people} theme={theme} setTheme={setTheme} ministerialTitles={ministerialTitles} fellowshipGroups={fellowshipGroups} tags={tags} setModal={setModal} /> : null}
        {route === "identidade" ? <Identidade church={firstChurch} identity={churchIdentity} cycle={cycles.find((c) => c.is_active) ?? cycles[0]} setModal={setModal} /> : null}
        {route === "historia" ? <Historia church={firstChurch} historyEntries={historyEntries} setModal={setModal} /> : null}
      </div>

      <button className="mob-launch" type="button" onClick={() => setMobileOpen(true)}>
        ◷ Ver app do voluntario
      </button>

      {mobileOpen && (
        <MobileOverlay
          people={people}
          members={members}
          ministries={ministries}
          events={events}
          roster={roster}
          cards={cards}
          boards={boards}
          courses={courses}
          enrollments={enrollments}
          visitors={visitors}
          baptismClasses={baptismClasses}
          announcements={announcements}
          chats={chats}
          chatMembers={chatMembers}
          messages={messages}
          onClose={() => setMobileOpen(false)}
        />
      )}

      {checkinEventId && (() => {
        const checkinEvent = events.find((e) => e.id === checkinEventId);
        if (!checkinEvent) return null;
        return (
          <QRCheckinModal
            event={checkinEvent}
            roster={roster}
            people={people}
            onClose={() => setCheckinEventId(null)}
          />
        );
      })()}

      {shareEventId && (() => {
        const shareEvent = events.find((e) => e.id === shareEventId);
        if (!shareEvent) return null;
        return (
          <EventoShare
            event={shareEvent}
            ministries={ministries}
            onClose={() => setShareEventId(null)}
          />
        );
      })()}

      {drawer ? (
        <EntityDrawer
          drawer={drawer}
          people={people}
          members={members}
          ministries={ministries}
          events={events}
          roster={roster}
          decisions={decisions}
          baptismClasses={baptismClasses}
          baptismCandidates={baptismCandidates}
          visitors={visitors}
          visitorNotes={visitorNotes}
          courses={courses}
          enrollments={enrollments}
          meetings={meetings}
          meetingActions={meetingActions}
          rehearsals={rehearsals}
          church={firstChurch}
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

function JrnPips({ journey }: { journey: number[] }) {
  return (
    <div className="jrn-mini">
      {journey.slice(0, 5).map((v, i) => <span key={i} className={`jrn-pip ${v ? "on" : ""}`} />)}
    </div>
  );
}

function Membros({ members, ministries, setDrawer, setModal }: { members: MemberView[]; ministries: MinistryView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const [q, setQ] = useState("");
  const [sit, setSit] = useState<"todos" | "servindo" | "novo">("todos");
  const novos = members.filter((m) => m.situation === "novo");
  const integrando = members.filter((m) => m.journey.filter(Boolean).length < 5);
  const servindo = members.filter((m) => !!m.journey[4]);
  const visible = members.filter((m) => {
    const okQ = !q || m.name.toLowerCase().includes(q.toLowerCase()) || (m.phone ?? "").includes(q);
    const okS = sit === "todos" || (sit === "novo" && m.situation === "novo") || (sit === "servindo" && !!m.journey[4]);
    return okQ && okS;
  });
  const getMemberMinistries = (name: string) =>
    ministries.filter((min) => min.people.some((p) => p.personName === name));
  return (
    <div className="content wide">
      <PageHead title="Membros" eyebrow="Pessoas" subtitle="Toda a congregação. Veja quem serve, em que jornada está e o histórico desde que chegou." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo membro", subtitle: "Cadastro de quem já é da casa. Os dados completos liberam o acesso ao app.", saveLabel: "Adicionar membro", formFields: [{ k:"nome", label:"Nome completo", type:"text", req:true, ph:"Como a pessoa se chama" }, { k:"tel", label:"Telefone (WhatsApp)", type:"text", half:true, req:true, ph:"(11) 9...", hint:"Os 4 últimos dígitos viram a senha inicial do app." }, { k:"email", label:"E-mail", type:"text", half:true, req:true, ph:"usado para entrar no app" }, { k:"nasc", label:"Aniversário", type:"date", half:true }, { k:"bairro", label:"Bairro", type:"text", half:true, ph:"Onde mora" }], action: { kind: "member" } })}>+ Novo membro</button>} />
      <div className="kpi-row">
        <Kpi icon="membros" label="Membros" value={members.length} foot="na congregação" />
        <Kpi icon="decisoes" label="Novos convertidos" value={novos.length} foot="em discipulado inicial" />
        <Kpi icon="cursos" label="Em integração" value={integrando.length} foot="jornada ainda incompleta" amber />
        <Kpi icon="times" label="Já servindo" value={servindo.length} foot={`${Math.round((servindo.length / Math.max(members.length, 1)) * 100)}% da congregação`} />
      </div>
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar membro..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          <button className={sit === "todos" ? "on" : ""} type="button" onClick={() => setSit("todos")}>Todos</button>
          <button className={sit === "servindo" ? "on" : ""} type="button" onClick={() => setSit("servindo")}>Servindo</button>
          <button className={sit === "novo" ? "on" : ""} type="button" onClick={() => setSit("novo")}>Novos</button>
        </div>
        <div className="tb-spacer" />
        <span className="panel-meta">{visible.length} membros</span>
      </div>
      <div className="tbl">
        <div className="tr head" style={{ gridTemplateColumns: "1.6fr 0.8fr 1.1fr 1.1fr" }}><span>Membro</span><span>Membro desde</span><span>Serve</span><span>Jornada</span></div>
        {visible.map((m) => {
          const mins = getMemberMinistries(m.name);
          const isLeader = mins.some((min) => min.people.find((p) => p.personName === m.name)?.isLeader);
          return (
            <button className="tr click" type="button" key={m.id} style={{ gridTemplateColumns: "1.6fr 0.8fr 1.1fr 1.1fr" }} onClick={() => setDrawer({ kind: "member", id: m.id })}>
              <div className="cell-person"><Av name={m.name} size="md" /><div><div className="cell-name">{m.name}</div><div className="cell-sub">{m.phone || m.neighborhood || "—"}</div></div></div>
              <div><div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em" }}>{m.firstContact || "—"}</div><div className="cell-sub">na casa</div></div>
              <div>
                {mins.length > 0
                  ? <div className="cell-tags">{mins.map((min) => <span key={min.id} className="tag">{min.name.split(" ")[0]}</span>)}{isLeader && <span className="lider-tag">Líder</span>}</div>
                  : <span style={{ fontSize: 13, color: "var(--subtle)" }}>ainda não serve</span>}
              </div>
              <div><JrnPips journey={m.journey} /></div>
            </button>
          );
        })}
        {visible.length === 0 && <div className="empty">Nenhum membro encontrado.</div>}
      </div>
    </div>
  );
}

function Pessoas({ people, setDrawer, setModal }: { people: PersonView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content">
      <PageHead title="Voluntários" eyebrow="Pessoas" subtitle="Quem serve, em quais times e funções. Toque para ver perfil, disponibilidade e histórico." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo voluntário", subtitle: "Cadastre e já escolha os ministérios.", saveLabel: "Adicionar voluntário", formFields: [{ k:"nome", label:"Nome completo", type:"text", req:true, ph:"Como a pessoa se chama" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"email", label:"E-mail", type:"text", half:true, ph:"e-mail da pessoa" }], action: { kind: "member" } })}>+ Novo voluntário</button>} />
      <div className="toolbar"><div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar por nome..." /></div><div className="seg"><button className="on">Todos</button><button>Ativos</button><button>Pausa</button></div><div className="tb-spacer" /><span className="panel-meta">{people.length} pessoas</span></div>
      <div className="tbl">
        <div className="tr head tr-people"><div>Voluntário</div><div>Disponibilidade</div><div>Frentes</div><div>Status</div></div>
        {people.map((person) => <button className="tr click tr-people" type="button" key={person.id} onClick={() => setDrawer({ kind: "person", id: person.id })}><div className="who"><Av name={person.name} /><div><strong>{person.name}</strong><small>{person.phone}</small></div></div><div>{formatAvailability(person.availability)}</div><div>{person.tags.join(" · ") || "sem tags"}</div><div><Chip status={person.status} /></div></button>)}
      </div>
    </div>
  );
}

function Times({ ministries, people, setDrawer, setModal }: { ministries: MinistryView[]; people: PersonView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  return (
    <div className="content">
      <PageHead title="Times & Ministérios" eyebrow="Pessoas" subtitle="Times, líderes, funções e voluntários vinculados." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo time / ministério", subtitle: "Crie o ministério e já conte o propósito dele.", saveLabel: "Criar ministério", formFields: [{ k:"nome", label:"Nome do ministério", type:"text", req:true, ph:"ex: Louvor & Adoração" }, { k:"desc", label:"Descrição curta", type:"text", ph:"Uma linha sobre o time" }, { k:"proposito", label:"Propósito", type:"area", ph:"Por que esse time existe?" }, { k:"aberto", label:"Recebendo voluntários?", type:"toggle", onLabel:"Aberto a novos", offLabel:"Equipe completa" }], action: { kind: "ministry" } })}>+ Novo time</button>} />
      <div className="team-grid">
        {ministries.map((ministry) => <button className="team-card" type="button" key={ministry.id} onClick={() => setDrawer({ kind: "ministry", id: ministry.id })}><div className="team-card-top"><div className="team-mark"><TeamMark ministry={ministry} size={20} /></div><div className="av-stack">{ministry.people.slice(0, 4).map((link) => <Av key={link.personId} name={people.find((person) => person.id === link.personId)?.name ?? link.personName} />)}{ministry.people.length > 4 && <div className="av-more">+{ministry.people.length - 4}</div>}</div></div><div className="team-name">{ministry.name}</div><div className="team-lead">Líder: <em>{ministry.people.find((link) => link.isLeader)?.personName ?? "a definir"}</em></div><div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginTop: 12 }}>{ministry.description}</div><div className="team-foot"><span className="team-stat"><b>{ministry.people.length}</b> voluntários</span><span className="team-stat"><b>{ministry.positions.length}</b> funções</span></div></button>)}
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
  setCheckinEventId,
}: {
  gaps: Array<{ event: EventView; ministry: MinistryView; position: { id: string; name: string } }>;
  roster: RosterAssignmentView[];
  people: PersonView[];
  ministries: MinistryView[];
  events: EventView[];
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
  setCheckinEventId: (id: string | null) => void;
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
            <button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Delegar", title: "Delegar gestão da escala", subtitle: "As pessoas escolhidas passam a ver e gerir a escala deste time.", formFields: [{ k:"voluntario", label:"Voluntário", type:"text", ph:"Nome do voluntário" }, { k:"time", label:"Time", type:"text", ph:"Nome do time" }] })}><Icon name="membros" size={15} /> Delegar</button>
            <button className="btn btn-sec" type="button" onClick={() => setCheckinEventId(selectedEvent?.id ?? null)} disabled={!selectedEvent}><Icon name="cultos" size={15} /> QR Check-in</button>
            <button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Exportar", title: "Baixar escala", subtitle: "Exportar a escala atual para conferência da equipe.", formFields: [{ k:"formato", label:"Formato", type:"select", options:[{v:"pdf",l:"PDF"},{v:"csv",l:"CSV"},{v:"png",l:"PNG"}] }] })}><Icon name="relatorios" size={15} /> Baixar</button>
            <button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Publicar", title: "Publicar & avisar", subtitle: "A equipe recebe a escala pelo app e pelas notificações configuradas.", saveLabel: "Publicar & avisar →", formFields: [{ k:"msg", label:"Mensagem (opcional)", type:"area", ph:"Recado que vai junto com a escala..." }] })}>Publicar & avisar →</button>
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
        <button className="esc-modo-cfg" type="button" onClick={() => setModal({ eyebrow: "Configurar", title: "Configuração padrão", subtitle: "Defina intervalo, folgas e prioridade de rodízio.", formFields: [{ k:"intervalo", label:"Intervalo mínimo (semanas)", type:"text", ph:"ex: 2" }, { k:"limite", label:"Limite por pessoa / mês", type:"text", ph:"ex: 3" }, { k:"prioridade", label:"Prioridade", type:"select", options:[{v:"disponibilidade",l:"Disponibilidade"},{v:"rodizio",l:"Rodízio igual"},{v:"engajamento",l:"Mais engajados primeiro"}] }] })}><Icon name="config" size={13} /> Regras</button>
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
                <button className="esc-col-edit" title="Editar funções deste time" type="button" onClick={() => setModal({ eyebrow: `Funções · ${ministry.name}`, title: "Quem o time precisa", subtitle: "Adicione funções e diga quantas pessoas cada uma precisa.", formFields: [{ k:"funcao", label:"Função", type:"text", ph:"ex: Vocal, Baixo, Recepcionista" }, { k:"qtd", label:"Quantidade de vagas", type:"text", half:true, ph:"ex: 2" }] })}><Icon name="config" size={14} /></button>
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

function Cultos({ events, ministries, setDrawer, setModal, setCheckinEventId, setShareEventId }: { events: EventView[]; ministries: MinistryView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void; setCheckinEventId: (id: string) => void; setShareEventId: (id: string) => void }) {
  return (
    <div className="content">
      <PageHead title="Cultos & Agenda" eyebrow="Operação" subtitle="Agenda, roteiro, setlist e ministérios envolvidos em cada culto." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo culto ou evento", subtitle: "Agenda da igreja: o que é, quando acontece e quem serve.", saveLabel: "Criar na agenda", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: Culto da Manhã, Conferência de Jovens" }, { k:"tipo", label:"Tipo de evento", type:"select", half:true, options:[{v:"Culto",l:"Culto"},{v:"Evento",l:"Evento"},{v:"Treinamento",l:"Treinamento"},{v:"Retiro",l:"Retiro"}] }, { k:"local", label:"Local", type:"text", half:true, ph:"Templo, Anexo..." }, { k:"data", label:"Data", type:"date", half:true }, { k:"hora", label:"Horário de início", type:"time", half:true }, { k:"recorrencia", label:"Recorrência", type:"select", half:true, options:[{v:"semanal",l:"Semanal"},{v:"quinzenal",l:"Quinzenal"},{v:"mensal",l:"Mensal"},{v:"eventual",l:"Eventual"}] }], action: { kind: "event" } })}>+ Novo culto</button>} />
      <div className="grid-2">
        {events.map((event) => (
          <div className="panel" key={event.id} style={{ position: "relative" }}>
            <button className="panel click" type="button" style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }} onClick={() => setDrawer({ kind: "event", id: event.id })}>
              <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> {event.name}</span><span className="panel-meta">{event.time}</span></div>
              <div className="panel-body"><p className="mini-sub">{event.weekday} · {event.eventDate} · {event.location}</p><div className="divider" style={{ margin: "14px 0" }} />{event.schedule.slice(0, 4).map((item) => <div className="mini-row" key={item.id} style={{ paddingInline: 0 }}><div className="mini-main"><div className="mini-title">{item.item}</div><div className="mini-sub">{item.time ?? "sem horário"} · {item.category ?? "roteiro"}</div></div></div>)}<div className="mini-sub">{event.ministries.map((id) => ministries.find((ministry) => ministry.id === id)?.name).filter(Boolean).join(" · ")}</div></div>
            </button>
            <div style={{ padding: "0 22px 16px", display: "flex", gap: 8 }}>
              <button className="btn btn-sec btn-sm" type="button" onClick={(e) => { e.stopPropagation(); setCheckinEventId(event.id); }}>
                <Icon name="cultos" size={13} /> Check-in QR
              </button>
              <button className="btn btn-sec btn-sm" type="button" onClick={(e) => { e.stopPropagation(); setShareEventId(event.id); }}>
                <Icon name="relatorios" size={13} /> Arte
              </button>
            </div>
          </div>
        ))}
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
              <button className="btn btn-pri" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Confirmar", title: assignedPerson?.name ?? "Voluntário", subtitle: "Marcar como confirmado nesta escala.", formFields: [{ k:"obs", label:"Observação (opcional)", type:"text", ph:"..." }] })}>✓ Marcar como confirmado</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Reenviar", title: action.event.name, subtitle: "Deixar pendente e reenviar convite pelo app.", formFields: [{ k:"msg", label:"Mensagem (opcional)", type:"text", ph:"..." }] })}>Deixar pendente</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Recusa", title: assignedPerson?.name ?? "Voluntário", subtitle: "Registrar recusa e chamar próxima pessoa apta.", formFields: [{ k:"motivo", label:"Motivo (opcional)", type:"text", ph:"..." }] })}>Marcar que recusou</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Check-in", title: action.event.name, subtitle: "Registrar presença no culto.", formFields: [{ k:"presenca", label:"Presença", type:"select", options:[{v:"presente",l:"Presente"},{v:"falta",l:"Falta"},{v:"atrasou",l:"Atrasou"}] }, { k:"obs", label:"Observação (opcional)", type:"text", ph:"..." }] })}>● Check-in</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Pedir troca", title: action.position.name, subtitle: "Escolha quem pode substituir nesta função.", formFields: [{ k:"substituto", label:"Substituto", type:"text", ph:"Nome do substituto" }, { k:"msg", label:"Mensagem (opcional)", type:"text", ph:"..." }] })}>⇄ Pedir troca / substituir</button>
              {assignedPerson ? <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setDrawer({ kind: "person", id: assignedPerson.id })}>Ver perfil do voluntário</button> : null}
              <button className="btn btn-danger" style={{ justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Remover", title: assignedPerson?.name ?? "Voluntário", subtitle: "Remover esta pessoa da escala atual.", formFields: [{ k:"motivo", label:"Motivo (opcional)", type:"text", ph:"..." }] })}>Remover da escala</button>
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
              <button className={`cand ${occupied ? "is-block" : ""}`} type="button" key={person.id} onClick={() => occupied ? undefined : setModal({ eyebrow: "Escalar", title: person.name, subtitle: `${action.position.name} · ${action.event.name}`, formFields: [{ k:"msg", label:"Mensagem do convite (opcional)", type:"text", ph:"..." }] })}>
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
  visitorNotes: _visitorNotes,
  people,
  setDrawer,
  setModal,
}: {
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  people: PersonView[];
  setDrawer: (drawer: DrawerState) => void;
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
        action={<><div className="seg"><button className={view === "pipe" ? "on" : ""} type="button" onClick={() => setView("pipe")}>Funil</button><button className={view === "list" ? "on" : ""} type="button" onClick={() => setView("list")}>Lista</button><button className={view === "painel" ? "on" : ""} type="button" onClick={() => setView("painel")}>Painel</button></div><button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo visitante", subtitle: "Quem chegou pela primeira vez. Entra no acompanhamento automaticamente.", saveLabel: "Registrar visitante", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"Quem visitou" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"origem", label:"Como chegou", type:"select", half:true, options:[{v:"Convite de membro",l:"Convite de membro"},{v:"Instagram",l:"Instagram"},{v:"Indicação",l:"Indicação"},{v:"Evangelismo",l:"Evangelismo"},{v:"Tomou decisão no culto",l:"Tomou decisão no culto"},{v:"Passava na rua",l:"Passava na rua"}] }], action: { kind: "visitor" } })}>+ Visitante</button></>}
      />
      <div className="contato-banner">
        <div className="contato-pill"><span className="contato-pill-n">24h</span><span>1º contato</span></div>
        <div className="contato-main"><div className="contato-t">Primeiro contato em até <em>24h</em> por <em>WhatsApp</em> · meta de integração: <em>30 dias</em></div><div className="contato-s">A equipe acompanha sem dono fixo: qualquer líder pode registrar contato e avançar a jornada.</div></div>
        <button className="btn btn-sec btn-sm" type="button">Ajustar</button>
      </div>

      {view === "painel" ? (
        <div className="vpanel">
          <div className="kpi-row"><Kpi icon="visitante" label="Visitantes" value={visitors.length} foot="no acompanhamento" /><Kpi icon="comunicacao" label="Respondem o contato" value={`${replyRate}%`} foot={`${answered.length} de ${contacted.length} contatados`} /><Kpi icon="ok" label="Integram (viram membro)" value={`${integrationRate}%`} foot={`${members.length} de ${visitors.length} · ${visitors.filter((v) => v.stage === "integrando" || v.stage === "membro").length} em integração`} /><Kpi icon="alerta" label="Sem resposta" value={visitors.filter((visitor) => visitor.reply_status === "sem_resposta").length} foot="precisam de novo contato" amber /></div>
          <div className="vpanel-grid">
            <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> Visitantes por culto</span></div><div className="panel-body flush">{Object.entries(byService).map(([name, count]) => <div className="dist-row" key={name}><span className="dist-name">{name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(count / maxService) * 100}%` }} /></div><span className="dist-num">{count}</span></div>)}{visitors.length === 0 ? <div className="empty">Nenhum visitante ainda.</div> : null}</div></div>
            <div className="panel">
              <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} /> Resposta ao 1º contato</span></div>
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
                      {semResposta.length === 0 && <div style={{ fontSize: 12.5, color: "var(--subtle)" }}>Ninguém sem resposta.</div>}
                      {semResposta.map((visitor) => {
                        const owner = visitor.responsible_id ? personById.get(visitor.responsible_id) : null;
                        return (
                          <button className="flag-row click" type="button" key={visitor.id} style={{ cursor: "pointer" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}>
                            <Av name={visitor.name} size="sm" />
                            <div className="flag-main"><div className="flag-nome">{visitor.name}</div><div className="flag-meta">{visitor.visited_on || "sem data"} · {owner ? `resp. ${owner.name.split(" ")[0]}` : "sem dono"}</div></div>
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
            return <div className="pipe-col" key={stage.id}><div className="pipe-head"><span className="pipe-dot" style={{ background: stage.color }} /><span className="pipe-name">{stage.name}</span><span className="pipe-num">{items.length}</span></div><div className="pipe-body">{items.map((visitor) => { return <button className="vcard" type="button" key={visitor.id} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}><div className="vcard-top"><Av name={visitor.name} size="sm" /><div style={{ minWidth: 0 }}><div className="vcard-name">{visitor.name}</div><div className="vcard-when">{visitor.origin || "Visitante"}</div></div></div><div className="vcard-foot">{visitor.reply_status === "sem_resposta" ? <span className="vcard-noresp">sem resposta</span> : visitor.reply_status === "respondeu" ? <span className="vcard-resp">respondeu</span> : <div className="vcard-owner">{visitor.origin || "Visitante"}</div>}<span className={`vcard-due ${visitor.due_status || "ok"}`}>{visitor.due || "próximo contato"}</span></div></button>; })}{items.length === 0 ? <div className="empty" style={{ padding: 14 }}>vazio</div> : null}</div></div>;
          })}
        </div>
      ) : (
        <div className="tbl">
          <div className="tr head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }}><span>Visitante</span><span>Etapa</span><span>Como chegou</span><span>Próximo passo</span><span>Visitou</span></div>
          {visitors.map((visitor) => { const stage = VISITOR_STAGES.find((s) => s.id === visitor.stage); return <button className="tr click" key={visitor.id} type="button" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}><div className="cell-person"><Av name={visitor.name} size="md" /><div><div className="cell-name">{visitor.name}</div><div className="cell-sub">{visitor.phone || "Telefone não informado"}</div></div></div><div><span className="chip chip-neutral" style={{ color: stage?.color, borderColor: "var(--border-2)" }}>{stage?.name ?? visitor.stage}</span></div><div className="cell-sub">{visitor.origin || "Visitante"}</div><div><span className={`vcard-due ${visitor.due_status || "ok"}`}>{visitor.due || "sem prazo"}</span></div><div className="mini-right">{visitor.visited_on || "sem data"}</div></button>; })}
        </div>
      )}
    </div>
  );
}

function Reunioes({ meetings, meetingActions, ministries, people, setDrawer, setModal }: { meetings: MeetingView[]; meetingActions: MeetingActionView[]; ministries: MinistryView[]; people: PersonView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const scheduled = meetings.filter((meeting) => meeting.status === "agendada");
  const finished = meetings.filter((meeting) => meeting.status === "realizada");
  return (
    <div className="content wide">
      <PageHead title="Reuniões" eyebrow="Liderança" subtitle="Pautas, ata e responsabilidades para validar na próxima reunião." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Marcar reunião", subtitle: "Defina tema, data, local e time envolvido.", saveLabel: "Criar reunião", formFields: [{ k:"titulo", label:"Título", type:"text", req:true, ph:"ex: Reunião de planejamento" }, { k:"data", label:"Data", type:"date", half:true }, { k:"hora", label:"Horário", type:"time", half:true }, { k:"local", label:"Local", type:"text", half:true, ph:"Sala de reuniões..." }, { k:"time", label:"Ministério", type:"text", half:true, ph:"ex: Liderança" }], action: { kind: "meeting" } })}>+ Marcar reunião</button>} />
      <div className="section-divide"><Icon name="cultos" size={15} /><span className="label">Agendadas</span><span className="line" /></div>
      <div className="reu-grid">
        {scheduled.map((meeting) => {
          const author = meeting.author_id ? personById.get(meeting.author_id) : null;
          return (
            <button className="reu-card" type="button" key={meeting.id} onClick={() => setDrawer({ kind: "meeting", id: meeting.id })}>
              <div className="reu-card-top"><div><div className="reu-date">{meeting.meeting_date || "Sem data"} · {meeting.time || "sem horário"}</div><div className="reu-title">{meeting.title}</div></div><span className="chip chip-ok">Agendada</span></div>
              <div className="reu-meta">{meeting.location || "Local não informado"} · marcada por {author?.name.split(" ")[0] || "líder"}</div>
              <div className="reu-foot"><div className="reu-times">{meeting.ministries.map((id) => <span className="tag" key={id}>{ministryById.get(id)?.name || "Time"}</span>)}</div><span className="team-stat"><b>{meeting.attendees.length}</b> presentes</span></div>
            </button>
          );
        })}
        {scheduled.length === 0 ? <div className="empty">Nenhuma reunião agendada.</div> : null}
      </div>
      <div className="section-divide"><Icon name="relatorios" size={15} /><span className="label">Realizadas</span><span className="line" /></div>
      <div className="tbl">
        {finished.map((meeting) => {
          const actions = meetingActions.filter((action) => action.meeting_id === meeting.id);
          const pending = actions.filter((action) => action.status !== "feito").length;
          return (
            <button className="tr click" type="button" key={meeting.id} style={{ gridTemplateColumns: "130px 1.6fr 1fr 120px" }} onClick={() => setDrawer({ kind: "meeting", id: meeting.id })}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--olive)" }}>{meeting.meeting_date || "sem data"}</div>
              <div><div className="cell-name">{meeting.title}</div><div className="cell-sub">{meeting.ministries.length} time(s) · {meeting.attendees.length} presentes</div></div>
              <div className="cell-sub">{actions.length} responsabilidade(s)</div>
              <div>{pending > 0 ? <span className="chip chip-wait">{pending} em aberto</span> : <span className="chip chip-ok">Tudo feito</span>}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Ensaios({ rehearsals, ministries, setDrawer, setModal }: { rehearsals: RehearsalView[]; ministries: MinistryView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  return (
    <div className="content wide">
      <PageHead title="Ensaios" eyebrow="Liderança" subtitle="Ensaios por ministério, presença, repertório e materiais." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo ensaio", subtitle: "Louvor, teatro, dança… Escolha quem participa e defina o repertório.", saveLabel: "Criar ensaio", formFields: [{ k:"titulo", label:"Nome do ensaio", type:"text", req:true, ph:"ex: Ensaio do Louvor, Peça de Natal" }, { k:"tipo", label:"Tipo de ensaio", type:"select", half:true, options:[{v:"louvor",l:"Louvor / música"},{v:"teatro",l:"Teatro"},{v:"danca",l:"Dança"},{v:"coreografia",l:"Coreografia"},{v:"geral",l:"Geral"},{v:"outro",l:"Outro"}] }, { k:"time", label:"Ministério", type:"text", half:true, ph:"ex: Louvor" }, { k:"data", label:"Dia", type:"date", half:true }, { k:"hora", label:"Horário", type:"time", half:true }, { k:"local", label:"Local", type:"text", half:true, ph:"Templo, Sala 2..." }, { k:"recorrencia", label:"Recorrência", type:"select", half:true, options:[{v:"semanal",l:"Semanal"},{v:"quinzenal",l:"Quinzenal"},{v:"mensal",l:"Mensal"},{v:"eventual",l:"Eventual"}] }, { k:"obs", label:"Observação", type:"area", ph:"Detalhes do ensaio" }], action: { kind: "rehearsal" } })}>+ Novo ensaio</button>} />
      <div className="reu-grid">
        {rehearsals.map((rehearsal) => {
          const ministry = rehearsal.ministry_id ? ministryById.get(rehearsal.ministry_id) : null;
          return (
            <button className="ens-card" type="button" key={rehearsal.id} onClick={() => setDrawer({ kind: "rehearsal", id: rehearsal.id })}>
              <div className="ens-top"><span className="ens-rec">{rehearsal.recurrence || "eventual"}</span><span className="ens-pub">{rehearsal.kind || "Ensaio"}</span></div>
              <div className="ens-title">{rehearsal.title}</div>
              <div className="ens-when">{rehearsal.rehearsal_date || "sem data"} · {rehearsal.time || "sem horário"} · {rehearsal.location || "sem local"}</div>
              <div className="ens-team"><span className="ens-team-ic"><Icon name="times" size={15} /></span>{ministry?.name || "Vários times"} · {rehearsal.attendees.length} pessoas</div>
              {rehearsal.repertoire.length ? <div className="ens-obs"><Icon name="cultos" size={13} /> {rehearsal.repertoire.length} item(ns) no repertório</div> : null}
              {rehearsal.notes ? <div className="ens-obs">{rehearsal.notes}</div> : null}
            </button>
          );
        })}
        {rehearsals.length === 0 ? <div className="empty">Nenhum ensaio criado.</div> : null}
      </div>
    </div>
  );
}

function ReuniaoDrawer({
  meeting,
  actions,
  ministries,
  people,
  onClose,
}: {
  meeting: MeetingView;
  actions: MeetingActionView[];
  ministries: MinistryView[];
  people: PersonView[];
  onClose: () => void;
}) {
  const router = useRouter();
  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const [ata, setAta] = useState(meeting.minutes ?? "");
  const [saving, setSaving] = useState(false);
  const pauta = Array.isArray(meeting.agenda) ? (meeting.agenda as string[]) : [];

  const salvarAta = async () => {
    setSaving(true);
    await createServiceBrowserClient()
      .schema("service")
      .from("meetings")
      .update({ minutes: ata, status: meeting.status === "agendada" ? "realizada" : meeting.status })
      .eq("id", meeting.id);
    setSaving(false);
    router.refresh();
  };

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{meeting.status === "agendada" ? "Reunião agendada" : "Reunião realizada"}</div>
        <div className="profile-name">{meeting.title}</div>
        <div className="profile-role">{meeting.meeting_date || "sem data"} · {meeting.time || ""} · {meeting.location || "sem local"}</div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Times & presentes">
          <div className="cell-tags" style={{ marginBottom: 12 }}>
            {meeting.ministries.map((id) => <span key={id} className="tag">{ministryById.get(id)?.name || "Time"}</span>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meeting.attendees.map((pid) => {
              const p = personById.get(pid);
              return p ? (
                <div className="cand" key={pid}>
                  <Av name={p.name} size="sm" />
                  <div className="cand-main"><div className="cand-name">{p.name}</div><div className="cand-meta">{p.tags.join(" · ") || "Participante"}</div></div>
                </div>
              ) : null;
            })}
            {meeting.attendees.length === 0 && <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhum presente registrado.</div>}
          </div>
        </DrawerSection>

        {pauta.length > 0 && (
          <DrawerSection title="Pauta">
            <div className="step-stack">
              {pauta.map((item, i) => (
                <div className="step-do" key={i}>
                  <span className="step-ic">{String(i + 1).padStart(2, "0")}</span> {item}
                </div>
              ))}
            </div>
          </DrawerSection>
        )}

        <DrawerSection title="Ata · o que foi discutido">
          <textarea
            className="textarea"
            style={{ minHeight: 90 }}
            placeholder="Registre as decisões e os pontos principais da reunião..."
            value={ata}
            onChange={(e) => setAta(e.target.value)}
          />
        </DrawerSection>

        {actions.length > 0 && (
          <DrawerSection title="Responsabilidades">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {actions.map((action) => {
                const assignee = action.assignee_id ? personById.get(action.assignee_id) : null;
                const stMap: Record<string, { label: string; cls: string }> = {
                  pendente: { label: "A fazer", cls: "chip-wait" },
                  andamento: { label: "Em andamento", cls: "chip-wait" },
                  feito: { label: "Concluído", cls: "chip-ok" },
                };
                const st = stMap[action.status] ?? stMap.pendente;
                return (
                  <div className="acao-row" key={action.id}>
                    <div className="acao-main">
                      <div className="acao-o">{action.description}</div>
                      <div className="acao-quem">{assignee?.name.split(" ")[0] ?? "a definir"}</div>
                    </div>
                    <div className="acao-side"><span className={`chip ${st.cls}`}>{st.label}</span></div>
                  </div>
                );
              })}
            </div>
          </DrawerSection>
        )}

        <button
          className="btn btn-pri"
          style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
          type="button"
          disabled={saving}
          onClick={salvarAta}
        >
          {saving ? "Salvando..." : meeting.status === "agendada" ? "Salvar ata & marcar realizada" : "Salvar ata"}
        </button>
      </div>
    </DrawerShell>
  );
}

function EnsaioDrawer({
  rehearsal,
  ministries,
  people,
  onClose,
}: {
  rehearsal: RehearsalView;
  ministries: MinistryView[];
  people: PersonView[];
  onClose: () => void;
}) {
  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const ministry = rehearsal.ministry_id ? ministryById.get(rehearsal.ministry_id) : undefined;
  type SongItem = { titulo: string; tom?: string; youtube?: string; cifra?: string };
  type AttachItem = { tipo: string; nome: string; url?: string };
  const repertoire = (rehearsal.repertoire as SongItem[]) ?? [];
  const attachments = (rehearsal.attachments as AttachItem[]) ?? [];

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{rehearsal.kind || "Ensaio"} · {rehearsal.recurrence || "eventual"}</div>
        <div className="profile-name">{rehearsal.title}</div>
        <div className="profile-role">{rehearsal.rehearsal_date || "sem data"} · {rehearsal.time || ""} · {rehearsal.location || "sem local"}{rehearsal.audience ? " · " + rehearsal.audience : ""}</div>
      </div>
      <div className="drawer-body">
        {ministry && (
          <DrawerSection title="Time">
            <div className="cell-tags"><span className="tag lead">{ministry.name}</span></div>
          </DrawerSection>
        )}

        {rehearsal.attendees.length > 0 && (
          <DrawerSection title={`Quem participa · ${rehearsal.attendees.length}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rehearsal.attendees.map((pid) => {
                const p = personById.get(pid);
                return p ? (
                  <div className="cand" key={pid}>
                    <Av name={p.name} size="sm" />
                    <div className="cand-main"><div className="cand-name">{p.name}</div><div className="cand-meta">{p.tags.join(" · ") || "Participante"}</div></div>
                  </div>
                ) : null;
              })}
            </div>
          </DrawerSection>
        )}

        {repertoire.length > 0 && (
          <DrawerSection title={`Repertório · ${repertoire.length}`}>
            <div className="setlist-list">
              {repertoire.map((song, i) => (
                <div className="setlist-row" key={i}>
                  <span className="setlist-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="setlist-titulo">{song.titulo}</span>
                  {song.tom && <span className="setlist-tom">{song.tom}</span>}
                  {song.youtube && <a className="setlist-link" href={song.youtube} target="_blank" rel="noreferrer">vídeo</a>}
                  {song.cifra && <a className="setlist-link" href={song.cifra} target="_blank" rel="noreferrer">cifra</a>}
                </div>
              ))}
            </div>
          </DrawerSection>
        )}

        {attachments.length > 0 && (
          <DrawerSection title="Materiais">
            <div className="anx-list">
              {attachments.map((a, i) => (
                a.url
                  ? <a className="anx-item" key={i} href={a.url} target="_blank" rel="noreferrer"><span className="anx-tag">{a.tipo}</span><span className="anx-nome">{a.nome}</span></a>
                  : <div className="anx-item" key={i}><span className="anx-tag">{a.tipo}</span><span className="anx-nome">{a.nome}</span></div>
              ))}
            </div>
          </DrawerSection>
        )}

        {rehearsal.notes && (
          <DrawerSection title="Observação">
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{rehearsal.notes}</p>
          </DrawerSection>
        )}
      </div>
    </DrawerShell>
  );
}

function ComposerModal({
  ministries,
  onClose,
}: {
  ministries: MinistryView[];
  onClose: () => void;
}) {
  const [alvos, setAlvos] = useState<string[]>(["Todos"]);
  const [canais, setCanais] = useState<string[]>(["app", "push"]);
  const [msg, setMsg] = useState("");
  const toggle = (arr: string[], setArr: (a: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const opcoes = ["Todos", ...ministries.map((m) => m.name)];
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Novo comunicado</div>
          <div className="modal-title">Falar com a equipe</div>
          <div className="modal-sub">Escreva uma vez e escolha quem recebe e por onde. O voluntário vê no app e na notificação.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field">
            <label className="field-label">Mensagem</label>
            <textarea className="textarea" placeholder="Ex.: Ensaio geral sábado 16h. Chegada 15h45." value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Para quem</label>
            <div className="seg-check">
              {opcoes.map((o) => (
                <button key={o} type="button" className={`seg-chip ${alvos.includes(o) ? "on" : ""}`} onClick={() => toggle(alvos, setAlvos, o)}>
                  {o.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Canais</label>
            <div className="seg-check">
              {([ ["app", "No app"], ["push", "Notificação push"], ["email", "E-mail"] ] as [string, string][]).map(([id, l]) => (
                <button key={id} type="button" className={`seg-chip ${canais.includes(id) ? "on" : ""}`} onClick={() => toggle(canais, setCanais, id)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={!msg.trim()} onClick={onClose}>Enviar para {alvos.length} grupo(s) →</button>
        </div>
      </div>
    </div>
  );
}

function Comunicacao({
  announcements,
  wallPosts,
  ministries,
  setModal: _setModal,
}: {
  announcements: AnnouncementView[];
  wallPosts: WallPostView[];
  ministries: MinistryView[];
  setModal: (modal: ModalState) => void;
}) {
  const [view, setView] = useState<"mural" | "avisos">("mural");
  const [selected, setSelected] = useState(announcements[0]?.id ?? "");
  const [compose, setCompose] = useState(false);
  const selAviso = announcements.find((a) => a.id === selected);
  return (
    <div className="content wide">
      <PageHead
        title="Comunicação"
        eyebrow="Operação"
        subtitle="Mural em tempo real e avisos segmentados. O voluntário recebe no app e por notificação, e você vê quem leu."
        action={<>
          <div className="seg">
            <button className={view === "mural" ? "on" : ""} type="button" onClick={() => setView("mural")}>Mural</button>
            <button className={view === "avisos" ? "on" : ""} type="button" onClick={() => setView("avisos")}>Avisos</button>
          </div>
          <button className="btn btn-pri" type="button" onClick={() => setCompose(true)}>+ Novo comunicado</button>
        </>}
      />

      {view === "mural" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>
          <div className="feed">
            {wallPosts.length === 0 && <div className="empty">Nenhuma publicação no mural ainda.</div>}
            {wallPosts.map((post) => (
              <div className={`post ${post.pinned ? "pin" : ""}`} key={post.id}>
                <div className="post-top">
                  <Av name={post.author || "CE.X"} size="md" />
                  <div className="post-who">
                    <div className="post-name">
                      {post.author || "Liderança"}
                      {post.pinned && <span className="post-pin">fixado</span>}
                    </div>
                    <div className="post-meta">para {post.audience || "todos"} · {new Date(post.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                </div>
                <p className="post-txt">{post.body}</p>
                <div className="post-foot">
                  {post.channels.map((c) => (
                    <span key={c} className="chan">{c === "push" ? "push" : c === "email" ? "e-mail" : "app"}</span>
                  ))}
                  {post.channels.length === 0 && <span className="chan">app</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ position: "sticky", top: 88 }}>
            <div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={14} /> Resumo</span></div>
            <div className="panel-body">
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em" }}>{wallPosts.length}<span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>publicações</span></div>
              <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>{announcements.length} aviso(s) · {wallPosts.filter((p) => p.pinned).length} fixado(s)</div>
              <button className="btn btn-sec btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} type="button" onClick={() => setCompose(true)}>Novo comunicado →</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
          <div className="tbl">
            {announcements.map((a) => (
              <button key={a.id} className="mini-row click" type="button" style={{ background: a.id === selected ? "var(--olive-dim)" : "transparent" }} onClick={() => setSelected(a.id)}>
                <div className="mini-main">
                  <div className="mini-title">{a.title}</div>
                  <div className="mini-sub">{a.audience || "todos"} · {a.when_label || "agora"}</div>
                </div>
              </button>
            ))}
            {announcements.length === 0 && <div style={{ padding: "22px 16px", fontSize: 13, color: "var(--subtle)" }}>Nenhum aviso publicado.</div>}
          </div>
          {selAviso ? (
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title"><Icon name="comunicacao" size={14} /> {selAviso.title}</span>
                <span className="panel-meta">{selAviso.when_label || "agora"}</span>
              </div>
              <div className="panel-body">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <Av name={selAviso.author || "CE.X"} size="sm" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{selAviso.author || "Liderança"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>para {selAviso.audience || "todos"}</div>
                  </div>
                </div>
                <p style={{ fontSize: 15, color: "var(--light)", lineHeight: 1.7 }}>{selAviso.body || "Sem texto."}</p>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button className="btn btn-pri btn-sm" type="button">Reenviar notificação</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel"><div className="panel-body"><div className="empty">Selecione um aviso para ver os detalhes.</div></div></div>
          )}
        </div>
      )}
      {compose && <ComposerModal ministries={ministries} onClose={() => setCompose(false)} />}
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
        action={<><button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Nova sala / espaço", subtitle: "Um espaço físico da igreja disponível para reservas.", saveLabel: "Criar sala", formFields: [{ k:"nome", label:"Nome do espaço", type:"text", req:true, ph:"ex: Sala 3, Salão de festas" }, { k:"capacidade", label:"Capacidade (pessoas)", type:"text", half:true, ph:"ex: 30" }, { k:"local", label:"Onde fica", type:"text", half:true, ph:"ex: 1º andar, Anexo" }, { k:"recursos", label:"Recursos disponíveis", type:"text", ph:"Som, Projeção, Piano", hint:"Separe por vírgula." }], action: { kind: "room" } })}>+ Nova sala</button><button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Reservar espaço", subtitle: "Escolha o compromisso, data e horário.", saveLabel: "Criar reserva", formFields: [{ k:"titulo", label:"Título", type:"text", req:true, ph:"ex: Reunião de liderança" }, { k:"tipo", label:"Tipo", type:"select", half:true, options:[{v:"reuniao",l:"Reunião"},{v:"ensaio",l:"Ensaio"},{v:"evento",l:"Evento"},{v:"treinamento",l:"Treinamento"},{v:"outro",l:"Outro"}] }, { k:"data", label:"Data", type:"date", half:true }, { k:"inicio", label:"Início", type:"time", half:true }, { k:"fim", label:"Fim", type:"time", half:true }], action: { kind: "reservation", roomId: filter !== "todas" ? filter : undefined } })}>+ Reservar espaço</button></>}
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
  const [q, setQ] = useState("");
  const [f, setF] = useState<"todas" | "novo" | "acompanhando" | "encaminhado">("todas");
  const personById = new Map(people.map((person) => [person.id, person]));
  const newDecisions = decisions.filter((d) => d.status === "novo");
  const following = decisions.filter((d) => d.status === "acompanhando");
  const forwarded = decisions.filter((d) => d.status === "encaminhado");
  const visible = decisions.filter((d) => {
    const matchQ = !q || d.name.toLowerCase().includes(q.toLowerCase()) || (d.phone ?? "").includes(q);
    const matchF = f === "todas" || d.status === f;
    return matchQ && matchF;
  });
  return (
    <div className="content wide">
      <PageHead
        title="Decisões por Jesus"
        eyebrow="Jornada"
        subtitle="Quem aceitou ou se reconciliou. Cada decisão vira uma pessoa no sistema e começa uma jornada: registre, acompanhe e encaminhe."
        action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Nova decisão", subtitle: "Registre quem decidiu, o culto e quem fará o acompanhamento.", saveLabel: "Registrar decisão", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"Quem decidiu" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"culto", label:"Culto", type:"text", half:true, ph:"ex: Culto da Manhã" }, { k:"responsavel", label:"Responsável pelo acompanhamento", type:"text", ph:"Quem vai acompanhar" }], action: { kind: "decision" } })}>+ Registrar decisão</button>}
      />
      <div className="kpi-row">
        <Kpi icon="visitante" label="Decisões no mês" value={decisions.length} foot="registradas na jornada" />
        <Kpi icon="config" label="A contatar" value={newDecisions.length} foot="aguardando primeiro contato" amber />
        <Kpi icon="pessoa" label="Em acompanhamento" value={following.length} foot="discipulado em andamento" />
        <Kpi icon="relatorios" label="Encaminhados" value={forwarded.length} foot="já viraram membros" />
      </div>
      <div className="toolbar">
        <div className="tb-search">
          <span className="si"><Icon name="buscar" size={13} /></span>
          <input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">
          <button className={f === "todas" ? "on" : ""} type="button" onClick={() => setF("todas")}>Todas</button>
          <button className={f === "novo" ? "on" : ""} type="button" onClick={() => setF("novo")}>A contatar</button>
          <button className={f === "acompanhando" ? "on" : ""} type="button" onClick={() => setF("acompanhando")}>Acompanhando</button>
          <button className={f === "encaminhado" ? "on" : ""} type="button" onClick={() => setF("encaminhado")}>Encaminhados</button>
        </div>
        <div className="tb-spacer" />
        <span className="panel-meta">{visible.length} de {decisions.length} decisões</span>
      </div>
      <div className="tbl">
        <div className="tr head" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 130px" }}><span>Pessoa</span><span>Quando & culto</span><span>Responsável</span><span>Situação</span></div>
        {visible.map((decision) => {
          const responsible = decision.responsible_id ? personById.get(decision.responsible_id) : null;
          return (
            <button className="tr click" key={decision.id} style={{ gridTemplateColumns: "1.5fr 1fr 1fr 130px" }} type="button" onClick={() => setDrawer({ kind: "decision", id: decision.id })}>
              <div className="cell-person"><Av name={decision.name} size="md" /><div><div className="cell-name">{decision.name} <span className="chip chip-ok" style={{ marginLeft: 6, transform: "scale(0.92)" }}>{decision.kind === "reconciliacao" ? "Reconciliação" : "Decisão"}</span></div><div className="cell-sub">{decision.phone || "Telefone não informado"}</div></div></div>
              <div><div style={{ fontSize: 13, color: "var(--light)" }}>{decision.happened_on || "Data não informada"}</div><div className="cell-sub">{decision.service_name || "Culto não informado"}</div></div>
              <div className="cell-person">{responsible ? <Av name={responsible.name} size="sm" /> : null}<div className="cell-sub" style={{ marginTop: 0 }}>{responsible?.name ?? "a definir"}</div></div>
              <div><Chip status={decision.status === "novo" ? "wait" : decision.status === "encaminhado" ? "ok" : "ativo"} /></div>
            </button>
          );
        })}
        {visible.length === 0 ? <div className="empty">Nenhuma decisão encontrada.</div> : null}
      </div>
    </div>
  );
}

const BAT_ST_MAP: Record<string, { label: string; cls: string }> = {
  aberta: { label: "Inscrições abertas", cls: "chip-ok" },
  preparacao: { label: "Em preparação", cls: "chip-wait" },
  agendada: { label: "Agendada", cls: "chip-ok" },
  concluida: { label: "Concluída", cls: "chip-neutral" },
};

function Batismos({
  baptismClasses,
  baptismCandidates,
  decisions: _decisions,
  members: _members,
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
  const upcoming = baptismClasses.filter((c) => c.status !== "concluida");
  const concluded = baptismClasses.filter((c) => c.status === "concluida");
  return (
    <div className="content wide">
      <PageHead title="Batismos" eyebrow="Jornada" subtitle="Turmas de batismo nas águas. Inscrições, curso pré-batismo, agenda e histórico na linha do tempo da pessoa." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Nova turma de batismo", subtitle: "Crie a turma, defina data, local e quem vai oficiar.", saveLabel: "Criar turma", formFields: [{ k:"label", label:"Nome da turma", type:"text", req:true, ph:"ex: Batismo de Julho 2025" }, { k:"data", label:"Data do batismo", type:"date", half:true }, { k:"local", label:"Local", type:"text", half:true, ph:"Templo..." }, { k:"pastor", label:"Pastor responsável", type:"text", ph:"Quem vai oficiar" }], action: { kind: "baptismClass" } })}>+ Nova turma</button>} />
      <div className="kpi-row">
        <Kpi icon="identidade" label="Turmas abertas" value={baptismClasses.filter((c) => c.open_enrollment).length} foot="com inscrições disponíveis" />
        <Kpi icon="pessoa" label="Candidatos" value={baptismCandidates.length} foot="em preparação" />
        <Kpi icon="cultos" label="Próximas turmas" value={upcoming.length} foot={upcoming[0]?.baptism_date || "sem data agendada"} />
        <Kpi icon="relatorios" label="Concluídos" value={concluded.length} foot="histórico da igreja" />
      </div>
      <div className="section-divide">
        <span className="num">{upcoming.length}</span>
        <span className="label">PRÓXIMAS TURMAS</span>
        <div className="line" />
      </div>
      {upcoming.length > 0 ? (
        <div className="bat-grid">
          {upcoming.map((cls) => {
            const count = baptismCandidates.filter((c) => c.class_id === cls.id).length;
            const st = BAT_ST_MAP[cls.status ?? "aberta"];
            return (
              <button className="bat-card" key={cls.id} type="button" onClick={() => setDrawer({ kind: "baptismClass", id: cls.id })}>
                <div className="bat-card-top">
                  <div>
                    <div className="bat-date">{cls.baptism_date ?? "Sem data"}</div>
                    <div className="bat-turma">{cls.label}</div>
                  </div>
                  <div className="bat-mark"><Icon name="batismos" size={20} /></div>
                </div>
                <div className="bat-meta">{cls.location || "Local não informado"} · {cls.pastor || "Pastor não informado"}</div>
                <div className="bat-foot">
                  <span className={`chip ${st?.cls ?? "chip-wait"}`}>{st?.label ?? cls.status}</span>
                  <span className="panel-meta">{count} candidato{count !== 1 ? "s" : ""}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty">Nenhuma turma em andamento.</div>
      )}
      {concluded.length > 0 && (
        <>
          <div className="section-divide" style={{ marginTop: 32 }}>
            <span className="num">{concluded.length}</span>
            <span className="label">HISTÓRICO</span>
            <div className="line" />
          </div>
          <div className="tbl">
            <div className="tr head" style={{ gridTemplateColumns: "2fr 1fr 1fr 100px" }}><span>Turma</span><span>Data</span><span>Local</span><span>Candidatos</span></div>
            {concluded.map((cls) => {
              const count = baptismCandidates.filter((c) => c.class_id === cls.id).length;
              return (
                <button className="tr click" key={cls.id} type="button" style={{ gridTemplateColumns: "2fr 1fr 1fr 100px" }} onClick={() => setDrawer({ kind: "baptismClass", id: cls.id })}>
                  <div className="cell-name">{cls.label}</div>
                  <div style={{ fontSize: 13, color: "var(--light)" }}>{cls.baptism_date ?? "—"}</div>
                  <div className="cell-sub">{cls.location ?? "—"}</div>
                  <div><span className="chip chip-neutral">{count} pessoas</span></div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CursosTrilhas({
  courses, enrollments, members, church,
}: {
  courses: CourseView[];
  enrollments: EnrollmentView[];
  members: MemberView[];
  church?: ChurchView;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  if (editingId !== null && church) {
    return (
      <CursoEditor
        courseId={editingId === "new" ? null : editingId}
        church={{ id: church.id, organizationId: church.organizationId }}
        allCourses={courses.map((c) => ({ id: c.id, name: c.name }))}
        onClose={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="content wide">
      <PageHead
        title="Cursos & Trilhas"
        eyebrow="Jornada"
        subtitle="Trilhas internas de formação, aulas e participantes. Não mistura com cursos comerciais CE.X."
        action={
          <button className="btn btn-pri" type="button" onClick={() => setEditingId("new")}>
            + Nova trilha
          </button>
        }
      />
      <div className="team-grid">
        {courses.map((course) => {
          const courseEnrollments = enrollments.filter((item) => item.course_id === course.id);
          const concluded = courseEnrollments.filter((item) => item.status === "concluido").length;
          return (
            <button
              className="team-card"
              type="button"
              key={course.id}
              onClick={() => setEditingId(course.id)}
            >
              <div className="team-card-top">
                <div className="team-mark"><Icon name="relatorios" size={20} /></div>
                <span className="chip chip-ok">{course.level || course.category || "trilha"}</span>
              </div>
              <div className="team-name">{course.name}</div>
              <div className="team-lead">Matrículas: <em>{courseEnrollments.length}</em></div>
              <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, marginTop: 12 }}>
                {course.description || "Acompanhamento de progresso e conclusão na linha do tempo do membro."}
              </p>
              <div className="bar" style={{ marginTop: 14 }}>
                <div className="bar-fill" style={{ width: `${courseEnrollments.length ? (concluded / courseEnrollments.length) * 100 : Math.min(100, members.length * 2)}%` }} />
              </div>
            </button>
          );
        })}
        {courses.length === 0 && <div className="empty">Nenhuma trilha interna criada ainda.</div>}
      </div>
    </div>
  );
}

const PRIO_COLOR: Record<string, string> = {
  alta: "var(--danger)",
  media: "var(--amber)",
  baixa: "var(--olive)",
};

function KbCard({
  card,
  peopleById,
  atrasado,
  parado,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: CardView;
  peopleById: Map<string, PersonView>;
  atrasado: boolean;
  parado: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      className={`kb-card${atrasado ? " atrasado" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="kb-card-top">
        <span className={`prio-dot prio-${card.priority ?? "media"}`} style={{ background: PRIO_COLOR[card.priority ?? "media"] }} />
        {card.source_type && card.source_type !== "manual" && (
          <span className="kb-origem"><Icon name="cultos" size={11} /> {card.source_type}</span>
        )}
        {parado && !atrasado && <span className="kb-parado">parado</span>}
      </div>
      <div className="kb-card-title">{card.title}</div>
      <div className="kb-card-foot">
        {card.due && <span className={`kb-prazo${atrasado ? " late" : ""}`}>{card.due}</span>}
        <div className="av-stack">
          {card.assignees.slice(0, 3).map((id) => {
            const p = peopleById.get(id);
            return p ? <Av key={id} name={p.name} size="xs" /> : null;
          })}
        </div>
      </div>
    </div>
  );
}

function CardDrawer({
  card: initCard,
  board,
  columns,
  people,
  church,
  onClose,
  onMoveParent,
  onRefresh,
}: {
  card: CardView;
  board: BoardView;
  columns: { id: string; name: string }[];
  people: PersonView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onMoveParent: (cardId: string, colId: string) => void;
  onRefresh: () => void;
}) {
  const [lc, setLc] = useState(initCard);
  const [comments, setComments] = useState<{ id: string; author: string; body: string; created_at: string }[]>([]);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    createServiceBrowserClient()
      .schema("service")
      .from("card_comments")
      .select("*")
      .eq("card_id", initCard.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setComments(data as typeof comments); });
  }, [initCard.id]);

  const mutate = async (updates: Partial<Pick<CardView, "column_id" | "priority" | "assignees">>) => {
    setLc((prev) => ({ ...prev, ...updates }));
    await createServiceBrowserClient().schema("service").from("cards").update(updates).eq("id", lc.id);
    onRefresh();
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const body = commentText.trim();
    setCommentText("");
    const { data } = await createServiceBrowserClient()
      .schema("service")
      .from("card_comments")
      .insert({ organization_id: church?.organizationId ?? "", card_id: lc.id, author: "Equipe", body })
      .select()
      .single();
    if (data) setComments((prev) => [...prev, data as (typeof comments)[0]]);
  };

  const deleteCard = async () => {
    await createServiceBrowserClient().schema("service").from("cards").delete().eq("id", lc.id);
    onRefresh();
    onClose();
  };

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" type="button" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{board.name}</div>
          <div className="profile-name" style={{ fontSize: 22 }}>{lc.title}</div>
        </div>
        <div className="drawer-body">
          {lc.description && <p style={{ fontSize: 14, color: "var(--light)", lineHeight: 1.6, marginBottom: 12 }}>{lc.description}</p>}

          <div className="dsec" style={{ marginTop: 8 }}>
            <div className="dsec-title">Situação</div>
            <div className="kb-move">
              {columns.map((col) => (
                <button key={col.id} type="button" className={`seg-chip${lc.column_id === col.id ? " on" : ""}`}
                  onClick={() => { mutate({ column_id: col.id }); onMoveParent(lc.id, col.id); }}>
                  {col.name}
                </button>
              ))}
            </div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Prazo</dt>
              <dd>{lc.due || <span style={{ color: "var(--subtle)" }}>sem prazo</span>}</dd>
              <dt>Prioridade</dt>
              <dd>
                <div className="seg seg-sm" style={{ display: "inline-flex" }}>
                  {(["alta", "media", "baixa"] as const).map((p) => (
                    <button key={p} type="button" className={lc.priority === p ? "on" : ""} onClick={() => mutate({ priority: p })}>
                      {p === "alta" ? "Alta" : p === "media" ? "Média" : "Baixa"}
                    </button>
                  ))}
                </div>
              </dd>
            </dl>
          </div>

          <div className="dsec">
            <div className="dsec-title">Responsáveis</div>
            <div className="cand-pick">
              {people.slice(0, 12).map((p) => {
                const on = lc.assignees.includes(p.id);
                return (
                  <button key={p.id} type="button" className={`cand-chip${on ? " on" : ""}`}
                    onClick={() => mutate({ assignees: on ? lc.assignees.filter((x) => x !== p.id) : [...lc.assignees, p.id] })}>
                    <Av name={p.name} size="xs" /> {p.name.split(" ")[0]} {on && "✓"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Comentários · {comments.length}</div>
            <div className="kb-comments">
              {comments.map((cm) => (
                <div className="kb-coment" key={cm.id}>
                  <Av name={cm.author || "?"} size="sm" />
                  <div className="kb-coment-body">
                    <div className="kb-coment-top">
                      <b>{cm.author || "Equipe"}</b>
                      <span>{new Date(cm.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="kb-coment-txt">{cm.body}</div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhum comentário ainda.</div>}
            </div>
            <div className="kb-coment-add">
              <input className="input" placeholder="Escreva um comentário..." value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()} />
              <button className="btn btn-sec btn-sm" type="button" onClick={addComment}>Enviar</button>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 8 }} onClick={deleteCard}>Excluir card</button>
        </div>
      </div>
    </>
  );
}

function NovoCard({
  board,
  colId,
  people,
  church,
  onClose,
  onRefresh,
}: {
  board: BoardView;
  colId: string;
  people: PersonView[];
  church: ChurchView;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<"alta" | "media" | "baixa">("media");
  const [resp, setResp] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const criar = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    await createServiceBrowserClient().schema("service").from("cards").insert({
      organization_id: church.organizationId,
      board_id: board.id,
      column_id: colId,
      title: titulo.trim(),
      description: desc.trim() || null,
      due: due || null,
      priority: prio,
      assignees: resp,
      source_type: "manual",
    });
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{board.name}</div>
          <div className="modal-title">Novo card</div>
        </div>
        <div className="modal-body">
          <div className="field"><label className="field-label">Título</label><input className="input" autoFocus value={titulo} placeholder="O que precisa ser feito" onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="field"><label className="field-label">Descrição</label><textarea className="textarea" value={desc} placeholder="Detalhes (opcional)" onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="field field-half"><label className="field-label">Prazo</label><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div className="field field-half"><label className="field-label">Prioridade</label>
            <div className="seg seg-sm">
              {(["alta", "media", "baixa"] as const).map((p) => (
                <button key={p} type="button" className={prio === p ? "on" : ""} onClick={() => setPrio(p)}>
                  {p === "alta" ? "Alta" : p === "media" ? "Média" : "Baixa"}
                </button>
              ))}
            </div>
          </div>
          <div className="field"><label className="field-label">Responsáveis</label>
            <div className="cand-pick">
              {people.slice(0, 12).map((p) => {
                const on = resp.includes(p.id);
                return (
                  <button key={p.id} type="button" className={`cand-chip${on ? " on" : ""}`}
                    onClick={() => setResp(on ? resp.filter((x) => x !== p.id) : [...resp, p.id])}>
                    <Av name={p.name} size="xs" /> {p.name.split(" ")[0]} {on && "✓"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={criar}>Adicionar card</button>
        </div>
      </div>
    </div>
  );
}

function BoardView({
  board,
  boardCards,
  people,
  peopleById,
  church,
  onBack,
  onMoveCard,
  onRefresh,
}: {
  board: BoardView;
  boardCards: CardView[];
  people: PersonView[];
  peopleById: Map<string, PersonView>;
  church: ChurchView | undefined;
  onBack: () => void;
  onMoveCard: (cardId: string, colId: string) => void;
  onRefresh: () => void;
}) {
  const [openCard, setOpenCard] = useState<CardView | null>(null);
  const [novoCol, setNovoCol] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fPrio, setFPrio] = useState("todas");
  const [fEstado, setFEstado] = useState("todos");

  const columns = board.columns.length
    ? board.columns.map((c) => ({ id: c.id, name: c.nome ?? c.name ?? c.id }))
    : [{ id: "todo", name: "A fazer" }, { id: "doing", name: "Em andamento" }, { id: "done", name: "Concluído" }];

  const isAtrasado = (c: CardView) => {
    if (!c.due) return false;
    try { return new Date(c.due) < new Date(); } catch { return false; }
  };
  const isParado = (c: CardView) => (c.moved_days_ago ?? 0) > 7;

  const match = (c: CardView) => {
    if (q && !c.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (fPrio !== "todas" && c.priority !== fPrio) return false;
    if (fEstado === "atrasados" && !isAtrasado(c)) return false;
    if (fEstado === "parados" && !isParado(c)) return false;
    return true;
  };

  const atrasados = boardCards.filter(isAtrasado).length;
  const parados = boardCards.filter(isParado).length;

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <button className="back-link" type="button" onClick={onBack}>← Quadros</button>
          <h1 className="ph-title" style={{ marginTop: 8 }}>{board.name}</h1>
          <p className="ph-sub">{board.description || "Quadro de tarefas da operação."}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-search">
          <span className="si">⌕</span>
          <input placeholder="Buscar card..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">
          {([["todos", "Todos"], ["atrasados", `Atrasados${atrasados ? ` ${atrasados}` : ""}`], ["parados", `Parados${parados ? ` ${parados}` : ""}`]] as [string, string][]).map(([k, l]) => (
            <button key={k} type="button" className={fEstado === k ? "on" : ""} onClick={() => setFEstado(k)}>{l}</button>
          ))}
        </div>
        <div className="seg">
          {([["todas", "Prioridade"], ["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]] as [string, string][]).map(([k, l]) => (
            <button key={k} type="button" className={fPrio === k ? "on" : ""} onClick={() => setFPrio(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="kb-board">
        {columns.map((col) => {
          const colCards = boardCards.filter((c) => c.column_id === col.id && match(c));
          return (
            <div key={col.id} className={`kb-col${drag ? " drop" : ""}`}
              onDragOver={(e) => { if (drag) e.preventDefault(); }}
              onDrop={() => { if (drag) { onMoveCard(drag, col.id); setDrag(null); } }}>
              <div className="kb-col-head">
                <span className="kb-col-name">{col.name}</span>
                <span className="kb-col-count">{colCards.length}</span>
              </div>
              <div className="kb-col-body">
                {colCards.map((c) => (
                  <KbCard key={c.id} card={c} peopleById={peopleById}
                    atrasado={isAtrasado(c)} parado={isParado(c)}
                    onOpen={() => setOpenCard(c)}
                    onDragStart={() => setDrag(c.id)}
                    onDragEnd={() => setDrag(null)} />
                ))}
                <button className="kb-add" type="button" onClick={() => setNovoCol(col.id)}>+ Card</button>
              </div>
            </div>
          );
        })}
      </div>

      {openCard && (
        <CardDrawer
          card={openCard}
          board={board}
          columns={columns}
          people={people}
          church={church}
          onClose={() => setOpenCard(null)}
          onMoveParent={(cardId, colId) => { onMoveCard(cardId, colId); setOpenCard((prev) => prev ? { ...prev, column_id: colId } : null); }}
          onRefresh={onRefresh}
        />
      )}
      {novoCol && church && (
        <NovoCard board={board} colId={novoCol} people={people} church={church} onClose={() => setNovoCol(null)} onRefresh={onRefresh} />
      )}
    </div>
  );
}

function Quadros({
  boards,
  cards,
  ministries,
  people,
  church,
  setModal,
}: {
  boards: BoardView[];
  cards: CardView[];
  ministries: MinistryView[];
  people: PersonView[];
  church: ChurchView | undefined;
  setModal: (modal: ModalState) => void;
}) {
  const router = useRouter();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<CardView[]>(cards);

  useEffect(() => { setLocalCards(cards); }, [cards]);

  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const peopleById = new Map(people.map((p) => [p.id, p]));

  const moverCard = async (cardId: string, colId: string) => {
    setLocalCards((prev) => prev.map((c) => c.id === cardId ? { ...c, column_id: colId } : c));
    await createServiceBrowserClient().schema("service").from("cards").update({ column_id: colId }).eq("id", cardId);
    router.refresh();
  };

  const selected = boards.find((b) => b.id === boardId);

  if (selected) {
    return (
      <BoardView
        board={selected}
        boardCards={localCards.filter((c) => c.board_id === selected.id)}
        people={people}
        peopleById={peopleById}
        church={church}
        onBack={() => setBoardId(null)}
        onMoveCard={moverCard}
        onRefresh={() => router.refresh()}
      />
    );
  }

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Operação</div>
          <h1 className="ph-title">Quadros de <em>tarefas</em></h1>
          <p className="ph-sub">Um quadro por time ou da Direção. Cada tarefa é um card com responsável, prazo e status.</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo quadro", subtitle: "Um quadro de tarefas para organizar o trabalho de um time ou da liderança.", saveLabel: "Criar quadro", formFields: [{ k:"nome", label:"Nome do quadro", type:"text", req:true, ph:"ex: Louvor · Julho" }, { k:"time", label:"Time dono", type:"text", half:true, ph:"ex: Louvor (ou deixe em branco para geral)" }, { k:"desc", label:"Descrição", type:"text", half:true, ph:"Para que serve" }], action: { kind: "board" } })}>+ Novo quadro</button>
        </div>
      </div>
      <div className="kb-explain">
        <span className="kb-explain-ic"><Icon name="reunioes" size={18} /></span>
        <div>
          <div className="kb-explain-t">De onde vêm os cards</div>
          <div className="kb-explain-s">Toda responsabilidade definida numa reunião pode virar um card aqui, com responsável e prazo já preenchidos.</div>
        </div>
      </div>
      <div className="bd-grid">
        {boards.map((board) => {
          const ministry = board.ministry_id ? ministryById.get(board.ministry_id) : null;
          const boardCards = localCards.filter((c) => c.board_id === board.id);
          const doneCol = board.columns.find((col) => (col.nome ?? col.name ?? col.id).toLowerCase().includes("conclu") || col.id === "done");
          const feitos = doneCol ? boardCards.filter((c) => c.column_id === doneCol.id).length : 0;
          const pct = boardCards.length ? Math.round((feitos / boardCards.length) * 100) : 0;
          return (
            <button className="bd-card" key={board.id} type="button" onClick={() => setBoardId(board.id)}>
              <div className="bd-card-top">
                <div className="bd-mark"><Icon name="times" size={18} /></div>
              </div>
              <div className="bd-name">{board.name}</div>
              <div className="bd-desc">{board.description || ministry?.description || "Quadro da operação."}</div>
              <div className="bd-foot">
                <span className="team-stat"><b>{boardCards.length}</b> cards · <b>{feitos}</b> feitos</span>
              </div>
              <div className="bar" style={{ marginTop: 10 }}>
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
        {boards.length === 0 && <div className="empty">Nenhum quadro criado ainda.</div>}
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
      <PageHead title="Conversas" eyebrow="Operação" subtitle="Canais por time, grupos e mensagens diretas da equipe. Conversas são privadas para os envolvidos." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Nova conversa", subtitle: "Fale com alguém em particular ou crie um grupo.", saveLabel: "Criar conversa", formFields: [{ k:"nome", label:"Nome do grupo / conversa", type:"text", req:true, ph:"ex: Louvor, Liderança" }, { k:"participantes", label:"Participante (nome)", type:"text", ph:"Quem entra na conversa" }, { k:"msg", label:"Primeira mensagem (opcional)", type:"text", ph:"..." }], action: { kind: "chat" } })}>+ Nova conversa</button>} />
      <div className="chat-layout">
        <div className="chat-list">{chats.map((item) => <button className={`chat-row ${item.id === selected ? "on" : ""}`} type="button" key={item.id} onClick={() => setSelected(item.id)}><span className="chat-row-ic"><Icon name={item.kind === "time" ? "times" : "membros"} size={16} /></span><span className="chat-row-main"><span className="chat-row-top"><b>{chatName(item)}</b><small>agora</small></span><span className="chat-row-prev">{messages.find((message) => message.chat_id === item.id)?.body || "Canal de alinhamento"}</span></span><span className="chat-row-count">{chatCount(item.id)}</span></button>)}</div>
        <div className="chat-main"><div className="chat-head"><span className="chat-head-ic"><Icon name={chat?.kind === "time" ? "times" : "membros"} size={16} /></span><div><div className="chat-head-name">{chat ? chatName(chat) : "Nenhuma conversa"}</div><div className="chat-head-sub">{chat?.kind === "time" ? "Canal do time" : "Grupo"} · {chat ? chatCount(chat.id) : 0} pessoas</div></div></div><div className="chat-thread"><div className="chat-msgs">{selectedMessages.map((message) => { const sender = message.sender_id ? memberById.get(message.sender_id) : null; return <div className="chat-msg" key={message.id}>{sender ? <Av name={sender.name} size="xs" /> : null}<div className="chat-bubble-wrap"><div className="chat-bubble">{message.body}</div><div className="chat-when">{new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>; })}{chat && selectedMessages.length === 0 ? <div className="empty">Nenhuma mensagem nesta conversa.</div> : null}</div><div className="chat-compose"><input className="input" placeholder="Escreva uma mensagem..." /><button className="btn btn-pri btn-sm" type="button" onClick={() => chat ? setModal({ eyebrow: "Enviar", title: chatName(chat), subtitle: "Enviar mensagem nesta conversa.", saveLabel: "Enviar", formFields: [{ k:"msg", label:"Mensagem", type:"area", req:true, ph:"Escreva sua mensagem..." }], action: { kind: "message", chatId: chat.id } }) : undefined}>Enviar</button></div></div></div>
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
  visitors,
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
  visitors: VisitorView[];
  confirmationRate: number;
  setRoute: (route: keyof typeof ROUTES) => void;
}) {
  const saudavel = people.filter((p) => p.status === "ativo" && (p.engagement ?? 0) >= 70);
  const atencao = people.filter((p) => p.status === "ativo" && (p.engagement ?? 0) < 70);
  const sobrecarga = people.filter((p) => p.status === "ativo" && (p.engagement ?? 0) >= 90);
  const afastando = people.filter((p) => p.status === "pausa");
  const wellRows = [
    ...atencao.map((p) => ({ person: p, cls: "atencao", tag: "Atenção" })),
    ...afastando.map((p) => ({ person: p, cls: "afastando", tag: "Afastando" })),
  ];
  const series = [members.length - 5, members.length - 3, members.length - 2, members.length].map((v) => Math.max(0, v));
  const maxMinistry = Math.max(...ministries.map((m) => m.people.length), 1);
  const FUNNEL_STAGES: { id: VisitorView["stage"]; label: string }[] = [
    { id: "novo", label: "Novo" },
    { id: "contato", label: "Em contato" },
    { id: "integrando", label: "Integrando" },
    { id: "membro", label: "Virou membro" },
  ];
  const funnelCounts = FUNNEL_STAGES.map((s) => visitors.filter((v) => v.stage === s.id).length);
  const funnelMax = Math.max(...funnelCounts, 1);
  return (
    <div className="content wide">
      <PageHead title="Relatórios & indicadores" eyebrow="Gestão" subtitle="A saúde da igreja num lugar: crescimento, integração, cobertura de escala e o bem-estar de quem serve." action={<><button className="btn btn-sec" type="button"><Icon name="cultos" size={14} /> Trimestre</button><button className="btn btn-pri" type="button">Baixar relatório →</button></>} />
      <div className="kpi-row"><Kpi icon="membros" label="Membros na rede" value={members.length} foot="cadastrados" /><Kpi icon="visitante" label="Visitantes ativos" value={visitors.length} foot="em acompanhamento" /><Kpi icon="escalas" label="Cobertura de escala" value={`${confirmationRate}%`} foot="das posições preenchidas" /><Kpi icon="cultos" label="Cultos na agenda" value={events.length} foot="programação ativa" /></div>
      <div className="dash-3col">
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={13} /> Crescimento de membros</span><span className="panel-meta">últimos meses</span></div><div className="panel-body"><div style={{ fontSize: 30, fontWeight: 700 }}>{members.length}<span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>membros no total</span></div><div style={{ marginTop: 14 }}><Bars series={series} labels={["mar", "abr", "mai", "jun"]} /></div></div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="visitante" size={13} /> Funil de visitantes</span><button className="panel-link" type="button" onClick={() => setRoute("visitantes")}>Abrir</button></div><div className="panel-body flush">{FUNNEL_STAGES.map((s, i) => <div className="dist-row" key={s.id}><span className="dist-name" style={{ width: 140 }}>{s.label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${Math.max(4, (funnelCounts[i] / funnelMax) * 100)}%` }} /></div><span className="dist-num">{funnelCounts[i]}</span></div>)}</div></div>
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">02</span><span className="label">Termômetro de bem-estar</span><span className="line" /></div>
      <div className="well-sum">{[["saudavel", saudavel.length, "Saudável"], ["atencao", atencao.length, "Atenção"], ["sobrecarga", sobrecarga.length, "Sobrecarga"], ["afastando", afastando.length, "Afastando"]].map(([level, count, label]) => <div className="well-pill" key={level}><div className="n">{count}</div><div className="l"><span className={`well-dot ${level}`} />{label}</div></div>)}</div>
      <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={13} /> Quem precisa de atenção</span><button className="panel-link" type="button" onClick={() => setRoute("pessoas")}>Voluntários</button></div><div className="panel-body flush">{(wellRows.length ? wellRows : people.slice(0, 8).map((p) => ({ person: p, cls: "atencao", tag: "Atenção" }))).slice(0, 8).map(({ person, cls, tag }) => <div className="well-row" key={person.id}><Av name={person.name} size="md" /><div className="mini-main"><div className="mini-title">{person.name}</div><div className="mini-sub">{person.status !== "ativo" ? "Em pausa ou férias." : "Engajamento abaixo da média."}</div></div><div className="well-meter"><div className="well-track"><div className={`well-fill ${cls}`} style={{ width: `${person.engagement ?? 50}%` }} /></div><div className={`well-tag ${cls}`}>{tag}</div></div></div>)}</div></div>
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

const CFG_TABS = [
  { id: "igreja", label: "Igreja" },
  { id: "min", label: "Ministérios & funções" },
  { id: "operacao", label: "Escala & presença" },
  { id: "grupos", label: "Grupos & Células" },
  { id: "perm", label: "Permissões" },
  { id: "visual", label: "Personalização" },
  { id: "rede", label: "Congregações" },
];

const ACCENTS = [
  { id: "olive", nome: "Oliva", hex: "#7ea850" },
  { id: "wheat", nome: "Trigo", hex: "#c9a85c" },
  { id: "clay", nome: "Argila", hex: "#b87059" },
  { id: "amber", nome: "Âmbar", hex: "#d4923e" },
];

/* ── Papéis & permissões · 4 níveis (Master, Pastor, Líder, Voluntário) ── */
const ACOES_V2 = [
  { id: "painel", nome: "Painel & relatórios", grupo: "Visão" },
  { id: "membros", nome: "Membros", grupo: "Pessoas" },
  { id: "voluntarios", nome: "Voluntários", grupo: "Pessoas" },
  { id: "times", nome: "Times & ministérios", grupo: "Pessoas" },
  { id: "visitantes", nome: "Visitantes", grupo: "Pessoas" },
  { id: "decisoes", nome: "Decisões", grupo: "Jornada" },
  { id: "batismos", nome: "Batismos", grupo: "Jornada" },
  { id: "cursos", nome: "Cursos & trilhas", grupo: "Jornada" },
  { id: "escala", nome: "Escalas", grupo: "Operação" },
  { id: "cultos", nome: "Cultos & eventos", grupo: "Operação" },
  { id: "comunica", nome: "Comunicação & push", grupo: "Operação" },
  { id: "identidade", nome: "Identidade & ciclos", grupo: "Igreja" },
  { id: "historia", nome: "Nossa história", grupo: "Igreja" },
  { id: "igreja", nome: "Dados da igreja", grupo: "Gestão" },
  { id: "permissoes", nome: "Papéis & permissões", grupo: "Gestão" },
  { id: "rede", nome: "Rede (multi-igreja)", grupo: "Gestão" },
] as const;

const PAPEIS_V2 = [
  { id: "master", nome: "Pastor Master", desc: "Controle total da rede", ic: "◆" },
  { id: "pastor", nome: "Pastor", desc: "Sua congregação inteira", ic: "◆" },
  { id: "lider", nome: "Líder", desc: "Seu ministério e GC", ic: "◇" },
  { id: "vol", nome: "Voluntário", desc: "App: escala, jornada, cursos", ic: "→" },
] as const;

type PapelV2 = (typeof PAPEIS_V2)[number]["id"];
type MatrizV2 = Record<PapelV2, Record<string, boolean>>;

function matrizV2Padrao(): MatrizV2 {
  const allTrue = () => Object.fromEntries(ACOES_V2.map((a) => [a.id, true]));
  const allFalse = () => Object.fromEntries(ACOES_V2.map((a) => [a.id, false]));
  return {
    master: allTrue(),
    pastor: { ...allTrue(), permissoes: true, rede: false },
    lider: { ...allFalse(), painel: true, voluntarios: true, times: true, decisoes: true, escala: true, cultos: true, comunica: true },
    vol: allFalse(),
  };
}

function MinisterioEditModal({ ministry, onClose, onRefresh }: {
  ministry: MinistryView;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [nome, setNome] = useState(ministry.name);
  const [desc, setDesc] = useState(ministry.description);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    await createServiceBrowserClient()
      .schema("service")
      .from("ministries")
      .update({ name: nome.trim(), description: desc.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", ministry.id);
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Editar ministério</div>
          <div className="modal-title">{ministry.name}</div>
          <div className="modal-sub">Nome e descrição. Para funções, use o painel de Ministérios.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field"><label className="field-label">Nome</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field"><label className="field-label">Descrição</label><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="field">
            <label className="field-label">Funções</label>
            <div className="cell-tags">
              {ministry.positions.map((p) => <span key={p.id} className="tag">{p.name}</span>)}
              {ministry.positions.length === 0 && <span style={{ fontSize: 12, color: "var(--subtle)" }}>Nenhuma função cadastrada.</span>}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function Config({
  church,
  churches,
  ministries,
  people: _people,
  theme,
  setTheme,
  ministerialTitles,
  fellowshipGroups,
  tags,
  setModal,
}: {
  church?: ChurchView;
  churches: ChurchView[];
  ministries: MinistryView[];
  people: PersonView[];
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  ministerialTitles: MinisterialTitleView[];
  fellowshipGroups: FellowshipGroupView[];
  tags: TagView[];
  setModal: (modal: ModalState) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("igreja");

  const [igrejaForm, setIgrejaForm] = useState({
    nome: church?.nome ?? "",
    cidade: church?.cidade ?? "",
    doc: church?.doc ?? "",
    fundada: church?.foundedYear ?? "",
    endereco: church?.address ?? "",
    cep: church?.postalCode ?? "",
    email: church?.email ?? "",
    tel: church?.phone ?? "",
  });
  const [igrejaLoading, setIgrejaLoading] = useState(false);
  const [igrejaMsg, setIgrejaMsg] = useState("");

  const saveIgreja = async () => {
    if (!church?.id) return;
    setIgrejaLoading(true);
    await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({
        name: igrejaForm.nome.trim() || church.nome,
        city: igrejaForm.cidade.trim() || null,
        doc: igrejaForm.doc.trim() || null,
        founded_year: igrejaForm.fundada.trim() || null,
        address: igrejaForm.endereco.trim() || null,
        postal_code: igrejaForm.cep.trim() || null,
        email: igrejaForm.email.trim() || null,
        phone: igrejaForm.tel.trim() || null,
      })
      .eq("id", church.id);
    setIgrejaMsg("Salvo!");
    setIgrejaLoading(false);
    router.refresh();
    setTimeout(() => setIgrejaMsg(""), 2000);
  };

  async function removeRow(table: string, id: string) {
    if (!window.confirm("Remover este registro?")) return;
    await createServiceBrowserClient().schema("service").from(table).delete().eq("id", id);
    router.refresh();
  }

  const [editMin, setEditMin] = useState<MinistryView | null>(null);

  const [escalaCfg, setEscalaCfg] = useState<Record<string, unknown>>(() => {
    try {
      const s = localStorage.getItem("cex_escala_cfg");
      return s ? (JSON.parse(s) as Record<string, unknown>) : { modo: "assistido", maxPorMes: 4, folgaSemanas: 0, considerarFerias: true };
    } catch { return { modo: "assistido", maxPorMes: 4, folgaSemanas: 0, considerarFerias: true }; }
  });
  const setEscala = (k: string, v: unknown) => {
    setEscalaCfg((prev) => {
      const next = { ...prev, [k]: v };
      try { localStorage.setItem("cex_escala_cfg", JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  const [accent, setAccent] = useState<string>(() => {
    try { return localStorage.getItem("cex_accent") ?? "olive"; } catch { return "olive"; }
  });
  const applyAccent = (id: string) => {
    setAccent(id);
    try { localStorage.setItem("cex_accent", id); } catch { /* noop */ }
  };

  const [matriz, setMatriz] = useState<MatrizV2>(() => {
    try {
      const saved = localStorage.getItem("cex_matriz_v2");
      return saved ? (JSON.parse(saved) as MatrizV2) : matrizV2Padrao();
    } catch { return matrizV2Padrao(); }
  });
  const [matrizMsg, setMatrizMsg] = useState("");
  const toggleMx = (papel: PapelV2, acao: string) => {
    if (papel === "master") return;
    setMatriz((prev) => ({ ...prev, [papel]: { ...prev[papel], [acao]: !prev[papel][acao] } }));
  };
  const salvarMatriz = () => {
    try { localStorage.setItem("cex_matriz_v2", JSON.stringify(matriz)); } catch { /* noop */ }
    setMatrizMsg("Permissões salvas.");
    setTimeout(() => setMatrizMsg(""), 2000);
  };
  const gruposAcoes = Array.from(new Set(ACOES_V2.map((a) => a.grupo)));

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Gestão</div>
          <h1 className="ph-title">Configurações</h1>
          <p className="ph-sub">Os dados da igreja, escalas, o visual do app e as congregações da rede.</p>
        </div>
      </div>

      <div className="cfg-tabs">
        {CFG_TABS.map((t) => (
          <button key={t.id} type="button" className={`cfg-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ─── IGREJA ─── */}
      {tab === "igreja" && (
        <div className="cfg-grid2">
          <div className="cfg-card">
            <div className="cfg-card-t">Identificação</div>
            <div className="cfg-card-s">Como sua igreja aparece no app e nos comunicados.</div>
            <div className="field">
              <label className="field-label">Nome da igreja</label>
              <input className="input" value={igrejaForm.nome} onChange={(e) => setIgrejaForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field"><label className="field-label">CNPJ</label><input className="input" value={igrejaForm.doc} onChange={(e) => setIgrejaForm((p) => ({ ...p, doc: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Fundada em</label><input className="input" value={igrejaForm.fundada} onChange={(e) => setIgrejaForm((p) => ({ ...p, fundada: e.target.value }))} /></div>
            </div>
            <button className="btn btn-pri btn-sm" type="button" disabled={igrejaLoading} onClick={saveIgreja}>
              {igrejaLoading ? "Salvando…" : igrejaMsg || "Salvar"}
            </button>
          </div>
          <div className="cfg-card">
            <div className="cfg-card-t">Endereço & contato</div>
            <div className="cfg-card-s">Onde a igreja se reúne e como falar com a secretaria.</div>
            <div className="field"><label className="field-label">Endereço</label><input className="input" value={igrejaForm.endereco} onChange={(e) => setIgrejaForm((p) => ({ ...p, endereco: e.target.value }))} /></div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field"><label className="field-label">Cidade</label><input className="input" value={igrejaForm.cidade} onChange={(e) => setIgrejaForm((p) => ({ ...p, cidade: e.target.value }))} /></div>
              <div className="field"><label className="field-label">CEP</label><input className="input" value={igrejaForm.cep} onChange={(e) => setIgrejaForm((p) => ({ ...p, cep: e.target.value }))} /></div>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field"><label className="field-label">E-mail</label><input className="input" value={igrejaForm.email} onChange={(e) => setIgrejaForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Telefone</label><input className="input" value={igrejaForm.tel} onChange={(e) => setIgrejaForm((p) => ({ ...p, tel: e.target.value }))} /></div>
            </div>
            <button className="btn btn-pri btn-sm" type="button" disabled={igrejaLoading} onClick={saveIgreja}>
              {igrejaLoading ? "Salvando…" : igrejaMsg || "Salvar"}
            </button>
          </div>
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">Sobre a unidade</div>
            <div className="cfg-card-s">Informações estruturais desta congregação.</div>
            <dl className="kv" style={{ marginTop: 0 }}>
              <dt>Tipo</dt>
              <dd>{church?.matriz ? <span className="chip chip-ok">Matriz</span> : <span className="tag">Congregação</span>}</dd>
              <dt>ID da org.</dt>
              <dd><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{(church?.organizationId ?? "—").slice(0, 8)}…</span></dd>
              <dt>Voluntários</dt>
              <dd>{_people.length}</dd>
            </dl>
          </div>
        </div>
      )}

      {/* ─── MINISTÉRIOS & FUNÇÕES ─── */}
      {tab === "min" && (
        <div className="cfg-card">
          <div className="cfg-card-t">Ministérios & funções</div>
          <div className="cfg-card-s">Cada ministério tem um líder e suas funções. As funções alimentam a escala e as habilidades de cada voluntário.</div>
          {ministries.map((m) => {
            const leader = m.people.find((p) => p.isLeader);
            return (
              <div className="cfg-row" key={m.id}>
                <div className="bd-mark"><Icon name={m.icon || "times"} size={18} /></div>
                <div className="cfg-row-main">
                  <div className="cfg-row-t">
                    {m.name}
                    {leader && <span style={{ color: "var(--subtle)", fontWeight: 400, fontSize: 12 }}> · líder {leader.personName.split(" ")[0]}</span>}
                  </div>
                  <div className="cell-tags" style={{ marginTop: 7 }}>
                    {m.positions.map((p) => <span key={p.id} className="tag">{p.name}</span>)}
                    {m.positions.length === 0 && <span style={{ fontSize: 12, color: "var(--subtle)" }}>Sem funções</span>}
                  </div>
                </div>
                <button className="btn btn-sec btn-sm" type="button" onClick={() => setEditMin(m)}>Editar</button>
              </div>
            );
          })}
          {ministries.length === 0 && <div className="empty">Nenhum ministério ainda.</div>}
        </div>
      )}

      {tab === "min" && (
        <div className="cfg-card" style={{ marginTop: 16 }}>
          <div className="cfg-card-t">Papéis ministeriais</div>
          <div className="cfg-card-s">Os títulos que a sua igreja reconhece (Pastor, Diácono, Presbítero...). Atribuídos aos membros na ficha de cada um.</div>
          <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
            {ministerialTitles.map((t) => (
              <span key={t.id} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t.name}
                <button type="button" onClick={() => removeRow("ministerial_titles", t.id)} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: 12, padding: 0, cursor: "pointer" }}>✕</button>
              </span>
            ))}
            {ministerialTitles.length === 0 && <span style={{ fontSize: 12.5, color: "var(--subtle)" }}>Nenhum papel cadastrado.</span>}
          </div>
          <button className="btn btn-sec btn-sm" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo papel ministerial", subtitle: "ex: Pastor, Diácono, Presbítero.", saveLabel: "Adicionar papel", formFields: [{ k:"nome", label:"Nome do papel", type:"text", req:true, ph:"ex: Diácono" }], action: { kind: "title" } })}>+ Papel ministerial</button>
        </div>
      )}

      {tab === "min" && (
        <div className="cfg-card" style={{ marginTop: 16 }}>
          <div className="cfg-card-t">Frentes / tags</div>
          <div className="cfg-card-s">Etiquetas livres como Jovens, Kids ou Casais. Uma pessoa pode ter várias — servem para montar o elenco de uma frente sem depender do time (ministério).</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "4px 0 14px" }}>
            {tags.map((t) => (
              <div className="cfg-row" key={t.id}>
                <div className="cong-mark" style={{ background: "var(--ink)" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: `var(--${t.color})`, display: "inline-block" }} /></div>
                <div className="cfg-row-main"><div className="cfg-row-t">{t.name}</div></div>
                <button className="btn btn-sec btn-sm" type="button" onClick={() => removeRow("tags", t.id)}>Remover</button>
              </div>
            ))}
            {tags.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhuma frente cadastrada.</div>}
          </div>
          <button className="btn btn-sec btn-sm" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Nova frente / tag", subtitle: "Etiqueta livre para agrupar voluntários (ex: Jovens, Casais).", saveLabel: "Criar frente", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: Jovens" }, { k:"cor", label:"Cor", type:"select", options:[{v:"olive",l:"Oliva"},{v:"wheat",l:"Trigo"},{v:"clay",l:"Argila"},{v:"terra",l:"Terracota"},{v:"sand",l:"Areia"},{v:"amber",l:"Âmbar"},{v:"rust",l:"Ferrugem"}] }], action: { kind: "tag" } })}>+ Frente</button>
        </div>
      )}

      {/* ─── GRUPOS & CÉLULAS ─── */}
      {tab === "grupos" && (
        <div className="cfg-card">
          <div className="cfg-card-t">Grupos de Comunhão · {fellowshipGroups.length}</div>
          <div className="cfg-card-s">Células, GCs, pequenos grupos... a estrutura de comunhão em casas. Cada grupo tem um líder, um dia e um bairro.</div>
          {fellowshipGroups.map((g) => {
            const leader = _people.find((p) => p.id === g.leader_person_id);
            return (
              <div className="cfg-row" key={g.id}>
                <div className="cong-mark"><Icon name="identidade" size={16} /></div>
                <div className="cfg-row-main">
                  <div className="cfg-row-t">{g.name}</div>
                  <div className="cfg-row-s">{[g.weekday, g.time, g.neighborhood].filter(Boolean).join(" · ") || "sem dia/local definido"}{leader ? ` · líder ${leader.name.split(" ")[0]}` : ""}</div>
                </div>
                <button className="btn btn-sec btn-sm" type="button" onClick={() => removeRow("fellowship_groups", g.id)}>Remover</button>
              </div>
            );
          })}
          {fellowshipGroups.length === 0 && <div className="empty" style={{ padding: "20px 0" }}>Nenhum grupo cadastrado ainda.</div>}
          <button className="btn btn-pri btn-sm" type="button" style={{ marginTop: 18 }} onClick={() => setModal({ eyebrow: "Criar", title: "Novo Grupo de Comunhão", subtitle: "Nome, líder, dia, horário e bairro do grupo.", saveLabel: "Criar grupo", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: GC Centro" }, { k:"lider", label:"Líder", type:"select", half:true, ph:"A definir", options: _people.map((p) => ({ v: p.name, l: p.name })) }, { k:"dia", label:"Dia", type:"text", half:true, ph:"ex: Quarta-feira" }, { k:"hora", label:"Horário", type:"text", half:true, ph:"ex: 20h" }, { k:"bairro", label:"Bairro", type:"text", half:true, ph:"ex: Centro" }], action: { kind: "group" } })}>+ Novo grupo</button>
        </div>
      )}

      {/* ─── ESCALA & PRESENÇA ─── */}
      {tab === "operacao" && (
        <>
          <div className="cfg-card">
            <div className="cfg-card-t">Regras de escala</div>
            <div className="cfg-card-s">Como a escala é gerada e os limites para não sobrecarregar ninguém. Estas preferências ficam salvas neste navegador.</div>
            <div className="field" style={{ marginTop: 4 }}>
              <label className="field-label">Geração</label>
              <div className="opt-row" style={{ flexWrap: "wrap" }}>
                {([["manual", "Manual", "O líder monta tudo na mão."], ["assistido", "Assistida", "O sistema sugere; o líder confirma cada nome."], ["automatico", "Automática", "O sistema gera e já confirma, sem ação."]] as [string, string, string][]).map(([k, t, s]) => (
                  <button key={k} type="button" className={`opt${escalaCfg.modo === k ? " on" : ""}`} onClick={() => setEscala("modo", k)}>
                    <div className="opt-t">{t}</div>
                    <div className="opt-s">{s}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Máximo de vezes por mês</div>
                <div className="cfg-row-s">teto para não sobrecarregar a mesma pessoa</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setEscala("maxPorMes", Math.max(1, (escalaCfg.maxPorMes as number) - 1))}>−</button>
                <span>{escalaCfg.maxPorMes as number}×</span>
                <button type="button" onClick={() => setEscala("maxPorMes", (escalaCfg.maxPorMes as number) + 1)}>+</button>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Semanas de folga após servir</div>
                <div className="cfg-row-s">descanso sugerido entre escalas (0 = sem folga)</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setEscala("folgaSemanas", Math.max(0, (escalaCfg.folgaSemanas as number) - 1))}>−</button>
                <span>{escalaCfg.folgaSemanas as number}</span>
                <button type="button" onClick={() => setEscala("folgaSemanas", (escalaCfg.folgaSemanas as number) + 1)}>+</button>
              </div>
            </div>
            <div className="cfg-row" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Respeitar período de férias</div>
                <div className="cfg-row-s">{escalaCfg.considerarFerias ? "Quem está de férias fica fora da geração" : "Férias não bloqueiam a escala"}</div>
              </div>
              <button type="button" className={`sw${escalaCfg.considerarFerias ? " on" : ""}`} onClick={() => setEscala("considerarFerias", !escalaCfg.considerarFerias)} />
            </div>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">Status dos voluntários</div>
            <div className="cfg-card-s">O status é calculado automaticamente com base na frequência nas escalas.</div>
            <div className="crit-legend" style={{ marginTop: 0 }}>
              <span><i className="dot ok" /> Ativo — presente nas escalas</span>
              <span><i className="dot warn" /> Inativando — com ausências</span>
              <span><i className="dot off" /> Inativo — afastado</span>
            </div>
          </div>
        </>
      )}

      {/* ─── PERMISSÕES ─── */}
      {tab === "perm" && (
        <div className="cfg-card">
          <div className="cfg-card-t">Papéis & permissões</div>
          <div className="cfg-card-s">Cada funcionalidade do app aparece aqui. Toque para liberar ou bloquear por papel. O Master sempre tem acesso total.</div>
          <table className="pmx">
            <thead>
              <tr>
                <th className="pmx-fn">Funcionalidade</th>
                {PAPEIS_V2.map((pp) => <th key={pp.id} className="pmx-role"><span style={{ color: "var(--olive)" }}>{pp.ic}</span> {pp.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {gruposAcoes.map((grupo) => (
                <Fragment key={`g-${grupo}`}>
                  <tr className="pmx-group"><td colSpan={PAPEIS_V2.length + 1}>{grupo}</td></tr>
                  {ACOES_V2.filter((a) => a.grupo === grupo).map((a) => (
                    <tr key={a.id}>
                      <td className="pmx-fn">{a.nome}</td>
                      {PAPEIS_V2.map((pp) => {
                        const locked = pp.id === "master";
                        const on = matriz[pp.id][a.id];
                        return (
                          <td key={pp.id}>
                            <button type="button" className={`mx-cell${on ? " on" : " off"}${locked ? " lock" : ""}`} onClick={() => toggleMx(pp.id, a.id)} title={locked ? "O Master sempre tem acesso total" : ""}>{on ? "✓" : "·"}</button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button className="btn btn-pri btn-sm" type="button" onClick={salvarMatriz}>{matrizMsg || "Salvar permissões"}</button>
          </div>
        </div>
      )}

      {/* ─── PERSONALIZAÇÃO ─── */}
      {tab === "visual" && (
        <div className="cfg-grid2">
          <div className="cfg-card">
            <div className="cfg-card-t">Tema da interface</div>
            <div className="cfg-card-s">Modo escuro (padrão CE.X) ou modo claro em papel cream para quem prefere telas claras.</div>
            <div className="opt-row">
              <button type="button" className={`opt${theme === "dark" ? " on" : ""}`} onClick={() => setTheme("dark")}>
                <div className="opt-t">◑ Escuro</div>
                <div className="opt-s">Ink profundo · padrão</div>
              </button>
              <button type="button" className={`opt${theme === "light" ? " on" : ""}`} onClick={() => setTheme("light")}>
                <div className="opt-t">◐ Claro</div>
                <div className="opt-s">Papel cream CE.X</div>
              </button>
            </div>
          </div>
          <div className="cfg-card">
            <div className="cfg-card-t">Cor de destaque</div>
            <div className="cfg-card-s">A oliva é a cor da marca. As alternativas vêm todas da paleta quente CE.X.</div>
            <div className="swatch-row">
              {ACCENTS.map((a) => (
                <button key={a.id} type="button" className={`swatch${accent === a.id ? " on" : ""}`} style={{ background: a.hex, color: a.hex }} title={a.nome} onClick={() => applyAccent(a.id)} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 14 }}>
              Selecionado: <em style={{ color: "var(--olive)", fontStyle: "normal" }}>{ACCENTS.find((a) => a.id === accent)?.nome ?? "Oliva"}</em>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONGREGAÇÕES ─── */}
      {tab === "rede" && (
        <div className="cfg-card">
          <div className="cfg-card-t">Sua igreja na rede</div>
          <div className="cfg-card-s">Toda igreja começa pela matriz — a sede cadastrada na contratação. Se houver outras unidades, elas aparecem aqui como congregações; cada uma tem seus times e escalas, e a matriz enxerga tudo.</div>
          {churches.filter((c) => c.matriz).map((c) => (
            <div key={c.id} className="cong-matriz">
              <div className="cong-mark"><Icon name="identidade" size={20} /></div>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{c.nome} <span className="chip chip-ok" style={{ marginLeft: 6 }}>matriz</span></div>
                <div className="cfg-row-s">{c.cidade || "Sede da rede"}</div>
              </div>
            </div>
          ))}
          {churches.filter((c) => !c.matriz).length > 0 && (
            <>
              <div className="cfg-card-t" style={{ marginTop: 26 }}>Outras congregações · {churches.filter((c) => !c.matriz).length}</div>
              {churches.filter((c) => !c.matriz).map((c) => (
                <div className="cfg-row" key={c.id}>
                  <div className="cong-mark"><Icon name="globo" size={16} /></div>
                  <div className="cfg-row-main">
                    <div className="cfg-row-t">{c.nome}</div>
                    <div className="cfg-row-s">{c.cidade || "Cidade não informada"}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {churches.length === 0 && <div className="empty">Nenhuma congregação encontrada.</div>}
        </div>
      )}

      {editMin && (
        <MinisterioEditModal ministry={editMin} onClose={() => setEditMin(null)} onRefresh={() => router.refresh()} />
      )}
    </div>
  );
}

function Identidade({ church, identity, cycle, setModal }: { church?: ChurchView; identity?: ChurchIdentityView | null; cycle?: CycleView; setModal: (modal: ModalState) => void }) {
  const values = identity?.values?.length ? identity.values : [{ title: "Comunidade" }, { title: "Palavra" }, { title: "Missão" }];
  return (
    <div className="content wide">
      <PageHead
        title="Identidade & propósito"
        eyebrow="Nossa igreja"
        subtitle="Missão, visão, valores e tema atual da comunidade. Exibido no app do membro e na vitrine da Igreja."
        action={<button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Editar", title: "Identidade da Igreja", subtitle: "Atualize propósito, missão, visão e valores da Igreja.", saveLabel: "Salvar", formFields: [{ k:"proposito", label:"Propósito", type:"area", ph:identity?.purpose ?? "Por que a Igreja existe..." }, { k:"missao", label:"Missão", type:"area", ph:identity?.mission ?? "A missão da Igreja..." }, { k:"visao", label:"Visão", type:"area", ph:identity?.vision ?? "A visão da Igreja..." }, { k:"versiculo", label:"Versículo", type:"text", half:true, ph:identity?.verse ?? "ex: Mateus 28:19" }, { k:"valores", label:"Valores (separados por vírgula)", type:"text", half:true, ph:values.map((v) => v.title).join(", ") }], action: { kind: "identity" } })}>Editar</button>}
      />
      <div className="ident-hero">
        <div className="ident-hero-label">Declaração de missão</div>
        <div className="ident-hero-text">
          {identity?.mission || (church?.nome ? `${church.nome} existe para fazer discípulos de Jesus Cristo que transformem a cidade.` : "A Igreja existe para fazer discípulos de Jesus Cristo que transformem a cidade.")}
        </div>
        {identity?.verse && <div className="ident-verse">§ {identity.verse}</div>}
      </div>
      <div className="ident-grid">
        <div className="ident-card">
          <div className="ident-card-ic"><Icon name="identidade" size={18} /></div>
          <div className="ident-card-t">Propósito</div>
          <div className="ident-card-x">{identity?.purpose || "Ainda não definido. Toque em Editar para registrar."}</div>
        </div>
        <div className="ident-card">
          <div className="ident-card-ic"><Icon name="painel" size={18} /></div>
          <div className="ident-card-t">Visão</div>
          <div className="ident-card-x">{identity?.vision || "Ainda não definida. Toque em Editar para registrar."}</div>
        </div>
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">02</span><span className="label">Valores</span><span className="line" /></div>
      <div className="val-grid">
        {values.map((v, i) => (
          <div className="val-card" key={v.title + i}>
            <div className="val-ic"><Icon name={["membros", "identidade", "decisoes"][i % 3]} size={14} /></div>
            <div className="val-t">{v.title}</div>
          </div>
        ))}
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">03</span><span className="label">Tema do ciclo atual</span><span className="line" /></div>
      {cycle ? (
        <div className="ciclo">
          <div className="ciclo-banner">
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, var(--olive-deep), #2d3d18)" }} />
            <span className="ciclo-banner-tag">{cycle.year}</span>
          </div>
          <div className="ciclo-body">
            <div className="ciclo-tema">{cycle.theme}</div>
            {cycle.verse && <div className="ciclo-verse">§ {cycle.verse}</div>}
            {cycle.body && <div className="ciclo-text">{cycle.body}</div>}
            {cycle.objectives.length > 0 && (
              <div className="ciclo-obj" style={{ marginTop: 22 }}>
                <div className="ciclo-obj-t">Objetivos do ciclo</div>
                {cycle.objectives.map((obj, i) => (
                  <div className="ciclo-obj-row" key={obj.title}><span className="ciclo-obj-n">0{i + 1}</span>{obj.title}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty">Nenhum ciclo cadastrado ainda.</div>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-sec btn-sm" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo ciclo anual", subtitle: "O tema que guia a Igreja neste período.", saveLabel: "Criar ciclo", formFields: [{ k:"ano", label:"Ano / período", type:"text", half:true, req:true, ph:"ex: 2026 · 1º semestre" }, { k:"tema", label:"Tema", type:"text", half:true, req:true, ph:"ex: Raízes profundas" }, { k:"versiculo", label:"Versículo", type:"text", ph:"ex: Salmos 1:3" }, { k:"desc", label:"Descrição", type:"area", ph:"O que esse tema significa para a Igreja..." }, { k:"objetivos", label:"Objetivos (separados por vírgula)", type:"text", ph:"ex: Leitura bíblica diária, Multiplicar GCs" }], action: { kind: "cycle" } })}>+ Novo ciclo</button>
      </div>
    </div>
  );
}

function Historia({ church: _church, historyEntries, setModal }: { church?: ChurchView; historyEntries: HistoryEntryView[]; setModal: (modal: ModalState) => void }) {
  const marcos = [...historyEntries].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="content wide">
      <PageHead
        title="Nossa história"
        eyebrow="Nossa igreja"
        subtitle="Marcos, momentos e a linha do tempo de como chegamos até aqui. Cada capítulo é uma prova da fidelidade de Deus."
        action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Marco histórico", subtitle: "Registre um momento importante da história da Igreja.", saveLabel: "Adicionar marco", formFields: [{ k:"ano", label:"Ano", type:"text", half:true, ph:"ex: 2023" }, { k:"titulo", label:"Título", type:"text", half:true, ph:"ex: Fundação da Igreja" }, { k:"desc", label:"Descrição", type:"area", ph:"O que aconteceu..." }], action: { kind: "historyEntry" } })}>+ Marco</button>}
      />
      {marcos.length === 0 && <div className="empty">Nenhum marco cadastrado ainda. Adicione o primeiro.</div>}
      <div className="hist">
        {marcos.map((marco, i) => (
          <div key={marco.id} className={`hist-item ${i % 2 === 1 ? "rev" : ""}`}>
            <div className="hist-photo">
              <div style={{ position: "absolute", inset: 0, background: i % 2 === 1 ? "linear-gradient(150deg, var(--olive-deep), #243012)" : "linear-gradient(150deg, #7a6526, #3d3415)" }} />
              <span className="hist-year">{marco.year || "—"}</span>
            </div>
            <div className="hist-text">
              <div className="hist-t">{marco.title}</div>
              <div className="hist-x">{marco.body}</div>
              <div className="hist-foot">
                <button className="hist-edit" type="button" onClick={() => setModal({ eyebrow: "Editar", title: marco.title, subtitle: "Edite este marco da história da Igreja.", saveLabel: "Salvar", formFields: [{ k:"ano", label:"Ano", type:"text", half:true, ph:marco.year ?? "ex: 2023" }, { k:"titulo", label:"Título", type:"text", half:true, ph:marco.title }, { k:"desc", label:"Descrição", type:"area", ph:marco.body ?? "O que aconteceu..." }], action: { kind: "historyEntry", id: marco.id } })}>Editar</button>
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
      <PageHead title={title} eyebrow="Service" subtitle={subtitle} action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: `Criar ${title.toLowerCase()}`, subtitle, formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"Nome" }, { k:"responsavel", label:"Responsável", type:"text", ph:"Responsável" }, { k:"obs", label:"Observações", type:"area", ph:"Observações..." }] })}>+ Criar</button>} />
      <div className="empty"><div className="empty-mark">0</div><h3 className="empty-title">{empty}</h3><p className="empty-desc">Este módulo está pronto para receber os registros do banco.</p></div>
    </div>
  );
}

const JRN_STEPS = [
  { label: "Decisão", kind: "decisao", icon: "decisoes" },
  { label: "Batismo nas águas", kind: "batismo", icon: "batismos" },
  { label: "Fundamentos", kind: "curso", icon: "cursos" },
  { label: "Grupo de comunhão", kind: "integracao", icon: "pessoa" },
  { label: "Servindo", kind: "time", icon: "times" },
];

function PersonTimeline({ member, compact }: { member: MemberView; compact?: boolean }) {
  const done = JRN_STEPS.filter((_, i) => !!member.journey[i]);
  if (!done.length) return <div style={{ fontSize: 13, color: "var(--subtle)", padding: "12px 0" }}>Nenhuma etapa concluída ainda.</div>;
  return (
    <div className={`tl jrn-tl${compact ? " compact" : ""}`}>
      {JRN_STEPS.map((step, i) => {
        if (!member.journey[i]) return null;
        return (
          <div className="tl-item ol tone-olive" key={step.kind}>
            <div className="tl-dot" />
            <div className="tl-when"><span className="jrn-tl-kind"><Icon name={step.icon} size={11} /> {step.label}</span></div>
            <div className="tl-text"><b>{step.label}</b> — etapa concluída</div>
          </div>
        );
      })}
    </div>
  );
}

function DecisaoDrawer({
  decision, people, members, onClose, onOpenMember,
}: {
  decision: DecisionView; people: PersonView[]; members: MemberView[];
  onClose: () => void; onOpenMember: (id: string) => void;
}) {
  const router = useRouter();
  const responsible = decision.responsible_id ? people.find((p) => p.id === decision.responsible_id) : null;
  const linkedMember = decision.member_id ? members.find((m) => m.id === decision.member_id) : null;
  const [loading, setLoading] = useState(false);

  const encaminhar = async () => {
    setLoading(true);
    await createServiceBrowserClient().schema("service").from("decisions").update({ status: "acompanhando" }).eq("id", decision.id);
    router.refresh();
    setLoading(false);
    onClose();
  };

  const DEC_CHIP: Record<string, { label: string; cls: string }> = {
    novo: { label: "A contatar", cls: "chip-wait" },
    acompanhando: { label: "Acompanhando", cls: "chip-ok" },
    encaminhado: { label: "Encaminhado", cls: "chip-neutral" },
  };
  const chip = DEC_CHIP[decision.status] ?? DEC_CHIP.novo;

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
        <div className="profile-top">
          <Av name={decision.name} size="lg" />
          <div>
            <div className="profile-name">{decision.name}</div>
            <div className="profile-role">{decision.kind === "reconciliacao" ? "Reconciliação" : "Decisão"} · {decision.happened_on || "sem data"}{decision.age ? ` · ${decision.age} anos` : ""}</div>
            <div style={{ marginTop: 10 }}><span className={`chip ${chip.cls}`}>{chip.label}</span></div>
          </div>
        </div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Registro da decisão">
          <dl className="kv">
            <dt>Telefone</dt><dd>{decision.phone || "—"}</dd>
            <dt>Culto</dt><dd>{decision.service_name || "—"}</dd>
            <dt>Responsável</dt><dd>{responsible?.name || "a definir"}</dd>
          </dl>
          {decision.notes && (
            <div style={{ marginTop: 14, fontSize: 13.5, color: "var(--light)", lineHeight: 1.6, padding: "14px 16px", background: "var(--ink)", borderRadius: "var(--r-md)", border: "0.5px solid var(--border-2)" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Observação</span>
              {decision.notes}
            </div>
          )}
        </DrawerSection>
        {linkedMember && (
          <DrawerSection title="Jornada do membro">
            <PersonTimeline member={linkedMember} compact />
          </DrawerSection>
        )}
        <DrawerSection title="Próximos passos">
          <div className="step-stack">
            <div className="step-do"><span className="step-ic">→</span> Fazer o primeiro contato (ligar · WhatsApp)</div>
            <div className="step-do"><span className="step-ic">→</span> Iniciar acompanhamento 1-a-1</div>
            <div className="step-do"><span className="step-ic">→</span> Matricular em Novos Convertidos</div>
            <div className="step-do"><span className="step-ic">→</span> Inserir num Grupo de Comunhão</div>
          </div>
        </DrawerSection>
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {linkedMember
            ? <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => { onClose(); onOpenMember(linkedMember.id); }}>Ver ficha do membro →</button>
            : <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={encaminhar} disabled={loading}>{loading ? "Salvando…" : "Encaminhar p/ acompanhamento →"}</button>
          }
        </div>
      </div>
    </DrawerShell>
  );
}

function AddCandidatoModal({
  classData, existingIds, members, church, onClose, onRefresh,
}: {
  classData: BaptismClassView; existingIds: string[]; members: MemberView[];
  church: ChurchView; onClose: () => void; onRefresh: () => void;
}) {
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const available = members.filter((m) => !existingIds.includes(m.id) && (!q || m.name.toLowerCase().includes(q.toLowerCase())));

  const addCandidate = async (memberId: string) => {
    setSaving(memberId);
    await createServiceBrowserClient().schema("service").from("baptism_candidates").insert({ organization_id: church.organizationId, class_id: classData.id, member_id: memberId });
    onRefresh();
    setSaving(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="drawer-bg" onClick={onClose} style={{ zIndex: 1 }} />
      <div className="modal" style={{ position: "relative", zIndex: 2 }}>
        <div className="modal-head">
          <div className="modal-eyebrow">Adicionar candidato</div>
          <div className="modal-title">{classData.label}</div>
          <div className="modal-sub">Escolha quem será batizado nesta turma.</div>
        </div>
        <div className="modal-body" style={{ display: "block", maxHeight: 360, overflowY: "auto" }}>
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si"><Icon name="buscar" size={13} /></span>
            <input placeholder="Buscar membro…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {available.map((m) => (
            <div className="flag-row" key={m.id} style={{ cursor: "pointer" }} onClick={() => addCandidate(m.id)}>
              <Av name={m.name} size="sm" />
              <div className="flag-main">
                <div className="flag-nome">{m.name}</div>
                <div className="flag-meta">{m.neighborhood || "Membro"}</div>
              </div>
              <span className="btn btn-ghost btn-sm">{saving === m.id ? "…" : "Adicionar"}</span>
            </div>
          ))}
          {available.length === 0 && <div style={{ fontSize: 13, color: "var(--subtle)", padding: "16px 0" }}>Nenhum membro disponível.</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-pri" type="button" onClick={onClose}>Concluído</button>
        </div>
      </div>
    </div>
  );
}

function BatismoDrawer({
  classData, candidates, members, decisions, church, onClose, onOpenMember, onRefresh,
}: {
  classData: BaptismClassView; candidates: BaptismCandidateView[]; members: MemberView[];
  decisions: DecisionView[]; church: ChurchView | undefined;
  onClose: () => void; onOpenMember: (id: string) => void; onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const classCandidates = candidates.filter((c) => c.class_id === classData.id);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const decisionById = new Map(decisions.map((d) => [d.id, d]));
  const existingMemberIds = classCandidates.map((c) => c.member_id).filter(Boolean) as string[];
  const st = BAT_ST_MAP[classData.status ?? "aberta"];
  const concluida = classData.status === "concluida";

  const dispararAcao = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 2500);
  };

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
        <div className="profile-top">
          <div className="bat-mark"><Icon name="batismos" size={22} /></div>
          <div>
            <div className="profile-name">{classData.label}</div>
            <div className="profile-role">{classData.baptism_date || "Sem data"} · {classData.location || "Local não informado"}</div>
            <div style={{ marginTop: 10 }}><span className={`chip ${st?.cls ?? "chip-wait"}`}>{st?.label ?? classData.status}</span></div>
          </div>
        </div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Detalhes">
          <dl className="kv">
            <dt>Data</dt><dd>{classData.baptism_date || "—"}</dd>
            <dt>Local</dt><dd>{classData.location || "—"}</dd>
            <dt>Pastor</dt><dd>{classData.pastor || "—"}</dd>
            {classData.notes ? <><dt>Observação</dt><dd>{classData.notes}</dd></> : null}
          </dl>
        </DrawerSection>
        <DrawerSection title={`Candidatos · ${classCandidates.length}`}>
          {classCandidates.map((cand) => {
            const member = cand.member_id ? memberById.get(cand.member_id) : null;
            const decision = cand.decision_id ? decisionById.get(cand.decision_id) : null;
            const name = member?.name ?? decision?.name ?? "Candidato";
            return (
              <div key={cand.id} className="cand" style={member ? { cursor: "pointer" } : {}} onClick={() => member && onOpenMember(member.id)}>
                <Av name={name} size="sm" />
                <div className="cand-main">
                  <div className="cand-name">{name}</div>
                  <div className="cand-meta">{member ? "Membro" : "Nova decisão"}</div>
                </div>
                {member ? <span className="cand-fit good">ver →</span> : <span className="cand-fit busy">decisão</span>}
              </div>
            );
          })}
          {classCandidates.length === 0 && <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhum candidato ainda.</div>}
        </DrawerSection>
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setShowAdd(true)}>+ Adicionar candidato</button>
          {concluida
            ? <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => dispararAcao("Certificados gerados para os batizados.")}>Emitir certificados</button>
            : <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => dispararAcao("Aviso enviado aos candidatos.")}>Avisar candidatos</button>}
        </div>
        {actionMsg && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--olive-soft)", textAlign: "right" }}>✓ {actionMsg}</div>}
      </div>
      {showAdd && church && (
        <AddCandidatoModal
          classData={classData}
          existingIds={existingMemberIds}
          members={members}
          church={church}
          onClose={() => setShowAdd(false)}
          onRefresh={onRefresh}
        />
      )}
    </DrawerShell>
  );
}

function VisitanteDrawer({
  visitor: initVisitor, notes, church, people, onClose, onOpenMember,
}: {
  visitor: VisitorView; notes: VisitorNoteView[]; church: ChurchView | undefined;
  people: PersonView[]; onClose: () => void; onOpenMember: (id: string) => void;
}) {
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
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
        <div className="profile-top">
          <Av name={initVisitor.name} size="lg" />
          <div>
            <div className="profile-name">{initVisitor.name}</div>
            <div className="profile-role">{initVisitor.origin || "Visitante"} · primeira visita {initVisitor.visited_on || "sem data"}</div>
            <div style={{ marginTop: 10 }}>
              <span className="chip chip-neutral" style={{ color: VISITOR_STAGES[stageIdx]?.color }}>{VISITOR_STAGES[stageIdx]?.name ?? currentStage}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Contato">
          <dl className="kv">
            <dt>Telefone</dt><dd>{initVisitor.phone || "—"}</dd>
            <dt>Como chegou</dt><dd>{initVisitor.origin || "Visitante"}</dd>
            <dt>Responsável</dt><dd>{owner?.name || "sem dono fixo"}</dd>
            <dt>Próximo passo</dt><dd><span className={`vcard-due ${initVisitor.due_status || "ok"}`}>{initVisitor.due || "sem prazo"}</span></dd>
          </dl>
        </DrawerSection>
        <DrawerSection title="Jornada de integração">
          <div style={{ display: "flex", gap: 6 }}>
            {VISITOR_STAGES.map((s, i) => (
              <div key={s.id} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 5, borderRadius: 3, background: i <= stageIdx ? s.color : "var(--ink)" }} />
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: i <= stageIdx ? "var(--light)" : "var(--subtle)", marginTop: 7, letterSpacing: "0.04em" }}>{s.name}</div>
              </div>
            ))}
          </div>
          {stageIdx < VISITOR_STAGES.length - 1
            ? <button className="btn btn-pri btn-sm" style={{ marginTop: 16, width: "100%", justifyContent: "center" }} type="button" onClick={avancar} disabled={saving}>Avançar para "{VISITOR_STAGES[stageIdx + 1]?.name}" →</button>
            : (
              <div className="vmember-cta">
                <div className="vmember-t"><Icon name="ok" size={13} /> Chegou a membro</div>
                <div className="vmember-s">Complete os dados cadastrais para liberar o acesso ao app.</div>
                {initVisitor.member_id
                  ? <button className="btn btn-pri btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} type="button" onClick={() => { onClose(); onOpenMember(initVisitor.member_id!); }}>Ver ficha do membro →</button>
                  : null}
              </div>
            )
          }
        </DrawerSection>
        <DrawerSection title="Registrar contato">
          {currentReply && <div className={`vresp-now ${currentReply}`}>{currentReply === "respondeu" ? "◆ Último contato: respondeu" : "◇ Último contato: sem resposta — refazer"}</div>}
          <textarea className="textarea" placeholder="O que rolou nesse contato? (ligação, WhatsApp, visita...)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <div className="vresp-pick">
            <span className="vresp-lbl">A pessoa respondeu?</span>
            <div className="seg-check">
              <button className={`seg-chip ${resp === "respondeu" ? "on" : ""}`} type="button" onClick={() => setResp(resp === "respondeu" ? "" : "respondeu")}>Respondeu</button>
              <button className={`seg-chip ${resp === "sem_resposta" ? "on" : ""}`} type="button" onClick={() => setResp(resp === "sem_resposta" ? "" : "sem_resposta")}>Não respondeu</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-pri btn-sm" type="button" onClick={addNota} disabled={saving}>{saving ? "Salvando…" : "Salvar no histórico"}</button>
          </div>
        </DrawerSection>
        <DrawerSection title="Histórico de contato">
          {visitorNotes.length > 0
            ? (
              <div className="tl">
                {visitorNotes.map((n) => (
                  <div className={`tl-item ${n.is_milestone ? "ol" : ""}`} key={n.id}>
                    <div className="tl-dot" />
                    <div className="tl-when">{n.happened_on || n.created_at?.slice(0, 10) || "—"}</div>
                    <div className="tl-text">{n.body}</div>
                    {n.author && <div className="tl-by">por {n.author}</div>}
                  </div>
                ))}
              </div>
            )
            : <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhum contato registrado ainda.</div>}
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}

function EntityDrawer({
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
  meetings,
  meetingActions,
  rehearsals,
  church,
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
  decisions: DecisionView[];
  baptismClasses: BaptismClassView[];
  baptismCandidates: BaptismCandidateView[];
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  courses: CourseView[];
  enrollments: EnrollmentView[];
  meetings: MeetingView[];
  meetingActions: MeetingActionView[];
  rehearsals: RehearsalView[];
  church: ChurchView | undefined;
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
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Mensagem", title: person.name, subtitle: "Abrir conversa com o voluntário.", formFields: [{ k:"msg", label:"Mensagem", type:"area", ph:"Escreva sua mensagem..." }] })}>Enviar mensagem</button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  if (drawer.kind === "member") {
    const member = members.find((item) => item.id === drawer.id);
    if (!member) return null;
    const linkedMinistries = ministries.filter((m) => m.people.some((p) => p.personName === member.name));
    const memberEnrollments = enrollments.filter((e) => e.member_id === member.id).map((e) => {
      const course = courses.find((c) => c.id === e.course_id);
      return course ? { ...e, course } : null;
    }).filter(Boolean) as (EnrollmentView & { course: CourseView })[];
    const isServing = member.journey[4] || linkedMinistries.length > 0;
    return (
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <button className="drawer-close" type="button" onClick={() => setDrawer(null)}>✕</button>
          <div className="profile-top">
            <Av name={member.name} size="lg" />
            <div>
              <div className="profile-name">{member.name}</div>
              <div className="profile-role">na casa desde {member.firstContact}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip status={member.situation} />
                {isServing && <span className="chip chip-ok">Servindo</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <DrawerSection title="Dados cadastrais">
            <dl className="kv">
              <dt>Telefone</dt><dd>{member.phone || <span style={{ color: "var(--subtle)" }}>a completar</span>}</dd>
              <dt>E-mail</dt><dd>{member.email || <span style={{ color: "var(--subtle)" }}>a completar</span>}</dd>
              <dt>Bairro</dt><dd>{member.neighborhood || <span style={{ color: "var(--subtle)" }}>a completar</span>}</dd>
              <dt>Acesso ao app</dt><dd>{member.email ? <span style={{ color: "var(--olive-soft)" }}>liberado</span> : <span style={{ color: "var(--amber)" }}>pendente (falta e-mail)</span>}</dd>
            </dl>
          </DrawerSection>
          <DrawerSection title="Serve & cargo">
            {linkedMinistries.length > 0 ? (
              <div className="ov-serve">
                {linkedMinistries.map((m) => {
                  const link = m.people.find((p) => p.personName === member.name);
                  return (
                    <button className="ov-serve-row" type="button" key={m.id} onClick={() => setDrawer({ kind: "ministry", id: m.id })}>
                      <span className="ov-serve-ic"><TeamMark ministry={m} size={14} /></span>
                      <span className="ov-serve-name">{m.name}</span>
                      {link?.isLeader ? <span className="lider-tag">Líder</span> : <span className="ov-serve-fn">{link?.functions.join(" · ") || "Voluntário"}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--subtle)" }}>Ainda não serve em nenhum ministério.</div>
            )}
          </DrawerSection>
          <DrawerSection title="Cursos matriculados">
            {memberEnrollments.length > 0 ? (
              <div className="mc-list">
                {memberEnrollments.map(({ id, course, done_count, status }) => {
                  const pct = status === "concluido" ? 100 : 50;
                  return (
                    <div className="mc-row" key={id}>
                      <div className="mc-bar tone-olive" />
                      <div className="mc-main">
                        <div className="mc-head">
                          <div className="mc-name">{course.name}</div>
                          {status === "concluido" ? <span className="chip chip-ok">Concluído</span> : <span className="mc-pct">{pct}%</span>}
                        </div>
                        <div className="mc-meta">{course.level || course.kind || "curso"} · {done_count} aula(s)</div>
                        <div className="bar" style={{ marginTop: 8 }}><div className={`bar-fill ${status === "concluido" ? "" : "amber"}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--subtle)" }}>Nenhum curso matriculado ainda.</div>
            )}
          </DrawerSection>
          <DrawerSection title="Jornada de integração"><PersonTimeline member={member} compact /></DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {isServing
              ? <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Jornada", title: member.name, subtitle: "Atualize o próximo passo de acompanhamento.", formFields: [{ k:"passo", label:"Próximo passo", type:"text", ph:"ex: Convidar para batismo" }, { k:"responsavel", label:"Responsável", type:"text", ph:"Quem acompanha" }, { k:"data", label:"Data limite", type:"date" }] })}>Atualizar jornada</button>
              : <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Convidar", title: member.name, subtitle: "Convide esta pessoa para entrar em um ministério.", saveLabel: "Enviar convite", formFields: [{ k:"ministerio", label:"Ministério", type:"text", ph:"Nome do ministério" }, { k:"msg", label:"Mensagem (opcional)", type:"area", ph:"Mensagem de convite..." }] })}>Convidar para servir</button>}
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Mensagem", title: member.name, subtitle: "Abrir conversa com o membro.", formFields: [{ k:"msg", label:"Mensagem", type:"area", ph:"Escreva sua mensagem..." }] })}>Enviar mensagem</button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  if (drawer.kind === "ministry") {
    const ministry = ministries.find((item) => item.id === drawer.id);
    if (!ministry) return null;
    const leader = ministry.people.find((link) => link.isLeader);
    const totalSlots = ministry.positions.reduce((s, p) => s + p.need_count, 0);
    const isOpen = ministry.people.length < totalSlots || totalSlots === 0;
    return (
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <button className="drawer-close" type="button" onClick={() => setDrawer(null)}>✕</button>
          <div className="profile-top">
            <div className="team-mark" style={{ width: 56, height: 56 }}><TeamMark ministry={ministry} size={26} /></div>
            <div>
              <div className="profile-name">{ministry.name}</div>
              <div className="profile-role">Líder: <span style={{ color: "var(--olive)" }}>{leader?.personName ?? "a definir"}</span> · {ministry.people.length} voluntários</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <span className={`topen ${isOpen ? "yes" : "no"}`}>{isOpen ? "Recebendo voluntários" : "Equipe completa por ora"}</span>
          </div>
        </div>
        <div className="drawer-body">
          {ministry.description && (
            <div style={{ marginTop: 4, marginBottom: 22 }}>
              <div className="dsec-title" style={{ marginBottom: 10 }}>Sobre o time</div>
              <div className="tinfo">
                <div className="tinfo-block">
                  <div className="tinfo-label"><Icon name="identidade" size={13} /> Propósito</div>
                  <div className="tinfo-x">{ministry.description}</div>
                </div>
              </div>
            </div>
          )}
          <DrawerSection title="Funções & quem cobre">
            {ministry.positions.map((position) => (
              <div key={position.id} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="esc-fn">{position.name}</div>
                  <span className="panel-meta">{position.need_count} vaga(s)</span>
                </div>
                {ministry.people.length === 0 && <div style={{ fontSize: 12, color: "var(--subtle)", fontFamily: "var(--mono)" }}>Ninguém neste time ainda.</div>}
                {ministry.people.map((link) => (
                  <button className="cand" type="button" key={`${position.id}-${link.personId}`} onClick={() => setDrawer({ kind: "person", id: link.personId })}>
                    <Av name={link.personName} />
                    <div className="cand-main">
                      <div className="cand-name">{link.personName}</div>
                      <div className="cand-meta">{link.isLeader ? "Líder do time" : link.functions.join(" · ") || "Voluntário"}</div>
                    </div>
                    {link.isLeader && <span className="lider-tag">Líder</span>}
                  </button>
                ))}
              </div>
            ))}
          </DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => { setDrawer(null); setRoute("escalas"); }}>Ver escala do time →</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Adicionar", title: ministry.name, subtitle: "Escolha voluntários para incluir neste ministério.", saveLabel: "Adicionar pessoa", formFields: [{ k:"voluntario", label:"Voluntário", type:"text", ph:"Nome do voluntário" }, { k:"funcao", label:"Função no time", type:"text", ph:"ex: Vocal, Câmera" }] })}>Adicionar pessoa</button>
          </div>
        </div>
      </DrawerShell>
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
    return <ReuniaoDrawer meeting={meeting} actions={mActions} ministries={ministries} people={people} onClose={() => setDrawer(null)} />;
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
          <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Setup", title: event.name, subtitle: "Compartilhe cronograma, posições e observações do culto.", formFields: [{ k:"msg", label:"Mensagem para a equipe", type:"area", ph:"Detalhes do culto, posições, observações..." }, { k:"equipe", label:"Destinatários", type:"text", ph:"ex: Todos / Louvor" }] })}><Icon name="comunicacao" size={15} /> Setup da celebração</button>
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

const DP_MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DP_MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DP_DIAS_MES = [31,29,31,30,31,30,31,31,30,31,30,31];

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = () => {
    if (!value) return { d: null as number | null, m: 0 };
    const p = value.split(" ");
    const mi = DP_MESES.findIndex((x) => x.toLowerCase() === (p[1] || "").toLowerCase());
    return { d: parseInt(p[0], 10) || null, m: mi < 0 ? 0 : mi };
  };
  const init = parse();
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(init.m);
  const dia = init.d;
  const pick = (d: number) => { onChange(d + " " + DP_MESES[mes].toLowerCase()); setOpen(false); };
  return (
    <div className="dp">
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value ? `${dia} de ${DP_MESES_FULL[mes]}` : "Escolher dia e mês"}</span>
        <span className="dp-ic">▾</span>
      </button>
      {open && (
        <div className="dp-pop">
          <div className="dp-head">
            <button type="button" onClick={() => setMes((m) => (m + 11) % 12)}>‹</button>
            <span>{DP_MESES_FULL[mes]}</span>
            <button type="button" onClick={() => setMes((m) => (m + 1) % 12)}>›</button>
          </div>
          <div className="dp-grid">
            {Array.from({ length: DP_DIAS_MES[mes] }, (_, i) => i + 1).map((d) => (
              <button type="button" key={d} className={`dp-day${dia === d && init.m === mes ? " on" : ""}`} onClick={() => pick(d)}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const p = (value || "").match(/(\d{1,2})[h:](\d{2})/);
  const hh = p ? +p[1] : 19;
  const mm = p ? +p[2] : 0;
  const set = (h: number, m: number) => onChange(String(h).padStart(2, "0") + "h" + String(m).padStart(2, "0"));
  return (
    <div className="dp">
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value || "Escolher horário"}</span>
        <span className="dp-ic">▾</span>
      </button>
      {open && (
        <div className="dp-pop tp-pop">
          <div className="tp-col">
            <div className="tp-col-h">Hora</div>
            <div className="tp-scroll">
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <button type="button" key={h} className={`tp-opt${hh === h ? " on" : ""}`} onClick={() => set(h, mm)}>{String(h).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
          <div className="tp-col">
            <div className="tp-col-h">Min</div>
            <div className="tp-scroll">
              {[0, 15, 30, 45].map((m) => (
                <button type="button" key={m} className={`tp-opt${mm === m ? " on" : ""}`} onClick={() => { set(hh, m); setOpen(false); }}>{String(m).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FField({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  if (field.type === "area")
    return <textarea className="textarea" value={value} placeholder={field.ph} style={field.big ? { minHeight: 110 } : undefined} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "select")
    return (
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {field.ph && <option value="">{field.ph}</option>}
        {field.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    );
  if (field.type === "toggle")
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className={`sw${value === "true" ? " on" : ""}`} onClick={() => onChange(value === "true" ? "false" : "true")} />
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{value === "true" ? (field.onLabel || "Sim") : (field.offLabel || "Não")}</span>
      </div>
    );
  if (field.type === "checks") {
    const arr = value ? value.split(",") : [];
    const tog = (v: string) => onChange(arr.includes(v) ? arr.filter((x) => x !== v).join(",") : [...arr, v].join(","));
    return (
      <div className="seg-check">
        {field.options.map((o) => <button type="button" key={o.v} className={`seg-chip${arr.includes(o.v) ? " on" : ""}`} onClick={() => tog(o.v)}>{o.l}</button>)}
      </div>
    );
  }
  if (field.type === "date") return <DatePicker value={value} onChange={onChange} />;
  if (field.type === "time") return <TimePicker value={value} onChange={onChange} />;
  return <input className="input" value={value} placeholder={field.ph} onChange={(e) => onChange(e.target.value)} />;
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
    if (action.kind === "member") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do membro."); return; }
      result = await supabase.schema("service").from("members").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        phone: value("tel") || null,
        email: value("email") || null,
        birthday: value("nasc") || null,
        neighborhood: value("bairro") || null,
        situation: "membro",
        journey: [1, 0, 0, 0, 0],
      });
    } else if (action.kind === "event") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do culto."); return; }
      result = await supabase.schema("service").from("events").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("nome"),
        kind: value("tipo") || "Culto",
        event_date: value("data") || null,
        time: value("hora") || null,
        location: value("local") || null,
        recurrence: value("recorrencia") || "semanal",
        ministry_ids: [],
        roster: [],
        cronogram: [],
      });
    } else if (action.kind === "ministry") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do ministério."); return; }
      result = await supabase.schema("service").from("ministries").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        icon: "times",
        description: value("desc") || null,
        positions: [],
        people: [],
      });
    } else if (action.kind === "decision") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome da pessoa.");
        return;
      }
      result = await supabase.schema("service").from("decisions").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        phone: value("tel") || null,
        service_name: value("culto") || null,
        responsible_id: namedPerson("responsavel")?.id ?? null,
        happened_on: new Date().toLocaleDateString("pt-BR"),
        kind: "decisao",
        status: "novo",
      });
    } else if (action.kind === "baptismClass") {
      if (!value("label")) {
        setSaving(false);
        setError("Digite o nome da turma.");
        return;
      }
      result = await supabase.schema("service").from("baptism_classes").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        label: value("label"),
        baptism_date: value("data") || null,
        location: value("local") || null,
        pastor: value("pastor") || null,
        status: "aberta",
        open_enrollment: true,
      });
    } else if (action.kind === "course") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome do curso.");
        return;
      }
      result = await supabase.schema("service").from("courses").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        level: value("nivel") || null,
        description: value("desc") || null,
        kind: value("tipo") || "trilha",
        category: value("nivel") || "discipulado",
        color: "clay",
      });
    } else if (action.kind === "board") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome do quadro.");
        return;
      }
      result = await supabase.schema("service").from("boards").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        ministry_id: namedMinistry("time")?.id ?? null,
        description: value("desc") || null,
        scope: namedMinistry("time") ? "time" : "geral",
        columns: [
          { id: "todo", nome: "A fazer" },
          { id: "doing", nome: "Em andamento" },
          { id: "done", nome: "Concluído" },
        ],
      });
    } else if (action.kind === "card") {
      if (!value("titulo")) {
        setSaving(false);
        setError("Digite o título do card.");
        return;
      }
      const assignee = namedPerson("responsavel");
      result = await supabase.schema("service").from("cards").insert({
        organization_id: church.organizationId,
        board_id: action.boardId,
        column_id: action.columnId,
        title: value("titulo"),
        due: value("prazo") || null,
        assignees: assignee ? [assignee.id] : [],
        priority: "media",
        source_type: "manual",
      });
    } else if (action.kind === "chat") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome da conversa.");
        return;
      }
      const { data: chat, error: chatError } = await supabase.schema("service").from("chats").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        kind: "grupo",
      }).select("id").single();
      if (chatError) {
        result = { error: chatError };
      } else {
        const member = namedMember("participantes");
        if (member) {
          await supabase.schema("service").from("chat_members").insert({
            organization_id: church.organizationId,
            chat_id: chat.id,
            member_id: member.id,
          });
        }
        result = value("msg")
          ? await supabase.schema("service").from("messages").insert({
              organization_id: church.organizationId,
              chat_id: chat.id,
              sender_id: member?.id ?? null,
              body: value("msg"),
            })
          : { error: null };
      }
    } else if (action.kind === "message") {
      if (!value("msg")) {
        setSaving(false);
        setError("Digite a mensagem.");
        return;
      }
      result = await supabase.schema("service").from("messages").insert({
        organization_id: church.organizationId,
        chat_id: action.chatId,
        sender_id: members[0]?.id ?? null,
        body: value("msg"),
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
        name: value("nome"),
        phone: value("tel") || null,
        origin: value("origem") || null,
        visited_on: value("visitou") || null,
        stage: "novo",
        due: "1º contato",
        due_status: "soon",
      });
    } else if (action.kind === "meeting") {
      if (!value("titulo")) {
        setSaving(false);
        setError("Digite o título da reunião.");
        return;
      }
      const ministry = namedMinistry("time");
      result = await supabase.schema("service").from("meetings").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("titulo"),
        meeting_date: value("data") || null,
        time: value("hora") || null,
        location: value("local") || null,
        ministries: ministry ? [ministry.id] : [],
        attendees: [],
        agenda: [],
        status: "agendada",
      });
    } else if (action.kind === "rehearsal") {
      if (!value("titulo")) {
        setSaving(false);
        setError("Digite o título do ensaio.");
        return;
      }
      const ministry = namedMinistry("time");
      result = await supabase.schema("service").from("rehearsals").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("titulo"),
        rehearsal_date: value("data") || null,
        time: value("hora") || null,
        location: value("local") || null,
        ministry_id: ministry?.id ?? null,
        kind: value("tipo") || "louvor",
        recurrence: value("recorrencia") || "eventual",
        attendees: [],
        repertoire: [],
        attachments: [],
      });
    } else if (action.kind === "announcement") {
      if (!value("titulo")) {
        setSaving(false);
        setError("Digite o título do aviso.");
        return;
      }
      result = await supabase.schema("service").from("announcements").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("titulo"),
        body: value("msg") || null,
        audience: value("publico") || "todos",
        author: "Liderança",
        when_label: "agora",
      });
    } else if (action.kind === "wallPost") {
      if (!value("msg")) {
        setSaving(false);
        setError("Digite a mensagem do mural.");
        return;
      }
      result = await supabase.schema("service").from("wall_posts").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        body: value("msg"),
        audience: value("publico") || "todos",
        author: "Liderança",
        channels: ["app"],
      });
    } else if (action.kind === "room") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome da sala.");
        return;
      }
      result = await supabase.schema("service").from("rooms").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        capacity: Number.parseInt(value("capacidade"), 10) || null,
        location: value("local") || null,
        resources: value("recursos") ? value("recursos").split(",").map((item) => item.trim()).filter(Boolean) : [],
      });
    } else if (action.kind === "reservation") {
      if (!value("titulo")) {
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
        title: value("titulo"),
        kind: value("tipo") || "outro",
        reserved_date: value("data") || null,
        start_time: value("inicio") || null,
        end_time: value("fim") || null,
      });
    } else if (action.kind === "identity") {
      result = await supabase.schema("service").from("church_identity").upsert({
        church_id: church.id,
        organization_id: church.organizationId,
        purpose: value("proposito") || null,
        mission: value("missao") || null,
        vision: value("visao") || null,
        verse: value("versiculo") || null,
        values: value("valores") ? value("valores").split(",").map((title) => ({ title: title.trim() })).filter((v) => v.title) : [],
        updated_at: new Date().toISOString(),
      });
    } else if (action.kind === "historyEntry") {
      if (!value("titulo")) { setSaving(false); setError("Digite o título do marco."); return; }
      const payload = {
        organization_id: church.organizationId,
        church_id: church.id,
        year: value("ano") || null,
        title: value("titulo"),
        body: value("desc") || null,
        updated_at: new Date().toISOString(),
      };
      result = action.id
        ? await supabase.schema("service").from("history_entries").update(payload).eq("id", action.id)
        : await supabase.schema("service").from("history_entries").insert(payload);
    } else if (action.kind === "cycle") {
      if (!value("ano") || !value("tema")) { setSaving(false); setError("Digite o ano e o tema do ciclo."); return; }
      result = await supabase.schema("service").from("cycles").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        year: value("ano"),
        theme: value("tema"),
        verse: value("versiculo") || null,
        body: value("desc") || null,
        objectives: value("objetivos") ? value("objetivos").split(",").map((title) => ({ title: title.trim() })).filter((o) => o.title) : [],
        is_active: true,
      });
    } else if (action.kind === "title") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do papel ministerial."); return; }
      result = await supabase.schema("service").from("ministerial_titles").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
      });
    } else if (action.kind === "tag") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome da frente."); return; }
      result = await supabase.schema("service").from("tags").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        color: value("cor") || "wheat",
      });
    } else if (action.kind === "group") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do grupo."); return; }
      result = await supabase.schema("service").from("fellowship_groups").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        leader_person_id: namedPerson("lider")?.id ?? null,
        weekday: value("dia") || null,
        time: value("hora") || null,
        neighborhood: value("bairro") || null,
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

  const hasHalf = modal.formFields.some((f) => f.half);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal${hasHalf ? " wide" : ""}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{modal.eyebrow}</div>
          <div className="modal-title">{modal.title}</div>
          {modal.subtitle && <div className="modal-sub">{modal.subtitle}</div>}
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
            {modal.formFields.map((field) => (
              <div
                className="field"
                key={field.k}
                style={field.half ? { flex: "1 1 calc(50% - 8px)", minWidth: 160 } : { flex: "1 1 100%" }}
              >
                <label className="field-label">
                  {field.label}
                  {field.req && <span style={{ color: "var(--olive)" }}> *</span>}
                </label>
                <FField
                  field={field}
                  value={values[field.k] ?? ""}
                  onChange={(v) => setValues((cur) => ({ ...cur, [field.k]: v }))}
                />
                {field.hint && <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 5 }}>{field.hint}</div>}
              </div>
            ))}
          </div>
          {error ? <p className="mini-sub" style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p> : null}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-pri" type="button" onClick={save} disabled={saving}>{saving ? "Salvando..." : (modal.saveLabel || "Salvar")}</button>
        </div>
      </div>
    </div>
  );
}
