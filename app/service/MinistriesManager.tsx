"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type PersonOption = {
  id: string;
  name: string;
};

type MinistryPosition = {
  id: string;
  organization_id: string;
  ministry_id: string;
  name: string;
  need_count: number;
  sort_order: number;
};

type MinistryPerson = {
  personId: string;
  personName: string;
  isLeader: boolean;
  functions: string[];
};

type MinistryForManager = {
  id: string;
  organizationId: string;
  churchId: string;
  name: string;
  icon: string;
  description: string;
  profile: Record<string, unknown>;
  positions: MinistryPosition[];
  people: MinistryPerson[];
};

type MinistriesManagerProps = {
  ministries: MinistryForManager[];
  people: PersonOption[];
  churchId?: string;
  organizationId?: string;
};

type MinistryForm = {
  name: string;
  description: string;
  purpose: string;
  arrival: string;
  responsibilities: string;
  open: boolean;
  positionsText: string;
  linkedPersonIds: string[];
  leaderPersonId: string;
  functionsText: string;
};

const EMPTY_FORM: MinistryForm = {
  name: "",
  description: "",
  purpose: "",
  arrival: "",
  responsibilities: "",
  open: true,
  positionsText: "Vocal:2\nViolão:1",
  linkedPersonIds: [],
  leaderPersonId: "",
  functionsText: "",
};

function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a gravação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja, organização, ministério ou voluntário vinculado não foi encontrado.";
  }
  if (lower.includes("duplicate key")) {
    return "Este vínculo já existe.";
  }
  if (lower.includes("invalid input")) {
    return "Algum campo foi enviado em formato inválido.";
  }
  return message || "Não conseguimos salvar agora.";
}

function profileText(profile: Record<string, unknown>, key: string) {
  const value = profile[key];
  return typeof value === "string" ? value : "";
}

function profileBoolean(profile: Record<string, unknown>, key: string) {
  return Boolean(profile[key]);
}

function positionsToText(positions: MinistryPosition[]) {
  return positions.length
    ? positions
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((position) => `${position.name}:${position.need_count}`)
        .join("\n")
    : EMPTY_FORM.positionsText;
}

function functionsFromPeople(people: MinistryPerson[]) {
  const functions = new Set<string>();
  people.forEach((person) => person.functions.forEach((name) => functions.add(name)));
  return Array.from(functions).join(", ");
}

function formFromMinistry(ministry: MinistryForManager): MinistryForm {
  const leader = ministry.people.find((person) => person.isLeader);
  return {
    name: ministry.name,
    description: ministry.description === "Descrição não informada" ? "" : ministry.description,
    purpose: profileText(ministry.profile, "proposito"),
    arrival: profileText(ministry.profile, "chegada"),
    responsibilities: profileText(ministry.profile, "responsabilidades"),
    open: profileBoolean(ministry.profile, "aberto"),
    positionsText: positionsToText(ministry.positions),
    linkedPersonIds: ministry.people.map((person) => person.personId),
    leaderPersonId: leader?.personId ?? "",
    functionsText: functionsFromPeople(ministry.people),
  };
}

function parsePositions(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawName, rawCount] = line.split(":");
      const needCount = Number.parseInt(rawCount ?? "1", 10);
      return {
        name: rawName.trim(),
        need_count: Number.isFinite(needCount) && needCount > 0 ? needCount : 1,
        sort_order: index + 1,
      };
    })
    .filter((position) => position.name.length > 0);
}

function parseFunctions(text: string) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MinistriesManager({ ministries, people, churchId, organizationId }: MinistriesManagerProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [form, setForm] = useState<MinistryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof MinistryForm>(key: K, value: MinistryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePerson(personId: string) {
    setForm((current) => {
      const selected = current.linkedPersonIds.includes(personId)
        ? current.linkedPersonIds.filter((id) => id !== personId)
        : [...current.linkedPersonIds, personId];
      return {
        ...current,
        linkedPersonIds: selected,
        leaderPersonId: selected.includes(current.leaderPersonId) ? current.leaderPersonId : "",
      };
    });
  }

  function validateForm() {
    if (!form.name.trim()) return "Digite o nome do ministério.";
    if (parsePositions(form.positionsText).length === 0) return "Informe pelo menos uma função.";
    if (form.leaderPersonId && !form.linkedPersonIds.includes(form.leaderPersonId)) {
      return "O líder precisa estar marcado como voluntário vinculado.";
    }
    return "";
  }

  function ministryPayload() {
    return {
      name: form.name.trim(),
      icon: "◆",
      description: form.description.trim() || null,
      profile: {
        proposito: form.purpose.trim(),
        chegada: form.arrival.trim(),
        responsabilidades: form.responsibilities.trim(),
        aberto: form.open,
      },
      updated_at: new Date().toISOString(),
    };
  }

  async function replacePositions(ministryId: string) {
    const positions = parsePositions(form.positionsText);
    const { error: deleteError } = await supabase.schema("service").from("ministry_positions").delete().eq("ministry_id", ministryId);
    if (deleteError) return deleteError;
    if (positions.length === 0) return null;

    const { error: insertError } = await supabase.schema("service").from("ministry_positions").insert(
      positions.map((position) => ({
        organization_id: organizationId,
        ministry_id: ministryId,
        ...position,
      })),
    );
    return insertError;
  }

  async function replacePeopleLinks(ministryId: string) {
    const { error: deleteError } = await supabase.schema("service").from("person_ministries").delete().eq("ministry_id", ministryId);
    if (deleteError) return deleteError;
    if (form.linkedPersonIds.length === 0) return null;

    const functions = parseFunctions(form.functionsText);
    const { error: insertError } = await supabase.schema("service").from("person_ministries").insert(
      form.linkedPersonIds.map((personId) => ({
        organization_id: organizationId,
        person_id: personId,
        ministry_id: ministryId,
        is_leader: personId === form.leaderPersonId,
        functions,
      })),
    );
    return insertError;
  }

  async function saveMinistry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    if (!editingId && (!churchId || !organizationId)) {
      setError("Nenhuma igreja encontrada para vincular o ministério.");
      return;
    }

    setLoading(true);
    const ministryResult = editingId
      ? await supabase.schema("service").from("ministries").update(ministryPayload()).eq("id", editingId).select("id").single()
      : await supabase
          .schema("service")
          .from("ministries")
          .insert({
            organization_id: organizationId,
            church_id: churchId,
            ...ministryPayload(),
          })
          .select("id")
          .single();

    if (ministryResult.error || !ministryResult.data) {
      setLoading(false);
      setError(friendlyWriteError(ministryResult.error?.message || ""));
      return;
    }

    const positionsError = await replacePositions(ministryResult.data.id);
    if (positionsError) {
      setLoading(false);
      setError(friendlyWriteError(positionsError.message));
      return;
    }

    const linksError = await replacePeopleLinks(ministryResult.data.id);
    setLoading(false);
    if (linksError) {
      setError(friendlyWriteError(linksError.message));
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId("");
    router.refresh();
  }

  function editMinistry(ministry: MinistryForManager) {
    setError("");
    setEditingId(ministry.id);
    setForm(formFromMinistry(ministry));
  }

  async function deleteMinistry(ministry: MinistryForManager) {
    setError("");
    const confirmed = window.confirm(`Excluir ${ministry.name}? As funções e vínculos deste ministério também serão removidos.`);
    if (!confirmed) return;

    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("ministries").delete().eq("id", ministry.id);
    setLoading(false);

    if (deleteError) {
      setError(friendlyWriteError(deleteError.message));
      return;
    }

    if (editingId === ministry.id) {
      setEditingId("");
      setForm(EMPTY_FORM);
    }
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveMinistry}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>
            ◆ {editingId ? "EDITAR MINISTÉRIO" : "CRIAR MINISTÉRIO"}
          </p>
          <label className="field">
            <span className="field-label req">Nome</span>
            <input className="input" value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Louvor" />
          </label>
          <label className="field">
            <span className="field-label">Descrição</span>
            <input
              className="input"
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="Banda, vocal e técnica dos cultos"
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Propósito</span>
              <input className="input" value={form.purpose} onChange={(event) => setField("purpose", event.target.value)} placeholder="Conduzir adoração" />
            </label>
            <label className="field">
              <span className="field-label">Chegada</span>
              <input className="input" value={form.arrival} onChange={(event) => setField("arrival", event.target.value)} placeholder="40 minutos antes" />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Responsabilidades</span>
            <input
              className="input"
              value={form.responsibilities}
              onChange={(event) => setField("responsibilities", event.target.value)}
              placeholder="Escala, ensaio e passagem de som"
            />
          </label>
          <label className="service-check-row">
            <input type="checkbox" checked={form.open} onChange={(event) => setField("open", event.target.checked)} />
            Aberto para novos voluntários
          </label>
          <label className="field">
            <span className="field-label req">Funções</span>
            <textarea
              className="textarea"
              rows={4}
              value={form.positionsText}
              onChange={(event) => setField("positionsText", event.target.value)}
              placeholder={"Vocal:2\nViolão:1"}
            />
            <span className="field-hint">Use uma função por linha. Exemplo: Vocal:2</span>
          </label>
          <div className="card" style={{ padding: 14 }}>
            <p className="field-label">Voluntários vinculados</p>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {people.length === 0 ? (
                <p className="t-small" style={{ color: "var(--muted)", margin: 0 }}>
                  Cadastre voluntários antes de vincular pessoas ao ministério.
                </p>
              ) : (
                people.map((person) => (
                  <label className="service-check-row" key={person.id}>
                    <input type="checkbox" checked={form.linkedPersonIds.includes(person.id)} onChange={() => togglePerson(person.id)} />
                    {person.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Líder</span>
              <select className="select" value={form.leaderPersonId} onChange={(event) => setField("leaderPersonId", event.target.value)}>
                <option value="">Sem líder</option>
                {people
                  .filter((person) => form.linkedPersonIds.includes(person.id))
                  .map((person) => (
                    <option value={person.id} key={person.id}>
                      {person.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Funções dos vinculados</span>
              <input
                className="input"
                value={form.functionsText}
                onChange={(event) => setField("functionsText", event.target.value)}
                placeholder="Vocal, Violão"
              />
            </label>
          </div>
          {error && <p className="field-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingId ? "Salvar ministério" : "Criar ministério"}
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
        {ministries.map((ministry) => (
          <div className="card" key={ministry.id}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--wheat)" }}>
                  ◆ {ministry.positions.length} FUNÇÃO(ÕES)
                </p>
                <strong className="t-body-lg" style={{ color: "var(--cream)" }}>
                  {ministry.name}
                </strong>
                <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                  {ministry.people.length} voluntário(s) vinculado(s)
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => editMinistry(ministry)} disabled={loading}>
                  Editar
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteMinistry(ministry)} disabled={loading}>
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
