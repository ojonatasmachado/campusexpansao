import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { sendPushToSubscriptions } from "../../../../lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  organizationId?: string;
  recipientMemberIds?: string[];
  title?: string;
  body?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }

  const { organizationId, recipientMemberIds, title, body } = payload;
  if (!organizationId || !recipientMemberIds?.length || !title || !body) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .schema("core")
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "Sem permissão para notificar." }, { status: 403 });
  }

  try {
    const db = supabaseAdmin();
    const { data: members, error: membersError } = await db
      .schema("service")
      .from("members")
      .select("id, volunteer_id")
      .in("id", recipientMemberIds);
    if (membersError) throw membersError;

    const peopleIds = (members ?? []).map((m) => m.volunteer_id).filter((id): id is string => !!id);
    if (!peopleIds.length) return NextResponse.json({ ok: true, sent: 0 });

    const { data: subs, error: subsError } = await db
      .schema("service")
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .in("person_id", peopleIds);
    if (subsError) throw subsError;
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

    const { deadEndpoints } = await sendPushToSubscriptions(subs, { title, body });

    if (deadEndpoints.length) {
      await db.schema("service").from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }

    return NextResponse.json({ ok: true, sent: subs.length - deadEndpoints.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar a notificação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
