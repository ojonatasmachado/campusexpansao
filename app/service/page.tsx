import { redirect } from "next/navigation";
import { todayISO } from "./lib/date";
import { createServiceSupabaseClient } from "./lib/supabase";
import { resolverEnqueteElegivel } from "./lib/enquetes";
import { resolverPesquisaElegivel } from "./lib/pesquisas";
import ServiceExactApp from "./ServiceExactApp";
import { resolveMode, THEME_COOKIE, type BrandCfg } from "./lib/theme";
import { cookies, headers } from "next/headers";
import ServiceTheme from "./ServiceTheme";
import type { RosterAssignmentView, BibleMarkView } from "./lib/server/tipos";
import { getServiceDashboardData } from "./lib/server/carregar";
import { PANEL_ROUTE_PARAM } from "./lib/panel-navigation";

export default async function ServiceHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { churches, people, members, ministries, events, extra, error } = await getServiceDashboardData();
  if (!error && churches.length === 0) redirect("/service/onboarding");

  const supabase = await createServiceSupabaseClient();
  const { data: rosterData } = await supabase
    .schema("service")
    .from("roster_assignments")
    /* "*": lê rascunho (0074) sem quebrar antes de a migração chegar em produção */
    .select("*");
  const { count: visitorsInCare } = await supabase
    .schema("service")
    .from("visitors")
    .select("id", { count: "exact", head: true })
    .neq("stage", "membro");

  /* papel real do usuário logado + matriz de permissões da org (core.memberships /
     core.role_permissions, já semeadas no bootstrap da igreja): ver
     supabase/migrations/0002_core.sql e 0009_bootstrap.sql. */
  const organizationId = churches[0]?.organizationId ?? "";
  const { data: { user } } = await supabase.auth.getUser();

  let currentRole: "master" | "pastor" | "lider" | "membro" = "membro";
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
    else if (membershipRole === "pastor" || membershipRole === "lider" || membershipRole === "membro") currentRole = membershipRole;

    ((rolePermRows ?? []) as { role: string; permission_code: string; allowed: boolean }[]).forEach((row) => {
      const code = row.permission_code.replace(/^service\./, "");
      (permissionsMatrix[row.role] ??= {})[code] = row.allowed;
    });

    currentPersonId = (personRow as { id?: string } | null)?.id ?? null;
  }

  let enqueteElegivel = null as Awaited<ReturnType<typeof resolverEnqueteElegivel>>;
  if (currentPersonId) {
    const minhasEquipes = ministries.filter((m) => m.people.some((p) => p.personId === currentPersonId)).map((m) => m.name);
    const [{ data: confirmacoes }, { count: membrosCount }] = await Promise.all([
      supabase
        .schema("service")
        .from("roster_assignments")
        .select("updated_at")
        .eq("person_id", currentPersonId)
        .eq("status", "ok")
        .order("updated_at", { ascending: false })
        .limit(1),
      supabase
        .schema("service")
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("volunteer_id", currentPersonId),
    ]);
    const rosterConfirmadoEm = ((confirmacoes ?? [])[0] as { updated_at?: string } | undefined)?.updated_at ?? null;
    try {
      enqueteElegivel = await resolverEnqueteElegivel(supabase, {
        personId: currentPersonId,
        papel: currentRole,
        times: minhasEquipes,
        ehMembro: (membrosCount ?? 0) > 0,
        rosterConfirmadoEm,
      });
    } catch (err) {
      console.error("Não foi possível resolver a avaliação de experiência elegível:", err);
    }
  }

  /* pulso pós-escala da própria igreja (service.pesquisas, ver app/service/lib/pesquisas.ts):
     "pós-escala" = a escala mais recente em que a pessoa está confirmada (status='ok') e cujo
     evento já aconteceu (event_date no passado) — diferente de rosterConfirmadoEm acima, que é
     só a confirmação de presença da enquete cross-tenant da CE.X. */
  let pesquisaElegivel = null as Awaited<ReturnType<typeof resolverPesquisaElegivel>>;
  if (currentPersonId && organizationId) {
    const minhasEquipes = ministries.filter((m) => m.people.some((p) => p.personId === currentPersonId)).map((m) => m.name);
    const hoje = todayISO(churches[0]?.timeZone ?? undefined);
    const { data: escalasServidas } = await supabase
      .schema("service")
      .from("roster_assignments")
      .select("event_id, events!inner(event_date)")
      .eq("person_id", currentPersonId)
      .eq("status", "ok")
      .lt("events.event_date", hoje)
      .order("event_date", { foreignTable: "events", ascending: false })
      .limit(1);
    const ultimaEscalaEventId = ((escalasServidas ?? [])[0] as { event_id?: string } | undefined)?.event_id ?? null;
    try {
      pesquisaElegivel = await resolverPesquisaElegivel(supabase, {
        organizationId,
        personId: currentPersonId,
        papel: currentRole,
        times: minhasEquipes,
        ultimaEscalaServida: ultimaEscalaEventId ? { eventId: ultimaEscalaEventId } : null,
      });
    } catch (err) {
      console.error("Não foi possível resolver a pesquisa pós-escala elegível:", err);
    }
  }

  /* Marcações/anotações da Bíblia (service.bible_marks, ver 0036_service_biblia.sql):
     100% privado, então busca só as da própria pessoa logada, nunca da igreja toda. */
  let bibleMarks: BibleMarkView[] = [];
  if (currentPersonId) {
    const { data: bibleMarksData } = await supabase
      .schema("service")
      .from("bible_marks")
      .select("id,book,chapter,verse,color,note,updated_at")
      .eq("person_id", currentPersonId);
    bibleMarks = (bibleMarksData ?? []) as BibleMarkView[];
  }

  /* a marca é da organização: mora na igreja matriz (ver salvarPersonalizacao) */
  const brandCfg = ((churches.find((c) => c.matriz) ?? churches[0])?.settings as { brandCfg?: BrandCfg } | undefined)?.brandCfg;

  /* tamanho do texto que a pessoa escolheu (0057); sem a migração, nulo */
  const { data: textSizeData } = await supabase.schema("service").rpc("my_text_size");
  const textSizePerfil = typeof textSizeData === "number" ? textSizeData : null;

  const jar = await cookies();
  const themeMode = resolveMode(jar.get(THEME_COOKIE)?.value, brandCfg);
  /* por onde entra quem tem função de gestão: a escolha salva no aparelho
     (cex_view), ou pelo aparelho: celular abre o app de membro, computador
     abre o painel. Quem só é membro sempre vê o app. */
  const savedView = jar.get("cex_view")?.value;
  const isPhone = /Mobi|Android|iPhone|iPod/i.test((await headers()).get("user-agent") ?? "");
  const query = await searchParams;
  const memberDestination = ["inicio", "agenda", "mensagens", "caminhada", "perfil"].includes(String(query.maba ?? "")) || ["escala", "mural", "mensagens", "caminhada"].includes(String(query.aviso ?? ""));
  const initialPanelRoute = typeof query[PANEL_ROUTE_PARAM] === "string" ? query[PANEL_ROUTE_PARAM] as string : undefined;
  const initialView: "app" | "gestao" = memberDestination ? "app" : initialPanelRoute ? "gestao" : savedView === "app" || savedView === "gestao" ? savedView : isPhone ? "app" : "gestao";

  return (
    <>
    {/* tema da igreja (neutros + cor de destaque), ver app/service/lib/theme.ts */}
    <ServiceTheme brand={brandCfg} mode={themeMode} />
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
      announcementReads={extra.announcementReads}
      announcementResponses={extra.announcementResponses}
      eventRsvps={extra.eventRsvps}
      careMarks={extra.careMarks}
      eventAttendance={extra.eventAttendance}
      wallPosts={extra.wallPosts}
      decisions={extra.decisions}
      baptismClasses={extra.baptismClasses}
      baptismCandidates={extra.baptismCandidates}
      courses={extra.courses}
      enrollments={extra.enrollments}
      courseModules={extra.courseModules}
      courseLessons={extra.courseLessons}
      lessonAttendance={extra.lessonAttendance}
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
      kidsClasses={extra.kidsClasses}
      kidsChildren={extra.kidsChildren}
      childGuardians={extra.childGuardians}
      kidsSessions={extra.kidsSessions}
      kidsAttendance={extra.kidsAttendance}
      kidsEvents={extra.kidsEvents}
      kidsEventEnrollments={extra.kidsEventEnrollments}
      churchIdentity={extra.churchIdentity ? { ...extra.churchIdentity, values: extra.churchIdentity.values ?? [] } : null}
      cycles={extra.cycles.map((cycle) => ({ ...cycle, objectives: cycle.objectives ?? [] }))}
      historyEntries={extra.historyEntries}
      ministerialTitles={extra.ministerialTitles}
      fellowshipGroups={extra.fellowshipGroups}
      tags={extra.tags.map((tag) => ({ id: tag.id, churchId: tag.church_id, name: tag.name, color: tag.color ?? "wheat", leaders: tag.leaders ?? [] }))}
      timelineEvents={extra.timelineEvents}
      journeyRequests={extra.journeyRequests}
      requirements={extra.requirements}
      personGrants={extra.personGrants}
      missingRequirements={extra.missingRequirements}
      serveRequests={extra.serveRequests}
      bibleMarks={bibleMarks}
      currentRole={currentRole}
      permissionsMatrix={permissionsMatrix}
      currentPersonId={currentPersonId}
      textSizePerfil={textSizePerfil}
      enqueteElegivel={enqueteElegivel}
      pesquisaElegivel={pesquisaElegivel}
      initialTheme={themeMode}
      initialView={initialView}
      initialPanelRoute={initialPanelRoute}
      error={error}
    />
    </>
  );
}
