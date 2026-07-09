import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "../lib/supabase";
import KidsCheckinClient from "./KidsCheckinClient";

export default async function ServiceKidsCheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; t?: string }>;
}) {
  const { session: sessionId, t: token } = await searchParams;
  if (!sessionId) redirect("/service");

  const supabase = await createServiceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const back = `/service/kids-checkin?session=${encodeURIComponent(sessionId)}${token ? `&t=${encodeURIComponent(token)}` : ""}`;
    redirect(`/service/login?redirect=${encodeURIComponent(back)}`);
  }

  const { data: sessionRow } = await supabase
    .schema("service")
    .from("kids_sessions")
    .select("id,organization_id,event_id,class_id,checkin_token,checkin_active")
    .eq("id", sessionId)
    .maybeSingle();

  const [{ data: eventRow }, { data: classRow }, { data: personRow }] = await Promise.all([
    sessionRow
      ? supabase.schema("service").from("events").select("id,name,weekday,event_date,time,location").eq("id", sessionRow.event_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sessionRow
      ? supabase.schema("service").from("kids_classes").select("id,name").eq("id", sessionRow.class_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.schema("service").from("people").select("id,name").eq("user_id", user.id).maybeSingle(),
  ]);

  let guardianChildren: { id: string; name: string; can_pickup: boolean }[] = [];
  let attendanceByChild: Record<string, { id: string; status: string }> = {};

  if (personRow && sessionRow) {
    const { data: guardianRows } = await supabase
      .schema("service")
      .from("child_guardians")
      .select("child_id,can_pickup,children(id,name)")
      .eq("guardian_person_id", personRow.id);

    guardianChildren = ((guardianRows ?? []) as unknown as { child_id: string; can_pickup: boolean; children: { id: string; name: string } | null }[])
      .filter((row) => row.children)
      .map((row) => ({ id: row.children!.id, name: row.children!.name, can_pickup: row.can_pickup }));

    if (guardianChildren.length) {
      const { data: attendanceRows } = await supabase
        .schema("service")
        .from("kids_attendance")
        .select("id,child_id,status")
        .eq("session_id", sessionRow.id)
        .in("child_id", guardianChildren.map((c) => c.id))
        .neq("status", "retirado");

      attendanceByChild = Object.fromEntries(
        ((attendanceRows ?? []) as { id: string; child_id: string; status: string }[]).map((row) => [row.child_id, { id: row.id, status: row.status }]),
      );
    }
  }

  const tokenValid = !token || !sessionRow?.checkin_token || token === sessionRow.checkin_token;

  return (
    <KidsCheckinClient
      session={sessionRow ? { id: sessionRow.id, organizationId: sessionRow.organization_id, checkinActive: sessionRow.checkin_active, tokenValid } : null}
      event={eventRow ? { name: eventRow.name, weekday: eventRow.weekday, eventDate: eventRow.event_date, time: eventRow.time, location: eventRow.location } : null}
      kidsClass={classRow ? { name: classRow.name } : null}
      person={personRow ? { id: personRow.id, name: personRow.name } : null}
      guardianChildren={guardianChildren}
      attendanceByChild={attendanceByChild}
    />
  );
}
