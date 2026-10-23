"use client";

import { Icon } from "./lib/icons";
import { avisar } from "./lib/avisar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import ChurchLockup from "./ChurchLockup";

import { Botao, BotaoIcone } from "./ui/Botao";
import { Abas } from "./ui/Abas";
import { Janela } from "./ui/Janela";
import { Vazio } from "./ui/Estados";
import { Avatar } from "./ui/Avatar";
import { confirmar } from "./ui/confirmar";
/* ─── tipos externos (subconjunto dos tipos de ServiceExactApp) ────────── */

type LessonView = {
  id: string;
  module_id: string;
  name: string;
  duration: string | null;
  kind: "video" | "texto" | "presencial" | "ao_vivo" | null;
  sort_order: number;
  link: string | null;
  conteudo: string | null;
  prova: Array<{ q: string; opts: string[]; correta: number }> | null;
  min_acertos: number;
  checkin_token: string | null;
  checkin_active: boolean;
};

type EnrollmentView = {
  id: string;
  course_id: string;
  member_id: string;
  done_count: number;
  status: "cursando" | "concluido";
};

type MemberView = { id: string; name: string; journey?: number[] };

type AttendanceRow = {
  id: string;
  course_id: string;
  lesson_id: string;
  member_id: string;
  checked_in_at: string;
  via: "qr" | "manual";
};

type CheckinResult = {
  ok: boolean;
  dup?: boolean;
  bloq?: boolean;
  motivo?: string;
};

/* ─── helpers ─────────────────────────────────────────────────────────── */

function generateToken() {
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

function timeCurto(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}



/* ─── tela de resultado (usada aqui e na rota pública /service/aula-checkin) ─── */

export function AulaCheckinLanding({
  courseName, lessonName, person, result, onDone, churchName, logoUrl,
}: {
  churchName?: string;
  logoUrl?: string | null;
  courseName: string;
  lessonName: string;
  person: MemberView | null;
  result: CheckinResult | null;
  onDone: () => void;
}) {
  let cor = "var(--olive)";
  let titulo = "Verificando...";
  let txt = "";
  let icone = "✓";

  if (result) {
    if (result.ok) {
      cor = "var(--olive)";
      titulo = "Presença confirmada!";
      txt = `Tudo certo. Bons estudos, ${person?.name.split(" ")[0] ?? ""}!`;
      icone = "✓";
    } else if (result.dup) {
      cor = "var(--olive-soft)";
      titulo = "Você já está presente";
      txt = "Seu check-in nesta aula já foi registrado.";
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
    <div /* lei17-ok: tela cheia de resultado do check-in */ className="modal-bg" style={{ zIndex: 110, borderRadius: 0 }} onClick={onDone}>
      <div className="ck-land" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="ck-land-card">
          <div className="ck-land-logo">
            <ChurchLockup logoUrl={logoUrl} name={churchName} />
          </div>
          <div className="ck-land-event">
            <div className="ck-land-ey">Check-in de aula</div>
            <div className="ck-land-name">{lessonName}</div>
            <div className="ck-land-when">{courseName}</div>
          </div>
          <div className="ck-land-result">
            <div className="ck-land-ic" style={{ color: cor, borderColor: cor, fontSize: "var(--fs-app-28)", fontWeight: 700 }}>{icone === "✓" ? <Icon name="ok" size={30} /> : icone}</div>
            {person && (
              <div className="ck-land-pessoa">
                <Avatar nome={person.name} tamanho="md" />
                <span>{person.name}</span>
              </div>
            )}
            <div className="ck-land-title">{titulo}</div>
            {txt && <div className="ck-land-txt">{txt}</div>}
          </div>
          <Botao variante="principal" style={{ width: "100%", justifyContent: "center" }} onClick={onDone}>
            {result?.ok ? "Concluir" : "Voltar"}
          </Botao>
        </div>
      </div>
    </div>
  );
}

/* ─── ManualAulaCheckinModal ─────────────────────────────────────────────── */

function ManualAulaCheckinModal({
  matriculados, present, onAdd, onClose,
}: {
  matriculados: MemberView[];
  present: AttendanceRow[];
  onAdd: (memberId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const presentIds = new Set(present.map((r) => r.member_id));
  const lista = matriculados.filter(
    (m) => !presentIds.has(m.id) && (!q || m.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Janela acima sobretitulo="Registro manual" titulo="Quem está presente" texto="Para quem chegou sem escanear. Só matriculados no curso."
      aoFechar={onClose} corpoBloco rodape={<Botao onClick={onClose}>Fechar</Botao>}>
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si" aria-hidden="true"><Icon name="buscar" size={14} /></span>
            <input placeholder="Buscar matriculado..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          {lista.length === 0 && (
            <Vazio titulo={q ? "Nenhum resultado." : "Todos os matriculados já estão presentes."} />
          )}
          {lista.map((m) => (
            <div className="flag-row" key={m.id} style={{ cursor: "pointer" }} onClick={() => { onAdd(m.id); onClose(); }}>
              <Avatar nome={m.name} tamanho="sm" />
              <div className="flag-main"><div className="flag-nome">{m.name}</div></div>
              <span style={{ marginLeft: "auto", color: "var(--muted)" }}>→</span>
            </div>
          ))}
    </Janela>
  );
}

/* ─── AulaCheckinModal (export principal) ────────────────────────────────── */

export function AulaCheckinModal({
  course, lesson, church, totalAulas, courseLessonIds, enrollments, members, attendance, onClose,
}: {
  course: { id: string; name: string };
  lesson: LessonView;
  church: { id: string; organizationId: string };
  totalAulas: number;
  courseLessonIds: string[];
  enrollments: EnrollmentView[];
  members: MemberView[];
  attendance: AttendanceRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"qr" | "presenca">("qr");
  const [qrToken, setQrToken] = useState<string | null>(lesson.checkin_token);
  const [qrActive, setQrActive] = useState<boolean>(lesson.checkin_active);
  const [lessonAttendance, setLessonAttendance] = useState<AttendanceRow[]>(attendance.filter((a) => a.lesson_id === lesson.id));
  const [showManual, setShowManual] = useState(false);
  const [landing, setLanding] = useState<{ person: MemberView | null; result: CheckinResult } | null>(null);

  useEffect(() => {
    if (qrToken) return;
    const token = generateToken();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- token gerado e gravado no banco uma vez, ao abrir
    setQrToken(token);
    createServiceBrowserClient().schema("service").from("course_lessons").update({ checkin_token: token }).eq("id", lesson.id).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matriculadoIds = new Set(enrollments.map((e) => e.member_id));
  const matriculados = members.filter((m) => matriculadoIds.has(m.id));
  const presentIds = new Set(lessonAttendance.map((r) => r.member_id));
  const presentes = lessonAttendance.length;
  const faltam = Math.max(0, matriculados.length - presentes);

  const checkinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/service/aula-checkin?curso=${encodeURIComponent(course.id)}&aula=${encodeURIComponent(lesson.id)}&t=${encodeURIComponent(qrToken ?? "")}`
      : `/service/aula-checkin?curso=${course.id}&aula=${lesson.id}&t=${qrToken ?? ""}`;

  const registrar = async (memberId: string, via: "qr" | "manual", token?: string): Promise<CheckinResult> => {
    if (via === "qr") {
      if (!qrActive) return { ok: false, motivo: "Este QR Code está desativado. Procure a liderança." };
      if (token && token !== qrToken) return { ok: false, motivo: "QR Code inválido ou expirado. Peça o atual à liderança." };
    }
    if (presentIds.has(memberId)) return { ok: false, dup: true, motivo: "Você já fez check-in nesta aula." };
    if (!matriculadoIds.has(memberId)) return { ok: false, bloq: true, motivo: "Você não está matriculado neste curso. Fale com a liderança." };

    const supabase = createServiceBrowserClient();
    const { data, error } = await supabase
      .schema("service")
      .from("lesson_attendance")
      .insert({ organization_id: church.organizationId, course_id: course.id, lesson_id: lesson.id, member_id: memberId, via })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, dup: true, motivo: "Você já fez check-in nesta aula." };
      return { ok: false, motivo: "Não foi possível registrar agora." };
    }
    const newRow = data as AttendanceRow;
    setLessonAttendance((prev) => [...prev, newRow]);

    /* recalcula done_count real: presença distinta do membro nas aulas deste curso */
    const doneCount = new Set(
      attendance.filter((a) => a.member_id === memberId && courseLessonIds.includes(a.lesson_id)).map((a) => a.lesson_id),
    );
    doneCount.add(lesson.id);
    const enrollment = enrollments.find((e) => e.member_id === memberId);
    const justCompleted = !!enrollment && enrollment.status !== "concluido" && doneCount.size >= totalAulas && totalAulas > 0;
    if (enrollment) {
      await supabase.schema("service").from("enrollments").update({
        done_count: doneCount.size,
        status: justCompleted ? "concluido" : "cursando",
      }).eq("id", enrollment.id);
    }
    if (justCompleted) {
      const member = members.find((m) => m.id === memberId);
      await supabase.schema("service").from("timeline_events").insert({
        organization_id: church.organizationId,
        member_id: memberId,
        event_type: "curso",
        title: `Concluiu "${course.name}"`,
        sort_key: Number(`${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`),
        when_label: new Date().toLocaleDateString("pt-BR"),
      });
      if (member) {
        const journey = [...(member.journey ?? [0, 0, 0, 0, 0])];
        journey[2] = 1;
        await supabase.schema("service").from("members").update({ journey }).eq("id", memberId);
      }
    }

    router.refresh();
    return { ok: true };
  };

  const remover = async (memberId: string) => {
    const rec = lessonAttendance.find((a) => a.member_id === memberId);
    if (!rec) return;
    setLessonAttendance((prev) => prev.filter((a) => a.id !== rec.id));
    await createServiceBrowserClient().schema("service").from("lesson_attendance").delete().eq("id", rec.id);
    router.refresh();
  };

  const copiar = () => { navigator.clipboard.writeText(checkinLink).catch(() => {}); };

  const imprimir = () => {
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--olive").trim() || "#7A9E3F";
    w.document.write(`<!doctype html><html><head><title>Check-in · ${lesson.name}</title>
      <style>*{margin:0;font-family:Inter,Arial,sans-serif}body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:32px}
      .ey{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${accent};margin-bottom:18px}
      .qr-wrap{width:340px;height:340px;background:#fff;padding:20px;box-sizing:border-box;margin:0 auto}
      h1{font-size:30px;margin:22px 0 6px}p{color:#555;font-size:17px}.cex{margin-top:30px;font-weight:700;font-size:18px}.in{margin-top:8px;font-size:13px;color:#888}</style>
      </head><body>
      <div class="ey">Check-in de aula</div>
      <div class="qr-wrap"><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinLink)}" style="width:300px;height:300px"/></div>
      <h1>${lesson.name}</h1><p>${course.name}</p>
      <p class="in">Escaneie com a câmera do celular e confirme sua presença no app.</p>
      <div class="cex">Service</div>
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
      ctx.fillText(lesson.name, canvas.width / 2, img.height + pad + 38);
      ctx.fillStyle = "#555650";
      ctx.font = "500 16px Inter, sans-serif";
      ctx.fillText(course.name, canvas.width / 2, img.height + pad + 62);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `checkin-aula-${lesson.id}.png`;
      a.click();
    };
    img.onerror = () => avisar("Não consegui gerar a imagem agora.", "warn");
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(checkinLink)}`;
  };

  const toggleActive = async () => {
    const next = !qrActive;
    setQrActive(next);
    await createServiceBrowserClient().schema("service").from("course_lessons").update({ checkin_active: next }).eq("id", lesson.id);
    router.refresh();
  };

  const regenerar = async () => {
    if (!(await confirmar({ titulo: "Gerar um novo QR Code?", texto: "O anterior deixa de funcionar.", acao: "Gerar novo código", perigo: false }))) return;
    const token = generateToken();
    setQrToken(token);
    setQrActive(true);
    await createServiceBrowserClient().schema("service").from("course_lessons").update({ checkin_token: token, checkin_active: true }).eq("id", lesson.id);
    router.refresh();
  };

  const simularScan = async () => {
    const demo = matriculados.find((m) => !presentIds.has(m.id)) ?? null;
    const result = demo
      ? await registrar(demo.id, "qr", qrToken ?? undefined)
      : { ok: false, motivo: "Todos os matriculados já fizeram check-in." };
    setLanding({ person: demo, result });
  };

  return (
    <>
      <Janela larga sobretitulo="Check-in de aula" titulo={lesson.name}
        texto="QR Code único desta aula. Só quem está matriculado no curso confirma presença."
        aoFechar={onClose} corpoBloco
        cabecalho={
          <Abas rotulo="Partes do check-in" ativa={tab} aoMudar={(v) => setTab(v as typeof tab)}
            abas={[{ id: "qr", rotulo: "QR Code" }, { id: "presenca", rotulo: "Presença ao vivo", contador: presentes }]} />
        }
        rodape={<Botao variante="principal" onClick={onClose}>Concluído</Botao>}>
            {tab === "qr" && (
              <div className="ck-qr-wrap">
                <div className={`ck-qr ${!qrActive ? "off" : ""}`}>
                  {qrActive && qrToken ? (
                    <QRCode value={checkinLink} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox="0 0 200 200" />
                  ) : (
                    <div className="ck-qr-off">
                      <span style={{ fontSize: "var(--fs-app-28)" }}>✕</span>
                      <span>QR desativado</span>
                    </div>
                  )}
                </div>
                <div className="ck-qr-side">
                  <div className={`ck-status ${qrActive ? "on" : "off"}`}>
                    <span className="ck-dot" />
                    {qrActive ? "Ativo, aceitando check-ins" : "Desativado"}
                  </div>
                  <div className="ck-link"><span className="ck-link-txt">{checkinLink}</span></div>
                  <div className="ck-actions">
                    <Botao compacto onClick={salvar}>Salvar</Botao>
                    <Botao compacto onClick={imprimir}>Imprimir</Botao>
                    <Botao compacto onClick={copiar}>Copiar link</Botao>
                    <Botao compacto onClick={toggleActive}>{qrActive ? "Desativar" : "Ativar"}</Botao>
                    <Botao compacto onClick={regenerar}>Regenerar</Botao>
                  </div>
                  <div className="ck-hint">
                    Imprima e cole na entrada da sala. Quem escanear confirma presença pela conta logada.
                  </div>
                  <Botao variante="principal" style={{ marginTop: 4, justifyContent: "center" }} onClick={simularScan}>
                    Simular leitura (abrir como aluno) →
                  </Botao>
                </div>
              </div>
            )}

            {tab === "presenca" && (
              <div className="ck-presenca">
                <div className="ck-counters">
                  <div className="ck-counter"><b>{presentes}</b><span>presentes</span></div>
                  <div className="ck-counter"><b style={{ color: "var(--amber)" }}>{faltam}</b><span>não chegaram</span></div>
                  <div className="ck-counter"><b>{matriculados.length}</b><span>matriculados</span></div>
                </div>

                <div className="ck-roster">
                  {lessonAttendance.length === 0 && matriculados.length === 0 && (
                    <Vazio titulo="Ninguém matriculado neste curso ainda." />
                  )}
                  {[...lessonAttendance].sort((a, b) => a.checked_in_at.localeCompare(b.checked_in_at)).map((rec) => {
                    const m = members.find((x) => x.id === rec.member_id);
                    if (!m) return null;
                    return (
                      <div className="ck-row" key={rec.member_id}>
                        <span className="ck-check"><Icon name="ok" size={14} /></span>
                        <Avatar nome={m.name} tamanho="sm" />
                        <div className="ck-row-main">
                          <div className="ck-row-name">{m.name}</div>
                          <div className="ck-row-meta">{rec.via === "manual" ? "manual" : "QR"} · {timeCurto(rec.checked_in_at)}</div>
                        </div>
                        <BotaoIcone className="ck-undo" title="Desfazer presença" rotulo="Desfazer presença" onClick={() => remover(rec.member_id)}>✕</BotaoIcone>
                      </div>
                    );
                  })}
                  {matriculados.filter((m) => !presentIds.has(m.id)).map((m) => (
                    <div className="ck-row pend" key={m.id}>
                      <span className="ck-check pend">○</span>
                      <Avatar nome={m.name} tamanho="sm" />
                      <div className="ck-row-main">
                        <div className="ck-row-name">{m.name}</div>
                        <div className="ck-row-meta">não chegou</div>
                      </div>
                      <Botao variante="discreto" compacto onClick={() => registrar(m.id, "manual").then((r) => { if (!r.ok) avisar(r.motivo ?? "Não foi possível registrar agora.", "warn"); })}>
                        Marcar presente
                      </Botao>
                    </div>
                  ))}
                </div>

                <Botao compacto style={{ marginTop: 6 }} onClick={() => setShowManual(true)}>
                  + Registrar presença manualmente
                </Botao>
              </div>
            )}
      </Janela>

      {showManual && (
        <ManualAulaCheckinModal
          matriculados={matriculados}
          present={lessonAttendance}
          onAdd={(memberId) => { registrar(memberId, "manual").then((r) => { if (!r.ok) avisar(r.motivo ?? "Não foi possível registrar agora.", "warn"); }); }}
          onClose={() => setShowManual(false)}
        />
      )}

      {landing && (
        <AulaCheckinLanding
          courseName={course.name}
          lessonName={lesson.name}
          person={landing.person}
          result={landing.result}
          onDone={() => setLanding(null)}
        />
      )}
    </>
  );
}
