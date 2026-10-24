"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient, createServiceRecoveryClient } from "../lib/supabase-browser";

import { useTexto } from "../lib/internacional/contexto";
import type { Text } from "../lib/internacional/mensagens";

export type LoginMode = "login" | "signup";

function errorMessage(message: string, t: Text) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return t("E-mail ou senha incorretos.");
  if (lower.includes("email not confirmed")) return t("Seu e-mail ainda não foi confirmado. Abra o e-mail de confirmação que enviamos (veja também o spam) e depois entre.");
  if (lower.includes("already registered")) return t("Este e-mail já tem uma conta. Tente entrar.");
  if (lower.includes("password")) return t("A senha precisa ter pelo menos 6 caracteres.");
  if (lower.includes("rate limit")) return t("Muitas tentativas seguidas. Espere alguns minutos e tente de novo.");
  if (lower.includes("signups not allowed") || lower.includes("signup is disabled")) return t("O cadastro de novas contas está fechado agora.");
  if (lower.includes("failed to fetch") || lower.includes("network")) return t("Sem conexão com a internet. Confira e tente de novo.");
  console.error("[service] login:", message);
  return t("Não conseguimos entrar agora. Tente de novo em instantes.");
}

/* Estado + lógica de autenticação do login do Service (entrar / criar conta
   / reenvio de confirmação), extraída de LoginForm.tsx pra ser reaproveitada
   também pelo login temático da igreja (app/[slug]/entrar) sem duplicar a
   chamada ao Supabase. Os dois formulários só desenham a UI em cima deste
   hook : comportamento de autenticação idêntico nos dois. */
export function useServiceLoginForm() {
  const t = useTexto();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createServiceBrowserClient();
  const redirectTarget = searchParams.get("redirect") || "/service/onboarding";
  const [mode, setMode] = useState<LoginMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  /* true só quando "Entrar" falha por credenciais inválidas (não em outros
     erros, tipo e-mail não confirmado) : o Supabase nunca diz se foi o
     e-mail que não existe ou a senha errada (proteção contra descobrir
     quais e-mails têm conta), então a UI usa isto pra sugerir criar uma
     igreja nova com esse e-mail, sem afirmar que ele não existe. */
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [invalidCredentials, setInvalidCredentials] = useState(false);

  function callbackUrl() {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("redirect", "/service/onboarding");
    return url.toString();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setInvalidCredentials(false);
    setEmailNotConfirmed(false);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError(t("Digite um e-mail válido."));
      return;
    }

    if (password.length < 6) {
      setError(t("A senha precisa ter pelo menos 6 caracteres."));
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError(t("Digite seu nome."));
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
        setEmailNotConfirmed(signInError.code === "email_not_confirmed" || signInError.message.toLowerCase().includes("email not confirmed"));
        setError(errorMessage(signInError.message, t));
        if (signInError.message.toLowerCase().includes("invalid login")) setInvalidCredentials(true);
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
      setError(errorMessage(signUpError.message, t));
      return;
    }

    if (data.session) {
      router.push(redirectTarget);
      router.refresh();
      return;
    }

    setSuccess(t("Conta criada. Confirme seu e-mail e depois volte para entrar no Service."));
  }

  async function resendConfirmation() {
    setEmailNotConfirmed(false);
    setInvalidCredentials(false);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError(t("Digite o e-mail cadastrado para reenviar a confirmação."));
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
      setError(errorMessage(resendError.message, t));
      return;
    }

    setSuccess(t("E-mail de confirmação reenviado. Veja sua caixa de entrada e também o spam."));
  }

  /* "Esqueci minha senha": o link do e-mail leva direto pra
     /service/nova-senha com a autorização no próprio link (fluxo implicit,
     ver createServiceRecoveryClient), então funciona em qualquer aparelho */
  async function forgotPassword() {
    setEmailNotConfirmed(false);
    setInvalidCredentials(false);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError(t("Digite o e-mail da sua conta e toque de novo em Esqueci minha senha."));
      return;
    }
    setError("");
    setSuccess("");
    setResending(true);
    const { error: resetError } = await createServiceRecoveryClient().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: new URL("/service/nova-senha", window.location.origin).toString(),
    });
    setResending(false);
    if (resetError) {
      setError(errorMessage(resetError.message, t));
      return;
    }
    setSuccess(t("Se esse e-mail tiver conta, chega um link para você criar uma senha nova. Veja também o spam."));
  }

  function switchToSignup() {
    setInvalidCredentials(false);
    setEmailNotConfirmed(false);
    setError("");
    setMode("signup");
  }

  return {
    mode, setMode,
    name, setName,
    email, setEmail,
    password, setPassword,
    loading, resending,
    error, success,
    invalidCredentials, emailNotConfirmed, switchToSignup,
    handleSubmit, resendConfirmation, forgotPassword,
  };
}
