import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { sendPushToSubscriptions } from "../../../../lib/push";
import { emSilencio } from "../../../../service/lib/silencio";
import { esvaziarFila } from "../../../../lib/service-avisos";
import { tokenDoWorkflowValido } from "../../../../lib/github-oidc";

/* Lembrete do aviso (v7 4.18) e fila de avisos (5.3). Chamado pelo agendador: manda uma vez, a quem
   do público ainda não abriu o aviso, a notificação marcada na publicação.
   No silêncio das 22h às 7h não manda nada (a próxima chamada depois das 7h
   manda). Só roda chamada do agendador do GitHub (token OIDC) ou com o
   CRON_SECRET, se ele estiver configurado. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* quem pode chamar: o agendador do GitHub (token OIDC assinado pelo GitHub,
   só deste repositório, do main e do workflow service-cron.yml) ou quem tiver
   o CRON_SECRET, se ele estiver configurado na Vercel */
async function autorizado(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const segredo = process.env.CRON_SECRET;
  if (segredo && token === segredo) return true;
  return tokenDoWorkflowValido(token, { audiencia: AUDIENCIA_CRON, repositorio: REPOSITORIO, workflow: "service-cron.yml" });
}
const AUDIENCIA_CRON = "campusexpansao-service-cron";
const REPOSITORIO = "ojonatasmachado/campusexpansao";

export async function GET(request: Request) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (emSilencio()) return NextResponse.json({ ok: true, enviados: 0, motivo: "silencio" });

  try {
    const db = supabaseAdmin().schema("service");
    const agora = new Date().toISOString();
    /* marca como enviado antes de mandar: duas chamadas ao mesmo tempo não lembram duas vezes */
    const { data: avisos, error } = await db
      .from("announcements")
      .update({ reminded_at: agora })
      .lte("remind_at", agora)
      .is("reminded_at", null)
      .select("id, organization_id, title, remind_to");
    if (error) throw error;

    let enviados = 0;
    for (const aviso of avisos ?? []) {
      const membros = (aviso.remind_to ?? []) as string[];
      if (!membros.length) continue;
      const { data: fichas } = await db.from("members").select("id, volunteer_id").in("id", membros);
      const pessoas = (fichas ?? []).map((f) => f.volunteer_id).filter((id): id is string => !!id);
      if (!pessoas.length) continue;
      const { data: lidas } = await db.from("announcement_reads").select("person_id").eq("announcement_id", aviso.id);
      const jaLeram = new Set((lidas ?? []).map((l) => l.person_id));
      /* quem desligou o Mural não recebe o lembrete (lei 9) */
      const { data: desligou } = await db.from("people").select("id, notif_off").in("id", pessoas);
      const semMural = new Set((desligou ?? []).filter((p) => ((p.notif_off ?? []) as string[]).includes("mural")).map((p) => p.id));
      const faltam = pessoas.filter((p) => !jaLeram.has(p) && !semMural.has(p));
      if (!faltam.length) continue;
      const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth_key").in("person_id", faltam);
      if (!subs?.length) continue;
      const { deadEndpoints } = await sendPushToSubscriptions(subs, { title: aviso.title, body: "Você ainda não viu esta publicação do Mural.", url: "/service?aviso=mural" });
      if (deadEndpoints.length) await db.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
      const n = subs.length - deadEndpoints.length;
      enviados += n;
      /* lei 11: notification_sent, sem dado da pessoa */
      if (n > 0) await db.from("app_events").insert(Array.from({ length: n }, () => ({ organization_id: aviso.organization_id, evento: "notification_sent", modulo: "mural", tipo: "lembrete", ref: aviso.id })));
    }
    /* v7 5.3: a mesma chamada esvazia a fila (silêncio e resumo do Mural) */
    const daFila = await esvaziarFila(db);
    return NextResponse.json({ ok: true, avisos: (avisos ?? []).length, enviados, daFila });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar os lembretes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
