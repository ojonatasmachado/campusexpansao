"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";

export default function ConviteForm({ u, t, email }: { u: string; t: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");

    setLoading(true);
    try {
      const res = await fetch("/api/service/members/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ u, t, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível salvar a senha. Tente de novo.");
        return;
      }
      const { error: signInError } = await createServiceBrowserClient().auth.signInWithPassword({ email, password });
      if (signInError) {
        router.push("/service/login");
        return;
      }
      router.push("/service");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
      <label className="field">
        <span className="field-label">E-mail</span>
        <input className="input" type="email" value={email} readOnly autoComplete="username" />
      </label>
      <label className="field">
        <span className="field-label req">Senha</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
        />
      </label>
      <label className="field">
        <span className="field-label req">Repita a senha</span>
        <input
          className="input"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />
      </label>
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
        {loading ? "Aguarde..." : "Criar senha e entrar"}
      </button>
    </form>
  );
}
