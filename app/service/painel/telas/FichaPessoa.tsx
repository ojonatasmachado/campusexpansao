"use client";

import { regiaoInformada } from "../../lib/endereco";
import { recebimentoAberto } from "../../modules/times/recebimento";
import { plural } from "../../lib/plural";
import { formatarTelefone } from "../../lib/telefone";
import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot } from "../../lib/date";
import { useTermos } from "../../lib/vocabulario-context";
import { useServiceAccess } from "../../AccessContext";
import { requirementsFor, requirementLabel } from "../../lib/requirements";
import { Av, Chip } from "../ui";
import { coberturaPorTime } from "../../modules/escalas/cobertura";
import { ROUTES, TeamMark, openMemberInviteWhatsapp, parseFlexDate } from "../comum";
import { DrawerSection, DrawerShell } from "../campos";
import { MiniCalendar } from "./Agenda";
import { AcessosCard } from "./configuracao/AcessosCard";
import { MinisterioEditModal } from "./Times";
import { BatismoDrawer, DecisaoDrawer } from "./Caminhada";
import { EnsaioDrawer, ReuniaoDrawer } from "./Reunioes";
import { EventDrawer } from "./Evento";
import type { BaptismCandidateView, BaptismClassView, BoardView, CalEvent, CardView, ChurchView, CourseView, DecisionView, DrawerState, EnrollmentView, EventRsvpView, EventView, FellowshipGroupView, LessonView, MeetingActionView, MeetingView, MemberView, MinistryView, ModalState, ModuleView, PersonView, RehearsalView, RosterAssignmentView, TimelineEventView, VisitorNoteView, VisitorView } from "../tipos";
import { Botao, BotaoIcone } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Selo, etiquetaClasse } from "../../ui/Selo";
import { Progresso } from "../../ui/Graficos";
import { PersonTimeline } from "./ficha/PersonTimeline";
import { VisitanteDrawer } from "./ficha/VisitanteDrawer";
import { MemberEditModal } from "./ficha/MemberEditModal";
import { JornadaEditModal } from "./ficha/JornadaEditModal";
import { AddToMinistryModal } from "./ficha/AddToMinistryModal";

export function EntityDrawer({
  drawer,
  people,
  members,
  ministries,
  events,
  roster,
  decisions,
  baptismClasses,
  baptismCandidates,
  visitors,
  visitorNotes,
  courses,
  enrollments,
  courseModules,
  courseLessons,
  meetings,
  meetingActions,
  rehearsals,
  boards,
  cards,
  church,
  fellowshipGroups,
  timelineEvents,
  setDrawer,
  setRoute,
  setModal,
  setShareEventId,
  eventRsvps = [],
  onAbrirVagas,
  scopeMinistryIds = null,
  onStartChatWithMember,
  currentRole = "membro",
}: {
  currentRole?: "master" | "pastor" | "lider" | "membro";
  drawer: NonNullable<DrawerState>;
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  roster: RosterAssignmentView[];
  decisions: DecisionView[];
  baptismClasses: BaptismClassView[];
  baptismCandidates: BaptismCandidateView[];
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  courses: CourseView[];
  enrollments: EnrollmentView[];
  courseModules: ModuleView[];
  courseLessons: LessonView[];
  meetings: MeetingView[];
  meetingActions: MeetingActionView[];
  rehearsals: RehearsalView[];
  boards: BoardView[];
  cards: CardView[];
  church: ChurchView | undefined;
  fellowshipGroups: FellowshipGroupView[];
  timelineEvents: TimelineEventView[];
  setDrawer: (drawer: DrawerState) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  setModal: (modal: ModalState) => void;
  setShareEventId: (id: string) => void;
  eventRsvps?: EventRsvpView[];
  onAbrirVagas?: (eventId: string, timeId?: string) => void;
  scopeMinistryIds?: string[] | null;
  onStartChatWithMember: (memberId: string) => void;
}) {
  const { termo, comTermos: ct } = useTermos();
  const router = useRouter();
  const [editingMember, setEditingMember] = useState(false);
  const [editingJourney, setEditingJourney] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [sendingAccess, setSendingAccess] = useState(false);
  const access = useServiceAccess();

  const sendMemberAccessWhatsapp = async (member: MemberView) => {
    if (!church || sendingAccess) return;
    setSendingAccess(true);
    const tab = window.open("", "_blank");
    try {
      const { error } = await openMemberInviteWhatsapp({
        memberId: member.id,
        name: member.name,
        phone: member.phone,
        churchName: church.nome ?? "sua igreja",
        template: church.settings?.acessoMsgCfg?.mensagem,
        tab,
      });
      if (error) avisar(error, "warn");
      else router.refresh();
    } finally {
      setSendingAccess(false);
    }
  };

  if (drawer.kind === "person") {
    const person = people.find((item) => item.id === drawer.id);
    if (!person) return null;
    const personRoster = roster.filter((item) => item.person_id === person.id);
    const linkedMinistries = ministries.filter((ministry) => ministry.people.some((link) => link.personId === person.id));
    const personCalEvents: CalEvent[] = [];
    personRoster.forEach((assignment) => {
      const ev = events.find((item) => item.id === assignment.event_id);
      const date = parseFlexDate(ev?.eventDate);
      if (!ev || !date) return;
      let posName = "Escala", ministryName = "";
      for (const ministry of ministries) {
        const position = ministry.positions.find((p) => p.id === assignment.position_id);
        if (position) { posName = position.name; ministryName = ministry.name; break; }
      }
      personCalEvents.push({
        date,
        label: ministryName ? `${posName} · ${ministryName}` : posName,
        sub: joinDot(ev.name, ev.time),
        tone: assignment.status === "no" ? "amber" : "olive",
        onClick: () => setDrawer({ kind: "event", id: ev.id }),
      });
    });
    meetings.filter((meeting) => meeting.attendees.includes(person.id)).forEach((meeting) => {
      const date = parseFlexDate(meeting.meeting_date);
      if (!date) return;
      personCalEvents.push({ date, label: meeting.title, sub: `Reunião · ${meeting.time ?? "sem horário"}`, tone: "amber", onClick: () => setDrawer({ kind: "meeting", id: meeting.id }) });
    });
    rehearsals.filter((rehearsal) => rehearsal.attendees.includes(person.id)).forEach((rehearsal) => {
      const date = parseFlexDate(rehearsal.rehearsal_date);
      if (!date) return;
      personCalEvents.push({ date, label: rehearsal.title, sub: `Ensaio · ${rehearsal.time ?? "sem horário"}`, tone: "olive", onClick: () => setDrawer({ kind: "rehearsal", id: rehearsal.id }) });
    });
    return (
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={() => setDrawer(null)}>✕</BotaoIcone>
          <div className="profile-top">
            <Av name={person.name} size="lg" photoUrl={person.photoUrl} />
            <div>
              <div className="profile-name">{person.name}</div>
              <div className="profile-role">{ct("{Voluntario} · desde o cadastro")}</div>
              <div style={{ marginTop: 10 }}><Chip status={person.status} /></div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <DrawerSection title="Contato">
            <dl className="kv"><dt>Telefone</dt><dd>{formatarTelefone(person.phone)}</dd><dt>E-mail</dt><dd>{person.email}</dd></dl>
          </DrawerSection>
          <DrawerSection title="Times e funções">
            <div className="cell-tags" style={{ gap: 8 }}>{linkedMinistries.map((ministry) => <Acao className={etiquetaClasse()} key={ministry.id} onClick={() => setDrawer({ kind: "ministry", id: ministry.id })}>{ministry.name}</Acao>)}</div>
            {person.tags.length > 0 && <div style={{ marginTop: 12, fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Etiquetas: {person.tags.join(" · ")}</div>}
          </DrawerSection>
          <DrawerSection title="Disponibilidade">
            <div className="avail">
              {[
                ["dom_m", "Dom manhã"],
                ["dom_n", "Dom noite"],
                ["qua", "Quarta"],
              ].map(([key, label]) => <span key={key} className={`avail-day ${person.availability[key] ? "free" : "block"}`}>{label}</span>)}
            </div>
          </DrawerSection>
          <DrawerSection title={`Meu calendário · ${plural(personCalEvents.length, "compromisso")}`}>
            <MiniCalendar events={personCalEvents} />
          </DrawerSection>
          {(currentRole === "master" || currentRole === "pastor") && (
            <DrawerSection title="Acesso ao painel">
              <AcessosCard people={people} church={church} currentRole={currentRole} onlyPersonId={person.id} />
            </DrawerSection>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setDrawer(null); setRoute("escalas"); }}>Escalar</Botao>
            {(() => {
              const linkedMember = members.find((m) => m.volunteerId === person.id);
              return (
                <Botao style={{ flex: 1, justifyContent: "center" }} desativado={!linkedMember} onClick={() => linkedMember && onStartChatWithMember(linkedMember.id)}>Enviar mensagem</Botao>
              );
            })()}
          </div>
        </div>
      </DrawerShell>
    );
  }

  if (drawer.kind === "member") {
    const member = members.find((item) => item.id === drawer.id);
    if (!member) return null;
    const temTelefone = (member.phone ?? "").replace(/\D/g, "").length >= 10;
    const linkedMinistries = ministries.filter((m) => m.people.some((p) => p.personId === member.volunteerId));
    const memberEnrollments = enrollments.filter((e) => e.member_id === member.id).map((e) => {
      const course = courses.find((c) => c.id === e.course_id);
      return course ? { ...e, course } : null;
    }).filter(Boolean) as (EnrollmentView & { course: CourseView })[];
    const isServing = member.journey[4] || linkedMinistries.length > 0;
    const grupo = fellowshipGroups.find((g) => g.id === member.groupId) ?? null;
    const grupoLider = grupo ? people.find((p) => p.id === grupo.leader_person_id) ?? null : null;
    const familiares = member.family ? members.filter((m) => m.family === member.family && m.id !== member.id) : [];
    const linkedPerson = member.volunteerId ? people.find((p) => p.id === member.volunteerId) ?? null : null;
    /* um aviso só, no lugar de "a completar" em cada campo */
    const faltando = [
      !member.phone && "telefone",
      !member.email && "e-mail",
      !member.birth && "aniversário",
      !regiaoInformada(member) && "endereço",
    ].filter(Boolean) as string[];
    return (
      <>
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={() => setDrawer(null)}>✕</BotaoIcone>
          <div className="profile-top">
            <Av name={member.name} size="lg" photoUrl={linkedPerson?.photoUrl} />
            <div>
              <div className="profile-name">{member.name}</div>
              {member.firstContact ? <div className="profile-role">Membro desde {formatDateBR(member.firstContact)}</div> : null}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip status={member.situation} />
                {isServing && <Selo tom="ok">Servindo</Selo>}
              </div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          {faltando.length > 0 && (
            <div className="cadastro-incompleto">
              <span><b>Cadastro incompleto</b> · falta {faltando.join(", ")}</span>
              <Botao compacto onClick={() => setEditingMember(true)}>Completar</Botao>
            </div>
          )}
          <DrawerSection title="Dados cadastrais">
            <dl className="kv">
              <dt>Telefone</dt><dd>{formatarTelefone(member.phone)}</dd>
              <dt>E-mail</dt><dd>{member.email}</dd>
              <dt>Aniversário</dt><dd>{currentRole === "master" || currentRole === "pastor" ? formatDateBR(member.birth) : formatDateBR(member.birth).slice(0, 5)}</dd>
              <dt>Bairro</dt><dd>{member.neighborhood}</dd>
              {(church?.settings?.gruposCfg?.ativo ?? true) && <><dt>{termo("grupo")}</dt><dd>{grupo ? <>{grupo.name}{grupoLider && <span style={{ color: "var(--muted)" }}> · líder {grupoLider.name.split(" ")[0]}</span>}</> : <span style={{ color: "var(--muted)" }}>sem grupo</span>}</dd></>}
              <dt>Acesso ao app</dt><dd>{member.volunteerId ? <span style={{ color: "var(--olive-soft)" }}>liberado</span> : temTelefone ? <span style={{ color: "var(--amber)" }}>convite ainda não aceito</span> : <span style={{ color: "var(--amber)" }}>falta o telefone</span>}</dd>
            </dl>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Botao compacto onClick={() => setEditingMember(true)}>Editar dados</Botao>
              {temTelefone && (
                <Botao variante="principal" compacto desativado={sendingAccess} onClick={() => sendMemberAccessWhatsapp(member)}>
                  <Icon name="whatsapp" size={14} />
                  {sendingAccess ? "Preparando…" : member.volunteerId ? "Reenviar acesso pelo WhatsApp" : "Enviar acesso pelo WhatsApp"}
                </Botao>
              )}
            </div>
            {temTelefone && (
              <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
                Ao clicar, o app gera um convite só de {member.name.split(" ")[0]}, válido por 7 dias,
                onde a pessoa informa o e-mail, cria a senha e coloca o CEP. Depois, abre o WhatsApp no
                seu celular já com a mensagem de boas-vindas e o link, prontos pra você conferir e
                mandar. Nada é enviado sozinho: você sempre aperta enviar por último.
              </div>
            )}
          </DrawerSection>
          {(currentRole === "master" || currentRole === "pastor") && linkedPerson && (
            <DrawerSection title="Acesso ao painel">
              <AcessosCard people={people} church={church} currentRole={currentRole} onlyPersonId={linkedPerson.id} />
            </DrawerSection>
          )}
          {familiares.length > 0 && (
            <DrawerSection title={`Família · ${familiares.length}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {familiares.map((f) => (
                  <Acao className="cand" style={{ width: "100%", textAlign: "left" }} key={f.id} onClick={() => setDrawer({ kind: "member", id: f.id })}>
                    <Av name={f.name} size="sm" />
                    <div className="cand-main"><div className="cand-name">{f.name}</div></div>
                  </Acao>
                ))}
              </div>
            </DrawerSection>
          )}
          <DrawerSection title="Serve e cargo">
            {linkedMinistries.length > 0 ? (
              <div className="ov-serve">
                {linkedMinistries.map((m) => {
                  const link = m.people.find((p) => p.personId === member.volunteerId);
                  return (
                    <Acao className="ov-serve-row" key={m.id} onClick={() => setDrawer({ kind: "ministry", id: m.id })}>
                      <span className="ov-serve-ic"><TeamMark ministry={m} size={14} /></span>
                      <span className="ov-serve-name">{m.name}</span>
                      {link?.isLeader ? <span className="lider-tag">Líder</span> : <span className="ov-serve-fn">{link?.functions.join(" · ") || ct("{Voluntario}")}</span>}
                    </Acao>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Ainda não serve em nenhum time.</div>
            )}
          </DrawerSection>
          <DrawerSection title="Cursos matriculados">
            {memberEnrollments.length > 0 ? (
              <div className="mc-list">
                {memberEnrollments.map(({ id, course, done_count, status }) => {
                  const courseModuleIds = new Set(courseModules.filter((m) => m.course_id === course.id).map((m) => m.id));
                  const totalAulas = courseLessons.filter((l) => courseModuleIds.has(l.module_id)).length;
                  const pct = totalAulas ? Math.min(100, Math.round((done_count / totalAulas) * 100)) : 0;
                  return (
                    <div className="mc-row" key={id}>
                      <div className={`mc-bar tone-${course.color ?? "olive"}`} />
                      <div className="mc-main">
                        <div className="mc-head">
                          <div className="mc-name">{course.name}</div>
                          {status === "concluido" ? <Selo tom="ok">Concluído</Selo> : <span className="mc-pct">{pct}%</span>}
                        </div>
                        <div className="mc-meta">{course.level || course.kind || "curso"} · {done_count} de {plural(totalAulas, "aula")}</div>
                        <Progresso pct={pct} rotulo={`Progresso em ${course.name}`} tom={status === "concluido" ? undefined : "pendente"} style={{ marginTop: 8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum curso matriculado ainda.</div>
            )}
          </DrawerSection>
          <DrawerSection title="História"><PersonTimeline member={member} events={timelineEvents.filter((e) => e.member_id === member.id)} compact /></DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditingJourney(true)}>{ct("Atualizar {caminhada}")}</Botao>
            <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => onStartChatWithMember(member.id)}>Enviar mensagem</Botao>
            {linkedPerson && (
              <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => setDrawer({ kind: "person", id: linkedPerson.id })}>{ct("Ver como {voluntario}")}</Botao>
            )}
          </div>
        </div>
      </DrawerShell>
      {editingMember && (
        <MemberEditModal
          member={member}
          fellowshipGroups={fellowshipGroups}
          church={church}
          onClose={() => setEditingMember(false)}
          onRefresh={() => router.refresh()}
        />
      )}
      {editingJourney && (
        <JornadaEditModal
          member={member}
          events={timelineEvents.filter((e) => e.member_id === member.id)}
          church={church}
          onClose={() => setEditingJourney(false)}
          onRefresh={() => router.refresh()}
        />
      )}
      </>
    );
  }

  if (drawer.kind === "ministry") {
    const ministry = ministries.find((item) => item.id === drawer.id);
    if (!ministry) return null;
    const leader = ministry.people.find((link) => link.isLeader);
    const isOpen = recebimentoAberto(ministry);
    const profile = ministry.profile as { comoTrabalhamos?: string; chegada?: string; responsabilidades?: string[] };
    const requisitosTime = requirementsFor(access.requirements, "ministry", ministry.id);
    const matchesPosition = (link: MinistryView["people"][number], positionName: string) =>
      link.functions.some((f) => f.toLowerCase() === positionName.toLowerCase());
    const porFuncao = ministry.positions.map((position) => ({
      position,
      pessoas: ministry.people.filter((link) => matchesPosition(link, position.name)),
    }));
    const semFuncao = ministry.people.filter((link) => !ministry.positions.some((p) => matchesPosition(link, p.name)));
    return (
      <>
      <DrawerShell onClose={() => setDrawer(null)}>
        <div className="drawer-head">
          <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={() => setDrawer(null)}>✕</BotaoIcone>
          <div className="profile-top">
            <div className="team-mark" style={{ width: 56, height: 56 }}><TeamMark ministry={ministry} size={26} /></div>
            <div>
              <div className="profile-name">{ministry.name}</div>
              <div className="profile-role">{leader?.personName ? <>Líder: <span style={{ color: "var(--olive)" }}>{leader.personName}</span></> : <span className="sem-lider">Sem líder · Definir</span>} · {plural(ministry.people.length, ct("{voluntario}"))}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <span className={`topen ${isOpen ? "yes" : "no"}`}>{isOpen ? ct("Recebendo {voluntarios}") : "Pedidos pelo app fechados"}</span>
          </div>
        </div>
        <div className="drawer-body">
          {(ministry.description || profile.comoTrabalhamos || profile.chegada || (profile.responsabilidades?.length ?? 0) > 0 || requisitosTime.length > 0) && (
            <div style={{ marginTop: 4, marginBottom: 22 }}>
              <div className="dsec-title" style={{ marginBottom: 10 }}>Sobre o time</div>
              <div className="tinfo">
                {ministry.description && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="identidade" size={13} /> Propósito</div>
                    <div className="tinfo-x">{ministry.description}</div>
                  </div>
                )}
                {profile.comoTrabalhamos && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="times" size={13} /> Como trabalhamos</div>
                    <div className="tinfo-x">{profile.comoTrabalhamos}</div>
                  </div>
                )}
                {profile.chegada && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="agenda" size={13} /> Horário de chegada</div>
                    <div className="tinfo-x">{profile.chegada}</div>
                  </div>
                )}
                {(profile.responsabilidades?.length ?? 0) > 0 && (
                  <div className="tinfo-block">
                    <div className="tinfo-label">→ O que esperamos</div>
                    {profile.responsabilidades!.map((r, i) => <div className="tinfo-li" key={i}>{r}</div>)}
                  </div>
                )}
                {requisitosTime.length > 0 && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="cursos" size={13} /> Pré-requisitos</div>
                    {requisitosTime.map((r) => (
                      <div className="tinfo-li" key={`${r.kind}-${r.ref}`}>{ct(requirementLabel(r, access))}</div>
                    ))}
                  </div>
                )}
              </div>
              <Botao compacto style={{ marginTop: 12 }} onClick={() => setEditingMinistry(true)}>Editar</Botao>
            </div>
          )}
          {!ministry.description && !profile.comoTrabalhamos && !profile.chegada && !(profile.responsabilidades?.length) && !requisitosTime.length && (
            <Botao compacto style={{ marginBottom: 22 }} onClick={() => setEditingMinistry(true)}>+ Sobre o time</Botao>
          )}
          <DrawerSection title="Funções e quem cobre">
            {porFuncao.map(({ position, pessoas }) => (
              <div key={position.id} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="esc-fn">{position.name}</div>
                  <span className="panel-meta">{position.need_count} {position.need_count === 1 ? "vaga" : "vagas"}</span>
                </div>
                {pessoas.length === 0 && <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>Ninguém habilitado ainda.</div>}
                {pessoas.map((link) => (
                  <Acao className="cand" key={`${position.id}-${link.personId}`} onClick={() => setDrawer({ kind: "person", id: link.personId })}>
                    <Av name={link.personName} photoUrl={people.find((pp) => pp.id === link.personId)?.photoUrl} />
                    <div className="cand-main">
                      <div className="cand-name">{link.personName}</div>
                      <div className="cand-meta">{link.isLeader ? "Líder do time" : link.functions.join(" · ") || ct("{Voluntario}")}</div>
                    </div>
                    {link.isLeader && <span className="lider-tag">Líder</span>}
                  </Acao>
                ))}
              </div>
            ))}
            {semFuncao.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="esc-fn">Sem função definida</div>
                </div>
                {semFuncao.map((link) => (
                  <Acao className="cand" key={`semfuncao-${link.personId}`} onClick={() => setDrawer({ kind: "person", id: link.personId })}>
                    <Av name={link.personName} photoUrl={people.find((pp) => pp.id === link.personId)?.photoUrl} />
                    <div className="cand-main">
                      <div className="cand-name">{link.personName}</div>
                      <div className="cand-meta">{link.isLeader ? "Líder do time" : ct("{Voluntario}")}</div>
                    </div>
                    {link.isLeader && <span className="lider-tag">Líder</span>}
                  </Acao>
                ))}
              </div>
            )}
            {ministry.people.length === 0 && <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>Ninguém neste time ainda.</div>}
          </DrawerSection>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setDrawer(null); setRoute("escalas"); }}>Ver escala</Botao>
            <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => setAddingPerson(true)}>Adicionar pessoa</Botao>
          </div>
        </div>
      </DrawerShell>
      {editingMinistry && (
        <MinisterioEditModal
          ministry={ministry}
          courses={courses}
          onClose={() => setEditingMinistry(false)}
          onRefresh={() => router.refresh()}
        />
      )}
      {addingPerson && church && (
        <AddToMinistryModal
          ministry={ministry}
          people={people}
          members={members}
          church={{ id: church.id, organizationId: church.organizationId }}
          onClose={() => setAddingPerson(false)}
        />
      )}
      </>
    );
  }

  if (drawer.kind === "visitor") {
    const visitor = visitors.find((v) => v.id === drawer.id);
    if (!visitor) return null;
    return (
      <VisitanteDrawer
        visitor={visitor}
        notes={visitorNotes}
        church={church}
        people={people}
        onClose={() => setDrawer(null)}
        onOpenMember={(id) => setDrawer({ kind: "member", id })}
        setModal={setModal}
      />
    );
  }

  if (drawer.kind === "decision") {
    const decision = decisions.find((d) => d.id === drawer.id);
    if (!decision) return null;
    return (
      <DecisaoDrawer
        decision={decision}
        people={people}
        members={members}
        church={church}
        timelineEvents={timelineEvents}
        onClose={() => setDrawer(null)}
        onOpenMember={(id) => setDrawer({ kind: "member", id })}
      />
    );
  }

  if (drawer.kind === "baptismClass") {
    const classData = baptismClasses.find((c) => c.id === drawer.id);
    if (!classData) return null;
    return (
      <BatismoDrawer
        classData={classData}
        candidates={baptismCandidates}
        members={members}
        decisions={decisions}
        church={church}
        onClose={() => setDrawer(null)}
        onOpenMember={(id) => setDrawer({ kind: "member", id })}
        onRefresh={() => setDrawer(null)}
      />
    );
  }

  if (drawer.kind === "meeting") {
    const meeting = meetings.find((m) => m.id === drawer.id);
    if (!meeting) return null;
    const mActions = meetingActions.filter((a) => a.meeting_id === meeting.id);
    return <ReuniaoDrawer meeting={meeting} actions={mActions} ministries={ministries} people={people} boards={boards} cards={cards} church={church} onClose={() => setDrawer(null)} setRoute={setRoute} />;
  }

  if (drawer.kind === "rehearsal") {
    const rehearsal = rehearsals.find((r) => r.id === drawer.id);
    if (!rehearsal) return null;
    return <EnsaioDrawer rehearsal={rehearsal} ministries={ministries} people={people} onClose={() => setDrawer(null)} />;
  }

  const event = events.find((item) => item.id === drawer.id);
  if (!event) return null;
  return (
    <EventDrawer
      event={event}
      ministries={ministries}
      people={people}
      roster={roster}
      rsvps={eventRsvps.filter((r) => r.event_id === event.id)}
      cobertura={coberturaPorTime(event, roster, ministries, scopeMinistryIds)}
      onAbrirVagas={onAbrirVagas ? (timeId) => onAbrirVagas(event.id, timeId) : undefined}
      onClose={() => setDrawer(null)}
      setDrawer={setDrawer}
      setRoute={setRoute}
      setShareEventId={setShareEventId}
    />
  );
}

export { PersonTimeline } from "./ficha/PersonTimeline";

export { VisitanteDrawer } from "./ficha/VisitanteDrawer";

export { MemberEditModal } from "./ficha/MemberEditModal";

export { JornadaEditModal } from "./ficha/JornadaEditModal";

export { AddToMinistryModal } from "./ficha/AddToMinistryModal";
