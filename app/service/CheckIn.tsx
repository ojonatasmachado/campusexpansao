"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

// ── tipos externos (subconjunto dos tipos de ServiceExactApp) ─────────────────

type EventView = {
  id: string;
  name: string;
  weekday: string;
  eventDate: string;
  time: string;
  location: string;
};

type PersonView = {
  id: string;
  name: string;
  status: "ativo" | "pausa" | "ferias";
  tags: string[];
};

type RosterAssignmentView = {
  id: string;
  event_id: string;
  position_id: string;
  person_id: string;
  status: "ok" | "wait" | "no";
};

// ── tipos internos ────────────────────────────────────────────────────────────

type AttendanceRecord = {
  personId: string;
  when: number;
  via: "qr" | "manual";
  extra: boolean;
};

type QRState = { token: string; active: boolean };

type CheckinResult = {
  ok: boolean;
  dup?: boolean;
  extra?: boolean;
  bloq?: boolean;
  motivo?: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function generateToken() {
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

function timeCurto(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ini(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Av({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  return <div className={`av av-${size}`}>{ini(name)}</div>;
}

// ── CheckinLanding: tela de resultado (simulação de scan) ─────────────────────

function CheckinLanding({
  event,
  person,
  result,
  onDone,
}: {
  event: EventView;
  person: PersonView | null;
  result: CheckinResult | null;
  onDone: () => void;
}) {
  let cor = "var(--olive)";
  let titulo = "Verificando...";
  let txt = "";
  let icone = "✓";

  if (result) {
    if (result.ok) {
      cor = result.extra ? "var(--olive-soft)" : "var(--olive)";
      titulo = result.extra ? "Presença registrada (extra)" : "Presença confirmada!";
      txt = result.extra
        ? "Você não estava escalado, mas a igreja permite presença extra. Bom serviço!"
        : `Tudo certo. Bom serviço, ${person?.name.split(" ")[0] ?? ""}!`;
      icone = "✓";
    } else if (result.dup) {
      cor = "var(--olive-soft)";
      titulo = "Você já está presente";
      txt = "Seu check-in neste evento já foi registrado.";
      icone = "✓";
    } else if (result.bloq) {
      cor = "var(--amber)";
      titulo = "Check-in não liberado";
      txt = result.motivo ?? "";
      icone = "!";
    } else {
      cor = "var(--danger)";
      titulo = "Não foi possível";
      txt = result.motivo ?? "";
      icone = "!";
    }
  }

  return (
    <div
      className="modal-bg"
      style={{ zIndex: 110, borderRadius: 0 }}
      onClick={onDone}
    >
      <div
        className="ck-land"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ck-land-card">
          <div className="ck-land-logo" style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.04em" }}>
            CE<span style={{ color: "var(--olive)" }}>.X</span>
          </div>
          <div className="ck-land-event">
            <div className="ck-land-ey">◆ Check-in de voluntário</div>
            <div className="ck-land-name">{event.name}</div>
            <div className="ck-land-when">
              {event.weekday} {event.eventDate} · {event.time} · {event.location}
            </div>
          </div>
          <div className="ck-land-result">
            <div
              className="ck-land-ic"
              style={{ color: cor, borderColor: cor, fontSize: 28, fontWeight: 700 }}
            >
              {icone}
            </div>
            {person && (
              <div className="ck-land-pessoa">
                <Av name={person.name} size="md" />
                <span>{person.name}</span>
              </div>
            )}
            <div className="ck-land-title">{titulo}</div>
            {txt && <div className="ck-land-txt">{txt}</div>}
          </div>
          <button
            className="btn btn-pri"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={onDone}
          >
            {result?.ok ? "Concluir" : "Voltar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ManualCheckinModal ────────────────────────────────────────────────────────

function ManualCheckinModal({
  event,
  roster,
  people,
  present,
  permitirExtra,
  onAdd,
  onClose,
}: {
  event: EventView;
  roster: RosterAssignmentView[];
  people: PersonView[];
  present: AttendanceRecord[];
  permitirExtra: boolean;
  onAdd: (record: AttendanceRecord) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const presentIds = new Set(present.map((r) => r.personId));
  const escaladoIds = new Set(
    roster.filter((r) => r.event_id === event.id && r.status !== "no").map((r) => r.person_id),
  );

  const lista = people.filter(
    (p) =>
      !presentIds.has(p.id) &&
      (escaladoIds.has(p.id) || permitirExtra) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase())),
  );

  const marcar = (person: PersonView) => {
    const extra = !escaladoIds.has(person.id);
    onAdd({ personId: person.id, when: Date.now(), via: "manual", extra });
    onClose();
  };

  return (
    <div className="modal-bg" style={{ zIndex: 80 }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Registro manual</div>
          <div className="modal-title">Quem está presente</div>
          <div className="modal-sub">
            Para quem chegou sem escanear. Entra na presença com marca de registro manual.
          </div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si">🔍</span>
            <input
              placeholder="Buscar voluntário..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          {lista.length === 0 && (
            <div className="empty">
              {q
                ? "Nenhum resultado."
                : "Todos os voluntários elegíveis já estão presentes."}
            </div>
          )}
          {lista.map((p) => {
            const escalado = escaladoIds.has(p.id);
            const slotFn = roster.find(
              (r) => r.event_id === event.id && r.person_id === p.id && r.status !== "no",
            )?.position_id;
            return (
              <div
                className="flag-row"
                key={p.id}
                style={{ cursor: "pointer" }}
                onClick={() => marcar(p)}
              >
                <Av name={p.name} size="sm" />
                <div className="flag-main">
                  <div className="flag-nome">{p.name}</div>
                  <div className="flag-meta">
                    {escalado
                      ? slotFn ?? "Escalado"
                      : "Não escalado · entra como extra"}
                  </div>
                </div>
                <span style={{ marginLeft: "auto", color: "var(--subtle)" }}>→</span>
              </div>
            );
          })}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CheckinRoster ─────────────────────────────────────────────────────────────

function CheckinRoster({
  event,
  attendance,
  roster,
  people,
  permitirExtra,
  onRemove,
  onManualAdd,
}: {
  event: EventView;
  attendance: AttendanceRecord[];
  roster: RosterAssignmentView[];
  people: PersonView[];
  permitirExtra: boolean;
  onRemove: (personId: string) => void;
  onManualAdd: (personId: string) => void;
}) {
  const escaladoIds = roster
    .filter((r) => r.event_id === event.id && r.status !== "no")
    .map((r) => r.person_id);

  const presentIds = new Set(attendance.map((r) => r.personId));
  const faltam = escaladoIds.filter((id) => !presentIds.has(id));

  const sorted = [...attendance].sort((a, b) => a.when - b.when);

  const getFn = (personId: string) => {
    const slot = roster.find(
      (r) => r.event_id === event.id && r.person_id === personId && r.status !== "no",
    );
    return slot?.position_id ?? null;
  };

  return (
    <div className="ck-roster">
      {sorted.length === 0 && faltam.length === 0 && (
        <div className="empty">Ninguém escalado neste evento ainda.</div>
      )}

      {sorted.map((rec) => {
        const p = people.find((x) => x.id === rec.personId);
        if (!p) return null;
        const fn = getFn(rec.personId);
        return (
          <div className="ck-row" key={rec.personId}>
            <span className="ck-check">✓</span>
            <Av name={p.name} size="sm" />
            <div className="ck-row-main">
              <div className="ck-row-name">
                {p.name}
                {rec.extra && <span className="ck-extra">extra</span>}
              </div>
              <div className="ck-row-meta">
                {fn ?? (rec.extra ? "Presença extra" : "Escalado")}
                {" · "}
                {rec.via === "manual" ? "manual" : "QR"}
                {" · "}
                {timeCurto(rec.when)}
              </div>
            </div>
            <button
              className="ck-undo"
              title="Desfazer presença"
              onClick={() => onRemove(rec.personId)}
            >
              ✕
            </button>
          </div>
        );
      })}

      {faltam.map((pid) => {
        const p = people.find((x) => x.id === pid);
        if (!p) return null;
        const fn = getFn(pid);
        return (
          <div className="ck-row pend" key={pid}>
            <span className="ck-check pend">○</span>
            <Av name={p.name} size="sm" />
            <div className="ck-row-main">
              <div className="ck-row-name">{p.name}</div>
              <div className="ck-row-meta">{fn ?? "Escalado"} · não chegou</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onManualAdd(pid)}
            >
              Marcar presente
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── QRCheckinModal (export principal) ─────────────────────────────────────────

export function QRCheckinModal({
  event,
  roster,
  people,
  onClose,
}: {
  event: EventView;
  roster: RosterAssignmentView[];
  people: PersonView[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"qr" | "presenca">("qr");
  const [qr, setQr] = useState<QRState>(() => ({ token: generateToken(), active: true }));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [landing, setLanding] = useState<{
    person: PersonView | null;
    result: CheckinResult;
  } | null>(null);
  const [permitirExtra] = useState(false);

  const checkinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/service?checkin=${encodeURIComponent(event.id)}&t=${encodeURIComponent(qr.token)}`
      : `/service?checkin=${event.id}&t=${qr.token}`;

  const escaladoIds = new Set(
    roster.filter((r) => r.event_id === event.id && r.status !== "no").map((r) => r.person_id),
  );
  const presentIds = new Set(attendance.map((r) => r.personId));
  const presentes = attendance.length;
  const escalados = escaladoIds.size;
  const presentesEscala = [...escaladoIds].filter((id) => presentIds.has(id)).length;
  const faltam = Math.max(0, escalados - presentesEscala);
  const extras = attendance.filter((r) => r.extra).length;

  const registrar = (personId: string, via: "qr" | "manual", token?: string): CheckinResult => {
    if (via === "qr") {
      if (!qr.active) return { ok: false, motivo: "Este QR Code está desativado. Procure a liderança." };
      if (token && token !== qr.token) return { ok: false, motivo: "QR Code inválido ou expirado. Peça o atual à liderança." };
    }
    if (presentIds.has(personId)) return { ok: false, dup: true, motivo: "Você já fez check-in neste evento." };
    const escalado = escaladoIds.has(personId);
    if (!escalado && !permitirExtra) return { ok: false, bloq: true, motivo: "Você não está escalado neste evento. Fale com a liderança." };
    const extra = !escalado;
    setAttendance((prev) => [...prev, { personId, when: Date.now(), via, extra }]);
    return { ok: true, extra };
  };

  const remover = (personId: string) => {
    setAttendance((prev) => prev.filter((r) => r.personId !== personId));
  };

  const copiar = () => {
    navigator.clipboard.writeText(checkinLink).catch(() => {});
  };

  const imprimir = () => {
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Check-in · ${event.name}</title>
      <style>*{margin:0;font-family:Inter,Arial,sans-serif}body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:32px}
      .ey{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#7A9E3F;margin-bottom:18px}
      .qr-wrap{width:340px;height:340px;background:#fff;padding:20px;box-sizing:border-box;margin:0 auto}
      h1{font-size:30px;margin:22px 0 6px}p{color:#555;font-size:17px}.cex{margin-top:30px;font-weight:700;font-size:18px}.cex span{color:#7A9E3F}.in{margin-top:8px;font-size:13px;color:#888}</style>
      </head><body>
      <div class="ey">◆ Check-in de voluntários</div>
      <div class="qr-wrap"><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinLink)}" style="width:300px;height:300px"/></div>
      <h1>${event.name}</h1><p>${event.weekday} ${event.eventDate} · ${event.time} · ${event.location}</p>
      <p class="in">Escaneie com a câmera do celular e confirme sua presença no app.</p>
      <div class="cex">CE<span>.X</span> Service</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
    w.document.close();
  };

  const simularScan = () => {
    const demo = people.find((p) => p.status === "ativo" && !presentIds.has(p.id)) ?? null;
    const result = demo
      ? registrar(demo.id, "qr", qr.token)
      : { ok: false, motivo: "Nenhum voluntário ativo disponível para demonstração." };
    setLanding({ person: demo, result });
  };

  return (
    <>
      <div className="modal-bg" onClick={onClose}>
        <div className="modal wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-eyebrow">
              ◆ Check-in · {event.weekday} {event.eventDate} · {event.time}
            </div>
            <div className="modal-title">{event.name}</div>
            <div className="modal-sub">
              QR Code único deste evento. Os voluntários escaneiam e confirmam presença pela própria
              conta. Você acompanha em tempo real.
            </div>
            <div className="ck-tabs">
              <button
                className={`ck-tab ${tab === "qr" ? "on" : ""}`}
                onClick={() => setTab("qr")}
              >
                QR Code
              </button>
              <button
                className={`ck-tab ${tab === "presenca" ? "on" : ""}`}
                onClick={() => setTab("presenca")}
              >
                Presença ao vivo · {presentes}
              </button>
            </div>
          </div>

          <div className="modal-body" style={{ display: "block" }}>
            {tab === "qr" && (
              <div className="ck-qr-wrap">
                <div className={`ck-qr ${!qr.active ? "off" : ""}`}>
                  {qr.active ? (
                    <QRCode
                      value={checkinLink}
                      size={200}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox="0 0 200 200"
                    />
                  ) : (
                    <div className="ck-qr-off">
                      <span style={{ fontSize: 28 }}>✕</span>
                      <span>QR desativado</span>
                    </div>
                  )}
                </div>

                <div className="ck-qr-side">
                  <div className={`ck-status ${qr.active ? "on" : "off"}`}>
                    <span className="ck-dot" />
                    {qr.active ? "Ativo — aceitando check-ins" : "Desativado"}
                  </div>

                  <div className="ck-link">
                    <span className="ck-link-txt">{checkinLink}</span>
                  </div>

                  <div className="ck-actions">
                    <button className="btn btn-sec btn-sm" onClick={imprimir}>
                      Imprimir
                    </button>
                    <button className="btn btn-sec btn-sm" onClick={copiar}>
                      Copiar link
                    </button>
                    <button
                      className="btn btn-sec btn-sm"
                      onClick={() => setQr((q) => ({ ...q, active: !q.active }))}
                    >
                      {qr.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      className="btn btn-sec btn-sm"
                      onClick={() => {
                        if (window.confirm("Gerar um novo QR Code? O anterior deixa de funcionar.")) {
                          setQr({ token: generateToken(), active: true });
                        }
                      }}
                    >
                      Regenerar
                    </button>
                  </div>

                  <div className="ck-hint">
                    Imprima e cole na entrada dos voluntários, backstage ou secretaria. Quem
                    escanear confirma presença pela conta logada.
                  </div>

                  <button
                    className="btn btn-pri"
                    style={{ marginTop: 4, justifyContent: "center" }}
                    onClick={simularScan}
                  >
                    Simular leitura (abrir como voluntário) →
                  </button>
                </div>
              </div>
            )}

            {tab === "presenca" && (
              <div className="ck-presenca">
                <div className="ck-counters">
                  <div className="ck-counter">
                    <b>{presentes}</b>
                    <span>presentes</span>
                  </div>
                  <div className="ck-counter">
                    <b style={{ color: "var(--amber)" }}>{faltam}</b>
                    <span>não chegaram</span>
                  </div>
                  <div className="ck-counter">
                    <b>{escalados}</b>
                    <span>escalados</span>
                  </div>
                  {extras > 0 && (
                    <div className="ck-counter">
                      <b style={{ color: "var(--olive-soft)" }}>{extras}</b>
                      <span>extras</span>
                    </div>
                  )}
                </div>

                <CheckinRoster
                  event={event}
                  attendance={attendance}
                  roster={roster}
                  people={people}
                  permitirExtra={permitirExtra}
                  onRemove={remover}
                  onManualAdd={(pid) => {
                    const r = registrar(pid, "manual");
                    if (!r.ok) window.alert(r.motivo);
                  }}
                />

                <button
                  className="btn btn-sec btn-sm"
                  style={{ marginTop: 6 }}
                  onClick={() => setShowManual(true)}
                >
                  + Registrar presença manualmente
                </button>
              </div>
            )}
          </div>

          <div className="modal-foot">
            <button className="btn btn-pri" onClick={onClose}>
              Concluído
            </button>
          </div>
        </div>
      </div>

      {showManual && (
        <ManualCheckinModal
          event={event}
          roster={roster}
          people={people}
          present={attendance}
          permitirExtra={permitirExtra}
          onAdd={(rec) => setAttendance((prev) => [...prev, rec])}
          onClose={() => setShowManual(false)}
        />
      )}

      {landing && (
        <CheckinLanding
          event={event}
          person={landing.person}
          result={landing.result}
          onDone={() => setLanding(null)}
        />
      )}
    </>
  );
}
