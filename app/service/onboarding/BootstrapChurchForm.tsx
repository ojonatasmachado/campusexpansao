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
  if (lower.includes("já está cadastrado")) {
    return "Este CNPJ já está cadastrado em outra igreja no CE.X Service.";
  }
  return message || "Não conseguimos criar a igreja agora.";
}

function formatCnpj(digits: string) {
  const d = digits.slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

type CnpjLookup = {
  valid: boolean;
  active?: boolean;
  error?: string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

export default function BootstrapChurchForm() {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [orgName, setOrgName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [checking, setChecking] = useState(false);
  const [lookup, setLookup] = useState<CnpjLookup | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkCnpj(rawDigits: string) {
    if (rawDigits.length !== 14) {
      setLookup(null);
      return;
    }
    setChecking(true);
    setLookup(null);
    try {
      const res = await fetch("/api/service/cnpj-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: rawDigits }),
      });
      const data = (await res.json()) as CnpjLookup;
      setLookup(data);
      if (data.valid && data.active) {
        if (!orgName.trim()) setOrgName(data.nomeFantasia || data.razaoSocial || "");
        if (!city.trim() && data.city) setCity(data.state ? `${data.city} · ${data.state}` : data.city);
      }
    } catch {
      setLookup({ valid: false, error: "Não conseguimos consultar o CNPJ agora. Tente de novo." });
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cnpjDigits = cnpj.replace(/\D/g, "");

    if (!orgName.trim()) {
      setError("Digite o nome da igreja.");
      return;
    }
    if (cnpjDigits.length !== 14 || !lookup?.valid || !lookup?.active) {
      setError("Confirme um CNPJ válido e ativo antes de continuar.");
      return;
    }
    if (!email.trim()) {
      setError("Digite um e-mail de contato da igreja.");
      return;
    }
    if (!phone.trim()) {
      setError("Digite um telefone de contato da igreja.");
      return;
    }

    setLoading(true);
    const { error: rpcError } = await supabase
      .schema("core")
      .rpc("bootstrap_church_org_v2", {
        p_org_name: orgName.trim(),
        p_cnpj: cnpjDigits,
        p_email: email.trim(),
        p_phone: phone.trim(),
        p_city: city.trim() || null,
        p_address: lookup?.address || null,
        p_postal_code: lookup?.postalCode || null,
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
        <span className="field-label req">CNPJ da igreja</span>
        <input
          className="input"
          value={formatCnpj(cnpj)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 14);
            setCnpj(digits);
            setLookup(null);
            if (digits.length === 14) checkCnpj(digits);
          }}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
        />
        {checking && <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 6 }}>Consultando a Receita Federal…</div>}
        {lookup && lookup.valid && lookup.active && (
          <div style={{ fontSize: 12, color: "var(--olive-soft)", marginTop: 6 }}>
            ✓ CNPJ ativo{lookup.razaoSocial ? ` · ${lookup.razaoSocial}` : ""}
          </div>
        )}
        {lookup && !lookup.active && (
          <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 6 }}>{lookup.error}</div>
        )}
      </label>

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
        <span className="field-label req">E-mail de contato</span>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="contato@igreja.com"
        />
      </label>

      <label className="field">
        <span className="field-label req">Telefone de contato</span>
        <input
          className="input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(11) 9..."
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
