import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAD_ROLES = ["owner", "master", "pastor", "lider"];

function derivePasswordFromPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 6) return digits.slice(-6);
  if (digits.length > 0) return digits.padStart(6, "0");
  return Math.random().toString(36).slice(2, 8);
}

type Payload = {
  organizationId?: string;
  churchId?: string;
  memberId?: string;
  name?: string;
  email?: string;
  phone?: string;
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

  const { organizationId, churchId, memberId, name, email, phone } = body;
  if (!organizationId || !churchId || !memberId || !name) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ ok: true, created: false, reason: "sem e-mail" });
  }

  const { data: membership, error: membershipError } = await supabase
    .schema("core")
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (membershipError || !membership || !LEAD_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Sem permissão para criar acesso." }, { status: 403 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const db = supabaseAdmin();
    const password = derivePasswordFromPhone(phone);

    let authUserId: string | null = null;
    let created = false;
    const { data: createdUser, error: createError } = await db.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone: phone ?? null },
    });

    if (createError) {
      let page = 1;
      const perPage = 1000;
      while (page <= 10 && !authUserId) {
        const { data: listData, error: listError } = await db.auth.admin.listUsers({ page, perPage });
        if (listError) throw listError;
        const found = (listData.users ?? []).find((u) => u.email?.trim().toLowerCase() === normalizedEmail);
        if (found) authUserId = found.id;
        if ((listData.users ?? []).length < perPage) break;
        page += 1;
      }
      if (!authUserId) throw createError;
    } else {
      authUserId = createdUser.user?.id ?? null;
      created = true;
    }

    if (!authUserId) throw new Error("Não foi possível determinar o usuário.");

    const { data: existingPerson } = await db
      .schema("service")
      .from("people")
      .select("id")
      .eq("user_id", authUserId)
      .maybeSingle();

    let personId: string | null = existingPerson?.id ?? null;
    if (!personId) {
      const { data: newPerson, error: personError } = await db
        .schema("service")
        .from("people")
        .insert({
          organization_id: organizationId,
          church_id: churchId,
          user_id: authUserId,
          name,
          phone: phone || null,
          email: normalizedEmail,
          status: "ativo",
        })
        .select("id")
        .single();
      if (personError) throw personError;
      personId = newPerson.id;
    }

    await db.schema("service").from("members").update({ volunteer_id: personId }).eq("id", memberId);

    await db
      .schema("core")
      .from("memberships")
      .upsert(
        { user_id: authUserId, organization_id: organizationId, role: "vol", status: "active" },
        { onConflict: "user_id,organization_id", ignoreDuplicates: true },
      );

    return NextResponse.json({ ok: true, created, userId: authUserId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o acesso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
