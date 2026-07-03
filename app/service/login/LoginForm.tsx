"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../lib/supabase-browser";

type Mode = "login" | "signup";

function errorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (lower.includes("email not confirmed")) return "Seu e-mail ainda não foi confirmado. Abra o e-mail do Supabase e confirme a conta antes de entrar.";
  if (lower.includes("already registered")) return "Este e-mail já tem uma conta. Tente entrar.";
  if (lower.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return message || "Não conseguimos concluir agora.";
}

export default function ServiceLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createServiceBrowserClient();
  const redirectTarget = searchParams.get("redirect") || "/service/onboarding";
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function callbackUrl() {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("redirect", "/service/onboarding");
    return url.toString();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite um e-mail válido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Digite seu nome.");
      return;
    }

    setLoading(true);

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      setLoading(false);
      if (signInError) {
        setError(errorMessage(signInError.message));
        return;
      }

      router.push(redirectTarget);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: callbackUrl(),
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(errorMessage(signUpError.message));
      return;
    }

    if (data.session) {
      router.push(redirectTarget);
      router.refresh();
      return;
    }

    setSuccess("Conta criada. Confirme seu e-mail e depois volte para entrar no Service.");
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite o e-mail cadastrado para reenviar a confirmação.");
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: callbackUrl() },
    });

    setResending(false);

    if (resendError) {
      setError(errorMessage(resendError.message));
      return;
    }

    setSuccess("E-mail de confirmação reenviado. Veja sua caixa de entrada e também o spam.");
  }

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card-body">
            <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
              CE<span>.X</span>
            </Link>

            <p className="eyebrow" style={{ color: "var(--wheat)", marginTop: 28 }}>
              ◆ SERVICE · ACESSO
            </p>
            <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
              {mode === "login" ? "Entrar no Service" : "Criar conta do Service"}
            </h1>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
              Use seu e-mail e senha. A primeira igreja será criada no próximo passo.
            </p>

            <div className="segmented" style={{ marginTop: 24 }}>
              <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
                Entrar
              </button>
              <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
                Criar conta
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
              {mode === "signup" && (
                <label className="field">
                  <span className="field-label req">Nome</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Seu nome"
                  />
                </label>
              )}

              <label className="field">
                <span className="field-label req">E-mail</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="voce@igreja.com"
                />
              </label>

              <label className="field">
                <span className="field-label req">Senha</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>

              {error && (
                <div>
                  <p className="field-error">{error}</p>
                  {error.includes("ainda não foi confirmado") && (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={resendConfirmation}
                      disabled={resending}
                      style={{ marginTop: 10 }}
                    >
                      {resending ? "Reenviando..." : "Reenviar confirmação"}
                    </button>
                  )}
                </div>
              )}
              {success && (
                <div className="banner banner-soft">
                  <strong style={{ color: "var(--olive-soft)" }}>{success}</strong>
                </div>
              )}

              <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
