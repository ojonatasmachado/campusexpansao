"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type PersonOption = {
  id: string;
  name: string;
};

type MemberForManager = {
  id: string;
  organizationId: string;
  churchId: string;
  volunteerId: string | null;
  name: string;
  phone: string;
  email: string;
  birth: string;
  sinceYear: string;
  situation: "membro" | "novo";
  firstContact: string;
  neighborhood: string;
  family: string;
  journey: number[];
};

type MembersManagerProps = {
  members: MemberForManager[];
  people: PersonOption[];
  churchId?: string;
  organizationId?: string;
};

type MemberForm = {
  name: string;
  phone: string;
  email: string;
  birth: string;
  sinceYear: string;
  situation: "membro" | "novo";
  firstContact: string;
  neighborhood: string;
  family: string;
  volunteerId: string;
  decisao: boolean;
  batismo: boolean;
  fundamentos: boolean;
  gc: boolean;
  servindo: boolean;
};

const EMPTY_FORM: MemberForm = {
  name: "",
  phone: "",
  email: "",
  birth: "",
  sinceYear: "",
  situation: "membro",
  firstContact: "",
  neighborhood: "",
  family: "",
  volunteerId: "",
  decisao: true,
  batismo: false,
  fundamentos: false,
  gc: false,
  servindo: false,
};

function cleanPlaceholder(value: string, placeholder: string) {
  return value === placeholder ? "" : value;
}

function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a gravação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja, organização ou voluntário vinculado não foi encontrado.";
  }
  if (lower.includes("invalid input")) {
    return "Algum campo foi enviado em formato inválido.";
  }
  return message || "Não conseguimos salvar agora.";
}

function formFromMember(member: MemberForManager): MemberForm {
  return {
    name: member.name,
    phone: cleanPlaceholder(member.phone, "Telefone não informado"),
    email: cleanPlaceholder(member.email, "E-mail não informado"),
    birth: cleanPlaceholder(member.birth, "Nascimento não informado"),
    sinceYear: cleanPlaceholder(member.sinceYear, "Ano não informado"),
    situation: member.situation,
    firstContact: cleanPlaceholder(member.firstContact, "Primeiro contato não informado"),
    neighborhood: cleanPlaceholder(member.neighborhood, "Bairro não informado"),
    family: cleanPlaceholder(member.family, "Família não informada"),
    volunteerId: member.volunteerId ?? "",
    decisao: Boolean(member.journey[0]),
    batismo: Boolean(member.journey[1]),
    fundamentos: Boolean(member.journey[2]),
    gc: Boolean(member.journey[3]),
    servindo: Boolean(member.journey[4]),
  };
}

export default function MembersManager({ members, people, churchId, organizationId }: MembersManagerProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateForm() {
    if (!form.name.trim()) return "Digite o nome do membro.";
    if (form.email.trim() && !form.email.includes("@")) return "Digite um e-mail válido ou deixe em branco.";
    if (form.firstContact.trim() && !/^\d{4}-\d{2}$/.test(form.firstContact.trim())) {
      return "Primeiro contato deve estar no formato AAAA-MM, por exemplo 2026-07.";
    }
    return "";
  }

  function payload() {
    return {
      volunteer_id: form.volunteerId || null,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      birth: form.birth.trim() || null,
      since_year: form.sinceYear.trim() || null,
      situation: form.situation,
      first_contact: form.firstContact.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      family: form.family.trim() || null,
      journey: [form.decisao ? 1 : 0, form.batismo ? 1 : 0, form.fundamentos ? 1 : 0, form.gc ? 1 : 0, form.servindo ? 1 : 0],
      updated_at: new Date().toISOString(),
    };
  }

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    if (!editingId && (!churchId || !organizationId)) {
      setError("Nenhuma igreja encontrada para vincular o membro.");
      return;
    }

    setLoading(true);
    const result = editingId
      ? await supabase.schema("service").from("members").update(payload()).eq("id", editingId)
      : await supabase.schema("service").from("members").insert({
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

  function editMember(member: MemberForManager) {
    setError("");
    setEditingId(member.id);
    setForm(formFromMember(member));
  }

  async function deleteMember(member: MemberForManager) {
    setError("");
    const confirmed = window.confirm(`Excluir ${member.name}?`);
    if (!confirmed) return;

    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("members").delete().eq("id", member.id);
    setLoading(false);

    if (deleteError) {
      setError(friendlyWriteError(deleteError.message));
      return;
    }

    if (editingId === member.id) {
      setEditingId("");
      setForm(EMPTY_FORM);
    }
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveMember}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>
            ◆ {editingId ? "EDITAR MEMBRO" : "CRIAR MEMBRO"}
          </p>
          <label className="field">
            <span className="field-label req">Nome</span>
            <input className="input" value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Bianca Melo" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Telefone</span>
              <input className="input" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="(11) 98778-1102" />
            </label>
            <label className="field">
              <span className="field-label">E-mail</span>
              <input className="input" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="membro@igreja.com" />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Nascimento</span>
              <input className="input" value={form.birth} onChange={(event) => setField("birth", event.target.value)} placeholder="08 ago" />
            </label>
            <label className="field">
              <span className="field-label">Desde</span>
              <input className="input" value={form.sinceYear} onChange={(event) => setField("sinceYear", event.target.value)} placeholder="2025" />
            </label>
            <label className="field">
              <span className="field-label">Situação</span>
              <select className="select" value={form.situation} onChange={(event) => setField("situation", event.target.value as MemberForm["situation"])}>
                <option value="membro">membro</option>
                <option value="novo">novo</option>
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Primeiro contato</span>
              <input className="input" value={form.firstContact} onChange={(event) => setField("firstContact", event.target.value)} placeholder="2026-07" />
            </label>
            <label className="field">
              <span className="field-label">Bairro</span>
              <input className="input" value={form.neighborhood} onChange={(event) => setField("neighborhood", event.target.value)} placeholder="Centro" />
            </label>
            <label className="field">
              <span className="field-label">Família</span>
              <input className="input" value={form.family} onChange={(event) => setField("family", event.target.value)} placeholder="Melo" />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Vínculo com voluntário</span>
            <select className="select" value={form.volunteerId} onChange={(event) => setField("volunteerId", event.target.value)}>
              <option value="">Sem vínculo</option>
              {people.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <div className="card" style={{ padding: 14 }}>
            <p className="field-label">Jornada</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
              {([
                ["decisao", "Decisão"],
                ["batismo", "Batismo"],
                ["fundamentos", "Fundamentos"],
                ["gc", "GC"],
                ["servindo", "Servindo"],
              ] as Array<[keyof MemberForm, string]>).map(([key, label]) => (
                <label className="service-check-row" key={key}>
                  <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setField(key, event.target.checked as never)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="field-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingId ? "Salvar membro" : "Criar membro"}
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
        {members.map((member) => (
          <div className="card" key={member.id}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--wheat)" }}>
                  ◆ {member.situation}
                </p>
                <strong className="t-body-lg" style={{ color: "var(--cream)" }}>
                  {member.name}
                </strong>
                <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                  {member.phone} · {member.email}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => editMember(member)} disabled={loading}>
                  Editar
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteMember(member)} disabled={loading}>
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
