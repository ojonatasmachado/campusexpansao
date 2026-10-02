"use client";

import AuthShell from "../AuthShell";
import PasswordInput from "../PasswordInput";
import { useServiceLoginForm } from "./useServiceLoginForm";

/* UI única de login, em cima do useServiceLoginForm (lógica intacta).
   variant "service" = /service/login (gestão da igreja) · variant "igreja" =
   /[slug]/entrar (app do membro). As duas portas continuam separadas: o
   membro entra pelo endereço da igreja, a liderança por aqui. "Criar conta"
   saiu do topo: só serve pra quem vai cadastrar uma igreja nova, e fica no
   rodapé da gestão, com o nome certo. */
export default function ServiceLoginForm({
  churchName = null,
  logoUrl = null,
  churchSlug = null,
  variant = "service",
}: {
  churchName?: string | null;
  logoUrl?: string | null;
  churchSlug?: string | null;
  variant?: "service" | "igreja";
}) {
  const f = useServiceLoginForm();
  const signup = f.mode === "signup";
  const naoConfirmado = f.error.includes("ainda não foi confirmado");

  const trocarIgreja = () => {
    document.cookie = "cex_church_slug=; path=/; max-age=0; samesite=lax";
    window.location.reload();
  };

  let eyebrow = "Gestão da igreja";
  let title: string = "Entrar na gestão";
  let subtitle = "Para pastores e líderes. Membros entram pelo app da igreja, no link que a liderança mandou.";
  let footer: React.ReactNode = (
    <>
      Sua igreja ainda não usa o Service?{" "}
      <button type="button" onClick={f.switchToSignup}>Cadastrar minha igreja</button>
    </>
  );

  if (variant === "igreja") {
    eyebrow = "App da igreja";
    title = "Entrar no app";
    subtitle = "Use o e-mail e a senha que você criou quando abriu o convite.";
    footer = <>Primeiro acesso? Abra o link de convite que a liderança mandou no seu WhatsApp.</>;
  } else if (signup) {
    eyebrow = "Nova igreja";
    title = "Cadastrar minha igreja";
    subtitle = "Comece criando o seu acesso. Depois de confirmar o e-mail, você preenche os dados da igreja em um minuto.";
    footer = (
      <>
        Já tem acesso? <button type="button" onClick={() => f.setMode("login")}>Entrar</button>
      </>
    );
  } else if (churchName) {
    footer = (
      <>
        {churchSlug ? (
          <>
            É membro? <a href={`/${churchSlug}/entrar`}>Entrar no app da igreja</a>
            <br />
          </>
        ) : null}
        Não é da {churchName}? <button type="button" onClick={trocarIgreja}>Entrar por outra igreja</button>
      </>
    );
  }

  return (
    <AuthShell churchName={churchName} logoUrl={logoUrl} eyebrow={eyebrow} title={title} subtitle={subtitle} footer={footer}>
      <form className="login-form" onSubmit={f.handleSubmit} noValidate>
        {signup && (
          <label className="login-field">
            <span className="login-label">Seu nome</span>
            <input
              className="login-input"
              value={f.name}
              onChange={(event) => f.setName(event.target.value)}
              autoComplete="name"
              placeholder="Nome e sobrenome"
            />
          </label>
        )}

        <label className="login-field">
          <span className="login-label">E-mail</span>
          <input
            className="login-input"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={f.email}
            onChange={(event) => f.setEmail(event.target.value)}
            autoComplete="email"
            placeholder="voce@email.com"
          />
        </label>

        <label className="login-field">
          <span className="login-label">{signup ? "Crie uma senha" : "Senha"}</span>
          <PasswordInput
            value={f.password}
            onChange={f.setPassword}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={signup ? "Mínimo 6 caracteres" : "Sua senha"}
          />
        </label>

        {f.error ? (
          <div className="login-alert" role="alert">
            {f.error}
            {(naoConfirmado || f.invalidCredentials) && (
              <div className="login-alert-actions">
                {naoConfirmado && (
                  <button type="button" onClick={f.resendConfirmation} disabled={f.resending}>
                    {f.resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
                  </button>
                )}
                {f.invalidCredentials && (
                  <button type="button" onClick={f.forgotPassword} disabled={f.resending}>
                    {f.resending ? "Enviando..." : "Criar uma senha nova"}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}
        {f.success ? (
          <div className="login-alert ok" role="status">
            {f.success}
          </div>
        ) : null}

        <button className="login-btn" type="submit" disabled={f.loading}>
          {f.loading ? "Aguarde..." : signup ? "Criar meu acesso" : "Entrar"}
        </button>
        {!signup && (
          <button className="login-link" type="button" onClick={f.forgotPassword} disabled={f.resending}>
            {f.resending ? "Enviando..." : "Esqueci minha senha"}
          </button>
        )}
      </form>
    </AuthShell>
  );
}
