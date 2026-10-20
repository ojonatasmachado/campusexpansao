"use client";

/* Medição padrão (v7 5.1, lei 11). Fila curta no navegador que grava em
   service.app_events (0064) em lote, sem dado da pessoa. Falhar aqui nunca
   atrapalha a tela: medição é bônus. */
import { createServiceBrowserClient } from "./supabase-browser";

export type EventoMedicao = "card_shown" | "card_acted" | "card_dismissed" | "notification_sent" | "notification_opened";
type Linha = { organization_id: string; evento: EventoMedicao; modulo?: string | null; tipo?: string | null; ref?: string | null };

let fila: Linha[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function enviar() {
  timer = null;
  const lote = fila;
  fila = [];
  if (!lote.length) return;
  void createServiceBrowserClient().schema("service").from("app_events").insert(lote).then(() => undefined, () => undefined);
}

export function medir(organizationId: string | undefined | null, evento: EventoMedicao, dados: { modulo?: string | null; tipo?: string | null; ref?: string | null } = {}) {
  if (!organizationId || typeof window === "undefined") return;
  fila.push({ organization_id: organizationId, evento, ...dados });
  if (!timer) timer = setTimeout(enviar, 1500);
}

/** card_shown uma vez por cartão por sessão do navegador. */
export function medirCartaoVisto(organizationId: string | undefined | null, cartao: { id: string; modulo: string; tipo: string }) {
  if (!organizationId || typeof window === "undefined") return;
  const chave = `cex_visto_${cartao.id}`;
  try {
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, "1");
  } catch { /* sem armazenamento: mede mesmo assim */ }
  medir(organizationId, "card_shown", { modulo: cartao.modulo, tipo: cartao.tipo, ref: cartao.id });
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", enviar);
}
