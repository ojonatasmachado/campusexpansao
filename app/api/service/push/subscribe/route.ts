import { getTexto } from "../../../../service/lib/internacional/servidor";
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
  const traduzirUi = await getTexto(request);
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: traduzirUi("Você precisa estar logado.") }, { status: 401 });
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: traduzirUi("Envie dados válidos.") }, { status: 400 });
  }

  const { organizationId, endpoint, keys } = body;
  if (!organizationId || !endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: traduzirUi("Dados incompletos.") }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    // A sessão resolve a pessoa com RLS: vínculo e produto precisam estar ativos.
    const { data: person, error: personError } = await supabase
      .schema("service")
      .from("people")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (personError) throw personError;
    if (!person) {
      return NextResponse.json({ error: traduzirUi("Nenhum voluntário vinculado a este usuário.") }, { status: 404 });
    }

    // Um endpoint existente nunca muda de dono. DO NOTHING também protege
    // duas inscrições concorrentes: só a sessão que o criou pode atualizá-lo.
    const { error: insertError } = await db
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
        { onConflict: "endpoint", ignoreDuplicates: true },
      );
    if (insertError) throw insertError;

    const { data: subscription, error: updateError } = await db
      .schema("service")
      .from("push_subscriptions")
      .update({ p256dh: keys.p256dh, auth_key: keys.auth })
      .eq("endpoint", endpoint)
      .eq("person_id", person.id)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!subscription) {
      return NextResponse.json({ error: traduzirUi("Esta inscrição já pertence a outra conta.") }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[service] push/subscribe:", error);
    const message = traduzirUi("Não foi possível salvar a inscrição.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
