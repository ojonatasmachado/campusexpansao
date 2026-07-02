import Link from "next/link";
import { redirect } from "next/navigation";
import BoardsManager from "./BoardsManager";
import ChatsManager from "./ChatsManager";
import ChurchesManager from "./ChurchesManager";
import { createServiceSupabaseClient } from "./lib/supabase";
import DecisionsJourneyManager from "./DecisionsJourneyManager";
import EventsManager from "./EventsManager";
import EventsSeedButton from "./EventsSeedButton";
import MembersManager from "./MembersManager";
import MembersSeedButton from "./MembersSeedButton";
import MinistriesManager from "./MinistriesManager";
import MinistriesSeedButton from "./MinistriesSeedButton";
import PeopleSeedButton from "./PeopleSeedButton";
import PeopleManager from "./PeopleManager";
import RemainingServiceManager from "./RemainingServiceManager";
import RosterManager from "./RosterManager";
import VisitorsManager from "./VisitorsManager";

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

function availabilityLabel(availability: Record<string, boolean>) {
  const labels: Record<string, string> = {
    dom_m: "Domingo manhã",
    dom_n: "Domingo noite",
    qua: "Quarta",
  };

  const available = Object.entries(availability)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => labels[key] ?? key);

  return available.length ? available.join(" · ") : "Disponibilidade não informada";
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

function journeyLabel(journey: number[]) {
  const steps = ["Decisão", "Batismo", "Fundamentos", "GC", "Servindo"];
  const completed = steps.filter((_, index) => Boolean(journey[index]));
  return completed.length ? completed.join(" · ") : "Jornada ainda não marcada";
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
  const firstChurch = churches[0] ?? null;
  const firstVolunteer = people[0] ?? null;
  const firstMinistry = ministries[0] ?? null;
  const serviceNav = [
    ["Igrejas", "service-churches"],
    ["Voluntários", "service-people"],
    ["Membros", "service-members"],
    ["Ministérios", "service-ministries"],
    ["Eventos", "service-events"],
    ["Escala", "service-roster"],
    ["Visitantes", "service-visitors"],
    ["Decisões", "service-decisions"],
    ["Kanban", "service-boards"],
    ["Conversas", "service-chats"],
    ["Completar", "service-complete"],
  ];

  return (
    <main className="ld-sec cat-wheat" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 940 }}>
          <div className="card-body">
            <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
              CE<span>.X</span>
            </Link>
            <p className="eyebrow" id="service-churches" style={{ color: "var(--wheat)", marginTop: 28, scrollMarginTop: 24 }}>
              ◆ SERVICE · CHURCHES
            </p>
            <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
              Igrejas da sua organização
            </h1>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
              Leitura real de <code>service.churches</code>. O protótipo chamava isso de congregações:
              nome, cidade e matriz.
            </p>

            <nav className="service-module-nav" aria-label="Módulos do Service">
              {serviceNav.map(([label, id]) => (
                <a href={`#${id}`} key={id}>
                  {label}
                </a>
              ))}
            </nav>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 24 }}>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ TOTAL</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>{churches.length}</strong>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ MATRIZ</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>
                    {churches.filter((church) => church.matriz).length}
                  </strong>
                </div>
              </div>
            </div>

            {error ? (
              <div className="banner banner-soft" style={{ marginTop: 24 }}>
                <strong style={{ color: "var(--terra)" }}>Não conseguimos carregar as igrejas.</strong>
                <p className="t-small" style={{ color: "var(--light)", marginTop: 8 }}>
                  {error}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
                {churches.map((church) => (
                  <article className="card card-cream" key={church.id}>
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <p className="eyebrow" style={{ color: "var(--rust)" }}>
                            ◆ {church.matriz ? "IGREJA MATRIZ" : "CONGREGAÇÃO"}
                          </p>
                          <h2 className="t-h3" style={{ color: "var(--ink)", marginTop: 8 }}>
                            {church.nome}
                          </h2>
                          <p className="t-small" style={{ color: "var(--subtle)", marginTop: 8 }}>
                            {church.cidade}
                          </p>
                        </div>
                        <span className="badge badge-cat badge-dot">
                          {church.matriz ? "matriz" : "filial"}
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          Campo do protótipo <strong>id</strong>: {church.id}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          Organização: {church.organizationId}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          Criada em: {new Date(church.criadaEm).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <ChurchesManager churches={churches} />

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-people" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · PEOPLE
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Voluntários
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Leitura real de <code>service.people</code>. No protótipo, este módulo era <code>PESSOAS</code>.
              Voluntário pode existir sem login, por isso <code>user_id</code> é opcional.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 24 }}>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ VOLUNTÁRIOS</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>{people.length}</strong>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ ATIVOS</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>
                    {people.filter((person) => person.status === "ativo").length}
                  </strong>
                </div>
              </div>
            </div>

            {people.length === 0 ? (
              <div className="empty" style={{ marginTop: 24 }}>
                <div className="empty-mark">0</div>
                <h3 className="empty-title" style={{ color: "var(--cream)" }}>Nenhum voluntário cadastrado ainda</h3>
                <p className="empty-desc">
                  A leitura está funcionando. A lista aparece vazia porque ainda não inserimos voluntários em
                  <code> service.people</code>.
                </p>
                {firstChurch && (
                  <PeopleSeedButton churchId={firstChurch.id} organizationId={firstChurch.organizationId} />
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
                {people.map((person) => (
                  <article className="card card-cream" key={person.id}>
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <p className="eyebrow" style={{ color: "var(--rust)" }}>
                            ◆ VOLUNTÁRIO
                          </p>
                          <h3 className="t-h3" style={{ color: "var(--ink)", marginTop: 8 }}>
                            {person.name}
                          </h3>
                          <p className="t-small" style={{ color: "var(--subtle)", marginTop: 8 }}>
                            {person.phone} · {person.email}
                          </p>
                        </div>
                        <span className="badge badge-cat badge-dot">
                          {person.status}
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          name: {person.name}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          phone: {person.phone}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          status: {person.status} · engagement: {person.engagement ?? "não informado"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          availability: {availabilityLabel(person.availability)}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          tags: {person.tags.length ? person.tags.join(" · ") : "sem tags"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          user_id: {person.userId || "sem login vinculado"} · church_id: {person.churchId}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {firstChurch && (
              <PeopleManager
                people={people}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-members" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · MEMBERS
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Membros
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Leitura real de <code>service.members</code>. No protótipo, este módulo era <code>MEMBROS</code>.
              O campo <code>volunteer_id</code> substitui <code>volId</code> quando o membro também serve.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 24 }}>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ MEMBROS</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>{members.length}</strong>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ NOVOS</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>
                    {members.filter((member) => member.situation === "novo").length}
                  </strong>
                </div>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="empty" style={{ marginTop: 24 }}>
                <div className="empty-mark">0</div>
                <h3 className="empty-title" style={{ color: "var(--cream)" }}>Nenhum membro cadastrado ainda</h3>
                <p className="empty-desc">
                  A leitura está funcionando. A lista aparece vazia porque ainda não inserimos membros em
                  <code> service.members</code>.
                </p>
                {firstChurch && (
                  <MembersSeedButton
                    churchId={firstChurch.id}
                    organizationId={firstChurch.organizationId}
                    volunteerId={firstVolunteer?.id ?? null}
                  />
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
                {members.map((member) => (
                  <article className="card card-cream" key={member.id}>
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <p className="eyebrow" style={{ color: "var(--rust)" }}>
                            ◆ MEMBRO
                          </p>
                          <h3 className="t-h3" style={{ color: "var(--ink)", marginTop: 8 }}>
                            {member.name}
                          </h3>
                          <p className="t-small" style={{ color: "var(--subtle)", marginTop: 8 }}>
                            {member.phone} · {member.email}
                          </p>
                        </div>
                        <span className="badge badge-cat badge-dot">
                          {member.situation}
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          name: {member.name}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          situation: {member.situation} · since_year: {member.sinceYear}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          birth: {member.birth} · first_contact: {member.firstContact}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          neighborhood: {member.neighborhood} · family: {member.family}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          journey: {journeyLabel(member.journey)}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          volunteer_id: {member.volunteerId || "sem vínculo com voluntário"} · church_id: {member.churchId}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {firstChurch && (
              <MembersManager
                members={members}
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-ministries" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · MINISTRIES
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Ministérios e funções
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Leitura real de <code>service.ministries</code>, <code>service.ministry_positions</code> e{" "}
              <code>service.person_ministries</code>. No protótipo, este módulo era <code>TIMES</code>,
              com <code>funcoes</code>, líderes e voluntários.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 24 }}>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ MINISTÉRIOS</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>{ministries.length}</strong>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ FUNÇÕES</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>
                    {ministries.reduce((total, ministry) => total + ministry.positions.length, 0)}
                  </strong>
                </div>
              </div>
            </div>

            {ministries.length === 0 ? (
              <div className="empty" style={{ marginTop: 24 }}>
                <div className="empty-mark">0</div>
                <h3 className="empty-title" style={{ color: "var(--cream)" }}>Nenhum ministério cadastrado ainda</h3>
                <p className="empty-desc">
                  A leitura está funcionando. A lista aparece vazia porque ainda não inserimos ministérios em
                  <code> service.ministries</code>.
                </p>
                {firstChurch && (
                  <MinistriesSeedButton
                    churchId={firstChurch.id}
                    organizationId={firstChurch.organizationId}
                    personId={firstVolunteer?.id ?? null}
                  />
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
                {ministries.map((ministry) => (
                  <article className="card card-cream" key={ministry.id}>
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <p className="eyebrow" style={{ color: "var(--rust)" }}>
                            ◆ MINISTÉRIO
                          </p>
                          <h3 className="t-h3" style={{ color: "var(--ink)", marginTop: 8 }}>
                            {ministry.icon} {ministry.name}
                          </h3>
                          <p className="t-small" style={{ color: "var(--subtle)", marginTop: 8 }}>
                            {ministry.description}
                          </p>
                        </div>
                        <span className="badge badge-cat badge-dot">
                          {ministry.people.length} voluntário(s)
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          name: {ministry.name}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          positions:{" "}
                          {ministry.positions.length
                            ? ministry.positions.map((position) => `${position.name} (${position.need_count})`).join(" · ")
                            : "sem funções"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          person_ministries:{" "}
                          {ministry.people.length
                            ? ministry.people
                                .map((person) =>
                                  `${person.personName}${person.isLeader ? " · líder" : ""}${
                                    person.functions.length ? ` · ${person.functions.join(" · ")}` : ""
                                  }`,
                                )
                                .join(" · ")
                            : "sem voluntários vinculados"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          church_id: {ministry.churchId} · organization_id: {ministry.organizationId}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {firstChurch && (
              <MinistriesManager
                ministries={ministries}
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-events" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · EVENTS
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Cultos e eventos
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Leitura real de <code>service.events</code>, <code>service.event_schedule_items</code> e{" "}
              <code>service.setlist_songs</code>. No protótipo, este módulo era <code>CULTOS</code>,
              com <code>cronograma</code> e repertório.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 24 }}>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ EVENTOS</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>{events.length}</strong>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ CRONOGRAMA</p>
                  <strong className="t-h2" style={{ color: "var(--cream)" }}>
                    {events.reduce((total, event) => total + event.schedule.length, 0)}
                  </strong>
                </div>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="empty" style={{ marginTop: 24 }}>
                <div className="empty-mark">0</div>
                <h3 className="empty-title" style={{ color: "var(--cream)" }}>Nenhum evento cadastrado ainda</h3>
                <p className="empty-desc">
                  A leitura está funcionando. A lista aparece vazia porque ainda não inserimos eventos em
                  <code> service.events</code>.
                </p>
                {firstChurch && (
                  <EventsSeedButton
                    churchId={firstChurch.id}
                    organizationId={firstChurch.organizationId}
                    ministryId={firstMinistry?.id ?? null}
                    personId={firstVolunteer?.id ?? null}
                  />
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
                {events.map((event) => (
                  <article className="card card-cream" key={event.id}>
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <p className="eyebrow" style={{ color: "var(--rust)" }}>
                            ◆ EVENTO
                          </p>
                          <h3 className="t-h3" style={{ color: "var(--ink)", marginTop: 8 }}>
                            {event.name}
                          </h3>
                          <p className="t-small" style={{ color: "var(--subtle)", marginTop: 8 }}>
                            {event.weekday} · {event.eventDate} · {event.time} · {event.location}
                          </p>
                        </div>
                        <span className="badge badge-cat badge-dot">
                          {event.kind}
                        </span>
                      </div>

                      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          slot: {event.slot} · ministries: {event.ministries.length ? event.ministries.join(" · ") : "sem ministérios"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          tags: {event.tags.length ? event.tags.join(" · ") : "sem tags"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          cronograma:{" "}
                          {event.schedule.length
                            ? event.schedule
                                .map((item) => `${item.time || "sem hora"} · ${item.item}${item.duration_min ? ` (${item.duration_min}min)` : ""}`)
                                .join(" · ")
                            : "sem cronograma"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          setlist:{" "}
                          {event.setlist.length
                            ? event.setlist.map((song) => `${song.title}${song.song_key ? ` (${song.song_key})` : ""}`).join(" · ")
                            : "sem repertório"}
                        </p>
                        <p className="t-small" style={{ color: "var(--subtle)", margin: 0 }}>
                          church_id: {event.churchId} · organization_id: {event.organizationId}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {firstChurch && (
              <EventsManager
                events={events}
                ministries={ministries.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-roster" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · ROSTER
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Escala
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Escrita real em <code>service.roster_assignments</code>. Cada linha liga pessoa, função e evento.
            </p>

            {firstChurch && (
              <RosterManager
                events={events.map((event) => ({ id: event.id, name: event.name }))}
                positions={ministries.flatMap((ministry) =>
                  ministry.positions.map((position) => ({
                    id: position.id,
                    name: position.name,
                    ministryName: ministry.name,
                  })),
                )}
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-visitors" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · VISITORS
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Visitantes
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Escrita real em <code>service.visitors</code> e <code>service.visitor_notes</code>.
            </p>

            {firstChurch && (
              <VisitorsManager
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                members={members.map((member) => ({ id: member.id, name: member.name }))}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-decisions" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · DECISIONS
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Decisões e jornada
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Escrita real em <code>service.decisions</code>, <code>service.timeline_events</code> e <code>members.journey</code>.
            </p>

            {firstChurch && (
              <DecisionsJourneyManager
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                members={members.map((member) => ({ id: member.id, name: member.name, journey: member.journey }))}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-boards" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · BOARDS
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Kanban
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Escrita real em <code>service.boards</code> e <code>service.cards</code>.
            </p>

            {firstChurch && (
              <BoardsManager
                ministries={ministries.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-chats" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · CHATS
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Conversas
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Escrita real em <code>service.chats</code>, <code>service.chat_members</code> e <code>service.messages</code>.
            </p>

            {firstChurch && (
              <ChatsManager
                ministries={ministries.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
                members={members.map((member) => ({ id: member.id, name: member.name }))}
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
              />
            )}

            <div className="divider" style={{ margin: "34px 0" }} />

            <p className="eyebrow" id="service-complete" style={{ color: "var(--wheat)", scrollMarginTop: 24 }}>
              ◆ SERVICE · COMPLETAR PACOTE
            </p>
            <h2 className="t-h2" style={{ color: "var(--cream)", marginTop: 10 }}>
              Módulos finais
            </h2>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
              Identidade, comunicação, batismos, cursos internos, grupos, salas, reservas, reuniões, ensaios, check-in e relatórios.
            </p>

            {firstChurch && (
              <RemainingServiceManager
                churchId={firstChurch.id}
                organizationId={firstChurch.organizationId}
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                members={members.map((member) => ({ id: member.id, name: member.name, journey: member.journey }))}
                ministries={ministries.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
                events={events.map((event) => ({ id: event.id, name: event.name }))}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
