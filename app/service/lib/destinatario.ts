/* Quem recebe um pedido do membro, resolvido no banco em cadeia
   (service.request_recipient, migração 0053). Troca de escala: líder do
   time, depois a gestão. Oração: intercessão, depois a gestão. Sem ninguém,
   null: a entrada do pedido não aparece (lei 6, nenhum beco sem saída). */

import { useEffect, useState } from "react";
import { createServiceBrowserClient } from "./supabase-browser";

export type Destinatario = { member_id: string; name: string; via: "lider" | "intercessao" | "gestao"; ministry: string | null };
export type PedidoKind = "troca" | "oracao";

const cache = new Map<string, Promise<Destinatario | null>>();

export function buscarDestinatario(kind: PedidoKind, ministryId?: string | null): Promise<Destinatario | null> {
  const chave = `${kind}:${ministryId ?? ""}`;
  let p = cache.get(chave);
  if (!p) {
    p = Promise.resolve(
      createServiceBrowserClient().schema("service").rpc("request_recipient", { p_kind: kind, p_ministry: ministryId ?? null }),
    ).then(({ data, error }) => {
      if (error) { cache.delete(chave); return null; }
      const row = (Array.isArray(data) ? data[0] : data) as Destinatario | undefined;
      return row?.member_id ? row : null;
    });
    cache.set(chave, p);
  }
  return p;
}

/* undefined enquanto carrega; null quando não há ninguém para receber */
export function useDestinatario(kind: PedidoKind, ministryId?: string | null): Destinatario | null | undefined {
  const [dest, setDest] = useState<{ chave: string; d: Destinatario | null } | null>(null);
  const chave = `${kind}:${ministryId ?? ""}`;
  useEffect(() => {
    let vivo = true;
    buscarDestinatario(kind, ministryId).then((d) => { if (vivo) setDest({ chave, d }); });
    return () => { vivo = false; };
  }, [kind, ministryId, chave]);
  return dest && dest.chave === chave ? dest.d : undefined;
}

/* "Lucas, que lidera Louvor" / "Marta, da liderança da igreja" */
export function papelDoDestinatario(d: Destinatario): string {
  const nome = d.name.split(" ")[0];
  if (d.via === "lider") return d.ministry ? `${nome}, que lidera ${d.ministry}` : `${nome}, que lidera o seu time`;
  if (d.via === "intercessao") return `${nome}, da intercessão`;
  return `${nome}, da liderança da igreja`;
}

/* quem também faz a função e está livre no horário (service.swap_candidates) */
export async function candidatosParaVaga(assignmentId: string): Promise<{ member_id: string; name: string }[]> {
  const { data, error } = await createServiceBrowserClient().schema("service").rpc("swap_candidates", { p_assignment: assignmentId });
  if (error || !Array.isArray(data)) return [];
  return data as { member_id: string; name: string }[];
}
