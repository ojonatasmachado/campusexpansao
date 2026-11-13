
"use client";

import { useContext, useState } from "react";
import { Icon } from "../lib/icons";
import { formatDateBR, joinDot, todayISO } from "../lib/date";
import { INSTRUCAO_QR, aulasDoCurso, proximaAula, textoDaAula, type ProximaAula } from "../lib/aulas";
import { JourneyContext, M6Row, MemberUiContext, dataLonga, mensagemAcao, useFaltas } from "./comum";
import type { BaptismClass, Course, CourseLesson, CourseModule, Enrollment, M } from "./tipos";

import { Botao, botaoClasse } from "../ui/Botao";
import { Selo, tomDaClasse } from "../ui/Selo";
import { Cartao } from "../ui/Cartao";
import { Linha, Lista } from "../ui/Linha";
import { Progresso } from "../ui/Graficos";
import { useServiceLocale, useTexto } from "../lib/internacional/contexto";

export function ChipSt({ status, label }: { status: "ok" | "wait" | "no"; label?: string }) {
  const cls = status === "ok" ? "chip-ok" : status === "wait" ? "chip-wait" : "chip-no";
  return <Selo tom={tomDaClasse(cls)}>{label ?? status}</Selo>;
}


// ── aba: Cursos ───────────────────────────────────────────────────────────────

/* próxima aula do curso (v7 2.1): o que é, como concluir e, só se houver
   conteúdo para abrir, o botão. Presença de aula presencial/ao vivo é pelo QR. */
export function ProximaAulaBloco({ prox }: { prox: ProximaAula<CourseLesson> | null }) {
  const traduzirUi = useTexto();
  const ui = useContext(MemberUiContext);
  if (!prox) return <div className="m6-meta" style={{ marginTop: 10 }}>{traduzirUi("As aulas deste curso ainda não foram publicadas.")}</div>;
  const { aula, n, total, abrir, porQr } = prox;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="m6-kick">{traduzirUi("Próxima aula · {n} de {total}", { n: String(n), total: String(total) })}</div>
      <div className="m6-rt">{aula.name}</div>
      <AulaQuando aula={aula} />
      {porQr ? (
        <div className="m6-meta" style={{ marginTop: 4 }}>{INSTRUCAO_QR}</div>
      ) : !abrir ? (
        <div className="m6-meta" style={{ marginTop: 4 }}>{traduzirUi("O conteúdo desta aula ainda não foi publicado.")}</div>
      ) : null}
      {abrir === "link" && (
        <a className={botaoClasse({ tamanho: "toque", variante: "principal", largo: true })} style={{ marginTop: 12 }} href={aula.link!.trim()} target="_blank" rel="noopener noreferrer">
          <Icon name="play" size={20} />{traduzirUi("Assistir à aula")}
        </a>
      )}
      {abrir === "texto" && (
        <Botao tamanho="toque" variante="principal" largo style={{ marginTop: 12 }} onClick={() => ui.sheet(<SheetAula aula={aula} n={n} total={total} porQr={porQr} />)}>
          <Icon name="documento" size={20} />{porQr ? traduzirUi("Ver o material da aula") : traduzirUi("Ler a aula")}
        </Botao>
      )}
    </div>
  );
}

/* dia, hora e sala da aula (0067), quando o curso informou */
export function AulaQuando({ aula }: { aula: CourseLesson }) {
  const locale = useServiceLocale();
  if (!aula.lesson_date && !aula.lesson_time && !aula.location) return null;
  return (
    <ul className="m6-facts">
      {(aula.lesson_date || aula.lesson_time) && <li><Icon name="agenda" size={20} /><span>{joinDot(dataLonga(aula.lesson_date, locale), aula.lesson_time)}</span></li>}
      {aula.location && <li><Icon name="mapapin" size={20} /><span>{aula.location}</span></li>}
    </ul>
  );
}

/* aulas com data dos cursos em andamento, na Minha agenda (v7 2.2, 4.5) */
export function minhasAulas(member: M | null, courses: Course[], enrollments: Enrollment[], courseModules: CourseModule[], courseLessons: CourseLesson[], hoje = todayISO()) {
  if (!member) return [];
  return enrollments
    .filter((e) => e.member_id === member.id && e.status !== "concluido")
    .flatMap((e) => {
      const curso = courses.find((c) => c.id === e.course_id);
      return curso ? aulasDoCurso(curso.id, courseModules, courseLessons).map((aula) => ({ aula, curso })) : [];
    })
    .filter(({ aula }) => (aula.kind === "presencial" || aula.kind === "ao_vivo") && !!aula.lesson_date && aula.lesson_date >= hoje);
}

export function SheetAula({ aula, n, total, porQr }: { aula: CourseLesson; n: number; total: number; porQr: boolean }) {
  const traduzirUi = useTexto();
  return (
    <div>
      <div className="m6-kick">{traduzirUi("Aula {n} de {total}", { n: String(n), total: String(total) })}</div>
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
  const traduzirUi = useTexto();
  const myEnrollments = member ? enrollments.filter((e) => e.member_id === member.id) : [];
  const enrolledIds = new Set(myEnrollments.map((e) => e.course_id));
  const toExplore = courses.filter((c) => !enrolledIds.has(c.id));

  return (
    <>

      {myEnrollments.length === 0 && toExplore.length === 0 ? (
        <Cartao estilo="app"><div className="m6-ct">{traduzirUi("Nenhum curso publicado por enquanto")}</div><p className="m6-txt">{traduzirUi("Quando a igreja disponibilizar um curso, você poderá conhecê-lo e acompanhar suas aulas aqui.")}</p></Cartao>
      ) : myEnrollments.length > 0 ? <div className="m-section-t">{traduzirUi("Meus cursos · {n}", { n: String(myEnrollments.length) })}</div> : null}
      {myEnrollments.map((en) => {
        const course = courses.find((c) => c.id === en.course_id);
        if (!course) return null;
        const courseModuleIds = new Set(courseModules.filter((m) => m.course_id === course.id).map((m) => m.id));
        const totalAulas = courseLessons.filter((l) => courseModuleIds.has(l.module_id)).length;
        const pct = totalAulas ? Math.min(100, Math.round((en.done_count / totalAulas) * 100)) : 0;
        return (
          <Cartao estilo="app-solto" key={en.id}>
            <div className="m-card-top">
              <span className="m-when">{course.level ?? traduzirUi("Curso")}</span>
              {en.status === "concluido" ? (
                <ChipSt status="ok" label={traduzirUi("Concluído")} />
              ) : (
                <span className="m-when" style={{ color: "var(--amber)" }}>{pct}%</span>
              )}
            </div>
            <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{course.name}</div>
            <Progresso pct={pct} rotulo={traduzirUi("Seu progresso em {curso}", { curso: course.name })} tom={en.status === "concluido" ? undefined : "pendente"} style={{ marginTop: 10 }} />
            {en.status !== "concluido" && <ProximaAulaBloco prox={proximaAula(course.id, en.done_count, courseModules, courseLessons)} />}
          </Cartao>
        );
      })}

      {toExplore.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>{traduzirUi("Explorar")}</div>
          {toExplore.map((c) => (
            <Cartao estilo="app-solto" key={c.id}>
              <div className="m-when" style={{ marginBottom: 6 }}>{c.level ?? traduzirUi("Curso")}</div>
              <div className="m-culto" style={{ fontSize: "var(--fs-app-17)" }}>{c.name}</div>
              {c.description && (
                <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", lineHeight: 1.5, marginTop: 6 }}>
                  {c.description}
                </div>
              )}
              <CursoInscricao courseId={c.id} />
            </Cartao>
          ))}
        </>
      )}
    </>
  );
}

/* Inscrição de verdade (service.enroll_me): com pré-requisito faltando, mostra
   o que falta em vez do botão */
export function CursoInscricao({ courseId }: { courseId: string }) {
  const traduzirUi = useTexto();
  const j = useContext(JourneyContext);
  const faltas = useFaltas()("course", courseId);
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | string>("");
  if (faltas.length > 0) {
    return (
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
        <b style={{ color: "var(--light)" }}>{traduzirUi("Para se inscrever:")}</b> {faltas.join(" · ")}
      </div>
    );
  }
  if (estado === "ok") return <div className="m-confirmed" style={{ marginTop: 12 }}><Icon name="ok" size={15} /> {traduzirUi("Inscrição feita. O curso aparece em Meus cursos.")}</div>;
  return (
    <>
      <Botao
        tamanho="toque" variante="secundario" largo
        style={{ width: "100%", marginTop: 12 }}
        desativado={estado === "enviando" || !j.onEnrollCourse}
        onClick={async () => {
          if (!j.onEnrollCourse) return;
          setEstado("enviando");
          const r = await j.onEnrollCourse(courseId);
          setEstado(r === "ok" ? "ok" : mensagemAcao(r, traduzirUi));
        }}
      >
        {estado === "enviando" ? traduzirUi("Inscrevendo...") : traduzirUi("Inscrever-se")}
      </Botao>
      {estado && estado !== "enviando" && estado !== "ok" && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 6 }}>{estado}</div>}
    </>
  );
}

// ── aba: Batismo ──────────────────────────────────────────────────────────────

export function TabBatismo({ baptismClasses, memberId }: { baptismClasses: BaptismClass[]; memberId: string | null }) {
  const traduzirUi = useTexto();
  /* inscrição de verdade (service.request_baptism): antes só mudava a tela */
  const j = useContext(JourneyContext);
  const [inscrito, setInscrito] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(j.baptismCandidates.filter((c) => memberId && c.member_id === memberId).map((c) => [c.class_id, true])),
  );
  const [erro, setErro] = useState<Record<string, string>>({});
  const openClasses = baptismClasses.filter((b) => b.status !== "concluida");

  return (
    <>
      <div className="m-section-t">{traduzirUi("Próximos batismos")}</div>
      {openClasses.length === 0 && (
        <Cartao estilo="app-solto">
          <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>{traduzirUi("Nenhuma turma agendada por ora.")}</div>
        </Cartao>
      )}
      {openClasses.map((b) => (
        <Cartao estilo="app-solto" key={b.id}>
          <div className="m-card-top">
            <span className="m-when">{formatDateBR(b.baptism_date) || traduzirUi("A definir")}</span>
            {b.open_enrollment ? (
              <ChipSt status="ok" label={traduzirUi("Inscrições abertas")} />
            ) : (
              <ChipSt status="wait" label={traduzirUi("Em preparação")} />
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
                <Icon name="ok" size={15} /> {traduzirUi("Inscrição enviada! O responsável vai te chamar.")}
              </div>
            ) : (
              <Botao
                tamanho="toque" variante="principal" largo
                style={{ width: "100%", marginTop: 12 }}
                desativado={!j.onRequestBaptism}
                onClick={async () => {
                  if (!j.onRequestBaptism) return;
                  const r = await j.onRequestBaptism(b.id);
                  if (r === "ok") setInscrito((p) => ({ ...p, [b.id]: true }));
                  else setErro((p) => ({ ...p, [b.id]: mensagemAcao(r, traduzirUi) }));
                }}
              >{traduzirUi("Quero me inscrever")}</Botao>
            )
          ) : (
            <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 12 }}>{traduzirUi("Inscrições ainda não abertas para esta turma.")}</div>
          )}
          {erro[b.id] && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 8 }}>{erro[b.id]}</div>}
        </Cartao>
      ))}
    </>
  );
}

/* cursos em andamento, disponíveis (sem os já cumpridos) e concluídos */
export function CursosResumo({ member, courses, enrollments, courseModules, courseLessons }: { member: M | null; courses: Course[]; enrollments: Enrollment[]; courseModules: CourseModule[]; courseLessons: CourseLesson[] }) {
  const traduzirUi = useTexto();
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
        <Cartao estilo="app">
          <div className="m6-kick">{traduzirUi("Em andamento")}</div>
          <div className="m6-ct">{curso.name}</div>
          {total > 0 && <div className="m6-meta">{traduzirUi("{count, plural, =1 {{feitas} de # aula} other {{feitas} de # aulas}}", { count: total, feitas: String(andando.done_count) })}</div>}
          {(() => {
            const prox = proximaAula(curso.id, andando.done_count, courseModules, courseLessons);
            return prox ? <div className="m6-meta">{traduzirUi("Próxima aula: {aula}", { aula: prox.aula.name })}</div> : null;
          })()}
          {total > 0 ? <div className="m6-prog"><i style={{ width: `${pct}%` }} /></div> : <div className="m6-meta">{traduzirUi("As aulas ainda não foram publicadas.")}</div>}
          <Botao tamanho="toque" largo style={{ marginTop: 12 }} onClick={() => ui.go("caminhada", "cursos")}>{traduzirUi("Abrir meu curso")}</Botao>
        </Cartao>
      )}
      <Lista>
        {disponiveis.slice(0, 3).map((c) => <M6Row key={c.id} ic="cursos" t={c.name} s={c.level ?? c.description ?? undefined} onClick={() => ui.go("caminhada", "cursos")} />)}
        {feitos > 0 && <M6Row ic="ok" t={traduzirUi("Concluídos · {n}", { n: String(feitos) })} onClick={() => ui.go("caminhada", "cursos")} />}
        {disponiveis.length === 0 && feitos === 0 && !curso && <Linha estilo="app"><span className="m6-rb"><span className="m6-rs">{traduzirUi("Os cursos da igreja aparecem aqui quando forem publicados.")}</span></span></Linha>}
      </Lista>
    </>
  );
}
