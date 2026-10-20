import type { supabaseAdmin } from "./supabase";

type AdminClient = ReturnType<typeof supabaseAdmin>;

/* Entrada na igreja pelo link ou código único (service.entry_links, 0071).
   O código tem 8 sinais de um alfabeto sem 0/O/1/I/L; aqui só normaliza o
   que a pessoa digitou (minúscula, espaço, hífen) e procura a igreja. */

export const CODIGO_RE = /^[2-9A-HJKMNP-Z]{8}$/;

export function normalizarCodigo(raw: string | null | undefined): string {
  return (raw ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
}

/* XXXX-XXXX: mais fácil de ditar e de digitar */
export function codigoLegivel(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export function entradaPath(code: string): string {
  return `/service/participar/${code}`;
}

export type EntryLink = { organizationId: string; churchId: string; rule: "aprovar" | "direto" };

export async function findEntryLink(db: AdminClient, raw: string): Promise<EntryLink | null> {
  const code = normalizarCodigo(raw);
  if (!CODIGO_RE.test(code)) return null;
  const { data } = await db.schema("service").from("entry_links").select("organization_id,church_id,rule").eq("code", code).maybeSingle();
  if (!data) return null;
  return { organizationId: data.organization_id as string, churchId: data.church_id as string, rule: data.rule as EntryLink["rule"] };
}
