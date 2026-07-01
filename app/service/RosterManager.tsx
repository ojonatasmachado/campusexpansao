"use client";

import { useEffect, useMemo, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type EventOption = {
  id: string;
  name: string;
};

type PositionOption = {
  id: string;
  name: string;
  ministryName: string;
};

type PersonOption = {
  id: string;
  name: string;
};

type RosterAssignment = {
  id: string;
  organization_id: string;
  event_id: string;
  position_id: string;
  person_id: string;
  status: "ok" | "wait" | "no";
  created_at: string;
};

type RosterManagerProps = {
  events: EventOption[];
  positions: PositionOption[];
  people: PersonOption[];
  organizationId?: string;
};

type RosterForm = {
  eventId: string;
  positionId: string;
  personId: string;
  status: "ok" | "wait" | "no";
};

const EMPTY_FORM: RosterForm = {
  eventId: "",
  positionId: "",
  personId: "",
  status: "wait",
};

function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a escala por segurança. Confirme se você está logado como master, pastor ou líder com permissão.";
  }
  if (lower.includes("duplicate key")) {
    return "Essa pessoa já está nessa função para esse evento.";
  }
  if (lower.includes("violates foreign key")) {
    return "Evento, função, pessoa ou organização não encontrado.";
  }
  return message || "Não conseguimos salvar a escala agora.";
}

function statusLabel(status: RosterAssignment["status"]) {
  const labels = {
    ok: "confirmado",
    wait: "aguardando",
    no: "não poderá",
  };
  return labels[status];
}

export default function RosterManager({ events, positions, people, organizationId }: RosterManagerProps) {
  const supabase = createServiceBrowserClient();
  const [assignments, setAssignments] = useState<RosterAssignment[]>([]);
  const [form, setForm] = useState<RosterForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const eventNames = useMemo(() => new Map(events.map((event) => [event.id, event.name])), [events]);
  const positionNames = useMemo(
    () => new Map(positions.map((position) => [position.id, `${position.ministryName} · ${position.name}`])),
    [positions],
  );
  const personNames = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people]);

  async function loadAssignments() {
    setLoading(true);
    setError("");
    const { data, error: readError } = await supabase
      .schema("service")
      .from("roster_assignments")
      .select("id,organization_id,event_id,position_id,person_id,status,created_at")
      .order("created_at", { ascending: false });
    setLoading(false);

    if (readError) {
      setError(friendlyWriteError(readError.message));
      return;
    }

    setAssignments((data ?? []) as RosterAssignment[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAssignments();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField<K extends keyof RosterForm>(key: K, value: RosterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateForm() {
    if (!organizationId) return "Nenhuma organização encontrada para vincular a escala.";
    if (!form.eventId) return "Escolha o evento.";
    if (!form.positionId) return "Escolha a função.";
    if (!form.personId) return "Escolha a pessoa.";
    return "";
  }

  async function saveAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    const payload = {
      organization_id: organizationId,
      event_id: form.eventId,
      position_id: form.positionId,
      person_id: form.personId,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.schema("service").from("roster_assignments").update(payload).eq("id", editingId)
      : await supabase.schema("service").from("roster_assignments").insert(payload);
    setLoading(false);

    if (result.error) {
      setError(friendlyWriteError(result.error.message));
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId("");
    await loadAssignments();
  }

  function editAssignment(assignment: RosterAssignment) {
    setError("");
    setEditingId(assignment.id);
    setForm({
      eventId: assignment.event_id,
      positionId: assignment.position_id,
      personId: assignment.person_id,
      status: assignment.status,
    });
  }

  async function deleteAssignment(assignment: RosterAssignment) {
    setError("");
    const confirmed = window.confirm(`Remover ${personNames.get(assignment.person_id) ?? "pessoa"} desta escala?`);
    if (!confirmed) return;

    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("roster_assignments").delete().eq("id", assignment.id);
    setLoading(false);

    if (deleteError) {
      setError(friendlyWriteError(deleteError.message));
      return;
    }

    if (editingId === assignment.id) {
      setEditingId("");
      setForm(EMPTY_FORM);
    }
    await loadAssignments();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveAssignment}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>
            ◆ {editingId ? "EDITAR ESCALA" : "CRIAR ESCALA"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label req">Evento</span>
              <select className="select" value={form.eventId} onChange={(event) => setField("eventId", event.target.value)}>
                <option value="">Escolha</option>
                {events.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label req">Função</span>
              <select className="select" value={form.positionId} onChange={(event) => setField("positionId", event.target.value)}>
                <option value="">Escolha</option>
                {positions.map((position) => (
                  <option value={position.id} key={position.id}>
                    {position.ministryName} · {position.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label req">Pessoa</span>
              <select className="select" value={form.personId} onChange={(event) => setField("personId", event.target.value)}>
                <option value="">Escolha</option>
                {people.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Status</span>
            <select className="select" value={form.status} onChange={(event) => setField("status", event.target.value as RosterForm["status"])}>
              <option value="wait">aguardando</option>
              <option value="ok">confirmado</option>
              <option value="no">não poderá</option>
            </select>
          </label>
          {error && <p className="field-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingId ? "Salvar escala" : "Criar escala"}
            </button>
            {editingId && (
              <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(""); setForm(EMPTY_FORM); }} disabled={loading}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {assignments.length === 0 && !loading ? (
          <div className="empty">
            <div className="empty-mark">0</div>
            <h3 className="empty-title" style={{ color: "var(--cream)" }}>Nenhuma escala cadastrada ainda</h3>
            <p className="empty-desc">Crie a primeira escala escolhendo evento, função e pessoa.</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div className="card" key={assignment.id}>
              <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p className="eyebrow" style={{ color: "var(--wheat)" }}>
                    ◆ {statusLabel(assignment.status)}
                  </p>
                  <strong className="t-body-lg" style={{ color: "var(--cream)" }}>
                    {personNames.get(assignment.person_id) ?? "Pessoa não encontrada"}
                  </strong>
                  <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                    {eventNames.get(assignment.event_id) ?? "Evento não encontrado"} · {positionNames.get(assignment.position_id) ?? "Função não encontrada"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => editAssignment(assignment)} disabled={loading}>
                    Editar
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteAssignment(assignment)} disabled={loading}>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
