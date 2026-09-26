import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { ensureChurchSlug, inviteUrl, newInviteToken } from "../../../../lib/service-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAD_ROLES = ["owner", "master", "pastor", "lider"];

/* Gera o link de acesso ao app pra um membro cadastrado pelo líder (só nome,
   sobrenome e telefone). Não cria conta: a conta nasce quando a pessoa abre o
   link e informa e-mail, senha e CEP (accept-invite). Reenvio invalida o
   link anterior. Se a pessoa já tem acesso, devolve só o login da igreja. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });

  let body: { memberId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }
  if (!body.memberId) return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: member } = await db
    .schema("service")
    .from("members")
    .select("id,organization_id,church_id,name,phone,volunteer_id")
    .eq("id", body.memberId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  const { data: membership } = await supabase
    .schema("core")
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", member.organization_id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership || !LEAD_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Sem permissão para convidar." }, { status: 403 });
  }
  if (!member.phone) return NextResponse.json({ error: "Cadastre o telefone da pessoa para mandar o convite." }, { status: 400 });

  const origin = new URL(request.url).origin;
  const slug = await ensureChurchSlug(db, member.church_id);
  const loginUrl = slug ? new URL(`/${slug}/entrar`, origin).toString() : new URL("/service/login", origin).toString();

  /* já tem acesso: não gera convite, manda o login da igreja */
  if (member.volunteer_id) {
    const { data: person } = await db.schema("service").from("people").select("user_id").eq("id", member.volunteer_id).maybeSingle();
    if (person?.user_id) return NextResponse.json({ ok: true, alreadyHasAccess: true, link: loginUrl, loginUrl });
  }

  await db
    .schema("service")
    .from("member_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("member_id", member.id)
    .is("used_at", null);

  const invite = newInviteToken();
  const { error } = await db.schema("service").from("member_invites").insert({
    organization_id: member.organization_id,
    member_id: member.id,
    token_hash: invite.hash,
    expires_at: invite.expiresAt,
    created_by: user.id,
  });
  if (error) return NextResponse.json({ error: "Não foi possível gerar o convite agora." }, { status: 500 });

  return NextResponse.json({ ok: true, alreadyHasAccess: false, link: inviteUrl(origin, invite.token), loginUrl });
}
