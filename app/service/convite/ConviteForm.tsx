"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import CepInput, { type CepResult } from "../CepInput";

/* E-mail, senha e CEP obrigatórios no convite: o CEP entra aqui (e não só
   no primeiro acesso) porque depois a pessoa pode não preencher. */
export default function ConviteForm({ t }: { t: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState<CepResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Coloque um e-mail válido.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    if (cep.replace(/\D/g, "").length !== 8) return setError("Coloque o CEP com 8 números.");

    setLoading(true);
    try {
      const res = await fetch("/api/service/members/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          t,
          email,
          password,
          cep,
          street: endereco?.street ?? "",
          neighborhood: endereco?.neighborhood ?? "",
          city: endereco?.city ?? "",
          state: endereco?.state ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar seu acesso. Tente de novo.");
        return;
      }
      /* lembra a igreja pra, se a sessão cair, o app mandar pro login dela */
      if (data.slug) document.cookie = `cex_church_slug=${data.slug}; path=/; max-age=31536000; samesite=lax`;
      const { error: signInError } = await createServiceBrowserClient().auth.signInWithPassword({ email: data.email ?? email, password });
      router.push(signInError ? (data.slug ? `/${data.slug}/entrar` : "/service/login") : "/service");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
      <label className="field">
        <span className="field-label req">E-mail</span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="voce@email.com" />
      </label>
      <label className="field">
        <span className="field-label req">Senha</span>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
      </label>
      <label className="field">
        <span className="field-label req">Repita a senha</span>
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </label>
      <div className="field">
        <span className="field-label req">CEP de onde você mora</span>
        <CepInput value={cep} onChange={setCep} onResult={(r) => setEndereco(r)} />
        {endereco && (endereco.street || endereco.city) && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {[endereco.street, endereco.neighborhood, endereco.city && endereco.state ? `${endereco.city}/${endereco.state}` : endereco.city].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
        {loading ? "Aguarde..." : "Criar acesso e entrar"}
      </button>
    </form>
  );
}
