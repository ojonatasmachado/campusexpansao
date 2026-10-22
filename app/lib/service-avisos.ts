import { memberNotificationUrl } from "../service/lib/member-navigation";
import { sendPushToSubscriptions } from "./push";
import type { supabaseAdmin } from "./supabase";
import { pessoasComFuso } from "./service-fusos";
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
export async function entregarAvisos(db: Db, a: { organizationId: string; peopleIds: string[]; categoria: Categoria | null; title: string; body: string; url?: string }): Promise<{ enviados: number; naFila: number }> {
  const ids = [...new Set(a.peopleIds)];
  if (!ids.length) return { enviados: 0, naFila: 0 };
  const categoria = a.categoria ?? "mensagens";
  const url = a.url ?? memberNotificationUrl(categoria);
  const pessoas = (await pessoasComFuso(db, a.organizationId, ids)).filter((p) => !p.desligadas.includes(categoria));
  const agora = new Date();
  const imediatos: string[] = [];
  const fila = [];
  for (const p of pessoas) {
    if (categoria === "mural" || emSilencio(agora, p.fuso)) {
      const quando = foraDoSilencio(categoria === "mural" ? new Date(agora.getTime() + RESUMO_MURAL_MIN * 60000) : agora, p.fuso);
      fila.push({ organization_id: a.organizationId, person_id: p.id, categoria, title: a.title, body: a.body, url, send_after: quando.toISOString() });
    } else imediatos.push(p.id);
  }
  if (fila.length) {
    const { error } = await db.from("push_queue").insert(fila);
    if (error) throw error; // Falha da fila nunca autoriza envio durante o silêncio.
  }
  return { enviados: await mandar(db, a.organizationId, imediatos, { title: a.title, body: a.body, url }, categoria), naFila: fila.length };
}

/** Manda o que já pode sair da fila (uma vez por item). Mural em resumo, um por pessoa. */
export async function esvaziarFila(db: Db, organizationId?: string): Promise<number> {
  const agora = new Date();
  let q = db.from("push_queue").select("id, organization_id, person_id, categoria, title, body, url").lte("send_after", agora.toISOString()).is("sent_at", null);
  if (organizationId) q = q.eq("organization_id", organizationId);
  const { data: pendentes, error } = await q;
  if (error) throw error;
  if (!pendentes?.length) return 0;
  const itens: typeof pendentes = [];
  for (const org of new Set(pendentes.map((i) => i.organization_id))) {
    const daOrg = pendentes.filter((i) => i.organization_id === org);
    const pessoas = new Map((await pessoasComFuso(db, org, [...new Set(daOrg.map((i) => i.person_id))])).map((p) => [p.id, p]));
    for (const it of daOrg) {
      const pessoa = pessoas.get(it.person_id);
      if (pessoa && !pessoa.desligadas.includes(it.categoria) && emSilencio(agora, pessoa.fuso)) {
        // A igreja pode ter mudado o fuso depois de o aviso entrar na fila.
        const { error } = await db.from("push_queue").update({ send_after: foraDoSilencio(agora, pessoa.fuso).toISOString() }).eq("id", it.id).is("sent_at", null);
        if (error) throw error;
        continue;
      }
      // Reserva condicional evita que dois workers enviem a mesma linha.
      const { data: claimed, error } = await db.from("push_queue").update({ sent_at: agora.toISOString() }).eq("id", it.id).is("sent_at", null).select("id");
      if (error) throw error;
      if (claimed?.length && pessoa && !pessoa.desligadas.includes(it.categoria)) itens.push(it);
    }
  }
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
      n += await mandar(db, primeiro.organization_id, [primeiro.person_id], { title: "Mural da igreja", body: corpo, url: memberNotificationUrl("mural") }, cat);
    } else {
      for (const it of lista) n += await mandar(db, it.organization_id, [it.person_id], { title: it.title, body: it.body, url: it.url ?? "/service" }, cat);
    }
  }
  return n;
}
