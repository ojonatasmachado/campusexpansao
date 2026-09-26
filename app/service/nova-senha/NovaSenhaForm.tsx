"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";

export default function NovaSenhaForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    setLoading(true);
    const { error: updateError } = await createServiceBrowserClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      const igual = updateError.code === "same_password" || /different from the old/i.test(updateError.message);
      return setError(igual ? "Escolha uma senha diferente da atual." : "Não foi possível salvar a senha. Tente de novo.");
    }
    router.push("/service");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
      <label className="field">
        <span className="field-label req">Senha nova</span>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
      </label>
      <label className="field">
        <span className="field-label req">Repita a senha</span>
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </label>
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar e entrar"}
      </button>
    </form>
  );
}
