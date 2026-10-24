import type { DbChurchClock } from "../../../lib/types";
import type { RequirementRow } from "../requirements";
import type { MissingRequirement, ServeRequest } from "../../MobileApp";

export type ChurchRow = DbChurchClock & {
  id: string;
  organization_id: string;
  name: string;
  city: string | null;
  is_headquarters: boolean;
  doc: string | null;
  founded_year: string | null;
  address: string | null;
  postal_code: string | null;
  neighborhood: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  slug: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  /* 0055: exceções ao padrão dos módulos; ausentes antes da migração */
  modules_on?: string[] | null;
  modules_off?: string[] | null;
  /* 0056: vocabulário da igreja; ausente antes da migração */
  vocabulario?: Record<string, unknown> | null;
};


export type ChurchView = {
  timeZone?: string | null;
  id: string;
  organizationId: string;
  nome: string;
  cidade: string;
  matriz: boolean;
  criadaEm: string;
  doc: string | null;
  foundedYear: string | null;
  address: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  slug: string | null;
  settings: Record<string, unknown>;
  modulosOn: string[];
  modulosOff: string[];
  vocabulario: Record<string, unknown>;
};


export type ChurchIdentityRow = {
  church_id: string;
  purpose: string | null;
  mission: string | null;
  vision: string | null;
  verse: string | null;
  values: Array<{ title: string }> | null;
};


export type CycleRow = {
  id: string;
  year: string;
  theme: string;
  verse: string | null;
  body: string | null;
  objectives: Array<{ title: string }> | null;
  is_active: boolean;
};


export type HistoryEntryRow = {
  id: string;
  year: string | null;
  title: string;
  body: string | null;
  link: string | null;
  photo_url: string | null;
  sort_order: number;
};


export type MinisterialTitleRow = {
  id: string;
  name: string;
  sort_order: number;
};


export type FellowshipGroupRow = {
  id: string;
  name: string;
  leader_person_id: string | null;
  weekday: string | null;
  time: string | null;
  neighborhood: string | null;
  /* 0088 */
  postal_code?: string | null;
  street?: string | null;
  street_number?: string | null;
  complement?: string | null;
  city?: string | null;
  capacity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};


export type TagRow = {
  id: string;
  church_id: string;
  name: string;
  color: string | null;
  leaders: string[] | null;
};


export type PersonMeta = { recusasSeguidas?: number; diasIndisponivel?: number; birthday?: string; neighborhood?: string };


export type PersonGrantView = { personId: string; code: string };


export type PersonRow = {
  id: string;
  organization_id: string;
  church_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  since_year: string | null;
  status: "ativo" | "pausa" | "ferias";
  availability: Record<string, boolean> | null;
  tags: string[] | null;
  meta: PersonMeta | null;
  photo_url: string | null;
  created_at: string;
};


export type PersonView = {
  id: string;
  organizationId: string;
  churchId: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string;
  sinceYear: string;
  status: "ativo" | "pausa" | "ferias";
  availability: Record<string, boolean>;
  tags: string[];
  meta: PersonMeta;
  photoUrl: string | null;
  createdAt: string;
};


export type MemberRow = {
  id: string;
  organization_id: string;
  church_id: string;
  volunteer_id: string | null;
  group_id: string | null;
  title_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  birth: string | null;
  since_year: string | null;
  situation: "membro" | "novo";
  first_contact: string | null;
  neighborhood: string | null;
  family: string | null;
  journey: number[] | null;
  created_at: string;
  postal_code: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  /* 0072: pode não existir antes da migração (o select é "*") */
  imported_at?: string | null;
  country?: string | null;
  /* 0087 */
  map_consent_at?: string | null;
  map_consent_declined_at?: string | null;
  map_consent_terms?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};


export type MemberView = {
  country?: string | null;
  id: string;
  organizationId: string;
  churchId: string;
  volunteerId: string | null;
  groupId: string | null;
  titleId: string | null;
  name: string;
  phone: string;
  email: string;
  birth: string | null;
  sinceYear: string;
  situation: "membro" | "novo";
  firstContact: string;
  neighborhood: string | null;
  family: string | null;
  journey: number[];
  createdAt: string;
  postalCode: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  contactComplete: boolean;
  firstAccessDone: boolean;
  importedAt: string | null;
  mapConsentAt: string | null;
  mapConsentDeclinedAt: string | null;
  mapConsentTerms: string | null;
  /* ponto do CEP (0083): o membro vê o que fica perto dele no "Onde" */
  latitude: number | null;
  longitude: number | null;
};


export type MinistryRow = {
  recebendo_pedidos?: boolean;
  id: string;
  organization_id: string;
  church_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  profile: Record<string, unknown> | null;
  app_modules: string[] | null;
  created_at: string;
};


export type MinistryPositionRow = {
  id: string;
  organization_id: string;
  ministry_id: string;
  name: string;
  need_count: number;
  sort_order: number;
};


export type PersonMinistryRow = {
  person_id: string;
  ministry_id: string;
  organization_id: string;
  is_leader: boolean;
  functions: string[] | null;
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
  positions: MinistryPositionRow[];
  people: Array<{
    personId: string;
    personName: string;
    isLeader: boolean;
    functions: string[];
  }>;
  createdAt: string;
};


export type EventRow = {
  id: string;
  organization_id: string;
  church_id: string;
  name: string;
  kind: string | null;
  weekday: string | null;
  event_date: string | null;
  time: string | null;
  slot: string | null;
  location: string | null;
  room_id: string | null;
  ministries: string[] | null;
  tags: string[] | null;
  checkin_token: string | null;
  checkin_active: boolean | null;
  created_at: string;
  /* 0058 (v7 4.5); ausentes antes da migração */
  pede?: string | null;
  valor?: string | null;
  instrucoes?: string | null;
};


export type ScheduleItemRow = {
  id: string;
  organization_id: string;
  event_id: string;
  time: string | null;
  duration_min: number | null;
  item: string;
  ministry_id: string | null;
  person_id: string | null;
  category: string | null;
  notes: string | null;
  sort_order: number;
};


export type SetlistSongRow = {
  id: string;
  organization_id: string;
  event_id: string;
  title: string;
  song_key: string | null;
  youtube: string | null;
  chart: string | null;
  sort_order: number;
};


export type EventView = {
  timeZone?: string;
  id: string;
  organizationId: string;
  churchId: string;
  name: string;
  kind: string;
  weekday: string;
  eventDate: string;
  time: string;
  slot: string;
  location: string;
  roomId: string | null;
  ministries: string[];
  tags: string[];
  schedule: ScheduleItemRow[];
  setlist: SetlistSongRow[];
  checkinToken: string | null;
  checkinActive: boolean;
  createdAt: string;
  pede: "aviso" | "presenca" | "inscricao";
  valor: string;
  instrucoes: string;
};


export type RosterAssignmentView = {
  id: string;
  event_id: string;
  position_id: string;
  person_id: string;
  status: "ok" | "wait" | "no";
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

export type JourneyRequestStatus = "pendente" | "aprovado" | "rejeitado";


export type JourneyChangeRequestRow = {
  id: string;
  member_id: string;
  step: JourneyStepKind;
  event_date: string | null;
  note: string | null;
  requested_by: string;
  status: JourneyRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};


export type JourneyChangeRequestView = {
  id: string;
  memberId: string;
  step: JourneyStepKind;
  eventDate: string | null;
  note: string | null;
  requestedBy: string;
  status: JourneyRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
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
};

export type AnnouncementResponseView = { announcement_id: string; person_id: string; response: "vou" | "nao" };

export type EventRsvpView = { event_id: string; person_id: string; kind: "presenca" | "inscricao" };

export type CareMarkView = { person_id: string; kind: "contato" | "justificada"; via: string | null; until: string | null; created_at: string };


export type WallPostView = {
  id: string;
  author: string | null;
  audience: string | null;
  body: string;
  pinned: boolean;
  channels: string[];
  created_at: string;
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
  room_id: string | null;
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
  /* false: fora do app do membro. Só existe depois da 0049. */
  published?: boolean;
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
  kind: "video" | "texto" | "presencial" | null;
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
  room_id: string | null;
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
  allows_meetings: boolean;
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
  is_primary: boolean;
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
  room_id: string | null;
  capacity: number | null;
  open_enrollment: boolean;
};


export type KidsEventEnrollmentView = {
  id: string;
  kids_event_id: string;
  child_id: string;
  enrolled_by: string | null;
};


export type ExtraServiceData = {
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  announcements: AnnouncementView[];
  announcementReads: AnnouncementReadView[];
  announcementResponses: AnnouncementResponseView[];
  eventRsvps: EventRsvpView[];
  careMarks: CareMarkView[];
  eventAttendance: EventAttendanceView[];
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
  kidsClasses: KidsClassView[];
  kidsChildren: ChildView[];
  childGuardians: ChildGuardianView[];
  kidsSessions: KidsSessionView[];
  kidsAttendance: KidsAttendanceView[];
  kidsEvents: KidsEventView[];
  kidsEventEnrollments: KidsEventEnrollmentView[];
  churchIdentity: ChurchIdentityRow | null;
  cycles: CycleRow[];
  historyEntries: HistoryEntryRow[];
  ministerialTitles: MinisterialTitleRow[];
  fellowshipGroups: FellowshipGroupRow[];
  tags: TagRow[];
  timelineEvents: TimelineEventView[];
  journeyRequests: JourneyChangeRequestView[];
  requirements: RequirementRow[];
  personGrants: PersonGrantView[];
  missingRequirements: MissingRequirement[];
  serveRequests: ServeRequest[];
};
