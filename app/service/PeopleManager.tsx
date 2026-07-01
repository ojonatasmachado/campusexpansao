"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type PersonForManager = {
  id: string;
  organizationId: string;
  churchId: string;
  name: string;
  phone: string;
  email: string;
  sinceYear: string;
  status: "ativo" | "pausa" | "ferias";
  engagement: number | null;
  availability: Record<string, boolean>;
  tags: string[];
};

type PeopleManagerProps = {
  people: PersonForManager[];
  churchId?: string;
  organizationId?: string;
};

type PeopleForm = {
  name: string;
  phone: string;
  email: string;
  sinceYear: string;
  status: "ativo" | "pausa" | "ferias";
  engagement: string;
  domM: boolean;
  domN: boolean;
  qua: boolean;
  tags: string;
};

const EMPTY_FORM: PeopleForm = {
  name: "",
  phone: "",
  email: "",
  sinceYear: "",
  status: "ativo",
  engagement: "",
  domM: true,
  domN: false,
  qua: false,
  tags: "",
};

function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a gravação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja ou organização não foi encontrada para vincular o voluntário.";
  }
  if (lower.includes("invalid input")) {
    return "Algum campo foi enviado em formato inválido.";
  }
  return message || "Não conseguimos salvar agora.";
}

function formFromPerson(person: PersonForManager): PeopleForm {
  return {
    name: person.name,
    phone: person.phone === "Telefone não informado" ? "" : person.phone,
    email: person.email === "E-mail não informado" ? "" : person.email,
    sinceYear: person.sinceYear === "Ano não informado" ? "" : person.sinceYear,
    status: person.status,
    engagement: person.engagement === null ? "" : String(person.engagement),
    domM: Boolean(person.availability.dom_m),
    domN: Boolean(person.availability.dom_n),
    qua: Boolean(person.availability.qua),
    tags: person.tags.join(", "),
  };
}

function tagsFromText(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function PeopleManager({ people, churchId, organizationId }: PeopleManagerProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [form, setForm] = useState<PeopleForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof PeopleForm>(key: K, value: PeopleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateForm() {
    if (!form.name.trim()) return "Digite o nome do voluntário.";
    if (form.email.trim() && !form.email.includes("@")) return "Digite um e-mail válido ou deixe em branco.";
    if (form.engagement.trim()) {
      const value = Number(form.engagement);
      if (!Number.isFinite(value) || value < 0 || value > 100) return "Engajamento precisa ser um número de 0 a 100.";
    }
    return "";
  }

  function payload() {
    return {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      since_year: form.sinceYear.trim() || null,
      status: form.status,
      engagement: form.engagement.trim() ? Number(form.engagement) : null,
      availability: { dom_m: form.domM, dom_n: form.domN, qua: form.qua },
      tags: tagsFromText(form.tags),
      updated_at: new Date().toISOString(),
    };
  }

  async function savePerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    if (!editingId && (!churchId || !organizationId)) {
      setError("Nenhuma igreja encontrada para vincular o voluntário.");
      return;
    }

    setLoading(true);
    const result = editingId
      ? await supabase.schema("service").from("people").update(payload()).eq("id", editingId)
      : await supabase.schema("service").from("people").insert({
          organization_id: organizationId,
          church_id: churchId,
          ...payload(),
        });
    setLoading(false);

    if (result.error) {
      setError(friendlyWriteError(result.error.message));
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId("");
    router.refresh();
  }

  function editPerson(person: PersonForManager) {
    setError("");
    setEditingId(person.id);
    setForm(formFromPerson(person));
  }

  async function deletePerson(person: PersonForManager) {
    setError("");
    const confirmed = window.confirm(`Excluir ${person.name}?`);
    if (!confirmed) return;

    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("people").delete().eq("id", person.id);
    setLoading(false);

    if (deleteError) {
      setError(friendlyWriteError(deleteError.message));
      return;
    }

    if (editingId === person.id) {
      setEditingId("");
      setForm(EMPTY_FORM);
    }
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={savePerson}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>
            ◆ {editingId ? "EDITAR VOLUNTÁRIO" : "CRIAR VOLUNTÁRIO"}
          </p>
          <label className="field">
            <span className="field-label req">Nome</span>
            <input className="input" value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Mariana Reis" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Telefone</span>
              <input className="input" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="(11) 98812-4471" />
            </label>
            <label className="field">
              <span className="field-label">E-mail</span>
              <input className="input" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="voluntario@igreja.com" />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Desde</span>
              <input className="input" value={form.sinceYear} onChange={(event) => setField("sinceYear", event.target.value)} placeholder="2024" />
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select className="select" value={form.status} onChange={(event) => setField("status", event.target.value as PeopleForm["status"])}>
                <option value="ativo">ativo</option>
                <option value="pausa">pausa</option>
                <option value="ferias">ferias</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Engajamento</span>
              <input className="input" inputMode="numeric" value={form.engagement} onChange={(event) => setField("engagement", event.target.value)} placeholder="0 a 100" />
            </label>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <p className="field-label">Disponibilidade</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
              <label className="service-check-row">
                <input type="checkbox" checked={form.domM} onChange={(event) => setField("domM", event.target.checked)} />
                Domingo manhã
              </label>
              <label className="service-check-row">
                <input type="checkbox" checked={form.domN} onChange={(event) => setField("domN", event.target.checked)} />
                Domingo noite
              </label>
              <label className="service-check-row">
                <input type="checkbox" checked={form.qua} onChange={(event) => setField("qua", event.target.checked)} />
                Quarta
              </label>
            </div>
          </div>
          <label className="field">
            <span className="field-label">Tags</span>
            <input className="input" value={form.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="louvor, jovens" />
            <span className="field-hint">Separe por vírgula.</span>
          </label>
          {error && <p className="field-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingId ? "Salvar voluntário" : "Criar voluntário"}
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
        {people.map((person) => (
          <div className="card" key={person.id}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--wheat)" }}>
                  ◆ {person.status}
                </p>
                <strong className="t-body-lg" style={{ color: "var(--cream)" }}>
                  {person.name}
                </strong>
                <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                  {person.phone} · {person.email}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => editPerson(person)} disabled={loading}>
                  Editar
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => deletePerson(person)} disabled={loading}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
