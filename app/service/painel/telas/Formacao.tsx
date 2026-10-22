"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot } from "../../lib/date";

import { useTermos } from "../../lib/vocabulario-context";
import CursoEditor from "../../CursoEditor";
import CursoDrawer from "../../CursoDrawer";
import { useServiceAccess } from "../../AccessContext";
import { requirementsFor, requirementLabel } from "../../lib/requirements";
import { Av, Chip, EmptyState, PageHead } from "../ui";
import { BAT_ST_MAP, Kpi, OUTRO_LOCAL } from "../comum";
import type { BaptismCandidateView, BaptismClassView, ChurchView, CourseView, DecisionView, DrawerState, EnrollmentView, LessonAttendanceView, LessonView, MemberView, ModalState, ModuleView, PersonView, RoomView } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Selo, tomDaClasse } from "../../ui/Selo";
import { Segmentado } from "../../ui/Segmentado";
export function Decisoes({
  decisions,
  members,
  people,
  setDrawer,
  setModal,
}: {
  decisions: DecisionView[];
  members: MemberView[];
  people: PersonView[];
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
}) {
  const { comTermos: ct } = useTermos();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"todas" | "novo" | "acompanhando" | "encaminhado">("todas");
  const personById = new Map(people.map((person) => [person.id, person]));
  const newDecisions = decisions.filter((d) => d.status === "novo");
  const following = decisions.filter((d) => d.status === "acompanhando");
  const forwarded = decisions.filter((d) => d.status === "encaminhado");
  const visible = decisions.filter((d) => {
    const matchQ = !q || d.name.toLowerCase().includes(q.toLowerCase()) || (d.phone ?? "").includes(q);
    const matchF = f === "todas" || d.status === f;
    return matchQ && matchF;
  });
  return (
    <div className="content wide">
      <PageHead
        title="Decisões por Jesus"
        eyebrow={ct("{Caminhada}")}
        help={ct("Todo mundo que decidiu por Jesus ou se reconciliou num {culto}. A decisão inicia a {caminhada} da pessoa até o batismo.")}
        action={<Botao variante="principal" onClick={() => setModal({ eyebrow: "Criar", title: "Nova decisão", subtitle: ct("Registre quem decidiu, o {culto} e quem fará o acompanhamento."), saveLabel: "Registrar decisão", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"Quem decidiu" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"culto", label:ct("{Culto}"), type:"text", half:true, ph:ct("ex: {Culto} da Manhã") }, { k:"responsavel", label:"Responsável pelo acompanhamento", type:"text", ph:"Quem vai acompanhar" }], action: { kind: "decision" } })}>+ Registrar decisão</Botao>}
      />
      <div className="kpi-row">
        <Kpi icon="visitante" label="Decisões no mês" value={decisions.length} foot={ct("registradas na {caminhada}")} help="Quantas decisões por Jesus ou reconciliações foram registradas neste mês." />
        <Kpi icon="config" label="A contatar" value={newDecisions.length} foot="aguardando primeiro contato" amber help="Decisões novas que ainda não tiveram o primeiro contato da equipe de acompanhamento." />
        <Kpi icon="pessoa" label="Em acompanhamento" value={following.length} foot="discipulado em andamento" help="Quem já foi contatado e está no meio do discipulado inicial." />
        <Kpi icon="relatorios" label="Encaminhados" value={forwarded.length} foot="já viraram membros" help="Decisões que já completaram o caminho e viraram membros da igreja." />
      </div>
      <div className="toolbar">
        <div className="tb-search">
          <span className="si"><Icon name="buscar" size={13} /></span>
          <input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmentado>
          <Opcao marcada={f === "todas"} onClick={() => setF("todas")}>Todas</Opcao>
          <Opcao marcada={f === "novo"} onClick={() => setF("novo")}>A contatar</Opcao>
          <Opcao marcada={f === "acompanhando"} onClick={() => setF("acompanhando")}>Acompanhando</Opcao>
          <Opcao marcada={f === "encaminhado"} onClick={() => setF("encaminhado")}>Encaminhados</Opcao>
        </Segmentado>
        <div className="tb-spacer" />
        <span className="panel-meta">{visible.length} de {decisions.length} decisões</span>
      </div>
      <div className="tbl">
        <Linha estilo="tabela" className="head" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 130px" }}><span>Pessoa</span><span>{ct("Quando & {culto}")}</span><span>Responsável</span><span>Situação</span></Linha>
        {visible.map((decision) => {
          const responsible = decision.responsible_id ? personById.get(decision.responsible_id) : null;
          return (
            <Acao className={`${linhaClasse({ estilo: "tabela" })} click`} key={decision.id} style={{ gridTemplateColumns: "1.5fr 1fr 1fr 130px" }} onClick={() => setDrawer({ kind: "decision", id: decision.id })}>
              <div className="cell-person"><Av name={decision.name} size="md" /><div><div className="cell-name">{decision.name} <Selo tom="ok" style={{ marginLeft: 6, transform: "scale(0.92)" }}>{decision.kind === "reconciliacao" ? "Reconciliação" : "Decisão"}</Selo></div><div className="cell-sub">{decision.phone}</div></div></div>
              <div><div style={{ fontSize: "var(--fs-pn-13)", color: "var(--light)" }}>{formatDateBR(decision.happened_on)}</div><div className="cell-sub">{decision.service_name || ct("{Culto} não informado")}</div></div>
              <div className="cell-person">{responsible ? <Av name={responsible.name} size="sm" photoUrl={responsible.photoUrl} /> : null}<div className="cell-sub" style={{ marginTop: 0 }}>{responsible?.name ?? "a definir"}</div></div>
              <div><Chip status={decision.status === "novo" ? "wait" : decision.status === "encaminhado" ? "ok" : "ativo"} /></div>
            </Acao>
          );
        })}
        {visible.length === 0 ? <EmptyState title="Nenhuma decisão por aqui" text={ct("Quem decidir por Jesus ou se reconciliar num {culto} aparece nesta lista.")} /> : null}
      </div>
    </div>
  );
}

export function Batismos({
  baptismClasses,
  baptismCandidates,
  decisions: _decisions,
  members: _members,
  rooms,
  setDrawer,
  setModal,
}: {
  baptismClasses: BaptismClassView[];
  baptismCandidates: BaptismCandidateView[];
  decisions: DecisionView[];
  members: MemberView[];
  rooms: RoomView[];
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
}) {
  const { comTermos: ct } = useTermos();
  const upcoming = baptismClasses.filter((c) => c.status !== "concluida");
  const concluded = baptismClasses.filter((c) => c.status === "concluida");
  const localOptions = [...rooms.map((room) => ({ v: room.name, l: `${room.name}${room.capacity ? ` · ${room.capacity} lug.` : ""}` })), { v: OUTRO_LOCAL, l: "Outro espaço (rio, praia, sítio...)" }];
  return (
    <div className="content wide">
      <PageHead title="Batismos" eyebrow={ct("{Caminhada}")} help={ct("Turmas de batismo: quem vai ser batizado, quando e onde. Fecha um passo importante na {caminhada} da pessoa.")} action={<Botao variante="principal" onClick={() => setModal({ eyebrow: "Criar", title: "Nova turma de batismo", subtitle: "Crie a turma, defina data, local e quem vai oficiar.", saveLabel: "Criar turma", formFields: [{ k:"label", label:"Nome da turma", type:"text", req:true, ph:"ex: Batismo de Julho 2025" }, { k:"data", label:"Data do batismo", type:"date", half:true }, { k:"local", label:"Local", type:"select", req:true, half:true, ph:"Selecione um espaço cadastrado", options: localOptions }, { k:"endereco", label:"Endereço do espaço", type:"text", half:true, ph:"ex: Rio Tietê, Praia de Santos...", showIf:{field:"local",equals:OUTRO_LOCAL} }, { k:"pastor", label:"Pastor responsável", type:"text", ph:"Quem vai oficiar" }], action: { kind: "baptismClass" } })}>+ Nova turma</Botao>} />
      <div className="kpi-row">
        <Kpi icon="identidade" label="Turmas abertas" value={baptismClasses.filter((c) => c.open_enrollment).length} foot="com inscrições disponíveis" help="Turmas de batismo que ainda estão aceitando novas inscrições." />
        <Kpi icon="pessoa" label="Candidatos" value={baptismCandidates.length} foot="em preparação" help="Quem está inscrito numa turma, fazendo o curso pré-batismo." />
        <Kpi icon="cultos" label="Próximas turmas" value={upcoming.length} foot={formatDateBR(upcoming[0]?.baptism_date) || "sem data agendada"} help="Turmas com data de batismo marcada pra frente." />
        <Kpi icon="relatorios" label="Concluídos" value={concluded.length} foot="histórico da igreja" help="Turmas de batismo já realizadas, guardadas no histórico." />
      </div>
      <div className="section-divide">
        <span className="num">{upcoming.length}</span>
        <span className="label">PRÓXIMAS TURMAS</span>
        <div className="line" />
      </div>
      {upcoming.length > 0 ? (
        <div className="bat-grid">
          {upcoming.map((cls) => {
            const count = baptismCandidates.filter((c) => c.class_id === cls.id).length;
            const st = BAT_ST_MAP[cls.status ?? "aberta"];
            return (
              <Acao className="bat-card" key={cls.id} onClick={() => setDrawer({ kind: "baptismClass", id: cls.id })}>
                <div className="bat-card-top">
                  <div>
                    <div className="bat-date">{formatDateBR(cls.baptism_date) || "Sem data"}</div>
                    <div className="bat-turma">{cls.label}</div>
                  </div>
                  <div className="bat-mark"><Icon name="batismos" size={20} /></div>
                </div>
                <div className="bat-meta">{joinDot(cls.location, cls.pastor)}</div>
                <div className="bat-foot">
                  <Selo tom={tomDaClasse(st?.cls ?? "chip-wait")}>{st?.label ?? cls.status}</Selo>
                  <span className="panel-meta">{count} candidato{count !== 1 ? "s" : ""}</span>
                </div>
              </Acao>
            );
          })}
        </div>
      ) : (
        <div className="empty">Nenhuma turma em andamento.</div>
      )}
      {concluded.length > 0 && (
        <>
          <div className="section-divide" style={{ marginTop: 32 }}>
            <span className="num">{concluded.length}</span>
            <span className="label">HISTÓRICO</span>
            <div className="line" />
          </div>
          <div className="tbl">
            <Linha estilo="tabela" className="head" style={{ gridTemplateColumns: "2fr 1fr 1fr 100px" }}><span>Turma</span><span>Data</span><span>Local</span><span>Candidatos</span></Linha>
            {concluded.map((cls) => {
              const count = baptismCandidates.filter((c) => c.class_id === cls.id).length;
              return (
                <Acao className={`${linhaClasse({ estilo: "tabela" })} click`} key={cls.id} style={{ gridTemplateColumns: "2fr 1fr 1fr 100px" }} onClick={() => setDrawer({ kind: "baptismClass", id: cls.id })}>
                  <div className="cell-name">{cls.label}</div>
                  <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--light)" }}>{formatDateBR(cls.baptism_date) || "-"}</div>
                  <div className="cell-sub">{cls.location ?? "-"}</div>
                  <div><Selo>{count} pessoas</Selo></div>
                </Acao>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function normCat(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export const CURSO_FILTROS = [
  { v: "todos", l: "Todos" },
  { v: "trilha", l: "Trilhas" },
  { v: "conteudo", l: "Conteúdo" },
  { v: "presencial", l: "Presenciais" },
] as const;

export function CursosTrilhas({
  courses, enrollments, courseModules, courseLessons, lessonAttendance, members, church,
}: {
  courses: CourseView[];
  enrollments: EnrollmentView[];
  courseModules: ModuleView[];
  courseLessons: LessonView[];
  lessonAttendance: LessonAttendanceView[];
  members: MemberView[];
  church?: ChurchView;
}) {
  const { comTermos: ct } = useTermos();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [view, setView] = useState<"galeria" | "org">("galeria");
  const [filtro, setFiltro] = useState<(typeof CURSO_FILTROS)[number]["v"]>("todos");
  const [novoGrupo, setNovoGrupo] = useState<string | null>(null);

  if (editingId !== null && church) {
    return (
      <CursoEditor
        courseId={editingId === "new" ? null : editingId}
        church={{ id: church.id, organizationId: church.organizationId }}
        allCourses={courses.map((c) => ({ id: c.id, name: c.name }))}
        onClose={() => setEditingId(null)}
      />
    );
  }

  const totMatric = enrollments.length;
  const totConcl = enrollments.filter((e) => e.status === "concluido").length;
  const liderancaIds = new Set(courses.filter((c) => c.category && normCat(c.category) === "lideranca").map((c) => c.id));
  const emFormacao = enrollments.filter((e) => liderancaIds.has(e.course_id)).length;
  const cursos = courses.filter((c) => filtro === "todos" || c.kind === filtro);

  return (
    <div className="content wide">
      <PageHead
        title="Cursos e Trilhas"
        eyebrow={ct("{Caminhada}")}
        help={ct("Formações da igreja, da decisão à liderança. Cada aula concluída entra na {caminhada} da pessoa.")}
        action={
          <Botao variante="principal" onClick={() => setEditingId("new")}>
            + Nova trilha
          </Botao>
        }
      />

      <div className="kpi-row">
        <Kpi icon="cursos" label="Cursos ativos" value={courses.length} foot="trilhas, conteúdo e presenciais" help="Trilhas de formação disponíveis hoje, da decisão à liderança." />
        <Kpi icon="membros" label="Matrículas" value={totMatric} foot="pessoas cursando agora" help="Quantas pessoas estão matriculadas em algum curso neste momento." />
        <Kpi icon="ok" label="Conclusões" value={totConcl} foot={totMatric ? `${Math.round((totConcl / totMatric) * 100)}% de conclusão` : "sem matrículas ainda"} help="Matrículas que já terminaram todas as aulas do curso." />
        <Kpi icon="times" label="Em formação de líderes" value={emFormacao} foot="na trilha de liderança" help="Quem está cursando especificamente a trilha de formação de líderes." />
      </div>

      {/* uma fileira só: os tipos de curso e, no fim, organizar */}
      <div className="seg-check cursos-filtros">
        {CURSO_FILTROS.map((f) => (
          <Opcao key={f.v} marcada={view === "galeria" && filtro === f.v} estilo="seg-chip" onClick={() => { setView("galeria"); setFiltro(f.v); }}>{f.l}</Opcao>
        ))}
        <Opcao marcada={view === "org"} estilo="seg-chip" onClick={() => setView("org")}><Icon name="config" size={13} /> Organizar</Opcao>
      </div>

      {view === "galeria" ? (
        <div className="team-grid">
          {cursos.map((course) => {
            const courseEnrollments = enrollments.filter((item) => item.course_id === course.id);
            const concluded = courseEnrollments.filter((item) => item.status === "concluido").length;
            const pct = courseEnrollments.length ? Math.round((concluded / courseEnrollments.length) * 100) : 0;
            return (
              <Acao
                className="team-card"
                key={course.id}
                onClick={() => setViewingId(course.id)}
              >
                <div className="team-card-top">
                  <div className="team-mark"><Icon name="relatorios" size={20} /></div>
                  <Selo tom="ok">{course.level || course.category || "trilha"}</Selo>
                </div>
                <div className="team-name">{course.name}</div>
                <div className="team-lead">Matrículas: <em>{courseEnrollments.length}</em></div>
                <p style={{ color: "var(--muted)", fontSize: "var(--fs-pn-13)", lineHeight: 1.55, marginTop: 12 }}>
                  {course.description || "Acompanhamento de progresso e conclusão na linha do tempo do membro."}
                </p>
                <div className="bar" style={{ marginTop: 14 }}>
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </Acao>
            );
          })}
          {cursos.length === 0 && <EmptyState title="Nenhum curso ainda" text="Os cursos e trilhas da igreja aparecem aqui, com aulas e presença." action={{ label: "Criar curso", onClick: () => setEditingId("new") }} />}
        </div>
      ) : (
        <CursoBuilder
          courses={courses}
          church={church}
          onOpenEditor={(id) => setEditingId(id)}
          onOpenDrawer={(id) => setViewingId(id)}
          novoGrupo={novoGrupo}
          setNovoGrupo={setNovoGrupo}
        />
      )}

      {viewingId && (() => {
        const course = courses.find((c) => c.id === viewingId);
        if (!course || !church) return null;
        return (
          <CursoDrawer
            course={course}
            allCourses={courses}
            modules={courseModules}
            lessons={courseLessons}
            enrollments={enrollments}
            lessonAttendance={lessonAttendance}
            members={members}
            church={{ id: church.id, organizationId: church.organizationId }}
            onClose={() => setViewingId(null)}
            onEdit={() => { setViewingId(null); setEditingId(course.id); }}
          />
        );
      })()}
    </div>
  );
}

export function CursoBuilderColuna({
  id, nome, lista, allCourses, drag, setDrag, mover, onOpenEditor, onOpenDrawer,
}: {
  id: string | null;
  nome: string;
  lista: CourseView[];
  allCourses: CourseView[];
  drag: string | null;
  setDrag: (id: string | null) => void;
  mover: (courseId: string, categoria: string | null) => void;
  onOpenEditor: (id: string | "new") => void;
  onOpenDrawer: (id: string) => void;
}) {
  const { comTermos: ct } = useTermos();
  const access = useServiceAccess();
  return (
    <div
      className="cb-col"
      onDragOver={(e) => { if (drag) e.preventDefault(); }}
      onDrop={() => { if (drag) mover(drag, id); setDrag(null); }}
    >
      <div className="cb-col-head">
        <div className="cb-col-name">{nome}</div>
        <span className="cb-col-n">{lista.length}</span>
      </div>
      <div className="cb-col-body">
        {lista.map((c) => (
          <Acao
            className="cb-card"
            key={c.id}
            draggable
            onDragStart={() => setDrag(c.id)}
            onDragEnd={() => setDrag(null)}
            onClick={() => onOpenDrawer(c.id)}
          >
            <div className={`cb-card-bar tone-${c.color ?? "olive"}`} />
            <div className="cb-card-main">
              <div className="cb-card-name">{c.name}</div>
              {requirementsFor(access.requirements, "course", c.id).length > 0 && (
                <div className="cb-req">
                  exige: {requirementsFor(access.requirements, "course", c.id).map((r) => ct(requirementLabel(r, access).replace(/^[^:]+: /, ""))).join(", ")}
                </div>
              )}
            </div>
          </Acao>
        ))}
        {id && <Botao compacto onClick={() => onOpenEditor("new")}>+ curso neste grupo</Botao>}
      </div>
    </div>
  );
}

export function CursoBuilder({
  courses, church, onOpenEditor, onOpenDrawer, novoGrupo, setNovoGrupo,
}: {
  courses: CourseView[];
  church?: ChurchView;
  onOpenEditor: (id: string | "new") => void;
  onOpenDrawer: (id: string) => void;
  novoGrupo: string | null;
  setNovoGrupo: (v: string | null) => void;
}) {
  const router = useRouter();
  const [drag, setDrag] = useState<string | null>(null);
  const [nomeGrupo, setNomeGrupo] = useState("");

  const grupos = church?.settings?.cursoGrupos ?? [];
  const knownIds = new Set(grupos.map((g) => g.id));
  const categoriasExtras = Array.from(
    new Set(courses.map((c) => c.category).filter((c): c is string => !!c && !knownIds.has(c))),
  );
  const colunas = [...grupos, ...categoriasExtras.map((id) => ({ id, nome: id }))];
  const semGrupo = courses.filter((c) => !c.category);

  const mover = async (courseId: string, categoria: string | null) => {
    if (!church) return;
    await createServiceBrowserClient().schema("service").from("courses").update({ category: categoria }).eq("id", courseId);
    router.refresh();
  };

  const criarGrupo = async () => {
    if (!church || !nomeGrupo.trim()) return;
    const id = normCat(nomeGrupo.trim()).replace(/\s+/g, "-");
    const next = [...grupos, { id, nome: nomeGrupo.trim() }];
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, cursoGrupos: next } }).eq("id", church.id);
    setNomeGrupo("");
    setNovoGrupo(null);
    router.refresh();
  };

  return (
    <div className="cb-board">
      {colunas.map((g) => (
        <CursoBuilderColuna
          key={g.id}
          id={g.id}
          nome={g.nome}
          lista={courses.filter((c) => c.category === g.id)}
          allCourses={courses}
          drag={drag}
          setDrag={setDrag}
          mover={mover}
          onOpenEditor={onOpenEditor}
          onOpenDrawer={onOpenDrawer}
        />
      ))}
      <CursoBuilderColuna
        id={null}
        nome="Sem grupo"
        lista={semGrupo}
        allCourses={courses}
        drag={drag}
        setDrag={setDrag}
        mover={mover}
        onOpenEditor={onOpenEditor}
        onOpenDrawer={onOpenDrawer}
      />
      <div className="cb-col" style={{ justifyContent: "center", padding: 12 }}>
        {novoGrupo !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              className="input"
              placeholder="Nome do grupo"
              value={nomeGrupo}
              onChange={(e) => setNomeGrupo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarGrupo()}
              autoFocus
            />
            <div style={{ display: "flex", gap: 6 }}>
              <Botao variante="principal" compacto onClick={criarGrupo}>Criar</Botao>
              <Botao compacto onClick={() => { setNovoGrupo(null); setNomeGrupo(""); }}>Cancelar</Botao>
            </div>
          </div>
        ) : (
          <Botao compacto onClick={() => setNovoGrupo("")}>+ Novo grupo</Botao>
        )}
      </div>
    </div>
  );
}
