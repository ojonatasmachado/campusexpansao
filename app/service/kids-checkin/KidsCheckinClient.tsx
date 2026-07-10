"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { formatDateBR } from "../lib/date";

type SessionInfo = { id: string; organizationId: string; checkinActive: boolean; tokenValid: boolean };
type EventInfo = { name: string; weekday: string; eventDate: string; time: string; location: string };
type ClassInfo = { name: string };
type PersonInfo = { id: string; name: string };
type ChildInfo = { id: string; name: string; can_pickup: boolean };
type AttendanceInfo = { id: string; status: string };

function ini(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function KidsCheckinClient({
  session,
  event,
  kidsClass,
  person,
  guardianChildren,
  attendanceByChild,
}: {
  session: SessionInfo | null;
  event: EventInfo | null;
  kidsClass: ClassInfo | null;
  person: PersonInfo | null;
  guardianChildren: ChildInfo[];
  attendanceByChild: Record<string, AttendanceInfo>;
}) {
  const router = useRouter();
  const [attendance, setAttendance] = useState(attendanceByChild);
  const [loadingChild, setLoadingChild] = useState<string | null>(null);
  const [error, setError] = useState("");

  const errorState = !session
    ? "Este QR Code não aponta para uma sessão Kids válida."
    : !session.tokenValid
    ? "QR Code inválido ou expirado. Peça o atual à professora."
    : !session.checkinActive
    ? "Este QR Code está desativado. Procure a liderança."
    : null;

  const dropoff = async (childId: string) => {
    if (!session || !person) return;
    setLoadingChild(childId);
    setError("");
    const { data, error: insertError } = await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .insert({ organization_id: session.organizationId, session_id: session.id, child_id: childId, dropped_off_by: person.id, dropped_off_via: "qr" })
      .select("id,status")
      .single();
    setLoadingChild(null);
    if (insertError || !data) {
      setError("Não foi possível registrar o check-in agora.");
      return;
    }
    setAttendance((prev) => ({ ...prev, [childId]: { id: data.id as string, status: data.status as string } }));
  };

  const requestPickup = async (childId: string) => {
    const att = attendance[childId];
    if (!att || !person) return;
    setLoadingChild(childId);
    setError("");
    const { error: updateError } = await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .update({ status: "retirada_pendente", pickup_requested_by: person.id, pickup_requested_at: new Date().toISOString() })
      .eq("id", att.id);
    setLoadingChild(null);
    if (updateError) {
      setError("Não foi possível solicitar a retirada agora.");
      return;
    }
    setAttendance((prev) => ({ ...prev, [childId]: { ...att, status: "retirada_pendente" } }));
  };

  return (
    <div className="modal-bg" style={{ zIndex: 110, borderRadius: 0 }} onClick={() => router.push("/service")}>
      <div className="ck-land" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="ck-land-card">
          <div className="ck-land-logo" style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.04em" }}>
            CE<span style={{ color: "var(--olive)" }}>.X</span>
          </div>
          {event && kidsClass && (
            <div className="ck-land-event">
              <div className="ck-land-ey">◆ Kids · {kidsClass.name}</div>
              <div className="ck-land-name">{event.name}</div>
              <div className="ck-land-when">{event.weekday} {formatDateBR(event.eventDate)} · {event.time} · {event.location}</div>
            </div>
          )}

          {errorState ? (
            <div className="ck-land-result">
              <div className="ck-land-ic" style={{ color: "var(--danger)", borderColor: "var(--danger)", fontSize: 28, fontWeight: 700 }}>!</div>
              <div className="ck-land-title">Não foi possível</div>
              <div className="ck-land-txt">{errorState}</div>
            </div>
          ) : !person ? (
            <div className="ck-land-result">
              <div className="ck-land-ic" style={{ color: "var(--amber)", borderColor: "var(--amber)", fontSize: 28, fontWeight: 700 }}>!</div>
              <div className="ck-land-title">Cadastro não encontrado</div>
              <div className="ck-land-txt">Você não tem um perfil nesta igreja ainda. Fale com a recepção ou a professora.</div>
            </div>
          ) : guardianChildren.length === 0 ? (
            <div className="ck-land-result">
              <div className="ck-land-ic" style={{ color: "var(--amber)", borderColor: "var(--amber)", fontSize: 28, fontWeight: 700 }}>!</div>
              <div className="ck-land-title">Nenhuma criança vinculada</div>
              <div className="ck-land-txt">Seu cadastro ainda não tem nenhuma criança vinculada. Fale com a professora pra cadastrar.</div>
            </div>
          ) : (
            <div style={{ width: "100%", display: "grid", gap: 10, marginTop: 8 }}>
              {guardianChildren.map((child) => {
                const att = attendance[child.id];
                const busy = loadingChild === child.id;
                return (
                  <div key={child.id} className="ck-row" style={{ background: "var(--graphite)", borderRadius: "var(--r-md)", padding: 12 }}>
                    <div className="av av-md">{ini(child.name)}</div>
                    <div className="ck-row-main">
                      <div className="ck-row-name">{child.name}</div>
                      <div className="ck-row-meta">
                        {!att ? "Ainda não fez check-in" : att.status === "presente" ? "Na sala" : att.status === "retirada_pendente" ? "Retirada solicitada, aguarde a professora" : "Retirado"}
                      </div>
                    </div>
                    {!att && (
                      <button className="btn btn-pri btn-sm" type="button" disabled={busy} onClick={() => dropoff(child.id)}>{busy ? "Aguarde..." : "Fazer check-in"}</button>
                    )}
                    {att && att.status === "presente" && child.can_pickup && (
                      <button className="btn btn-sec btn-sm" type="button" disabled={busy} onClick={() => requestPickup(child.id)}>{busy ? "Aguarde..." : "Solicitar retirada"}</button>
                    )}
                    {att && att.status === "presente" && !child.can_pickup && (
                      <span style={{ fontSize: 11.5, color: "var(--subtle)" }}>sem autorização pra retirar</span>
                    )}
                    {att && att.status === "retirada_pendente" && (
                      <span style={{ fontSize: 11.5, color: "var(--amber)" }}>aguardando confirmação</span>
                    )}
                  </div>
                );
              })}
              {error && <div style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</div>}
            </div>
          )}

          <button className="btn btn-pri" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={() => router.push("/service")}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
