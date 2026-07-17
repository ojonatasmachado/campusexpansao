"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { ChurchPageData } from "../../lib/church-page";
import { accentInk, resolveBackground } from "../../lib/church-page";
import LogoMark from "../LogoMark";
import { useServiceLoginForm } from "../../service/login/useServiceLoginForm";

/* UI do login temático, em cima do mesmo useServiceLoginForm do login
   genérico (app/service/login/LoginForm.tsx) : zero duplicação da lógica de
   autenticação, só uma casca visual diferente (--cx-* em vez do CSS do
   Service). --cx-accent vem de data.serviceAccent (brandCfg.accentDark),
   não de data.pagina.accentColor : login usa a cor do Service, não o
   override da Página pública. Só "Entrar" : criar conta aqui abriria uma
   organização nova sem relação com esta igreja. */
export default function ThemedLoginForm({ data }: { data: ChurchPageData }) {
  const {
    email, setEmail,
    password, setPassword,
    loading, resending,
    error, success,
    handleSubmit, resendConfirmation,
  } = useServiceLoginForm();

  const vars = {
    "--cx-bg": resolveBackground(data.pagina),
    "--cx-text": data.pagina.textColor,
    "--cx-accent": data.serviceAccent,
    "--cx-accent-ink": accentInk(data.serviceAccent),
    "--cx-box": data.pagina.boxColor,
  } as CSSProperties;

  return (
    <div className="cx-page" style={vars}>
      <div className="cx-shell">
        <div className="cx-login">
          <header className="cx-header">
            <LogoMark data={data} />
            {data.pagina.logoMode !== "texto" && <h1 className="cx-name">{data.name}</h1>}
          </header>

          <p className="cx-login-eyebrow">◆ Acesso da equipe</p>

          <form className="cx-form" onSubmit={handleSubmit}>
            <label className="cx-field">
              <span className="cx-field-label">E-mail</span>
              <input
                className="cx-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="voce@igreja.com"
              />
            </label>

            <label className="cx-field">
              <span className="cx-field-label">Senha</span>
              <input
                className="cx-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Sua senha"
              />
            </label>

            {error && (
              <div>
                <p className="cx-error">{error}</p>
                {error.includes("ainda não foi confirmado") && (
                  <button type="button" className="cx-btn" style={{ marginTop: 10 }} onClick={resendConfirmation} disabled={resending}>
                    {resending ? "Reenviando..." : "Reenviar confirmação"}
                  </button>
                )}
              </div>
            )}
            {success && <p className="cx-error" style={{ color: "var(--cx-accent)" }}>{success}</p>}

            <button className="cx-btn" type="submit" disabled={loading}>
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </form>

          <Link href="/service/login" className="cx-login-back">
            Entrar com outra conta
          </Link>
        </div>
      </div>
    </div>
  );
}
