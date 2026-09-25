import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { CLEARED_INVITE, isInviteValid } from "../../../../lib/service-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* A pessoa abriu o link do convite e escolheu a senha. Só vale para conta com
   convite pendente e token válido (ver app/lib/service-invite.ts); o token é
   de uso único: some assim que a senha é gravada. */
export async function POST(request: Request) {
  let body: { u?: string; t?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }

  const { u, t, password } = body;
  if (!u || !t || !password) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.getUserById(u);
  if (error || !data.user || !isInviteValid(data.user, t)) {
    return NextResponse.json({ error: "Este convite não vale mais. Peça um novo link ao líder da sua igreja." }, { status: 410 });
  }

  const { error: updateError } = await db.auth.admin.updateUserById(u, { password, app_metadata: CLEARED_INVITE });
  if (updateError) {
    return NextResponse.json({ error: "Não foi possível salvar a senha. Tente de novo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: data.user.email });
}
