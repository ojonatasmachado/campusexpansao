"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import CepInput, { type CepResult } from "../CepInput";
import PasswordInput from "../PasswordInput";

/* E-mail, senha e CEP obrigatórios no convite: o CEP entra aqui (e não só
   no primeiro acesso) porque depois a pessoa pode não preencher.
   Lógica igual à anterior; markup nas classes .login-* (service-v5.css). */
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

  const enderecoTexto = endereco
    ? [endereco.street, endereco.neighborhood, endereco.city && endereco.state ? `${endereco.city}/${endereco.state}` : endereco.city].filter(Boolean).join(" · ")
    : "";

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label className="login-field">
        <span className="login-label">E-mail</span>
        <input
          className="login-input"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="voce@email.com"
        />
      </label>
      <label className="login-field">
        <span className="login-label">Crie uma senha</span>
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
      </label>
      <label className="login-field">
        <span className="login-label">Repita a senha</span>
        <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </label>
      <div className="login-field">
        <span className="login-label">CEP de onde você mora</span>
        <CepInput value={cep} onChange={setCep} onResult={(r) => setEndereco(r)} />
        <span className="login-help">{enderecoTexto || "A igreja usa pra saber a sua região."}</span>
      </div>
      {error && (
        <div className="login-alert" role="alert">
          {error}
        </div>
      )}
      <button className="login-btn" type="submit" disabled={loading}>
        {loading ? "Aguarde..." : "Criar acesso e entrar"}
      </button>
    </form>
  );
}
