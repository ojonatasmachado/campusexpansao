"use client";

import { useEffect, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type Option = { id: string; name: string };
type MemberOption = Option & { journey?: number[] };
type EventOption = Option;
type RemainingServiceManagerProps = {
  churchId: string;
  organizationId: string;
  people: Option[];
  members: MemberOption[];
  ministries: Option[];
  events: EventOption[];
};

type AnyRow = Record<string, unknown> & { id?: string };

type Forms = {
  settings: { groupSingular: string; groupPlural: string; contactEmail: string; contactPhone: string; checkinExtra: boolean };
  identity: { purpose: string; mission: string; vision: string; verse: string; values: string };
  cycle: { year: string; theme: string; verse: string; body: string; objectives: string; isActive: boolean };
  history: { year: string; title: string; body: string; link: string };
  title: { name: string };
  tag: { name: string; color: string; leaders: string };
  group: { name: string; leaderId: string; weekday: string; time: string; neighborhood: string };
  announcement: { title: string; audience: string; body: string; author: string; whenLabel: string };
  wall: { author: string; audience: string; body: string; pinned: boolean; channels: string };
  prayer: { memberId: string; kind: "oracao" | "falar_lider"; body: string; status: "aberto" | "em_contato" | "resolvido"; isPrivate: boolean };
  baptism: { label: string; baptismDate: string; location: string; status: "aberta" | "preparacao" | "agendada" | "concluida"; pastor: string; notes: string; openEnrollment: boolean; memberId: string; decisionId: string };
  course: { name: string; kind: "trilha" | "conteudo" | "presencial"; level: string; color: string; description: string; category: string; moduleName: string; lessonName: string; lessonDuration: string; lessonKind: "video" | "texto" | "presencial"; memberId: string };
  room: { name: string; capacity: string; location: string; resources: string };
  reservation: { roomId: string; title: string; kind: string; reservedDate: string; startTime: string; endTime: string };
  meeting: { title: string; meetingDate: string; time: string; location: string; authorId: string; status: "agendada" | "realizada"; ministryId: string; attendeeId: string; agenda: string; minutes: string; action: string; assigneeId: string };
  rehearsal: { ministryId: string; title: string; kind: string; rehearsalDate: string; time: string; location: string; recurrence: string; audience: string; attendeeId: string; repertoire: string; notes: string };
  checkin: { eventId: string; personId: string; positionId: string; status: "ok" | "wait" | "no" };
  comment: { cardId: string; author: string; body: string };
};

const initialForms: Forms = {
  settings: { groupSingular: "", groupPlural: "", contactEmail: "", contactPhone: "", checkinExtra: false },
  identity: { purpose: "", mission: "", vision: "", verse: "", values: "" },
  cycle: { year: "", theme: "", verse: "", body: "", objectives: "", isActive: false },
  history: { year: "", title: "", body: "", link: "" },
  title: { name: "" },
  tag: { name: "", color: "wheat", leaders: "" },
  group: { name: "", leaderId: "", weekday: "", time: "", neighborhood: "" },
  announcement: { title: "", audience: "", body: "", author: "", whenLabel: "" },
  wall: { author: "", audience: "", body: "", pinned: false, channels: "app" },
  prayer: { memberId: "", kind: "oracao", body: "", status: "aberto", isPrivate: false },
  baptism: { label: "", baptismDate: "", location: "", status: "aberta", pastor: "", notes: "", openEnrollment: true, memberId: "", decisionId: "" },
  course: { name: "", kind: "trilha", level: "", color: "olive", description: "", category: "entrada", moduleName: "", lessonName: "", lessonDuration: "", lessonKind: "texto", memberId: "" },
  room: { name: "", capacity: "", location: "", resources: "" },
  reservation: { roomId: "", title: "", kind: "outro", reservedDate: "", startTime: "", endTime: "" },
  meeting: { title: "", meetingDate: "", time: "", location: "", authorId: "", status: "agendada", ministryId: "", attendeeId: "", agenda: "", minutes: "", action: "", assigneeId: "" },
  rehearsal: { ministryId: "", title: "", kind: "louvor", rehearsalDate: "", time: "", location: "", recurrence: "", audience: "", attendeeId: "", repertoire: "", notes: "" },
  checkin: { eventId: "", personId: "", positionId: "", status: "ok" },
  comment: { cardId: "", author: "", body: "" },
};

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) return "O banco bloqueou a ação por segurança. Confirme seu papel na organização.";
  if (lower.includes("violates foreign key")) return "Algum vínculo não foi encontrado. Confira igreja, pessoa, membro, sala, curso ou ministério.";
  if (lower.includes("duplicate key")) return "Este vínculo já existe.";
  return message || "Não conseguimos salvar agora.";
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function rowsToOptions(rows: AnyRow[], label = "name") {
  return rows.map((row) => ({ id: String(row.id), name: String(row[label] ?? row.title ?? row.label ?? row.id) }));
}

export default function RemainingServiceManager({ churchId, organizationId, people, members, ministries, events }: RemainingServiceManagerProps) {
  const supabase = createServiceBrowserClient();
  const [forms, setForms] = useState<Forms>(initialForms);
  const [rows, setRows] = useState<Record<string, AnyRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roomOptions = rowsToOptions(rows.rooms ?? []);
  const decisionOptions = rowsToOptions(rows.decisions ?? []);
  const positionOptions = rowsToOptions(rows.ministry_positions ?? []);
  const cardOptions = rowsToOptions(rows.cards ?? [], "title");

  function setField<T extends keyof Forms, K extends keyof Forms[T]>(section: T, key: K, value: Forms[T][K]) {
    setForms((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  }

  async function readTable(table: string, select = "*") {
    const { data, error: readError } = await supabase.schema("service").from(table).select(select).order("created_at", { ascending: false });
    if (readError) throw readError;
    return (data ?? []) as unknown as AnyRow[];
  }

  async function readTableBySort(table: string, select = "*") {
    const { data, error: readError } = await supabase.schema("service").from(table).select(select).order("sort_order", { ascending: true });
    if (readError) throw readError;
    return (data ?? []) as unknown as AnyRow[];
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [
        identity,
        churches,
        cycles,
        history,
        titles,
        tags,
        groups,
        announcements,
        wall,
        prayers,
        decisions,
        baptismClasses,
        baptismCandidates,
        courses,
        modules,
        lessons,
        enrollments,
        rooms,
        reservations,
        meetings,
        actions,
        rehearsals,
        roster,
        positions,
        cards,
        comments,
      ] = await Promise.all([
        supabase.schema("service").from("church_identity").select("*").eq("church_id", churchId).maybeSingle(),
        supabase.schema("service").from("churches").select("id,settings").eq("id", churchId).maybeSingle(),
        readTable("cycles"),
        readTable("history_entries"),
        readTable("ministerial_titles"),
        readTable("tags"),
        readTable("fellowship_groups"),
        readTable("announcements"),
        readTable("wall_posts"),
        readTable("prayer_requests"),
        readTable("decisions"),
        readTable("baptism_classes"),
        readTable("baptism_candidates"),
        readTable("courses"),
        readTableBySort("course_modules"),
        readTableBySort("course_lessons"),
        readTable("enrollments"),
        readTable("rooms"),
        readTable("reservations"),
        readTable("meetings"),
        readTable("meeting_actions"),
        readTable("rehearsals"),
        readTable("roster_assignments"),
        readTable("ministry_positions"),
        readTable("cards"),
        readTable("card_comments"),
      ]);
      if (identity.error) throw identity.error;
      if (churches.error) throw churches.error;
      setRows({
        church_identity: identity.data ? [identity.data as AnyRow] : [],
        churches: churches.data ? [churches.data as AnyRow] : [],
        cycles,
        history_entries: history,
        ministerial_titles: titles,
        tags,
        fellowship_groups: groups,
        announcements,
        wall_posts: wall,
        prayer_requests: prayers,
        decisions,
        baptism_classes: baptismClasses,
        baptism_candidates: baptismCandidates,
        courses,
        course_modules: modules,
        course_lessons: lessons,
        enrollments,
        rooms,
        reservations,
        meetings,
        meeting_actions: actions,
        rehearsals,
        roster_assignments: roster,
        ministry_positions: positions,
        cards,
        card_comments: comments,
      });
    } catch (loadError) {
      setError(friendlyError(loadError instanceof Error ? loadError.message : ""));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSave(fn: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await fn();
      await loadAll();
    } catch (saveError) {
      setError(friendlyError(saveError instanceof Error ? saveError.message : ""));
    } finally {
      setLoading(false);
    }
  }

  async function deleteRow(table: string, id: unknown) {
    if (!id || !window.confirm("Excluir este registro?")) return;
    await runSave(async () => {
      const { error: deleteError } = await supabase.schema("service").from(table).delete().eq("id", id);
      if (deleteError) throw deleteError;
    });
  }

  async function updateRow(table: string, id: unknown, payload: Record<string, unknown>) {
    if (!id) return;
    await runSave(async () => {
      const { error: updateError } = await supabase.schema("service").from(table).update(payload).eq("id", id);
      if (updateError) throw updateError;
    });
  }

  async function saveIdentity() {
    await runSave(async () => {
      const identity = forms.identity;
      const { error: saveError } = await supabase.schema("service").from("church_identity").upsert({
        church_id: churchId,
        organization_id: organizationId,
        purpose: identity.purpose.trim() || null,
        mission: identity.mission.trim() || null,
        vision: identity.vision.trim() || null,
        verse: identity.verse.trim() || null,
        values: splitList(identity.values).map((title) => ({ title })),
        updated_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      setForms((current) => ({ ...current, identity: initialForms.identity }));
    });
  }

  async function saveSettings() {
    const form = forms.settings;
    await runSave(async () => {
      const current = (rows.churches?.[0]?.settings ?? {}) as Record<string, unknown>;
      const { error: saveError } = await supabase.schema("service").from("churches").update({
        settings: {
          ...current,
          grupos: {
            termo: form.groupSingular.trim() || "grupo",
            termoP: form.groupPlural.trim() || "grupos",
          },
          contato: {
            email: form.contactEmail.trim() || null,
            telefone: form.contactPhone.trim() || null,
          },
          checkin: {
            permitirExtra: form.checkinExtra,
          },
        },
        updated_at: new Date().toISOString(),
      }).eq("id", churchId);
      if (saveError) throw saveError;
      setForms((currentForms) => ({ ...currentForms, settings: initialForms.settings }));
    });
  }

  async function saveCycle() {
    const form = forms.cycle;
    if (!form.year.trim() || !form.theme.trim()) throw new Error("Informe ano e tema do ciclo.");
    await saveSimple("cycles", {
      organization_id: organizationId,
      church_id: churchId,
      year: form.year.trim(),
      theme: form.theme.trim(),
      verse: form.verse.trim() || null,
      body: form.body.trim() || null,
      objectives: splitList(form.objectives).map((title) => ({ title })),
      is_active: form.isActive,
    }, "cycle");
  }

  async function saveSimple(table: string, payload: Record<string, unknown>, resetKey: keyof Forms) {
    await runSave(async () => {
      const { error: saveError } = await supabase.schema("service").from(table).insert(payload);
      if (saveError) throw saveError;
      setForms((current) => ({ ...current, [resetKey]: initialForms[resetKey] }));
    });
  }

  async function saveBaptism() {
    const form = forms.baptism;
    if (!form.label.trim()) throw new Error("Digite o nome da turma de batismo.");
    await runSave(async () => {
      const { data: created, error: classError } = await supabase.schema("service").from("baptism_classes").insert({
        organization_id: organizationId,
        church_id: churchId,
        label: form.label.trim(),
        baptism_date: form.baptismDate.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
        pastor: form.pastor.trim() || null,
        notes: form.notes.trim() || null,
        open_enrollment: form.openEnrollment,
      }).select("id").single();
      if (classError) throw classError;
      if (form.memberId || form.decisionId) {
        const { error: candidateError } = await supabase.schema("service").from("baptism_candidates").insert({
          organization_id: organizationId,
          class_id: created.id,
          member_id: form.memberId || null,
          decision_id: form.decisionId || null,
        });
        if (candidateError) throw candidateError;
      }
      setForms((current) => ({ ...current, baptism: initialForms.baptism }));
    });
  }

  async function saveCourse() {
    const form = forms.course;
    if (!form.name.trim()) throw new Error("Digite o nome do curso.");
    await runSave(async () => {
      const { data: course, error: courseError } = await supabase.schema("service").from("courses").insert({
        organization_id: organizationId,
        church_id: churchId,
        name: form.name.trim(),
        kind: form.kind,
        level: form.level.trim() || null,
        color: form.color.trim() || "olive",
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        prereqs: [],
      }).select("id").single();
      if (courseError) throw courseError;
      let moduleId = "";
      if (form.moduleName.trim()) {
        const { data: moduleRow, error: moduleError } = await supabase.schema("service").from("course_modules").insert({
          organization_id: organizationId,
          course_id: course.id,
          name: form.moduleName.trim(),
          sort_order: 1,
        }).select("id").single();
        if (moduleError) throw moduleError;
        moduleId = moduleRow.id;
      }
      if (moduleId && form.lessonName.trim()) {
        const { error: lessonError } = await supabase.schema("service").from("course_lessons").insert({
          organization_id: organizationId,
          module_id: moduleId,
          name: form.lessonName.trim(),
          duration: form.lessonDuration.trim() || null,
          kind: form.lessonKind,
          sort_order: 1,
        });
        if (lessonError) throw lessonError;
      }
      if (form.memberId) {
        const { error: enrollmentError } = await supabase.schema("service").from("enrollments").insert({
          organization_id: organizationId,
          course_id: course.id,
          member_id: form.memberId,
          done_count: 0,
          status: "cursando",
        });
        if (enrollmentError) throw enrollmentError;
      }
      setForms((current) => ({ ...current, course: initialForms.course }));
    });
  }

  async function saveReservation() {
    const form = forms.reservation;
    if (!form.roomId || !form.title.trim()) throw new Error("Escolha uma sala e informe o título.");
    await saveSimple("reservations", {
      organization_id: organizationId,
      room_id: form.roomId,
      title: form.title.trim(),
      kind: form.kind.trim() || "outro",
      reserved_date: form.reservedDate.trim() || null,
      start_time: form.startTime.trim() || null,
      end_time: form.endTime.trim() || null,
    }, "reservation");
  }

  async function saveMeeting() {
    const form = forms.meeting;
    if (!form.title.trim()) throw new Error("Digite o título da reunião.");
    await runSave(async () => {
      const { data: meeting, error: meetingError } = await supabase.schema("service").from("meetings").insert({
        organization_id: organizationId,
        church_id: churchId,
        title: form.title.trim(),
        meeting_date: form.meetingDate.trim() || null,
        time: form.time.trim() || null,
        location: form.location.trim() || null,
        author_id: form.authorId || null,
        status: form.status,
        ministries: form.ministryId ? [form.ministryId] : [],
        attendees: form.attendeeId ? [form.attendeeId] : [],
        agenda: splitList(form.agenda).map((item) => ({ item })),
        minutes: form.minutes.trim() || null,
      }).select("id").single();
      if (meetingError) throw meetingError;
      if (form.action.trim()) {
        const { error: actionError } = await supabase.schema("service").from("meeting_actions").insert({
          organization_id: organizationId,
          meeting_id: meeting.id,
          description: form.action.trim(),
          assignee_id: form.assigneeId || null,
          status: "pendente",
        });
        if (actionError) throw actionError;
      }
      setForms((current) => ({ ...current, meeting: initialForms.meeting }));
    });
  }

  async function saveCheckin() {
    const form = forms.checkin;
    if (!form.eventId || !form.personId || !form.positionId) throw new Error("Escolha evento, pessoa e função.");
    await runSave(async () => {
      const { error: upsertError } = await supabase.schema("service").from("roster_assignments").upsert({
        organization_id: organizationId,
        event_id: form.eventId,
        position_id: form.positionId,
        person_id: form.personId,
        status: form.status,
        updated_at: new Date().toISOString(),
      }, { onConflict: "event_id,position_id,person_id" });
      if (upsertError) throw upsertError;
    });
  }

  async function saveCardComment() {
    const form = forms.comment;
    if (!form.cardId || !form.body.trim()) throw new Error("Escolha o card e escreva o comentário.");
    await saveSimple("card_comments", {
      organization_id: organizationId,
      card_id: form.cardId,
      author: form.author.trim() || "Equipe",
      body: form.body.trim(),
    }, "comment");
  }

  const report = {
    groups: rows.fellowship_groups?.length ?? 0,
    courses: rows.courses?.length ?? 0,
    enrollments: rows.enrollments?.length ?? 0,
    rooms: rows.rooms?.length ?? 0,
    meetings: rows.meetings?.length ?? 0,
    rehearsals: rows.rehearsals?.length ?? 0,
    announcements: rows.announcements?.length ?? 0,
    prayers: rows.prayer_requests?.length ?? 0,
    checkins: (rows.roster_assignments ?? []).filter((item) => item.status === "ok").length,
    tags: rows.tags?.length ?? 0,
    cycles: rows.cycles?.length ?? 0,
  };

  const baptismStatus = ["aberta", "preparacao", "agendada", "concluida"];
  const prayerStatus = ["aberto", "em_contato", "resolvido"];
  const meetingStatus = ["agendada", "realizada"];
  const actionStatus = ["pendente", "andamento", "feito"];
  const enrollmentStatus = ["cursando", "concluido"];
  const rosterStatus = ["ok", "wait", "no"];

  return (
    <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
      {error && <p className="field-error">{error}</p>}

      <section className="card">
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ IDENTIDADE · CONFIGURAÇÃO</p>
          <QuickForm title="Configurações da igreja" button="Salvar configurações" onSave={saveSettings}>
            <input className="input" placeholder="Termo singular: GC" value={forms.settings.groupSingular} onChange={(event) => setField("settings", "groupSingular", event.target.value)} />
            <input className="input" placeholder="Termo plural: GCs" value={forms.settings.groupPlural} onChange={(event) => setField("settings", "groupPlural", event.target.value)} />
            <input className="input" placeholder="E-mail de contato" value={forms.settings.contactEmail} onChange={(event) => setField("settings", "contactEmail", event.target.value)} />
            <input className="input" placeholder="Telefone de contato" value={forms.settings.contactPhone} onChange={(event) => setField("settings", "contactPhone", event.target.value)} />
            <label className="service-check-row"><input type="checkbox" checked={forms.settings.checkinExtra} onChange={(event) => setField("settings", "checkinExtra", event.target.checked)} />Permitir check-in de pessoa não escalada</label>
          </QuickForm>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label">Propósito</span><input className="input" value={forms.identity.purpose} onChange={(event) => setField("identity", "purpose", event.target.value)} /></label>
            <label className="field"><span className="field-label">Missão</span><input className="input" value={forms.identity.mission} onChange={(event) => setField("identity", "mission", event.target.value)} /></label>
            <label className="field"><span className="field-label">Visão</span><input className="input" value={forms.identity.vision} onChange={(event) => setField("identity", "vision", event.target.value)} /></label>
          </div>
          <label className="field"><span className="field-label">Versículo e valores</span><input className="input" value={forms.identity.verse} onChange={(event) => setField("identity", "verse", event.target.value)} placeholder="Versículo" /><input className="input" style={{ marginTop: 8 }} value={forms.identity.values} onChange={(event) => setField("identity", "values", event.target.value)} placeholder="Valores separados por vírgula" /></label>
          <button className="btn btn-primary" type="button" onClick={saveIdentity} disabled={loading}>Salvar identidade</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <QuickForm title="Ciclo anual" button="Criar ciclo" onSave={saveCycle}>
              <input className="input" placeholder="Ano" value={forms.cycle.year} onChange={(event) => setField("cycle", "year", event.target.value)} />
              <input className="input" placeholder="Tema" value={forms.cycle.theme} onChange={(event) => setField("cycle", "theme", event.target.value)} />
              <input className="input" placeholder="Versículo" value={forms.cycle.verse} onChange={(event) => setField("cycle", "verse", event.target.value)} />
              <input className="input" placeholder="Objetivos separados por vírgula" value={forms.cycle.objectives} onChange={(event) => setField("cycle", "objectives", event.target.value)} />
              <label className="service-check-row"><input type="checkbox" checked={forms.cycle.isActive} onChange={(event) => setField("cycle", "isActive", event.target.checked)} />Ciclo ativo</label>
            </QuickForm>
            <QuickForm title="História" button="Criar marco" onSave={() => saveSimple("history_entries", { organization_id: organizationId, church_id: churchId, year: forms.history.year || null, title: forms.history.title, body: forms.history.body || null, link: forms.history.link || null }, "history")}>
              <input className="input" placeholder="Ano" value={forms.history.year} onChange={(event) => setField("history", "year", event.target.value)} />
              <input className="input" placeholder="Título" value={forms.history.title} onChange={(event) => setField("history", "title", event.target.value)} />
              <input className="input" placeholder="Texto" value={forms.history.body} onChange={(event) => setField("history", "body", event.target.value)} />
            </QuickForm>
            <QuickForm title="Título ministerial" button="Criar título" onSave={() => saveSimple("ministerial_titles", { organization_id: organizationId, church_id: churchId, name: forms.title.name }, "title")}>
              <input className="input" placeholder="Diácono" value={forms.title.name} onChange={(event) => setField("title", "name", event.target.value)} />
            </QuickForm>
            <QuickForm title="Tag ou frente" button="Criar tag" onSave={() => saveSimple("tags", { organization_id: organizationId, church_id: churchId, name: forms.tag.name, color: forms.tag.color, leaders: splitList(forms.tag.leaders) }, "tag")}>
              <input className="input" placeholder="Jovens" value={forms.tag.name} onChange={(event) => setField("tag", "name", event.target.value)} />
              <input className="input" placeholder="Cor: wheat, clay, olive" value={forms.tag.color} onChange={(event) => setField("tag", "color", event.target.value)} />
              <input className="input" placeholder="IDs de líderes separados por vírgula" value={forms.tag.leaders} onChange={(event) => setField("tag", "leaders", event.target.value)} />
            </QuickForm>
            <QuickForm title="GC ou grupo" button="Criar grupo" onSave={() => saveSimple("fellowship_groups", { organization_id: organizationId, church_id: churchId, name: forms.group.name, leader_person_id: forms.group.leaderId || null, weekday: forms.group.weekday || null, time: forms.group.time || null, neighborhood: forms.group.neighborhood || null }, "group")}>
              <input className="input" placeholder="GC Centro" value={forms.group.name} onChange={(event) => setField("group", "name", event.target.value)} />
              <Select value={forms.group.leaderId} onChange={(value) => setField("group", "leaderId", value)} options={people} placeholder="Sem líder" />
              <input className="input" placeholder="Quarta · 20h · Centro" value={forms.group.neighborhood} onChange={(event) => setField("group", "neighborhood", event.target.value)} />
            </QuickForm>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ COMUNICAÇÃO · CUIDADO</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <QuickForm title="Aviso" button="Criar aviso" onSave={() => saveSimple("announcements", { organization_id: organizationId, church_id: churchId, title: forms.announcement.title, audience: forms.announcement.audience || null, body: forms.announcement.body || null, author: forms.announcement.author || null, when_label: forms.announcement.whenLabel || null }, "announcement")}>
              <input className="input" placeholder="Título" value={forms.announcement.title} onChange={(event) => setField("announcement", "title", event.target.value)} />
              <input className="input" placeholder="Público" value={forms.announcement.audience} onChange={(event) => setField("announcement", "audience", event.target.value)} />
              <input className="input" placeholder="Texto" value={forms.announcement.body} onChange={(event) => setField("announcement", "body", event.target.value)} />
            </QuickForm>
            <QuickForm title="Mural" button="Publicar" onSave={() => saveSimple("wall_posts", { organization_id: organizationId, church_id: churchId, author: forms.wall.author || null, audience: forms.wall.audience || null, body: forms.wall.body, pinned: forms.wall.pinned, channels: splitList(forms.wall.channels) }, "wall")}>
              <input className="input" placeholder="Autor" value={forms.wall.author} onChange={(event) => setField("wall", "author", event.target.value)} />
              <input className="input" placeholder="Texto" value={forms.wall.body} onChange={(event) => setField("wall", "body", event.target.value)} />
              <label className="service-check-row"><input type="checkbox" checked={forms.wall.pinned} onChange={(event) => setField("wall", "pinned", event.target.checked)} />Fixar no mural</label>
            </QuickForm>
            <QuickForm title="Pedido de oração" button="Registrar pedido" onSave={() => saveSimple("prayer_requests", { organization_id: organizationId, church_id: churchId, member_id: forms.prayer.memberId || null, kind: forms.prayer.kind, body: forms.prayer.body, status: forms.prayer.status, is_private: forms.prayer.isPrivate }, "prayer")}>
              <Select value={forms.prayer.memberId} onChange={(value) => setField("prayer", "memberId", value)} options={members} placeholder="Sem membro" />
              <input className="input" placeholder="Pedido" value={forms.prayer.body} onChange={(event) => setField("prayer", "body", event.target.value)} />
              <label className="service-check-row"><input type="checkbox" checked={forms.prayer.isPrivate} onChange={(event) => setField("prayer", "isPrivate", event.target.checked)} />Privado</label>
            </QuickForm>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ BATISMOS · CURSOS</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <QuickForm title="Turma de batismo" button="Criar turma" onSave={saveBaptism}>
              <input className="input" placeholder="Turma julho" value={forms.baptism.label} onChange={(event) => setField("baptism", "label", event.target.value)} />
              <input className="input" placeholder="Data do batismo" value={forms.baptism.baptismDate} onChange={(event) => setField("baptism", "baptismDate", event.target.value)} />
              <input className="input" placeholder="Local" value={forms.baptism.location} onChange={(event) => setField("baptism", "location", event.target.value)} />
              <Select value={forms.baptism.memberId} onChange={(value) => setField("baptism", "memberId", value)} options={members} placeholder="Candidato membro" />
              <Select value={forms.baptism.decisionId} onChange={(value) => setField("baptism", "decisionId", value)} options={decisionOptions} placeholder="Candidato decisão" />
            </QuickForm>
            <QuickForm title="Curso interno" button="Criar curso" onSave={saveCourse}>
              <input className="input" placeholder="Fundamentos" value={forms.course.name} onChange={(event) => setField("course", "name", event.target.value)} />
              <input className="input" placeholder="Nível" value={forms.course.level} onChange={(event) => setField("course", "level", event.target.value)} />
              <input className="input" placeholder="Descrição" value={forms.course.description} onChange={(event) => setField("course", "description", event.target.value)} />
              <input className="input" placeholder="Módulo inicial" value={forms.course.moduleName} onChange={(event) => setField("course", "moduleName", event.target.value)} />
              <input className="input" placeholder="Aula inicial" value={forms.course.lessonName} onChange={(event) => setField("course", "lessonName", event.target.value)} />
              <Select value={forms.course.memberId} onChange={(value) => setField("course", "memberId", value)} options={members} placeholder="Matricular membro" />
            </QuickForm>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ ESPAÇOS · REUNIÕES · ENSAIOS</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <QuickForm title="Sala" button="Criar sala" onSave={() => saveSimple("rooms", { organization_id: organizationId, church_id: churchId, name: forms.room.name, capacity: Number.parseInt(forms.room.capacity, 10) || null, location: forms.room.location || null, resources: splitList(forms.room.resources) }, "room")}>
              <input className="input" placeholder="Sala 1" value={forms.room.name} onChange={(event) => setField("room", "name", event.target.value)} />
              <input className="input" placeholder="Capacidade" value={forms.room.capacity} onChange={(event) => setField("room", "capacity", event.target.value)} />
              <input className="input" placeholder="Recursos" value={forms.room.resources} onChange={(event) => setField("room", "resources", event.target.value)} />
            </QuickForm>
            <QuickForm title="Reserva" button="Criar reserva" onSave={saveReservation}>
              <Select value={forms.reservation.roomId} onChange={(value) => setField("reservation", "roomId", value)} options={roomOptions} placeholder="Escolha sala" />
              <input className="input" placeholder="Título" value={forms.reservation.title} onChange={(event) => setField("reservation", "title", event.target.value)} />
              <input className="input" placeholder="Data" value={forms.reservation.reservedDate} onChange={(event) => setField("reservation", "reservedDate", event.target.value)} />
            </QuickForm>
            <QuickForm title="Reunião" button="Criar reunião" onSave={saveMeeting}>
              <input className="input" placeholder="Reunião de líderes" value={forms.meeting.title} onChange={(event) => setField("meeting", "title", event.target.value)} />
              <input className="input" placeholder="Data" value={forms.meeting.meetingDate} onChange={(event) => setField("meeting", "meetingDate", event.target.value)} />
              <Select value={forms.meeting.authorId} onChange={(value) => setField("meeting", "authorId", value)} options={people} placeholder="Autor" />
              <input className="input" placeholder="Pauta separada por vírgula" value={forms.meeting.agenda} onChange={(event) => setField("meeting", "agenda", event.target.value)} />
              <input className="input" placeholder="Ação" value={forms.meeting.action} onChange={(event) => setField("meeting", "action", event.target.value)} />
            </QuickForm>
            <QuickForm title="Ensaio" button="Criar ensaio" onSave={() => saveSimple("rehearsals", { organization_id: organizationId, church_id: churchId, ministry_id: forms.rehearsal.ministryId || null, title: forms.rehearsal.title, kind: forms.rehearsal.kind || "louvor", rehearsal_date: forms.rehearsal.rehearsalDate || null, time: forms.rehearsal.time || null, location: forms.rehearsal.location || null, recurrence: forms.rehearsal.recurrence || null, audience: forms.rehearsal.audience || null, attendees: forms.rehearsal.attendeeId ? [forms.rehearsal.attendeeId] : [], repertoire: splitList(forms.rehearsal.repertoire).map((title) => ({ title })), notes: forms.rehearsal.notes || null }, "rehearsal")}>
              <Select value={forms.rehearsal.ministryId} onChange={(value) => setField("rehearsal", "ministryId", value)} options={ministries} placeholder="Ministério" />
              <input className="input" placeholder="Ensaio de louvor" value={forms.rehearsal.title} onChange={(event) => setField("rehearsal", "title", event.target.value)} />
              <input className="input" placeholder="Repertório" value={forms.rehearsal.repertoire} onChange={(event) => setField("rehearsal", "repertoire", event.target.value)} />
            </QuickForm>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ CHECK-IN · RELATÓRIOS</p>
          <QuickForm title="Check-in por escala" button="Salvar check-in" onSave={saveCheckin}>
            <Select value={forms.checkin.eventId} onChange={(value) => setField("checkin", "eventId", value)} options={events} placeholder="Evento" />
            <Select value={forms.checkin.positionId} onChange={(value) => setField("checkin", "positionId", value)} options={positionOptions} placeholder="Função" />
            <Select value={forms.checkin.personId} onChange={(value) => setField("checkin", "personId", value)} options={people} placeholder="Pessoa" />
          </QuickForm>
          <QuickForm title="Comentário de card" button="Comentar card" onSave={saveCardComment}>
            <Select value={forms.comment.cardId} onChange={(value) => setField("comment", "cardId", value)} options={cardOptions} placeholder="Card" />
            <input className="input" placeholder="Autor" value={forms.comment.author} onChange={(event) => setField("comment", "author", event.target.value)} />
            <input className="input" placeholder="Comentário" value={forms.comment.body} onChange={(event) => setField("comment", "body", event.target.value)} />
          </QuickForm>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {Object.entries(report).map(([key, value]) => (
              <div className="card" key={key}>
                <div className="card-body">
                  <p className="eyebrow" style={{ color: "var(--muted)" }}>◆ {key.toUpperCase()}</p>
                  <strong className="t-h3" style={{ color: "var(--cream)" }}>{value}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ REGISTROS CRIADOS</p>
          <RecordList title="História" rows={rows.history_entries ?? []} onDelete={(id) => deleteRow("history_entries", id)} />
          <RecordList title="Ciclos" rows={rows.cycles ?? []} onDelete={(id) => deleteRow("cycles", id)} />
          <RecordList title="Títulos ministeriais" rows={rows.ministerial_titles ?? []} onDelete={(id) => deleteRow("ministerial_titles", id)} />
          <RecordList title="Tags" rows={rows.tags ?? []} onDelete={(id) => deleteRow("tags", id)} />
          <RecordList title="Grupos" rows={rows.fellowship_groups ?? []} onDelete={(id) => deleteRow("fellowship_groups", id)} />
          <RecordList title="Avisos" rows={rows.announcements ?? []} onDelete={(id) => deleteRow("announcements", id)} />
          <RecordList title="Mural" rows={rows.wall_posts ?? []} onDelete={(id) => deleteRow("wall_posts", id)} />
          <RecordList title="Pedidos" rows={rows.prayer_requests ?? []} statusOptions={prayerStatus} onStatusChange={(id, status) => updateRow("prayer_requests", id, { status })} onDelete={(id) => deleteRow("prayer_requests", id)} />
          <RecordList title="Batismos" rows={rows.baptism_classes ?? []} statusOptions={baptismStatus} onStatusChange={(id, status) => updateRow("baptism_classes", id, { status })} onDelete={(id) => deleteRow("baptism_classes", id)} />
          <RecordList title="Candidatos ao batismo" rows={rows.baptism_candidates ?? []} onDelete={(id) => deleteRow("baptism_candidates", id)} />
          <RecordList title="Cursos" rows={rows.courses ?? []} onDelete={(id) => deleteRow("courses", id)} />
          <RecordList title="Módulos dos cursos" rows={rows.course_modules ?? []} onDelete={(id) => deleteRow("course_modules", id)} />
          <RecordList title="Aulas dos cursos" rows={rows.course_lessons ?? []} onDelete={(id) => deleteRow("course_lessons", id)} />
          <RecordList title="Matrículas" rows={rows.enrollments ?? []} statusOptions={enrollmentStatus} onStatusChange={(id, status) => updateRow("enrollments", id, { status })} onDelete={(id) => deleteRow("enrollments", id)} />
          <RecordList title="Salas" rows={rows.rooms ?? []} onDelete={(id) => deleteRow("rooms", id)} />
          <RecordList title="Reservas" rows={rows.reservations ?? []} onDelete={(id) => deleteRow("reservations", id)} />
          <RecordList title="Reuniões" rows={rows.meetings ?? []} statusOptions={meetingStatus} onStatusChange={(id, status) => updateRow("meetings", id, { status })} onDelete={(id) => deleteRow("meetings", id)} />
          <RecordList title="Ações de reunião" rows={rows.meeting_actions ?? []} statusOptions={actionStatus} onStatusChange={(id, status) => updateRow("meeting_actions", id, { status })} onDelete={(id) => deleteRow("meeting_actions", id)} />
          <RecordList title="Ensaios" rows={rows.rehearsals ?? []} onDelete={(id) => deleteRow("rehearsals", id)} />
          <RecordList title="Check-ins e escalas" rows={rows.roster_assignments ?? []} statusOptions={rosterStatus} onStatusChange={(id, status) => updateRow("roster_assignments", id, { status })} onDelete={(id) => deleteRow("roster_assignments", id)} />
          <RecordList title="Comentários de card" rows={rows.card_comments ?? []} onDelete={(id) => deleteRow("card_comments", id)} />
        </div>
      </section>
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: Option[]; placeholder: string }) {
  return (
    <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option value={option.id} key={option.id}>{option.name}</option>
      ))}
    </select>
  );
}

function QuickForm({ title, button, onSave, children }: { title: string; button: string; onSave: () => void | Promise<void>; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p className="field-label">{title}</p>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>{children}</div>
      <button className="btn btn-primary btn-sm" type="button" onClick={() => void onSave()} style={{ marginTop: 10 }}>{button}</button>
    </div>
  );
}

function rowTitle(row: AnyRow) {
  return String(row.name ?? row.title ?? row.label ?? row.description ?? row.body ?? row.id);
}

function rowMeta(row: AnyRow) {
  const parts = [
    row.status,
    row.kind,
    row.year,
    row.baptism_date,
    row.reserved_date,
    row.meeting_date,
    row.rehearsal_date,
    row.location,
    row.capacity ? `${row.capacity} lugares` : "",
  ].filter(Boolean);
  return parts.length ? parts.map(String).join(" · ") : "ativo";
}

function RecordList({
  title,
  rows,
  statusOptions,
  onStatusChange,
  onDelete,
}: {
  title: string;
  rows: AnyRow[];
  statusOptions?: string[];
  onStatusChange?: (id: unknown, status: string) => void;
  onDelete: (id: unknown) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <p className="field-label">{title} · {rows.length}</p>
      {!rows.length && (
        <div className="card card-cream">
          <div className="card-body">
            <p className="t-small" style={{ color: "var(--subtle)" }}>Sem registros por enquanto.</p>
          </div>
        </div>
      )}
      {rows.slice(0, 8).map((row) => (
        <div className="card card-cream" key={String(row.id)}>
          <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "var(--ink)" }}>{rowTitle(row)}</strong>
              <p className="t-small" style={{ color: "var(--subtle)", marginTop: 4 }}>{rowMeta(row)}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {statusOptions && onStatusChange && (
                <select className="select" value={String(row.status ?? "")} onChange={(event) => onStatusChange(row.id, event.target.value)} style={{ minHeight: 36, width: 150 }}>
                  <option value="">Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              )}
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => onDelete(row.id)}>Excluir</button>
            </div>
          </div>
        </div>
      ))}
      {rows.length > 8 && <p className="t-small" style={{ color: "var(--subtle)" }}>Mostrando os 8 registros mais recentes.</p>}
    </div>
  );
}
