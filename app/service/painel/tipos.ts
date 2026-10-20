import { type BrandCfg } from "../lib/theme";
import type { EnqueteElegivelView } from "../lib/enquetes";
import type { PesquisaElegivelView, TipoPergunta as TipoPerguntaPesquisa } from "../lib/pesquisas";
import { type MissingRequirement, type ServeRequest } from "../MobileApp";
import type { PaginaCfg, IdentidadeCfg } from "../../lib/church-page";
import { type PersonGrant } from "../AccessContext";
import { type RequirementRow } from "../lib/requirements";
import { type EscalaPreset, type EscalaSettings } from "../modules/escalas/regras";
import { type AcessoMsgCfg } from "../modules/pessoas/acesso-msg";
import { type MarcaCuidado } from "../modules/cuidado/cuidado";
import { type SetupEstado } from "../modules/configuracao/setup";
import { PAPEIS_V2, ROUTES } from "./comum";

export type ChurchSettings = {
  escala?: EscalaSettings;
  escalaDelegados?: Record<string, string[]>;
  escalaPresets?: EscalaPreset[];
  checkinPermitirExtra?: boolean;
  statusCfg?: StatusCriterios;
  tiposEvento?: string[];
  horariosCulto?: string[];
  cursoGrupos?: { id: string; nome: string; desc?: string }[];
  contatoCfg?: ContatoCfg;
  acessoMsgCfg?: AcessoMsgCfg;
  gruposCfg?: GruposCfg;
  brandCfg?: BrandCfg;
  /* configuração guiada em 3 fases (v7 4.12) */
  setup?: Partial<SetupEstado>;
  paginaCfg?: PaginaCfg;
  identidadeCfg?: IdentidadeCfg;
  [key: string]: unknown;
};

export type StatusCriterios = {
  recusasInativando: number;
  recusasInativo: number;
  diasIndispInativo: number;
  considerarFerias: boolean;
};

/* nome customizável + toggle mestre de Grupos & Células, guardado em
   service.churches.settings.gruposCfg (mesmo jsonb de sempre). */
export type GruposCfg = { ativo: boolean; termo: string; termoP: string; sigla: string };

/* prazo/canal/abordagem do 1º contato com visitante, guardado em
   service.churches.settings.contatoCfg (mesmo jsonb de sempre). */
export type ContatoCfg = { prazoHoras: number; canal: string; metaIntegracaoDias: number; mensagem: string; abordagem: string };


export type ChurchView = {
  id: string;
  organizationId: string;
  nome: string;
  cidade: string;
  matriz: boolean;
  doc?: string | null;
  foundedYear?: string | null;
  address?: string | null;
  postalCode?: string | null;
  neighborhood?: string | null;
  state?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  slug?: string | null;
  settings?: ChurchSettings;
  /* exceções da igreja ao padrão dos módulos (0055) */
  modulosOn?: string[];
  modulosOff?: string[];
  /* nomes que a igreja dá aos termos (0056, lei 7) */
  vocabulario?: Record<string, unknown>;
};

export type PersonView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "ativo" | "pausa" | "ferias";
  engagement: number | null;
  availability: Record<string, boolean>;
  tags: string[];
  meta?: { recusasSeguidas?: number; diasIndisponivel?: number; birthday?: string; neighborhood?: string };
  createdAt?: string;
  photoUrl?: string | null;
};

export type MemberView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  situation: "membro" | "novo";
  firstContact: string;
  sinceYear?: string;
  neighborhood: string | null;
  journey: number[];
  birth: string | null;
  family: string | null;
  groupId: string | null;
  volunteerId: string | null;
  createdAt: string;
  postalCode?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  contactComplete?: boolean;
  firstAccessDone?: boolean;
  importedAt?: string | null;
};

export type MinistryView = {
  id: string;
  organizationId: string;
  churchId: string;
  name: string;
  icon: string;
  description: string;
  profile: Record<string, unknown>;
  appModules: string[];
  positions: Array<{ id: string; ministry_id: string; name: string; need_count: number }>;
  people: Array<{ personId: string; personName: string; isLeader: boolean; functions: string[] }>;
};

export type EventView = {
  id: string;
  organizationId: string;
  name: string;
  kind: string;
  weekday: string;
  eventDate: string;
  time: string;
  slot: string;
  location: string;
  roomId?: string | null;
  ministries: string[];
  schedule: Array<{ id: string; item: string; time: string | null; category: string | null; duration_min: number | null; ministry_id: string | null; person_id: string | null; notes: string | null; sort_order: number }>;
  setlist: Array<{ id: string; title: string; song_key: string | null }>;
  checkinToken: string | null;
  checkinActive: boolean;
  /* o que o evento pede ao membro, valor e instruções (0058, v7 4.5) */
  pede?: "aviso" | "presenca" | "inscricao";
  valor?: string;
  instrucoes?: string;
};

export type RosterAssignmentView = {
  id: string;
  event_id: string;
  position_id: string;
  person_id: string;
  status: "ok" | "wait" | "no";
  /* v7 · escala do período (0074): montada e ainda não publicada */
  rascunho?: boolean;
};

export type DecisionView = {
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

export type VisitorView = {
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
  /* autocadastro por QR/link (0070) */
  email?: string | null;
  heard_from?: string | null;
  invited_by?: string | null;
  interests?: string[] | null;
  consent_at?: string | null;
  member_id: string | null;
  created_at: string;
};

export type VisitorNoteView = {
  id: string;
  visitor_id: string;
  happened_on: string | null;
  body: string;
  author: string | null;
  is_milestone: boolean;
  created_at: string;
};

export type AnnouncementView = {
  id: string;
  title: string;
  audience: string | null;
  body: string | null;
  author: string | null;
  when_label: string | null;
  created_at: string;
  /* aviso · evento (com Vou/Não vou) · acao. Só existe depois da 0049. */
  kind?: string | null;
  /* lembrete para quem não viu (0062, v7 4.18) */
  remind_at?: string | null;
  reminded_at?: string | null;
  /* destaque no Início do app (0063, v7 4.4) */
  highlight_until?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  video_url?: string | null;
  /* rascunho, agendamento e urgência (0075) */
  status?: "publicado" | "rascunho" | "agendado" | null;
  publish_at?: string | null;
  publish_push?: boolean | null;
  urgent?: boolean | null;
  remind_hours?: number | null;
};
export type AnnouncementResponseView = { announcement_id: string; person_id: string; response: "vou" | "nao" };
export type EventRsvpView = { event_id: string; person_id: string; kind: "presenca" | "inscricao" };

export type WallPostView = {
  id: string;
  author: string | null;
  audience: string | null;
  body: string;
  pinned: boolean;
  channels: string[];
  created_at: string;
};

export type AnnouncementReadView = {
  id: string;
  announcement_id: string;
  person_id: string;
  read_at: string;
};

export type EventAttendanceView = {
  id: string;
  event_id: string;
  person_id: string;
};

export type BaptismClassView = {
  id: string;
  label: string;
  baptism_date: string | null;
  location: string | null;
  room_id?: string | null;
  status: "aberta" | "preparacao" | "agendada" | "concluida" | null;
  pastor: string | null;
  notes: string | null;
  open_enrollment: boolean;
};

export type BaptismCandidateView = {
  id: string;
  class_id: string;
  member_id: string | null;
  decision_id: string | null;
};

export type CourseView = {
  id: string;
  name: string;
  kind: "trilha" | "conteudo" | "presencial" | null;
  level: string | null;
  description: string | null;
  category: string | null;
  color: string | null;
  divulgacao: string | null;
  materiais: Array<{ id: string; tipo: string; titulo: string; url: string }>;
  modalidade: string | null;
};

export type EnrollmentView = {
  id: string;
  course_id: string;
  member_id: string;
  done_count: number;
  status: "cursando" | "concluido";
};

export type ModuleView = {
  id: string;
  course_id: string;
  name: string;
  sort_order: number;
};

export type LessonView = {
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
  /* dia, hora e sala da aula presencial/ao vivo (0067) */
  lesson_date?: string | null;
  lesson_time?: string | null;
  location?: string | null;
};

export type LessonAttendanceView = {
  id: string;
  course_id: string;
  lesson_id: string;
  member_id: string;
  checked_in_at: string;
  via: "qr" | "manual";
};

export type BoardView = {
  id: string;
  name: string;
  scope: "time" | "geral" | null;
  ministry_id: string | null;
  description: string | null;
  columns: Array<{ id: string; nome?: string; name?: string }>;
};

export type CardView = {
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

export type ChatView = {
  id: string;
  kind: "time" | "grupo" | "dm";
  ministry_id: string | null;
  name: string | null;
};

export type ChatMemberView = {
  chat_id: string;
  member_id: string;
  last_read_at?: string | null;
};

export type MessageView = {
  id: string;
  chat_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};

export type MeetingView = {
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

export type MeetingActionView = {
  id: string;
  meeting_id: string;
  description: string;
  assignee_id: string | null;
  status: "pendente" | "andamento" | "feito";
};

export type RehearsalView = {
  id: string;
  ministry_id: string | null;
  title: string;
  kind: string | null;
  rehearsal_date: string | null;
  time: string | null;
  location: string | null;
  room_id?: string | null;
  recurrence: string | null;
  audience: string | null;
  attendees: string[];
  repertoire: unknown[];
  attachments: unknown[];
  notes: string | null;
};

export type RoomView = {
  id: string;
  name: string;
  capacity: number | null;
  location: string | null;
  resources: string[];
  allows_meetings?: boolean;
};

export type ChurchIdentityView = {
  church_id: string;
  purpose: string | null;
  mission: string | null;
  vision: string | null;
  verse: string | null;
  values: Array<{ title: string; texto?: string }>;
};

export type CycleView = {
  id: string;
  year: string;
  theme: string;
  verse: string | null;
  body: string | null;
  objectives: Array<{ title: string }>;
  is_active: boolean;
};

export type HistoryEntryView = {
  id: string;
  year: string | null;
  title: string;
  body: string | null;
  link: string | null;
  photo_url: string | null;
  sort_order: number;
};

export type MinisterialTitleView = {
  id: string;
  name: string;
  sort_order: number;
};

export type FellowshipGroupView = {
  id: string;
  name: string;
  leader_person_id: string | null;
  weekday: string | null;
  time: string | null;
  neighborhood: string | null;
};

export type TagView = {
  id: string;
  churchId: string;
  name: string;
  color: string;
  leaders: string[];
};

export type TimelineEventView = {
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

export type JourneyStepKind = "decisao" | "batismo" | "curso" | "integracao" | "time";

export type JourneyChangeRequestView = {
  id: string;
  memberId: string;
  step: JourneyStepKind;
  eventDate: string | null;
  note: string | null;
  requestedBy: string;
  status: "pendente" | "aprovado" | "rejeitado";
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type BibleMarkView = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  color: string | null;
  note: string | null;
  updated_at: string;
};

export type ReservationView = {
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

export type KidsClassView = {
  id: string;
  church_id: string;
  name: string;
  min_age_months: number | null;
  max_age_months: number | null;
  room_id: string | null;
  capacity: number | null;
  accent: string | null;
};

export type ChildView = {
  id: string;
  church_id: string;
  class_id: string | null;
  name: string;
  birth: string | null;
  photo_url: string | null;
  allergies: string | null;
  notes: string | null;
  gender: "menino" | "menina" | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  image_authorized: boolean;
  dietary_restrictions: string | null;
  health_insurance: string | null;
  medication: string | null;
};

export type ChildGuardianView = {
  id: string;
  child_id: string;
  guardian_person_id: string;
  relationship: string | null;
  can_pickup: boolean;
  is_primary?: boolean;
};

export type KidsSessionView = {
  id: string;
  event_id: string;
  class_id: string;
  checkin_token: string | null;
  checkin_active: boolean;
};

export type KidsAttendanceView = {
  id: string;
  session_id: string;
  child_id: string;
  status: "presente" | "retirada_pendente" | "retirado";
  dropped_off_by: string | null;
  dropped_off_at: string;
  dropped_off_via: "qr" | "manual";
  pickup_requested_by: string | null;
  pickup_requested_at: string | null;
  picked_up_by: string | null;
  picked_up_confirmed_by: string | null;
  picked_up_at: string | null;
  picked_up_via: "qr" | "manual" | null;
  notes: string | null;
};

export type KidsEventView = {
  id: string;
  church_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  time: string | null;
  location: string | null;
  room_id?: string | null;
  capacity: number | null;
  open_enrollment: boolean;
};

export type KidsEventEnrollmentView = {
  id: string;
  kids_event_id: string;
  child_id: string;
  enrolled_by: string | null;
};

export type Props = {
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
  announcementResponses?: AnnouncementResponseView[];
  eventRsvps?: EventRsvpView[];
  careMarks?: MarcaCuidado[];
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
  kidsClasses?: KidsClassView[];
  kidsChildren?: ChildView[];
  childGuardians?: ChildGuardianView[];
  kidsSessions?: KidsSessionView[];
  kidsAttendance?: KidsAttendanceView[];
  kidsEvents?: KidsEventView[];
  kidsEventEnrollments?: KidsEventEnrollmentView[];
  churchIdentity?: ChurchIdentityView | null;
  cycles?: CycleView[];
  historyEntries?: HistoryEntryView[];
  ministerialTitles?: MinisterialTitleView[];
  fellowshipGroups?: FellowshipGroupView[];
  tags?: TagView[];
  timelineEvents?: TimelineEventView[];
  journeyRequests?: JourneyChangeRequestView[];
  requirements?: RequirementRow[];
  personGrants?: PersonGrant[];
  missingRequirements?: MissingRequirement[];
  serveRequests?: ServeRequest[];
  bibleMarks?: BibleMarkView[];
  currentRole?: "master" | "pastor" | "lider" | "membro";
  permissionsMatrix?: Record<string, Record<string, boolean>>;
  currentPersonId?: string | null;
  /* tamanho do texto guardado no perfil (posição 0 a 6, 0057) */
  textSizePerfil?: number | null;
  enqueteElegivel?: EnqueteElegivelView | null;
  pesquisaElegivel?: PesquisaElegivelView | null;
  initialTheme?: "dark" | "light";
  initialView?: "app" | "gestao";
  error: string;
};

export type DrawerState =
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

export type ShowIf = { field: string; equals: string };

export type FieldDef =
  | { k: string; label: string; type: "text"; req?: boolean; half?: boolean; ph?: string; hint?: string; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "area"; req?: boolean; half?: boolean; ph?: string; hint?: string; big?: boolean; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "select"; req?: boolean; half?: boolean; ph?: string; hint?: string; options: { v: string; l: string }[]; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "date"; req?: boolean; half?: boolean; hint?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "time"; req?: boolean; half?: boolean; hint?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "toggle"; req?: boolean; half?: boolean; hint?: string; onLabel?: string; offLabel?: string; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "checks"; req?: boolean; half?: boolean; hint?: string; options: { v: string; l: string }[]; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "icon"; req?: boolean; half?: boolean; hint?: string; value?: string; showIf?: ShowIf; secao?: string }
  | { k: string; label: string; type: "cep"; req?: boolean; half?: boolean; ph?: string; hint?: string; showIf?: ShowIf; secao?: string; autofill?: { street?: string; neighborhood?: string; city?: string; state?: string } };

export type ModalState =
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
        | { kind: "kidsClass"; id?: string }
        | { kind: "kidsEvent" }
        | { kind: "avaliacaoResposta"; enquete: EnqueteElegivelView }
        | { kind: "pesquisaResposta"; pesquisa: PesquisaElegivelView }
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

export type RouteId = keyof typeof ROUTES;

/* menu do painel (S30, S31): o título de cada tela é o nome do grupo. Gerado
   pelo registro de módulos (modules/registry.ts), na ordem dos manifestos. */
export type NavGroups = { group: string; items: { id: keyof typeof ROUTES; label: string; icon: string }[] }[];

export type CalEvent = { date: Date; label: string; sub?: string; tone?: "olive" | "amber"; onClick?: () => void };

export type PapelV2 = (typeof PAPEIS_V2)[number]["id"];
export type MatrizV2 = Record<PapelV2, Record<string, boolean>>;

/* Pesquisas da PRÓPRIA igreja pra própria congregação/voluntariado (ex.:
   pulso pós-escala) — ver app/service/lib/pesquisas.ts. Gerido aqui, dentro
   do Service (Config → Pesquisas), por master/pastor/líder. Não confundir
   com a Avaliação de Experiência (buildAvaliacaoModal acima), que é
   cross-tenant e pertence à CE.X. */

export type PesquisaPerguntaDraft = {
  id: string;
  ordem: number;
  tipo: TipoPerguntaPesquisa;
  texto: string;
  obrigatoria: boolean;
  escala: 5 | 10 | null;
  opcoes: string[] | null;
};

export type PesquisaAdminRow = {
  id: string;
  nome: string;
  status: "ativa" | "pausada" | "encerrada";
  segmentacaoModo: "todos" | "papel" | "time";
  segmentacaoValores: string[];
  disparoModo: "livre" | "periodica" | "posescala" | "campanha";
  ativoComoLivre: boolean;
  intervaloDias: number | null;
  recorrentePorEscala: boolean;
  emitidaEm: string | null;
  perguntas: PesquisaPerguntaDraft[];
  totalRespostas: number;
};

export type PesquisaDraft = Omit<PesquisaAdminRow, "totalRespostas">;

/* roteiro etapa por etapa: duração soma o horário automaticamente a partir do
   início do culto (event.time é a âncora). service.event_schedule_items já tem
   duration_min/ministry_id/person_id/notes/sort_order desde a fundação (0006). */
export type CronoStep = EventView["schedule"][number];
