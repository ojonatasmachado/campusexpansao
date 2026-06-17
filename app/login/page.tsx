"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../lib/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/perfil";

  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "login") {
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "1px solid var(--border)" }}>
          {(["login", "cadastro"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: mode === m ? "2px solid var(--olive)" : "2px solid transparent",
                color: mode === m ? "var(--cream)" : "var(--muted)",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                padding: "0 0 12px",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: -1,
              }}
            >
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {success ? (
          <p style={{ color: "var(--olive)", fontSize: 14, lineHeight: 1.6, textAlign: "center" }}>
            {success}
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "cadastro" && (
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Seu nome"
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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
              style={{
                marginTop: 8,
                background: "var(--olive)",
                color: "var(--ink)",
                border: "none",
                borderRadius: 8,
                padding: "13px 24px",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                letterSpacing: "0.04em",
              }}
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
