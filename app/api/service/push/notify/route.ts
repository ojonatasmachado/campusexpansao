import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { entregarAvisos, esvaziarFila, type Categoria } from "../../../../lib/service-avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  organizationId?: string;
  recipientMemberIds?: string[];
  title?: string;
  body?: string;
  /* categoria do aviso (lei 9): escala, mural, mensagens, caminhada */
  categoria?: string;
};
const CATEGORIAS = new Set(["escala", "mural", "mensagens", "caminhada"]);

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
  const categoria = payload.categoria && CATEGORIAS.has(payload.categoria) ? payload.categoria : null;
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
    const db = supabaseAdmin().schema("service");
    const { data: members, error: membersError } = await db
      .from("members")
      .select("id, volunteer_id")
      .in("id", recipientMemberIds);
    if (membersError) throw membersError;

    const peopleIds = (members ?? []).map((m) => m.volunteer_id).filter((id): id is string => !!id);
    /* v7 5.3: categoria desligada, silêncio das 22h às 7h e resumo do Mural; aproveita para mandar o que já venceu na fila */
    const r = await entregarAvisos(db, { organizationId, peopleIds, categoria: categoria as Categoria | null, title, body });
    await esvaziarFila(db, organizationId);
    return NextResponse.json({ ok: true, sent: r.enviados, queued: r.naFila });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar a notificação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
