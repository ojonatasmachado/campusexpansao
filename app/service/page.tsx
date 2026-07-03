import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "./lib/supabase";
import ServiceExactApp from "./ServiceExactApp";

type ChurchRow = {
  id: string;
  organization_id: string;
  name: string;
  city: string | null;
  is_headquarters: boolean;
  doc: string | null;
  founded_year: string | null;
  address: string | null;
  postal_code: string | null;
  email: string | null;
  phone: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
};

type ChurchView = {
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
  email: string | null;
  phone: string | null;
  settings: Record<string, unknown>;
};

type ChurchIdentityRow = {
  church_id: string;
  purpose: string | null;
  mission: string | null;
  vision: string | null;
  verse: string | null;
  values: Array<{ title: string }> | null;
};

type CycleRow = {
  id: string;
  year: string;
  theme: string;
  verse: string | null;
  body: string | null;
  objectives: Array<{ title: string }> | null;
  is_active: boolean;
};

type HistoryEntryRow = {
  id: string;
  year: string | null;
  title: string;
  body: string | null;
  link: string | null;
  sort_order: number;
};

type MinisterialTitleRow = {
  id: string;
  name: string;
  sort_order: number;
};

type FellowshipGroupRow = {
  id: string;
  name: string;
  leader_person_id: string | null;
  weekday: string | null;
  time: string | null;
  neighborhood: string | null;
};

type TagRow = {
  id: string;
  name: string;
  color: string | null;
  leaders: string[] | null;
};

type PersonMeta = { recusasSeguidas?: number; diasIndisponivel?: number };

type PersonRow = {
  id: string;
  organization_id: string;
  church_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  since_year: string | null;
  status: "ativo" | "pausa" | "ferias";
  engagement: number | null;
  availability: Record<string, boolean> | null;
  tags: string[] | null;
  meta: PersonMeta | null;
  created_at: string;
};

type PersonView = {
  id: string;
  organizationId: string;
  churchId: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string;
  sinceYear: string;
  status: "ativo" | "pausa" | "ferias";
  engagement: number | null;
  availability: Record<string, boolean>;
  tags: string[];
  meta: PersonMeta;
  createdAt: string;
};

type MemberRow = {
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
};

type MemberView = {
  id: string;
  organizationId: string;
  churchId: string;
  volunteerId: string | null;
  groupId: string | null;
  titleId: string | null;
  name: string;
  phone: string;
  email: string;
  birth: string;
  sinceYear: string;
  situation: "membro" | "novo";
  firstContact: string;
  neighborhood: string;
  family: string;
  journey: number[];
  createdAt: string;
};

type MinistryRow = {
  id: string;
  organization_id: string;
  church_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  profile: Record<string, unknown> | null;
  created_at: string;
};

type MinistryPositionRow = {
  id: string;
  organization_id: string;
  ministry_id: string;
  name: string;
  need_count: number;
  sort_order: number;
};

type PersonMinistryRow = {
  person_id: string;
  ministry_id: string;
  organization_id: string;
  is_leader: boolean;
  functions: string[] | null;
};

type MinistryView = {
  id: string;
  organizationId: string;
  churchId: string;
  name: string;
  icon: string;
  description: string;
  profile: Record<string, unknown>;
  positions: MinistryPositionRow[];
  people: Array<{
    personId: string;
    personName: string;
    isLeader: boolean;
    functions: string[];
  }>;
  createdAt: string;
};

type EventRow = {
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
  ministries: string[] | null;
  tags: string[] | null;
  created_at: string;
};

type ScheduleItemRow = {
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

type SetlistSongRow = {
  id: string;
  organization_id: string;
  event_id: string;
  title: string;
  song_key: string | null;
  youtube: string | null;
  chart: string | null;
  sort_order: number;
};

type EventView = {
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
  ministries: string[];
  tags: string[];
  schedule: ScheduleItemRow[];
  setlist: SetlistSongRow[];
  createdAt: string;
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

type ExtraServiceData = {
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
  churchIdentity: ChurchIdentityRow | null;
  cycles: CycleRow[];
  historyEntries: HistoryEntryRow[];
  ministerialTitles: MinisterialTitleRow[];
  fellowshipGroups: FellowshipGroupRow[];
  tags: TagRow[];
};

const emptyExtraServiceData: ExtraServiceData = {
  visitors: [],
  visitorNotes: [],
  announcements: [],
  wallPosts: [],
  decisions: [],
  baptismClasses: [],
  baptismCandidates: [],
  courses: [],
  enrollments: [],
  boards: [],
  cards: [],
  chats: [],
  chatMembers: [],
  messages: [],
  meetings: [],
  meetingActions: [],
  rehearsals: [],
  rooms: [],
  reservations: [],
  churchIdentity: null,
  cycles: [],
  historyEntries: [],
  ministerialTitles: [],
  fellowshipGroups: [],
  tags: [],
};

function friendlyReadError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid schema")) {
    return "O schema service ainda não está exposto na API do Supabase.";
  }
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a leitura por segurança. Confirme se você está logado na organização certa.";
  }
  return message || "Não conseguimos ler as igrejas agora.";
}

function toChurchView(row: ChurchRow): ChurchView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    nome: row.name,
    cidade: row.city || "Cidade não informada",
    matriz: row.is_headquarters,
    criadaEm: row.created_at,
    doc: row.doc,
    foundedYear: row.founded_year,
    address: row.address,
    postalCode: row.postal_code,
    email: row.email,
    phone: row.phone,
    settings: row.settings ?? {},
  };
}

function toPersonView(row: PersonRow): PersonView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    churchId: row.church_id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone || "Telefone não informado",
    email: row.email || "E-mail não informado",
    sinceYear: row.since_year || "Ano não informado",
    status: row.status,
    engagement: row.engagement,
    availability: row.availability ?? {},
    tags: row.tags ?? [],
    meta: row.meta ?? {},
    createdAt: row.created_at,
  };
}

function toMemberView(row: MemberRow): MemberView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    churchId: row.church_id,
    volunteerId: row.volunteer_id,
    groupId: row.group_id,
    titleId: row.title_id,
    name: row.name,
    phone: row.phone || "Telefone não informado",
    email: row.email || "E-mail não informado",
    birth: row.birth || "Nascimento não informado",
    sinceYear: row.since_year || "Ano não informado",
    situation: row.situation,
    firstContact: row.first_contact || "Primeiro contato não informado",
    neighborhood: row.neighborhood || "Bairro não informado",
    family: row.family || "Família não informada",
    journey: Array.isArray(row.journey) ? row.journey : [],
    createdAt: row.created_at,
  };
}

function toMinistryViews(
  ministries: MinistryRow[],
  positions: MinistryPositionRow[],
  links: PersonMinistryRow[],
  people: PersonView[],
): MinistryView[] {
  const peopleById = new Map(people.map((person) => [person.id, person.name]));

  return ministries.map((ministry) => ({
    id: ministry.id,
    organizationId: ministry.organization_id,
    churchId: ministry.church_id,
    name: ministry.name,
    icon: ministry.icon || "◆",
    description: ministry.description || "Descrição não informada",
    profile: ministry.profile ?? {},
    positions: positions
      .filter((position) => position.ministry_id === ministry.id)
      .sort((a, b) => a.sort_order - b.sort_order),
    people: links
      .filter((link) => link.ministry_id === ministry.id)
      .map((link) => ({
        personId: link.person_id,
        personName: peopleById.get(link.person_id) ?? "Voluntário não encontrado",
        isLeader: link.is_leader,
        functions: link.functions ?? [],
      })),
    createdAt: ministry.created_at,
  }));
}

function toEventViews(
  events: EventRow[],
  scheduleItems: ScheduleItemRow[],
  setlistSongs: SetlistSongRow[],
): EventView[] {
  return events.map((event) => ({
    id: event.id,
    organizationId: event.organization_id,
    churchId: event.church_id,
    name: event.name,
    kind: event.kind || "Culto",
    weekday: event.weekday || "Dia não informado",
    eventDate: event.event_date || "Data não informada",
    time: event.time || "Horário não informado",
    slot: event.slot || "slot não informado",
    location: event.location || "Local não informado",
    ministries: event.ministries ?? [],
    tags: event.tags ?? [],
    schedule: scheduleItems
      .filter((item) => item.event_id === event.id)
      .sort((a, b) => a.sort_order - b.sort_order),
    setlist: setlistSongs
      .filter((song) => song.event_id === event.id)
      .sort((a, b) => a.sort_order - b.sort_order),
    createdAt: event.created_at,
  }));
}

async function getServiceDashboardData(): Promise<{
  churches: ChurchView[];
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  extra: ExtraServiceData;
  error: string;
}> {
  const supabase = await createServiceSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/service/login");

  const { data: churchesData, error: churchesError } = await supabase
    .schema("service")
    .from("churches")
    .select("id,organization_id,name,city,is_headquarters,doc,founded_year,address,postal_code,email,phone,settings,created_at")
    .order("is_headquarters", { ascending: false })
    .order("created_at");

  if (churchesError) {
    return { churches: [], people: [], members: [], ministries: [], events: [], extra: emptyExtraServiceData, error: friendlyReadError(churchesError.message) };
  }

  const { data: peopleData, error: peopleError } = await supabase
    .schema("service")
    .from("people")
    .select("id,organization_id,church_id,user_id,name,phone,email,since_year,status,engagement,availability,tags,meta,created_at")
    .order("name");

  if (peopleError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people: [],
      members: [],
      ministries: [],
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(peopleError.message),
    };
  }

  const people = ((peopleData ?? []) as PersonRow[]).map(toPersonView);

  const { data: membersData, error: membersError } = await supabase
    .schema("service")
    .from("members")
    .select("id,organization_id,church_id,volunteer_id,group_id,title_id,name,phone,email,birth,since_year,situation,first_contact,neighborhood,family,journey,created_at")
    .order("name");

  if (membersError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people,
      members: [],
      ministries: [],
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(membersError.message),
    };
  }

  const { data: ministriesData, error: ministriesError } = await supabase
    .schema("service")
    .from("ministries")
    .select("id,organization_id,church_id,name,icon,description,profile,created_at")
    .order("name");

  if (ministriesError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people,
      members: ((membersData ?? []) as MemberRow[]).map(toMemberView),
      ministries: [],
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(ministriesError.message),
    };
  }

  const { data: positionsData, error: positionsError } = await supabase
    .schema("service")
    .from("ministry_positions")
    .select("id,organization_id,ministry_id,name,need_count,sort_order")
    .order("sort_order");

  if (positionsError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people,
      members: ((membersData ?? []) as MemberRow[]).map(toMemberView),
      ministries: [],
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(positionsError.message),
    };
  }

  const { data: linksData, error: linksError } = await supabase
    .schema("service")
    .from("person_ministries")
    .select("person_id,ministry_id,organization_id,is_leader,functions");

  if (linksError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people,
      members: ((membersData ?? []) as MemberRow[]).map(toMemberView),
      ministries: [],
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(linksError.message),
    };
  }

  const { data: eventsData, error: eventsError } = await supabase
    .schema("service")
    .from("events")
    .select("id,organization_id,church_id,name,kind,weekday,event_date,time,slot,location,ministries,tags,created_at")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("time");

  if (eventsError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people,
      members: ((membersData ?? []) as MemberRow[]).map(toMemberView),
      ministries: toMinistryViews(
        (ministriesData ?? []) as MinistryRow[],
        (positionsData ?? []) as MinistryPositionRow[],
        (linksData ?? []) as PersonMinistryRow[],
        people,
      ),
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(eventsError.message),
    };
  }

  const { data: scheduleData, error: scheduleError } = await supabase
    .schema("service")
    .from("event_schedule_items")
    .select("id,organization_id,event_id,time,duration_min,item,ministry_id,person_id,category,notes,sort_order")
    .order("sort_order");

  if (scheduleError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people,
      members: ((membersData ?? []) as MemberRow[]).map(toMemberView),
      ministries: toMinistryViews(
        (ministriesData ?? []) as MinistryRow[],
        (positionsData ?? []) as MinistryPositionRow[],
        (linksData ?? []) as PersonMinistryRow[],
        people,
      ),
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(scheduleError.message),
    };
  }

  const { data: setlistData, error: setlistError } = await supabase
    .schema("service")
    .from("setlist_songs")
    .select("id,organization_id,event_id,title,song_key,youtube,chart,sort_order")
    .order("sort_order");

  if (setlistError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people,
      members: ((membersData ?? []) as MemberRow[]).map(toMemberView),
      ministries: toMinistryViews(
        (ministriesData ?? []) as MinistryRow[],
        (positionsData ?? []) as MinistryPositionRow[],
        (linksData ?? []) as PersonMinistryRow[],
        people,
      ),
      events: [],
      extra: emptyExtraServiceData,
      error: friendlyReadError(setlistError.message),
    };
  }

  const [
    decisionsResult,
    baptismClassesResult,
    baptismCandidatesResult,
    coursesResult,
    enrollmentsResult,
    boardsResult,
    cardsResult,
    chatsResult,
    chatMembersResult,
    messagesResult,
    visitorsResult,
    visitorNotesResult,
    announcementsResult,
    wallPostsResult,
    meetingsResult,
    meetingActionsResult,
    rehearsalsResult,
    roomsResult,
    reservationsResult,
    churchIdentityResult,
    cyclesResult,
    historyEntriesResult,
    ministerialTitlesResult,
    fellowshipGroupsResult,
    tagsResult,
  ] = await Promise.all([
    supabase.schema("service").from("decisions").select("id,name,phone,happened_on,kind,service_name,responsible_id,status,member_id,age,notes,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("baptism_classes").select("id,label,baptism_date,location,status,pastor,notes,open_enrollment").order("created_at", { ascending: false }),
    supabase.schema("service").from("baptism_candidates").select("id,class_id,member_id,decision_id").order("created_at", { ascending: false }),
    supabase.schema("service").from("courses").select("id,name,kind,level,description,category").order("created_at", { ascending: false }),
    supabase.schema("service").from("enrollments").select("id,course_id,member_id,done_count,status").order("created_at", { ascending: false }),
    supabase.schema("service").from("boards").select("id,name,scope,ministry_id,description,columns").order("created_at", { ascending: false }),
    supabase.schema("service").from("cards").select("id,board_id,column_id,title,description,assignees,due,priority,source_type,moved_days_ago").order("created_at", { ascending: false }),
    supabase.schema("service").from("chats").select("id,kind,ministry_id,name").order("created_at", { ascending: false }),
    supabase.schema("service").from("chat_members").select("chat_id,member_id"),
    supabase.schema("service").from("messages").select("id,chat_id,sender_id,body,created_at").order("created_at", { ascending: true }),
    supabase.schema("service").from("visitors").select("id,name,phone,stage,visited_on,responsible_id,due,due_status,reply_status,origin,member_id,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("visitor_notes").select("id,visitor_id,happened_on,body,author,is_milestone,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("announcements").select("id,title,audience,body,author,when_label").order("created_at", { ascending: false }),
    supabase.schema("service").from("wall_posts").select("id,author,audience,body,pinned,channels,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("meetings").select("id,title,meeting_date,time,location,author_id,status,ministries,attendees,agenda,minutes").order("created_at", { ascending: false }),
    supabase.schema("service").from("meeting_actions").select("id,meeting_id,description,assignee_id,status").order("created_at", { ascending: false }),
    supabase.schema("service").from("rehearsals").select("id,ministry_id,title,kind,rehearsal_date,time,location,recurrence,audience,attendees,repertoire,attachments,notes").order("created_at", { ascending: false }),
    supabase.schema("service").from("rooms").select("id,name,capacity,location,resources").order("created_at", { ascending: false }),
    supabase.schema("service").from("reservations").select("id,room_id,title,kind,reserved_date,start_time,end_time,source_type,source_id").order("created_at", { ascending: false }),
    supabase.schema("service").from("church_identity").select("church_id,purpose,mission,vision,verse,values").eq("church_id", churchesData?.[0]?.id ?? "").maybeSingle(),
    supabase.schema("service").from("cycles").select("id,year,theme,verse,body,objectives,is_active").order("created_at", { ascending: false }),
    supabase.schema("service").from("history_entries").select("id,year,title,body,link,sort_order").order("sort_order", { ascending: true }),
    supabase.schema("service").from("ministerial_titles").select("id,name,sort_order").order("sort_order", { ascending: true }),
    supabase.schema("service").from("fellowship_groups").select("id,name,leader_person_id,weekday,time,neighborhood").order("created_at", { ascending: false }),
    supabase.schema("service").from("tags").select("id,name,color,leaders").order("created_at", { ascending: false }),
  ]);

  const extraError = [
    decisionsResult.error,
    baptismClassesResult.error,
    baptismCandidatesResult.error,
    coursesResult.error,
    enrollmentsResult.error,
    boardsResult.error,
    cardsResult.error,
    chatsResult.error,
    chatMembersResult.error,
    messagesResult.error,
    visitorsResult.error,
    visitorNotesResult.error,
    announcementsResult.error,
    wallPostsResult.error,
    meetingsResult.error,
    meetingActionsResult.error,
    rehearsalsResult.error,
    roomsResult.error,
    reservationsResult.error,
    churchIdentityResult.error,
    cyclesResult.error,
    historyEntriesResult.error,
    ministerialTitlesResult.error,
    fellowshipGroupsResult.error,
    tagsResult.error,
  ].find(Boolean);

  return {
    churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
    people,
    members: ((membersData ?? []) as MemberRow[]).map(toMemberView),
    ministries: toMinistryViews(
      (ministriesData ?? []) as MinistryRow[],
      (positionsData ?? []) as MinistryPositionRow[],
      (linksData ?? []) as PersonMinistryRow[],
      people,
    ),
    events: toEventViews(
      (eventsData ?? []) as EventRow[],
      (scheduleData ?? []) as ScheduleItemRow[],
      (setlistData ?? []) as SetlistSongRow[],
    ),
    extra: {
      visitors: ((visitorsResult.data ?? []) as VisitorView[]),
      visitorNotes: ((visitorNotesResult.data ?? []) as VisitorNoteView[]),
      announcements: ((announcementsResult.data ?? []) as AnnouncementView[]),
      wallPosts: ((wallPostsResult.data ?? []) as WallPostView[]),
      decisions: ((decisionsResult.data ?? []) as DecisionView[]),
      baptismClasses: ((baptismClassesResult.data ?? []) as BaptismClassView[]),
      baptismCandidates: ((baptismCandidatesResult.data ?? []) as BaptismCandidateView[]),
      courses: ((coursesResult.data ?? []) as CourseView[]),
      enrollments: ((enrollmentsResult.data ?? []) as EnrollmentView[]),
      boards: ((boardsResult.data ?? []) as BoardView[]),
      cards: ((cardsResult.data ?? []) as CardView[]),
      chats: ((chatsResult.data ?? []) as ChatView[]),
      chatMembers: ((chatMembersResult.data ?? []) as ChatMemberView[]),
      messages: ((messagesResult.data ?? []) as MessageView[]),
      meetings: ((meetingsResult.data ?? []) as MeetingView[]),
      meetingActions: ((meetingActionsResult.data ?? []) as MeetingActionView[]),
      rehearsals: ((rehearsalsResult.data ?? []) as RehearsalView[]),
      rooms: ((roomsResult.data ?? []) as RoomView[]),
      reservations: ((reservationsResult.data ?? []) as ReservationView[]),
      churchIdentity: (churchIdentityResult.data ?? null) as ChurchIdentityRow | null,
      cycles: ((cyclesResult.data ?? []) as CycleRow[]),
      historyEntries: ((historyEntriesResult.data ?? []) as HistoryEntryRow[]),
      ministerialTitles: ((ministerialTitlesResult.data ?? []) as MinisterialTitleRow[]),
      fellowshipGroups: ((fellowshipGroupsResult.data ?? []) as FellowshipGroupRow[]),
      tags: ((tagsResult.data ?? []) as TagRow[]),
    },
    error: extraError ? friendlyReadError(extraError.message) : "",
  };
}

export default async function ServiceHomePage() {
  const { churches, people, members, ministries, events, extra, error } = await getServiceDashboardData();
  if (!error && churches.length === 0) redirect("/service/onboarding");

  const supabase = await createServiceSupabaseClient();
  const { data: rosterData } = await supabase
    .schema("service")
    .from("roster_assignments")
    .select("id,event_id,position_id,person_id,status");
  const { count: visitorsInCare } = await supabase
    .schema("service")
    .from("visitors")
    .select("id", { count: "exact", head: true })
    .neq("stage", "membro");

  /* papel real do usuário logado + matriz de permissões da org (core.memberships /
     core.role_permissions, já semeadas no bootstrap da igreja) — ver
     supabase/migrations/0002_core.sql e 0009_bootstrap.sql. */
  const organizationId = churches[0]?.organizationId ?? "";
  const { data: { user } } = await supabase.auth.getUser();

  let currentRole: "master" | "pastor" | "lider" | "vol" = "vol";
  let currentPersonId: string | null = null;
  const permissionsMatrix: Record<string, Record<string, boolean>> = {};

  if (user && organizationId) {
    const [{ data: membershipRow }, { data: rolePermRows }, { data: personRow }] = await Promise.all([
      supabase.schema("core").from("memberships").select("role").eq("user_id", user.id).eq("organization_id", organizationId).maybeSingle(),
      supabase.schema("core").from("role_permissions").select("role,permission_code,allowed").eq("organization_id", organizationId),
      supabase.schema("service").from("people").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

    const membershipRole = (membershipRow as { role?: string } | null)?.role;
    if (membershipRole === "owner" || membershipRole === "master") currentRole = "master";
    else if (membershipRole === "pastor" || membershipRole === "lider" || membershipRole === "vol") currentRole = membershipRole;

    ((rolePermRows ?? []) as { role: string; permission_code: string; allowed: boolean }[]).forEach((row) => {
      const code = row.permission_code.replace(/^service\./, "");
      (permissionsMatrix[row.role] ??= {})[code] = row.allowed;
    });

    currentPersonId = (personRow as { id?: string } | null)?.id ?? null;
  }

  return (
    <ServiceExactApp
      churches={churches}
      people={people}
      members={members}
      ministries={ministries}
      events={events}
      roster={((rosterData ?? []) as RosterAssignmentView[])}
      visitorsInCare={visitorsInCare ?? 0}
      visitors={extra.visitors}
      visitorNotes={extra.visitorNotes}
      announcements={extra.announcements}
      wallPosts={extra.wallPosts}
      decisions={extra.decisions}
      baptismClasses={extra.baptismClasses}
      baptismCandidates={extra.baptismCandidates}
      courses={extra.courses}
      enrollments={extra.enrollments}
      boards={extra.boards}
      cards={extra.cards}
      chats={extra.chats}
      chatMembers={extra.chatMembers}
      messages={extra.messages}
      meetings={extra.meetings}
      meetingActions={extra.meetingActions}
      rehearsals={extra.rehearsals}
      rooms={extra.rooms}
      reservations={extra.reservations}
      churchIdentity={extra.churchIdentity ? { ...extra.churchIdentity, values: extra.churchIdentity.values ?? [] } : null}
      cycles={extra.cycles.map((cycle) => ({ ...cycle, objectives: cycle.objectives ?? [] }))}
      historyEntries={extra.historyEntries}
      ministerialTitles={extra.ministerialTitles}
      fellowshipGroups={extra.fellowshipGroups}
      tags={extra.tags.map((tag) => ({ ...tag, color: tag.color ?? "wheat", leaders: tag.leaders ?? [] }))}
      currentRole={currentRole}
      permissionsMatrix={permissionsMatrix}
      currentPersonId={currentPersonId}
      error={error}
    />
  );
}
