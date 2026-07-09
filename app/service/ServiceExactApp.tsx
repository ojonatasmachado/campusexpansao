"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { notifyPush } from "./lib/notify-push";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";
import MobileOverlay from "./MobileApp";
import { QRCheckinModal } from "./CheckIn";
import EventoShare from "./EventoShare";
import CursoEditor from "./CursoEditor";
import CursoDrawer from "./CursoDrawer";

/* regras de escala + delegação + presets de funções, guardados em
   service.churches.settings (jsonb) — ver 0005_service_foundation.sql:24. */
type EscalaSettings = {
  modo: "manual" | "assistido" | "automatico";
  maxPorMes: number;
  folgaSemanas: number;
  considerarFerias: boolean;
  naRecusa: "proximo" | "avisar";
};
type EscalaPreset = { id: string; nome: string; posicoes: Record<string, Array<{ name: string; need_count: number }>> };
type ChurchSettings = {
  escala?: EscalaSettings;
  escalaDelegados?: Record<string, string[]>;
  escalaPresets?: EscalaPreset[];
  acessoDelegados?: string[];
  checkinPermitirExtra?: boolean;
  statusCfg?: StatusCriterios;
  tiposEvento?: string[];
  cursoGrupos?: { id: string; nome: string; desc?: string }[];
  contatoCfg?: ContatoCfg;
  gruposCfg?: GruposCfg;
  [key: string]: unknown;
};

type StatusCriterios = {
  recusasInativando: number;
  recusasInativo: number;
  diasIndispInativo: number;
  considerarFerias: boolean;
};

const STATUS_CFG_DEFAULT: StatusCriterios = { recusasInativando: 2, recusasInativo: 4, diasIndispInativo: 30, considerarFerias: false };

/* nome customizável + toggle mestre de Grupos & Células, guardado em
   service.churches.settings.gruposCfg (mesmo jsonb de sempre). */
type GruposCfg = { ativo: boolean; termo: string; termoP: string; sigla: string };
const GRUPOS_CFG_DEFAULT: GruposCfg = { ativo: true, termo: "Grupos de Comunhão", termoP: "Grupo de Comunhão", sigla: "GC" };

/* prazo/canal/abordagem do 1º contato com visitante, guardado em
   service.churches.settings.contatoCfg (mesmo jsonb de sempre). */
type ContatoCfg = { prazoHoras: number; canal: string; metaIntegracaoDias: number; mensagem: string; abordagem: string };

const CONTATO_CFG_DEFAULT: ContatoCfg = {
  prazoHoras: 48,
  canal: "WhatsApp",
  metaIntegracaoDias: 90,
  mensagem: "Oi {nome}! Que alegria ter você com a gente no {evento}. Somos a {igreja} e queremos te conhecer melhor. Posso te ajudar com algo essa semana?",
  abordagem: "Acolher sem pressão. Ouvir a história, oferecer oração e convidar para um Grupo de Comunhão. Sem cobrança, só cuidado genuíno.",
};

const ESCALA_DEFAULT: EscalaSettings = { modo: "assistido", maxPorMes: 4, folgaSemanas: 0, considerarFerias: true, naRecusa: "proximo" };

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
  logoUrl?: string | null;
  settings?: ChurchSettings;
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
  meta?: { recusasSeguidas?: number; diasIndisponivel?: number; extraAccess?: string[]; birthday?: string; neighborhood?: string };
};

type MemberView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  situation: "membro" | "novo";
  firstContact: string;
  neighborhood: string | null;
  journey: number[];
  birth: string | null;
  family: string | null;
  groupId: string | null;
  volunteerId: string | null;
  createdAt: string;
};

type MinistryView = {
  id: string;
  organizationId: string;
  churchId: string;
  name: string;
  icon: string;
  description: string;
  profile: Record<string, unknown>;
  positions: Array<{ id: string; ministry_id: string; name: string; need_count: number }>;
  people: Array<{ personId: string; personName: string; isLeader: boolean; functions: string[] }>;
};

type EventView = {
  id: string;
  organizationId: string;
  name: string;
  kind: string;
  weekday: string;
  eventDate: string;
  time: string;
  slot: string;
  location: string;
  ministries: string[];
  schedule: Array<{ id: string; item: string; time: string | null; category: string | null; duration_min: number | null; ministry_id: string | null; person_id: string | null; notes: string | null; sort_order: number }>;
  setlist: Array<{ id: string; title: string; song_key: string | null }>;
  checkinToken: string | null;
  checkinActive: boolean;
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
  created_at: string;
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

type AnnouncementReadView = {
  id: string;
  announcement_id: string;
  person_id: string;
  read_at: string;
};

type EventAttendanceView = {
  id: string;
  event_id: string;
  person_id: string;
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
  color: string | null;
  prereqs: string[];
  divulgacao: string | null;
  materiais: Array<{ id: string; tipo: string; titulo: string; url: string }>;
  modalidade: string | null;
};

type EnrollmentView = {
  id: string;
  course_id: string;
  member_id: string;
  done_count: number;
  status: "cursando" | "concluido";
};

type ModuleView = {
  id: string;
  course_id: string;
  name: string;
  sort_order: number;
};

type LessonView = {
  id: string;
  module_id: string;
  name: string;
  duration: string | null;
  kind: "video" | "texto" | "presencial" | "ao_vivo" | null;
  sort_order: number;
  link: string | null;
  conteudo: string | null;
  prova: Array<{ q: string; opts: string[]; correta: number }> | null;
  min_acertos: number;
  checkin_token: string | null;
  checkin_active: boolean;
};

type LessonAttendanceView = {
  id: string;
  course_id: string;
  lesson_id: string;
  member_id: string;
  checked_in_at: string;
  via: "qr" | "manual";
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
  source_id: string | null;
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
  values: Array<{ title: string; texto?: string }>;
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
  photo_url: string | null;
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
  churchId: string;
  name: string;
  color: string;
  leaders: string[];
};

type TimelineEventView = {
  id: string;
  member_id: string;
  event_type: string;
  title: string;
  body: string | null;
  by_whom: string | null;
  sort_key: number | null;
  when_label: string | null;
  created_at: string;
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
  announcementReads?: AnnouncementReadView[];
  eventAttendance?: EventAttendanceView[];
  wallPosts: WallPostView[];
  decisions: DecisionView[];
  baptismClasses: BaptismClassView[];
  baptismCandidates: BaptismCandidateView[];
  courses: CourseView[];
  enrollments: EnrollmentView[];
  courseModules: ModuleView[];
  courseLessons: LessonView[];
  lessonAttendance: LessonAttendanceView[];
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
  timelineEvents?: TimelineEventView[];
  currentRole?: "master" | "pastor" | "lider" | "vol";
  permissionsMatrix?: Record<string, Record<string, boolean>>;
  currentPersonId?: string | null;
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
  | { k: string; label: string; type: "text"; req?: boolean; half?: boolean; ph?: string; hint?: string; value?: string }
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
        | { kind: "visitor" }
        | { kind: "rehearsal" }
        | { kind: "announcement" }
        | { kind: "wallPost" }
        | { kind: "room" }
        | { kind: "member"; visitorId?: string }
        | { kind: "event" }
        | { kind: "ministry" }
        | { kind: "identity" }
        | { kind: "historyEntry"; id?: string }
        | { kind: "cycle"; id?: string }
        | { kind: "title" }
        | { kind: "tag" }
        | { kind: "group" }
        | { kind: "congregacao" };
    }
  | null;

const ICONS: Record<string, string> = {
  menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
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

/* item de menu → código de ACOES_V2 (sem o prefixo "service."). Itens sem entrada
   aqui (quadros, reunioes, ensaios, conversas, relatorios) não têm ação própria no
   catálogo — ficam visíveis pra qualquer papel que não seja "vol". */
const NAV_PERMISSION_CODE: Record<string, string> = {
  membros: "membros", pessoas: "voluntarios", times: "times", visitantes: "visitantes",
  decisoes: "decisoes", batismos: "batismos", cursos: "cursos",
  escalas: "escala", cultos: "cultos", comunicacao: "comunica",
  identidade: "identidade", historia: "historia", config: "permissoes",
};

/* telas extras liberáveis pessoa a pessoa, além do que o papel já dá
   (Configurações → Acessos por pessoa). Só rotas que já têm entrada real
   no menu lateral. */
const ACESSO_ROTAS: { id: string; label: string }[] = [
  { id: "painel", label: "Painel & visão geral" },
  { id: "membros", label: "Membros" },
  { id: "pessoas", label: "Voluntários" },
  { id: "times", label: "Times & Ministérios" },
  { id: "visitantes", label: "Visitantes" },
  { id: "batismos", label: "Batismos" },
  { id: "cursos", label: "Cursos & Trilhas" },
  { id: "relatorios", label: "Relatórios" },
];

function podeVerNav(itemId: string, currentRole: string, matrix: Record<string, Record<string, boolean>>, extraAccess: string[] = []) {
  if (currentRole === "master") return true;
  if (extraAccess.includes(itemId)) return true;
  if (currentRole === "vol") return false;
  const code = NAV_PERMISSION_CODE[itemId];
  if (!code) return true;
  return matrix[currentRole]?.[code] ?? true;
}

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

function IgrejaLogo({ logoUrl, nome }: { logoUrl?: string | null; nome?: string }) {
  return (
    <div className="brand brand-row">
      {logoUrl ? (
        <img className="brand-img" src={logoUrl} alt={nome || "Logo da igreja"} />
      ) : (
        <span className="sb-logo">CE<span className="ol">.X</span></span>
      )}
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

const ROLE_LABEL: Record<string, string> = { master: "Master", pastor: "Pastor", lider: "Líder de time", vol: "Voluntário" };

/* permissões do Kanban por papel (equivalente ao kanbanPerm()/S.KANBAN_PERMS do
   protótipo): master/pastor administram o quadro; líder cria, comenta e move os
   próprios cards mas não apaga; voluntário não deveria nem abrir esta tela (usa o
   app mobile), então fica tudo bloqueado por padrão. */
function kanbanPerm(role: string): { criarCard: boolean; comentar: boolean; editarBoard: boolean; moverQualquer: boolean } {
  if (role === "master" || role === "pastor") return { criarCard: true, comentar: true, editarBoard: true, moverQualquer: true };
  if (role === "lider") return { criarCard: true, comentar: true, editarBoard: false, moverQualquer: true };
  return { criarCard: false, comentar: false, editarBoard: false, moverQualquer: false };
}

function ViewSwitcher({ ministries, currentRole, previewMinistryId, setPreviewMinistryId }: { ministries: MinistryView[]; currentRole: "master" | "pastor" | "lider" | "vol"; previewMinistryId: string | null; setPreviewMinistryId: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  /* só master/pastor podem pré-visualizar o app como líder de um time específico —
     líder e voluntário só veem o próprio papel real, sem esse toggle. */
  const podePrevisualizar = currentRole === "master" || currentRole === "pastor";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeMinistry = ministries.find((m) => m.id === previewMinistryId);
  const label = podePrevisualizar ? (previewMinistryId ? activeMinistry?.name ?? "Time" : "Direção") : ROLE_LABEL[currentRole];
  const role = podePrevisualizar
    ? (previewMinistryId ? "Líder de time (pré-visualização)" : `Visão geral · ${currentRole}`)
    : ROLE_LABEL[currentRole];

  return (
    <div className="view-sw" ref={ref}>
      <button className="view-sw-btn" type="button" style={podePrevisualizar ? undefined : { cursor: "default" }} onClick={() => podePrevisualizar && setOpen((o) => !o)}>
        <span className="view-sw-ic"><Icon name={!podePrevisualizar || !previewMinistryId ? "identidade" : "times"} size={14} /></span>
        <span className="view-sw-info">
          <span className="view-sw-name">{label}</span>
          <span className="view-sw-role">{role}</span>
        </span>
        {podePrevisualizar ? <span className="view-sw-caret">▾</span> : null}
      </button>
      {open && podePrevisualizar && (
        <div className="view-sw-menu">
          <div className="view-sw-group">Perspectiva</div>
          <button className={`view-sw-opt ${!previewMinistryId ? "on" : ""}`} type="button"
            onClick={() => { setPreviewMinistryId(null); setOpen(false); }}>
            <span className="view-sw-opt-ic"><Icon name="identidade" size={14} /></span>
            <span className="view-sw-opt-main"><b>Direção</b><small>Visão completa da Igreja</small></span>
          </button>
          {ministries.slice(0, 8).map((m) => (
            <button key={m.id} className={`view-sw-opt ${previewMinistryId === m.id ? "on" : ""}`} type="button"
              onClick={() => { setPreviewMinistryId(m.id); setOpen(false); }}>
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
  announcementReads = [],
  eventAttendance = [],
  wallPosts,
  decisions,
  baptismClasses,
  baptismCandidates,
  courses,
  enrollments,
  courseModules,
  courseLessons,
  lessonAttendance,
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
  timelineEvents = [],
  currentRole = "master",
  permissionsMatrix = {},
  currentPersonId = null,
  error,
}: Props) {
  const [route, setRoute] = useState<keyof typeof ROUTES>("painel");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeChurchId, setActiveChurchId] = useState<string>(churches[0]?.id ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [checkinEventId, setCheckinEventId] = useState<string | null>(null);
  const [shareEventId, setShareEventId] = useState<string | null>(null);
  const [pendingChatMemberId, setPendingChatMemberId] = useState<string | null>(null);
  const startChatWithMember = (memberId: string) => {
    setDrawer(null);
    setPendingChatMemberId(memberId);
    setRoute("conversas");
  };
  /* perspectiva: master/pastor pode pré-visualizar o app como líder de um time
     específico (equivalente a window.cexView() em evolucoes/service_app/shell.jsx).
     null = "Direção" (vê tudo). */
  const [previewMinistryId, setPreviewMinistryId] = useState<string | null>(null);

  useEffect(() => {
    document.body.dataset.theme = theme === "light" ? "light" : "";
    return () => { document.body.dataset.theme = ""; };
  }, [theme]);

  const firstChurch = churches.find((c) => c.id === activeChurchId) ?? churches[0];
  const router = useRouter();
  const markAnnouncementRead = async (personId: string, announcementId: string) => {
    if (!firstChurch?.organizationId) return;
    await createServiceBrowserClient().schema("service").from("announcement_reads").upsert(
      { organization_id: firstChurch.organizationId, announcement_id: announcementId, person_id: personId },
      { onConflict: "announcement_id,person_id", ignoreDuplicates: true },
    );
    router.refresh();
  };
  const completeOnboarding = async (personId: string, memberId: string | null, data: { email: string; nasc: string; bairro: string; senha: string }) => {
    const supabase = createServiceBrowserClient();
    const targetPerson = people.find((p) => p.id === personId);
    await Promise.all([
      supabase.schema("service").from("people").update({
        email: data.email || null,
        meta: { ...targetPerson?.meta, birthday: data.nasc || targetPerson?.meta?.birthday, neighborhood: data.bairro || targetPerson?.meta?.neighborhood },
      }).eq("id", personId),
      memberId
        ? supabase.schema("service").from("members").update({
            email: data.email || null,
            birth: data.nasc || null,
            neighborhood: data.bairro || null,
          }).eq("id", memberId)
        : Promise.resolve(),
      data.senha
        ? supabase.auth.updateUser({ password: data.senha }).then(({ error }) => {
            if (error) console.error("Falha ao salvar senha do onboarding:", error);
          })
        : Promise.resolve(),
    ]);
    router.refresh();
  };
  const changePasswordMobile = async (senha: string) => {
    const { error } = await createServiceBrowserClient().auth.updateUser({ password: senha });
    return { error: error?.message };
  };
  const updateProfileMobile = async (personId: string, memberId: string | null, data: { phone: string; nasc: string; bairro: string }) => {
    const supabase = createServiceBrowserClient();
    await Promise.all([
      supabase.schema("service").from("people").update({ phone: data.phone || null }).eq("id", personId),
      memberId
        ? supabase.schema("service").from("members").update({
            phone: data.phone || null,
            birth: data.nasc || null,
            neighborhood: data.bairro || null,
          }).eq("id", memberId)
        : Promise.resolve(),
    ]);
    router.refresh();
  };
  const addCardCommentMobile = async (cardId: string, author: string, body: string) => {
    if (!firstChurch?.organizationId) return;
    await createServiceBrowserClient().schema("service").from("card_comments").insert({
      organization_id: firstChurch.organizationId,
      card_id: cardId,
      author,
      body,
    });
    router.refresh();
  };
  const advanceVisitorStageMobile = async (visitorId: string, nextStageId: string) => {
    const sb = createServiceBrowserClient().schema("service");
    const nextStage = VISITOR_STAGES.find((s) => s.id === nextStageId);
    await sb.from("visitors").update({ stage: nextStageId }).eq("id", visitorId);
    await sb.from("visitor_notes").insert({
      organization_id: firstChurch?.organizationId,
      visitor_id: visitorId,
      body: `Avançou para "${nextStage?.name ?? nextStageId}".`,
      author: "Equipe",
      is_milestone: true,
    });
    router.refresh();
  };
  const registerVisitorMobile = async (data: { name: string; phone: string; origin: string }) => {
    if (!firstChurch?.organizationId || !firstChurch.id) return;
    await createServiceBrowserClient().schema("service").from("visitors").insert({
      organization_id: firstChurch.organizationId,
      church_id: firstChurch.id,
      name: data.name,
      phone: data.phone || null,
      origin: data.origin || null,
      stage: "novo",
      due: "1º contato",
      due_status: "soon",
    });
    router.refresh();
  };
  const sendMessageMobile = async (chatId: string, senderId: string, body: string) => {
    if (!firstChurch?.organizationId || !body.trim()) return;
    await createServiceBrowserClient().schema("service").from("messages").insert({
      organization_id: firstChurch.organizationId,
      chat_id: chatId,
      sender_id: senderId,
      body: body.trim(),
    });
    const recipients = chatMembers.filter((cm) => cm.chat_id === chatId && cm.member_id !== senderId).map((cm) => cm.member_id);
    const senderName = members.find((m) => m.id === senderId)?.name ?? "Alguém";
    notifyPush(firstChurch.organizationId, recipients, senderName, body.trim());
    router.refresh();
  };
  const startChatMobile = async (selfMemberId: string, targetMemberId: string, firstMessage: string) => {
    if (!firstChurch?.organizationId || !firstChurch.id) return null;
    const sb = createServiceBrowserClient().schema("service");
    const senderName = members.find((m) => m.id === selfMemberId)?.name ?? "Alguém";
    const existing = chats.find((c) => c.kind === "dm"
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === selfMemberId)
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === targetMemberId));
    if (existing) {
      if (firstMessage.trim()) {
        await sb.from("messages").insert({
          organization_id: firstChurch.organizationId,
          chat_id: existing.id,
          sender_id: selfMemberId,
          body: firstMessage.trim(),
        });
        notifyPush(firstChurch.organizationId, [targetMemberId], senderName, firstMessage.trim());
      }
      router.refresh();
      return existing.id;
    }
    const { data: chatRow, error } = await sb.from("chats").insert({
      organization_id: firstChurch.organizationId,
      church_id: firstChurch.id,
      kind: "dm",
      name: null,
    }).select("id").single();
    if (error || !chatRow) return null;
    await sb.from("chat_members").insert([
      { organization_id: firstChurch.organizationId, chat_id: chatRow.id, member_id: selfMemberId },
      { organization_id: firstChurch.organizationId, chat_id: chatRow.id, member_id: targetMemberId },
    ]);
    if (firstMessage.trim()) {
      await sb.from("messages").insert({
        organization_id: firstChurch.organizationId,
        chat_id: chatRow.id,
        sender_id: selfMemberId,
        body: firstMessage.trim(),
      });
      notifyPush(firstChurch.organizationId, [targetMemberId], senderName, firstMessage.trim());
    }
    router.refresh();
    return chatRow.id;
  };
  const notificarLiderRecusa = async (leaderPersonId: string, volunteerPersonId: string, texto: string) => {
    const leaderMember = members.find((m) => m.volunteerId === leaderPersonId);
    const volunteerMember = members.find((m) => m.volunteerId === volunteerPersonId);
    if (!leaderMember || !volunteerMember || leaderMember.id === volunteerMember.id) return;
    await startChatMobile(volunteerMember.id, leaderMember.id, texto);
  };
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

  /* mescla com o padrão (allTrue/allFalse por papel) pra qualquer ação que a org
     ainda não tenha uma linha salva em core.role_permissions não "vazar" visível
     por engano — sem isso, uma chave ausente cairia no fallback `?? true`. */
  const matrizEfetiva = matrizComFallback(permissionsMatrix);
  const currentExtraAccess = people.find((person) => person.id === currentPersonId)?.meta?.extraAccess ?? [];

  /* perspectiva efetiva: líder real vê só os times que lidera; master/pastor
     pré-visualizando vê só o time escolhido; do contrário, sem restrição (null).
     Equivalente a view.papel/view.timeId em evolucoes/service_app/shell.jsx. */
  const podePrevisualizar = currentRole === "master" || currentRole === "pastor";
  const misteriosQueLidero = currentPersonId
    ? ministries.filter((ministry) => ministry.people.some((link) => link.personId === currentPersonId && link.isLeader)).map((ministry) => ministry.id)
    : [];
  const scopeMinistryIds: string[] | null = podePrevisualizar
    ? (previewMinistryId ? [previewMinistryId] : null)
    : (currentRole === "lider" ? misteriosQueLidero : null);
  /* identidade efetiva pra Conversas: em pré-visualização, "eu" viro o líder do time escolhido */
  const previewLeaderPersonId = previewMinistryId
    ? ministries.find((ministry) => ministry.id === previewMinistryId)?.people.find((link) => link.isLeader)?.personId ?? null
    : null;
  const perspectivePersonId = podePrevisualizar && previewMinistryId ? previewLeaderPersonId : currentPersonId;

  const nav = [
    { group: "Visão geral", items: [{ id: "painel", icon: "painel", label: "Painel" }] },
    {
      group: "Pessoas",
      items: [
        { id: "membros", icon: "membros", label: "Membros", count: members.length },
        { id: "pessoas", icon: "pessoa", label: "Voluntários", count: people.length },
        { id: "times", icon: "times", label: "Times & Ministérios", count: ministries.length },
        { id: "visitantes", icon: "visitante", label: "Visitantes", badge: visitorsInCare },
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
      {navOpen ? <div className="sb-backdrop" onClick={() => setNavOpen(false)} /> : null}
      <aside className={`sb${navOpen ? " open" : ""}`}>
        <div className="sb-top">
          <IgrejaLogo logoUrl={firstChurch?.logoUrl} nome={firstChurch?.nome} />
          <button className="sb-close" type="button" onClick={() => setNavOpen(false)} aria-label="Fechar menu">✕</button>
        </div>
        <CongSwitcher churches={churches} activeId={activeChurchId} setActiveId={setActiveChurchId} />
        <nav className="sb-nav">
          {nav.map((group) => {
            const visibleItems = group.items.filter((item) => podeVerNav(item.id, currentRole, matrizEfetiva, currentExtraAccess));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.group}>
                <div className="sb-group">{group.group}</div>
                {visibleItems.map((item) => (
                  <button key={item.id} className={`sb-link ${route === item.id ? "on" : ""}`} type="button" onClick={() => { setRoute(item.id as keyof typeof ROUTES); setNavOpen(false); }}>
                    <span className="sb-ic"><Icon name={CEX_ICON_FOR[item.id] ?? item.icon} size={17} /></span>
                    {item.label}
                    {"badge" in item && item.badge ? <span className="sb-badge">{item.badge}</span> : null}
                    {"count" in item && item.count !== undefined ? <span className="sb-count">{item.count}</span> : null}
                  </button>
                ))}
              </div>
            );
          })}
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
          <button className="top-menu" type="button" onClick={() => setNavOpen(true)} aria-label="Abrir menu">
            <Icon name="menu" size={18} />
          </button>
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
            <ViewSwitcher ministries={ministries} currentRole={currentRole} previewMinistryId={previewMinistryId} setPreviewMinistryId={setPreviewMinistryId} />
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
        {route === "painel" ? (
          <Painel
            people={people}
            activePeople={activePeople}
            confirmationRate={confirmationRate}
            gaps={gaps}
            events={events}
            visitorsInCare={visitorsInCare}
            announcements={announcements}
            eventAttendance={eventAttendance}
            setRoute={setRoute}
            setDrawer={setDrawer}
            setModal={setModal}
            setCheckinEventId={setCheckinEventId}
          />
        ) : null}
        {route === "membros" ? <Membros members={members} ministries={ministries} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "pessoas" ? <Pessoas people={people} currentPersonId={currentPersonId} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "times" ? <Times ministries={ministries} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "visitantes" ? <Visitantes visitors={visitors} visitorNotes={visitorNotes} people={people} church={firstChurch} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "decisoes" ? <Decisoes decisions={decisions} members={members} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "batismos" ? <Batismos baptismClasses={baptismClasses} baptismCandidates={baptismCandidates} decisions={decisions} members={members} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "cursos" ? (
          <CursosTrilhas
            courses={courses}
            enrollments={enrollments}
            courseModules={courseModules}
            courseLessons={courseLessons}
            lessonAttendance={lessonAttendance}
            members={members}
            church={firstChurch}
          />
        ) : null}
        {route === "escalas" ? <Escalas gaps={gaps} roster={roster} people={people} ministries={ministries} events={events} church={firstChurch} scopeMinistryIds={scopeMinistryIds} setDrawer={setDrawer} setModal={setModal} setRoute={setRoute} setCheckinEventId={setCheckinEventId} onNotifyLeaderRecusa={notificarLiderRecusa} /> : null}
        {route === "reunioes" ? <Reunioes meetings={meetings} meetingActions={meetingActions} ministries={ministries} people={people} rooms={rooms} reservations={reservations} church={firstChurch} setDrawer={setDrawer} /> : null}
        {route === "ensaios" ? <Ensaios rehearsals={rehearsals} ministries={ministries} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "espacos" ? <Espacos rooms={rooms} reservations={reservations} church={firstChurch} setModal={setModal} /> : null}
        {route === "quadros" ? <Quadros boards={boards} cards={cards} ministries={ministries} people={people} church={firstChurch} currentRole={currentRole} currentPersonId={currentPersonId} scopeMinistryIds={scopeMinistryIds} setModal={setModal} /> : null}
        {route === "cultos" ? <Cultos events={events} ministries={ministries} church={firstChurch} setDrawer={setDrawer} setModal={setModal} setCheckinEventId={setCheckinEventId} setShareEventId={setShareEventId} /> : null}
        {route === "comunicacao" ? <Comunicacao announcements={announcements} announcementReads={announcementReads} wallPosts={wallPosts} ministries={ministries} people={people} setModal={setModal} /> : null}
        {route === "conversas" ? <Conversas chats={chats} chatMembers={chatMembers} messages={messages} ministries={ministries} members={members} church={firstChurch} currentPersonId={perspectivePersonId} scopeMinistryIds={scopeMinistryIds} pendingChatMemberId={pendingChatMemberId} onConsumePendingChatMember={() => setPendingChatMemberId(null)} /> : null}
        {route === "relatorios" ? <Relatorios people={people} members={members} ministries={ministries} events={events} boards={boards} chats={chats} visitors={visitors} roster={roster} eventAttendance={eventAttendance} fellowshipGroups={fellowshipGroups} confirmationRate={confirmationRate} setRoute={setRoute} church={firstChurch} /> : null}
        {route === "config" ? <Config church={firstChurch} churches={churches} ministries={ministries} people={people} rooms={rooms} reservations={reservations} currentRole={currentRole} theme={theme} setTheme={setTheme} ministerialTitles={ministerialTitles} fellowshipGroups={fellowshipGroups} tags={tags} courses={courses} setModal={setModal} permissionsMatrix={permissionsMatrix} /> : null}
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
          courseModules={courseModules}
          courseLessons={courseLessons}
          visitors={visitors}
          baptismClasses={baptismClasses}
          announcements={announcements}
          chats={chats}
          chatMembers={chatMembers}
          messages={messages}
          onReadAnnouncement={markAnnouncementRead}
          onCompleteOnboarding={completeOnboarding}
          onAddCardComment={addCardCommentMobile}
          onAdvanceVisitorStage={advanceVisitorStageMobile}
          onRegisterVisitor={registerVisitorMobile}
          onSendMessage={sendMessageMobile}
          onStartChat={startChatMobile}
          organizationId={firstChurch?.organizationId ?? ""}
          theme={theme}
          setTheme={setTheme}
          onChangePassword={changePasswordMobile}
          onUpdateProfile={updateProfileMobile}
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
            ministries={ministries}
            permitirExtra={!!firstChurch?.settings?.checkinPermitirExtra}
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
            churchName={firstChurch?.nome}
            logoUrl={firstChurch?.logoUrl}
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
          courseModules={courseModules}
          courseLessons={courseLessons}
          meetings={meetings}
          meetingActions={meetingActions}
          rehearsals={rehearsals}
          boards={boards}
          cards={cards}
          church={firstChurch}
          fellowshipGroups={fellowshipGroups}
          timelineEvents={timelineEvents}
          setDrawer={setDrawer}
          setRoute={setRoute}
          setModal={setModal}
          setShareEventId={setShareEventId}
          onStartChatWithMember={startChatWithMember}
        />
      ) : null}
      {modal ? (
        <ServiceModal
          modal={modal}
          church={firstChurch}
          people={people}
          ministries={ministries}
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
        ...(() => {
          const funcoes = new Map<string, MinistryView[]>();
          ministries.forEach((ministry) => {
            ministry.positions.forEach((position) => {
              if (!position.name.toLowerCase().includes(term)) return;
              const times = funcoes.get(position.name) ?? [];
              if (!times.some((m) => m.id === ministry.id)) times.push(ministry);
              funcoes.set(position.name, times);
            });
          });
          return Array.from(funcoes.entries()).slice(0, 6).map(([name, times]) => ({
            key: `func-${name}`,
            type: "Função",
            icon: "escalas",
            name,
            sub: times.map((m) => m.name.split(" ")[0]).join(", "),
            action: () => {
              setRoute("times");
              setDrawer({ kind: "ministry", id: times[0].id });
            },
          }));
        })(),
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
  announcements,
  eventAttendance,
  setRoute,
  setDrawer,
  setModal,
  setCheckinEventId,
}: {
  people: PersonView[];
  activePeople: number;
  confirmationRate: number;
  gaps: Array<{ event: EventView; ministry: MinistryView; position: { id: string; name: string } }>;
  events: EventView[];
  visitorsInCare: number;
  announcements: AnnouncementView[];
  eventAttendance: EventAttendanceView[];
  setRoute: (route: keyof typeof ROUTES) => void;
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
  setCheckinEventId: (id: string | null) => void;
}) {
  const topPeople = [...people].sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)).slice(0, 5);
  const recentAnnouncements = [...announcements].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Painel</div>
          <h1 className="ph-title">Bom domingo, <em>liderança</em></h1>
          <p className="ph-sub">Visão da semana: quem está escalado, o que falta preencher e quem precisa de acompanhamento.</p>
        </div>
        <div className="ph-actions">
          <button
            className="btn btn-sec"
            type="button"
            onClick={() => setModal({ eyebrow: "Criar", title: "Novo voluntário", subtitle: "Cadastre e já escolha os ministérios.", saveLabel: "Adicionar voluntário", formFields: [{ k:"nome", label:"Nome completo", type:"text", req:true, ph:"Como a pessoa se chama" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"email", label:"E-mail", type:"text", half:true, ph:"e-mail da pessoa" }], action: { kind: "member" } })}
          >
            + Novo voluntário
          </button>
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
            {events.slice(0, 3).map((event) => (
              <MiniEvent
                key={event.id}
                event={event}
                setDrawer={setDrawer}
                attendanceCount={eventAttendance.filter((a) => a.event_id === event.id).length}
                onCheckin={() => setCheckinEventId(event.id)}
              />
            ))}
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
            {recentAnnouncements.map((a) => (
              <button className="mini-row click" type="button" key={a.id} onClick={() => setRoute("comunicacao")}>
                <div className="mini-main">
                  <div className="mini-title">{a.title}</div>
                  <div className="mini-sub">{a.audience || "Todos"} · {a.when_label || "agora"}</div>
                </div>
              </button>
            ))}
            {recentAnnouncements.length === 0 && (
              <div className="mini-row"><div className="mini-main"><div className="mini-title">Nenhum aviso ainda</div><div className="mini-sub">Publique em Comunicação</div></div></div>
            )}
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

function MiniEvent({
  event, setDrawer, attendanceCount, onCheckin,
}: {
  event: EventView;
  setDrawer: (drawer: DrawerState) => void;
  attendanceCount?: number;
  onCheckin?: () => void;
}) {
  return (
    <button className="mini-row click" type="button" onClick={() => setDrawer({ kind: "event", id: event.id })}>
      <div className="mini-main">
        <div className="mini-title">{event.name}</div>
        <div className="mini-sub">{event.weekday} · {event.eventDate} · {event.location}</div>
      </div>
      <div className="mini-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>{event.time}</span>
        {onCheckin && (
          <span
            className="painel-qr"
            role="button"
            tabIndex={0}
            title="QR check-in / presença"
            onClick={(e) => { e.stopPropagation(); onCheckin(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onCheckin(); } }}
          >
            {!!attendanceCount && <span className="painel-qr-count">{attendanceCount}</span>}
            <Icon name="cultos" size={14} />
          </span>
        )}
      </div>
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
  const getMemberMinistries = (volunteerId: string | null) =>
    ministries.filter((min) => min.people.some((p) => p.personId === volunteerId));
  return (
    <div className="content wide">
      <PageHead title="Membros" eyebrow="Pessoas" subtitle="Toda a congregação. Veja quem serve, em que jornada está e o histórico desde que chegou." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo membro", subtitle: "Cadastro de quem já é da casa. Os dados completos liberam o acesso ao app.", saveLabel: "Adicionar membro", formFields: [{ k:"nome", label:"Nome completo", type:"text", req:true, ph:"Como a pessoa se chama" }, { k:"tel", label:"Telefone (WhatsApp)", type:"text", half:true, req:true, ph:"(11) 9...", hint:"Os 6 últimos dígitos viram a senha inicial do app." }, { k:"email", label:"E-mail", type:"text", half:true, req:true, ph:"usado para entrar no app" }, { k:"nasc", label:"Aniversário", type:"date", half:true }, { k:"bairro", label:"Bairro", type:"text", half:true, ph:"Onde mora" }], action: { kind: "member" } })}>+ Novo membro</button>} />
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
          const mins = getMemberMinistries(m.volunteerId);
          const isLeader = mins.some((min) => min.people.find((p) => p.personId === m.volunteerId)?.isLeader);
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

function Pessoas({ people, currentPersonId, setDrawer, setModal }: { people: PersonView[]; currentPersonId?: string | null; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | "ativo" | "pausa">("todos");
  const visible = people.filter((person) => {
    const okQ = !q || person.name.toLowerCase().includes(q.toLowerCase());
    const okStatus = status === "todos" || person.status === status;
    return okQ && okStatus;
  });
  return (
    <div className="content">
      <PageHead title="Voluntários" eyebrow="Pessoas" subtitle="Quem serve, em quais times e funções. Toque para ver perfil, disponibilidade e histórico." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo voluntário", subtitle: "Cadastre e já escolha os ministérios.", saveLabel: "Adicionar voluntário", formFields: [{ k:"nome", label:"Nome completo", type:"text", req:true, ph:"Como a pessoa se chama" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"email", label:"E-mail", type:"text", half:true, ph:"e-mail da pessoa" }], action: { kind: "member" } })}>+ Novo voluntário</button>} />
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          <button className={status === "todos" ? "on" : ""} type="button" onClick={() => setStatus("todos")}>Todos</button>
          <button className={status === "ativo" ? "on" : ""} type="button" onClick={() => setStatus("ativo")}>Ativos</button>
          <button className={status === "pausa" ? "on" : ""} type="button" onClick={() => setStatus("pausa")}>Pausa</button>
        </div>
        <div className="tb-spacer" />
        <span className="panel-meta">{visible.length} pessoas</span>
      </div>
      <div className="tbl">
        <div className="tr head tr-people"><div>Voluntário</div><div>Disponibilidade</div><div>Frentes</div><div>Status</div></div>
        {visible.map((person) => (
          <button className="tr click tr-people" type="button" key={person.id} onClick={() => setDrawer({ kind: "person", id: person.id })}>
            <div className="who">
              <Av name={person.name} />
              <div>
                <strong>{person.name}{person.id === currentPersonId && <span style={{ color: "var(--olive)", fontSize: 11, marginLeft: 7, fontFamily: "var(--mono)" }}>você</span>}</strong>
                <small>{person.phone}</small>
              </div>
            </div>
            <div>{formatAvailability(person.availability)}</div>
            <div>{person.tags.join(" · ") || "sem tags"}</div>
            <div><Chip status={person.status} /></div>
          </button>
        ))}
        {visible.length === 0 && <div className="empty">Ninguém encontrado.</div>}
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

/* candidato apto a uma posição, com motivo de bloqueio — equivalente a
   candidatos() em evolucoes/service_app/escalas.jsx:12-30. Diferença de fidelidade
   consciente: no protótipo "férias" é uma flag solta além do status; no banco real
   ferias É um valor do enum people.status, então "considerarFerias" aqui vira o
   toggle que decide se quem está com status='ferias' entra ou não no pool. */
type Candidato = { person: PersonView; fit: "good" | "busy" | "block"; motivo: string | null };

function candidatosDisponiveis(
  pool: PersonView[],
  event: EventView,
  jaNoSlot: Set<string>,
  usadosNoEvento: Set<string>,
  cfg: EscalaSettings,
  cargaPorPessoa: Record<string, number>,
): Candidato[] {
  return pool
    .filter((p) => p.status !== "pausa" && !jaNoSlot.has(p.id))
    .map((p) => {
      let motivo: string | null = null;
      if (usadosNoEvento.has(p.id)) motivo = "já escalado neste evento";
      else if (p.status === "ferias" && cfg.considerarFerias) motivo = "de férias";
      else if (cfg.maxPorMes && (cargaPorPessoa[p.id] ?? 0) >= cfg.maxPorMes) motivo = "no teto do mês";
      const fit: Candidato["fit"] = motivo ? "block" : (p.availability[event.slot] ? "good" : "busy");
      return { person: p, fit, motivo };
    })
    .sort((a, b) => {
      const rank = (x: Candidato) => (x.fit === "good" ? 0 : x.fit === "busy" ? 1 : 2);
      return rank(a) === rank(b) ? (b.person.engagement ?? 0) - (a.person.engagement ?? 0) : rank(a) - rank(b);
    });
}

/* nº de eventos distintos, no mesmo mês do evento-alvo, em que a pessoa já está
   escalada (status != recusou) — usado pelo teto "máximo de vezes por mês". */
function cargaDoMes(roster: RosterAssignmentView[], events: EventView[], targetEvent: EventView): Record<string, number> {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const targetMonth = targetEvent.eventDate.slice(0, 7);
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  roster.forEach((assignment) => {
    if (assignment.status === "no") return;
    const ev = eventById.get(assignment.event_id);
    if (!ev || ev.eventDate.slice(0, 7) !== targetMonth) return;
    const key = `${assignment.person_id}:${assignment.event_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    counts[assignment.person_id] = (counts[assignment.person_id] ?? 0) + 1;
  });
  return counts;
}

/* carga da semana corrente (segunda a domingo contendo hoje) por pessoa:
   nº de posições escaladas (status != "no") e nº de recusas ("no") — equivalente
   a cargaVol() em evolucoes/service_app/relatorios.jsx:6-16, usado pelo
   termômetro de bem-estar pra classificar sobrecarga sem depender de engajamento. */
function cargaDaSemana(roster: RosterAssignmentView[], events: EventView[]): Record<string, { escalas: number; recusas: number }> {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const hoje = new Date();
  const offsetSegunda = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - offsetSegunda);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const inicioSemana = toIso(segunda);
  const fimSemana = toIso(domingo);
  const counts: Record<string, { escalas: number; recusas: number }> = {};
  roster.forEach((assignment) => {
    const ev = eventById.get(assignment.event_id);
    if (!ev || ev.eventDate < inicioSemana || ev.eventDate > fimSemana) return;
    const atual = counts[assignment.person_id] ?? { escalas: 0, recusas: 0 };
    if (assignment.status === "no") atual.recusas += 1;
    else atual.escalas += 1;
    counts[assignment.person_id] = atual;
  });
  return counts;
}

function FuncoesEscalaModal({
  ministry,
  onClose,
  onRefresh,
}: {
  ministry: MinistryView;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [positions, setPositions] = useState(ministry.positions);
  const [nome, setNome] = useState("");
  const [need, setNeed] = useState(1);
  const [saving, setSaving] = useState(false);

  const setNeedAt = async (id: string, delta: number) => {
    const current = positions.find((p) => p.id === id);
    if (!current) return;
    const next = Math.max(1, current.need_count + delta);
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, need_count: next } : p)));
    await createServiceBrowserClient().schema("service").from("ministry_positions").update({ need_count: next }).eq("id", id);
    onRefresh();
  };
  const rename = (id: string, name: string) => setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  const commitRename = async (id: string, name: string) => {
    await createServiceBrowserClient().schema("service").from("ministry_positions").update({ name }).eq("id", id);
    onRefresh();
  };
  const remove = async (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
    await createServiceBrowserClient().schema("service").from("ministry_positions").delete().eq("id", id);
    onRefresh();
  };
  const add = async () => {
    const n = nome.trim();
    if (!n) return;
    setSaving(true);
    const { data } = await createServiceBrowserClient()
      .schema("service")
      .from("ministry_positions")
      .insert({ organization_id: ministry.organizationId, ministry_id: ministry.id, name: n, need_count: Math.max(1, need), sort_order: positions.length })
      .select()
      .single();
    if (data) setPositions((prev) => [...prev, data as MinistryView["positions"][number]]);
    setNome("");
    setNeed(1);
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Funções · {ministry.name}</div>
          <div className="modal-title">Quem o time precisa</div>
          <div className="modal-sub">Adicione, renomeie ou remova funções e diga quantas pessoas cada uma precisa. Vale para todos os eventos deste time.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {positions.map((position) => (
              <div className="func-edit-row" key={position.id}>
                <input className="input" value={position.name} onChange={(e) => rename(position.id, e.target.value)} onBlur={(e) => commitRename(position.id, e.target.value)} />
                <div className="stepper">
                  <button type="button" onClick={() => setNeedAt(position.id, -1)}>−</button>
                  <span>{position.need_count}</span>
                  <button type="button" onClick={() => setNeedAt(position.id, 1)}>+</button>
                </div>
                <button className="func-edit-x" type="button" title="Remover função" onClick={() => remove(position.id)}><Icon name="recusou" size={15} /></button>
              </div>
            ))}
            {positions.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhuma função ainda.</div>}
          </div>
          <div className="dsec-title" style={{ marginBottom: 8 }}>Nova função</div>
          <div className="func-edit-add">
            <input className="input" placeholder="ex: Vocal, Câmera, Recepção" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <div className="stepper"><button type="button" onClick={() => setNeed((n) => Math.max(1, n - 1))}>−</button><span>{need}</span><button type="button" onClick={() => setNeed((n) => n + 1)}>+</button></div>
            <button className="btn btn-sec btn-sm" type="button" disabled={saving} onClick={add}>+ Função</button>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-pri" type="button" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

function DelegarModal({
  ministries,
  church,
  onClose,
  onRefresh,
}: {
  ministries: MinistryView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [ministryId, setMinistryId] = useState(ministries[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const ministry = ministries.find((m) => m.id === ministryId);
  const delegados: string[] = (church?.settings?.escalaDelegados ?? {})[ministryId] ?? [];
  const elenco = (ministry?.people ?? []).filter((link) => !link.isLeader);

  const toggle = async (personId: string) => {
    if (!church?.id || !ministryId) return;
    setSaving(true);
    const atual: Record<string, string[]> = { ...(church.settings?.escalaDelegados ?? {}) };
    const lista = atual[ministryId] ?? [];
    atual[ministryId] = lista.includes(personId) ? lista.filter((id) => id !== personId) : [...lista, personId];
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, escalaDelegados: atual } }).eq("id", church.id);
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Delegar gestão da escala</div>
          <div className="modal-title">Quem mais pode montar a escala</div>
          <div className="modal-sub">As pessoas escolhidas passam a ver e gerir a escala deste time, como você.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          {ministries.length > 1 && (
            <div className="seg" style={{ marginBottom: 14, flexWrap: "wrap" }}>
              {ministries.map((m) => <button key={m.id} type="button" className={ministryId === m.id ? "on" : ""} onClick={() => setMinistryId(m.id)}>{m.name.split(" ")[0]}</button>)}
            </div>
          )}
          {elenco.length === 0 && <div className="empty">Ninguém mais neste time ainda.</div>}
          {elenco.map((link) => {
            const on = delegados.includes(link.personId);
            return (
              <button type="button" className={`flag-row${on ? " on" : ""}`} key={link.personId} disabled={saving} onClick={() => toggle(link.personId)}>
                <span className={`flag-check${on ? " on" : ""}`}>{on ? "✓" : ""}</span>
                <Av name={link.personName} size="sm" />
                <div className="flag-main"><div className="flag-nome">{link.personName}</div><div className="flag-meta">{link.functions.join(" · ") || "Voluntário"}</div></div>
              </button>
            );
          })}
        </div>
        <div className="modal-foot"><button className="btn btn-pri" type="button" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

function PresetSaveModal({
  ministries,
  church,
  onClose,
  onRefresh,
}: {
  ministries: MinistryView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const salvar = async () => {
    const n = nome.trim();
    if (!n || !church?.id) return;
    setSaving(true);
    const posicoes: EscalaPreset["posicoes"] = {};
    ministries.forEach((ministry) => { posicoes[ministry.id] = ministry.positions.map((p) => ({ name: p.name, need_count: p.need_count })); });
    const preset: EscalaPreset = { id: `preset_${Date.now()}`, nome: n, posicoes };
    const presets = [...(church.settings?.escalaPresets ?? []), preset];
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, escalaPresets: presets } }).eq("id", church.id);
    setSaving(false);
    onRefresh();
    onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Configuração padrão</div>
          <div className="modal-title">Salvar como…</div>
          <div className="modal-sub">Guarda as funções e quantidades atuais de todos os times. Crie uma para "Culto", outra para "Reunião", e aplique quando quiser.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field"><label className="field-label">Nome da configuração</label><input className="input" placeholder="ex: Culto de domingo" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvar()} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={salvar}>Salvar</button>
        </div>
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
  church,
  scopeMinistryIds,
  setDrawer,
  setModal,
  setRoute,
  setCheckinEventId,
  onNotifyLeaderRecusa,
}: {
  gaps: Array<{ event: EventView; ministry: MinistryView; position: { id: string; name: string } }>;
  roster: RosterAssignmentView[];
  people: PersonView[];
  ministries: MinistryView[];
  events: EventView[];
  church: ChurchView | undefined;
  scopeMinistryIds: string[] | null;
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  setCheckinEventId: (id: string | null) => void;
  onNotifyLeaderRecusa: (leaderPersonId: string, volunteerPersonId: string, texto: string) => void;
}) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const router = useRouter();
  const escalaCfg: EscalaSettings = { ...ESCALA_DEFAULT, ...(church?.settings?.escala ?? {}) };
  const [slotAction, setSlotAction] = useState<{
    kind: "slot" | "assign" | "swap";
    event: EventView;
    ministry: MinistryView;
    position: { id: string; name: string; need_count: number };
    assignment?: RosterAssignmentView;
  } | null>(null);
  const [funcEdit, setFuncEdit] = useState<MinistryView | null>(null);
  const [delegarOpen, setDelegarOpen] = useState(false);
  const [presetSaveOpen, setPresetSaveOpen] = useState(false);
  const [gerando, setGerando] = useState(false);

  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0] ?? null;
  const eventRoster = selectedEvent ? roster.filter((assignment) => assignment.event_id === selectedEvent.id) : [];
  const occupiedPeople = new Set(eventRoster.filter((assignment) => assignment.status !== "no").map((assignment) => assignment.person_id));
  const misteriosDoEvento = selectedEvent?.ministries.length
    ? ministries.filter((ministry) => selectedEvent.ministries.includes(ministry.id))
    : ministries;
  /* líder real (ou master/pastor pré-visualizando como líder) só vê os times do escopo;
     equivalente a view.papel/timesVis em evolucoes/service_app/escalas.jsx:384. */
  const visibleMinistries = scopeMinistryIds
    ? misteriosDoEvento.filter((ministry) => scopeMinistryIds.includes(ministry.id))
    : misteriosDoEvento;
  const confirmed = eventRoster.filter((assignment) => assignment.status === "ok").length;
  const totalSlots = visibleMinistries.reduce((sum, ministry) => sum + ministry.positions.reduce((total, position) => total + Math.max(1, position.need_count), 0), 0);
  const openSlots = Math.max(0, totalSlots - eventRoster.filter((assignment) => assignment.status !== "no").length);

  function assignmentsFor(positionId: string) {
    return eventRoster.filter((assignment) => assignment.position_id === positionId);
  }

  function positionsOf(ministry: MinistryView) {
    return ministry.positions.length ? ministry.positions : [{ id: `${ministry.id}-geral`, ministry_id: ministry.id, name: "Equipe", need_count: 1 }];
  }

  function candidatePool(ministry: MinistryView): PersonView[] {
    const linked = ministry.people
      .map((link) => people.find((person) => person.id === link.personId))
      .filter(Boolean) as PersonView[];
    return linked.length ? linked : people;
  }

  function candidatosParaVaga(ministry: MinistryView, positionId: string, excluirPersonId?: string): Candidato[] {
    if (!selectedEvent) return [];
    const jaNoSlot = new Set(assignmentsFor(positionId).map((a) => a.person_id));
    const usados = new Set([...occupiedPeople].filter((id) => id !== excluirPersonId));
    const carga = cargaDoMes(roster, events, selectedEvent);
    return candidatosDisponiveis(candidatePool(ministry), selectedEvent, jaNoSlot, usados, escalaCfg, carga);
  }

  const setModoEscala = async (modo: EscalaSettings["modo"]) => {
    if (!church?.id) return;
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, escala: { ...escalaCfg, modo } } }).eq("id", church.id);
    router.refresh();
  };

  const confirmarAssignment = async (assignmentId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "ok" }).eq("id", assignmentId);
    router.refresh();
  };
  const deixarPendenteAssignment = async (assignmentId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "wait" }).eq("id", assignmentId);
    router.refresh();
  };
  const removerAssignment = async (assignmentId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").delete().eq("id", assignmentId);
    router.refresh();
  };
  const trocarAssignment = async (assignmentId: string, novoPersonId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ person_id: novoPersonId, status: "wait" }).eq("id", assignmentId);
    router.refresh();
  };
  const escalarPessoa = async (event: EventView, positionId: string, personId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").insert({
      organization_id: event.organizationId, event_id: event.id, position_id: positionId, person_id: personId,
      status: escalaCfg.modo === "automatico" ? "ok" : "wait",
    });
    router.refresh();
  };
  const recusarAssignment = async (assignment: RosterAssignmentView, ministry: MinistryView) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "no" }).eq("id", assignment.id);
    if (escalaCfg.modo === "automatico" && escalaCfg.naRecusa === "proximo" && selectedEvent) {
      const proximo = candidatosParaVaga(ministry, assignment.position_id, assignment.person_id).find((c) => c.fit !== "block");
      if (proximo) {
        await createServiceBrowserClient().schema("service").from("roster_assignments").insert({
          organization_id: selectedEvent.organizationId, event_id: selectedEvent.id, position_id: assignment.position_id, person_id: proximo.person.id, status: "ok",
        });
      }
    }
    if (escalaCfg.naRecusa === "avisar") {
      const lider = ministry.people.find((p) => p.isLeader);
      const voluntario = people.find((p) => p.id === assignment.person_id);
      const posicao = positionsOf(ministry).find((pos) => pos.id === assignment.position_id);
      if (lider && voluntario) {
        onNotifyLeaderRecusa(lider.personId, assignment.person_id, `🔔 ${voluntario.name} recusou a escala de ${posicao?.name ?? ministry.name} em ${selectedEvent?.name ?? "um evento"}${selectedEvent?.eventDate ? ` · ${selectedEvent.eventDate}` : ""} — vaga em aberto.`);
      }
    }
    router.refresh();
  };

  const gerarAuto = async () => {
    if (!selectedEvent || gerando) return;
    setGerando(true);
    const carga = cargaDoMes(roster, events, selectedEvent);
    const usados = new Set(occupiedPeople);
    const inserts: Array<{ organization_id: string; event_id: string; position_id: string; person_id: string; status: "ok" | "wait" }> = [];
    visibleMinistries.forEach((ministry) => {
      positionsOf(ministry).forEach((position) => {
        const assignments = assignmentsFor(position.id);
        let missing = Math.max(0, Math.max(1, position.need_count) - assignments.filter((a) => a.status !== "no").length);
        if (!missing) return;
        const jaNoSlot = new Set(assignments.map((a) => a.person_id));
        const candidatos = candidatosDisponiveis(candidatePool(ministry), selectedEvent, jaNoSlot, usados, escalaCfg, carga);
        for (const candidato of candidatos) {
          if (!missing) break;
          if (candidato.fit === "block") continue;
          inserts.push({ organization_id: selectedEvent.organizationId, event_id: selectedEvent.id, position_id: position.id, person_id: candidato.person.id, status: escalaCfg.modo === "automatico" ? "ok" : "wait" });
          usados.add(candidato.person.id);
          carga[candidato.person.id] = (carga[candidato.person.id] ?? 0) + 1;
          missing--;
        }
      });
    });
    if (inserts.length) {
      await createServiceBrowserClient().schema("service").from("roster_assignments").insert(inserts);
      router.refresh();
    }
    setGerando(false);
  };

  useEffect(() => {
    if (escalaCfg.modo === "automatico" && selectedEvent) {
      gerarAuto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id, escalaCfg.modo]);

  const baixarCSV = () => {
    if (!selectedEvent) return;
    const rows: string[][] = [["Time", "Função", "Pessoas"]];
    visibleMinistries.forEach((ministry) => {
      positionsOf(ministry).forEach((position) => {
        const nomes = assignmentsFor(position.id).map((a) => `${people.find((p) => p.id === a.person_id)?.name ?? "?"} (${a.status})`).join(" / ");
        rows.push([ministry.name, position.name, nomes]);
      });
    });
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `escala-${selectedEvent.id}.csv`;
    a.click();
  };

  const aplicarPreset = async (preset: EscalaPreset) => {
    const ops: PromiseLike<unknown>[] = [];
    Object.entries(preset.posicoes).forEach(([ministryId, posicoes]) => {
      const ministry = ministries.find((m) => m.id === ministryId);
      if (!ministry) return;
      posicoes.forEach(({ name, need_count }) => {
        const existing = ministry.positions.find((p) => p.name === name);
        const client = createServiceBrowserClient().schema("service").from("ministry_positions");
        ops.push(existing
          ? client.update({ need_count }).eq("id", existing.id)
          : client.insert({ organization_id: ministry.organizationId, ministry_id: ministryId, name, need_count, sort_order: ministry.positions.length }));
      });
    });
    await Promise.all(ops);
    router.refresh();
  };

  /* texto de perspectiva por papel, equivalente a evolucoes/service_app/escalas.jsx:384 */
  const perspectiveText = scopeMinistryIds
    ? (visibleMinistries.length > 1 ? `Você está vendo os ${visibleMinistries.length} times que lidera.` : `Você está vendo só o ${visibleMinistries[0]?.name ?? "seu time"}.`)
    : "A Direção vê todos os times.";

  return (
    <div className="content wide">
      <PageHead
        title="Escalas por evento"
        eyebrow="Operação"
        subtitle={`Escolha o culto e monte a escala. Cada coluna é um time. ${perspectiveText} Toque numa pessoa para confirmar, trocar ou remover; na vaga para escalar.`}
        action={
          <>
            <button className="btn btn-sec" type="button" onClick={() => setDelegarOpen(true)}><Icon name="membros" size={15} /> Delegar</button>
            <button className="btn btn-sec" type="button" onClick={() => setCheckinEventId(selectedEvent?.id ?? null)} disabled={!selectedEvent}><Icon name="cultos" size={15} /> QR Check-in</button>
            <button className="btn btn-sec" type="button" onClick={baixarCSV} disabled={!selectedEvent}><Icon name="relatorios" size={15} /> Baixar</button>
            <button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Publicar", title: "Publicar & avisar", subtitle: "A equipe recebe a escala pelo app e pelas notificações configuradas.", saveLabel: "Publicar & avisar →", formFields: [{ k:"msg", label:"Mensagem (opcional)", type:"area", ph:"Recado que vai junto com a escala..." }] })}>Publicar & avisar →</button>
          </>
        }
      />

      <div className="esc-modo">
        <span className="esc-modo-lbl">Geração da escala</span>
        <div className="seg seg-sm">
          {(["manual", "assistido", "automatico"] as const).map((key) => (
            <button key={key} className={escalaCfg.modo === key ? "on" : ""} type="button" onClick={() => setModoEscala(key)}>{key === "manual" ? "Manual" : key === "assistido" ? "Assistida" : "Automática"}</button>
          ))}
        </div>
        <span className="esc-modo-hint">
          {escalaCfg.modo === "manual" ? "Você monta tudo na mão." : null}
          {escalaCfg.modo === "assistido" ? "O sistema sugere os nomes; você confirma cada um." : null}
          {escalaCfg.modo === "automatico" ? "O sistema gera e já confirma. Na recusa, chama o próximo apto." : null}
        </span>
        {escalaCfg.modo !== "manual" ? <button className="btn btn-sec btn-sm" type="button" disabled={gerando} onClick={gerarAuto}><Icon name="escalas" size={14} /> {gerando ? "Gerando…" : `Gerar ${escalaCfg.modo === "automatico" ? "agora" : "automática"}`}</button> : null}
        <span className="tb-spacer" />
        <span className="esc-preset">
          <Icon name="escalas" size={13} />
          <select className="esc-preset-sel" value="" onChange={(e) => { const preset = (church?.settings?.escalaPresets ?? []).find((p) => p.id === e.target.value); if (preset) aplicarPreset(preset); }}>
            <option value="">Aplicar configuração…</option>
            {(church?.settings?.escalaPresets ?? []).map((preset) => <option key={preset.id} value={preset.id}>{preset.nome}</option>)}
          </select>
          <button className="esc-preset-save" type="button" onClick={() => setPresetSaveOpen(true)}>Salvar atual</button>
        </span>
        <button className="esc-modo-cfg" type="button" onClick={() => setRoute("config")}><Icon name="config" size={13} /> Regras</button>
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
          const ministryPositions = positionsOf(ministry);
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
                <button className="esc-col-edit" title="Editar funções deste time" type="button" onClick={() => setFuncEdit(ministry)}><Icon name="config" size={14} /></button>
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
          candidatos={candidatosParaVaga(slotAction.ministry, slotAction.position.id, slotAction.assignment?.person_id)}
          people={people}
          onClose={() => setSlotAction(null)}
          onConfirmar={confirmarAssignment}
          onPendente={deixarPendenteAssignment}
          onRecusar={(assignment) => recusarAssignment(assignment, slotAction.ministry)}
          onRemover={removerAssignment}
          onEscalar={(personId) => selectedEvent && escalarPessoa(selectedEvent, slotAction.position.id, personId)}
          onTrocar={trocarAssignment}
          setDrawer={setDrawer}
        />
      ) : null}
      {funcEdit ? <FuncoesEscalaModal ministry={funcEdit} onClose={() => setFuncEdit(null)} onRefresh={() => router.refresh()} /> : null}
      {delegarOpen ? <DelegarModal ministries={visibleMinistries} church={church} onClose={() => setDelegarOpen(false)} onRefresh={() => router.refresh()} /> : null}
      {presetSaveOpen ? <PresetSaveModal ministries={visibleMinistries} church={church} onClose={() => setPresetSaveOpen(false)} onRefresh={() => router.refresh()} /> : null}
    </div>
  );
}

function Cultos({ events, ministries, church, setDrawer, setModal, setCheckinEventId, setShareEventId }: { events: EventView[]; ministries: MinistryView[]; church?: ChurchView; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void; setCheckinEventId: (id: string) => void; setShareEventId: (id: string) => void }) {
  const tipoOptions = [
    { v: "Culto", l: "Culto" },
    { v: "Evento", l: "Evento" },
    { v: "Treinamento", l: "Treinamento" },
    { v: "Retiro", l: "Retiro" },
    ...(church?.settings?.tiposEvento ?? []).map((t) => ({ v: t, l: t })),
  ];
  return (
    <div className="content">
      <PageHead title="Cultos & Agenda" eyebrow="Operação" subtitle="Agenda, roteiro, setlist e ministérios envolvidos em cada culto." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo culto ou evento", subtitle: "Agenda da igreja: o que é, quando acontece e quem serve.", saveLabel: "Criar na agenda", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: Culto da Manhã, Conferência de Jovens" }, { k:"tipo", label:"Tipo de evento", type:"select", half:true, options:tipoOptions }, { k:"local", label:"Local", type:"text", half:true, ph:"Templo, Anexo..." }, { k:"data", label:"Data", type:"date", half:true }, { k:"hora", label:"Horário de início", type:"time", half:true }, { k:"recorrencia", label:"Recorrência", type:"select", half:true, options:[{v:"semanal",l:"Semanal"},{v:"quinzenal",l:"Quinzenal"},{v:"mensal",l:"Mensal"},{v:"eventual",l:"Eventual"}] }], action: { kind: "event" } })}>+ Novo culto</button>} />
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
  candidatos,
  people,
  onClose,
  onConfirmar,
  onPendente,
  onRecusar,
  onRemover,
  onEscalar,
  onTrocar,
  setDrawer,
}: {
  action: {
    kind: "slot" | "assign" | "swap";
    event: EventView;
    ministry: MinistryView;
    position: { id: string; name: string; need_count: number };
    assignment?: RosterAssignmentView;
  };
  candidatos: Candidato[];
  people: PersonView[];
  onClose: () => void;
  onConfirmar: (assignmentId: string) => void;
  onPendente: (assignmentId: string) => void;
  onRecusar: (assignment: RosterAssignmentView) => void;
  onRemover: (assignmentId: string) => void;
  onEscalar: (personId: string) => void;
  onTrocar: (assignmentId: string, personId: string) => void;
  setDrawer: (drawer: DrawerState) => void;
}) {
  const [trocando, setTrocando] = useState(false);
  const assignedPerson = action.assignment ? people.find((person) => person.id === action.assignment?.person_id) : null;
  if (action.kind === "slot" && action.assignment && !trocando) {
    const assignment = action.assignment;
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-eyebrow">{action.position.name} · {action.ministry.name} · {action.event.weekday}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <Av name={assignedPerson?.name ?? "Voluntário"} size="lg" />
              <div>
                <div className="modal-title">{assignedPerson?.name ?? "Voluntário"}</div>
                <div style={{ marginTop: 7 }}><Chip status={assignment.status} /></div>
              </div>
            </div>
          </div>
          <div className="modal-body">
            <div style={{ display: "grid", gap: 8 }}>
              <button className="btn btn-pri" style={{ justifyContent: "center" }} type="button" onClick={() => { onConfirmar(assignment.id); onClose(); }}>✓ Marcar como confirmado</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => { onPendente(assignment.id); onClose(); }}>Deixar pendente (reenviar convite)</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => { onRecusar(assignment); onClose(); }}>Marcar que recusou</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setTrocando(true)}>⇄ Pedir troca / substituir</button>
              {assignedPerson ? <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setDrawer({ kind: "person", id: assignedPerson.id })}>Ver perfil do voluntário</button> : null}
              <button className="btn btn-danger" style={{ justifyContent: "center" }} type="button" onClick={() => { onRemover(assignment.id); onClose(); }}>Remover da escala</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSwap = trocando || action.kind === "swap";
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{isSwap ? "Pedir troca" : "Escalar"} · {action.position.name} · {action.ministry.name}</div>
          <div className="modal-title">{action.event.name}</div>
          <div className="modal-sub">{action.event.weekday} · {action.event.time}. Verde: disponível. Quem já está em outro time aparece travado.</div>
        </div>
        <div className="modal-body">
          {candidatos.length === 0 ? <div className="empty">Ninguém disponível neste time.</div> : null}
          {candidatos.map(({ person, fit, motivo }) => (
            <button
              className={`cand ${fit === "block" ? "is-block" : ""}`}
              type="button"
              key={person.id}
              onClick={() => {
                if (fit === "block") return;
                if (isSwap && action.assignment) onTrocar(action.assignment.id, person.id);
                else onEscalar(person.id);
                onClose();
              }}
            >
              <Av name={person.name} size="md" />
              <div className="cand-main">
                <div className="cand-name">{person.name}</div>
                <div className="cand-meta">{person.tags.join(" · ") || person.status} · {person.engagement ?? 0}% engajamento</div>
              </div>
              <span className={`cand-fit ${fit}`}>{fit === "good" ? "● disponível" : fit === "busy" ? "○ ocupado" : `✕ ${motivo}`}</span>
            </button>
          ))}
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
  const [view, setView] = useState<"pipe" | "list" | "painel">("pipe");
  const [cfgOpen, setCfgOpen] = useState(false);
  const cc: ContatoCfg = { ...CONTATO_CFG_DEFAULT, ...(church?.settings?.contatoCfg ?? {}) };
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
        <div className="contato-pill"><span className="contato-pill-n">{cc.prazoHoras}h</span><span>1º contato</span></div>
        <div className="contato-main"><div className="contato-t">Primeiro contato em até <em>{cc.prazoHoras}h</em> por <em>{cc.canal}</em> · meta de integração: <em>{cc.metaIntegracaoDias} dias</em></div><div className="contato-s">{cc.abordagem}</div></div>
        <button className="btn btn-sec btn-sm" type="button" onClick={() => setCfgOpen(true)}>Ajustar</button>
      </div>
      {cfgOpen && church && <ContatoCfgModal church={church} cfg={cc} onClose={() => setCfgOpen(false)} onRefresh={() => router.refresh()} />}

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

function ContatoCfgModal({ church, cfg, onClose, onRefresh }: { church: ChurchView; cfg: ContatoCfg; onClose: () => void; onRefresh: () => void }) {
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
            <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 6 }}>Use {"{nome}"}, {"{evento}"} e {"{igreja}"} — preenchemos automaticamente.</div>
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

function ReuniaoForm({
  ministries,
  people,
  rooms,
  reservations,
  church,
  onClose,
}: {
  ministries: MinistryView[];
  people: PersonView[];
  rooms: RoomView[];
  reservations: ReservationView[];
  church: ChurchView | undefined;
  onClose: () => void;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("20h00");
  const [fim, setFim] = useState("21h30");
  const [local, setLocal] = useState("");
  const [salaId, setSalaId] = useState("");
  const [presentes, setPresentes] = useState<string[]>([]);
  const [pauta, setPauta] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isoDate = data ? dpToIsoDate(data) : null;
  const conflito = salaId && isoDate ? findRoomConflict(reservations, salaId, isoDate, hora, fim) : null;
  const salaEscolhida = rooms.find((r) => r.id === salaId);

  const togglePessoa = (id: string) => setPresentes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const criar = async () => {
    if (!titulo.trim()) { setError("Dê um título à reunião."); return; }
    if (!church?.organizationId || !church.id) { setError("Nenhuma igreja encontrada para vincular esta reunião."); return; }
    if (conflito) { setError(`A sala já tem "${conflito.title}" em ${conflito.start_time}–${conflito.end_time} nesse dia.`); return; }
    setSaving(true);
    setError("");
    const supabase = createServiceBrowserClient();
    const meetingMinistries = ministries.filter((m) => m.people.some((link) => presentes.includes(link.personId))).map((m) => m.id);
    const { data: meetingRow, error: meetingError } = await supabase.schema("service").from("meetings").insert({
      organization_id: church.organizationId,
      church_id: church.id,
      title: titulo.trim(),
      meeting_date: data || null,
      time: hora,
      location: salaEscolhida ? salaEscolhida.name : (local || null),
      ministries: meetingMinistries,
      attendees: presentes,
      agenda: pauta.split("\n").map((s) => s.trim()).filter(Boolean),
      status: "agendada",
    }).select("id").single();
    if (meetingError || !meetingRow) {
      setSaving(false);
      setError(meetingError?.message ?? "Não foi possível marcar a reunião.");
      return;
    }
    if (salaId && isoDate) {
      await supabase.schema("service").from("reservations").insert({
        organization_id: church.organizationId,
        room_id: salaId,
        title: titulo.trim(),
        kind: "reuniao",
        reserved_date: isoDate,
        start_time: hora,
        end_time: fim,
        source_type: "reuniao",
        source_id: meetingRow.id,
      });
    }
    router.refresh();
    onClose();
  };

  return (
    <DrawerShell onClose={onClose} wide>
      <div className="drawer-head">
        <button className="drawer-close" type="button" onClick={onClose}>✕</button>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>Nova reunião</div>
        <input className="ce-title-input" placeholder="Título da reunião" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="drawer-body">
        <DrawerSection title="Quando & onde">
          <div className="ce-grid">
            <div className="field"><label className="field-label">Data</label><DatePicker value={data} onChange={setData} /></div>
            <div className="field"><label className="field-label">Início</label><TimePicker value={hora} onChange={setHora} /></div>
            <div className="field"><label className="field-label">Fim</label><TimePicker value={fim} onChange={setFim} /></div>
          </div>
          <div className="ce-grid" style={{ marginTop: 4 }}>
            <div className="field">
              <label className="field-label">Reservar uma sala</label>
              <select className="select" value={salaId} onChange={(e) => setSalaId(e.target.value)}>
                <option value="">Sem reserva de sala</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.capacity ? ` · ${room.capacity} lug.` : ""}</option>)}
              </select>
            </div>
            {!salaId ? <div className="field"><label className="field-label">Local (texto livre)</label><input className="input" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="ex: Sala de reuniões" /></div> : null}
          </div>
          {conflito ? <div className="reserva-warn"><Icon name="alerta" size={14} /> A sala já tem &quot;{conflito.title}&quot; em {conflito.start_time}–{conflito.end_time} nesse dia.</div> : null}
        </DrawerSection>

        <DrawerSection title="Quem participa">
          <div className="cand-pick">
            {people.map((person) => {
              const on = presentes.includes(person.id);
              return (
                <button key={person.id} type="button" className={`cand-chip ${on ? "on" : ""}`} onClick={() => togglePessoa(person.id)}>
                  <Av name={person.name} size="xs" /> {person.name.split(" ")[0]} {on && "✓"}
                </button>
              );
            })}
            {people.length === 0 ? <span style={{ fontSize: 12.5, color: "var(--subtle)" }}>Nenhum voluntário cadastrado.</span> : null}
          </div>
        </DrawerSection>

        <DrawerSection title="Pauta · um item por linha">
          <textarea className="textarea" style={{ minHeight: 90 }} placeholder={"Balanço do mês\nEscala de julho\nCuidado com a equipe"} value={pauta} onChange={(e) => setPauta(e.target.value)} />
        </DrawerSection>

        {error ? <div style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 12 }}>{error}</div> : null}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" disabled={saving || !!conflito} onClick={criar}>{saving ? "Marcando…" : "Marcar reunião"}</button>
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </DrawerShell>
  );
}

function Reunioes({ meetings, meetingActions, ministries, people, rooms, reservations, church, setDrawer }: { meetings: MeetingView[]; meetingActions: MeetingActionView[]; ministries: MinistryView[]; people: PersonView[]; rooms: RoomView[]; reservations: ReservationView[]; church: ChurchView | undefined; setDrawer: (drawer: DrawerState) => void }) {
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const scheduled = meetings.filter((meeting) => meeting.status === "agendada");
  const finished = meetings.filter((meeting) => meeting.status === "realizada");
  const [novaOpen, setNovaOpen] = useState(false);
  return (
    <div className="content wide">
      <PageHead title="Reuniões" eyebrow="Liderança" subtitle="Pautas, ata e responsabilidades para validar na próxima reunião." action={<button className="btn btn-pri" type="button" onClick={() => setNovaOpen(true)}>+ Marcar reunião</button>} />
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
      {novaOpen ? <ReuniaoForm ministries={ministries} people={people} rooms={rooms} reservations={reservations} church={church} onClose={() => setNovaOpen(false)} /> : null}
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

function BoardChooser({
  title,
  boards,
  church,
  onPick,
  onClose,
}: {
  title: string;
  boards: BoardView[];
  church: ChurchView | undefined;
  onPick: (boardId: string) => void;
  onClose: () => void;
}) {
  const [novo, setNovo] = useState("");
  const [saving, setSaving] = useState(false);

  const criar = async () => {
    const nome = novo.trim();
    if (!nome || !church?.organizationId || !church.id || saving) return;
    setSaving(true);
    const { data } = await createServiceBrowserClient().schema("service").from("boards").insert({
      organization_id: church.organizationId,
      church_id: church.id,
      name: nome,
      ministry_id: null,
      description: "Criado a partir de uma reunião.",
      scope: "geral",
      columns: [{ id: "todo", nome: "A fazer" }, { id: "doing", nome: "Em andamento" }, { id: "done", nome: "Concluído" }],
    }).select("id").single();
    setSaving(false);
    if (data) onPick(data.id);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Responsabilidades</div>
          <div className="modal-title">{title}</div>
          <div className="modal-sub">Mande para um quadro que já existe ou crie um novo. As responsabilidades viram cards com o responsável marcado.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="dsec-title" style={{ marginBottom: 10 }}>Quadros existentes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {boards.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhum quadro ainda, crie um abaixo.</div>}
            {boards.map((board) => (
              <button className="cand" type="button" key={board.id} onClick={() => onPick(board.id)}>
                <span className="esc-col-mark" style={{ width: 30, height: 30 }}><Icon name="quadros" size={15} /></span>
                <div className="cand-main"><div className="cand-name">{board.name}</div><div className="cand-meta">{board.scope === "geral" ? "Liderança" : "Time"}</div></div>
              </button>
            ))}
          </div>
          <div className="dsec-title" style={{ margin: "20px 0 10px" }}>Ou crie um novo</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Nome do novo quadro" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criar()} />
            <button className="btn btn-pri" type="button" disabled={saving} onClick={criar}>Criar e usar</button>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  );
}

const CARD_COLUMN_STATUS: Record<string, { label: string; cls: string }> = {
  todo: { label: "A fazer", cls: "chip-wait" },
  doing: { label: "Em andamento", cls: "chip-wait" },
  done: { label: "Concluído", cls: "chip-ok" },
};

function ReuniaoDrawer({
  meeting,
  actions,
  ministries,
  people,
  boards,
  cards,
  church,
  onClose,
  setRoute,
}: {
  meeting: MeetingView;
  actions: MeetingActionView[];
  ministries: MinistryView[];
  people: PersonView[];
  boards: BoardView[];
  cards: CardView[];
  church: ChurchView | undefined;
  onClose: () => void;
  setRoute: (route: keyof typeof ROUTES) => void;
}) {
  const router = useRouter();
  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const [ata, setAta] = useState(meeting.minutes ?? "");
  const [saving, setSaving] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [chooser, setChooser] = useState<{ scope: "all" | string } | null>(null);
  const pauta = Array.isArray(meeting.agenda) ? (meeting.agenda as string[]) : [];

  const cardFor = (actionId: string) => cards.find((c) => c.source_type === "meeting_action" && c.source_id === actionId);
  const pendentes = actions.filter((a) => !cardFor(a.id));

  const salvarAta = async () => {
    setSaving(true);
    const wasAgendada = meeting.status === "agendada";
    await createServiceBrowserClient()
      .schema("service")
      .from("meetings")
      .update({ minutes: ata, status: wasAgendada ? "realizada" : meeting.status })
      .eq("id", meeting.id);
    setSaving(false);
    router.refresh();
    if (wasAgendada && pendentes.length > 0) setChooser({ scope: "all" });
  };

  const addAcao = async () => {
    if (!novaDescricao.trim() || !church?.organizationId) return;
    await createServiceBrowserClient().schema("service").from("meeting_actions").insert({
      organization_id: church.organizationId,
      meeting_id: meeting.id,
      description: novaDescricao.trim(),
      assignee_id: novoResponsavel || null,
      status: "pendente",
    });
    setNovaDescricao("");
    setNovoResponsavel("");
    router.refresh();
  };

  const enviarParaBoard = async (actionId: string, boardId: string) => {
    if (!church?.organizationId) return;
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;
    await createServiceBrowserClient().schema("service").from("cards").insert({
      organization_id: church.organizationId,
      board_id: boardId,
      column_id: "todo",
      title: action.description,
      assignees: action.assignee_id ? [action.assignee_id] : [],
      priority: "media",
      source_type: "meeting_action",
      source_id: action.id,
    });
  };

  const onPickBoard = async (boardId: string) => {
    if (!chooser) return;
    if (chooser.scope === "all") {
      await Promise.all(pendentes.map((a) => enviarParaBoard(a.id, boardId)));
    } else {
      await enviarParaBoard(chooser.scope, boardId);
    }
    setChooser(null);
    router.refresh();
  };

  return (
    <>
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

        <DrawerSection title="Responsabilidades · anote durante a reunião">
          <div className="reu-quadro-note" style={{ marginBottom: 12 }}>Cada responsabilidade vira um <b>card no quadro</b>. O andamento é acompanhado lá.</div>
          {actions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {actions.map((action) => {
                const assignee = action.assignee_id ? personById.get(action.assignee_id) : null;
                const card = cardFor(action.id);
                const cardStatus = card ? (CARD_COLUMN_STATUS[card.column_id] ?? CARD_COLUMN_STATUS.todo) : null;
                return (
                  <div className="acao-row" key={action.id}>
                    <div className="acao-main">
                      <div className="acao-o">{action.description}</div>
                      <div className="acao-quem">{assignee?.name.split(" ")[0] ?? "a definir"}</div>
                    </div>
                    <div className="acao-side">
                      {card && cardStatus ? (
                        <>
                          <span className={`chip ${cardStatus.cls}`}>{cardStatus.label}</span>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => { onClose(); setRoute("quadros"); }}>Ver no quadro →</button>
                        </>
                      ) : (
                        <>
                          <span className="acao-semquadro">fora do quadro</span>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setChooser({ scope: action.id })}>→ Quadro</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="acao-add">
            <input className="input" placeholder="O que ficou combinado (ex: Revisar escala de julho)" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAcao()} />
            <select className="select acao-add-quem" value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)}>
              <option value="">Responsável…</option>
              {meeting.attendees.map((pid) => { const p = personById.get(pid); return p ? <option key={pid} value={pid}>{p.name}</option> : null; })}
            </select>
            <button className="btn btn-sec btn-sm" type="button" onClick={addAcao}>+ Anotar</button>
          </div>
          {pendentes.length > 0 && (
            <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 10 }} onClick={() => setChooser({ scope: "all" })}>Enviar todas ao quadro →</button>
          )}
        </DrawerSection>

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
    {chooser ? (
      <BoardChooser
        title={chooser.scope === "all" ? "Onde colocar as responsabilidades?" : "Mandar para qual quadro?"}
        boards={boards}
        church={church}
        onPick={onPickBoard}
        onClose={() => setChooser(null)}
      />
    ) : null}
    </>
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
                  <Av name={p.name} size="sm" />
                  <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
                  <span style={{ marginLeft: "auto", color: "var(--olive)" }}><Icon name="ok" size={16} /></span>
                </div>
              ))}
              {naoLeram.length > 0 && <div className="dsec-title" style={{ margin: "14px 0 8px" }}>Ainda não leram · {naoLeram.length}</div>}
              {naoLeram.map((p) => (
                <div className="flag-row" key={p.id} style={{ cursor: "default", opacity: 0.6 }}>
                  <Av name={p.name} size="sm" />
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

function Comunicacao({
  announcements,
  announcementReads,
  wallPosts,
  ministries,
  people,
  setModal: _setModal,
}: {
  announcements: AnnouncementView[];
  announcementReads: AnnouncementReadView[];
  wallPosts: WallPostView[];
  ministries: MinistryView[];
  people: PersonView[];
  setModal: (modal: ModalState) => void;
}) {
  const [view, setView] = useState<"mural" | "avisos">("mural");
  const [selected, setSelected] = useState(announcements[0]?.id ?? "");
  const [compose, setCompose] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const selAviso = announcements.find((a) => a.id === selected);

  const dispararAcao = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 2500);
  };

  // eslint-disable-next-line react-hooks/purity -- filtro por "últimos 7 dias" precisa do relógio real
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyIds = new Set(announcements.filter((a) => new Date(a.created_at).getTime() >= weekAgo).map((a) => a.id));
  const weeklyReaderIds = new Set(announcementReads.filter((r) => weeklyIds.has(r.announcement_id)).map((r) => r.person_id));
  const pctAlcance = people.length ? Math.round((weeklyReaderIds.size / people.length) * 100) : 0;
  const distribuicaoTimes = ministries.slice(0, 4).map((ministry) => {
    const idsDoTime = ministry.people.map((link) => link.personId);
    const total = idsDoTime.length;
    const leram = idsDoTime.filter((id) => weeklyReaderIds.has(id)).length;
    return { ministry, pct: total ? Math.round((leram / total) * 100) : 0 };
  });

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
            <div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={14} /> Alcance da semana</span></div>
            <div className="panel-body">
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em" }}>{pctAlcance}%<span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>taxa de leitura</span></div>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>{weeklyReaderIds.size} de {people.length} voluntário(s) leram algum aviso publicado nos últimos 7 dias.</div>
              <div style={{ marginTop: 14 }}>
                {distribuicaoTimes.map(({ ministry, pct }) => (
                  <div className="dist-row" key={ministry.id} style={{ padding: "10px 0" }}>
                    <span className="dist-name" style={{ width: 120 }}>{ministry.name.split(" ")[0]}</span>
                    <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${pct}%`, background: pct < 80 ? "var(--amber)" : "var(--olive)" }} /></div>
                    <span className="dist-num">{pct}%</span>
                  </div>
                ))}
                {distribuicaoTimes.length === 0 && <div style={{ fontSize: 12, color: "var(--subtle)" }}>Nenhum time cadastrado ainda.</div>}
              </div>
              <button className="btn btn-sec btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} type="button" onClick={() => dispararAcao("Cobrança enviada a quem não leu.")}>Cobrar quem não leu</button>
              {actionMsg && view === "mural" && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--olive-soft)", textAlign: "right" }}>✓ {actionMsg}</div>}
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
                <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
                  <button className="btn btn-pri btn-sm" type="button" onClick={() => dispararAcao("Notificação reenviada à equipe.")}>Reenviar notificação</button>
                  <VerQuemLeuButton aviso={selAviso} reads={announcementReads} people={people} />
                </div>
                {actionMsg && view === "avisos" && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--olive-soft)" }}>✓ {actionMsg}</div>}
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

/* datas de produção vêm em YYYY-MM-DD (coluna `date` do Postgres) ou DD/MM/YYYY
   (mock de /service/demo) — tolera as duas. */
function parseFlexDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1]);
  return null;
}

const CAL_MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const CAL_SEM = ["D", "S", "T", "Q", "Q", "S", "S"];

type CalEvent = { date: Date; label: string; sub?: string; tone?: "olive" | "amber"; onClick?: () => void };

/* calendário mensal reaproveitável (perfil da pessoa e Espaços & Salas). */
function MiniCalendar({ events, onAdd }: { events: CalEvent[]; onAdd?: (dateStr: string) => void }) {
  const initial = events[0]?.date ?? new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [selDay, setSelDay] = useState<number | null>(null);

  const changeMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m); setYear(y); setSelDay(null);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = new Date(year, month, 1).getDay();
  const byDay = new Map<number, CalEvent[]>();
  events.forEach((e) => {
    if (e.date.getFullYear() === year && e.date.getMonth() === month) {
      const d = e.date.getDate();
      byDay.set(d, [...(byDay.get(d) ?? []), e]);
    }
  });
  const cells: Array<number | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const selEvents = selDay ? byDay.get(selDay) ?? [] : [];

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => changeMonth(-1)}>‹</button>
        <span className="cal-title">{CAL_MESES_FULL[month]} {year}</span>
        <button type="button" className="cal-nav" onClick={() => changeMonth(1)}>›</button>
      </div>
      <div className="cal-grid">
        {CAL_SEM.map((s, i) => <span key={`h${i}`} className="cal-dow">{s}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} className="cal-cell empty" />;
          const has = byDay.get(d);
          return (
            <button type="button" key={`d${d}`} className={`cal-cell${has ? " has" : ""}${selDay === d ? " sel" : ""}`} onClick={() => setSelDay(d)}>
              <span className="cal-num">{d}</span>
              {has && <span className="cal-dots">{has.slice(0, 3).map((e, k) => <i key={k} className={`cal-dot${e.tone === "amber" ? " amber" : ""}`} />)}</span>}
            </button>
          );
        })}
      </div>
      <div className="cal-agenda">
        {!selDay && <div className="cal-agenda-empty">Toque num dia para ver os compromissos.</div>}
        {selDay && selEvents.length === 0 && <div className="cal-agenda-empty">Nada em {selDay} de {CAL_MESES_FULL[month]}.</div>}
        {selEvents.map((e, i) => (
          <button type="button" key={i} className="cal-ev" onClick={() => e.onClick?.()}>
            <span className={`cal-ev-bar${e.tone === "amber" ? " amber" : ""}`} />
            <div className="cal-ev-main">
              <div className="cal-ev-label">{e.label}</div>
              {e.sub && <div className="cal-ev-sub">{e.sub}</div>}
            </div>
          </button>
        ))}
        {selDay && onAdd && <button type="button" className="cal-add" onClick={() => onAdd(`${selDay} ${DP_MESES[month].toLowerCase()}`)}>+ Reservar em {selDay} {DP_MESES[month].toLowerCase()}</button>}
      </div>
    </div>
  );
}

const RESERVA_TONE: Record<string, "olive" | "amber"> = { reuniao: "olive", ensaio: "olive", evento: "amber", treinamento: "olive", outro: "olive" };
const RESERVA_TIPOS = [{ v: "reuniao", l: "Reunião" }, { v: "ensaio", l: "Ensaio" }, { v: "evento", l: "Evento" }, { v: "treinamento", l: "Treinamento" }, { v: "outro", l: "Outro" }];

function Espacos({ rooms, reservations, church, setModal, embed }: { rooms: RoomView[]; reservations: ReservationView[]; church?: ChurchView; setModal: (modal: ModalState) => void; embed?: boolean }) {
  const [filter, setFilter] = useState("todas");
  const [reservar, setReservar] = useState<{ salaInicial?: string; dataInicial?: string } | null>(null);
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const visibleReservations = reservations.filter((reservation) => filter === "todas" || reservation.room_id === filter);
  const openNewRoom = () => setModal({ eyebrow: "Criar", title: "Nova sala / espaço", subtitle: "Um espaço físico da igreja disponível para reservas.", saveLabel: "Criar sala", formFields: [{ k:"nome", label:"Nome do espaço", type:"text", req:true, ph:"ex: Sala 3, Salão de festas" }, { k:"capacidade", label:"Capacidade (pessoas)", type:"text", half:true, ph:"ex: 30" }, { k:"local", label:"Onde fica", type:"text", half:true, ph:"ex: 1º andar, Anexo" }, { k:"recursos", label:"Recursos disponíveis", type:"text", ph:"Som, Projeção, Piano", hint:"Separe por vírgula." }], action: { kind: "room" } });
  const openNewReservation = () => setReservar({ salaInicial: filter !== "todas" ? filter : undefined });
  const header = embed ? (
    <div className="cfg-card-head-row">
      <div>
        <div className="cfg-card-t">Espaços & reservas</div>
        <div className="cfg-card-s">Salas da igreja e quem usa cada espaço. Reuniões, eventos, cursos e ensaios reservam aqui sem misturar agenda.</div>
      </div>
      <div className="ph-actions">
        <button className="btn btn-sec btn-sm" type="button" onClick={openNewRoom}>+ Nova sala</button>
        <button className="btn btn-pri btn-sm" type="button" onClick={openNewReservation}>+ Reservar</button>
      </div>
    </div>
  ) : (
    <PageHead
      title="Espaços & reservas"
      eyebrow="Operação"
      subtitle="Salas da igreja e quem usa cada espaço. Reuniões, eventos, cursos e ensaios reservam aqui sem misturar agenda."
      action={<><button className="btn btn-sec" type="button" onClick={openNewRoom}>+ Nova sala</button><button className="btn btn-pri" type="button" onClick={openNewReservation}>+ Reservar espaço</button></>}
    />
  );
  const calEvents: CalEvent[] = visibleReservations.map((reservation): CalEvent | null => {
    const room = roomById.get(reservation.room_id);
    const date = parseFlexDate(reservation.reserved_date);
    return date ? {
      date,
      label: reservation.title,
      sub: `${room?.name || "Sala"} · ${reservation.start_time || "sem início"} até ${reservation.end_time || "sem fim"}`,
      tone: RESERVA_TONE[reservation.kind || "outro"] ?? "olive",
    } : null;
  }).filter((e): e is CalEvent => e !== null);
  const inner = (
    <>
      {header}
      <div className="sala-grid">
        {rooms.map((room) => {
          const count = reservations.filter((reservation) => reservation.room_id === room.id).length;
          return <button key={room.id} className={`sala-card ${filter === room.id ? "on" : ""}`} type="button" onClick={() => setFilter(filter === room.id ? "todas" : room.id)}><div className="sala-card-top"><span className="sala-mark"><Icon name="config" size={18} /></span><span className="sala-cap">{room.capacity ?? 0} <small>lugares</small></span></div><div className="sala-nome">{room.name}</div><div className="sala-local">{room.location || "Local não informado"}</div>{room.resources.length ? <div className="sala-rec">{room.resources.map((resource) => <span className="tag" key={resource}>{resource}</span>)}</div> : null}<div className="sala-foot">{count} reserva(s)</div></button>;
        })}
        {rooms.length === 0 ? <div className="empty">Nenhuma sala cadastrada ainda.</div> : null}
      </div>
      <div className="esp-cal-wrap" style={{ marginTop: 20 }}>
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <span className="panel-meta">Calendário de reservas{filter !== "todas" ? <> · <b style={{ color: "var(--light)" }}>{roomById.get(filter)?.name}</b></> : ""}</span>
          <div className="tb-spacer" />
          {filter !== "todas" && <button className="btn btn-ghost btn-sm" type="button" onClick={() => setFilter("todas")}>Ver todas as salas</button>}
        </div>
        <MiniCalendar events={calEvents} onAdd={(dataStr) => setReservar({ salaInicial: filter !== "todas" ? filter : undefined, dataInicial: dataStr })} />
        <div className="cal-legend">
          {RESERVA_TIPOS.map((t) => <span key={t.v} className="cal-legend-i"><i className={`cal-dot ${RESERVA_TONE[t.v] === "amber" ? "amber" : ""}`} />{t.l}</span>)}
        </div>
      </div>
      {reservar && church && <ReservaModal rooms={rooms} reservations={reservations} church={church} salaInicial={reservar.salaInicial} dataInicial={reservar.dataInicial} onClose={() => setReservar(null)} />}
    </>
  );
  return embed ? inner : <div className="content wide">{inner}</div>;
}

function ReservaModal({ rooms, reservations, church, salaInicial, dataInicial, onClose }: { rooms: RoomView[]; reservations: ReservationView[]; church: ChurchView; salaInicial?: string; dataInicial?: string; onClose: () => void }) {
  const router = useRouter();
  const [salaId, setSalaId] = useState(salaInicial || rooms[0]?.id || "");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("reuniao");
  const [data, setData] = useState(dataInicial || "");
  const [inicio, setInicio] = useState("19h00");
  const [fim, setFim] = useState("21h00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isoDate = data ? dpToIsoDate(data) : null;
  const conflito = salaId && isoDate ? findRoomConflict(reservations, salaId, isoDate, inicio, fim) : null;

  const salvar = async () => {
    if (!titulo.trim()) { setError("Dê um nome ao compromisso."); return; }
    if (!isoDate) { setError("Escolha o dia no calendário."); return; }
    if (conflito) { setError(`Já existe "${conflito.title}" nesta sala em ${conflito.start_time}–${conflito.end_time}.`); return; }
    setSaving(true);
    setError("");
    await createServiceBrowserClient().schema("service").from("reservations").insert({
      organization_id: church.organizationId,
      room_id: salaId,
      title: titulo.trim(),
      kind: tipo,
      reserved_date: isoDate,
      start_time: inicio,
      end_time: fim,
    });
    router.refresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Reservar espaço</div>
          <div className="modal-title">Novo compromisso na sala</div>
          <div className="modal-sub">Não deixamos duas reservas se cruzarem no mesmo espaço e horário.</div>
        </div>
        <div className="modal-body">
          <div className="field"><label className="field-label">Título</label><input className="input" placeholder="ex: Reunião de líderes" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="field field-half">
            <label className="field-label">Sala</label>
            <select className="select" value={salaId} onChange={(e) => setSalaId(e.target.value)}>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.capacity ? ` · ${room.capacity} lug.` : ""}</option>)}
            </select>
          </div>
          <div className="field field-half">
            <label className="field-label">Tipo</label>
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {RESERVA_TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="field field-half"><label className="field-label">Dia</label><DatePicker value={data} onChange={setData} /></div>
          <div className="field field-half"><label className="field-label">Início</label><TimePicker value={inicio} onChange={setInicio} /></div>
          <div className="field field-half"><label className="field-label">Fim</label><TimePicker value={fim} onChange={setFim} /></div>
          {conflito ? <div className="reserva-warn" style={{ gridColumn: "1 / -1" }}><Icon name="alerta" size={14} /> Já existe &quot;{conflito.title}&quot; aqui em {conflito.start_time}–{conflito.end_time}.</div> : null}
          {error ? <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "var(--danger)" }}>{error}</div> : null}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving || !!conflito} onClick={salvar}>Reservar</button>
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

function normCat(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const CURSO_FILTROS = [
  { v: "todos", l: "Todos" },
  { v: "trilha", l: "Trilhas" },
  { v: "conteudo", l: "Conteúdo" },
  { v: "presencial", l: "Presenciais" },
] as const;

function CursosTrilhas({
  courses, enrollments, courseModules, courseLessons, lessonAttendance, members, church,
}: {
  courses: CourseView[];
  enrollments: EnrollmentView[];
  courseModules: ModuleView[];
  courseLessons: LessonView[];
  lessonAttendance: LessonAttendanceView[];
  members: MemberView[];
  church?: ChurchView;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [view, setView] = useState<"galeria" | "org">("galeria");
  const [filtro, setFiltro] = useState<(typeof CURSO_FILTROS)[number]["v"]>("todos");
  const [novoGrupo, setNovoGrupo] = useState<string | null>(null);

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

  const totMatric = enrollments.length;
  const totConcl = enrollments.filter((e) => e.status === "concluido").length;
  const liderancaIds = new Set(courses.filter((c) => c.category && normCat(c.category) === "lideranca").map((c) => c.id));
  const emFormacao = enrollments.filter((e) => liderancaIds.has(e.course_id)).length;
  const cursos = courses.filter((c) => filtro === "todos" || c.kind === filtro);

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

      <div className="kpi-row">
        <Kpi icon="cursos" label="Cursos ativos" value={courses.length} foot="trilhas, conteúdo e presenciais" />
        <Kpi icon="membros" label="Matrículas" value={totMatric} foot="pessoas cursando agora" />
        <Kpi icon="ok" label="Conclusões" value={totConcl} foot={totMatric ? `${Math.round((totConcl / totMatric) * 100)}% de conclusão` : "sem matrículas ainda"} />
        <Kpi icon="times" label="Em formação de líderes" value={emFormacao} foot="na trilha de liderança" />
      </div>

      <div className="toolbar" style={{ marginBottom: 18 }}>
        <div className="seg-check">
          <button className={`seg-chip${view === "galeria" ? " on" : ""}`} type="button" onClick={() => setView("galeria")}>Galeria</button>
          <button className={`seg-chip${view === "org" ? " on" : ""}`} type="button" onClick={() => setView("org")}>Organizar</button>
        </div>
        {view === "galeria" && (
          <div className="seg-check">
            {CURSO_FILTROS.map((f) => (
              <button key={f.v} className={`seg-chip${filtro === f.v ? " on" : ""}`} type="button" onClick={() => setFiltro(f.v)}>{f.l}</button>
            ))}
          </div>
        )}
      </div>

      {view === "galeria" ? (
        <div className="team-grid">
          {cursos.map((course) => {
            const courseEnrollments = enrollments.filter((item) => item.course_id === course.id);
            const concluded = courseEnrollments.filter((item) => item.status === "concluido").length;
            const pct = courseEnrollments.length ? Math.round((concluded / courseEnrollments.length) * 100) : 0;
            return (
              <button
                className="team-card"
                type="button"
                key={course.id}
                onClick={() => setViewingId(course.id)}
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
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
          {cursos.length === 0 && <div className="empty">Nenhuma trilha interna criada ainda.</div>}
        </div>
      ) : (
        <CursoBuilder
          courses={courses}
          church={church}
          onOpenEditor={(id) => setEditingId(id)}
          onOpenDrawer={(id) => setViewingId(id)}
          novoGrupo={novoGrupo}
          setNovoGrupo={setNovoGrupo}
        />
      )}

      {viewingId && (() => {
        const course = courses.find((c) => c.id === viewingId);
        if (!course || !church) return null;
        return (
          <CursoDrawer
            course={course}
            allCourses={courses}
            modules={courseModules}
            lessons={courseLessons}
            enrollments={enrollments}
            lessonAttendance={lessonAttendance}
            members={members}
            church={{ id: church.id, organizationId: church.organizationId }}
            onClose={() => setViewingId(null)}
            onEdit={() => { setViewingId(null); setEditingId(course.id); }}
          />
        );
      })()}
    </div>
  );
}

function CursoBuilderColuna({
  id, nome, lista, allCourses, drag, setDrag, mover, onOpenEditor, onOpenDrawer,
}: {
  id: string | null;
  nome: string;
  lista: CourseView[];
  allCourses: CourseView[];
  drag: string | null;
  setDrag: (id: string | null) => void;
  mover: (courseId: string, categoria: string | null) => void;
  onOpenEditor: (id: string | "new") => void;
  onOpenDrawer: (id: string) => void;
}) {
  return (
    <div
      className="cb-col"
      onDragOver={(e) => { if (drag) e.preventDefault(); }}
      onDrop={() => { if (drag) mover(drag, id); setDrag(null); }}
    >
      <div className="cb-col-head">
        <div className="cb-col-name">{nome}</div>
        <span className="cb-col-n">{lista.length}</span>
      </div>
      <div className="cb-col-body">
        {lista.map((c) => (
          <button
            className="cb-card"
            type="button"
            key={c.id}
            draggable
            onDragStart={() => setDrag(c.id)}
            onDragEnd={() => setDrag(null)}
            onClick={() => onOpenDrawer(c.id)}
          >
            <div className={`cb-card-bar tone-${c.color ?? "olive"}`} />
            <div className="cb-card-main">
              <div className="cb-card-name">{c.name}</div>
              {c.prereqs.length > 0 && (
                <div className="cb-req">
                  exige: {c.prereqs.map((pid) => allCourses.find((x) => x.id === pid)?.name).filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </button>
        ))}
        {id && <button className="cb-add" type="button" onClick={() => onOpenEditor("new")}>+ curso neste grupo</button>}
      </div>
    </div>
  );
}

function CursoBuilder({
  courses, church, onOpenEditor, onOpenDrawer, novoGrupo, setNovoGrupo,
}: {
  courses: CourseView[];
  church?: ChurchView;
  onOpenEditor: (id: string | "new") => void;
  onOpenDrawer: (id: string) => void;
  novoGrupo: string | null;
  setNovoGrupo: (v: string | null) => void;
}) {
  const router = useRouter();
  const [drag, setDrag] = useState<string | null>(null);
  const [nomeGrupo, setNomeGrupo] = useState("");

  const grupos = church?.settings?.cursoGrupos ?? [];
  const knownIds = new Set(grupos.map((g) => g.id));
  const categoriasExtras = Array.from(
    new Set(courses.map((c) => c.category).filter((c): c is string => !!c && !knownIds.has(c))),
  );
  const colunas = [...grupos, ...categoriasExtras.map((id) => ({ id, nome: id }))];
  const semGrupo = courses.filter((c) => !c.category);

  const mover = async (courseId: string, categoria: string | null) => {
    if (!church) return;
    await createServiceBrowserClient().schema("service").from("courses").update({ category: categoria }).eq("id", courseId);
    router.refresh();
  };

  const criarGrupo = async () => {
    if (!church || !nomeGrupo.trim()) return;
    const id = normCat(nomeGrupo.trim()).replace(/\s+/g, "-");
    const next = [...grupos, { id, nome: nomeGrupo.trim() }];
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, cursoGrupos: next } }).eq("id", church.id);
    setNomeGrupo("");
    setNovoGrupo(null);
    router.refresh();
  };

  return (
    <div className="cb-board">
      {colunas.map((g) => (
        <CursoBuilderColuna
          key={g.id}
          id={g.id}
          nome={g.nome}
          lista={courses.filter((c) => c.category === g.id)}
          allCourses={courses}
          drag={drag}
          setDrag={setDrag}
          mover={mover}
          onOpenEditor={onOpenEditor}
          onOpenDrawer={onOpenDrawer}
        />
      ))}
      <CursoBuilderColuna
        id={null}
        nome="Sem grupo"
        lista={semGrupo}
        allCourses={courses}
        drag={drag}
        setDrag={setDrag}
        mover={mover}
        onOpenEditor={onOpenEditor}
        onOpenDrawer={onOpenDrawer}
      />
      <div className="cb-col" style={{ justifyContent: "center", padding: 12 }}>
        {novoGrupo !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              className="input"
              placeholder="Nome do grupo"
              value={nomeGrupo}
              onChange={(e) => setNomeGrupo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarGrupo()}
              autoFocus
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-pri btn-sm" type="button" onClick={criarGrupo}>Criar</button>
              <button className="btn btn-sec btn-sm" type="button" onClick={() => { setNovoGrupo(null); setNomeGrupo(""); }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="cb-add" type="button" onClick={() => setNovoGrupo("")}>+ Novo grupo</button>
        )}
      </div>
    </div>
  );
}

const PRIO_COLOR: Record<string, string> = {
  alta: "var(--danger)",
  media: "var(--amber)",
  baixa: "var(--olive)",
};

function isDoneColumn(colId: string, columns: BoardView["columns"]) {
  const col = columns.find((c) => c.id === colId);
  const label = (col?.nome ?? col?.name ?? col?.id ?? "").toLowerCase();
  return col?.id === "done" || label.includes("conclu");
}

function isCardAtrasado(card: CardView, columns: BoardView["columns"]) {
  if (!card.due || isDoneColumn(card.column_id, columns)) return false;
  try { return new Date(card.due) < new Date(); } catch { return false; }
}

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
  ministries,
  church,
  perm,
  currentPersonId,
  onClose,
  onMoveParent,
  onRefresh,
}: {
  card: CardView;
  board: BoardView;
  columns: { id: string; name: string }[];
  people: PersonView[];
  ministries: MinistryView[];
  church: ChurchView | undefined;
  perm: { criarCard: boolean; comentar: boolean; editarBoard: boolean; moverQualquer: boolean };
  currentPersonId: string | null;
  onClose: () => void;
  onMoveParent: (cardId: string, colId: string) => void;
  onRefresh: () => void;
}) {
  const boardMinistry = ministries.find((m) => m.id === board.ministry_id);
  const candidatos = board.ministry_id
    ? people.filter((p) => boardMinistry?.people.some((link) => link.personId === p.id))
    : people;
  const [lc, setLc] = useState(initCard);
  const [comments, setComments] = useState<{ id: string; author: string; body: string; created_at: string }[]>([]);
  const [commentText, setCommentText] = useState("");
  const canMove = perm.moverQualquer || (currentPersonId != null && lc.assignees.includes(currentPersonId));

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
                  onClick={() => {
                    if (col.id === lc.column_id) return;
                    if (!canMove) { window.alert("Você só move cards onde é responsável."); return; }
                    mutate({ column_id: col.id }); onMoveParent(lc.id, col.id);
                  }}>
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
              {candidatos.slice(0, 12).map((p) => {
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
            {perm.comentar ? (
              <div className="kb-coment-add">
                <input className="input" placeholder="Escreva um comentário..." value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()} />
                <button className="btn btn-sec btn-sm" type="button" onClick={addComment}>Enviar</button>
              </div>
            ) : null}
          </div>

          {perm.editarBoard ? <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 8 }} onClick={deleteCard}>Excluir card</button> : null}
        </div>
      </div>
    </>
  );
}

function NovoCard({
  board,
  colId,
  people,
  ministries,
  church,
  onClose,
  onRefresh,
}: {
  board: BoardView;
  colId: string;
  people: PersonView[];
  ministries: MinistryView[];
  church: ChurchView;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const boardMinistry = ministries.find((m) => m.id === board.ministry_id);
  const candidatos = board.ministry_id
    ? people.filter((p) => boardMinistry?.people.some((link) => link.personId === p.id))
    : people;
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
              {candidatos.slice(0, 12).map((p) => {
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
  ministries,
  church,
  currentRole,
  currentPersonId,
  onBack,
  onMoveCard,
  onRefresh,
}: {
  board: BoardView;
  boardCards: CardView[];
  people: PersonView[];
  peopleById: Map<string, PersonView>;
  ministries: MinistryView[];
  church: ChurchView | undefined;
  currentRole: "master" | "pastor" | "lider" | "vol";
  currentPersonId: string | null;
  onBack: () => void;
  onMoveCard: (cardId: string, colId: string) => void;
  onRefresh: () => void;
}) {
  const perm = kanbanPerm(currentRole);
  const [openCard, setOpenCard] = useState<CardView | null>(null);
  const [novoCol, setNovoCol] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fPrio, setFPrio] = useState("todas");
  const [fEstado, setFEstado] = useState("todos");

  const columns = board.columns.length
    ? board.columns.map((c) => ({ id: c.id, name: c.nome ?? c.name ?? c.id }))
    : [{ id: "todo", name: "A fazer" }, { id: "doing", name: "Em andamento" }, { id: "done", name: "Concluído" }];

  const isAtrasado = (c: CardView) => isCardAtrasado(c, board.columns);
  const isParado = (c: CardView) => (c.moved_days_ago ?? 0) > 7;

  const match = (c: CardView) => {
    if (q && !c.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (fPrio !== "todas" && c.priority !== fPrio) return false;
    if (fEstado === "atrasados" && !isAtrasado(c)) return false;
    if (fEstado === "parados" && !isParado(c)) return false;
    if (fEstado === "meus" && !(currentPersonId && c.assignees.includes(currentPersonId))) return false;
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
          {([["todos", "Todos"], ["meus", "Meus"], ["atrasados", `Atrasados${atrasados ? ` ${atrasados}` : ""}`], ["parados", `Parados${parados ? ` ${parados}` : ""}`]] as [string, string][]).map(([k, l]) => (
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
              onDrop={() => {
                if (!drag) return;
                const dragged = boardCards.find((c) => c.id === drag);
                if (!perm.moverQualquer && !(dragged && currentPersonId && dragged.assignees.includes(currentPersonId))) {
                  window.alert("Você só move cards onde é responsável.");
                  setDrag(null);
                  return;
                }
                onMoveCard(drag, col.id);
                setDrag(null);
              }}>
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
                {perm.criarCard ? <button className="kb-add" type="button" onClick={() => setNovoCol(col.id)}>+ Card</button> : null}
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
          ministries={ministries}
          church={church}
          perm={perm}
          currentPersonId={currentPersonId}
          onClose={() => setOpenCard(null)}
          onMoveParent={(cardId, colId) => { onMoveCard(cardId, colId); setOpenCard((prev) => prev ? { ...prev, column_id: colId } : null); }}
          onRefresh={onRefresh}
        />
      )}
      {novoCol && church && perm.criarCard && (
        <NovoCard board={board} colId={novoCol} people={people} ministries={ministries} church={church} onClose={() => setNovoCol(null)} onRefresh={onRefresh} />
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
  currentRole,
  currentPersonId,
  scopeMinistryIds,
  setModal,
}: {
  boards: BoardView[];
  cards: CardView[];
  ministries: MinistryView[];
  people: PersonView[];
  church: ChurchView | undefined;
  currentRole: "master" | "pastor" | "lider" | "vol";
  currentPersonId: string | null;
  scopeMinistryIds: string[] | null;
  setModal: (modal: ModalState) => void;
}) {
  const router = useRouter();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<CardView[]>(cards);

  useEffect(() => { setLocalCards(cards); }, [cards]);

  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const peopleById = new Map(people.map((p) => [p.id, p]));

  /* líder (real ou pré-visualizando) só vê os quadros do próprio time; quadros
     "gerais" (sem time dono) são só da Direção — equivalente a kanban.jsx:44. */
  const visibleBoards = scopeMinistryIds
    ? boards.filter((board) => board.ministry_id && scopeMinistryIds.includes(board.ministry_id))
    : boards;

  const moverCard = async (cardId: string, colId: string) => {
    setLocalCards((prev) => prev.map((c) => c.id === cardId ? { ...c, column_id: colId } : c));
    await createServiceBrowserClient().schema("service").from("cards").update({ column_id: colId }).eq("id", cardId);
    router.refresh();
  };

  const selected = visibleBoards.find((b) => b.id === boardId);

  if (selected) {
    return (
      <BoardView
        board={selected}
        boardCards={localCards.filter((c) => c.board_id === selected.id)}
        people={people}
        peopleById={peopleById}
        ministries={ministries}
        church={church}
        currentRole={currentRole}
        currentPersonId={currentPersonId}
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
          <p className="ph-sub">{scopeMinistryIds ? `Os quadros do ${ministries.find((m) => m.id === scopeMinistryIds[0])?.name ?? "seu time"}. A Direção vê todos.` : "Um quadro por time ou da Direção. Cada tarefa é um card com responsável, prazo e status."}</p>
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
        {visibleBoards.map((board) => {
          const ministry = board.ministry_id ? ministryById.get(board.ministry_id) : null;
          const boardCards = localCards.filter((c) => c.board_id === board.id);
          const doneCol = board.columns.find((col) => (col.nome ?? col.name ?? col.id).toLowerCase().includes("conclu") || col.id === "done");
          const feitos = doneCol ? boardCards.filter((c) => c.column_id === doneCol.id).length : 0;
          const pct = boardCards.length ? Math.round((feitos / boardCards.length) * 100) : 0;
          const atrasados = boardCards.filter((c) => isCardAtrasado(c, board.columns)).length;
          return (
            <button className="bd-card" key={board.id} type="button" onClick={() => setBoardId(board.id)}>
              <div className="bd-card-top">
                <div className="bd-mark"><Icon name="times" size={18} /></div>
                {atrasados > 0 && <span className="chip chip-no">{atrasados} atrasado(s)</span>}
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
        {visibleBoards.length === 0 && <div className="empty">Nenhum quadro criado ainda.</div>}
      </div>
    </div>
  );
}

function NovaConversaModal({
  members,
  church,
  currentPersonId,
  initialSelectedMemberIds,
  onClose,
  onCreated,
}: {
  members: MemberView[];
  church: ChurchView | undefined;
  currentPersonId: string | null;
  initialSelectedMemberIds?: string[];
  onClose: () => void;
  onCreated: (chatId: string) => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"dm" | "grupo">("dm");
  const [nome, setNome] = useState("");
  const [sel, setSel] = useState<string[]>(initialSelectedMemberIds ?? []);
  const [primeiraMsg, setPrimeiraMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const eu = members.find((m) => m.volunteerId === currentPersonId)?.id ?? null;
  const candidatos = members.filter((m) => m.id !== eu);
  const isGrupo = tipo === "grupo" || sel.length > 1;

  const tog = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const criar = async () => {
    if (sel.length === 0) { setError("Escolha pelo menos uma pessoa."); return; }
    if (!church?.organizationId || !church.id) { setError("Nenhuma igreja encontrada para vincular esta conversa."); return; }
    setSaving(true);
    setError("");
    const supabase = createServiceBrowserClient();
    const { data: chatRow, error: chatError } = await supabase.schema("service").from("chats").insert({
      organization_id: church.organizationId,
      church_id: church.id,
      kind: isGrupo ? "grupo" : "dm",
      name: isGrupo ? (nome.trim() || "Novo grupo") : null,
    }).select("id").single();
    if (chatError || !chatRow) {
      setSaving(false);
      setError(chatError?.message ?? "Não foi possível criar a conversa.");
      return;
    }
    const participantIds = [...new Set([...(eu ? [eu] : []), ...sel])];
    await supabase.schema("service").from("chat_members").insert(
      participantIds.map((memberId) => ({ organization_id: church.organizationId, chat_id: chatRow.id, member_id: memberId })),
    );
    if (primeiraMsg.trim()) {
      await supabase.schema("service").from("messages").insert({
        organization_id: church.organizationId,
        chat_id: chatRow.id,
        sender_id: eu,
        body: primeiraMsg.trim(),
      });
      const senderName = members.find((m) => m.id === eu)?.name ?? "Alguém";
      notifyPush(church.organizationId, sel.filter((id) => id !== eu), senderName, primeiraMsg.trim());
    }
    router.refresh();
    onCreated(chatRow.id);
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Nova conversa</div>
          <div className="modal-title">Chamar para conversar</div>
          <div className="modal-sub">Fale com alguém em particular ou crie um grupo com parte da equipe.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field">
            <label className="field-label">Tipo</label>
            <div className="seg">
              <button type="button" className={tipo === "dm" ? "on" : ""} onClick={() => setTipo("dm")}>Individual</button>
              <button type="button" className={tipo === "grupo" ? "on" : ""} onClick={() => setTipo("grupo")}>Em grupo</button>
            </div>
          </div>
          {isGrupo && (
            <div className="field">
              <label className="field-label">Nome do grupo</label>
              <input className="input" value={nome} placeholder="ex: Apoio do domingo" onChange={(e) => setNome(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label className="field-label">Quem participa</label>
            <div className="cand-pick">
              {candidatos.map((m) => {
                const on = sel.includes(m.id);
                return (
                  <button key={m.id} type="button" className={`cand-chip ${on ? "on" : ""}`} onClick={() => tog(m.id)}>
                    <Av name={m.name} size="xs" /> {m.name.split(" ")[0]} {on && "✓"}
                  </button>
                );
              })}
              {candidatos.length === 0 && <span style={{ fontSize: 12.5, color: "var(--subtle)" }}>Nenhum membro disponível.</span>}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Primeira mensagem (opcional)</label>
            <textarea className="textarea" value={primeiraMsg} placeholder="..." onChange={(e) => setPrimeiraMsg(e.target.value)} />
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--danger)" }}>{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={criar}>{saving ? "Criando…" : "Iniciar conversa"}</button>
        </div>
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
  church,
  currentPersonId,
  scopeMinistryIds,
  pendingChatMemberId,
  onConsumePendingChatMember,
}: {
  chats: ChatView[];
  chatMembers: ChatMemberView[];
  messages: MessageView[];
  ministries: MinistryView[];
  members: MemberView[];
  church: ChurchView | undefined;
  currentPersonId: string | null;
  scopeMinistryIds: string[] | null;
  pendingChatMemberId?: string | null;
  onConsumePendingChatMember?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const memberById = new Map(members.map((member) => [member.id, member]));

  /* privacidade: só quem de fato participa vê a conversa, sem exceção de papel
     (inclusive Direção) — equivalente a S.chatsDaView() em
     evolucoes/service_app/data-chat.js:65-70. */
  const currentMember = members.find((member) => member.volunteerId === currentPersonId) ?? null;
  const visibleChats = currentMember
    ? chats.filter((c) => chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === currentMember.id))
    : [];

  /* "Enviar mensagem" num drawer de pessoa/membro cai aqui já mirando alguém:
     reaproveita a DM existente com essa pessoa se houver, senão abre "Nova conversa"
     pré-selecionada, em vez de sempre criar uma conversa duplicada. */
  useEffect(() => {
    if (!pendingChatMemberId || !currentMember) return;
    const existingDm = chats.find((c) => (
      c.kind === "dm"
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === pendingChatMemberId)
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === currentMember.id)
    ));
    if (existingDm) {
      setSelected(existingDm.id);
      onConsumePendingChatMember?.();
    } else {
      setNova(true);
    }
  }, [pendingChatMemberId, currentMember, chats, chatMembers, onConsumePendingChatMember]);

  const chat = visibleChats.find((item) => item.id === selected) ?? visibleChats[0] ?? null;
  const selectedMessages = chat ? messages.filter((message) => message.chat_id === chat.id) : [];
  const chatCount = (chatId: string) => chatMembers.filter((member) => member.chat_id === chatId).length;
  const chatName = (item: ChatView) => item.name || (item.ministry_id ? ministryById.get(item.ministry_id)?.name : null) || "Conversa";
  const perspectiveText = scopeMinistryIds
    ? `Canal do ${ministries.find((m) => m.id === scopeMinistryIds[0])?.name ?? "seu time"}, grupos e mensagens diretas da sua equipe. Conversas são privadas: só os envolvidos veem.`
    : "Só as conversas das quais você participa aparecem aqui. Conversas são privadas: só os envolvidos veem.";

  const enviar = async () => {
    if (!texto.trim() || !chat || sending || !currentMember) return;
    setSending(true);
    await createServiceBrowserClient().schema("service").from("messages").insert({
      organization_id: church?.organizationId,
      chat_id: chat.id,
      sender_id: currentMember.id,
      body: texto.trim(),
    });
    if (church?.organizationId) {
      const recipients = chatMembers.filter((cm) => cm.chat_id === chat.id && cm.member_id !== currentMember.id).map((cm) => cm.member_id);
      notifyPush(church.organizationId, recipients, currentMember.name, texto.trim());
    }
    setTexto("");
    router.refresh();
    setSending(false);
  };

  return (
    <div className="content wide">
      <PageHead title="Conversas" eyebrow="Operação" subtitle={perspectiveText} action={<button className="btn btn-pri" type="button" onClick={() => setNova(true)}>+ Nova conversa</button>} />
      <div className="chat-layout">
        <div className="chat-list">{visibleChats.map((item) => <button className={`chat-row ${chat?.id === item.id ? "on" : ""}`} type="button" key={item.id} onClick={() => setSelected(item.id)}><span className="chat-row-ic"><Icon name={item.kind === "time" ? "times" : "membros"} size={16} /></span><span className="chat-row-main"><span className="chat-row-top"><b>{chatName(item)}</b><small>agora</small></span><span className="chat-row-prev">{messages.find((message) => message.chat_id === item.id)?.body || "Canal de alinhamento"}</span></span><span className="chat-row-count">{chatCount(item.id)}</span></button>)}{visibleChats.length === 0 && <div className="empty" style={{ margin: 8 }}>Nenhuma conversa ainda.</div>}</div>
        <div className="chat-main"><div className="chat-head"><span className="chat-head-ic"><Icon name={chat?.kind === "time" ? "times" : "membros"} size={16} /></span><div><div className="chat-head-name">{chat ? chatName(chat) : "Nenhuma conversa"}</div><div className="chat-head-sub">{chat?.kind === "time" ? "Canal do time" : "Grupo"} · {chat ? chatCount(chat.id) : 0} pessoas</div></div></div><div className="chat-thread"><div className="chat-msgs">{selectedMessages.map((message) => { const sender = message.sender_id ? memberById.get(message.sender_id) : null; const isMine = currentMember && message.sender_id === currentMember.id; return <div className={`chat-msg${isMine ? " me" : ""}`} key={message.id}>{sender ? <Av name={sender.name} size="xs" /> : null}<div className="chat-bubble-wrap"><div className="chat-bubble">{message.body}</div><div className="chat-when">{new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>; })}{chat && selectedMessages.length === 0 ? <div className="empty">Nenhuma mensagem nesta conversa.</div> : null}</div><div className="chat-compose"><input className="input" placeholder="Escreva uma mensagem..." value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()} disabled={!chat} /><button className="btn btn-pri btn-sm" type="button" disabled={!chat || sending || !texto.trim()} onClick={enviar}>Enviar</button></div></div></div>
      </div>
      {nova && (
        <NovaConversaModal
          members={members}
          church={church}
          currentPersonId={currentPersonId}
          initialSelectedMemberIds={pendingChatMemberId ? [pendingChatMemberId] : undefined}
          onClose={() => { setNova(false); onConsumePendingChatMember?.(); }}
          onCreated={(id) => { setSelected(id); onConsumePendingChatMember?.(); }}
        />
      )}
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
  boards,
  chats,
  visitors,
  roster,
  eventAttendance,
  fellowshipGroups,
  confirmationRate,
  setRoute,
  church,
}: {
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  boards: BoardView[];
  chats: ChatView[];
  visitors: VisitorView[];
  roster: RosterAssignmentView[];
  eventAttendance: EventAttendanceView[];
  fellowshipGroups: FellowshipGroupView[];
  confirmationRate: number;
  setRoute: (route: keyof typeof ROUTES) => void;
  church: ChurchView | undefined;
}) {
  const gruposAtivo = church?.settings?.gruposCfg?.ativo ?? true;
  const gruposSigla = church?.settings?.gruposCfg?.sigla ?? "GC";
  const hoje = Date.now();
  const diasAtras = (iso: string) => (hoje - new Date(iso).getTime()) / 86400000;

  /* membros na rede: delta = novos nos últimos 30 dias vs. 30 dias anteriores (member.createdAt real) */
  const membrosDelta = members.filter((m) => diasAtras(m.createdAt) <= 30).length - members.filter((m) => diasAtras(m.createdAt) > 30 && diasAtras(m.createdAt) <= 60).length;

  /* retenção de visitantes: % que viraram membro, comparando uma safra madura (60-120 dias, já teve tempo real de converter) com a safra anterior (120-220 dias) */
  const retencaoAtual = visitors.length ? Math.round((visitors.filter((v) => v.stage === "membro").length / visitors.length) * 100) : 0;
  const retencaoPeriodo = (min: number, max: number) => {
    const cohort = visitors.filter((v) => diasAtras(v.created_at) >= min && diasAtras(v.created_at) < max);
    return cohort.length ? Math.round((cohort.filter((v) => v.stage === "membro").length / cohort.length) * 100) : null;
  };
  const retencaoRecente = retencaoPeriodo(60, 120);
  const retencaoAnterior = retencaoPeriodo(120, 220);
  const retencaoDelta = retencaoRecente !== null && retencaoAnterior !== null ? retencaoRecente - retencaoAnterior : null;

  /* cobertura de escala: mesma fórmula global de confirmationRate, com delta comparando eventos dos últimos 30 dias x 30 dias anteriores */
  const eventById = new Map(events.map((e) => [e.id, e]));
  const coberturaPeriodo = (min: number, max: number) => {
    const assignments = roster.filter((a) => { const ev = eventById.get(a.event_id); return ev && diasAtras(ev.eventDate) >= min && diasAtras(ev.eventDate) < max; });
    return assignments.length ? Math.round((assignments.filter((a) => a.status === "ok").length / assignments.length) * 100) : null;
  };
  const coberturaRecente = coberturaPeriodo(0, 30);
  const coberturaAnterior = coberturaPeriodo(30, 60);
  const coberturaDelta = coberturaRecente !== null && coberturaAnterior !== null ? coberturaRecente - coberturaAnterior : null;

  /* frequência média: check-ins reais (event_attendance) por culto nos últimos 30 dias x 30 dias anteriores */
  const cultoIds = new Set(events.filter((e) => e.kind.toLowerCase() === "culto").map((e) => e.id));
  const frequenciaPeriodo = (min: number, max: number) => {
    const cultosPeriodo = events.filter((e) => cultoIds.has(e.id) && diasAtras(e.eventDate) >= min && diasAtras(e.eventDate) < max);
    if (!cultosPeriodo.length) return null;
    const total = cultosPeriodo.reduce((sum, ev) => sum + eventAttendance.filter((a) => a.event_id === ev.id).length, 0);
    return Math.round(total / cultosPeriodo.length);
  };
  const freqRecente = frequenciaPeriodo(0, 30);
  const freqAnterior = frequenciaPeriodo(30, 60);
  const freqDelta = freqRecente !== null && freqAnterior !== null ? freqRecente - freqAnterior : null;
  const cultosTodos = events.filter((e) => cultoIds.has(e.id));
  const freqGeral = cultosTodos.length ? Math.round(cultosTodos.reduce((sum, ev) => sum + eventAttendance.filter((a) => a.event_id === ev.id).length, 0) / cultosTodos.length) : 0;

  const foot = (delta: number | null, unidade: string, fallback: string) => delta === null ? fallback : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}${unidade} vs. 30d anteriores`;

  /* termômetro de bem-estar sem sobreposição: carga real da semana via roster, não engajamento alto ‒
     equivalente a bemEstar() em evolucoes/service_app/relatorios.jsx:19-27, sem o override de sinais (mock-only) */
  const carga = cargaDaSemana(roster, events);
  const nivelDe = (p: PersonView): "saudavel" | "atencao" | "sobrecarga" | "afastando" => {
    const { escalas = 0, recusas = 0 } = carga[p.id] ?? {};
    if (p.status === "pausa") return "afastando";
    if (recusas >= 1 && (p.engagement ?? 0) < 75) return "afastando";
    if (escalas >= 3) return "sobrecarga";
    if ((p.engagement ?? 0) < 70 || escalas === 0) return "atencao";
    return "saudavel";
  };
  const niveis = people.map((p) => ({ person: p, nivel: nivelDe(p) }));
  const contar = (n: string) => niveis.filter((v) => v.nivel === n).length;
  const NIVEL_TAG: Record<string, string> = { atencao: "Atenção", sobrecarga: "Sobrecarga", afastando: "Afastando" };
  const wellRows = niveis.filter((v) => v.nivel !== "saudavel").map(({ person, nivel }) => ({ person, cls: nivel, tag: NIVEL_TAG[nivel] }));

  const series = [members.length - 5, members.length - 3, members.length - 2, members.length].map((v) => Math.max(0, v));
  const maxMinistry = Math.max(...ministries.map((m) => m.people.length), 1);
  const gcCounts = fellowshipGroups.map((g) => ({ group: g, n: members.filter((m) => m.groupId === g.id).length }));
  const maxGc = Math.max(...gcCounts.map((x) => x.n), 1);
  const maxOps = Math.max(boards.length, chats.length, events.length, 1);
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
      <div className="kpi-row"><Kpi icon="membros" label="Membros na rede" value={members.length} foot={foot(membrosDelta, " novos", "cadastrados")} /><Kpi icon="visitante" label="Retenção de visitantes" value={`${retencaoAtual}%`} foot={foot(retencaoDelta, "%", "viram membros")} /><Kpi icon="escalas" label="Cobertura de escala" value={`${confirmationRate}%`} foot={foot(coberturaDelta, "pp", "das posições preenchidas")} /><Kpi icon="cultos" label="Frequência média" value={freqRecente ?? freqGeral} foot={foot(freqDelta, "", "por culto")} /></div>
      <div className="dash-3col">
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={13} /> Crescimento de membros</span><span className="panel-meta">últimos meses</span></div><div className="panel-body"><div style={{ fontSize: 30, fontWeight: 700 }}>{members.length}<span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>membros no total</span></div><div style={{ marginTop: 14 }}><Bars series={series} labels={["mar", "abr", "mai", "jun"]} /></div></div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="visitante" size={13} /> Funil de visitantes</span><button className="panel-link" type="button" onClick={() => setRoute("visitantes")}>Abrir</button></div><div className="panel-body flush">{FUNNEL_STAGES.map((s, i) => <div className="dist-row" key={s.id}><span className="dist-name" style={{ width: 140 }}>{s.label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${Math.max(4, (funnelCounts[i] / funnelMax) * 100)}%` }} /></div><span className="dist-num">{funnelCounts[i]}</span></div>)}</div></div>
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">02</span><span className="label">Termômetro de bem-estar</span><span className="line" /></div>
      <div className="well-sum">{[["saudavel", contar("saudavel"), "Saudável"], ["atencao", contar("atencao"), "Atenção"], ["sobrecarga", contar("sobrecarga"), "Sobrecarga"], ["afastando", contar("afastando"), "Afastando"]].map(([level, count, label]) => <div className="well-pill" key={level}><div className="n">{count}</div><div className="l"><span className={`well-dot ${level}`} />{label}</div></div>)}</div>
      <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={13} /> Quem precisa de atenção</span><button className="panel-link" type="button" onClick={() => setRoute("pessoas")}>Voluntários</button></div><div className="panel-body flush">{(wellRows.length ? wellRows : people.slice(0, 8).map((p) => ({ person: p, cls: "atencao", tag: "Atenção" }))).slice(0, 8).map(({ person, cls, tag }) => <div className="well-row" key={person.id}><Av name={person.name} size="md" /><div className="mini-main"><div className="mini-title">{person.name}</div><div className="mini-sub">{person.status !== "ativo" ? "Em pausa ou férias." : "Engajamento abaixo da média."}</div></div><div className="well-meter"><div className="well-track"><div className={`well-fill ${cls}`} style={{ width: `${person.engagement ?? 50}%` }} /></div><div className={`well-tag ${cls}`}>{tag}</div></div></div>)}</div></div>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="times" size={13} /> Voluntários por ministério</span><button className="panel-link" type="button" onClick={() => setRoute("times")}>Times</button></div><div className="panel-body flush">{ministries.map((ministry) => <div className="dist-row" key={ministry.id}><span className="dist-name">{ministry.name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(ministry.people.length / maxMinistry) * 100}%` }} /></div><span className="dist-num">{ministry.people.length}</span></div>)}</div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="membros" size={13} /> Membros por jornada</span><span className="panel-meta">{members.length} pessoas</span></div><div className="panel-body flush">{["Decisão", "Batismo", "Fundamentos", gruposSigla, "Servindo"].map((step, index) => { const count = members.filter((member) => member.journey[index]).length; return <div className="dist-row" key={step}><span className="dist-name">{step}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${members.length ? (count / members.length) * 100 : 0}%` }} /></div><span className="dist-num">{count}</span></div>; })}</div></div>
      </div>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        {gruposAtivo && <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="membros" size={13} /> Membros por {gruposSigla}</span><span className="panel-meta">{fellowshipGroups.length} grupos</span></div><div className="panel-body flush">{gcCounts.map(({ group, n }) => <div className="dist-row" key={group.id}><span className="dist-name">{group.name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(n / maxGc) * 100}%` }} /></div><span className="dist-num">{n}</span></div>)}{fellowshipGroups.length === 0 && <div className="empty" style={{ padding: "12px 0" }}>Nenhum grupo cadastrado ainda.</div>}</div></div>}
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={13} /> Operação conectada</span><span className="panel-meta">Kanban & chat</span></div><div className="panel-body flush">{[["Quadros", boards.length], ["Conversas", chats.length], ["Eventos", events.length]].map(([label, count]) => <div className="dist-row" key={label}><span className="dist-name">{label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(Number(count) / maxOps) * 100}%` }} /></div><span className="dist-num">{count}</span></div>)}</div></div>
      </div>
    </div>
  );
}

const CFG_TABS = [
  { id: "igreja", label: "Igreja" },
  { id: "min", label: "Ministérios & funções" },
  { id: "operacao", label: "Escala & presença" },
  { id: "grupos", label: "Grupos & Células" },
  { id: "espacos", label: "Espaços & Salas" },
  { id: "perm", label: "Permissões" },
  { id: "acessos", label: "Acessos por pessoa" },
  { id: "visual", label: "Personalização" },
  { id: "rede", label: "Congregações" },
];

const TAG_CORES = [
  { v: "olive", l: "Oliva" },
  { v: "wheat", l: "Trigo" },
  { v: "clay", l: "Argila" },
  { v: "terra", l: "Terracota" },
  { v: "sand", l: "Areia" },
  { v: "amber", l: "Âmbar" },
  { v: "rust", l: "Ferrugem" },
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

/* mescla a matriz vinda do banco (core.role_permissions, já sem prefixo "service.")
   com o padrão, pra cobrir qualquer ação nova que a org ainda não tenha uma linha
   salva (ex.: org criada antes de algum ACOES_V2 novo existir). */
function matrizComFallback(fromDb: Record<string, Record<string, boolean>>): MatrizV2 {
  const fallback = matrizV2Padrao();
  const roles = Object.keys(fallback) as PapelV2[];
  return Object.fromEntries(
    roles.map((role) => [role, { ...fallback[role], ...(fromDb[role] ?? {}) }]),
  ) as MatrizV2;
}

function MinisterioEditModal({ ministry, courses, onClose, onRefresh }: {
  ministry: MinistryView;
  courses: CourseView[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const profile = ministry.profile as { comoTrabalhamos?: string; chegada?: string; responsabilidades?: string[]; preRequisitos?: string[] };
  const [nome, setNome] = useState(ministry.name);
  const [desc, setDesc] = useState(ministry.description);
  const [comoTrabalhamos, setComoTrabalhamos] = useState(profile.comoTrabalhamos ?? "");
  const [chegada, setChegada] = useState(profile.chegada ?? "");
  const [responsabilidades, setResponsabilidades] = useState((profile.responsabilidades ?? []).join("\n"));
  const [preRequisitos, setPreRequisitos] = useState<string[]>(profile.preRequisitos ?? []);
  const [saving, setSaving] = useState(false);

  const togPreReq = (id: string) =>
    setPreRequisitos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const salvar = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    await createServiceBrowserClient()
      .schema("service")
      .from("ministries")
      .update({
        name: nome.trim(),
        description: desc.trim() || null,
        profile: {
          comoTrabalhamos: comoTrabalhamos.trim() || undefined,
          chegada: chegada.trim() || undefined,
          responsabilidades: responsabilidades.split("\n").map((s) => s.trim()).filter(Boolean),
          preRequisitos,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", ministry.id);
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Editar ministério</div>
          <div className="modal-title">{ministry.name}</div>
          <div className="modal-sub">Nome, descrição e o &quot;Sobre o time&quot; completo. Para funções, use o painel de Ministérios.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field"><label className="field-label">Nome</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field"><label className="field-label">Propósito</label><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Por que esse time existe" /></div>
          <div className="field"><label className="field-label">Como trabalhamos</label><textarea className="textarea" value={comoTrabalhamos} onChange={(e) => setComoTrabalhamos(e.target.value)} placeholder="Rotina, ensaios, escala..." /></div>
          <div className="field"><label className="field-label">Horário de chegada</label><input className="input" value={chegada} onChange={(e) => setChegada(e.target.value)} placeholder="ex: 1h antes do culto" /></div>
          <div className="field">
            <label className="field-label">O que esperamos (uma por linha)</label>
            <textarea className="textarea" value={responsabilidades} onChange={(e) => setResponsabilidades(e.target.value)} placeholder={"ex: Chegar no horário\nAvisar com antecedência se não puder servir"} />
          </div>
          {courses.length > 0 && (
            <div className="field">
              <label className="field-label">Pré-requisitos (cursos)</label>
              <div className="seg-check">
                {courses.map((c) => (
                  <button key={c.id} className={`seg-chip${preRequisitos.includes(c.id) ? " on" : ""}`} type="button" onClick={() => togPreReq(c.id)}>{c.name}</button>
                ))}
              </div>
            </div>
          )}
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

/* acessos individuais por pessoa (telas extras além do papel) + delegação
   de quem pode conceder esses acessos ── Config → aba "Acessos por pessoa" */
function AcessosCard({
  people,
  church,
  currentRole,
}: {
  people: PersonView[];
  church: ChurchView | undefined;
  currentRole: "master" | "pastor" | "lider" | "vol";
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const podeDelegar = currentRole === "master";
  const delegados = church?.settings?.acessoDelegados ?? [];
  const pessoa = people.find((p) => p.id === selectedId) ?? null;
  const lista = people.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  const toggleAcesso = async (routeId: string) => {
    if (!pessoa) return;
    const atual = pessoa.meta?.extraAccess ?? [];
    const next = atual.includes(routeId) ? atual.filter((r) => r !== routeId) : [...atual, routeId];
    await createServiceBrowserClient().schema("service").from("people").update({ meta: { ...pessoa.meta, extraAccess: next } }).eq("id", pessoa.id);
    router.refresh();
  };

  const toggleDelegado = async () => {
    if (!pessoa || !church?.id) return;
    const next = delegados.includes(pessoa.id) ? delegados.filter((id) => id !== pessoa.id) : [...delegados, pessoa.id];
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, acessoDelegados: next } }).eq("id", church.id);
    router.refresh();
  };

  return (
    <div className="cfg-grid2">
      <div className="cfg-card">
        <div className="cfg-card-t">Quem pode acessar o quê</div>
        <div className="cfg-card-s">Líderes já enxergam toda a Operação. Aqui você abre telas extras para uma pessoa específica, Membros, Visitantes, Times... Escolha a pessoa e marque o que ela pode ver.</div>
        <div className="tb-search" style={{ marginBottom: 12 }}>
          <span className="si"><Icon name="buscar" size={13} /></span>
          <input placeholder="Buscar pessoa pelo nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="acesso-list">
          {lista.slice(0, 40).map((p) => {
            const n = p.meta?.extraAccess?.length ?? 0;
            return (
              <button key={p.id} type="button" className={`flag-row${selectedId === p.id ? " on" : ""}`} onClick={() => setSelectedId(p.id)}>
                <Av name={p.name} size="sm" />
                <div className="flag-main"><div className="flag-nome">{p.name}</div><div className="flag-meta">{n ? `${n} acesso(s) extra` : "sem acesso extra"}</div></div>
              </button>
            );
          })}
          {lista.length === 0 && <div className="empty" style={{ padding: "16px 0" }}>Ninguém encontrado.</div>}
        </div>
      </div>

      <div className="cfg-card">
        {!pessoa && <div className="empty" style={{ padding: "30px 0" }}>Escolha uma pessoa à esquerda para liberar telas.</div>}
        {pessoa && (
          <>
            <div className="cfg-card-t">Acessos de {pessoa.name.split(" ")[0]}</div>
            <div className="cfg-card-s">Marque as telas que {pessoa.name.split(" ")[0]} pode abrir além do padrão do papel.</div>
            <div className="acesso-toggles">
              {ACESSO_ROTAS.map((r) => {
                const on = (pessoa.meta?.extraAccess ?? []).includes(r.id);
                return (
                  <button key={r.id} type="button" className={`acesso-tog${on ? " on" : ""}`} onClick={() => toggleAcesso(r.id)}>
                    <span className="acesso-tog-ic"><Icon name={CEX_ICON_FOR[r.id] ?? "config"} size={15} /></span>
                    <span className="acesso-tog-l">{r.label}</span>
                    <span className={`acesso-tog-sw${on ? " on" : ""}`} />
                  </button>
                );
              })}
            </div>
            <div className="cfg-row" style={{ marginTop: 18 }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Pode liberar acessos a outras pessoas</div>
                <div className="cfg-row-s">{delegados.includes(pessoa.id) ? "É um delegado de acessos" : "Só vê os próprios acessos"}</div>
              </div>
              <button type="button" className={`sw${delegados.includes(pessoa.id) ? " on" : ""}`} disabled={!podeDelegar} onClick={toggleDelegado} />
            </div>
            {!podeDelegar && <div style={{ fontSize: 11.5, color: "var(--subtle)", marginTop: 8 }}>Só a Direção (master) define quem pode delegar acessos.</div>}
          </>
        )}
      </div>
    </div>
  );
}

function TagElencoModal({
  tag, people, onClose,
}: {
  tag: TagView;
  people: PersonView[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [localTag, setLocalTag] = useState(tag);
  const [localPeople, setLocalPeople] = useState(people);

  const lista = localPeople.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const dentro = localPeople.filter((p) => p.tags.includes(tag.id)).length;

  const toggleElenco = async (personId: string) => {
    const pessoa = localPeople.find((p) => p.id === personId);
    if (!pessoa) return;
    const dentroAgora = pessoa.tags.includes(tag.id);
    const nextTags = dentroAgora ? pessoa.tags.filter((x) => x !== tag.id) : [...pessoa.tags, tag.id];
    const removendoLider = dentroAgora && localTag.leaders.includes(personId);
    const nextLeaders = removendoLider ? localTag.leaders.filter((x) => x !== personId) : localTag.leaders;

    setLocalPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, tags: nextTags } : p)));
    if (removendoLider) setLocalTag((prev) => ({ ...prev, leaders: nextLeaders }));

    const supabase = createServiceBrowserClient();
    await supabase.schema("service").from("people").update({ tags: nextTags }).eq("id", personId);
    if (removendoLider) await supabase.schema("service").from("tags").update({ leaders: nextLeaders }).eq("id", tag.id);
    router.refresh();
  };

  const toggleLider = async (personId: string) => {
    const ehLider = localTag.leaders.includes(personId);
    const nextLeaders = ehLider ? localTag.leaders.filter((x) => x !== personId) : [...localTag.leaders, personId];
    const pessoa = localPeople.find((p) => p.id === personId);
    const precisaEntrarNoElenco = !ehLider && pessoa && !pessoa.tags.includes(tag.id);
    const nextTags = precisaEntrarNoElenco ? [...(pessoa?.tags ?? []), tag.id] : pessoa?.tags ?? [];

    setLocalTag((prev) => ({ ...prev, leaders: nextLeaders }));
    if (precisaEntrarNoElenco) setLocalPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, tags: nextTags } : p)));

    const supabase = createServiceBrowserClient();
    await supabase.schema("service").from("tags").update({ leaders: nextLeaders }).eq("id", tag.id);
    if (precisaEntrarNoElenco) await supabase.schema("service").from("people").update({ tags: nextTags }).eq("id", personId);
    router.refresh();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Frente · {tag.name}</div>
          <div className="modal-title">Quem serve nos {tag.name}</div>
          <div className="modal-sub">
            Marque os voluntários que fazem parte desta frente. Toque na estrela para definir quem é líder da frente. {dentro} marcado(s).
          </div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="tb-search" style={{ marginBottom: 14 }}>
            <span className="si"><Icon name="buscar" size={13} /></span>
            <input placeholder="Buscar voluntário..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          {lista.map((p) => {
            const on = p.tags.includes(tag.id);
            const lider = localTag.leaders.includes(p.id);
            return (
              <div className={`flag-row${on ? " on" : ""}`} key={p.id} style={{ cursor: "pointer" }} onClick={() => toggleElenco(p.id)}>
                <Av name={p.name} size="sm" />
                <div className="flag-main">
                  <div className="flag-nome">{p.name}{lider && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--amber)" }}>★ líder</span>}</div>
                </div>
                <button
                  type="button"
                  title={lider ? "Remover como líder" : "Tornar líder da frente"}
                  onClick={(e) => { e.stopPropagation(); toggleLider(p.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: lider ? "var(--amber)" : "var(--subtle)" }}
                >
                  ★
                </button>
              </div>
            );
          })}
          {lista.length === 0 && <div className="empty">Ninguém encontrado.</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-pri" type="button" onClick={onClose}>Concluído</button>
        </div>
      </div>
    </div>
  );
}

function CongregacaoEditModal({
  churchRow, ministries, tags, onClose, onRefresh,
}: {
  churchRow: ChurchView;
  ministries: MinistryView[];
  tags: TagView[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const churchMinistries = ministries.filter((m) => m.churchId === churchRow.id);
  const churchTags = tags.filter((t) => t.churchId === churchRow.id);
  const [form, setForm] = useState({
    nome: churchRow.nome,
    cidade: churchRow.cidade ?? "",
    doc: churchRow.doc ?? "",
    fundada: churchRow.foundedYear ?? "",
    endereco: churchRow.address ?? "",
    cep: churchRow.postalCode ?? "",
    email: churchRow.email ?? "",
    tel: churchRow.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({
        name: form.nome.trim(),
        city: form.cidade.trim() || null,
        doc: form.doc.trim() || null,
        founded_year: form.fundada.trim() || null,
        address: form.endereco.trim() || null,
        postal_code: form.cep.trim() || null,
        email: form.email.trim() || null,
        phone: form.tel.trim() || null,
      })
      .eq("id", churchRow.id);
    setSaving(false);
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{churchRow.matriz ? "Matriz · rede" : "Congregação"}</div>
          <div className="modal-title">{churchRow.nome}</div>
          <div className="modal-sub">Dados da congregação.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field"><label className="field-label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} /></div>
          <div className="field"><label className="field-label">Cidade / bairro</label><input className="input" value={form.cidade} onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))} /></div>
          <div className="field"><label className="field-label">CNPJ</label><input className="input" value={form.doc} onChange={(e) => setForm((p) => ({ ...p, doc: e.target.value }))} /></div>
          <div className="field"><label className="field-label">Ano de fundação</label><input className="input" value={form.fundada} onChange={(e) => setForm((p) => ({ ...p, fundada: e.target.value }))} /></div>
          <div className="field"><label className="field-label">Endereço</label><input className="input" value={form.endereco} onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value }))} /></div>
          <div className="field"><label className="field-label">CEP</label><input className="input" value={form.cep} onChange={(e) => setForm((p) => ({ ...p, cep: e.target.value }))} /></div>
          <div className="field"><label className="field-label">E-mail</label><input className="input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
          <div className="field"><label className="field-label">Telefone</label><input className="input" value={form.tel} onChange={(e) => setForm((p) => ({ ...p, tel: e.target.value }))} /></div>

          <div className="cfg-card-t" style={{ marginTop: 22 }}>Governança própria</div>
          <div className="cfg-card-s">Times e ministérios cadastrados nesta congregação.</div>
          {churchMinistries.map((m) => {
            const leader = m.people.find((p) => p.isLeader);
            return (
              <div className="cfg-row" key={m.id}>
                <div className="cfg-row-main">
                  <div className="cfg-row-t">{m.name}</div>
                  <div className="cfg-row-s">{leader ? `líder ${leader.personName}` : "sem líder definido"}</div>
                </div>
              </div>
            );
          })}
          {churchMinistries.length === 0 && <div className="empty" style={{ padding: "14px 0" }}>Nenhum time cadastrado nesta congregação.</div>}

          <div className="cfg-card-t" style={{ marginTop: 22 }}>Frentes / tags</div>
          <div className="cfg-card-s">Etiquetas livres cadastradas nesta congregação.</div>
          <div className="cell-tags" style={{ gap: 8 }}>
            {churchTags.map((t) => <span key={t.id} className="papel-tag">{t.name}</span>)}
            {churchTags.length === 0 && <span style={{ fontSize: 12.5, color: "var(--subtle)" }}>Nenhuma frente cadastrada nesta congregação.</span>}
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

function ImageUpload({
  label, hint, url, round, onUpload, onRemove,
}: {
  label: string;
  hint?: string;
  url?: string | null;
  round?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="img-up">
      <button
        type="button"
        className={`img-up-slot${round ? " round" : ""}`}
        onClick={() => ref.current?.click()}
        style={url ? { backgroundImage: `url(${url})` } : undefined}
      >
        {!url && <span className="img-up-plus">+</span>}
      </button>
      <div className="img-up-main">
        <div className="cfg-row-t">{label}</div>
        {hint && <div className="cfg-row-s">{hint}</div>}
        {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-sec btn-sm" type="button" disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? "Enviando..." : url ? "Trocar" : "Enviar imagem"}
          </button>
          {url && (
            <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => onRemove()}>
              Remover
            </button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

function Config({
  church,
  churches,
  ministries,
  people,
  rooms,
  reservations,
  currentRole,
  theme,
  setTheme,
  ministerialTitles,
  fellowshipGroups,
  tags,
  courses,
  setModal,
  permissionsMatrix,
}: {
  church?: ChurchView;
  churches: ChurchView[];
  ministries: MinistryView[];
  people: PersonView[];
  rooms: RoomView[];
  reservations: ReservationView[];
  currentRole: "master" | "pastor" | "lider" | "vol";
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  ministerialTitles: MinisterialTitleView[];
  fellowshipGroups: FellowshipGroupView[];
  tags: TagView[];
  courses: CourseView[];
  setModal: (modal: ModalState) => void;
  permissionsMatrix: Record<string, Record<string, boolean>>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("igreja");
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [tagNomeEdit, setTagNomeEdit] = useState("");
  const [elencoTag, setElencoTag] = useState<TagView | null>(null);
  const [gerirCongId, setGerirCongId] = useState<string | null>(null);

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

  const renomearTag = async (id: string, name: string) => {
    if (!name.trim()) return;
    await createServiceBrowserClient().schema("service").from("tags").update({ name: name.trim() }).eq("id", id);
    router.refresh();
  };

  const recolorirTag = async (id: string, color: string) => {
    await createServiceBrowserClient().schema("service").from("tags").update({ color }).eq("id", id);
    router.refresh();
  };

  const [editMin, setEditMin] = useState<MinistryView | null>(null);

  const [escalaCfg, setEscalaCfg] = useState<EscalaSettings>(() => ({ ...ESCALA_DEFAULT, ...(church?.settings?.escala ?? {}) }));
  const setEscala = async (k: keyof EscalaSettings, v: unknown) => {
    const next = { ...escalaCfg, [k]: v } as EscalaSettings;
    setEscalaCfg(next);
    if (!church?.id) return;
    await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({ settings: { ...church.settings, escala: next } })
      .eq("id", church.id);
    router.refresh();
  };

  const [statusCfg, setStatusCfg] = useState<StatusCriterios>(() => ({ ...STATUS_CFG_DEFAULT, ...(church?.settings?.statusCfg ?? {}) }));
  const setStatus = async (k: keyof StatusCriterios, v: number | boolean) => {
    const next = { ...statusCfg, [k]: v } as StatusCriterios;
    setStatusCfg(next);
    if (!church?.id) return;
    await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({ settings: { ...church.settings, statusCfg: next } })
      .eq("id", church.id);
    router.refresh();
  };

  const [tiposEvento, setTiposEventoState] = useState<string[]>(() => church?.settings?.tiposEvento ?? []);
  const [novoTipoEvento, setNovoTipoEvento] = useState("");
  const saveTiposEvento = async (next: string[]) => {
    setTiposEventoState(next);
    if (!church?.id) return;
    await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({ settings: { ...church.settings, tiposEvento: next } })
      .eq("id", church.id);
    router.refresh();
  };
  const addTipoEvento = () => {
    const v = novoTipoEvento.trim();
    if (v && !tiposEvento.includes(v)) saveTiposEvento([...tiposEvento, v]);
    setNovoTipoEvento("");
  };

  const setCheckinPermitirExtra = async (v: boolean) => {
    if (!church?.id) return;
    await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({ settings: { ...church.settings, checkinPermitirExtra: v } })
      .eq("id", church.id);
    router.refresh();
  };

  const [gruposCfg, setGruposCfgState] = useState<GruposCfg>(() => ({ ...GRUPOS_CFG_DEFAULT, ...(church?.settings?.gruposCfg ?? {}) }));
  const saveGruposCfg = async (next: GruposCfg) => {
    setGruposCfgState(next);
    if (!church?.id) return;
    await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({ settings: { ...church.settings, gruposCfg: next } })
      .eq("id", church.id);
    router.refresh();
  };

  const [accent, setAccent] = useState<string>(() => {
    try { return localStorage.getItem("cex_accent") ?? "olive"; } catch { return "olive"; }
  });
  const applyAccent = (id: string) => {
    setAccent(id);
    try { localStorage.setItem("cex_accent", id); } catch { /* noop */ }
  };

  const [matriz, setMatriz] = useState<MatrizV2>(() => matrizComFallback(permissionsMatrix));
  const [matrizMsg, setMatrizMsg] = useState("");
  const [matrizSaving, setMatrizSaving] = useState(false);
  const toggleMx = (papel: PapelV2, acao: string) => {
    if (papel === "master") return;
    setMatriz((prev) => ({ ...prev, [papel]: { ...prev[papel], [acao]: !prev[papel][acao] } }));
  };
  const salvarMatriz = async () => {
    if (!church?.organizationId) return;
    setMatrizSaving(true);
    const rows = (Object.keys(matriz) as PapelV2[]).flatMap((papel) =>
      Object.entries(matriz[papel]).map(([acao, allowed]) => ({
        organization_id: church.organizationId,
        role: papel,
        permission_code: `service.${acao}`,
        allowed,
      })),
    );
    await createServiceBrowserClient()
      .schema("core")
      .from("role_permissions")
      .upsert(rows, { onConflict: "organization_id,role,permission_code" });
    setMatrizSaving(false);
    setMatrizMsg("Permissões salvas.");
    router.refresh();
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
              <dd>{people.length}</dd>
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
            {tags.map((t) => {
              const dentro = people.filter((p) => p.tags.includes(t.id)).length;
              const lideres = t.leaders.map((id) => people.find((p) => p.id === id)?.name.split(" ")[0]).filter(Boolean);
              return (
                <div className="cfg-row" key={t.id}>
                  <div className="cong-mark" style={{ background: "var(--ink)" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: `var(--${t.color})`, display: "inline-block" }} /></div>
                  <div className="cfg-row-main">
                    {editTagId === t.id ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          className="input"
                          style={{ flex: "1 1 140px" }}
                          value={tagNomeEdit}
                          onChange={(e) => setTagNomeEdit(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && renomearTag(t.id, tagNomeEdit)}
                          autoFocus
                        />
                        <span style={{ display: "flex", gap: 6 }}>
                          {TAG_CORES.map((c) => (
                            <button
                              key={c.v}
                              type="button"
                              title={c.l}
                              onClick={() => recolorirTag(t.id, c.v)}
                              style={{ width: 20, height: 20, borderRadius: "50%", background: `var(--${c.v})`, border: t.color === c.v ? "2px solid var(--white)" : "2px solid transparent", cursor: "pointer", padding: 0 }}
                            />
                          ))}
                        </span>
                        <button className="btn btn-sec btn-sm" type="button" onClick={() => { renomearTag(t.id, tagNomeEdit); setEditTagId(null); }}>Pronto</button>
                      </div>
                    ) : (
                      <>
                        <div className="cfg-row-t">{t.name}</div>
                        <div className="cfg-row-s">
                          {dentro} voluntário(s){lideres.length > 0 ? <> · líder: <span style={{ color: "var(--olive-soft)" }}>{lideres.join(", ")}</span></> : " · sem líder"}
                        </div>
                      </>
                    )}
                  </div>
                  {editTagId !== t.id && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button className="btn btn-sec btn-sm" type="button" onClick={() => setElencoTag(t)}>Elenco</button>
                      <button className="btn btn-sec btn-sm" type="button" onClick={() => { setEditTagId(t.id); setTagNomeEdit(t.name); }}>Editar</button>
                      <button className="btn btn-sec btn-sm" type="button" onClick={() => removeRow("tags", t.id)}>Remover</button>
                    </div>
                  )}
                </div>
              );
            })}
            {tags.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhuma frente cadastrada.</div>}
          </div>
          <button className="btn btn-sec btn-sm" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Nova frente / tag", subtitle: "Etiqueta livre para agrupar voluntários (ex: Jovens, Casais).", saveLabel: "Criar frente", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: Jovens" }, { k:"cor", label:"Cor", type:"select", options: TAG_CORES }], action: { kind: "tag" } })}>+ Frente</button>
        </div>
      )}

      {/* ─── GRUPOS & CÉLULAS ─── */}
      {tab === "grupos" && (
        <>
          <div className="cfg-card">
            <div className="cfg-card-t">Habilitar grupos</div>
            <div className="cfg-card-s">Desligue se sua igreja não trabalha com células/GCs. O recurso some do resto do app, mas nada é apagado.</div>
            <div className="cfg-row" style={{ borderBottom: gruposCfg.ativo ? "0.5px solid var(--border-2)" : "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{gruposCfg.ativo ? "Ativado" : "Desativado"}</div>
                <div className="cfg-row-s">{gruposCfg.ativo ? "Grupos aparecem no cadastro de membro e nos relatórios." : "Grupos escondidos em todo o app."}</div>
              </div>
              <button type="button" className={`sw${gruposCfg.ativo ? " on" : ""}`} onClick={() => saveGruposCfg({ ...gruposCfg, ativo: !gruposCfg.ativo })} />
            </div>
            {gruposCfg.ativo && (
              <div className="cfg-grid2" style={{ gap: "0 16px", marginTop: 16 }}>
                <div className="field"><label className="field-label">Nome (plural)</label><input className="input" value={gruposCfg.termo} onChange={(e) => setGruposCfgState({ ...gruposCfg, termo: e.target.value })} onBlur={() => saveGruposCfg(gruposCfg)} placeholder="ex: Grupos de Comunhão" /></div>
                <div className="field"><label className="field-label">Nome (singular)</label><input className="input" value={gruposCfg.termoP} onChange={(e) => setGruposCfgState({ ...gruposCfg, termoP: e.target.value })} onBlur={() => saveGruposCfg(gruposCfg)} placeholder="ex: Grupo de Comunhão" /></div>
                <div className="field"><label className="field-label">Sigla</label><input className="input" value={gruposCfg.sigla} onChange={(e) => setGruposCfgState({ ...gruposCfg, sigla: e.target.value })} onBlur={() => saveGruposCfg(gruposCfg)} placeholder="ex: GC" /></div>
              </div>
            )}
          </div>
          {gruposCfg.ativo && (
            <div className="cfg-card" style={{ marginTop: 16 }}>
              <div className="cfg-card-t">{gruposCfg.termo} · {fellowshipGroups.length}</div>
              <div className="cfg-card-s">Células, GCs, pequenos grupos... a estrutura de comunhão em casas. Cada grupo tem um líder, um dia e um bairro.</div>
              {fellowshipGroups.map((g) => {
                const leader = people.find((p) => p.id === g.leader_person_id);
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
              <button className="btn btn-pri btn-sm" type="button" style={{ marginTop: 18 }} onClick={() => setModal({ eyebrow: "Criar", title: `Novo ${gruposCfg.termoP}`, subtitle: "Nome, líder, dia, horário e bairro do grupo.", saveLabel: "Criar grupo", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: GC Centro" }, { k:"lider", label:"Líder", type:"select", half:true, ph:"A definir", options: people.map((p) => ({ v: p.name, l: p.name })) }, { k:"dia", label:"Dia", type:"text", half:true, ph:"ex: Quarta-feira" }, { k:"hora", label:"Horário", type:"text", half:true, ph:"ex: 20h" }, { k:"bairro", label:"Bairro", type:"text", half:true, ph:"ex: Centro" }], action: { kind: "group" } })}>+ Novo grupo</button>
            </div>
          )}
        </>
      )}

      {/* ─── ESPAÇOS & SALAS ─── */}
      {tab === "espacos" && (
        <div className="cfg-card">
          <Espacos rooms={rooms} reservations={reservations} church={church} setModal={setModal} embed />
        </div>
      )}

      {/* ─── ESCALA & PRESENÇA ─── */}
      {tab === "operacao" && (
        <>
          <div className="cfg-card">
            <div className="cfg-card-t">Regras de escala</div>
            <div className="cfg-card-s">Como a escala é gerada e os limites para não sobrecarregar ninguém. Valem para o botão "Gerar" e para o modo automático.</div>
            <div className="field" style={{ marginTop: 4 }}>
              <label className="field-label">Geração</label>
              <div className="opt-row" style={{ flexWrap: "wrap" }}>
                {([["manual", "Manual", "O líder monta tudo na mão."], ["assistido", "Assistida", "O sistema sugere; o líder confirma cada nome."], ["automatico", "Automática", "O sistema gera e já confirma, sem ação."]] as [EscalaSettings["modo"], string, string][]).map(([k, t, s]) => (
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
                <button type="button" onClick={() => setEscala("maxPorMes", Math.max(1, escalaCfg.maxPorMes - 1))}>−</button>
                <span>{escalaCfg.maxPorMes}×</span>
                <button type="button" onClick={() => setEscala("maxPorMes", escalaCfg.maxPorMes + 1)}>+</button>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Semanas de folga após servir</div>
                <div className="cfg-row-s">descanso sugerido entre escalas (0 = sem folga)</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setEscala("folgaSemanas", Math.max(0, escalaCfg.folgaSemanas - 1))}>−</button>
                <span>{escalaCfg.folgaSemanas}</span>
                <button type="button" onClick={() => setEscala("folgaSemanas", escalaCfg.folgaSemanas + 1)}>+</button>
              </div>
            </div>
            <div className="cfg-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Respeitar período de férias</div>
                <div className="cfg-row-s">{escalaCfg.considerarFerias ? "Quem está de férias fica fora da geração" : "Férias não bloqueiam a escala"}</div>
              </div>
              <button type="button" className={`sw${escalaCfg.considerarFerias ? " on" : ""}`} onClick={() => setEscala("considerarFerias", !escalaCfg.considerarFerias)} />
            </div>
            <div className="cfg-row" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Quando alguém recusa</div>
                <div className="cfg-row-s">{escalaCfg.naRecusa === "proximo" ? "Chama o próximo apto automaticamente (só no modo automático)." : "Avisa o líder do time por mensagem e deixa a vaga aberta."}</div>
                <div className="seg seg-sm" style={{ marginTop: 10 }}>
                  <button type="button" className={escalaCfg.naRecusa === "proximo" ? "on" : ""} onClick={() => setEscala("naRecusa", "proximo")}>Chamar o próximo</button>
                  <button type="button" className={escalaCfg.naRecusa === "avisar" ? "on" : ""} onClick={() => setEscala("naRecusa", "avisar")}>Avisar o líder</button>
                </div>
              </div>
            </div>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">Quando um voluntário fica inativo</div>
            <div className="cfg-card-s">Cada igreja define os critérios. Assim os líderes enxergam quem está se afastando e podem fazer contato a tempo. Férias avisadas não contam.</div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Marcar como <em style={{ color: "var(--amber)", fontStyle: "normal" }}>inativando</em></div>
                <div className="cfg-row-s">após recusar escalas seguidas</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setStatus("recusasInativando", Math.max(1, statusCfg.recusasInativando - 1))}>−</button>
                <span>{statusCfg.recusasInativando}</span>
                <button type="button" onClick={() => setStatus("recusasInativando", statusCfg.recusasInativando + 1)}>+</button>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Marcar como <em style={{ color: "var(--danger)", fontStyle: "normal" }}>inativo</em></div>
                <div className="cfg-row-s">após recusar escalas seguidas</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setStatus("recusasInativo", Math.max(2, statusCfg.recusasInativo - 1))}>−</button>
                <span>{statusCfg.recusasInativo}</span>
                <button type="button" onClick={() => setStatus("recusasInativo", statusCfg.recusasInativo + 1)}>+</button>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Inativo por indisponibilidade</div>
                <div className="cfg-row-s">dias seguidos marcado como indisponível</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setStatus("diasIndispInativo", Math.max(7, statusCfg.diasIndispInativo - 7))}>−</button>
                <span>{statusCfg.diasIndispInativo}d</span>
                <button type="button" onClick={() => setStatus("diasIndispInativo", statusCfg.diasIndispInativo + 7)}>+</button>
              </div>
            </div>
            <div className="cfg-row" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Contar período de férias avisado</div>
                <div className="cfg-row-s">{statusCfg.considerarFerias ? "Férias contam como afastamento" : "Férias avisadas não pesam no status"}</div>
              </div>
              <button type="button" className={`sw${statusCfg.considerarFerias ? " on" : ""}`} onClick={() => setStatus("considerarFerias", !statusCfg.considerarFerias)} />
            </div>
            <div className="crit-legend">
              <span><i className="dot ok" /> Ativo</span>
              <span><i className="dot warn" /> Inativando — vale um contato</span>
              <span><i className="dot off" /> Inativo</span>
            </div>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">Check-in por QR Code</div>
            <div className="cfg-card-s">Cada culto ou evento tem um QR Code único. O voluntário escaneia com o celular e confirma presença pela conta logada.</div>
            <div className="cfg-row" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Presença de quem não está escalado</div>
                <div className="cfg-row-s">{church?.settings?.checkinPermitirExtra ? "Quem não está escalado pode fazer check-in como presença extra." : "Só quem está escalado consegue fazer check-in. Os demais são bloqueados."}</div>
              </div>
              <button type="button" className={`sw${church?.settings?.checkinPermitirExtra ? " on" : ""}`} onClick={() => setCheckinPermitirExtra(!church?.settings?.checkinPermitirExtra)} />
            </div>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">Tipos de evento</div>
            <div className="cfg-card-s">Os tipos que aparecem ao criar um culto ou evento. Já vêm pré-preenchidos no cadastro; se faltar algum, dá pra criar na hora.</div>
            <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
              {tiposEvento.map((t) => (
                <span key={t} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {t}<button type="button" onClick={() => saveTiposEvento(tiposEvento.filter((x) => x !== t))} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: 12, padding: 0 }}>✕</button>
                </span>
              ))}
              {tiposEvento.length === 0 && <span style={{ fontSize: 12.5, color: "var(--subtle)" }}>Nenhum tipo cadastrado.</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input className="input" style={{ flex: 1 }} placeholder="ex: Culto, Conferência, Vigília" value={novoTipoEvento} onChange={(e) => setNovoTipoEvento(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTipoEvento()} />
              <button className="btn btn-sec" type="button" onClick={addTipoEvento}>Adicionar</button>
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
            <button className="btn btn-pri btn-sm" type="button" disabled={matrizSaving} onClick={salvarMatriz}>{matrizSaving ? "Salvando…" : (matrizMsg || "Salvar permissões")}</button>
          </div>
        </div>
      )}

      {/* ─── ACESSOS POR PESSOA ─── */}
      {tab === "acessos" && <AcessosCard people={people} church={church} currentRole={currentRole} />}

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
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">Marca da sua igreja</div>
            <div className="cfg-card-s">Suba o logo da sua igreja. Ele aparece na barra lateral e no login, no lugar do CE.X (o &quot;Service&quot; continua embaixo).</div>
            <ImageUpload
              label="Logotipo da igreja"
              hint="Tamanho ideal: 480×160px (proporção 3:1), PNG com fundo transparente."
              url={church?.logoUrl}
              onUpload={async (file) => {
                if (!church) return;
                const path = `logos/${church.organizationId}/${church.id}.${imageExtension(file)}`;
                const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
                await createServiceBrowserClient().schema("service").from("churches").update({ logo_url: url }).eq("id", church.id);
                router.refresh();
              }}
              onRemove={async () => {
                if (!church) return;
                await createServiceBrowserClient().schema("service").from("churches").update({ logo_url: null }).eq("id", church.id);
                router.refresh();
              }}
            />
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
              <button className="btn btn-sec btn-sm" type="button" onClick={() => setGerirCongId(c.id)}>Gerir</button>
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
                  <button className="btn btn-sec btn-sm" type="button" onClick={() => setGerirCongId(c.id)}>Gerir</button>
                </div>
              ))}
            </>
          )}
          {churches.length === 0 && <div className="empty">Nenhuma congregação encontrada.</div>}
          <button
            className="btn btn-pri btn-sm"
            type="button"
            style={{ marginTop: 18 }}
            onClick={() => setModal({
              eyebrow: "Criar",
              title: "Adicionar congregação",
              subtitle: "Nova unidade da rede, com seus próprios times e escalas.",
              saveLabel: "Adicionar congregação",
              formFields: [
                { k: "nome", label: "Nome", type: "text", req: true, ph: "ex: CE.X Zona Norte" },
                { k: "cidade", label: "Cidade / bairro", type: "text", half: true },
                { k: "doc", label: "CNPJ", type: "text", half: true },
                { k: "fundada", label: "Ano de fundação", type: "text", half: true },
                { k: "endereco", label: "Endereço", type: "text", half: true },
                { k: "cep", label: "CEP", type: "text", half: true },
                { k: "email", label: "E-mail", type: "text", half: true },
                { k: "tel", label: "Telefone", type: "text", half: true },
              ],
              action: { kind: "congregacao" },
            })}
          >
            + Adicionar congregação
          </button>
        </div>
      )}

      {editMin && (
        <MinisterioEditModal ministry={editMin} courses={courses} onClose={() => setEditMin(null)} onRefresh={() => router.refresh()} />
      )}

      {elencoTag && (
        <TagElencoModal tag={elencoTag} people={people} onClose={() => setElencoTag(null)} />
      )}

      {gerirCongId && (() => {
        const c = churches.find((x) => x.id === gerirCongId);
        if (!c) return null;
        return (
          <CongregacaoEditModal churchRow={c} ministries={ministries} tags={tags} onClose={() => setGerirCongId(null)} onRefresh={() => router.refresh()} />
        );
      })()}
    </div>
  );
}

function ValoresEditModal({ church, identity, onClose, onRefresh }: {
  church: ChurchView | undefined;
  identity?: ChurchIdentityView | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [rows, setRows] = useState<Array<{ title: string; texto: string }>>(
    () => (identity?.values ?? []).map((v) => ({ title: v.title, texto: v.texto ?? "" })),
  );
  const [saving, setSaving] = useState(false);

  const setRow = (i: number, patch: Partial<{ title: string; texto: string }>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { title: "", texto: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const salvar = async () => {
    if (!church?.id) return;
    setSaving(true);
    const cleaned = rows.map((r) => ({ title: r.title.trim(), texto: r.texto.trim() })).filter((r) => r.title);
    await createServiceBrowserClient()
      .schema("service")
      .from("church_identity")
      .upsert({
        church_id: church.id,
        organization_id: church.organizationId,
        values: cleaned,
        updated_at: new Date().toISOString(),
      });
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Editar</div>
          <div className="modal-title">Valores da Igreja</div>
          <div className="modal-sub">Cada valor tem um nome e uma descrição curta do que ele significa na prática.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          {rows.map((r, i) => (
            <div key={i} className="cfg-row" style={{ alignItems: "flex-start" }}>
              <div className="cfg-row-main">
                <div className="field"><label className="field-label">Valor {i + 1}</label><input className="input" value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} placeholder="ex: Acolhimento" /></div>
                <div className="field"><label className="field-label">Descrição</label><textarea className="textarea" value={r.texto} onChange={(e) => setRow(i, { texto: e.target.value })} placeholder="O que esse valor significa na prática" /></div>
              </div>
              <button className="btn btn-sec btn-sm" type="button" onClick={() => removeRow(i)}>Remover</button>
            </div>
          ))}
          {rows.length === 0 && <div className="empty" style={{ padding: "20px 0" }}>Nenhum valor cadastrado ainda.</div>}
          <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 10 }} onClick={addRow}>+ Adicionar valor</button>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={salvar}>{saving ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

function Identidade({ church, identity, cycle, setModal }: { church?: ChurchView; identity?: ChurchIdentityView | null; cycle?: CycleView; setModal: (modal: ModalState) => void }) {
  const router = useRouter();
  const values = identity?.values ?? [];
  const [editingValores, setEditingValores] = useState(false);
  return (
    <div className="content wide">
      <PageHead
        title="Identidade & propósito"
        eyebrow="Nossa igreja"
        subtitle="Missão, visão, valores e tema atual da comunidade. Exibido no app do membro e na vitrine da Igreja."
        action={<button className="btn btn-sec" type="button" onClick={() => setModal({ eyebrow: "Editar", title: "Identidade da Igreja", subtitle: "Atualize propósito, missão e visão da Igreja. Para os valores, use \"Editar valores\" abaixo.", saveLabel: "Salvar", formFields: [{ k:"proposito", label:"Propósito", type:"area", ph:identity?.purpose ?? "Por que a Igreja existe..." }, { k:"missao", label:"Missão", type:"area", ph:identity?.mission ?? "A missão da Igreja..." }, { k:"visao", label:"Visão", type:"area", ph:identity?.vision ?? "A visão da Igreja..." }, { k:"versiculo", label:"Versículo", type:"text", ph:identity?.verse ?? "ex: Mateus 28:19" }], action: { kind: "identity" } })}>Editar</button>}
      />
      {identity?.mission ? (
        <div className="ident-hero">
          <div className="ident-hero-label">Declaração de missão</div>
          <div className="ident-hero-text">{identity.mission}</div>
          {identity?.verse && <div className="ident-verse">§ {identity.verse}</div>}
        </div>
      ) : null}
      {(identity?.purpose || identity?.vision) ? (
        <div className="ident-grid">
          {identity?.purpose ? (
            <div className="ident-card">
              <div className="ident-card-ic"><Icon name="identidade" size={18} /></div>
              <div className="ident-card-t">Propósito</div>
              <div className="ident-card-x">{identity.purpose}</div>
            </div>
          ) : null}
          {identity?.vision ? (
            <div className="ident-card">
              <div className="ident-card-ic"><Icon name="painel" size={18} /></div>
              <div className="ident-card-t">Visão</div>
              <div className="ident-card-x">{identity.vision}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="section-divide" style={{ marginTop: 28 }}>
        <span className="num">02</span><span className="label">Valores</span><span className="line" />
        <button className="panel-link" type="button" onClick={() => setEditingValores(true)}>Editar valores</button>
      </div>
      {values.length > 0 ? (
        <div className="val-grid">
          {values.map((v, i) => (
            <div className="val-card" key={v.title + i}>
              <div className="val-ic"><Icon name={["membros", "identidade", "decisoes"][i % 3]} size={14} /></div>
              <div className="val-t">{v.title}</div>
              {v.texto ? <div className="val-x">{v.texto}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ padding: "20px 0" }}>Nenhum valor cadastrado ainda.</div>
      )}
      {editingValores && <ValoresEditModal church={church} identity={identity} onClose={() => setEditingValores(false)} onRefresh={() => router.refresh()} />}
      <div className="section-divide" style={{ marginTop: 28 }}>
        <span className="num">03</span><span className="label">Tema do ciclo atual</span><span className="line" />
        {cycle ? <button className="panel-link" type="button" onClick={() => setModal({ eyebrow: "Editar", title: `Ciclo ${cycle.year}`, subtitle: "A visão do ano que todos enxergam.", saveLabel: "Salvar", formFields: [{ k:"ano", label:"Ano / período", type:"text", half:true, req:true, ph:cycle.year }, { k:"tema", label:"Tema", type:"text", half:true, req:true, ph:cycle.theme }, { k:"versiculo", label:"Versículo", type:"text", ph:cycle.verse ?? "ex: Salmos 1:3" }, { k:"desc", label:"Descrição", type:"area", ph:cycle.body ?? "O que esse tema significa para a Igreja..." }, { k:"objetivos", label:"Objetivos (separados por vírgula)", type:"text", ph:cycle.objectives.map((o) => o.title).join(", ") }], action: { kind: "cycle", id: cycle.id } })}>Editar ciclo</button> : null}
      </div>
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

function Historia({ church, historyEntries, setModal }: { church?: ChurchView; historyEntries: HistoryEntryView[]; setModal: (modal: ModalState) => void }) {
  const router = useRouter();
  const capitulos = [...historyEntries].sort((a, b) => a.sort_order - b.sort_order);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const trocarFoto = async (capituloId: string, file: File | undefined) => {
    if (!file || !church) return;
    setUploadingId(capituloId);
    try {
      const path = `history/${church.organizationId}/${capituloId}.${imageExtension(file)}`;
      const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
      await createServiceBrowserClient().schema("service").from("history_entries").update({ photo_url: url }).eq("id", capituloId);
      router.refresh();
    } catch {
      window.alert("Não foi possível enviar a foto agora.");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="content wide">
      <PageHead
        title="Nossa história"
        eyebrow="Nossa igreja"
        subtitle="Cada capítulo de fé que nos trouxe até aqui. Um mural para lembrar de onde viemos e de Quem nos sustentou."
        action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo capítulo", subtitle: "Registre um momento importante da história da Igreja.", saveLabel: "Adicionar capítulo", formFields: [{ k:"ano", label:"Ano", type:"text", half:true, ph:"ex: 2023" }, { k:"titulo", label:"Título", type:"text", half:true, ph:"ex: Fundação da Igreja" }, { k:"desc", label:"História", type:"area", ph:"Conte esse momento..." }, { k:"link", label:"Link (opcional)", type:"text", ph:"https://…", hint:"Vídeo, matéria ou álbum de fotos." }], action: { kind: "historyEntry" } })}>+ Adicionar capítulo</button>}
      />
      {capitulos.length === 0 && <div className="empty">Ainda não há capítulos. Adicione o primeiro.</div>}
      <div className="hist">
        {capitulos.map((capitulo, i) => (
          <div key={capitulo.id} className={`hist-item ${i % 2 === 1 ? "rev" : ""}`}>
            <div className="hist-photo">
              {capitulo.photo_url ? (
                <img className="hist-photo-img" src={capitulo.photo_url} alt={capitulo.title} />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: i % 2 === 1 ? "linear-gradient(150deg, var(--olive-deep), #243012)" : "linear-gradient(150deg, #7a6526, #3d3415)" }} />
              )}
              <span className="hist-year">{capitulo.year || "—"}</span>
              <button
                type="button"
                className="hist-photo-tog"
                disabled={uploadingId === capitulo.id}
                onClick={() => fileRefs.current[capitulo.id]?.click()}
              >
                {uploadingId === capitulo.id ? "Enviando..." : capitulo.photo_url ? "Trocar foto" : "+ Foto"}
              </button>
              <input
                ref={(el) => { fileRefs.current[capitulo.id] = el; }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => { void trocarFoto(capitulo.id, e.target.files?.[0]); e.target.value = ""; }}
              />
            </div>
            <div className="hist-text">
              <div className="hist-t">{capitulo.title}</div>
              <div className="hist-x">{capitulo.body}</div>
              <div className="hist-foot">
                {capitulo.link ? <a className="hist-link" href={capitulo.link} target="_blank" rel="noreferrer">Ver mais →</a> : null}
                <button className="hist-edit" type="button" onClick={() => setModal({ eyebrow: "Editar", title: `Capítulo de ${capitulo.year ?? capitulo.title}`, subtitle: "Edite este capítulo da história da Igreja.", saveLabel: "Salvar", formFields: [{ k:"ano", label:"Ano", type:"text", half:true, ph:capitulo.year ?? "ex: 2023" }, { k:"titulo", label:"Título", type:"text", half:true, ph:capitulo.title }, { k:"desc", label:"História", type:"area", ph:capitulo.body ?? "Conte esse momento..." }, { k:"link", label:"Link (opcional)", type:"text", ph:capitulo.link ?? "https://…", hint:"Vídeo, matéria ou álbum de fotos." }], action: { kind: "historyEntry", id: capitulo.id } })}>Editar</button>
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

function timelineEventPayload(organizationId: string, memberId: string, eventType: string, title: string, dateStr?: string | null) {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const sortKey = Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
  return {
    organization_id: organizationId,
    member_id: memberId,
    event_type: eventType,
    title,
    sort_key: sortKey,
    when_label: d.toLocaleDateString("pt-BR"),
  };
}

const JRN_STEPS = [
  { label: "Decisão", kind: "decisao", icon: "decisoes" },
  { label: "Batismo nas águas", kind: "batismo", icon: "batismos" },
  { label: "Fundamentos", kind: "curso", icon: "cursos" },
  { label: "Grupo de comunhão", kind: "integracao", icon: "pessoa" },
  { label: "Servindo", kind: "time", icon: "times" },
];

function PersonTimeline({ member, events, compact }: { member: MemberView; events: TimelineEventView[]; compact?: boolean }) {
  const sorted = [...events].sort((a, b) => (b.sort_key ?? 0) - (a.sort_key ?? 0));
  const stepsWithoutEvent = JRN_STEPS.filter((step, i) => !!member.journey[i] && !events.some((e) => e.event_type === step.kind));

  if (!sorted.length && !stepsWithoutEvent.length) {
    return <div style={{ fontSize: 13, color: "var(--subtle)", padding: "12px 0" }}>Nenhuma etapa concluída ainda.</div>;
  }
  return (
    <div className={`tl jrn-tl${compact ? " compact" : ""}`}>
      {sorted.map((event) => {
        const step = JRN_STEPS.find((s) => s.kind === event.event_type);
        return (
          <div className="tl-item ol tone-olive" key={event.id}>
            <div className="tl-dot" />
            <div className="tl-when"><span className="jrn-tl-kind">{step && <Icon name={step.icon} size={11} />} {event.when_label ?? new Date(event.created_at).toLocaleDateString("pt-BR")}</span></div>
            <div className="tl-text"><b>{event.title}</b>{event.body ? ` — ${event.body}` : ""}</div>
          </div>
        );
      })}
      {stepsWithoutEvent.map((step) => (
        <div className="tl-item ol tone-olive" key={step.kind}>
          <div className="tl-dot" />
          <div className="tl-when"><span className="jrn-tl-kind"><Icon name={step.icon} size={11} /> {step.label}</span></div>
          <div className="tl-text"><b>{step.label}</b> — etapa concluída</div>
        </div>
      ))}
    </div>
  );
}

function DecisaoDrawer({
  decision, people, members, church, timelineEvents, onClose, onOpenMember,
}: {
  decision: DecisionView; people: PersonView[]; members: MemberView[]; church: ChurchView | undefined;
  timelineEvents: TimelineEventView[];
  onClose: () => void; onOpenMember: (id: string) => void;
}) {
  const router = useRouter();
  const responsible = decision.responsible_id ? people.find((p) => p.id === decision.responsible_id) : null;
  const linkedMember = decision.member_id ? members.find((m) => m.id === decision.member_id) : null;
  const [loading, setLoading] = useState(false);

  const encaminhar = async () => {
    setLoading(true);
    const sb = createServiceBrowserClient().schema("service");
    if (church?.organizationId && church.id) {
      await sb.from("visitors").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: decision.name,
        phone: decision.phone || null,
        origin: "Decisão no culto",
        visited_on: decision.happened_on || null,
        responsible_id: decision.responsible_id || null,
        stage: "novo",
        due: "1º contato",
        due_status: "soon",
      });
    }
    await sb.from("decisions").update({ status: "acompanhando" }).eq("id", decision.id);
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
            <PersonTimeline member={linkedMember} events={timelineEvents.filter((e) => e.member_id === linkedMember.id)} compact />
          </DrawerSection>
        )}
        <DrawerSection title="Próximos passos">
          <div className="step-stack">
            <div className="step-do"><span className="step-ic">→</span> Fazer o primeiro contato (ligar · WhatsApp)</div>
            <div className="step-do"><span className="step-ic">→</span> Iniciar acompanhamento 1-a-1</div>
            <div className="step-do"><span className="step-ic">→</span> Matricular em Novos Convertidos</div>
            {(church?.settings?.gruposCfg?.ativo ?? true) && <div className="step-do"><span className="step-ic">→</span> Inserir num {church?.settings?.gruposCfg?.termoP ?? "Grupo de Comunhão"}</div>}
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
  const [concluindo, setConcluindo] = useState(false);
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

  const concluirTurma = async () => {
    if (!church?.organizationId) return;
    setConcluindo(true);
    const sb = createServiceBrowserClient().schema("service");
    await sb.from("baptism_classes").update({ status: "concluida" }).eq("id", classData.id);
    for (const cand of classCandidates) {
      if (!cand.member_id) continue;
      const member = memberById.get(cand.member_id);
      if (!member) continue;
      await sb.from("timeline_events").insert(
        timelineEventPayload(church.organizationId, member.id, "batismo", "Batismo nas águas", classData.baptism_date),
      );
      const journey = [...member.journey];
      journey[1] = 1;
      await sb.from("members").update({ journey }).eq("id", member.id);
    }
    setConcluindo(false);
    onRefresh();
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
        {!concluida && (
          <button className="btn btn-pri" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} type="button" disabled={concluindo} onClick={concluirTurma}>
            {concluindo ? "Concluindo…" : "Marcar turma como realizada →"}
          </button>
        )}
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
  visitor: initVisitor, notes, church, people, onClose, onOpenMember, setModal,
}: {
  visitor: VisitorView; notes: VisitorNoteView[]; church: ChurchView | undefined;
  people: PersonView[]; onClose: () => void; onOpenMember: (id: string) => void;
  setModal: (modal: ModalState) => void;
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
                  : (
                    <button className="btn btn-pri btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} type="button" onClick={() => setModal({
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
                    })}>Completar dados de membro →</button>
                  )}
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

function MemberEditModal({
  member, fellowshipGroups, church, onClose, onRefresh,
}: {
  member: MemberView;
  fellowshipGroups: FellowshipGroupView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
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
        timelineEventPayload(church.organizationId, member.id, "integracao", `Entrou no Grupo "${group?.name ?? "Comunhão"}"`),
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
          <div className="field"><label className="field-label">Aniversário</label><input className="input" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} /></div>
          <div className="field"><label className="field-label">Bairro</label><input className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Onde mora" /></div>
          {(church?.settings?.gruposCfg?.ativo ?? true) && (
            <div className="field">
              <label className="field-label">{church?.settings?.gruposCfg?.termoP ?? "Grupo de Comunhão"}</label>
              <select className="select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Sem grupo</option>
                {fellowshipGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div className="field"><label className="field-label">Família</label><input className="input" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="ex: Família Lima (agrupa parentes na ficha)" /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function AddToMinistryModal({
  ministry, people, members, church, onClose,
}: {
  ministry: MinistryView;
  people: PersonView[];
  members: MemberView[];
  church: { id: string; organizationId: string };
  onClose: () => void;
}) {
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
          <div className="modal-sub">Escolha o voluntário e, se souber, a função dele neste ministério.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          {ministry.positions.length > 0 && (
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="field-label">Função (opcional)</label>
              <select className="select" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
                <option value="">Sem função definida</option>
                {ministry.positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si"><Icon name="buscar" size={13} /></span>
            <input placeholder="Buscar voluntário..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          {fora.map((p) => (
            <div className="flag-row" key={p.id} style={{ cursor: "pointer" }} onClick={() => add(p.id)}>
              <Av name={p.name} size="sm" />
              <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
              <span className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Adicionar</span>
            </div>
          ))}
          {fora.length === 0 && <div className="empty">{q ? "Nenhum resultado." : "Todos os voluntários já estão no time."}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
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
  onStartChatWithMember,
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
  onStartChatWithMember: (memberId: string) => void;
}) {
  const router = useRouter();
  const [editingMember, setEditingMember] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);

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
        sub: `${ev.name} · ${ev.time}`,
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
          <DrawerSection title={`Meu calendário · ${personCalEvents.length} compromisso(s)`}>
            <MiniCalendar events={personCalEvents} />
          </DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => { setDrawer(null); setRoute("escalas"); }}>Escalar</button>
            {(() => {
              const linkedMember = members.find((m) => m.volunteerId === person.id);
              return (
                <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" disabled={!linkedMember} onClick={() => linkedMember && onStartChatWithMember(linkedMember.id)}>Enviar mensagem</button>
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
    return (
      <>
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
              <dt>Aniversário</dt><dd>{member.birth || <span style={{ color: "var(--subtle)" }}>a completar</span>}</dd>
              <dt>Bairro</dt><dd>{member.neighborhood || <span style={{ color: "var(--subtle)" }}>a completar</span>}</dd>
              {(church?.settings?.gruposCfg?.ativo ?? true) && <><dt>{church?.settings?.gruposCfg?.termoP ?? "Grupo de Comunhão"}</dt><dd>{grupo ? <>{grupo.name}{grupoLider && <span style={{ color: "var(--subtle)" }}> · líder {grupoLider.name.split(" ")[0]}</span>}</> : <span style={{ color: "var(--subtle)" }}>sem grupo</span>}</dd></>}
              <dt>Acesso ao app</dt><dd>{member.volunteerId ? <span style={{ color: "var(--olive-soft)" }}>liberado</span> : member.email ? <span style={{ color: "var(--amber)" }}>pendente (criando acesso…)</span> : <span style={{ color: "var(--amber)" }}>pendente (falta e-mail)</span>}</dd>
            </dl>
            <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 14 }} onClick={() => setEditingMember(true)}>Editar dados</button>
          </DrawerSection>
          {familiares.length > 0 && (
            <DrawerSection title={`Família · ${familiares.length}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {familiares.map((f) => (
                  <button className="cand" type="button" style={{ width: "100%", textAlign: "left" }} key={f.id} onClick={() => setDrawer({ kind: "member", id: f.id })}>
                    <Av name={f.name} size="sm" />
                    <div className="cand-main"><div className="cand-name">{f.name}</div></div>
                  </button>
                ))}
              </div>
            </DrawerSection>
          )}
          <DrawerSection title="Serve & cargo">
            {linkedMinistries.length > 0 ? (
              <div className="ov-serve">
                {linkedMinistries.map((m) => {
                  const link = m.people.find((p) => p.personId === member.volunteerId);
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
                  const courseModuleIds = new Set(courseModules.filter((m) => m.course_id === course.id).map((m) => m.id));
                  const totalAulas = courseLessons.filter((l) => courseModuleIds.has(l.module_id)).length;
                  const pct = totalAulas ? Math.min(100, Math.round((done_count / totalAulas) * 100)) : 0;
                  return (
                    <div className="mc-row" key={id}>
                      <div className={`mc-bar tone-${course.color ?? "olive"}`} />
                      <div className="mc-main">
                        <div className="mc-head">
                          <div className="mc-name">{course.name}</div>
                          {status === "concluido" ? <span className="chip chip-ok">Concluído</span> : <span className="mc-pct">{pct}%</span>}
                        </div>
                        <div className="mc-meta">{course.level || course.kind || "curso"} · {done_count} de {totalAulas} aula(s)</div>
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
          <DrawerSection title="Jornada de integração"><PersonTimeline member={member} events={timelineEvents.filter((e) => e.member_id === member.id)} compact /></DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {isServing
              ? <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Jornada", title: member.name, subtitle: "Atualize o próximo passo de acompanhamento.", formFields: [{ k:"passo", label:"Próximo passo", type:"text", ph:"ex: Convidar para batismo" }, { k:"responsavel", label:"Responsável", type:"text", ph:"Quem acompanha" }, { k:"data", label:"Data limite", type:"date" }] })}>Atualizar jornada</button>
              : <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setModal({ eyebrow: "Convidar", title: member.name, subtitle: "Convide esta pessoa para entrar em um ministério.", saveLabel: "Enviar convite", formFields: [{ k:"ministerio", label:"Ministério", type:"text", ph:"Nome do ministério" }, { k:"msg", label:"Mensagem (opcional)", type:"area", ph:"Mensagem de convite..." }] })}>Convidar para servir</button>}
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => onStartChatWithMember(member.id)}>Enviar mensagem</button>
            {linkedPerson && (
              <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setDrawer({ kind: "person", id: linkedPerson.id })}>Ver como voluntário →</button>
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
      </>
    );
  }

  if (drawer.kind === "ministry") {
    const ministry = ministries.find((item) => item.id === drawer.id);
    if (!ministry) return null;
    const leader = ministry.people.find((link) => link.isLeader);
    const totalSlots = ministry.positions.reduce((s, p) => s + p.need_count, 0);
    const isOpen = ministry.people.length < totalSlots || totalSlots === 0;
    const profile = ministry.profile as { comoTrabalhamos?: string; chegada?: string; responsabilidades?: string[]; preRequisitos?: string[] };
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
          {(ministry.description || profile.comoTrabalhamos || profile.chegada || (profile.responsabilidades?.length ?? 0) > 0 || (profile.preRequisitos?.length ?? 0) > 0) && (
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
                {(profile.preRequisitos?.length ?? 0) > 0 && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="cursos" size={13} /> Pré-requisitos</div>
                    {profile.preRequisitos!.map((cid) => {
                      const course = courses.find((c) => c.id === cid);
                      return <div className="tinfo-li" key={cid}>Concluir o curso <b style={{ color: "var(--white)" }}>{course ? course.name : cid}</b></div>;
                    })}
                  </div>
                )}
              </div>
              <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 12 }} onClick={() => setEditingMinistry(true)}>Editar</button>
            </div>
          )}
          {!ministry.description && !profile.comoTrabalhamos && !profile.chegada && !(profile.responsabilidades?.length) && !(profile.preRequisitos?.length) && (
            <button className="btn btn-sec btn-sm" type="button" style={{ marginBottom: 22 }} onClick={() => setEditingMinistry(true)}>+ Contar sobre o time</button>
          )}
          <DrawerSection title="Funções & quem cobre">
            {porFuncao.map(({ position, pessoas }) => (
              <div key={position.id} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="esc-fn">{position.name}</div>
                  <span className="panel-meta">{position.need_count} vaga(s)</span>
                </div>
                {pessoas.length === 0 && <div style={{ fontSize: 12, color: "var(--subtle)", fontFamily: "var(--mono)" }}>Ninguém habilitado ainda.</div>}
                {pessoas.map((link) => (
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
            {semFuncao.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="esc-fn">Sem função definida</div>
                </div>
                {semFuncao.map((link) => (
                  <button className="cand" type="button" key={`semfuncao-${link.personId}`} onClick={() => setDrawer({ kind: "person", id: link.personId })}>
                    <Av name={link.personName} />
                    <div className="cand-main">
                      <div className="cand-name">{link.personName}</div>
                      <div className="cand-meta">{link.isLeader ? "Líder do time" : "Voluntário"}</div>
                    </div>
                    {link.isLeader && <span className="lider-tag">Líder</span>}
                  </button>
                ))}
              </div>
            )}
            {ministry.people.length === 0 && <div style={{ fontSize: 12, color: "var(--subtle)", fontFamily: "var(--mono)" }}>Ninguém neste time ainda.</div>}
          </DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => { setDrawer(null); setRoute("escalas"); }}>Ver escala do time →</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setAddingPerson(true)}>Adicionar pessoa</button>
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
      onClose={() => setDrawer(null)}
      setDrawer={setDrawer}
      setRoute={setRoute}
      setShareEventId={setShareEventId}
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
  setShareEventId,
}: {
  event: EventView;
  ministries: MinistryView[];
  people: PersonView[];
  roster: RosterAssignmentView[];
  onClose: () => void;
  setDrawer: (drawer: DrawerState) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  setShareEventId: (id: string) => void;
}) {
  const router = useRouter();
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
              <CronogramaEditor event={event} ministries={eventMinistries} onRefresh={() => router.refresh()} />
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
          <button className="btn btn-sec" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={() => setShareEventId(event.id)}><Icon name="comunicacao" size={15} /> Setup da celebração</button>
        </div>
      </div>
    </DrawerShell>
  );
}

/* roteiro etapa por etapa: duração soma o horário automaticamente a partir do
   início do culto (event.time é a âncora). service.event_schedule_items já tem
   duration_min/ministry_id/person_id/notes/sort_order desde a fundação (0006). */
type CronoStep = EventView["schedule"][number];

function parseHoraMin(h: string | null): number {
  const m = String(h || "").match(/(\d{1,2})[h:](\d{0,2})/);
  return m ? (+m[1]) * 60 + (+(m[2] || 0)) : 19 * 60;
}
function minToHora(min: number): string {
  min = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, "0") + "h" + String(min % 60).padStart(2, "0");
}
function fmtDuracaoMin(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return (h ? h + "h" : "") + (m || !h ? String(m).padStart(h ? 2 : 1, "0") + "min" : "");
}

function CronogramaEditor({ event, ministries, onRefresh }: { event: EventView; ministries: MinistryView[]; onRefresh: () => void }) {
  const [steps, setSteps] = useState<CronoStep[]>(event.schedule);
  const [horaInicio, setHoraInicio] = useState(event.time);
  const client = () => createServiceBrowserClient().schema("service");

  const leaderOf = (ministryId: string | null) => {
    if (!ministryId) return null;
    return ministries.find((m) => m.id === ministryId)?.people.find((p) => p.isLeader) ?? null;
  };
  const leaderName = (ministryId: string | null) => leaderOf(ministryId)?.personName ?? "a definir";

  const recalc = (list: CronoStep[], anchor: string) => {
    let acc = parseHoraMin(anchor);
    return list.map((s) => {
      const time = minToHora(acc);
      acc += s.duration_min || 0;
      return { ...s, time };
    });
  };

  const commit = async (list: CronoStep[]) => {
    const recalced = recalc(list, horaInicio);
    setSteps(recalced);
    await Promise.all(recalced.map((s) => client().from("event_schedule_items").update({ time: s.time }).eq("id", s.id)));
    onRefresh();
  };

  const setHora = async (v: string) => {
    setHoraInicio(v);
    await client().from("events").update({ time: v }).eq("id", event.id);
    const recalced = recalc(steps, v);
    setSteps(recalced);
    await Promise.all(recalced.map((s) => client().from("event_schedule_items").update({ time: s.time }).eq("id", s.id)));
    onRefresh();
  };

  const addStep = async () => {
    const { data } = await client().from("event_schedule_items").insert({
      organization_id: event.organizationId, event_id: event.id, item: "", duration_min: 15, sort_order: steps.length,
    }).select().single();
    if (data) await commit([...steps, data as CronoStep]);
  };

  const removeStep = async (id: string) => {
    await client().from("event_schedule_items").delete().eq("id", id);
    await commit(steps.filter((s) => s.id !== id));
  };

  const moveStep = async (index: number, delta: number) => {
    const j = index + delta;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[index], next[j]] = [next[j], next[index]];
    await Promise.all([
      client().from("event_schedule_items").update({ sort_order: index }).eq("id", next[index].id),
      client().from("event_schedule_items").update({ sort_order: j }).eq("id", next[j].id),
    ]);
    await commit(next);
  };

  const patch = (id: string, fields: Partial<CronoStep>) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  const commitField = async (id: string, fields: Record<string, unknown>) => {
    await client().from("event_schedule_items").update(fields).eq("id", id);
    onRefresh();
  };
  const setDuracao = async (id: string, dur: number) => {
    await commit(steps.map((s) => (s.id === id ? { ...s, duration_min: dur } : s)));
    await client().from("event_schedule_items").update({ duration_min: dur }).eq("id", id);
  };
  const setMinistryId = async (id: string, ministryId: string) => {
    const leader = leaderOf(ministryId || null);
    const fields = { ministry_id: ministryId || null, person_id: leader?.personId ?? null };
    patch(id, fields);
    await commitField(id, fields);
  };

  const totalGeral = steps.reduce((sum, s) => sum + (s.duration_min || 0), 0);
  const fimCulto = minToHora(parseHoraMin(horaInicio) + totalGeral);

  return (
    <div className="crono">
      <div className="crono-anchor">
        <div className="crono-anchor-f">
          <label>Início do culto</label>
          <TimePicker value={horaInicio} onChange={setHora} />
        </div>
        <div className="crono-anchor-note">As etapas seguem em sequência somando as durações — você só informa quanto dura cada uma. Término previsto: <b>{fimCulto}</b>.</div>
      </div>
      {steps.length === 0 && <div className="crono-empty">Sem cronograma ainda. Monte o roteiro do culto, etapa por etapa, a duração e o time responsável. O horário é calculado sozinho.</div>}
      <div className="crono-list">
        {steps.map((s, i) => (
          <div className="crono-step" key={s.id}>
            <div className="crono-rail">
              <div className="crono-hora">{s.time ?? minToHora(parseHoraMin(horaInicio))}</div>
              <div className="crono-dot" />
              {i < steps.length - 1 && <div className="crono-line" />}
            </div>
            <div className="crono-body">
              <div className="crono-row1">
                <input className="crono-item-in" placeholder="Etapa do culto (ex: Momento de louvor)" value={s.item} onChange={(e) => patch(s.id, { item: e.target.value })} onBlur={(e) => commitField(s.id, { item: e.target.value })} />
                <div className="crono-actions">
                  <button type="button" className="crono-mini" title="Subir" onClick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="crono-mini" title="Descer" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>↓</button>
                  <button type="button" className="crono-mini danger" title="Remover" onClick={() => removeStep(s.id)}>✕</button>
                </div>
              </div>
              <div className="crono-fields">
                <div className="crono-f crono-f-dur">
                  <label>Duração</label>
                  <div className="crono-dur"><input type="number" min={0} step={5} value={s.duration_min ?? 0} onChange={(e) => setDuracao(s.id, +e.target.value)} /><span>min</span></div>
                </div>
                <div className="crono-f">
                  <label>Time (opcional)</label>
                  <select className="select" value={s.ministry_id ?? ""} onChange={(e) => setMinistryId(s.id, e.target.value)}>
                    <option value="">— sem time</option>
                    {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                {s.ministry_id && (
                  <div className="crono-f crono-f-full">
                    <label>Responsável (líder do time)</label>
                    <div className="crono-resp-ro">{leaderName(s.ministry_id)}</div>
                  </div>
                )}
              </div>
              <input className="crono-obs" placeholder="Observação (opcional)" value={s.notes ?? ""} onChange={(e) => patch(s.id, { notes: e.target.value })} onBlur={(e) => commitField(s.id, { notes: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sec btn-sm crono-add" onClick={addStep}>+ Adicionar etapa</button>
      {steps.length > 0 && (
        <div className="crono-totais">
          <div className="crono-tot-geral"><span>Duração total do culto</span><b>{fmtDuracaoMin(totalGeral)}</b></div>
        </div>
      )}
    </div>
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

/* o DatePicker devolve "10 jul" (sem ano, pensado pra colunas text como
   meetings.meeting_date). service.reservations.reserved_date é uma coluna
   date de verdade — precisa de ISO. Assume o ano corrente, rolando pro
   próximo ano se o dia já passou. */
function dpToIsoDate(value: string): string | null {
  const [dayStr, monStr] = (value || "").split(" ");
  const day = parseInt(dayStr, 10);
  const monthIndex = DP_MESES.findIndex((m) => m.toLowerCase() === (monStr || "").toLowerCase());
  if (!day || monthIndex < 0) return null;
  const now = new Date();
  let year = now.getFullYear();
  if (new Date(year, monthIndex, day) < new Date(year, now.getMonth(), now.getDate())) year += 1;
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number | null {
  const m = (value || "").match(/(\d{1,2})[h:](\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

/* conflito de horário numa sala: mesma sala, mesma data, faixas que se cruzam */
function findRoomConflict(reservations: ReservationView[], roomId: string, isoDate: string, start: string, end: string): ReservationView | null {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null || endMin === null) return null;
  return reservations.find((r) => {
    if (r.room_id !== roomId || r.reserved_date !== isoDate) return false;
    const rStart = timeToMinutes(r.start_time ?? "");
    const rEnd = timeToMinutes(r.end_time ?? "");
    if (rStart === null || rEnd === null) return false;
    return startMin < rEnd && rStart < endMin;
  }) ?? null;
}

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
  ministries,
  onClose,
}: {
  modal: NonNullable<ModalState>;
  church?: ChurchView;
  people: PersonView[];
  ministries: MinistryView[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      modal.formFields
        .filter((f): f is typeof f & { value?: string } => "value" in f && !!(f as { value?: string }).value)
        .map((f) => [f.k, (f as { value?: string }).value as string]),
    )
  );
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
    const namedMinistry = (field: string) => findMinistryByName(ministries, value(field));
    let result: { error: { message: string } | null } = { error: null };

    setSaving(true);
    if (action.kind === "member") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do membro."); return; }
      const { data: newMember, error: memberError } = await supabase.schema("service").from("members").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        phone: value("tel") || null,
        email: value("email") || null,
        birth: value("nasc") || null,
        neighborhood: value("bairro") || null,
        situation: "membro",
        journey: [1, 0, 0, 0, 0],
      }).select("id").single();
      result = { error: memberError };
      if (!memberError && newMember && action.visitorId) {
        await supabase.schema("service").from("visitors").update({ member_id: newMember.id }).eq("id", action.visitorId);
      }
      if (!memberError && newMember) {
        await supabase.schema("service").from("timeline_events").insert(
          timelineEventPayload(church.organizationId, newMember.id, "decisao", "Decisão por Jesus"),
        );
        if (value("email")) {
          fetch("/api/service/members/create-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId: church.organizationId,
              churchId: church.id,
              memberId: newMember.id,
              name: value("nome"),
              email: value("email"),
              phone: value("tel") || null,
            }),
          }).catch((err) => console.error("Não foi possível criar o acesso ao app deste membro agora:", err));
        }
      }
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
    } else if (action.kind === "visitor") {
      if (!value("nome")) {
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
    } else if (action.kind === "identity") {
      result = await supabase.schema("service").from("church_identity").upsert({
        church_id: church.id,
        organization_id: church.organizationId,
        purpose: value("proposito") || null,
        mission: value("missao") || null,
        vision: value("visao") || null,
        verse: value("versiculo") || null,
        updated_at: new Date().toISOString(),
      });
    } else if (action.kind === "historyEntry") {
      if (!value("titulo")) { setSaving(false); setError("Digite o título do capítulo."); return; }
      const payload = {
        organization_id: church.organizationId,
        church_id: church.id,
        year: value("ano") || null,
        title: value("titulo"),
        body: value("desc") || null,
        link: value("link") || null,
        updated_at: new Date().toISOString(),
      };
      result = action.id
        ? await supabase.schema("service").from("history_entries").update(payload).eq("id", action.id)
        : await supabase.schema("service").from("history_entries").insert(payload);
    } else if (action.kind === "cycle") {
      if (!value("ano") || !value("tema")) { setSaving(false); setError("Digite o ano e o tema do ciclo."); return; }
      const payload = {
        year: value("ano"),
        theme: value("tema"),
        verse: value("versiculo") || null,
        body: value("desc") || null,
        objectives: value("objetivos") ? value("objetivos").split(",").map((title) => ({ title: title.trim() })).filter((o) => o.title) : [],
      };
      result = action.id
        ? await supabase.schema("service").from("cycles").update(payload).eq("id", action.id)
        : await supabase.schema("service").from("cycles").insert({
            organization_id: church.organizationId,
            church_id: church.id,
            ...payload,
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
    } else if (action.kind === "congregacao") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome da congregação."); return; }
      result = await supabase.schema("service").from("churches").insert({
        organization_id: church.organizationId,
        name: value("nome"),
        city: value("cidade") || null,
        is_headquarters: false,
        doc: value("doc") || null,
        founded_year: value("fundada") || null,
        address: value("endereco") || null,
        postal_code: value("cep") || null,
        email: value("email") || null,
        phone: value("tel") || null,
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
