import type { supabaseAdmin } from "./supabase";
import { normalizarFuso } from "../service/lib/fuso";

type Db = ReturnType<ReturnType<typeof supabaseAdmin>["schema"]>;

/** Leitura por operação, sem cache global de pessoas entre organizações. */
export async function pessoasComFuso(db: Db, organizationId: string, ids: string[]) {
  const { data: pessoas, error } = await db.from("people").select("id, church_id, notif_off").eq("organization_id", organizationId).in("id", ids);
  if (error) throw error;
  const igrejas = [...new Set((pessoas ?? []).map((p) => p.church_id).filter(Boolean))];
  const { data: churches, error: churchError } = igrejas.length
    ? await db.from("churches").select("id, time_zone").eq("organization_id", organizationId).in("id", igrejas)
    : { data: [], error: null };
  if (churchError) throw churchError;
  const fusos = new Map((churches ?? []).map((c) => [c.id, normalizarFuso(c.time_zone)]));
  return (pessoas ?? []).map((p) => ({ id: p.id as string, fuso: fusos.get(p.church_id) ?? normalizarFuso(null), desligadas: (p.notif_off ?? []) as string[] }));
}

export async function fusoDaIgreja(db: Db, churchId: string) {
  const { data, error } = await db.from("churches").select("time_zone").eq("id", churchId).single();
  if (error) throw error;
  return normalizarFuso(data.time_zone);
}
