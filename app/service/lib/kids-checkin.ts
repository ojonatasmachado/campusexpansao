/* Check-in e pedido de retirada da criança pelo responsável. Uma lógica só,
   usada pela rota do QR (/service/kids-checkin) e pelo app (cartão do Início
   e Minha família, v7 2.3). */

import { useState } from "react";
import { createServiceBrowserClient } from "./supabase-browser";

/* o check-in pelo app abre 60 minutos antes do culto (mesma regra da função
   service.kids_checkin_session, migração 0052) */
export const KIDS_CHECKIN_ABRE_MIN = 60;

export type KidsAttendanceLite = { id: string; status: string };

/* "19:00" → "18:00"; sem hora marcada, null (abre o dia todo) */
export function horaQueAbre(time?: string | null): string | null {
  const m = (time ?? "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const total = Math.max(0, Number(m[1]) * 60 + Number(m[2]) - KIDS_CHECKIN_ABRE_MIN);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/* já passou da hora de abrir? (horário de Brasília) */
export function checkinAberto(time?: string | null, agora: Date = new Date()): boolean {
  const abre = horaQueAbre(time);
  if (!abre) return true;
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(agora);
  return hhmm >= abre;
}

export function statusDaCrianca(att?: KidsAttendanceLite | null): string {
  if (!att) return "Ainda não fez check-in";
  if (att.status === "presente") return "Na sala";
  if (att.status === "retirada_pendente") return "Retirada solicitada, aguarde a professora";
  return "Retirado";
}

/* estado do check-in de várias crianças numa tela. sessionFor devolve a
   sessão da turma (a rota já tem; o app pede ao banco na hora do toque). */
export function useKidsCheckin({
  organizationId,
  personId,
  inicial,
  sessionFor,
  aoMudar,
}: {
  organizationId?: string;
  personId?: string | null;
  inicial: Record<string, KidsAttendanceLite>;
  sessionFor: (childId: string) => Promise<string | null>;
  /* depois de gravar (o app recarrega os dados da tela) */
  aoMudar?: () => void;
}) {
  const [attendance, setAttendance] = useState(inicial);
  const [loadingChild, setLoadingChild] = useState<string | null>(null);
  const [error, setError] = useState("");

  const checkin = async (childId: string) => {
    if (!organizationId || !personId) return false;
    setLoadingChild(childId);
    setError("");
    const sessionId = await sessionFor(childId);
    if (!sessionId) {
      setLoadingChild(null);
      setError("O check-in desta sala ainda não está aberto.");
      return false;
    }
    const { data, error: insertError } = await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .insert({ organization_id: organizationId, session_id: sessionId, child_id: childId, dropped_off_by: personId, dropped_off_via: "qr" })
      .select("id,status")
      .single();
    setLoadingChild(null);
    if (insertError || !data) {
      setError("Não foi possível registrar o check-in agora.");
      return false;
    }
    setAttendance((prev) => ({ ...prev, [childId]: { id: data.id as string, status: data.status as string } }));
    aoMudar?.();
    return true;
  };

  const pedirRetirada = async (childId: string) => {
    const att = attendance[childId];
    if (!att || !personId) return false;
    setLoadingChild(childId);
    setError("");
    const { error: updateError } = await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .update({ status: "retirada_pendente", pickup_requested_by: personId, pickup_requested_at: new Date().toISOString() })
      .eq("id", att.id);
    setLoadingChild(null);
    if (updateError) {
      setError("Não foi possível solicitar a retirada agora.");
      return false;
    }
    setAttendance((prev) => ({ ...prev, [childId]: { ...att, status: "retirada_pendente" } }));
    aoMudar?.();
    return true;
  };

  return { attendance, loadingChild, error, checkin, pedirRetirada };
}

/* sessão do culto de hoje para a turma da criança (cria se o professor
   ainda não abriu; null se ainda não abriu ou a sala foi fechada) */
export async function sessaoDoCulto(eventId: string, childId: string): Promise<string | null> {
  const { data, error } = await createServiceBrowserClient().schema("service").rpc("kids_checkin_session", { p_event: eventId, p_child: childId });
  if (error || !data) return null;
  return data as string;
}
