import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { inviteUrl, isInvitePending, newInvite } from "../../../../lib/service-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAD_ROLES = ["owner", "master", "pastor", "lider"];

type Payload = {
  organizationId?: string;
  churchId?: string;
  memberId?: string;
  name?: string;
  email?: string;
  phone?: string;
};

/* Cria (ou vincula) a conta do membro e devolve o link de acesso que o líder
   manda pelo WhatsApp. Nunca define nem redefine senha: conta nova nasce sem
   senha e com convite pendente (a pessoa cria a senha em /service/convite);
   conta que já existia só é vinculada à igreja e entra com a senha que já tem.
   Ver app/lib/service-invite.ts. */
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
    return NextResponse.json({ error: "O e-mail é obrigatório para criar o acesso ao app." }, { status: 400 });
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
  const origin = new URL(request.url).origin;

  try {
    const db = supabaseAdmin();

    /* o membro precisa ser desta igreja: impede usar um memberId de outra org */
    const { data: memberRow } = await db
      .schema("service")
      .from("members")
      .select("id")
      .eq("id", memberId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!memberRow) {
      return NextResponse.json({ error: "Membro não encontrado nesta igreja." }, { status: 404 });
    }

    let authUser: User | null = null;
    let created = false;
    const invite = newInvite();

    const { data: createdUser, error: createError } = await db.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: { full_name: name, phone: phone ?? null },
      app_metadata: invite.meta,
    });

    if (createError) {
      let page = 1;
      const perPage = 1000;
      while (page <= 10 && !authUser) {
        const { data: listData, error: listError } = await db.auth.admin.listUsers({ page, perPage });
        if (listError) throw listError;
        authUser = (listData.users ?? []).find((u) => u.email?.trim().toLowerCase() === normalizedEmail) ?? null;
        if ((listData.users ?? []).length < perPage) break;
        page += 1;
      }
      if (!authUser) throw createError;
    } else {
      authUser = createdUser.user;
      created = true;
    }
    if (!authUser) throw new Error("Não foi possível determinar o usuário.");
    const authUserId = authUser.id;

    /* Link de acesso: conta criada pelo convite e ainda sem senha ganha um
       token novo (reenvio invalida o anterior). Conta com senha própria só
       recebe o link de login: a senha dela nunca é tocada aqui. */
    let accessLink: string;
    let needsPassword: boolean;
    if (created) {
      accessLink = inviteUrl(origin, authUserId, invite.token);
      needsPassword = true;
    } else if (isInvitePending(authUser)) {
      const { error: updateError } = await db.auth.admin.updateUserById(authUserId, { app_metadata: invite.meta });
      if (updateError) throw updateError;
      accessLink = inviteUrl(origin, authUserId, invite.token);
      needsPassword = true;
    } else {
      accessLink = new URL("/service/login", origin).toString();
      needsPassword = false;
    }

    const { data: existingPerson } = await db
      .schema("service")
      .from("people")
      .select("id")
      .eq("user_id", authUserId)
      .eq("organization_id", organizationId)
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

    await db.schema("service").from("members").update({ volunteer_id: personId }).eq("id", memberId).eq("organization_id", organizationId);

    /* quem entra pelo link do convite já está aceitando; conta que já existia
       fica 'invited' até a pessoa aceitar (core.accept_membership, tela do
       onboarding), pra ninguém ser colocado numa igreja sem saber */
    await db
      .schema("core")
      .from("memberships")
      .upsert(
        { user_id: authUserId, organization_id: organizationId, role: "membro", status: needsPassword ? "active" : "invited" },
        { onConflict: "user_id,organization_id", ignoreDuplicates: true },
      );

    return NextResponse.json({ ok: true, created, userId: authUserId, accessLink, needsPassword });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o acesso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
