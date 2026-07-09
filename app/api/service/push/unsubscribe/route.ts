import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: "Endpoint ausente." }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data: person } = await db
      .schema("service")
      .from("people")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await db
      .schema("service")
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", body.endpoint)
      .eq("person_id", person.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível remover a inscrição.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
