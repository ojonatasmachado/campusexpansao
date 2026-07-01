"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../lib/supabase-browser";

function friendlyBootstrapError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("sem usuário autenticado") || lower.includes("jwt")) {
    return "Sua sessão expirou. Entre novamente e tente criar a igreja.";
  }
  if (lower.includes("could not find the function") || lower.includes("schema cache")) {
    return "O Supabase ainda não encontrou a função bootstrap. Aguarde um minuto e tente de novo.";
  }
  if (lower.includes("permission") || lower.includes("row-level security")) {
    return "O banco bloqueou a operação por segurança. Confirme se você está logado.";
  }
  return message || "Não conseguimos criar a igreja agora.";
}

export default function BootstrapChurchForm() {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!orgName.trim()) {
      setError("Digite o nome da igreja.");
      return;
    }

    setLoading(true);
    const { error: rpcError } = await supabase
      .schema("core")
      .rpc("bootstrap_church_org", {
        p_org_name: orgName.trim(),
        p_city: city.trim() || null,
        p_trial: true,
      });

    setLoading(false);

    if (rpcError) {
      setError(friendlyBootstrapError(rpcError.message));
      return;
    }

    router.push("/service");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
      <label className="field">
        <span className="field-label req">Nome da igreja</span>
        <input
          className="input"
          value={orgName}
          onChange={(event) => setOrgName(event.target.value)}
          placeholder="Igreja Central"
        />
      </label>

      <label className="field">
        <span className="field-label">Cidade</span>
        <input
          className="input"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="São Paulo · SP"
        />
      </label>

      {error && <p className="field-error">{error}</p>}

      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
        {loading ? "Criando..." : "Criar igreja matriz"}
      </button>
    </form>
  );
}
