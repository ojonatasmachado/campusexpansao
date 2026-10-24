import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "../supabase";
import type { RequirementRow } from "../requirements";
import type { MissingRequirement, ServeRequest } from "../../MobileApp";
import { cookies } from "next/headers";
import type { ChurchRow, ChurchView, ChurchIdentityRow, CycleRow, HistoryEntryRow, MinisterialTitleRow, FellowshipGroupRow, TagRow, PersonRow, PersonView, MemberRow, MemberView, MinistryRow, MinistryPositionRow, PersonMinistryRow, MinistryView, EventRow, ScheduleItemRow, SetlistSongRow, EventView, DecisionView, VisitorView, VisitorNoteView, TimelineEventView, JourneyChangeRequestRow, JourneyChangeRequestView, AnnouncementView, AnnouncementResponseView, EventRsvpView, CareMarkView, WallPostView, AnnouncementReadView, EventAttendanceView, BaptismClassView, BaptismCandidateView, CourseView, EnrollmentView, ModuleView, LessonView, LessonAttendanceView, BoardView, CardView, ChatView, ChatMemberView, MessageView, MeetingView, MeetingActionView, RehearsalView, RoomView, ReservationView, KidsClassView, ChildView, ChildGuardianView, KidsSessionView, KidsAttendanceView, KidsEventView, KidsEventEnrollmentView, ExtraServiceData } from "./tipos";
import { friendlyReadError, toChurchView, toPersonView, toMemberView, toMinistryViews, toEventViews } from "./adaptadores";

export const emptyExtraServiceData: ExtraServiceData = {
  visitors: [],
  visitorNotes: [],
  announcements: [],
  announcementReads: [],
  announcementResponses: [],
  eventRsvps: [],
  careMarks: [],
  eventAttendance: [],
  wallPosts: [],
  decisions: [],
  baptismClasses: [],
  baptismCandidates: [],
  courses: [],
  enrollments: [],
  courseModules: [],
  courseLessons: [],
  lessonAttendance: [],
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
  kidsClasses: [],
  kidsChildren: [],
  childGuardians: [],
  kidsSessions: [],
  kidsAttendance: [],
  kidsEvents: [],
  kidsEventEnrollments: [],
  churchIdentity: null,
  cycles: [],
  historyEntries: [],
  ministerialTitles: [],
  fellowshipGroups: [],
  tags: [],
  timelineEvents: [],
  journeyRequests: [],
  requirements: [],
  personGrants: [],
  missingRequirements: [],
  serveRequests: [],
};

export async function getServiceDashboardData(): Promise<{
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

  if (!user) {
    /* membro volta pro login da igreja dele (cookie gravado no login temático
       e no convite); a gestão usa /service/login */
    const slug = (await cookies()).get("cex_church_slug")?.value;
    redirect(slug && /^[a-z0-9-]{3,40}$/.test(slug) ? `/${slug}/entrar` : "/service/login");
  }

  /* toda pessoa com login tem ficha de membro (liderança também usa o app
     como qualquer pessoa); cria a que faltar antes de carregar os dados */
  await supabase.schema("service").rpc("ensure_my_member");

  const { data: churchesData, error: churchesError } = await supabase
    .schema("service")
    .from("churches_with_preferences")
    /* "*": lê modules_on/modules_off (0055) e vocabulario (0056) sem quebrar antes de a migração chegar em produção */
    .select("*")
    .order("is_headquarters", { ascending: false })
    .order("created_at");

  if (churchesError) {
    return { churches: [], people: [], members: [], ministries: [], events: [], extra: emptyExtraServiceData, error: friendlyReadError(churchesError.message) };
  }

  /* Leituras independentes após a autorização e a igreja. Mantém os mesmos
     resultados e a precedência dos erros, sem encadear nove viagens à API. */
  const [
    { data: peopleData, error: peopleError },
    { data: membersData, error: membersError },
    { data: ministriesData, error: ministriesError },
    { data: ofertas, error: ofertasError },
    { data: positionsData, error: positionsError },
    { data: linksData, error: linksError },
    { data: eventsData, error: eventsError },
    { data: scheduleData, error: scheduleError },
    { data: setlistData, error: setlistError },
  ] = await Promise.all([
    supabase
      .schema("service")
      .from("people")
      .select("id,organization_id,church_id,user_id,name,phone,email,since_year,status,availability,tags,meta,photo_url,created_at")
      .order("name"),
    supabase
      .schema("service")
      .from("members")
      .select("*")
      .order("name"),
    supabase
      .schema("service")
      .from("ministries")
      .select("id,organization_id,church_id,name,icon,description,profile,app_modules,created_at")
      .order("name"),
    supabase.schema("service").rpc("times_recebendo_pedidos"),
    supabase
      .schema("service")
      .from("ministry_positions")
      .select("id,organization_id,ministry_id,name,need_count,sort_order")
      .order("sort_order"),
    supabase
      .schema("service")
      .from("person_ministries")
      .select("person_id,ministry_id,organization_id,is_leader,functions"),
    supabase
      .schema("service")
      .from("events")
      /* "*": lê pede/valor/instrucoes (0058) sem quebrar antes de a migração chegar em produção */
      .select("*")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("time"),
    supabase
      .schema("service")
      .from("event_schedule_items")
      .select("id,organization_id,event_id,time,duration_min,item,ministry_id,person_id,category,notes,sort_order")
      .order("sort_order"),
    supabase
      .schema("service")
      .from("setlist_songs")
      .select("id,organization_id,event_id,title,song_key,youtube,chart,sort_order")
      .order("sort_order"),
  ]);

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

  if (ofertasError) {
    return { churches: ((churchesData ?? []) as ChurchRow[]).map(toChurchView), people, members: ((membersData ?? []) as MemberRow[]).map(toMemberView), ministries: [], events: [], extra: emptyExtraServiceData, error: friendlyReadError(ofertasError.message) };
  }
  const recebendoIds = new Set((ofertas ?? []).map((m: { id: string }) => m.id));
  for (const time of ministriesData ?? []) (time as MinistryRow).recebendo_pedidos = recebendoIds.has(time.id);

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
    courseModulesResult,
    courseLessonsResult,
    lessonAttendanceResult,
    boardsResult,
    cardsResult,
    chatsResult,
    chatMembersResult,
    messagesResult,
    visitorsResult,
    visitorNotesResult,
    announcementsResult,
    announcementReadsResult,
    eventAttendanceResult,
    wallPostsResult,
    meetingsResult,
    meetingActionsResult,
    rehearsalsResult,
    roomsResult,
    reservationsResult,
    kidsClassesResult,
    childrenResult,
    childGuardiansResult,
    kidsSessionsResult,
    kidsAttendanceResult,
    kidsEventsResult,
    kidsEventEnrollmentsResult,
    churchIdentityResult,
    cyclesResult,
    historyEntriesResult,
    ministerialTitlesResult,
    fellowshipGroupsResult,
    tagsResult,
    timelineEventsResult,
    journeyRequestsResult,
    requirementsResult,
    personGrantsResult,
    missingResult,
    serveRequestsResult,
  ] = await Promise.all([
    supabase.schema("service").from("decisions").select("id,name,phone,happened_on,kind,service_name,responsible_id,status,member_id,age,notes,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("baptism_classes").select("id,label,baptism_date,location,room_id,status,pastor,notes,open_enrollment").order("created_at", { ascending: false }),
    supabase.schema("service").from("baptism_candidates").select("id,class_id,member_id,decision_id").order("created_at", { ascending: false }),
    supabase.schema("service").from("courses").select("*").order("created_at", { ascending: false }),
    supabase.schema("service").from("enrollments").select("id,course_id,member_id,done_count,status").order("created_at", { ascending: false }),
    supabase.schema("service").from("course_modules").select("id,course_id,name,sort_order").order("sort_order", { ascending: true }),
    /* "*": dia, hora e sala da aula (0067) entram quando a migração existir */
    supabase.schema("service").from("course_lessons").select("*").order("sort_order", { ascending: true }),
    supabase.schema("service").from("lesson_attendance").select("id,course_id,lesson_id,member_id,checked_in_at,via"),
    supabase.schema("service").from("boards").select("id,name,scope,ministry_id,description,columns").order("created_at", { ascending: false }),
    supabase.schema("service").from("cards").select("id,board_id,column_id,title,description,assignees,due,priority,source_type,source_id,moved_days_ago").order("created_at", { ascending: false }),
    supabase.schema("service").from("chats").select("id,kind,ministry_id,name").order("created_at", { ascending: false }),
    /* "*": lê last_read_at (0060) sem quebrar antes de a migração chegar em produção */
    supabase.schema("service").from("chat_members").select("*"),
    supabase.schema("service").from("messages").select("id,chat_id,sender_id,body,created_at").order("created_at", { ascending: true }),
    /* "*": as colunas do autocadastro (0070) chegam sem quebrar um banco ainda sem a migração */
    supabase.schema("service").from("visitors").select("*").order("created_at", { ascending: false }),
    supabase.schema("service").from("visitor_notes").select("id,visitor_id,happened_on,body,author,is_milestone,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.schema("service").from("announcement_reads").select("id,announcement_id,person_id,read_at"),
    supabase.schema("service").from("event_attendance").select("id,event_id,person_id"),
    supabase.schema("service").from("wall_posts").select("id,author,audience,body,pinned,channels,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("meetings").select("id,title,meeting_date,time,location,author_id,status,ministries,attendees,agenda,minutes").order("created_at", { ascending: false }),
    supabase.schema("service").from("meeting_actions").select("id,meeting_id,description,assignee_id,status").order("created_at", { ascending: false }),
    supabase.schema("service").from("rehearsals").select("id,ministry_id,title,kind,rehearsal_date,time,location,room_id,recurrence,audience,attendees,repertoire,attachments,notes").order("created_at", { ascending: false }),
    supabase.schema("service").from("rooms").select("id,name,capacity,location,resources,allows_meetings").order("created_at", { ascending: false }),
    supabase.schema("service").from("reservations").select("id,room_id,title,kind,reserved_date,start_time,end_time,source_type,source_id").order("created_at", { ascending: false }),
    supabase.schema("service").from("kids_classes").select("id,church_id,name,min_age_months,max_age_months,room_id,capacity,accent").order("name"),
    supabase.schema("service").from("children").select("id,church_id,class_id,name,birth,photo_url,allergies,notes,gender,emergency_contact_name,emergency_contact_phone,image_authorized,dietary_restrictions,health_insurance,medication").order("name"),
    supabase.schema("service").from("child_guardians").select("id,child_id,guardian_person_id,relationship,can_pickup,is_primary"),
    supabase.schema("service").from("kids_sessions").select("id,event_id,class_id,checkin_token,checkin_active"),
    supabase.schema("service").from("kids_attendance").select("id,session_id,child_id,status,dropped_off_by,dropped_off_at,dropped_off_via,pickup_requested_by,pickup_requested_at,picked_up_by,picked_up_confirmed_by,picked_up_at,picked_up_via,notes").order("dropped_off_at", { ascending: false }),
    supabase.schema("service").from("kids_events").select("id,church_id,title,description,event_date,time,location,room_id,capacity,open_enrollment").order("created_at", { ascending: false }),
    supabase.schema("service").from("kids_event_enrollments").select("id,kids_event_id,child_id,enrolled_by"),
    supabase.schema("service").from("church_identity").select("church_id,purpose,mission,vision,verse,values").eq("church_id", churchesData?.[0]?.id ?? "").maybeSingle(),
    supabase.schema("service").from("cycles").select("id,year,theme,verse,body,objectives,is_active").order("created_at", { ascending: false }),
    supabase.schema("service").from("history_entries").select("id,year,title,body,link,photo_url,sort_order").order("sort_order", { ascending: true }),
    supabase.schema("service").from("ministerial_titles").select("id,name,sort_order").order("sort_order", { ascending: true }),
    /* "*": colunas de local e lotação (0088) podem não existir antes da migração */
    supabase.schema("service").from("fellowship_groups").select("*").order("created_at", { ascending: false }),
    supabase.schema("service").from("tags").select("id,church_id,name,color,leaders").order("created_at", { ascending: false }),
    supabase.schema("service").from("timeline_events").select("id,member_id,event_type,title,body,by_whom,sort_key,when_label,created_at").order("sort_key", { ascending: false }),
    supabase.schema("service").from("journey_change_requests").select("id,member_id,step,event_date,note,requested_by,status,reviewed_by,reviewed_at,created_at").order("created_at", { ascending: false }),
    supabase.schema("service").from("requirements").select("target_kind,target_id,req_kind,req_ref"),
    supabase.schema("service").from("person_grants").select("person_id,grant_code"),
    supabase.schema("service").rpc("my_missing_requirements"),
    supabase.schema("service").from("serve_requests").select("id,member_id,ministry_id,status").order("created_at", { ascending: false }),
  ]);
  /* respostas "Vou / Não vou" do Mural (0049). Fora do Promise.all de
     propósito: antes da migração a tabela não existe e a tela segue sem elas. */
  const { data: responsesData } = await supabase.schema("service").from("announcement_responses").select("announcement_id,person_id,response");
  const announcementResponses = (responsesData ?? []) as AnnouncementResponseView[];
  /* lista de cuidado (0061): só a liderança lê; fora do Promise.all */
  const { data: careData } = await supabase.schema("service").from("care_marks").select("person_id,kind,via,until,created_at");
  const careMarks = (careData ?? []) as CareMarkView[];
  /* presença e inscrição em evento (0058), também fora do Promise.all */
  const { data: rsvpsData } = await supabase.schema("service").from("event_rsvps").select("event_id,person_id,kind");
  const eventRsvps = (rsvpsData ?? []) as EventRsvpView[];

  const extraError = [
    decisionsResult.error,
    baptismClassesResult.error,
    baptismCandidatesResult.error,
    coursesResult.error,
    enrollmentsResult.error,
    courseModulesResult.error,
    courseLessonsResult.error,
    lessonAttendanceResult.error,
    boardsResult.error,
    cardsResult.error,
    chatsResult.error,
    chatMembersResult.error,
    messagesResult.error,
    visitorsResult.error,
    visitorNotesResult.error,
    announcementsResult.error,
    announcementReadsResult.error,
    eventAttendanceResult.error,
    wallPostsResult.error,
    meetingsResult.error,
    meetingActionsResult.error,
    rehearsalsResult.error,
    roomsResult.error,
    reservationsResult.error,
    kidsClassesResult.error,
    childrenResult.error,
    childGuardiansResult.error,
    kidsSessionsResult.error,
    kidsAttendanceResult.error,
    kidsEventsResult.error,
    kidsEventEnrollmentsResult.error,
    churchIdentityResult.error,
    cyclesResult.error,
    historyEntriesResult.error,
    ministerialTitlesResult.error,
    fellowshipGroupsResult.error,
    tagsResult.error,
    timelineEventsResult.error,
    journeyRequestsResult.error,
    requirementsResult.error,
    personGrantsResult.error,
    missingResult.error,
    serveRequestsResult.error,
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
      (churchesData ?? []) as ChurchRow[],
    ),
    extra: {
      visitors: ((visitorsResult.data ?? []) as VisitorView[]),
      visitorNotes: ((visitorNotesResult.data ?? []) as VisitorNoteView[]),
      announcements: ((announcementsResult.data ?? []) as AnnouncementView[]),
      announcementReads: ((announcementReadsResult.data ?? []) as AnnouncementReadView[]),
      announcementResponses,
      eventRsvps,
      careMarks,
      eventAttendance: ((eventAttendanceResult.data ?? []) as EventAttendanceView[]),
      wallPosts: ((wallPostsResult.data ?? []) as WallPostView[]),
      decisions: ((decisionsResult.data ?? []) as DecisionView[]),
      baptismClasses: ((baptismClassesResult.data ?? []) as BaptismClassView[]),
      baptismCandidates: ((baptismCandidatesResult.data ?? []) as BaptismCandidateView[]),
      courses: ((coursesResult.data ?? []) as CourseView[]),
      enrollments: ((enrollmentsResult.data ?? []) as EnrollmentView[]),
      courseModules: ((courseModulesResult.data ?? []) as ModuleView[]),
      courseLessons: ((courseLessonsResult.data ?? []) as LessonView[]),
      lessonAttendance: ((lessonAttendanceResult.data ?? []) as LessonAttendanceView[]),
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
      kidsClasses: ((kidsClassesResult.data ?? []) as KidsClassView[]),
      kidsChildren: ((childrenResult.data ?? []) as ChildView[]),
      childGuardians: ((childGuardiansResult.data ?? []) as ChildGuardianView[]),
      kidsSessions: ((kidsSessionsResult.data ?? []) as KidsSessionView[]),
      kidsAttendance: ((kidsAttendanceResult.data ?? []) as KidsAttendanceView[]),
      kidsEvents: ((kidsEventsResult.data ?? []) as KidsEventView[]),
      kidsEventEnrollments: ((kidsEventEnrollmentsResult.data ?? []) as KidsEventEnrollmentView[]),
      churchIdentity: (churchIdentityResult.data ?? null) as ChurchIdentityRow | null,
      cycles: ((cyclesResult.data ?? []) as CycleRow[]),
      historyEntries: ((historyEntriesResult.data ?? []) as HistoryEntryRow[]),
      ministerialTitles: ((ministerialTitlesResult.data ?? []) as MinisterialTitleRow[]),
      fellowshipGroups: ((fellowshipGroupsResult.data ?? []) as FellowshipGroupRow[]),
      tags: ((tagsResult.data ?? []) as TagRow[]),
      timelineEvents: ((timelineEventsResult.data ?? []) as TimelineEventView[]),
      journeyRequests: ((journeyRequestsResult.data ?? []) as JourneyChangeRequestRow[]).map((row) => ({
        id: row.id,
        memberId: row.member_id,
        step: row.step,
        eventDate: row.event_date,
        note: row.note,
        requestedBy: row.requested_by,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
      })) as JourneyChangeRequestView[],
      requirements: ((requirementsResult.data ?? []) as RequirementRow[]),
      personGrants: ((personGrantsResult.data ?? []) as { person_id: string; grant_code: string }[]).map((g) => ({ personId: g.person_id, code: g.grant_code })),
      missingRequirements: ((missingResult.data ?? []) as MissingRequirement[]),
      serveRequests: ((serveRequestsResult.data ?? []) as ServeRequest[]),
    },
    error: extraError ? friendlyReadError(extraError.message) : "",
  };
}
