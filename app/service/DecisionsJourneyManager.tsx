"use client";

import { useEffect, useMemo, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type PersonOption = { id: string; name: string };
type MemberOption = { id: string; name: string; journey: number[] };

type Decision = {
  id: string;
  name: string;
  phone: string | null;
  happened_on: string | null;
  kind: "decisao" | "reconciliacao" | null;
  service_name: string | null;
  responsible_id: string | null;
  status: "novo" | "acompanhando" | "encaminhado";
  member_id: string | null;
  age: number | null;
  notes: string | null;
};

type TimelineEvent = {
  id: string;
  member_id: string;
  event_type: string;
  title: string;
  body: string | null;
  by_whom: string | null;
  when_label: string | null;
};

type DecisionsJourneyManagerProps = {
  people: PersonOption[];
  members: MemberOption[];
  churchId?: string;
  organizationId?: string;
};

type DecisionForm = {
  name: string;
  phone: string;
  happenedOn: string;
  kind: "decisao" | "reconciliacao";
  serviceName: string;
  responsibleId: string;
  status: Decision["status"];
  memberId: string;
  age: string;
  notes: string;
};

type JourneyForm = {
  memberId: string;
  decisao: boolean;
  batismo: boolean;
  fundamentos: boolean;
  gc: boolean;
  servindo: boolean;
  title: string;
  body: string;
  whenLabel: string;
};

const EMPTY_DECISION: DecisionForm = {
  name: "",
  phone: "",
  happenedOn: "",
  kind: "decisao",
  serviceName: "",
  responsibleId: "",
  status: "novo",
  memberId: "",
  age: "",
  notes: "",
};

const EMPTY_JOURNEY: JourneyForm = {
  memberId: "",
  decisao: false,
  batismo: false,
  fundamentos: false,
  gc: false,
  servindo: false,
  title: "",
  body: "",
  whenLabel: "",
};

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a gravação por segurança. Confirme se você está logado com permissão.";
  }
  if (lower.includes("violates foreign key")) return "Pessoa, membro, igreja ou organização não encontrado.";
  return message || "Não conseguimos salvar decisões ou jornada agora.";
}

function sortKeyFromLabel(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number.parseInt(digits.slice(0, 8), 10) : null;
}

export default function DecisionsJourneyManager({ people, members, churchId, organizationId }: DecisionsJourneyManagerProps) {
  const supabase = createServiceBrowserClient();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [decisionForm, setDecisionForm] = useState<DecisionForm>(EMPTY_DECISION);
  const [journeyForm, setJourneyForm] = useState<JourneyForm>(EMPTY_JOURNEY);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const peopleNames = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people]);
  const memberNames = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);

  async function loadData() {
    setLoading(true);
    setError("");
    const { data: decisionData, error: decisionError } = await supabase
      .schema("service")
      .from("decisions")
      .select("id,name,phone,happened_on,kind,service_name,responsible_id,status,member_id,age,notes")
      .order("created_at", { ascending: false });
    if (decisionError) {
      setLoading(false);
      setError(friendlyError(decisionError.message));
      return;
    }
    const { data: timelineData, error: timelineError } = await supabase
      .schema("service")
      .from("timeline_events")
      .select("id,member_id,event_type,title,body,by_whom,when_label")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (timelineError) {
      setError(friendlyError(timelineError.message));
      return;
    }
    setDecisions((decisionData ?? []) as Decision[]);
    setTimeline((timelineData ?? []) as TimelineEvent[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDecisionField<K extends keyof DecisionForm>(key: K, value: DecisionForm[K]) {
    setDecisionForm((current) => ({ ...current, [key]: value }));
  }

  function setJourneyField<K extends keyof JourneyForm>(key: K, value: JourneyForm[K]) {
    setJourneyForm((current) => ({ ...current, [key]: value }));
  }

  async function saveDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!organizationId || !churchId) {
      setError("Nenhuma igreja encontrada para vincular a decisão.");
      return;
    }
    if (!decisionForm.name.trim()) {
      setError("Digite o nome da pessoa.");
      return;
    }

    setLoading(true);
    const age = Number.parseInt(decisionForm.age, 10);
    const payload = {
      name: decisionForm.name.trim(),
      phone: decisionForm.phone.trim() || null,
      happened_on: decisionForm.happenedOn.trim() || null,
      kind: decisionForm.kind,
      service_name: decisionForm.serviceName.trim() || null,
      responsible_id: decisionForm.responsibleId || null,
      status: decisionForm.status,
      member_id: decisionForm.memberId || null,
      age: Number.isFinite(age) ? age : null,
      notes: decisionForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.schema("service").from("decisions").update(payload).eq("id", editingId)
      : await supabase.schema("service").from("decisions").insert({ organization_id: organizationId, church_id: churchId, ...payload });
    setLoading(false);
    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    setDecisionForm(EMPTY_DECISION);
    setEditingId("");
    await loadData();
  }

  function editDecision(decision: Decision) {
    setError("");
    setEditingId(decision.id);
    setDecisionForm({
      name: decision.name,
      phone: decision.phone ?? "",
      happenedOn: decision.happened_on ?? "",
      kind: decision.kind ?? "decisao",
      serviceName: decision.service_name ?? "",
      responsibleId: decision.responsible_id ?? "",
      status: decision.status,
      memberId: decision.member_id ?? "",
      age: decision.age ? String(decision.age) : "",
      notes: decision.notes ?? "",
    });
  }

  async function deleteDecision(decision: Decision) {
    setError("");
    if (!window.confirm(`Excluir decisão de ${decision.name}?`)) return;
    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("decisions").delete().eq("id", decision.id);
    setLoading(false);
    if (deleteError) {
      setError(friendlyError(deleteError.message));
      return;
    }
    await loadData();
  }

  async function saveJourney(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!organizationId) {
      setError("Nenhuma organização encontrada para vincular a jornada.");
      return;
    }
    if (!journeyForm.memberId) {
      setError("Escolha um membro.");
      return;
    }
    const journey = [
      journeyForm.decisao ? 1 : 0,
      journeyForm.batismo ? 1 : 0,
      journeyForm.fundamentos ? 1 : 0,
      journeyForm.gc ? 1 : 0,
      journeyForm.servindo ? 1 : 0,
    ];
    setLoading(true);
    const { error: memberError } = await supabase
      .schema("service")
      .from("members")
      .update({ journey, updated_at: new Date().toISOString() })
      .eq("id", journeyForm.memberId);
    if (memberError) {
      setLoading(false);
      setError(friendlyError(memberError.message));
      return;
    }
    if (journeyForm.title.trim()) {
      const { error: timelineError } = await supabase.schema("service").from("timeline_events").insert({
        organization_id: organizationId,
        member_id: journeyForm.memberId,
        event_type: "jornada",
        title: journeyForm.title.trim(),
        body: journeyForm.body.trim() || null,
        by_whom: "Equipe",
        sort_key: sortKeyFromLabel(journeyForm.whenLabel),
        when_label: journeyForm.whenLabel.trim() || null,
      });
      if (timelineError) {
        setLoading(false);
        setError(friendlyError(timelineError.message));
        return;
      }
    }
    setLoading(false);
    setJourneyForm(EMPTY_JOURNEY);
    await loadData();
  }

  function loadMemberJourney(memberId: string) {
    const member = members.find((item) => item.id === memberId);
    const journey = member?.journey ?? [];
    setJourneyForm((current) => ({
      ...current,
      memberId,
      decisao: Boolean(journey[0]),
      batismo: Boolean(journey[1]),
      fundamentos: Boolean(journey[2]),
      gc: Boolean(journey[3]),
      servindo: Boolean(journey[4]),
    }));
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveDecision}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ {editingId ? "EDITAR DECISÃO" : "CRIAR DECISÃO"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label req">Nome</span><input className="input" value={decisionForm.name} onChange={(event) => setDecisionField("name", event.target.value)} placeholder="Lucas Pereira" /></label>
            <label className="field"><span className="field-label">Telefone</span><input className="input" value={decisionForm.phone} onChange={(event) => setDecisionField("phone", event.target.value)} placeholder="(11) 97777-0000" /></label>
            <label className="field"><span className="field-label">Data</span><input className="input" value={decisionForm.happenedOn} onChange={(event) => setDecisionField("happenedOn", event.target.value)} placeholder="2026-07-05" /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label">Tipo</span><select className="select" value={decisionForm.kind} onChange={(event) => setDecisionField("kind", event.target.value as DecisionForm["kind"])}><option value="decisao">decisão</option><option value="reconciliacao">reconciliação</option></select></label>
            <label className="field"><span className="field-label">Status</span><select className="select" value={decisionForm.status} onChange={(event) => setDecisionField("status", event.target.value as DecisionForm["status"])}><option value="novo">novo</option><option value="acompanhando">acompanhando</option><option value="encaminhado">encaminhado</option></select></label>
            <label className="field"><span className="field-label">Idade</span><input className="input" value={decisionForm.age} onChange={(event) => setDecisionField("age", event.target.value)} placeholder="28" /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label">Culto</span><input className="input" value={decisionForm.serviceName} onChange={(event) => setDecisionField("serviceName", event.target.value)} placeholder="Culto de domingo" /></label>
            <label className="field"><span className="field-label">Responsável</span><select className="select" value={decisionForm.responsibleId} onChange={(event) => setDecisionField("responsibleId", event.target.value)}><option value="">Sem responsável</option>{people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
            <label className="field"><span className="field-label">Membro</span><select className="select" value={decisionForm.memberId} onChange={(event) => setDecisionField("memberId", event.target.value)}><option value="">Sem vínculo</option>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
          </div>
          <label className="field"><span className="field-label">Notas</span><textarea className="textarea" rows={3} value={decisionForm.notes} onChange={(event) => setDecisionField("notes", event.target.value)} placeholder="Quer saber mais sobre batismo." /></label>
          {error && <p className="field-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : editingId ? "Salvar decisão" : "Criar decisão"}</button>
            {editingId && <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(""); setDecisionForm(EMPTY_DECISION); }} disabled={loading}>Cancelar</button>}
          </div>
        </div>
      </form>

      <form className="card" onSubmit={saveJourney}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ ATUALIZAR JORNADA</p>
          <label className="field"><span className="field-label req">Membro</span><select className="select" value={journeyForm.memberId} onChange={(event) => loadMemberJourney(event.target.value)}><option value="">Escolha</option>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {([["decisao", "Decisão"], ["batismo", "Batismo"], ["fundamentos", "Fundamentos"], ["gc", "GC"], ["servindo", "Servindo"]] as Array<[keyof JourneyForm, string]>).map(([key, label]) => (
              <label className="service-check-row" key={key}><input type="checkbox" checked={Boolean(journeyForm[key])} onChange={(event) => setJourneyField(key, event.target.checked as never)} />{label}</label>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label">Título do marco</span><input className="input" value={journeyForm.title} onChange={(event) => setJourneyField("title", event.target.value)} placeholder="Batismo concluído" /></label>
            <label className="field"><span className="field-label">Quando</span><input className="input" value={journeyForm.whenLabel} onChange={(event) => setJourneyField("whenLabel", event.target.value)} placeholder="2026-07-05" /></label>
          </div>
          <label className="field"><span className="field-label">Observação</span><input className="input" value={journeyForm.body} onChange={(event) => setJourneyField("body", event.target.value)} placeholder="Participou da turma de fundamentos." /></label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar jornada"}</button>
        </div>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {decisions.map((decision) => (
          <div className="card" key={decision.id}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ {decision.status}</p>
                <strong className="t-body-lg" style={{ color: "var(--cream)" }}>{decision.name}</strong>
                <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>{decision.kind ?? "decisão"} · {peopleNames.get(decision.responsible_id ?? "") ?? "sem responsável"} · {memberNames.get(decision.member_id ?? "") ?? "sem membro"}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => editDecision(decision)} disabled={loading}>Editar</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteDecision(decision)} disabled={loading}>Excluir</button>
              </div>
            </div>
          </div>
        ))}
        {timeline.slice(0, 5).map((item) => (
          <div className="card" key={item.id}>
            <div className="card-body">
              <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ TIMELINE</p>
              <strong className="t-body-lg" style={{ color: "var(--cream)" }}>{item.title}</strong>
              <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>{memberNames.get(item.member_id) ?? "membro"} · {item.when_label ?? "sem data"} · {item.body ?? "sem observação"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
