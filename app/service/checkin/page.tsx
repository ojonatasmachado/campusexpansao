import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "../lib/supabase";
import CheckinLandingClient from "./CheckinLandingClient";

type CheckinResult = {
  ok: boolean;
  dup?: boolean;
  extra?: boolean;
  bloq?: boolean;
  motivo?: string;
};

/* rota pública lida por quem escaneia o QR físico do check-in (evolucoes/service_app
   lê isso via location.search dentro do próprio app; aqui vira uma rota própria
   porque o admin e o app do voluntário são superfícies separadas). */
export default async function ServiceCheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; t?: string }>;
}) {
  const { event: eventId, t: token } = await searchParams;
  if (!eventId) redirect("/service");

  const supabase = await createServiceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const back = `/service/checkin?event=${encodeURIComponent(eventId)}${token ? `&t=${encodeURIComponent(token)}` : ""}`;
    redirect(`/service/login?redirect=${encodeURIComponent(back)}`);
  }

  const { data: eventRow } = await supabase
    .schema("service")
    .from("events")
    .select("id,organization_id,name,weekday,event_date,time,location,checkin_token,checkin_active")
    .eq("id", eventId)
    .maybeSingle();

  const { data: personRow } = await supabase
    .schema("service")
    .from("people")
    .select("id,name,status,tags")
    .eq("user_id", user.id)
    .maybeSingle();

  let result: CheckinResult;

  if (!eventRow) {
    result = { ok: false, motivo: "Este QR Code não aponta para um evento válido." };
  } else if (!personRow) {
    result = { ok: false, bloq: true, motivo: "Você não tem um perfil de voluntário nesta igreja. Fale com a liderança." };
  } else if (!eventRow.checkin_active) {
    result = { ok: false, motivo: "Este QR Code está desativado. Procure a liderança." };
  } else if (token && eventRow.checkin_token && token !== eventRow.checkin_token) {
    result = { ok: false, motivo: "QR Code inválido ou expirado. Peça o atual à liderança." };
  } else {
    const { data: rosterRows } = await supabase
      .schema("service")
      .from("roster_assignments")
      .select("id")
      .eq("event_id", eventId)
      .eq("person_id", personRow.id)
      .neq("status", "no");
    const escalado = (rosterRows?.length ?? 0) > 0;

    const { error: insertError } = await supabase
      .schema("service")
      .from("event_attendance")
      .insert({ organization_id: eventRow.organization_id, event_id: eventId, person_id: personRow.id, via: "qr", is_extra: !escalado });

    if (insertError) {
      result = (insertError as { code?: string }).code === "23505"
        ? { ok: false, dup: true, motivo: "Seu check-in neste evento já foi registrado." }
        : { ok: false, motivo: "Não foi possível registrar agora." };
    } else {
      result = { ok: true, extra: !escalado };
    }
  }

  return (
    <CheckinLandingClient
      event={{
        id: eventRow?.id ?? eventId,
        organizationId: eventRow?.organization_id ?? "",
        name: eventRow?.name ?? "Evento",
        weekday: eventRow?.weekday ?? "",
        eventDate: eventRow?.event_date ?? "",
        time: eventRow?.time ?? "",
        location: eventRow?.location ?? "",
        checkinToken: eventRow?.checkin_token ?? null,
        checkinActive: eventRow?.checkin_active ?? false,
      }}
      person={personRow ? { id: personRow.id, name: personRow.name, status: personRow.status, tags: personRow.tags ?? [] } : null}
      result={result}
    />
  );
}
