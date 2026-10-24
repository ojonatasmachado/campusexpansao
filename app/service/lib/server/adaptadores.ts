import { regiaoInformada } from "../endereco";
import { telefoneValido } from "../telefone";
import { weekdayFromISO } from "../date";
import type { ChurchRow, ChurchView, PersonRow, PersonView, MemberRow, MemberView, MinistryRow, MinistryPositionRow, PersonMinistryRow, MinistryView, EventRow, ScheduleItemRow, SetlistSongRow, EventView } from "./tipos";

export function friendlyReadError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid schema")) {
    return "O app está fora do ar por alguns minutos. Tente de novo daqui a pouco.";
  }
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "Você não tem acesso a esta igreja. Saia e entre de novo com a conta certa.";
  }
  console.error("[service] erro ao ler:", message);
  return "Não conseguimos abrir os dados da igreja agora. Tente de novo em instantes.";
}


export function toChurchView(row: ChurchRow): ChurchView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    timeZone: row.time_zone,
    nome: row.name,
    cidade: row.city || "",
    matriz: row.is_headquarters,
    criadaEm: row.created_at,
    doc: row.doc,
    foundedYear: row.founded_year,
    address: row.address,
    postalCode: row.postal_code,
    neighborhood: row.neighborhood,
    state: row.state,
    email: row.email,
    phone: row.phone,
    logoUrl: row.logo_url,
    slug: row.slug,
    settings: row.settings ?? {},
    modulosOn: row.modules_on ?? [],
    modulosOff: row.modules_off ?? [],
    vocabulario: row.vocabulario ?? {},
  };
}


export function toPersonView(row: PersonRow): PersonView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    churchId: row.church_id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone || "",
    email: row.email || "",
    sinceYear: row.since_year || "",
    status: row.status,
    availability: row.availability ?? {},
    tags: row.tags ?? [],
    meta: row.meta ?? {},
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}


export function toMemberView(row: MemberRow): MemberView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    churchId: row.church_id,
    volunteerId: row.volunteer_id,
    groupId: row.group_id,
    titleId: row.title_id,
    name: row.name,
    phone: row.phone || "",
    email: row.email || "",
    birth: row.birth,
    sinceYear: row.since_year || "",
    situation: row.situation,
    firstContact: row.first_contact || "",
    neighborhood: row.neighborhood,
    family: row.family,
    journey: Array.isArray(row.journey) ? row.journey : [],
    createdAt: row.created_at,
    country: row.country,
    postalCode: row.postal_code,
    street: row.street,
    city: row.city,
    state: row.state,
    /* obrigatórios do membro: sem eles o app abre no primeiro acesso */
    contactComplete: !!(row.email && telefoneValido(row.phone) && regiaoInformada({ country: row.country, postalCode: row.postal_code, city: row.city })),
    /* primeiro acesso em 2 passos (v7 4.10): feito com nome e sobrenome e telefone */
    firstAccessDone: !!(row.phone && (row.name ?? "").trim().split(/\s+/).length >= 2),
    importedAt: row.imported_at ?? null,
    mapConsentAt: row.map_consent_at ?? null,
    mapConsentDeclinedAt: row.map_consent_declined_at ?? null,
    mapConsentTerms: row.map_consent_terms ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
}


export function toMinistryViews(
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
    icon: ministry.icon || "",
    description: ministry.description || "",
    profile: ministry.profile ?? {},
    recebePedidos: ministry.recebendo_pedidos === true,
    appModules: ministry.app_modules ?? [],
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


export function toEventViews(
  events: EventRow[],
  scheduleItems: ScheduleItemRow[],
  setlistSongs: SetlistSongRow[],
  churches: ChurchRow[],
): EventView[] {
  return events.map((event) => ({
    id: event.id,
    organizationId: event.organization_id,
    churchId: event.church_id,
    timeZone: churches.find((c) => c.id === event.church_id)?.time_zone ?? undefined,
    name: event.name,
    kind: event.kind || "Culto",
    weekday: weekdayFromISO(event.event_date) || event.weekday || "",
    eventDate: event.event_date || "",
    time: event.time || "",
    slot: event.slot || "",
    location: event.location || "",
    roomId: event.room_id,
    ministries: event.ministries ?? [],
    tags: event.tags ?? [],
    schedule: scheduleItems
      .filter((item) => item.event_id === event.id)
      .sort((a, b) => a.sort_order - b.sort_order),
    setlist: setlistSongs
      .filter((song) => song.event_id === event.id)
      .sort((a, b) => a.sort_order - b.sort_order),
    checkinToken: event.checkin_token,
    checkinActive: event.checkin_active ?? true,
    createdAt: event.created_at,
    pede: event.pede === "presenca" || event.pede === "inscricao" ? event.pede : "aviso",
    valor: event.valor ?? "",
    instrucoes: event.instrucoes ?? "",
  }));
}
