"use client";

import { Icon } from "./lib/icons";
import { htmlSeguro } from "./lib/html-seguro";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { AulaCheckinModal } from "./AulaCheckin";
import { useServiceAccess } from "./AccessContext";
import { requirementsFor, requirementLabel } from "./lib/requirements";
import { useTermos } from "./lib/vocabulario-context";

import { Botao, BotaoIcone } from "./ui/Botao";
import { Janela, Gaveta } from "./ui/Janela";
import { Selo } from "./ui/Selo";
import { Vazio } from "./ui/Estados";
import { Avatar } from "./ui/Avatar";
import { Progresso } from "./ui/Graficos";
import { useTexto } from "./lib/internacional/contexto";
import type { Text } from "./lib/internacional/mensagens";

/* ─── tipos externos (subconjunto dos tipos de ServiceExactApp) ────────── */

type CourseView = {
  id: string;
  name: string;
  kind: "trilha" | "conteudo" | "presencial" | null;
  level: string | null;
  description: string | null;
  category: string | null;
  color: string | null;
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

const courseKindLabel = (traduzirUi: Text): Record<string, string> => ({ trilha: traduzirUi("Trilha"), conteudo: traduzirUi("Conteúdo no app"), presencial: traduzirUi("Presencial") });
const lessonKindLabel = (traduzirUi: Text): Record<string, string> => ({ video: traduzirUi("Vídeo"), texto: traduzirUi("Texto"), presencial: traduzirUi("Presencial"), ao_vivo: traduzirUi("Ao vivo") });
const modalidadeLabel = (traduzirUi: Text): Record<string, string> => ({ presencial: traduzirUi("Presencial"), remoto: traduzirUi("Remoto (app)"), hibrido: traduzirUi("Híbrido"), ao_vivo: traduzirUi("Ao vivo online") });
const matTipoLabel = (traduzirUi: Text): Record<string, string> => ({ video: traduzirUi("Vídeo"), link: traduzirUi("Link / PDF"), texto: traduzirUi("Texto") });



/* ─── MatricularModal ─────────────────────────────────────────────────── */

function MatricularModal({
  members, enrolledIds, onAdd, onClose,
}: {
  members: MemberView[];
  enrolledIds: Set<string>;
  onAdd: (memberId: string) => void;
  onClose: () => void;
}) {
  const traduzirUi = useTexto();

  const [q, setQ] = useState("");
  const lista = members.filter(
    (m) => !enrolledIds.has(m.id) && (!q || m.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Janela acima sobretitulo={traduzirUi("Matrícula")} titulo={traduzirUi("Quem vai entrar no curso")} aoFechar={onClose} corpoBloco
      rodape={<Botao onClick={onClose}>{traduzirUi("Fechar")}</Botao>}>
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si" aria-hidden="true"><Icon name="buscar" size={14} /></span>
            <input
              placeholder={traduzirUi("Buscar pessoa...")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          {lista.length === 0 && (
            <Vazio titulo={q ? traduzirUi("Nenhum resultado.") : traduzirUi("Todo mundo já está matriculado.")} />
          )}
          {lista.map((m) => (
            <div
              className="flag-row"
              key={m.id}
              style={{ cursor: "pointer" }}
              onClick={() => { onAdd(m.id); onClose(); }}
            >
              <Avatar nome={m.name} tamanho="sm" />
              <div className="flag-main">
                <div className="flag-nome">{m.name}</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--muted)" }}>→</span>
            </div>
          ))}
    </Janela>
  );
}

/* ─── CursoDrawer (export principal) ────────────────────────────────────── */

export default function CursoDrawer({
  course, modules, lessons, enrollments, lessonAttendance, members, church, onClose, onEdit,
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
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const access = useServiceAccess();
  const requisitos = requirementsFor(access.requirements, "course", course.id);
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
      <Gaveta aoFechar={onClose} larga rotulo={course.name}>
        <div className="drawer-head">
          <BotaoIcone className="drawer-close" rotulo={traduzirUi("Fechar")} onClick={onClose}>✕</BotaoIcone>
          <div className="ph-eyebrow">
            {courseKindLabel(traduzirUi)[course.kind ?? "trilha"]}{course.level ? ` · ${course.level}` : ""}
          </div>
          <div className="profile-top">
            <div className="profile-name">{course.name}</div>
          </div>
          <div className="profile-role">
            {course.modalidade ? `${modalidadeLabel(traduzirUi)[course.modalidade] ?? course.modalidade} · ` : ""}
            {traduzirUi("{modulos, plural, =1 {# módulo} other {# módulos}} · {aulas, plural, =1 {# aula} other {# aulas}}", { modulos: courseModules.length, aulas: totalAulas })}
          </div>
        </div>

        <div className="drawer-body">
          {(course.divulgacao || course.materiais.length > 0) && (
            <div className="dsec" style={{ marginTop: 0 }}>
              <div className="dsec-title">{traduzirUi("Sobre o curso")}</div>
              {course.description && (
                <p style={{ color: "var(--muted)", fontSize: "var(--fs-ui-13)", lineHeight: 1.55, marginBottom: 12 }}>
                  {course.description}
                </p>
              )}
              {course.divulgacao && (
                <div
                  style={{ fontSize: "var(--fs-ui-md)", color: "var(--light)", lineHeight: 1.6, marginBottom: 12 }}
                  dangerouslySetInnerHTML={{ __html: htmlSeguro(course.divulgacao) }}
                />
              )}
              {course.materiais.map((m) => (
                <div className="mat-row" key={m.id}>
                  <span className="mat-tipo">{matTipoLabel(traduzirUi)[m.tipo] ?? m.tipo}</span>
                  <div className="mat-main">
                    <div className="mat-titulo">{m.titulo}</div>
                    {m.url && <div className="mat-url">{m.url}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {requisitos.length > 0 && (
            <div className="dsec">
              <div className="dsec-title">{traduzirUi("Pré-requisitos")}</div>
              <div className="seg-check">
                {requisitos.map((r) => <span key={`${r.kind}-${r.ref}`} className="seg-chip on">{ct(requirementLabel(r, access))}</span>)}
              </div>
            </div>
          )}

          <div className="dsec">
            <div className="dsec-title">{traduzirUi("Conteúdo · {modulos, plural, =1 {# módulo} other {# módulos}} · {aulas, plural, =1 {# aula} other {# aulas}}", { modulos: courseModules.length, aulas: totalAulas })}</div>
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
                          <span style={{ flex: 1, fontSize: "var(--fs-ui-md)" }}>{les.name}</span>
                          <span className="mat-tipo">{lessonKindLabel(traduzirUi)[les.kind ?? "video"]}</span>
                          {les.duration && <span style={{ fontSize: "var(--fs-ui-sm)", color: "var(--muted)" }}>{les.duration}</span>}
                        </div>
                        {(les.prova?.length ?? 0) > 0 && (
                          <div className="ce-prova on" style={{ cursor: "default" }}>
                            {les.min_acertos
                              ? traduzirUi("Prova · {count, plural, =1 {# pergunta} other {# perguntas}} · min. {min}", { count: les.prova?.length ?? 0, min: String(les.min_acertos) })
                              : traduzirUi("Prova · {count, plural, =1 {# pergunta} other {# perguntas}}", { count: les.prova?.length ?? 0 })}
                          </div>
                        )}
                        {comQR && (
                          <Botao compacto style={{ marginTop: 8 }} onClick={() => setQrLesson(les)}>{traduzirUi("QR de presença")}</Botao>
                        )}
                      </div>
                    );
                  })}
                  {modLessons.length === 0 && (
                    <div style={{ fontSize: "var(--fs-ui-sm)", color: "var(--muted)", padding: "4px 0" }}>{traduzirUi("Nenhuma aula neste módulo.")}</div>
                  )}
                </div>
              );
            })}
            {courseModules.length === 0 && <Vazio titulo={traduzirUi("Nenhum módulo cadastrado ainda.")} />}
          </div>

          <div className="dsec">
            <div className="dsec-title">{traduzirUi("Matriculados · {n}", { n: String(courseEnrollments.length) })}</div>
            {courseEnrollments.map((en) => {
              const m = members.find((x) => x.id === en.member_id);
              if (!m) return null;
              const pct = totalAulas ? Math.round((en.done_count / totalAulas) * 100) : 0;
              return (
                <div className="cand" key={en.id} style={{ cursor: "default" }}>
                  <Avatar nome={m.name} tamanho="sm" />
                  <div className="cand-main">
                    <div className="cand-name">{m.name}</div>
                    <Progresso pct={pct} rotulo={traduzirUi("Progresso de {nome}", { nome: m.name })} tom={en.status === "concluido" ? undefined : "pendente"} style={{ marginTop: 6 }} />
                  </div>
                  {en.status === "concluido" ? (
                    <Selo tom="ok">{traduzirUi("Concluiu")}</Selo>
                  ) : (
                    <span className="cand-fit" style={{ color: "var(--amber)" }}>{pct}%</span>
                  )}
                </div>
              );
            })}
            {courseEnrollments.length === 0 && <Vazio titulo={traduzirUi("Nenhuma matrícula ainda.")} />}
            <Botao compacto style={{ marginTop: 10 }} onClick={() => setShowMatricular(true)}>{traduzirUi("+ Matricular pessoa")}</Botao>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={onEdit}>{traduzirUi("Editar curso")}</Botao>
            <Botao onClick={onClose}>{traduzirUi("Fechar")}</Botao>
          </div>
        </div>
      </Gaveta>

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
