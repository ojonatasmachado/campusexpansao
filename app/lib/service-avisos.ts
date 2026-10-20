import { sendPushToSubscriptions } from "./push";
import type { supabaseAdmin } from "./supabase";
import { emSilencio, foraDoSilencio } from "../service/lib/silencio";

/* Entrega de avisos do Service (v7 5.3, lei 9), só no servidor:
   - quem desligou a categoria não recebe;
   - das 22h às 7h nada sai: o aviso espera na fila até as 7h;
   - o Mural chega em resumo: espera 30 minutos juntando publicações e sai
     num aviso só por pessoa;
   - cada aviso enviado grava notification_sent (lei 11), sem dado da pessoa. */

type Db = ReturnType<ReturnType<typeof supabaseAdmin>["schema"]>;
export type Categoria = "escala" | "mural" | "mensagens" | "caminhada";
export const CATEGORIAS: Categoria[] = ["escala", "mural", "mensagens", "caminhada"];
const RESUMO_MURAL_MIN = 30;

async function mandar(db: Db, organizationId: string, peopleIds: string[], aviso: { title: string; body: string; url: string }, categoria: Categoria): Promise<number> {
  if (!peopleIds.length) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth_key").in("person_id", peopleIds);
  if (!subs?.length) return 0;
  const { deadEndpoints } = await sendPushToSubscriptions(subs, aviso);
  if (deadEndpoints.length) await db.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
  const n = subs.length - deadEndpoints.length;
  if (n > 0) {
    await db.from("app_events").insert(Array.from({ length: n }, () => ({ organization_id: organizationId, evento: "notification_sent", modulo: categoria, tipo: "aviso", ref: categoria })))
      .then(() => undefined, () => undefined);
  }
  return n;
}

/** Envia agora ou põe na fila, conforme a categoria, o silêncio e o que a pessoa desligou. */
export async function entregarAvisos(db: Db, a: { organizationId: string; peopleIds: string[]; categoria: Categoria | null; title: string; body: string }): Promise<{ enviados: number; naFila: number }> {
  let pessoas = [...new Set(a.peopleIds)];
  if (!pessoas.length) return { enviados: 0, naFila: 0 };
  const url = a.categoria ? `/service?aviso=${a.categoria}` : "/service";
  if (a.categoria) {
    const { data: desligou } = await db.from("people").select("id, notif_off").in("id", pessoas);
    const fora = new Set((desligou ?? []).filter((p) => ((p.notif_off ?? []) as string[]).includes(a.categoria!)).map((p) => p.id));
    pessoas = pessoas.filter((id) => !fora.has(id));
  }
  if (!pessoas.length) return { enviados: 0, naFila: 0 };
  const agora = new Date();
  const esperar = a.categoria === "mural" || emSilencio(agora);
  if (esperar && a.categoria) {
    const quando = foraDoSilencio(a.categoria === "mural" ? new Date(agora.getTime() + RESUMO_MURAL_MIN * 60000) : agora);
    const { error } = await db.from("push_queue").insert(pessoas.map((p) => ({
      organization_id: a.organizationId, person_id: p, categoria: a.categoria, title: a.title, body: a.body, url, send_after: quando.toISOString(),
    })));
    if (!error) return { enviados: 0, naFila: pessoas.length };
    /* sem a fila (antes da 0066), manda na hora, como antes */
  }
  return { enviados: await mandar(db, a.organizationId, pessoas, { title: a.title, body: a.body, url }, a.categoria ?? "mensagens"), naFila: 0 };
}

/** Manda o que já pode sair da fila (uma vez por item). Mural em resumo, um por pessoa. */
export async function esvaziarFila(db: Db, organizationId?: string): Promise<number> {
  if (emSilencio()) return 0;
  let q = db.from("push_queue").update({ sent_at: new Date().toISOString() }).lte("send_after", new Date().toISOString()).is("sent_at", null);
  if (organizationId) q = q.eq("organization_id", organizationId);
  const { data: itens, error } = await q.select("organization_id, person_id, categoria, title, body, url");
  if (error || !itens?.length) return 0;
  let n = 0;
  const grupos = new Map<string, typeof itens>();
  for (const it of itens) {
    const k = `${it.organization_id}|${it.person_id}|${it.categoria}`;
    grupos.set(k, [...(grupos.get(k) ?? []), it]);
  }
  for (const lista of grupos.values()) {
    const primeiro = lista[0];
    const cat = primeiro.categoria as Categoria;
    if (cat === "mural" && lista.length > 1) {
      const titulos = lista.map((i) => i.title);
      const corpo = `${lista.length} publicações novas: ${titulos.slice(0, 3).join(", ")}${lista.length > 3 ? " e outras" : ""}.`;
      n += await mandar(db, primeiro.organization_id, [primeiro.person_id], { title: "Mural da igreja", body: corpo, url: primeiro.url ?? "/service?aviso=mural" }, cat);
    } else {
      for (const it of lista) n += await mandar(db, it.organization_id, [it.person_id], { title: it.title, body: it.body, url: it.url ?? "/service" }, cat);
    }
  }
  return n;
}
