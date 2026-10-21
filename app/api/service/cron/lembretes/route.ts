import { memberNotificationUrl } from "../../../../service/lib/member-navigation";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { sendPushToSubscriptions } from "../../../../lib/push";
import { emSilencio } from "../../../../service/lib/silencio";
import { esvaziarFila } from "../../../../lib/service-avisos";
import { publicarAgendados } from "../../../../lib/service-mural-agendado";
import { tokenDoWorkflowValido } from "../../../../lib/github-oidc";

/* Publicação agendada do Mural (0075), lembrete do aviso (v7 4.18) e fila de avisos (5.3). Chamado pelo agendador: manda uma vez, a quem
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
  /* publicação agendada do Mural (0075): entra no ar na hora, também no
     silêncio; a notificação espera na fila até as 7h */
  let publicados = 0;
  try { publicados = await publicarAgendados(supabaseAdmin().schema("service")); } catch { /* segue para os lembretes */ }
  if (emSilencio()) return NextResponse.json({ ok: true, publicados, enviados: 0, motivo: "silencio" });

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
    let falharam = 0;
    for (const aviso of avisos ?? []) {
      /* cada aviso por conta própria: um erro não derruba os outros nem a fila.
         Falhou antes de mandar: volta a ficar pendente e a próxima chamada tenta de novo.
         Falhou depois de mandar: fica marcado, para ninguém receber duas vezes. */
      let mandou = false;
      try {
        const membros = (aviso.remind_to ?? []) as string[];
        if (!membros.length) continue;
        const { data: fichas, error: e1 } = await db.from("members").select("id, volunteer_id").in("id", membros);
        if (e1) throw e1;
        const pessoas = (fichas ?? []).map((f) => f.volunteer_id).filter((id): id is string => !!id);
        if (!pessoas.length) continue;
        const { data: lidas, error: e2 } = await db.from("announcement_reads").select("person_id").eq("announcement_id", aviso.id);
        if (e2) throw e2;
        const jaLeram = new Set((lidas ?? []).map((l) => l.person_id));
        /* quem desligou o Mural não recebe o lembrete (lei 9) */
        const { data: desligou, error: e3 } = await db.from("people").select("id, notif_off").in("id", pessoas);
        if (e3) throw e3;
        const semMural = new Set((desligou ?? []).filter((p) => ((p.notif_off ?? []) as string[]).includes("mural")).map((p) => p.id));
        const faltam = pessoas.filter((p) => !jaLeram.has(p) && !semMural.has(p));
        if (!faltam.length) continue;
        const { data: subs, error: e4 } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth_key").in("person_id", faltam);
        if (e4) throw e4;
        if (!subs?.length) continue;
        mandou = true;
        const { deadEndpoints } = await sendPushToSubscriptions(subs, { title: aviso.title, body: "Você ainda não viu esta publicação do Mural.", url: memberNotificationUrl("mural", aviso.id) });
        if (deadEndpoints.length) await db.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
        const n = subs.length - deadEndpoints.length;
        enviados += n;
        /* lei 11: notification_sent, sem dado da pessoa */
        if (n > 0) await db.from("app_events").insert(Array.from({ length: n }, () => ({ organization_id: aviso.organization_id, evento: "notification_sent", modulo: "mural", tipo: "lembrete", ref: aviso.id })));
      } catch {
        falharam += 1;
        /* devolve à fila; se nem isso der, fica para a próxima rodada manual (não derruba os outros) */
        if (!mandou) { try { await db.from("announcements").update({ reminded_at: null }).eq("id", aviso.id); } catch { /* segue */ } }
      }
    }
    /* v7 5.3: a mesma chamada esvazia a fila (silêncio e resumo do Mural) */
    const daFila = await esvaziarFila(db);
    return NextResponse.json({ ok: true, publicados, avisos: (avisos ?? []).length, enviados, falharam, daFila });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar os lembretes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
