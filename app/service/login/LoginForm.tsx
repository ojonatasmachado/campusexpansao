"use client";

import AuthShell from "../AuthShell";
import PasswordInput from "../PasswordInput";
import { useServiceLoginForm } from "./useServiceLoginForm";

import { Botao } from "../ui/Botao";
import { Acao } from "../ui/Acao";
import { useTexto } from "../lib/internacional/contexto";

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
  const t = useTexto();

  const f = useServiceLoginForm();
  const signup = f.mode === "signup";
  const naoConfirmado = f.emailNotConfirmed;

  const trocarIgreja = () => {
    document.cookie = "cex_church_slug=; path=/; max-age=0; samesite=lax";
    window.location.reload();
  };

  /* uma porta só (S28): membro e liderança entram pela mesma tela. Depois
     do login o /service abre o app (celular) ou o painel (computador, para
     quem tem função de gestão); o líder troca entre os dois quando quiser. */
  let eyebrow = t("Acesso");
  let title: string = churchName ? t("Entrar") : t("Entrar no Service");
  let subtitle = t("Use o e-mail e a senha do seu cadastro.");
  let footer: React.ReactNode = churchName ? (
    <>
      {t("Primeiro acesso? Abra o link de convite que a liderança mandou no seu WhatsApp.")}
      {variant === "service" && (
        <>
          <br />
          {t.rich("Não é da {igreja}? <trocar>Entrar por outra igreja</trocar>", { igreja: churchName, trocar: (chunks) => <Acao onClick={trocarIgreja}>{chunks}</Acao> })}
        </>
      )}
    </>
  ) : (
    <>
      {t("Primeiro acesso? Abra o link de convite que a liderança mandou.")}
      <br />
      {t.rich("Sua igreja ainda não usa o Service? <cadastrar>Cadastrar minha igreja</cadastrar>", { cadastrar: (chunks) => <Acao onClick={f.switchToSignup}>{chunks}</Acao> })}
    </>
  );

  if (signup) {
    eyebrow = t("Nova igreja");
    title = t("Cadastrar minha igreja");
    subtitle = t("Comece criando o seu acesso. Depois de confirmar o e-mail, você preenche os dados da igreja em um minuto.");
    footer = (
      <>
        {t.rich("Já tem acesso? <entrar>Entrar</entrar>", { entrar: (chunks) => <Acao onClick={() => f.setMode("login")}>{chunks}</Acao> })}
      </>
    );
  }

  return (
    <AuthShell churchName={churchName} logoUrl={logoUrl} eyebrow={eyebrow} title={title} subtitle={subtitle} footer={footer}>
      <form className="login-form" onSubmit={f.handleSubmit} noValidate>
        {signup && (
          <label className="login-field">
            <span className="login-label">{t("Seu nome")}</span>
            <input
              className="login-input"
              value={f.name}
              onChange={(event) => f.setName(event.target.value)}
              autoComplete="name"
              placeholder={t("Nome e sobrenome")}
            />
          </label>
        )}

        <label className="login-field">
          <span className="login-label">{t("E-mail")}</span>
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
            placeholder={t("voce@email.com")}
          />
        </label>

        <label className="login-field">
          <span className="login-label">{signup ? t("Crie uma senha") : t("Senha")}</span>
          <PasswordInput
            value={f.password}
            onChange={f.setPassword}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={signup ? t("Mínimo 6 caracteres") : t("Sua senha")}
          />
        </label>

        {f.error ? (
          <div className="login-alert" role="alert">
            {f.error}
            {(naoConfirmado || f.invalidCredentials) && (
              <div className="login-alert-actions">
                {naoConfirmado && (
                  <Acao onClick={f.resendConfirmation} desativado={f.resending}>
                    {f.resending ? t("Reenviando...") : t("Reenviar e-mail de confirmação")}
                  </Acao>
                )}
                {f.invalidCredentials && (
                  <Acao onClick={f.forgotPassword} desativado={f.resending}>
                    {f.resending ? t("Enviando...") : t("Criar uma senha nova")}
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
          {f.loading ? t("Aguarde...") : signup ? t("Criar meu acesso") : t("Entrar")}
        </Botao>
        {!signup && (
          <Botao tamanho="entrada" variante="texto" onClick={f.forgotPassword} desativado={f.resending}>
            {f.resending ? t("Enviando...") : t("Esqueci minha senha")}
          </Botao>
        )}
      </form>
    </AuthShell>
  );
}
