import { supabaseAdmin } from "../../lib/supabase";
import type { DbAddressData, DbAddressLookup } from "../../lib/types";
import { enderecoDoCep } from "./geo";

export async function guardarConsultaEndereco(kind: DbAddressLookup["kind"], key: string, data: DbAddressData, raw: Record<string, unknown>): Promise<void> {
  const row: DbAddressLookup = { kind, lookup_key: key, source: kind === "cep" ? "brasilapi:cep:v2" : "brasilapi:cnpj:v1", data, raw, fetched_at: new Date().toISOString() };
  const { error } = await supabaseAdmin().schema("service").from("address_lookups").upsert(row, { onConflict: "kind,lookup_key" });
  if (error) throw new Error("Não foi possível guardar a consulta de endereço.");
}
export async function consultarCep(cep: string, usarCacheRecente = false): Promise<{ data: DbAddressData; raw: Record<string, unknown> } | null> {
  if (!/^\d{8}$/.test(cep)) return null;
  if (usarCacheRecente) {
    const { data: salvo } = await supabaseAdmin().schema("service").from("address_lookups").select("data,raw,fetched_at").eq("kind", "cep").eq("lookup_key", cep).gte("fetched_at", new Date(Date.now() - 3600000).toISOString()).maybeSingle();
    if (salvo) return { data: salvo.data as DbAddressData, raw: salvo.raw as Record<string, unknown> };
  }
  const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Não foi possível consultar o CEP.");
  const raw = await res.json() as Record<string, unknown>;
  if (!raw || String(raw.cep ?? "").replace(/\D/g, "") !== cep || typeof raw.city !== "string" || !raw.city.trim()) throw new Error("Resposta de CEP incompleta.");
  const data = enderecoDoCep(raw);
  await guardarConsultaEndereco("cep", cep, data, raw);
  return { data, raw };
}
