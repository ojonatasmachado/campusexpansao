"use client";

import Link from "next/link";
import Logo from "../../components/Logo";
import { useServiceLoginForm } from "./useServiceLoginForm";

export default function ServiceLoginForm() {
  const {
    mode, setMode,
    name, setName,
    email, setEmail,
    password, setPassword,
    loading, resending,
    error, success,
    handleSubmit, resendConfirmation,
  } = useServiceLoginForm();

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card-body">
            <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
              <Logo />
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
