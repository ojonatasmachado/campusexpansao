"use client";

import { plural } from "./lib/plural";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { formatDateBR, joinDot } from "./lib/date";
import { Icon } from "./lib/icons";

import { Botao } from "./ui/Botao";
import { Abas } from "./ui/Abas";
import { Janela } from "./ui/Janela";
import { Cartao } from "./ui/Cartao";
import { Vazio } from "./ui/Estados";
import { Avatar } from "./ui/Avatar";
import { confirmar } from "./ui/confirmar";
// ── tipos externos (subconjunto dos tipos de ServiceExactApp) ─────────────────

type EventLite = {
  id: string;
  organizationId: string;
  name: string;
  weekday: string;
  eventDate: string;
  time: string;
};

type KidsClassLite = { id: string; name: string };

type ChildLite = { id: string; name: string; class_id: string | null; allergies: string | null };

type SessionRow = { id: string; event_id: string; class_id: string; checkin_token: string | null; checkin_active: boolean };

type AttendanceRow = {
  id: string;
  session_id: string;
  child_id: string;
  status: "presente" | "retirada_pendente" | "retirado";
  dropped_off_at: string;
  dropped_off_via: "qr" | "manual";
  pickup_requested_at: string | null;
};

function generateToken() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}


export function KidsQRModal({
  event,
  kidsClass,
  session,
  kidsChildren,
  onClose,
}: {
  event: EventLite;
  kidsClass: KidsClassLite;
  session: SessionRow | null;
  kidsChildren: ChildLite[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(session?.id ?? null);
  const [qrToken, setQrToken] = useState<string | null>(session?.checkin_token ?? null);
  const [qrActive, setQrActive] = useState<boolean>(session?.checkin_active ?? true);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [tab, setTab] = useState<"qr" | "sala">("qr");
  const [q, setQ] = useState("");

  /* cria a sessão (e o token) na primeira vez que abre pra esta turma+culto. */
  useEffect(() => {
    if (sessionId) return;
    const token = generateToken();
    createServiceBrowserClient()
      .schema("service")
      .from("kids_sessions")
      .insert({ organization_id: event.organizationId, event_id: event.id, class_id: kidsClass.id, checkin_token: token, checkin_active: true })
      .select("id")
      .single()
      .then(({ data }) => {
        if (data) {
          setSessionId(data.id as string);
          setQrToken(token);
          router.refresh();
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .select("id,session_id,child_id,status,dropped_off_at,dropped_off_via,pickup_requested_at")
      .eq("session_id", sessionId)
      .then(({ data }) => { if (data) setAttendance(data as AttendanceRow[]); });
  }, [sessionId]);

  const checkinLink =
    typeof window !== "undefined" && sessionId
      ? `${window.location.origin}/service/kids-checkin?session=${encodeURIComponent(sessionId)}&t=${encodeURIComponent(qrToken ?? "")}`
      : "";

  const toggleActive = async () => {
    if (!sessionId) return;
    const next = !qrActive;
    setQrActive(next);
    await createServiceBrowserClient().schema("service").from("kids_sessions").update({ checkin_active: next }).eq("id", sessionId);
    router.refresh();
  };

  const regenerar = async () => {
    if (!sessionId || !(await confirmar({ titulo: "Gerar um novo QR Code?", texto: "O anterior deixa de funcionar.", acao: "Gerar novo código", perigo: false }))) return;
    const token = generateToken();
    setQrToken(token);
    setQrActive(true);
    await createServiceBrowserClient().schema("service").from("kids_sessions").update({ checkin_token: token, checkin_active: true }).eq("id", sessionId);
    router.refresh();
  };

  const confirmarRetirada = async (att: AttendanceRow) => {
    setAttendance((prev) => prev.map((a) => (a.id === att.id ? { ...a, status: "retirado" } : a)));
    await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .update({ status: "retirado", picked_up_confirmed_by: null, picked_up_at: new Date().toISOString(), picked_up_via: "manual" })
      .eq("id", att.id);
    router.refresh();
  };

  const checkinManual = async (childId: string) => {
    if (!sessionId) return;
    const { data } = await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .insert({ organization_id: event.organizationId, session_id: sessionId, child_id: childId, status: "presente", dropped_off_via: "manual" })
      .select("id,session_id,child_id,status,dropped_off_at,dropped_off_via,pickup_requested_at")
      .single();
    if (data) setAttendance((prev) => [...prev, data as AttendanceRow]);
    router.refresh();
  };

  const present = attendance.filter((a) => a.status !== "retirado");
  const pending = attendance.filter((a) => a.status === "retirada_pendente");
  const childById = new Map(kidsChildren.map((c) => [c.id, c]));
  const notYetIn = kidsChildren.filter(
    (c) => (c.class_id === kidsClass.id || !c.class_id) && !attendance.some((a) => a.child_id === c.id && a.status !== "retirado") && (!q || c.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Janela larga
      sobretitulo={joinDot("Kids", `${event.weekday} ${formatDateBR(event.eventDate)}`.trim(), event.time)}
      titulo={kidsClass.name}
      texto="QR Code próprio desta turma neste culto. O responsável escaneia, escolhe o filho e confirma o check-in ou pede a retirada."
      aoFechar={onClose} corpoBloco
      cabecalho={
        <Abas rotulo="Partes do check-in" ativa={tab} aoMudar={(v) => setTab(v as typeof tab)}
          abas={[{ id: "qr", rotulo: "QR Code" }, { id: "sala", rotulo: `Quem está na sala${pending.length > 0 ? ` · ${plural(pending.length, "retirada")}` : ""}`, contador: present.length }]} />
      }
      rodape={<Botao variante="principal" onClick={onClose}>Concluído</Botao>}>
          {tab === "qr" && (
            <div className="ck-qr-wrap">
              <div className={`ck-qr ${!qrActive ? "off" : ""}`}>
                {qrActive && qrToken && checkinLink ? (
                  <QRCode value={checkinLink} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox="0 0 200 200" />
                ) : (
                  <div className="ck-qr-off"><span style={{ fontSize: "var(--fs-app-28)" }}>✕</span><span>QR desativado</span></div>
                )}
              </div>
              <div className="ck-qr-side">
                <div className={`ck-status ${qrActive ? "on" : "off"}`}><span className="ck-dot" />{qrActive ? "Ativo, aceitando check-ins" : "Desativado"}</div>
                <div className="ck-link"><span className="ck-link-txt">{checkinLink}</span></div>
                <div className="ck-actions">
                  <Botao compacto onClick={toggleActive}>{qrActive ? "Desativar" : "Ativar"}</Botao>
                  <Botao compacto onClick={regenerar}>Regenerar</Botao>
                </div>
                <div className="ck-hint">Imprima e cole na porta da sala. Cada responsável escaneia com o celular pra deixar ou retirar o filho.</div>
              </div>
            </div>
          )}

          {tab === "sala" && (
            <div className="ck-presenca">
              {pending.length > 0 && (
                <Cartao style={{ marginBottom: 16 }}>
                  <div className="panel-head"><span className="panel-title"><Icon name="alerta" size={14} /> Retiradas pendentes</span></div>
                  <div className="panel-body flush">
                    {pending.map((att) => {
                      const child = childById.get(att.child_id);
                      return (
                        <div className="ck-row" key={att.id}>
                          <span className="ck-check pend">!</span>
                          <div className="ck-row-main">
                            <div className="ck-row-name">{child?.name ?? "Criança"}</div>
                            <div className="ck-row-meta">Aguardando confirmação visual do responsável</div>
                          </div>
                          <Botao variante="principal" compacto onClick={() => confirmarRetirada(att)}>Confirmar retirada</Botao>
                        </div>
                      );
                    })}
                  </div>
                </Cartao>
              )}
              <div className="ck-roster">
                {present.filter((a) => a.status === "presente").length === 0 && <Vazio titulo="Nenhuma criança na sala ainda." />}
                {present.filter((a) => a.status === "presente").map((att) => {
                  const child = childById.get(att.child_id);
                  return (
                    <div className="ck-row" key={att.id}>
                      <span className="ck-check"><Icon name="ok" size={14} /></span>
                      <Avatar nome={child?.name ?? ""} tamanho="sm" />
                      <div className="ck-row-main">
                        <div className="ck-row-name">{child?.name ?? "Criança"}{child?.allergies ? <span className="ck-extra"><Icon name="alerta" size={13} /> alergia</span> : null}</div>
                        <div className="ck-row-meta">{att.dropped_off_via === "manual" ? "manual" : "QR"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="tb-search" style={{ marginTop: 16, marginBottom: 8 }}>
                <span className="si"><Icon name="buscar" size={13} /></span>
                <input placeholder="Buscar criança pra check-in manual..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {q && notYetIn.slice(0, 6).map((child) => (
                <div className="flag-row" key={child.id} style={{ cursor: "pointer" }} onClick={() => { checkinManual(child.id); setQ(""); }}>
                  <Avatar nome={child.name} tamanho="sm" />
                  <div className="flag-main"><div className="flag-nome">{child.name}</div></div>
                  <span style={{ marginLeft: "auto", color: "var(--muted)" }}>+ check-in</span>
                </div>
              ))}
            </div>
          )}
    </Janela>
  );
}
