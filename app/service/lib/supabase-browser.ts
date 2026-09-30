"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar configuradas.");
  }

  return { url, anonKey };
}

export function createServiceBrowserClient() {
  const { url, anonKey } = readSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

/* Só pra pedir o e-mail de "Esqueci minha senha". O cliente normal usa PKCE:
   o link do e-mail só funciona no mesmo navegador que pediu, porque depende
   de um código guardado nele. Quem abre o e-mail em outro aparelho (ou no
   navegador interno do app de e-mail) caía num login pedindo a senha que
   esqueceu. No fluxo "implicit" a autorização vai no próprio link, então ele
   funciona em qualquer lugar; /service/nova-senha lê e cria a sessão. */
export function createServiceRecoveryClient() {
  const { url, anonKey } = readSupabaseEnv();
  return createClient(url, anonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
