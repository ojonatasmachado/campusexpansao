"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../lib/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/perfil";

  const [step, setStep] = useState<"email" | "login" | "cadastro">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  function changeEmail(value: string) {
    setEmail(value);
    setPassword("");
    setName("");
    setError("");
    setSuccess("");
    setStep("email");
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite um e-mail válido.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Não conseguimos validar este e-mail agora.");
        return;
      }

      setEmail(normalizedEmail);
      setStep(result.exists ? "login" : "cadastro");
    } catch {
      setError("Não conseguimos validar este e-mail agora.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (step === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError("Email ou senha incorretos."); setLoading(false); return; }
      router.push(redirect);
      router.refresh();
    } else {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("redirect", redirect);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: callbackUrl.toString(),
        },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setSuccess("Conta criada. Verifique seu e-mail para confirmar e voltar ao CE.X.");
      setLoading(false);
    }
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
              ? "Vamos verificar se você já tem acesso ou se precisa criar uma conta."
              : step === "login"
                ? "Encontramos sua conta. Agora coloque sua senha para continuar."
                : "Não encontramos uma conta com este e-mail. Complete o cadastro para continuar."}
          </p>
        </div>

        {success ? (
          <p style={{ color: "var(--olive)", fontSize: 14, lineHeight: 1.6, textAlign: "center" }}>
            {success}
          </p>
        ) : step === "email" ? (
          <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              <p style={{ color: "var(--terra)", fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Validando..." : "Continuar"}
            </button>
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
