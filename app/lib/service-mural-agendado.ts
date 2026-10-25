import type { supabaseAdmin } from "./supabase";
import { entregarAvisos } from "./service-avisos";
import { fusoDaIgreja } from "./service-fusos";
import { foraDoSilencio } from "../service/lib/silencio";

/* Publicação agendada do Mural (0075), só no servidor. O agendador de hora em
   hora (rota /api/service/cron/lembretes) chama aqui antes dos lembretes:
   - põe no ar o que já passou da hora (created_at vira a hora da publicação);
   - um destaque por vez: o agendado com destaque encerra o anterior;
   - lembrete "em 24h/48h" escolhido antes vira remind_at a partir de agora;
   - a notificação segue a entrega normal (silêncio das 22h às 7h, resumo do
     Mural e quem desligou a categoria), pela mesma fila. */

type Db = ReturnType<ReturnType<typeof supabaseAdmin>["schema"]>;

export async function publicarAgendados(db: Db): Promise<number> {
  const agora = new Date();
  const agoraIso = agora.toISOString();
  /* marca como publicado antes de avisar: duas chamadas ao mesmo tempo não publicam duas vezes */
  const { data: itens, error } = await db
    .from("announcements")
    .update({ status: "publicado", created_at: agoraIso })
    .eq("status", "agendado")
    .lte("publish_at", agoraIso)
    .select("id, organization_id, church_id, title, body, publish_to, publish_push, remind_hours, highlight_until");
  /* antes da 0075 a coluna status não existe: nada a publicar */
  if (error) return 0;

  for (const a of itens ?? []) {
    if (a.highlight_until && a.highlight_until > agoraIso) {
      await db.from("announcements").update({ highlight_until: agoraIso })
        .eq("church_id", a.church_id).neq("id", a.id).gt("highlight_until", agoraIso);
    }
    if (a.remind_hours) {
      const fuso = await fusoDaIgreja(db, a.church_id);
      await db.from("announcements")
        .update({ remind_at: foraDoSilencio(new Date(agora.getTime() + a.remind_hours * 3600000), fuso).toISOString(), remind_hours: null })
        .eq("id", a.id);
    }
    const membros = (a.publish_to ?? []) as string[];
    if (!a.publish_push || !membros.length) continue;
    const { data: fichas } = await db.from("members").select("volunteer_id").in("id", membros);
    const pessoas = (fichas ?? []).map((f) => f.volunteer_id).filter((id): id is string => !!id);
    await entregarAvisos(db, { organizationId: a.organization_id, peopleIds: pessoas, categoria: "mural", title: a.title, body: a.body || "Nova publicação no Mural.", bodyTemplate: a.body ? undefined : "mural-novo" });
  }
  return (itens ?? []).length;
}
