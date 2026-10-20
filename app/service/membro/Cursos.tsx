"use client";

import { useContext, useState } from "react";
import { Icon } from "../lib/icons";
import { formatDateBR, joinDot, todayISO } from "../lib/date";
import { plural } from "../lib/plural";
import { INSTRUCAO_QR, aulasDoCurso, proximaAula, textoDaAula, type ProximaAula } from "../lib/aulas";
import { JourneyContext, M6Row, MemberUiContext, dataLonga, mensagemAcao, useFaltas } from "./comum";
import type { BaptismClass, Course, CourseLesson, CourseModule, Enrollment, M } from "./tipos";

export function ChipSt({ status, label }: { status: "ok" | "wait" | "no"; label?: string }) {
  const cls = status === "ok" ? "chip-ok" : status === "wait" ? "chip-wait" : "chip-no";
  return <span className={`chip ${cls}`}>{label ?? status}</span>;
}


// ── aba: Cursos ───────────────────────────────────────────────────────────────

/* próxima aula do curso (v7 2.1): o que é, como concluir e, só se houver
   conteúdo para abrir, o botão. Presença de aula presencial/ao vivo é pelo QR. */
export function ProximaAulaBloco({ prox }: { prox: ProximaAula<CourseLesson> | null }) {
  const ui = useContext(MemberUiContext);
  if (!prox) return <div className="m6-meta" style={{ marginTop: 10 }}>As aulas deste curso ainda não foram publicadas.</div>;
  const { aula, n, total, abrir, porQr } = prox;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="m6-kick">Próxima aula · {n} de {total}</div>
      <div className="m6-rt">{aula.name}</div>
      <AulaQuando aula={aula} />
      {porQr ? (
        <div className="m6-meta" style={{ marginTop: 4 }}>{INSTRUCAO_QR}</div>
      ) : !abrir ? (
        <div className="m6-meta" style={{ marginTop: 4 }}>O conteúdo desta aula ainda não foi publicado.</div>
      ) : null}
      {abrir === "link" && (
        <a className="m6-btn pri full" style={{ marginTop: 12 }} href={aula.link!.trim()} target="_blank" rel="noopener noreferrer">
          <Icon name="play" size={20} />Assistir à aula
        </a>
      )}
      {abrir === "texto" && (
        <button className="m6-btn pri full" style={{ marginTop: 12 }} type="button" onClick={() => ui.sheet(<SheetAula aula={aula} n={n} total={total} porQr={porQr} />)}>
          <Icon name="documento" size={20} />{porQr ? "Ver o material da aula" : "Ler a aula"}
        </button>
      )}
    </div>
  );
}

/* dia, hora e sala da aula (0067), quando o curso informou */
export function AulaQuando({ aula }: { aula: CourseLesson }) {
  if (!aula.lesson_date && !aula.lesson_time && !aula.location) return null;
  return (
    <ul className="m6-facts">
      {(aula.lesson_date || aula.lesson_time) && <li><Icon name="agenda" size={20} /><span>{joinDot(dataLonga(aula.lesson_date), aula.lesson_time)}</span></li>}
      {aula.location && <li><Icon name="mapapin" size={20} /><span>{aula.location}</span></li>}
    </ul>
  );
}

/* aulas com data dos cursos em andamento, na Minha agenda (v7 2.2, 4.5) */
export function minhasAulas(member: M | null, courses: Course[], enrollments: Enrollment[], courseModules: CourseModule[], courseLessons: CourseLesson[]) {
  if (!member) return [];
  const hoje = todayISO();
  return enrollments
    .filter((e) => e.member_id === member.id && e.status !== "concluido")
    .flatMap((e) => {
      const curso = courses.find((c) => c.id === e.course_id);
      return curso ? aulasDoCurso(curso.id, courseModules, courseLessons).map((aula) => ({ aula, curso })) : [];
    })
    .filter(({ aula }) => (aula.kind === "presencial" || aula.kind === "ao_vivo") && !!aula.lesson_date && aula.lesson_date >= hoje);
}

export function SheetAula({ aula, n, total, porQr }: { aula: CourseLesson; n: number; total: number; porQr: boolean }) {
  return (
    <div>
      <div className="m6-kick">Aula {n} de {total}</div>
      <h2 className="m6-sh">{aula.name}</h2>
      <p className="m6-txt" style={{ whiteSpace: "pre-wrap" }}>{textoDaAula(aula.conteudo)}</p>
      {porQr && <div className="m6-meta">{INSTRUCAO_QR}</div>}
    </div>
  );
}

export function TabCursos({
  member, courses, enrollments, courseModules, courseLessons,
}: {
  member: M | null;
  courses: Course[];
  enrollments: Enrollment[];
  courseModules: CourseModule[];
  courseLessons: CourseLesson[];
}) {
  const myEnrollments = member ? enrollments.filter((e) => e.member_id === member.id) : [];
  const enrolledIds = new Set(myEnrollments.map((e) => e.course_id));
  const toExplore = courses.filter((c) => !enrolledIds.has(c.id));

  return (
    <>

      <div className="m-section-t">Meus cursos · {myEnrollments.length}</div>
      {myEnrollments.map((en) => {
        const course = courses.find((c) => c.id === en.course_id);
        if (!course) return null;
        const courseModuleIds = new Set(courseModules.filter((m) => m.course_id === course.id).map((m) => m.id));
        const totalAulas = courseLessons.filter((l) => courseModuleIds.has(l.module_id)).length;
        const pct = totalAulas ? Math.min(100, Math.round((en.done_count / totalAulas) * 100)) : 0;
        return (
          <div className="m-card" key={en.id}>
            <div className="m-card-top">
              <span className="m-when">{course.level ?? "Curso"}</span>
              {en.status === "concluido" ? (
                <ChipSt status="ok" label="Concluído" />
              ) : (
                <span className="m-when" style={{ color: "var(--amber)" }}>{pct}%</span>
              )}
            </div>
            <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{course.name}</div>
            <div className="bar" style={{ marginTop: 10 }}>
              <div className={`bar-fill ${en.status === "concluido" ? "" : "amber"}`} style={{ width: `${pct}%` }} />
            </div>
            {en.status !== "concluido" && <ProximaAulaBloco prox={proximaAula(course.id, en.done_count, courseModules, courseLessons)} />}
          </div>
        );
      })}

      {toExplore.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Explorar</div>
          {toExplore.map((c) => (
            <div className="m-card" key={c.id}>
              <div className="m-when" style={{ marginBottom: 6 }}>{c.level ?? "Curso"}</div>
              <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{c.name}</div>
              {c.description && (
                <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", lineHeight: 1.5, marginTop: 6 }}>
                  {c.description}
                </div>
              )}
              <CursoInscricao courseId={c.id} />
            </div>
          ))}
        </>
      )}
    </>
  );
}

/* Inscrição de verdade (service.enroll_me): com pré-requisito faltando, mostra
   o que falta em vez do botão */
export function CursoInscricao({ courseId }: { courseId: string }) {
  const j = useContext(JourneyContext);
  const faltas = useFaltas()("course", courseId);
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | string>("");
  if (faltas.length > 0) {
    return (
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
        <b style={{ color: "var(--light)" }}>Para se inscrever:</b> {faltas.join(" · ")}
      </div>
    );
  }
  if (estado === "ok") return <div className="m-confirmed" style={{ marginTop: 12 }}><Icon name="ok" size={15} /> Inscrição feita. O curso aparece em Meus cursos.</div>;
  return (
    <>
      <button
        className="m-btn m-btn-ok ghost"
        style={{ width: "100%", marginTop: 12 }}
        disabled={estado === "enviando" || !j.onEnrollCourse}
        onClick={async () => {
          if (!j.onEnrollCourse) return;
          setEstado("enviando");
          const r = await j.onEnrollCourse(courseId);
          setEstado(r === "ok" ? "ok" : mensagemAcao(r));
        }}
      >
        {estado === "enviando" ? "Inscrevendo..." : "Inscrever-se"}
      </button>
      {estado && estado !== "enviando" && estado !== "ok" && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 6 }}>{estado}</div>}
    </>
  );
}

// ── aba: Batismo ──────────────────────────────────────────────────────────────

export function TabBatismo({ baptismClasses, memberId }: { baptismClasses: BaptismClass[]; memberId: string | null }) {
  /* inscrição de verdade (service.request_baptism): antes só mudava a tela */
  const j = useContext(JourneyContext);
  const [inscrito, setInscrito] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(j.baptismCandidates.filter((c) => memberId && c.member_id === memberId).map((c) => [c.class_id, true])),
  );
  const [erro, setErro] = useState<Record<string, string>>({});
  const openClasses = baptismClasses.filter((b) => b.status !== "concluida");

  return (
    <>
      <div className="m-section-t">Próximos batismos</div>
      {openClasses.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>Nenhuma turma agendada por ora.</div>
        </div>
      )}
      {openClasses.map((b) => (
        <div className="m-card" key={b.id}>
          <div className="m-card-top">
            <span className="m-when">{formatDateBR(b.baptism_date) || "A definir"}</span>
            {b.open_enrollment ? (
              <ChipSt status="ok" label="Inscrições abertas" />
            ) : (
              <ChipSt status="wait" label="Em preparação" />
            )}
          </div>
          <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{b.label}</div>
          {(b.location || b.pastor) && (
            <div className="m-fn">
              {[b.location, b.pastor].filter(Boolean).join(" · ")}
            </div>
          )}
          {b.open_enrollment ? (
            inscrito[b.id] ? (
              <div className="m-confirmed" style={{ marginTop: 12 }}>
                <Icon name="ok" size={15} /> Inscrição enviada! O responsável vai te chamar.
              </div>
            ) : (
              <button
                className="m-btn m-btn-ok"
                style={{ width: "100%", marginTop: 12 }}
                disabled={!j.onRequestBaptism}
                onClick={async () => {
                  if (!j.onRequestBaptism) return;
                  const r = await j.onRequestBaptism(b.id);
                  if (r === "ok") setInscrito((p) => ({ ...p, [b.id]: true }));
                  else setErro((p) => ({ ...p, [b.id]: mensagemAcao(r) }));
                }}
              >
                Quero me inscrever →
              </button>
            )
          ) : (
            <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 12 }}>
              Inscrições ainda não abertas para esta turma.
            </div>
          )}
          {erro[b.id] && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 8 }}>{erro[b.id]}</div>}
        </div>
      ))}
    </>
  );
}

/* cursos em andamento, disponíveis (sem os já cumpridos) e concluídos */
export function CursosResumo({ member, courses, enrollments, courseModules, courseLessons }: { member: M | null; courses: Course[]; enrollments: Enrollment[]; courseModules: CourseModule[]; courseLessons: CourseLesson[] }) {
  const ui = useContext(MemberUiContext);
  const meus = member ? enrollments.filter((e) => e.member_id === member.id) : [];
  const andando = meus.find((e) => e.status !== "concluido");
  const feitos = meus.filter((e) => e.status === "concluido").length;
  const disponiveis = courses.filter((c) => !meus.some((e) => e.course_id === c.id));
  const curso = andando ? courses.find((c) => c.id === andando.course_id) : undefined;
  const total = curso ? courseLessons.filter((l) => courseModules.some((m) => m.id === l.module_id && m.course_id === curso.id)).length : 0;
  const pct = andando && total ? Math.min(100, Math.round((andando.done_count / total) * 100)) : 0;
  return (
    <>
      {curso && andando && (
        <div className="m6-card">
          <div className="m6-kick">Em andamento</div>
          <div className="m6-ct">{curso.name}</div>
          {total > 0 && <div className="m6-meta">{andando.done_count} de {plural(total, "aula")}</div>}
          {(() => {
            const prox = proximaAula(curso.id, andando.done_count, courseModules, courseLessons);
            return prox ? <div className="m6-meta">Próxima aula: {prox.aula.name}</div> : null;
          })()}
          <div className="m6-prog"><i style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      <div className="m6-list">
        {disponiveis.slice(0, 3).map((c) => <M6Row key={c.id} ic="cursos" t={c.name} s={c.level ?? c.description ?? undefined} onClick={() => ui.go("caminhada", "cursos")} />)}
        {feitos > 0 && <M6Row ic="ok" t={`Concluídos · ${feitos}`} onClick={() => ui.go("caminhada", "cursos")} />}
        {disponiveis.length === 0 && feitos === 0 && !curso && <div className="m6-row"><span className="m6-rb"><span className="m6-rs">Os cursos da igreja aparecem aqui quando forem publicados.</span></span></div>}
      </div>
    </>
  );
}
