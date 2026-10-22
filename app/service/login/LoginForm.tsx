"use client";

import AuthShell from "../AuthShell";
import PasswordInput from "../PasswordInput";
import { useServiceLoginForm } from "./useServiceLoginForm";

import { Botao } from "../ui/Botao";
import { Acao } from "../ui/Acao";
/* UI única de login, em cima do useServiceLoginForm (lógica intacta).
   variant "service" = /service/login · variant "igreja" = /[slug]/entrar.
   Os dois endereços mostram a mesma entrada (S28); a diferença é só que o
   endereço da igreja já vem com a marca dela e não oferece trocar de igreja
   nem cadastrar uma igreja nova. */
export default function ServiceLoginForm({
  churchName = null,
  logoUrl = null,
  variant = "service",
}: {
  churchName?: string | null;
  logoUrl?: string | null;
  variant?: "service" | "igreja";
}) {
  const f = useServiceLoginForm();
  const signup = f.mode === "signup";
  const naoConfirmado = f.error.includes("ainda não foi confirmado");

  const trocarIgreja = () => {
    document.cookie = "cex_church_slug=; path=/; max-age=0; samesite=lax";
    window.location.reload();
  };

  /* uma porta só (S28): membro e liderança entram pela mesma tela. Depois
     do login o /service abre o app (celular) ou o painel (computador, para
     quem tem função de gestão); o líder troca entre os dois quando quiser. */
  let eyebrow = "Acesso";
  let title: string = churchName ? "Entrar" : "Entrar no Service";
  let subtitle = "Use o e-mail e a senha do seu cadastro.";
  let footer: React.ReactNode = churchName ? (
    <>
      Primeiro acesso? Abra o link de convite que a liderança mandou no seu WhatsApp.
      {variant === "service" && (
        <>
          <br />
          Não é da {churchName}? <Acao onClick={trocarIgreja}>Entrar por outra igreja</Acao>
        </>
      )}
    </>
  ) : (
    <>
      Primeiro acesso? Abra o link de convite que a liderança mandou.
      <br />
      Sua igreja ainda não usa o Service? <Acao onClick={f.switchToSignup}>Cadastrar minha igreja</Acao>
    </>
  );

  if (signup) {
    eyebrow = "Nova igreja";
    title = "Cadastrar minha igreja";
    subtitle = "Comece criando o seu acesso. Depois de confirmar o e-mail, você preenche os dados da igreja em um minuto.";
    footer = (
      <>
        Já tem acesso? <Acao onClick={() => f.setMode("login")}>Entrar</Acao>
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
                  <Acao onClick={f.resendConfirmation} desativado={f.resending}>
                    {f.resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
                  </Acao>
                )}
                {f.invalidCredentials && (
                  <Acao onClick={f.forgotPassword} desativado={f.resending}>
                    {f.resending ? "Enviando..." : "Criar uma senha nova"}
                  </Acao>
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

        <Botao tamanho="entrada" variante="principal" type="submit" desativado={f.loading}>
          {f.loading ? "Aguarde..." : signup ? "Criar meu acesso" : "Entrar"}
        </Botao>
        {!signup && (
          <Botao tamanho="entrada" variante="texto" onClick={f.forgotPassword} desativado={f.resending}>
            {f.resending ? "Enviando..." : "Esqueci minha senha"}
          </Botao>
        )}
      </form>
    </AuthShell>
  );
}
