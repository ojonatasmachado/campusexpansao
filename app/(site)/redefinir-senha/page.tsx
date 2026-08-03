"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";
import Logo from "../../components/Logo";

function authErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return message || "Não conseguimos concluir agora.";
}

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setReady(!!data.user));
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/perfil");
      router.refresh();
    }, 1800);
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
        <Link href="/" style={{ display: "block", marginBottom: 32, textDecoration: "none" }}>
          <span style={{ fontSize: 22, color: "var(--cream)", letterSpacing: "-0.5px" }}>
            <Logo />
          </span>
        </Link>

        <div style={{ marginBottom: 28 }}>
          <p style={{
            color: "var(--olive)", fontFamily: "var(--mono)", fontSize: 11,
            letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px",
          }}>
            Acesso CE.X
          </p>
          <h1 style={{
            color: "var(--cream)", fontSize: 28, lineHeight: 1.05,
            letterSpacing: "-0.04em", margin: "0 0 10px",
          }}>
            Nova senha
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        {!ready ? (
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
            Este link de redefinição expirou ou já foi usado.{" "}
            <Link href="/login" style={{ color: "var(--olive)" }}>Pedir um novo →</Link>
          </p>
        ) : success ? (
          <p style={{ color: "var(--olive)", fontSize: 14, lineHeight: 1.6, textAlign: "center" }}>
            Senha atualizada. Te levando pro seu perfil...
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="········"
                minLength={6}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="········"
                minLength={6}
                style={inputStyle}
              />
            </div>

            {error && <p style={{ color: "var(--terra)", fontSize: 13, margin: 0 }}>{error}</p>}

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Aguarde..." : "Salvar nova senha"}
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
