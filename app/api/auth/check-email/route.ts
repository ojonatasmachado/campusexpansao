import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  let email = "";

  try {
    const body = await request.json();
    email = normalizeEmail(body.email);
  } catch {
    return NextResponse.json({ error: "Envie um e-mail válido." }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Envie um e-mail válido." }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    let page = 1;
    const perPage = 1000;

    while (page <= 10) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const users = data.users ?? [];
      const exists = users.some((user) => user.email?.trim().toLowerCase() === email);
      if (exists) return NextResponse.json({ exists: true });
      if (users.length < perPage) return NextResponse.json({ exists: false });

      page += 1;
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível validar o e-mail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
