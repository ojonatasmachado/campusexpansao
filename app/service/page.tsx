import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "./lib/supabase";
import ServiceExactApp from "./ServiceExactApp";

type ChurchRow = {
  id: string;
  organization_id: string;
  name: string;
  city: string | null;
  is_headquarters: boolean;
  created_at: string;
};

type ChurchView = {
  id: string;
  organizationId: string;
  nome: string;
  cidade: string;
  matriz: boolean;
  criadaEm: string;
};

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
    .select("id,organization_id,name,city,is_headquarters,created_at")
    .order("is_headquarters", { ascending: false })
    .order("created_at");

  if (churchesError) {
    return { churches: [], people: [], members: [], ministries: [], events: [], error: friendlyReadError(churchesError.message) };
  }

  const { data: peopleData, error: peopleError } = await supabase
    .schema("service")
    .from("people")
    .select("id,organization_id,church_id,user_id,name,phone,email,since_year,status,engagement,availability,tags,created_at")
    .order("name");

  if (peopleError) {
    return {
      churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView),
      people: [],
      members: [],
      ministries: [],
      events: [],
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
      error: friendlyReadError(setlistError.message),
    };
  }

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
    error: "",
  };
}

export default async function ServiceHomePage() {
  const { churches, people, members, ministries, events, error } = await getServiceDashboardData();
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

  return (
    <ServiceExactApp
      churches={churches}
      people={people}
      members={members}
      ministries={ministries}
      events={events}
      roster={((rosterData ?? []) as RosterAssignmentView[])}
      visitorsInCare={visitorsInCare ?? 0}
      error={error}
    />
  );
}
