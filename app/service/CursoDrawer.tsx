"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { AulaCheckinModal } from "./AulaCheckin";

/* ─── tipos externos (subconjunto dos tipos de ServiceExactApp) ────────── */

type CourseView = {
  id: string;
  name: string;
  kind: "trilha" | "conteudo" | "presencial" | null;
  level: string | null;
  description: string | null;
  category: string | null;
  color: string | null;
  prereqs: string[];
  divulgacao: string | null;
  materiais: Array<{ id: string; tipo: string; titulo: string; url: string }>;
  modalidade: string | null;
};

type ModuleView = { id: string; course_id: string; name: string; sort_order: number };

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

type LessonAttendanceView = {
  id: string;
  course_id: string;
  lesson_id: string;
  member_id: string;
  checked_in_at: string;
  via: "qr" | "manual";
};

type MemberView = { id: string; name: string; journey?: number[] };

/* ─── helpers ─────────────────────────────────────────────────────────── */

const COURSE_KIND_LABEL: Record<string, string> = { trilha: "Trilha", conteudo: "Conteúdo no app", presencial: "Presencial" };
const LESSON_KIND_LABEL: Record<string, string> = { video: "Vídeo", texto: "Texto", presencial: "Presencial", ao_vivo: "Ao vivo" };
const MODALIDADE_LABEL: Record<string, string> = { presencial: "Presencial", remoto: "Remoto (app)", hibrido: "Híbrido", ao_vivo: "Ao vivo online" };
const MAT_TIPO_LABEL: Record<string, string> = { video: "Vídeo", link: "Link / PDF", texto: "Texto" };

function ini(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Av({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  return <div className={`av av-${size}`}>{ini(name)}</div>;
}

/* ─── MatricularModal ─────────────────────────────────────────────────── */

function MatricularModal({
  members, enrolledIds, onAdd, onClose,
}: {
  members: MemberView[];
  enrolledIds: Set<string>;
  onAdd: (memberId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const lista = members.filter(
    (m) => !enrolledIds.has(m.id) && (!q || m.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="modal-bg" style={{ zIndex: 80 }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Matrícula</div>
          <div className="modal-title">Quem vai entrar no curso</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si">🔍</span>
            <input
              placeholder="Buscar pessoa..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          {lista.length === 0 && (
            <div className="empty">{q ? "Nenhum resultado." : "Todo mundo já está matriculado."}</div>
          )}
          {lista.map((m) => (
            <div
              className="flag-row"
              key={m.id}
              style={{ cursor: "pointer" }}
              onClick={() => { onAdd(m.id); onClose(); }}
            >
              <Av name={m.name} size="sm" />
              <div className="flag-main">
                <div className="flag-nome">{m.name}</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--subtle)" }}>→</span>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── CursoDrawer (export principal) ────────────────────────────────────── */

export default function CursoDrawer({
  course, allCourses, modules, lessons, enrollments, lessonAttendance, members, church, onClose, onEdit,
}: {
  course: CourseView;
  allCourses: CourseView[];
  modules: ModuleView[];
  lessons: LessonView[];
  enrollments: EnrollmentView[];
  lessonAttendance: LessonAttendanceView[];
  members: MemberView[];
  church: { id: string; organizationId: string };
  onClose: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [showMatricular, setShowMatricular] = useState(false);
  const [qrLesson, setQrLesson] = useState<LessonView | null>(null);

  const courseModules = modules
    .filter((m) => m.course_id === course.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const moduleIds = new Set(courseModules.map((m) => m.id));
  const courseLessons = lessons.filter((l) => moduleIds.has(l.module_id));
  const courseLessonIds = courseLessons.map((l) => l.id);
  const totalAulas = courseLessons.length;
  const courseAttendance = lessonAttendance.filter((a) => a.course_id === course.id);
  const courseEnrollments = enrollments.filter((e) => e.course_id === course.id);
  const enrolledIds = new Set(courseEnrollments.map((e) => e.member_id));

  const matricular = async (memberId: string) => {
    await supabase.schema("service").from("enrollments").insert({
      organization_id: church.organizationId,
      course_id: course.id,
      member_id: memberId,
      done_count: 0,
      status: "cursando",
    });
    router.refresh();
  };

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" type="button" onClick={onClose}>✕</button>
          <div className="ph-eyebrow">
            {COURSE_KIND_LABEL[course.kind ?? "trilha"]}{course.level ? ` · ${course.level}` : ""}
          </div>
          <div className="profile-top">
            <div className="profile-name">{course.name}</div>
          </div>
          <div className="profile-role">
            {course.modalidade ? `${MODALIDADE_LABEL[course.modalidade] ?? course.modalidade} · ` : ""}
            {courseModules.length} módulo(s) · {totalAulas} aula(s)
          </div>
        </div>

        <div className="drawer-body">
          {(course.divulgacao || course.materiais.length > 0) && (
            <div className="dsec" style={{ marginTop: 0 }}>
              <div className="dsec-title">Sobre o curso</div>
              {course.description && (
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>
                  {course.description}
                </p>
              )}
              {course.divulgacao && (
                <div
                  style={{ fontSize: 13.5, color: "var(--light)", lineHeight: 1.6, marginBottom: 12 }}
                  dangerouslySetInnerHTML={{ __html: course.divulgacao }}
                />
              )}
              {course.materiais.map((m) => (
                <div className="mat-row" key={m.id}>
                  <span className="mat-tipo">{MAT_TIPO_LABEL[m.tipo] ?? m.tipo}</span>
                  <div className="mat-main">
                    <div className="mat-titulo">{m.titulo}</div>
                    {m.url && <div className="mat-url">{m.url}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {course.prereqs.length > 0 && (
            <div className="dsec">
              <div className="dsec-title">Pré-requisitos</div>
              <div className="seg-check">
                {course.prereqs.map((id) => {
                  const c = allCourses.find((x) => x.id === id);
                  return c ? <span key={id} className="seg-chip on">{c.name}</span> : null;
                })}
              </div>
            </div>
          )}

          <div className="dsec">
            <div className="dsec-title">Conteúdo · {courseModules.length} módulo(s) · {totalAulas} aula(s)</div>
            {courseModules.map((mod, mi) => {
              const modLessons = courseLessons
                .filter((l) => l.module_id === mod.id)
                .sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div className="ce-mod" key={mod.id}>
                  <div className="ce-mod-head">
                    <span className="ce-mod-n">{String(mi + 1).padStart(2, "0")}</span>
                    <div className="ce-mod-name" style={{ flex: 1 }}>{mod.name}</div>
                  </div>
                  {modLessons.map((les) => {
                    const comQR = les.kind === "presencial" || les.kind === "ao_vivo";
                    return (
                      <div className="ce-aula" key={les.id}>
                        <div className="ce-aula-row">
                          <span style={{ flex: 1, fontSize: 13.5 }}>{les.name}</span>
                          <span className="mat-tipo">{LESSON_KIND_LABEL[les.kind ?? "video"]}</span>
                          {les.duration && <span style={{ fontSize: 11, color: "var(--muted)" }}>{les.duration}</span>}
                        </div>
                        {(les.prova?.length ?? 0) > 0 && (
                          <div className="ce-prova on" style={{ cursor: "default" }}>
                            ◆ Prova · {les.prova?.length} pergunta(s){les.min_acertos ? ` · min. ${les.min_acertos}` : ""}
                          </div>
                        )}
                        {comQR && (
                          <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 8 }} onClick={() => setQrLesson(les)}>
                            QR de presença
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {modLessons.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--subtle)", padding: "4px 0" }}>Nenhuma aula neste módulo.</div>
                  )}
                </div>
              );
            })}
            {courseModules.length === 0 && <div className="empty">Nenhum módulo cadastrado ainda.</div>}
          </div>

          <div className="dsec">
            <div className="dsec-title">Matriculados · {courseEnrollments.length}</div>
            {courseEnrollments.map((en) => {
              const m = members.find((x) => x.id === en.member_id);
              if (!m) return null;
              const pct = totalAulas ? Math.round((en.done_count / totalAulas) * 100) : 0;
              return (
                <div className="cand" key={en.id} style={{ cursor: "default" }}>
                  <Av name={m.name} size="sm" />
                  <div className="cand-main">
                    <div className="cand-name">{m.name}</div>
                    <div className="bar" style={{ marginTop: 6 }}>
                      <div className={`bar-fill ${en.status === "concluido" ? "" : "amber"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {en.status === "concluido" ? (
                    <span className="chip chip-ok">Concluiu</span>
                  ) : (
                    <span className="cand-fit" style={{ color: "var(--amber)" }}>{pct}%</span>
                  )}
                </div>
              );
            })}
            {courseEnrollments.length === 0 && <div className="empty">Nenhuma matrícula ainda.</div>}
            <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 10 }} onClick={() => setShowMatricular(true)}>
              + Matricular pessoa
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} type="button" onClick={onEdit}>
              Editar curso
            </button>
            <button className="btn btn-sec" type="button" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>

      {showMatricular && (
        <MatricularModal
          members={members}
          enrolledIds={enrolledIds}
          onAdd={matricular}
          onClose={() => setShowMatricular(false)}
        />
      )}

      {qrLesson && (
        <AulaCheckinModal
          course={{ id: course.id, name: course.name }}
          lesson={qrLesson}
          church={church}
          totalAulas={totalAulas}
          courseLessonIds={courseLessonIds}
          enrollments={courseEnrollments}
          members={members}
          attendance={courseAttendance}
          onClose={() => setQrLesson(null)}
        />
      )}
    </>
  );
}
