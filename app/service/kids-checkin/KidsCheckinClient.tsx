"use client";

import { useRouter } from "next/navigation";
import { statusDaCrianca, useKidsCheckin } from "../lib/kids-checkin";
import { formatDateBR, joinDot } from "../lib/date";
import ChurchLockup from "../ChurchLockup";

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
  churchName,
  logoUrl,
}: {
  churchName?: string;
  logoUrl?: string | null;
  session: SessionInfo | null;
  event: EventInfo | null;
  kidsClass: ClassInfo | null;
  person: PersonInfo | null;
  guardianChildren: ChildInfo[];
  attendanceByChild: Record<string, AttendanceInfo>;
}) {
  const router = useRouter();
  /* mesma lógica do check-in pelo app (lib/kids-checkin.ts); aqui a sessão já vem do QR */
  const { attendance, loadingChild, error, checkin: dropoff, pedirRetirada: requestPickup } = useKidsCheckin({
    organizationId: session?.organizationId,
    personId: person?.id,
    inicial: attendanceByChild,
    sessionFor: async () => session?.id ?? null,
  });

  const errorState = !session
    ? "Este QR Code não aponta para uma sessão Kids válida."
    : !session.tokenValid
    ? "QR Code inválido ou expirado. Peça o atual à professora."
    : !session.checkinActive
    ? "Este QR Code está desativado. Procure a liderança."
    : null;

  return (
    <div className="modal-bg" style={{ zIndex: 110, borderRadius: 0 }} onClick={() => router.push("/service")}>
      <div className="ck-land" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="ck-land-card">
          <div className="ck-land-logo">
            <ChurchLockup logoUrl={logoUrl} name={churchName} />
          </div>
          {event && kidsClass && (
            <div className="ck-land-event">
              <div className="ck-land-ey">Kids · {kidsClass.name}</div>
              <div className="ck-land-name">{event.name}</div>
              <div className="ck-land-when">{joinDot(`${event.weekday} ${formatDateBR(event.eventDate)}`.trim(), event.time, event.location)}</div>
            </div>
          )}

          {errorState ? (
            <div className="ck-land-result">
              <div className="ck-land-ic" style={{ color: "var(--danger)", borderColor: "var(--danger)", fontSize: "var(--fs-app-28)", fontWeight: 700 }}>!</div>
              <div className="ck-land-title">Não foi possível</div>
              <div className="ck-land-txt">{errorState}</div>
            </div>
          ) : !person ? (
            <div className="ck-land-result">
              <div className="ck-land-ic" style={{ color: "var(--amber)", borderColor: "var(--amber)", fontSize: "var(--fs-app-28)", fontWeight: 700 }}>!</div>
              <div className="ck-land-title">Cadastro não encontrado</div>
              <div className="ck-land-txt">Você não tem um perfil nesta igreja ainda. Fale com a recepção ou a professora.</div>
            </div>
          ) : guardianChildren.length === 0 ? (
            <div className="ck-land-result">
              <div className="ck-land-ic" style={{ color: "var(--amber)", borderColor: "var(--amber)", fontSize: "var(--fs-app-28)", fontWeight: 700 }}>!</div>
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
                        {statusDaCrianca(att)}
                      </div>
                    </div>
                    {!att && (
                      <button className="btn btn-pri btn-sm" type="button" disabled={busy} onClick={() => dropoff(child.id)}>{busy ? "Aguarde..." : "Fazer check-in"}</button>
                    )}
                    {att && att.status === "presente" && child.can_pickup && (
                      <button className="btn btn-sec btn-sm" type="button" disabled={busy} onClick={() => requestPickup(child.id)}>{busy ? "Aguarde..." : "Solicitar retirada"}</button>
                    )}
                    {att && att.status === "presente" && !child.can_pickup && (
                      <span style={{ fontSize: "var(--fs-ui-sm)", color: "var(--muted)" }}>sem autorização pra retirar</span>
                    )}
                    {att && att.status === "retirada_pendente" && (
                      <span style={{ fontSize: "var(--fs-ui-sm)", color: "var(--amber)" }}>aguardando confirmação</span>
                    )}
                  </div>
                );
              })}
              {error && <div style={{ fontSize: "var(--fs-ui-13)", color: "var(--danger)" }}>{error}</div>}
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
