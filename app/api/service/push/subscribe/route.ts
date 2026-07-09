import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  organizationId?: string;
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }

  const { organizationId, endpoint, keys } = body;
  if (!organizationId || !endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data: person, error: personError } = await db
      .schema("service")
      .from("people")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (personError) throw personError;
    if (!person) {
      return NextResponse.json({ error: "Nenhum voluntário vinculado a este usuário." }, { status: 404 });
    }

    const { error: upsertError } = await db
      .schema("service")
      .from("push_subscriptions")
      .upsert(
        {
          organization_id: organizationId,
          person_id: person.id,
          endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
        },
        { onConflict: "endpoint" },
      );
    if (upsertError) throw upsertError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar a inscrição.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
