"use client";

import { useEffect, useMemo, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type PersonOption = { id: string; name: string };
type MemberOption = { id: string; name: string };

type Visitor = {
  id: string;
  organization_id: string;
  church_id: string;
  name: string;
  phone: string | null;
  stage: "novo" | "contato" | "integrando" | "membro";
  visited_on: string | null;
  responsible_id: string | null;
  due: string | null;
  due_status: "soon" | "ok" | "late" | null;
  reply_status: "respondeu" | "sem_resposta" | null;
  origin: string | null;
  member_id: string | null;
};

type VisitorNote = {
  id: string;
  visitor_id: string;
  happened_on: string | null;
  body: string;
  author: string | null;
  is_milestone: boolean;
};

type VisitorsManagerProps = {
  people: PersonOption[];
  members: MemberOption[];
  churchId?: string;
  organizationId?: string;
};

type VisitorForm = {
  name: string;
  phone: string;
  stage: Visitor["stage"];
  visitedOn: string;
  responsibleId: string;
  due: string;
  dueStatus: "";
  replyStatus: "";
  origin: string;
  memberId: string;
  note: string;
};

const EMPTY_FORM: VisitorForm = {
  name: "",
  phone: "",
  stage: "novo",
  visitedOn: "",
  responsibleId: "",
  due: "",
  dueStatus: "",
  replyStatus: "",
  origin: "",
  memberId: "",
  note: "",
};

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a gravação por segurança. Confirme se você está logado com permissão.";
  }
  if (lower.includes("violates foreign key")) return "Pessoa, membro, igreja ou organização não encontrado.";
  return message || "Não conseguimos salvar visitantes agora.";
}

export default function VisitorsManager({ people, members, churchId, organizationId }: VisitorsManagerProps) {
  const supabase = createServiceBrowserClient();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [notes, setNotes] = useState<VisitorNote[]>([]);
  const [form, setForm] = useState<VisitorForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const peopleNames = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people]);
  const memberNames = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);

  async function loadVisitors() {
    setLoading(true);
    setError("");
    const { data: visitorData, error: visitorError } = await supabase
      .schema("service")
      .from("visitors")
      .select("id,organization_id,church_id,name,phone,stage,visited_on,responsible_id,due,due_status,reply_status,origin,member_id")
      .order("created_at", { ascending: false });
    if (visitorError) {
      setLoading(false);
      setError(friendlyError(visitorError.message));
      return;
    }

    const { data: noteData, error: noteError } = await supabase
      .schema("service")
      .from("visitor_notes")
      .select("id,visitor_id,happened_on,body,author,is_milestone")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (noteError) {
      setError(friendlyError(noteError.message));
      return;
    }

    setVisitors((visitorData ?? []) as Visitor[]);
    setNotes((noteData ?? []) as VisitorNote[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVisitors();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField<K extends keyof VisitorForm>(key: K, value: VisitorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateForm() {
    if (!organizationId || !churchId) return "Nenhuma igreja encontrada para vincular o visitante.";
    if (!form.name.trim()) return "Digite o nome do visitante.";
    return "";
  }

  async function saveVisitor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      stage: form.stage,
      visited_on: form.visitedOn.trim() || null,
      responsible_id: form.responsibleId || null,
      due: form.due.trim() || null,
      due_status: null,
      reply_status: null,
      origin: form.origin.trim() || null,
      member_id: form.memberId || null,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.schema("service").from("visitors").update(payload).eq("id", editingId).select("id").single()
      : await supabase
          .schema("service")
          .from("visitors")
          .insert({ organization_id: organizationId, church_id: churchId, ...payload })
          .select("id")
          .single();

    if (result.error || !result.data) {
      setLoading(false);
      setError(friendlyError(result.error?.message || ""));
      return;
    }

    if (form.note.trim()) {
      const { error: noteError } = await supabase.schema("service").from("visitor_notes").insert({
        organization_id: organizationId,
        visitor_id: result.data.id,
        happened_on: form.visitedOn.trim() || null,
        body: form.note.trim(),
        author: "Equipe",
        is_milestone: form.stage === "membro",
      });
      if (noteError) {
        setLoading(false);
        setError(friendlyError(noteError.message));
        return;
      }
    }

    setLoading(false);
    setForm(EMPTY_FORM);
    setEditingId("");
    await loadVisitors();
  }

  function editVisitor(visitor: Visitor) {
    setError("");
    setEditingId(visitor.id);
    setForm({
      name: visitor.name,
      phone: visitor.phone ?? "",
      stage: visitor.stage,
      visitedOn: visitor.visited_on ?? "",
      responsibleId: visitor.responsible_id ?? "",
      due: visitor.due ?? "",
      dueStatus: "",
      replyStatus: "",
      origin: visitor.origin ?? "",
      memberId: visitor.member_id ?? "",
      note: "",
    });
  }

  async function deleteVisitor(visitor: Visitor) {
    setError("");
    if (!window.confirm(`Excluir ${visitor.name}?`)) return;
    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("visitors").delete().eq("id", visitor.id);
    setLoading(false);
    if (deleteError) {
      setError(friendlyError(deleteError.message));
      return;
    }
    await loadVisitors();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveVisitor}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ {editingId ? "EDITAR VISITANTE" : "CRIAR VISITANTE"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label req">Nome</span>
              <input className="input" value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Marina Souza" />
            </label>
            <label className="field">
              <span className="field-label">Telefone</span>
              <input className="input" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="(11) 98888-0000" />
            </label>
            <label className="field">
              <span className="field-label">Etapa</span>
              <select className="select" value={form.stage} onChange={(event) => setField("stage", event.target.value as VisitorForm["stage"])}>
                <option value="novo">novo</option>
                <option value="contato">contato</option>
                <option value="integrando">integrando</option>
                <option value="membro">membro</option>
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Visitou em</span>
              <input className="input" value={form.visitedOn} onChange={(event) => setField("visitedOn", event.target.value)} placeholder="2026-07-05" />
            </label>
            <label className="field">
              <span className="field-label">Origem</span>
              <input className="input" value={form.origin} onChange={(event) => setField("origin", event.target.value)} placeholder="Convite de amigo" />
            </label>
            <label className="field">
              <span className="field-label">Próximo contato</span>
              <input className="input" value={form.due} onChange={(event) => setField("due", event.target.value)} placeholder="2026-07-08" />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Responsável</span>
              <select className="select" value={form.responsibleId} onChange={(event) => setField("responsibleId", event.target.value)}>
                <option value="">Sem responsável</option>
                {people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Membro vinculado</span>
              <select className="select" value={form.memberId} onChange={(event) => setField("memberId", event.target.value)}>
                <option value="">Sem vínculo</option>
                {members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Nota do histórico</span>
            <textarea className="textarea" rows={3} value={form.note} onChange={(event) => setField("note", event.target.value)} placeholder="Primeira conversa feita após o culto." />
          </label>
          {error && <p className="field-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : editingId ? "Salvar visitante" : "Criar visitante"}</button>
            {editingId && <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(""); setForm(EMPTY_FORM); }} disabled={loading}>Cancelar</button>}
          </div>
        </div>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {visitors.map((visitor) => {
          const visitorNotes = notes.filter((note) => note.visitor_id === visitor.id);
          return (
            <div className="card" key={visitor.id}>
              <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ {visitor.stage}</p>
                  <strong className="t-body-lg" style={{ color: "var(--cream)" }}>{visitor.name}</strong>
                  <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                    {visitor.phone || "sem telefone"} · {peopleNames.get(visitor.responsible_id ?? "") ?? "sem responsável"} · {memberNames.get(visitor.member_id ?? "") ?? "sem membro"}
                  </p>
                  <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                    {visitorNotes[0]?.body ?? "sem notas"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => editVisitor(visitor)} disabled={loading}>Editar</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteVisitor(visitor)} disabled={loading}>Excluir</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
