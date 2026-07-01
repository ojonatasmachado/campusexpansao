"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type ChurchForManager = {
  id: string;
  organizationId: string;
  nome: string;
  cidade: string;
  matriz: boolean;
};

type ChurchesManagerProps = {
  churches: ChurchForManager[];
};

function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a gravação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A organização da igreja não foi encontrada.";
  }
  return message || "Não conseguimos salvar agora.";
}

export default function ChurchesManager({ churches }: ChurchesManagerProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const organizationId = churches[0]?.organizationId ?? "";

  async function createChurch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!organizationId) {
      setError("Nenhuma organização encontrada para criar a congregação.");
      return;
    }

    if (!newName.trim()) {
      setError("Digite o nome da congregação.");
      return;
    }

    setLoading(true);
    const { error: insertError } = await supabase.schema("service").from("churches").insert({
      organization_id: organizationId,
      name: newName.trim(),
      city: newCity.trim() || null,
      is_headquarters: false,
    });
    setLoading(false);

    if (insertError) {
      setError(friendlyWriteError(insertError.message));
      return;
    }

    setNewName("");
    setNewCity("");
    router.refresh();
  }

  function startEdit(church: ChurchForManager) {
    setError("");
    setEditingId(church.id);
    setEditName(church.nome);
    setEditCity(church.cidade === "Cidade não informada" ? "" : church.cidade);
  }

  async function saveChurch(churchId: string) {
    setError("");
    if (!editName.trim()) {
      setError("Digite o nome da igreja.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .schema("service")
      .from("churches")
      .update({
        name: editName.trim(),
        city: editCity.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", churchId);
    setLoading(false);

    if (updateError) {
      setError(friendlyWriteError(updateError.message));
      return;
    }

    setEditingId("");
    router.refresh();
  }

  async function deleteChurch(church: ChurchForManager) {
    setError("");
    if (church.matriz) {
      setError("Por segurança, a igreja matriz não pode ser excluída por esta tela de teste.");
      return;
    }

    const confirmed = window.confirm(`Excluir ${church.nome}?`);
    if (!confirmed) return;

    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("churches").delete().eq("id", church.id);
    setLoading(false);

    if (deleteError) {
      setError(friendlyWriteError(deleteError.message));
      return;
    }

    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={createChurch}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>
            ◆ CRIAR CONGREGAÇÃO
          </p>
          <label className="field">
            <span className="field-label req">Nome</span>
            <input className="input" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Congregação Zona Norte" />
          </label>
          <label className="field">
            <span className="field-label">Cidade ou bairro</span>
            <input className="input" value={newCity} onChange={(event) => setNewCity(event.target.value)} placeholder="Vila Aurora" />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Criar congregação"}
          </button>
        </div>
      </form>

      {error && <p className="field-error">{error}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {churches.map((church) => (
          <div className="card" key={church.id}>
            <div className="card-body">
              {editingId === church.id ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <label className="field">
                    <span className="field-label req">Nome</span>
                    <input className="input" value={editName} onChange={(event) => setEditName(event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Cidade ou bairro</span>
                    <input className="input" value={editCity} onChange={(event) => setEditCity(event.target.value)} />
                  </label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-primary" type="button" onClick={() => saveChurch(church.id)} disabled={loading}>
                      Salvar
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => setEditingId("")} disabled={loading}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <p className="eyebrow" style={{ color: "var(--wheat)" }}>
                      ◆ {church.matriz ? "MATRIZ" : "CONGREGAÇÃO"}
                    </p>
                    <strong className="t-body-lg" style={{ color: "var(--cream)" }}>
                      {church.nome}
                    </strong>
                    <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                      {church.cidade}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => startEdit(church)} disabled={loading}>
                      Editar
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteChurch(church)} disabled={loading || church.matriz}>
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
