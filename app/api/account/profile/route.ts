import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase-server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sanitizeProfileForm, type UserProfileForm } from "../../../lib/user-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readString(record: Record<string, unknown>, key: keyof UserProfileForm) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function parseProfile(body: unknown): UserProfileForm {
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};

  return sanitizeProfileForm({
    full_name: readString(record, "full_name"),
    church_name: readString(record, "church_name"),
    phone: readString(record, "phone"),
    state: readString(record, "state"),
    city: readString(record, "city"),
    church_address: readString(record, "church_address"),
    role: readString(record, "role"),
    ministry_area: readString(record, "ministry_area"),
    denomination: readString(record, "denomination"),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  let profile: UserProfileForm;

  try {
    profile = parseProfile(await request.json());
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const now = new Date().toISOString();
    const email = user.email?.trim().toLowerCase() ?? "";

    const { error } = await db
      .from("user_profiles")
      .upsert({
        user_id: user.id,
        email,
        ...profile,
        updated_at: now,
      }, { onConflict: "user_id" });

    if (error) throw error;

    const { error: authError } = await db.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: profile.full_name,
      },
    });

    if (authError) throw authError;

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não conseguimos salvar seu perfil agora.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
