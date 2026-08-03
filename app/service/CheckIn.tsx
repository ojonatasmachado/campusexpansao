"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import Logo from "../components/Logo";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { formatDateBR } from "./lib/date";

// ── tipos externos (subconjunto dos tipos de ServiceExactApp) ─────────────────

type EventView = {
  id: string;
  organizationId: string;
  name: string;
  weekday: string;
  eventDate: string;
  time: string;
  location: string;
  checkinToken: string | null;
  checkinActive: boolean;
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

type MinistryLite = {
  id: string;
  name: string;
  positions: Array<{ id: string; name: string }>;
};

// ── tipos internos ────────────────────────────────────────────────────────────

type AttendanceRow = {
  id: string;
  person_id: string;
  checked_in_at: string;
  via: "qr" | "manual";
  is_extra: boolean;
};

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

function timeCurto(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
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

/* nome legível da posição (ex: "Louvor · Vocal") em vez do position_id bruto. */
function positionLabel(ministries: MinistryLite[], positionId: string): string | null {
  for (const ministry of ministries) {
    const position = ministry.positions.find((p) => p.id === positionId);
    if (position) return `${ministry.name.split(" ")[0]} · ${position.name}`;
  }
  return null;
}

function Av({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  return <div className={`av av-${size}`}>{ini(name)}</div>;
}

// ── CheckinLanding: tela de resultado (usada aqui e na rota pública /service/checkin) ─

export function CheckinLanding({
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
          <div className="ck-land-logo" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>
            <Logo />
          </div>
          <div className="ck-land-event">
            <div className="ck-land-ey">Check-in de voluntário</div>
            <div className="ck-land-name">{event.name}</div>
            <div className="ck-land-when">
              {event.weekday} {formatDateBR(event.eventDate)} · {event.time} · {event.location}
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
  ministries,
  present,
  permitirExtra,
  onAdd,
  onClose,
}: {
  event: EventView;
  roster: RosterAssignmentView[];
  people: PersonView[];
  ministries: MinistryLite[];
  present: AttendanceRow[];
  permitirExtra: boolean;
  onAdd: (personId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const presentIds = new Set(present.map((r) => r.person_id));
  const escaladoIds = new Set(
    roster.filter((r) => r.event_id === event.id && r.status !== "no").map((r) => r.person_id),
  );

  const lista = people.filter(
    (p) =>
      !presentIds.has(p.id) &&
      (escaladoIds.has(p.id) || permitirExtra) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase())),
  );

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
            const slot = roster.find(
              (r) => r.event_id === event.id && r.person_id === p.id && r.status !== "no",
            );
            const slotFn = slot ? positionLabel(ministries, slot.position_id) : null;
            return (
              <div
                className="flag-row"
                key={p.id}
                style={{ cursor: "pointer" }}
                onClick={() => { onAdd(p.id); onClose(); }}
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
  ministries,
  onRemove,
  onManualAdd,
}: {
  event: EventView;
  attendance: AttendanceRow[];
  roster: RosterAssignmentView[];
  people: PersonView[];
  ministries: MinistryLite[];
  onRemove: (personId: string) => void;
  onManualAdd: (personId: string) => void;
}) {
  const escaladoIds = roster
    .filter((r) => r.event_id === event.id && r.status !== "no")
    .map((r) => r.person_id);

  const presentIds = new Set(attendance.map((r) => r.person_id));
  const faltam = escaladoIds.filter((id) => !presentIds.has(id));

  const sorted = [...attendance].sort((a, b) => a.checked_in_at.localeCompare(b.checked_in_at));

  const getFn = (personId: string) => {
    const slot = roster.find(
      (r) => r.event_id === event.id && r.person_id === personId && r.status !== "no",
    );
    return slot ? positionLabel(ministries, slot.position_id) : null;
  };

  return (
    <div className="ck-roster">
      {sorted.length === 0 && faltam.length === 0 && (
        <div className="empty">Ninguém escalado neste evento ainda.</div>
      )}

      {sorted.map((rec) => {
        const p = people.find((x) => x.id === rec.person_id);
        if (!p) return null;
        const fn = getFn(rec.person_id);
        return (
          <div className="ck-row" key={rec.person_id}>
            <span className="ck-check">✓</span>
            <Av name={p.name} size="sm" />
            <div className="ck-row-main">
              <div className="ck-row-name">
                {p.name}
                {rec.is_extra && <span className="ck-extra">extra</span>}
              </div>
              <div className="ck-row-meta">
                {fn ?? (rec.is_extra ? "Presença extra" : "Escalado")}
                {" · "}
                {rec.via === "manual" ? "manual" : "QR"}
                {" · "}
                {timeCurto(rec.checked_in_at)}
              </div>
            </div>
            <button
              className="ck-undo"
              title="Desfazer presença"
              onClick={() => onRemove(rec.person_id)}
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
  ministries,
  permitirExtra = false,
  churchName,
  logoUrl,
  onClose,
}: {
  event: EventView;
  roster: RosterAssignmentView[];
  people: PersonView[];
  ministries: MinistryLite[];
  permitirExtra?: boolean;
  churchName?: string;
  logoUrl?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"qr" | "presenca">("qr");
  const [qrToken, setQrToken] = useState<string | null>(event.checkinToken);
  const [qrActive, setQrActive] = useState<boolean>(event.checkinActive);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [landing, setLanding] = useState<{
    person: PersonView | null;
    result: CheckinResult;
  } | null>(null);

  /* gera o token na primeira vez que o modal abre pra um evento que ainda não tem um. */
  useEffect(() => {
    if (qrToken) return;
    const token = generateToken();
    setQrToken(token);
    createServiceBrowserClient().schema("service").from("events").update({ checkin_token: token }).eq("id", event.id).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    createServiceBrowserClient()
      .schema("service")
      .from("event_attendance")
      .select("id,person_id,checked_in_at,via,is_extra")
      .eq("event_id", event.id)
      .then(({ data }) => { if (data) setAttendance(data as AttendanceRow[]); });
  }, [event.id]);

  const checkinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/service/checkin?event=${encodeURIComponent(event.id)}&t=${encodeURIComponent(qrToken ?? "")}`
      : `/service/checkin?event=${event.id}&t=${qrToken ?? ""}`;

  const escaladoIds = new Set(
    roster.filter((r) => r.event_id === event.id && r.status !== "no").map((r) => r.person_id),
  );
  const presentIds = new Set(attendance.map((r) => r.person_id));
  const presentes = attendance.length;
  const escalados = escaladoIds.size;
  const presentesEscala = [...escaladoIds].filter((id) => presentIds.has(id)).length;
  const faltam = Math.max(0, escalados - presentesEscala);
  const extras = attendance.filter((r) => r.is_extra).length;

  const registrar = async (personId: string, via: "qr" | "manual", token?: string): Promise<CheckinResult> => {
    if (via === "qr") {
      if (!qrActive) return { ok: false, motivo: "Este QR Code está desativado. Procure a liderança." };
      if (token && token !== qrToken) return { ok: false, motivo: "QR Code inválido ou expirado. Peça o atual à liderança." };
    }
    if (presentIds.has(personId)) return { ok: false, dup: true, motivo: "Você já fez check-in neste evento." };
    const escalado = escaladoIds.has(personId);
    if (!escalado && !permitirExtra) return { ok: false, bloq: true, motivo: "Você não está escalado neste evento. Fale com a liderança." };
    const extra = !escalado;
    const { data, error } = await createServiceBrowserClient()
      .schema("service")
      .from("event_attendance")
      .insert({ organization_id: event.organizationId, event_id: event.id, person_id: personId, via, is_extra: extra })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, dup: true, motivo: "Você já fez check-in neste evento." };
      return { ok: false, motivo: "Não foi possível registrar agora." };
    }
    setAttendance((prev) => [...prev, data as AttendanceRow]);
    router.refresh();
    return { ok: true, extra };
  };

  const remover = async (personId: string) => {
    const rec = attendance.find((a) => a.person_id === personId);
    if (!rec) return;
    setAttendance((prev) => prev.filter((a) => a.id !== rec.id));
    await createServiceBrowserClient().schema("service").from("event_attendance").delete().eq("id", rec.id);
    router.refresh();
  };

  const copiar = () => {
    navigator.clipboard.writeText(checkinLink).catch(() => {});
  };

  const imprimir = () => {
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--olive").trim() || "#7A9E3F";
    const marca = logoUrl
      ? `<img src="${logoUrl}" alt="${churchName ?? ""}" style="height:22px;object-fit:contain;margin-bottom:6px"/><div class="cex">Service</div>`
      : `<div class="cex">${churchName ? churchName + " · " : ""}Service</div>`;
    w.document.write(`<!doctype html><html><head><title>Check-in · ${event.name}</title>
      <style>*{margin:0;font-family:Inter,Arial,sans-serif}body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:32px}
      .ey{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${accent};margin-bottom:18px}
      .qr-wrap{width:340px;height:340px;background:#fff;padding:20px;box-sizing:border-box;margin:0 auto}
      h1{font-size:30px;margin:22px 0 6px}p{color:#555;font-size:17px}.cex{margin-top:30px;font-weight:700;font-size:18px}.in{margin-top:8px;font-size:13px;color:#888}</style>
      </head><body>
      <div class="ey">Check-in de voluntários</div>
      <div class="qr-wrap"><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinLink)}" style="width:300px;height:300px"/></div>
      <h1>${event.name}</h1><p>${event.weekday} ${formatDateBR(event.eventDate)} · ${event.time} · ${event.location}</p>
      <p class="in">Escaneie com a câmera do celular e confirme sua presença no app.</p>
      ${marca}
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
    w.document.close();
  };

  const salvar = () => {
    if (!qrToken) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const pad = 48;
      const canvas = document.createElement("canvas");
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2 + 70;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FAFAF7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad);
      ctx.fillStyle = "#0E110D";
      ctx.textAlign = "center";
      ctx.font = "700 26px Inter, sans-serif";
      ctx.fillText(event.name, canvas.width / 2, img.height + pad + 38);
      ctx.fillStyle = "#555650";
      ctx.font = "500 16px Inter, sans-serif";
      ctx.fillText(`${event.weekday} ${formatDateBR(event.eventDate)} · ${event.time}`, canvas.width / 2, img.height + pad + 62);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `checkin-${event.id}.png`;
      a.click();
    };
    img.onerror = () => window.alert("Não consegui gerar a imagem agora.");
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(checkinLink)}`;
  };

  const toggleActive = async () => {
    const next = !qrActive;
    setQrActive(next);
    await createServiceBrowserClient().schema("service").from("events").update({ checkin_active: next }).eq("id", event.id);
    router.refresh();
  };

  const regenerar = async () => {
    if (!window.confirm("Gerar um novo QR Code? O anterior deixa de funcionar.")) return;
    const token = generateToken();
    setQrToken(token);
    setQrActive(true);
    await createServiceBrowserClient().schema("service").from("events").update({ checkin_token: token, checkin_active: true }).eq("id", event.id);
    router.refresh();
  };

  const simularScan = async () => {
    const demo = people.find((p) => p.status === "ativo" && !presentIds.has(p.id)) ?? null;
    const result = demo
      ? await registrar(demo.id, "qr", qrToken ?? undefined)
      : { ok: false, motivo: "Nenhum voluntário ativo disponível para demonstração." };
    setLanding({ person: demo, result });
  };

  return (
    <>
      <div className="modal-bg" onClick={onClose}>
        <div className="modal wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-eyebrow">
              Check-in · {event.weekday} {formatDateBR(event.eventDate)} · {event.time}
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
                <div className={`ck-qr ${!qrActive ? "off" : ""}`}>
                  {qrActive && qrToken ? (
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
                  <div className={`ck-status ${qrActive ? "on" : "off"}`}>
                    <span className="ck-dot" />
                    {qrActive ? "Ativo, aceitando check-ins" : "Desativado"}
                  </div>

                  <div className="ck-link">
                    <span className="ck-link-txt">{checkinLink}</span>
                  </div>

                  <div className="ck-actions">
                    <button className="btn btn-sec btn-sm" onClick={salvar}>
                      Salvar
                    </button>
                    <button className="btn btn-sec btn-sm" onClick={imprimir}>
                      Imprimir
                    </button>
                    <button className="btn btn-sec btn-sm" onClick={copiar}>
                      Copiar link
                    </button>
                    <button className="btn btn-sec btn-sm" onClick={toggleActive}>
                      {qrActive ? "Desativar" : "Ativar"}
                    </button>
                    <button className="btn btn-sec btn-sm" onClick={regenerar}>
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
                  ministries={ministries}
                  onRemove={remover}
                  onManualAdd={async (pid) => {
                    const r = await registrar(pid, "manual");
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
          ministries={ministries}
          present={attendance}
          permitirExtra={permitirExtra}
          onAdd={async (personId) => {
            const r = await registrar(personId, "manual");
            if (!r.ok) window.alert(r.motivo);
          }}
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
