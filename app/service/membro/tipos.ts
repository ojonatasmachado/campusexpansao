import { type RequirementKind } from "../lib/requirements";
import { type EstadoModulos } from "../modules/registry";
import type { CategoriaAviso, ContextoMembro } from "../modules/define";
import { type AniversarioNoTime } from "../modules/aniversarios/CartaoDoTime";
import { type FatoView } from "../lib/historico";
import { type ContribuirCfg } from "../modules/contribuir/pix";

// ── tipos (subconjunto dos tipos de ServiceExactApp) ──────────────────────────

export type P = {
  id: string;
  name: string;
  availability: Record<string, boolean>;
  tags: string[];
  status: string;
  photoUrl?: string | null;
};
export type M = {
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
export type Ministry = {
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
export type JourneyStep = "decisao" | "batismo" | "curso" | "integracao" | "time";
export type JourneyRequest = {
  id: string;
  memberId: string;
  step: JourneyStep;
  eventDate: string | null;
  note: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
};
export type Ev = {
  id: string; name: string; weekday: string; eventDate: string; time: string; location?: string; kind?: string;
  /* o que o evento pede, valor e instruções (0058, v7 4.5) */
  pede?: "aviso" | "presenca" | "inscricao"; valor?: string; instrucoes?: string;
};
export type EventRsvp = { event_id: string; person_id: string; kind: "presenca" | "inscricao" };
export type MeetingLite = { id: string; title: string; meeting_date: string | null; time: string | null; location: string | null; status: string; ministries: string[]; attendees: string[] };
export type RehearsalLite = { id: string; ministry_id: string | null; title: string; rehearsal_date: string | null; time: string | null; location: string | null; attendees: string[] };
export type Slot = { id: string; event_id: string; position_id: string; person_id: string; status: "ok" | "wait" | "no" };
export type Card = {
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
export type Board = { id: string; name: string; columns: Array<{ id: string; nome?: string; name?: string }> };
export type Course = { id: string; name: string; kind: string | null; level: string | null; description: string | null; published?: boolean };
export type Enrollment = { id: string; course_id: string; member_id: string; done_count: number; status: string };

/* ── caminhada do membro no app (Fase 4, migração 0046) ─────────────────────────
   O que falta pra cada curso/time/"Quero servir" vem do banco
   (service.my_missing_requirements) e as ações passam por funções que
   conferem os requisitos no servidor. As abas leem daqui via contexto. */
export type MissingRequirement = { target_kind: "course" | "ministry" | "serve"; target_id: string | null; req_kind: RequirementKind; req_ref: string };
export type ServeRequest = { id: string; member_id: string; ministry_id: string; status: "pendente" | "aprovado" | "recusado" };
export type BaptismCandidateRef = { class_id: string; member_id: string | null };
export type JourneyActions = {
  missing: MissingRequirement[];
  serveRequests: ServeRequest[];
  baptismCandidates: BaptismCandidateRef[];
  onEnrollCourse?: (courseId: string) => Promise<string>;
  onRequestBaptism?: (classId: string) => Promise<string>;
  onRequestServe?: (ministryId: string) => Promise<string>;
  /* nomes pra explicar o que falta ("Concluiu: Fundamentos") */
  names: { courses: { id: string; name: string }[]; events: { id: string; name: string }[]; groupsLabel?: string };
};
export type CourseModule = { id: string; course_id: string; name: string; sort_order: number };
export type CourseLesson = { id: string; module_id: string; name: string; sort_order?: number | null; kind?: string | null; link?: string | null; conteudo?: string | null; lesson_date?: string | null; lesson_time?: string | null; location?: string | null };
export type Visitor = { id: string; name: string; phone: string | null; stage: string; origin: string | null };
export type BaptismClass = {
  id: string;
  label: string;
  baptism_date: string | null;
  location: string | null;
  status: string | null;
  pastor: string | null;
  open_enrollment: boolean;
};
export type Announcement = {
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
  /* urgente (0075): marca no Mural e prioridade maior do cartão */
  urgent?: boolean | null;
};
export type Chat = { id: string; kind: string; ministry_id: string | null; name: string | null };
export type ChatMember = { chat_id: string; member_id: string; last_read_at?: string | null };
export type Message = { id: string; chat_id: string; sender_id: string | null; body: string; created_at: string };
export type KidsClass = { id: string; church_id: string; name: string; min_age_months: number | null; max_age_months: number | null };
export type Child = {
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
export type ChildGuardian = { id: string; child_id: string; guardian_person_id: string; relationship: string | null; can_pickup: boolean; is_primary?: boolean };
export type KidsSession = { id: string; event_id: string; class_id: string; checkin_active: boolean };
export type KidsAttendance = {
  id: string;
  session_id: string;
  child_id: string;
  status: "presente" | "retirada_pendente" | "retirado";
  dropped_off_at: string;
  dropped_off_via: "qr" | "manual";
};
export type KidsEvent = { id: string; church_id: string; title: string; description: string | null; event_date: string | null; time: string | null; location: string | null; capacity: number | null; open_enrollment: boolean };
export type KidsEventEnrollment = { id: string; kids_event_id: string; child_id: string; enrolled_by: string | null };
export type WallPost = { id: string; author: string | null; audience: string | null; body: string; pinned: boolean; created_at: string };
export type BibleMark = { id: string; book: string; chapter: number; verse: number; color: string | null; note: string | null; updated_at: string };

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
  /* chave Pix da igreja (settings.contribuirCfg da matriz); sem chave, Contribuir não aparece */
  contribuir?: Partial<ContribuirCfg> | null;
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

// ── aba: Biblia (leitura, marcacao, anotacao e busca) ─────────────────────────

export type BibleBook = { abbrev: string; name: string; chapters: string[][] };
export type BibleFlatVerse = { abbrev: string; name: string; chapter: number; verse: number; text: string; norm: string };

// ── frame: celular ────────────────────────────────────────────────────────────

// ── App do membro v6: 5 destinos fixos, uma ação por cartão ───────────────────
/* Início · Agenda · Mensagens · Caminhada · Perfil, na mesma ordem para todo
   mundo (S15). Cada função mora numa aba de casa (registro MEMBER_MODULES) e
   pode aparecer como cartão em "Para você agora". Nenhum módulo cria aba:
   um módulo novo (Contribuir, Eventos com inscrição, Meu grupo) entra no
   registro sem mexer na barra. */

export type MemberTab = "inicio" | "agenda" | "mensagens" | "caminhada" | "perfil";

export type ModuleCtx = ContextoMembro;
export type MemberModule = {
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

/* casca: folha de baixo, aviso com "Desfazer" e navegação entre abas */
export type MemberUi = {
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
  /* lei 9: a permissão de notificação é pedida depois da primeira escala confirmada */
  escalaConfirmada: () => void;
};

// ── Início (S17, v7 4.3) ──────────────────────────────────────────────────────
/* Duas zonas (decisão 2): "Para você agora" é a fila da casca (lei 5: ordem
   por prioridade e prazo, até 3 na primeira dobra, botão cheio só no
   primeiro, "Tudo em dia" quando vazia); "Da igreja" mostra os eventos da
   semana, até 3. O culto em que a pessoa serve aparece uma vez: com escala a
   confirmar, só o cartão da fila; confirmada, na lista com o selo "Você serve". */
export type ItemInicio =
  | { k: "escala"; slot: Slot; ev: Ev }
  | { k: "kids" }
  | { k: "tarefa"; card: Card }
  | { k: "mural"; aviso: Announcement }
  | { k: "passo"; step: StepView }
  | { k: "servir"; times: Ministry[] }
  | { k: "cadastro"; falta: string[] }
  | { k: "atalho" }
  | { k: "aniversario"; pessoas: AniversarioNoTime[] };
export type TipoAgenda = "Serve" | "Ensaio" | "Reunião" | "Aula" | "Tarefa" | "Evento" | "Culto";
export type ItemAgenda = { id: string; data: string; hora?: string | null; tipo: TipoAgenda; titulo: string; sub?: string; selo?: React.ReactNode; abrir?: () => void };

// ── Caminhada (S21, S22, S23, S43) ────────────────────────────────────────────
export type StepView = {
  id: JourneyStep; nome: string; st: "feito" | "andamento" | "afazer"; info?: string; acao?: string; run?: () => void;
  /* convite com inscrição aberta (v7 4.7): vira cartão próprio no Início, só para quem ainda não fez a etapa */
  inscricao?: string;
};
