"use client";
import { useState, Suspense } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";

function authErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (lower.includes("email not confirmed")) return "Seu e-mail ainda não foi confirmado. Confira sua caixa de entrada e confirme a conta antes de entrar.";
  if (lower.includes("already registered") || lower.includes("already been registered")) return "Este e-mail já tem uma conta. Tente entrar com sua senha.";
  if (lower.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return message || "Não conseguimos concluir agora.";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/perfil";
  const callbackError = params.get("erro");
  const initialError = callbackError === "confirmacao"
    ? "Não conseguimos confirmar seu acesso por esse link. Tente entrar ou peça um novo e-mail de confirmação."
    : "";

  const [step, setStep] = useState<"email" | "login" | "cadastro">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  async function ensureProfileForUser(user: User, fullName = "") {
    const email = user.email?.trim().toLowerCase();
    if (!email) return;

    const { data: existing } = await supabase
      .from("user_profiles")
      .select("user_id,full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      if (!existing.full_name && fullName.trim()) {
        await supabase
          .from("user_profiles")
          .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }
      return;
    }

    await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        email,
        full_name: fullName.trim() || user.user_metadata?.full_name || "",
      });
  }

  function confirmationUrl() {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirect", redirect);
    return callbackUrl.toString();
  }

  function changeEmail(value: string) {
    setEmail(value);
    setPassword("");
    setName("");
    setError("");
    setSuccess("");
    setStep("email");
  }

  function chooseAccessStep(nextStep: "login" | "cadastro") {
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite um e-mail válido.");
      return;
    }

    setEmail(normalizedEmail);
    setStep(nextStep);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite um e-mail válido.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (step === "cadastro" && !name.trim()) {
      setError("Digite seu nome.");
      setLoading(false);
      return;
    }

    if (step === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) { setError(authErrorMessage(error.message)); setLoading(false); return; }
      if (data.user) await ensureProfileForUser(data.user);
      router.push(redirect);
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: confirmationUrl(),
        },
      });
      if (error) {
        setError(authErrorMessage(error.message));
        if (error.message.toLowerCase().includes("registered")) setStep("login");
        setLoading(false);
        return;
      }

      if (data.session) {
        if (data.user) await ensureProfileForUser(data.user, name);
        router.push(redirect);
        router.refresh();
        return;
      }

      setSuccess("Conta criada. Confirme seu e-mail e o material será liberado na volta ao CE.X.");
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite o e-mail cadastrado para redefinir a senha.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirect", "/redefinir-senha");
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: callbackUrl.toString(),
    });

    setLoading(false);

    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }

    setSuccess("Te mandamos um e-mail com o link pra escolher uma senha nova. Confira sua caixa de entrada e também o spam.");
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite o e-mail cadastrado para reenviar a confirmação.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: confirmationUrl() },
    });

    setLoading(false);

    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }

    setSuccess("E-mail de confirmação reenviado. Confira sua caixa de entrada e também o spam.");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ink)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "var(--graphite)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "40px 36px",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "block", marginBottom: 32, textDecoration: "none" }}>
          <span style={{ fontWeight: 700, fontSize: 22, color: "var(--cream)", letterSpacing: "-0.5px" }}>
            CE<span style={{ color: "var(--olive)" }}>.X</span>
          </span>
        </Link>

        <div style={{ marginBottom: 28 }}>
          <p style={{
            color: "var(--olive)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            margin: "0 0 10px",
          }}>
            ◆ Acesso CE.X
          </p>
          <h1 style={{
            color: "var(--cream)",
            fontSize: 28,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            margin: "0 0 10px",
          }}>
            {step === "cadastro" ? "Criar sua conta" : step === "login" ? "Entrar na conta" : "Digite seu e-mail"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            {step === "email"
              ? "Digite seu e-mail e escolha se quer entrar ou criar uma conta."
              : step === "login"
                ? "Coloque sua senha para continuar."
                : "Complete o cadastro para liberar o material de teste."}
          </p>
        </div>

        {success ? (
          <p style={{ color: "var(--olive)", fontSize: 14, lineHeight: 1.6, textAlign: "center" }}>
            {success}
          </p>
        ) : step === "email" ? (
          <form onSubmit={(event) => event.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => changeEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                style={inputStyle}
              />
            </div>

            {error && (
              <div>
                <p style={{ color: "var(--terra)", fontSize: 13, margin: 0 }}>{error}</p>
                {error.includes("ainda não foi confirmado") && (
                  <button
                    type="button"
                    onClick={resendConfirmation}
                    disabled={loading}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-2)",
                      borderRadius: 8,
                      color: "var(--cream)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      marginTop: 10,
                      padding: "10px 12px",
                    }}
                  >
                    {loading ? "Reenviando..." : "Reenviar confirmação"}
                  </button>
                )}
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => chooseAccessStep("login")}
                style={buttonStyle}
              >
                Entrar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => chooseAccessStep("cadastro")}
                style={{
                  ...buttonStyle,
                  background: "transparent",
                  border: "1px solid var(--border-2)",
                  color: "var(--cream)",
                  marginTop: 0,
                }}
              >
                Criar conta
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--light)",
              fontSize: 13,
              lineHeight: 1.4,
              padding: "11px 14px",
            }}>
              <span style={{ color: "var(--muted)" }}>E-mail</span><br />
              {email}
            </div>

            {step === "cadastro" && (
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={step === "login" ? "current-password" : "new-password"}
                placeholder="········"
                minLength={6}
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ color: "var(--terra)", fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? "Aguarde..." : step === "login" ? "Entrar" : "Criar conta"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => changeEmail("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  padding: 0,
                }}
              >
                Usar outro e-mail
              </button>
              {step === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--olive)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    padding: 0,
                  }}
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--ink)",
  border: "1px solid var(--border-2)",
  borderRadius: 8,
  padding: "11px 14px",
  color: "var(--cream)",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 8,
  background: "var(--olive)",
  color: "var(--accent-ink, #0E110D)",
  border: "none",
  borderRadius: 8,
  padding: "13px 24px",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.04em",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
