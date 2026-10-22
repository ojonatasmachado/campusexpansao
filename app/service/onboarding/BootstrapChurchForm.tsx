"use client";

import { normalizarCnpj, formatarCnpj } from "../lib/cnpj";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { Icon } from "../lib/icons";

import { Botao } from "../ui/Botao";
function friendlyBootstrapError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("sem usuário autenticado") || lower.includes("jwt")) {
    return "Sua sessão expirou. Entre novamente e tente criar a igreja.";
  }
  if (lower.includes("could not find the function") || lower.includes("schema cache")) {
    return "O cadastro está indisponível agora. Tente de novo em alguns minutos.";
  }
  if (lower.includes("permission") || lower.includes("row-level security")) {
    return "Não conseguimos confirmar sua conta. Saia, entre de novo e tente outra vez.";
  }
  if (lower.includes("já está cadastrado")) {
    return "Este CNPJ já está cadastrado em outra igreja no CE.X Service.";
  }
  console.error("[service] cadastro da igreja:", message);
  return "Não conseguimos criar a igreja agora. Tente de novo em instantes.";
}

type CnpjLookup = {
  cnpj?: string;
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

  const consultaId = useRef(0);
  const [checking, setChecking] = useState(false);
  const [lookup, setLookup] = useState<CnpjLookup | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkCnpj(rawDigits: string) {
    const atual = ++consultaId.current;
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
      if (atual !== consultaId.current) return;
      setLookup(data);
      if (data.valid && data.active) {
        if (!orgName.trim()) setOrgName(data.nomeFantasia || data.razaoSocial || "");
        if (!city.trim() && data.city) setCity(data.state ? `${data.city} · ${data.state}` : data.city);
      }
    } catch {
      if (atual !== consultaId.current) return;
      setLookup({ valid: false, error: "Não conseguimos consultar o CNPJ agora. Tente de novo." });
    } finally {
      if (atual === consultaId.current) setChecking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cnpjDigits = normalizarCnpj(cnpj);

    if (!orgName.trim()) {
      setError("Digite o nome da igreja.");
      return;
    }
    // CNPJ temporariamente opcional (fase de teste controlado, ver commit).
    // Se a pessoa preencheu algo, exige que tenha validado certinho; se deixou
    // em branco, deixa passar sem CNPJ nenhum.
    if (cnpjDigits.length > 0 && (checking || !lookup?.valid || !lookup?.active || lookup.cnpj !== cnpjDigits)) {
      setError("Confirme um CNPJ válido e ativo, ou deixe o campo em branco.");
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
    try {
      const { error: rpcError } = await supabase
        .schema("core")
        .rpc("bootstrap_church_org_v2", {
          p_org_name: orgName.trim(),
          p_cnpj: cnpjDigits || null,
          p_email: email.trim(),
          p_phone: phone.trim(),
          p_city: city.trim() || null,
          p_address: lookup?.address || null,
          p_postal_code: lookup?.postalCode || null,
          p_trial: true,
        });

      if (rpcError) {
        setError(friendlyBootstrapError(rpcError.message));
        return;
      }

      router.push("/service");
      router.refresh();
    } catch {
      setError("Não conseguimos concluir agora. Confira sua conexão e tente novamente. Seus dados continuam preenchidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="login-field">
        <span className="login-label">Nome da igreja</span>
        <input
          className="login-input"
          autoComplete="organization"
          required
          value={orgName}
          onChange={(event) => setOrgName(event.target.value)}
          placeholder="Igreja Central"
        />
      </label>

      <label className="login-field">
        <span className="login-label">E-mail de contato</span>
        <input
          className="login-input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="contato@igreja.com"
        />
      </label>

      <label className="login-field">
        <span className="login-label">Telefone de contato</span>
        <input
          className="login-input"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          type="tel" autoComplete="tel" placeholder="(11) 9..."
        />
      </label>

      <label className="login-field">
        <span className="login-label">Cidade</span>
        <input
          className="login-input"
          autoComplete="address-level2"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="São Paulo · SP"
        />
      </label>

      <details className="service-onboarding-optional"><summary>Dados institucionais (opcional)</summary>
      <label className="login-field">
        <span className="login-label">CNPJ da igreja (opcional)</span>
        <input
          className="login-input"
          value={formatarCnpj(cnpj)}
          onChange={(event) => {
            const digits = normalizarCnpj(event.target.value).slice(0, 14);
            ++consultaId.current;
            setChecking(false);
            setCnpj(digits);
            setLookup(null);
            if (digits.length === 14) checkCnpj(digits);
          }}
          placeholder="00.000.000/0000-00"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        {checking && <span className="login-help" role="status">Consultando a Receita Federal…</span>}
        {lookup && lookup.valid && lookup.active && (
          <span className="login-help" role="status">
            <Icon name="ok" size={13} /> CNPJ ativo{lookup.razaoSocial ? ` · ${lookup.razaoSocial}` : ""}
          </span>
        )}
        {lookup && !lookup.active && (
          <span className="login-help" role="alert">{lookup.error}</span>
        )}
      </label>

      </details>

      {error && <div className="login-alert" role="alert">{error}</div>}

      <Botao tamanho="entrada" variante="principal" type="submit" desativado={loading}>
        {loading ? "Criando..." : "Criar igreja matriz"}
      </Botao>
    </form>
  );
}
