"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../lib/supabase-browser";

export type LoginMode = "login" | "signup";

function errorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (lower.includes("email not confirmed")) return "Seu e-mail ainda não foi confirmado. Abra o e-mail do Supabase e confirme a conta antes de entrar.";
  if (lower.includes("already registered")) return "Este e-mail já tem uma conta. Tente entrar.";
  if (lower.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return message || "Não conseguimos concluir agora.";
}

/* Estado + lógica de autenticação do login do Service (entrar / criar conta
   / reenvio de confirmação), extraída de LoginForm.tsx pra ser reaproveitada
   também pelo login temático da igreja (app/[slug]/entrar) sem duplicar a
   chamada ao Supabase. Os dois formulários só desenham a UI em cima deste
   hook : comportamento de autenticação idêntico nos dois. */
export function useServiceLoginForm() {
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

  function callbackUrl() {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("redirect", "/service/onboarding");
    return url.toString();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite um e-mail válido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Digite seu nome.");
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
        setError(errorMessage(signInError.message));
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
      setError(errorMessage(signUpError.message));
      return;
    }

    if (data.session) {
      router.push(redirectTarget);
      router.refresh();
      return;
    }

    setSuccess("Conta criada. Confirme seu e-mail e depois volte para entrar no Service.");
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Digite o e-mail cadastrado para reenviar a confirmação.");
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
      setError(errorMessage(resendError.message));
      return;
    }

    setSuccess("E-mail de confirmação reenviado. Veja sua caixa de entrada e também o spam.");
  }

  return {
    mode, setMode,
    name, setName,
    email, setEmail,
    password, setPassword,
    loading, resending,
    error, success,
    handleSubmit, resendConfirmation,
  };
}
