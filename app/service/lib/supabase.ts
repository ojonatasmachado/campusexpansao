import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function readSupabaseEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configuradas.");
  }

  return { url, anonKey };
}

export async function createServiceSupabaseClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = readSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Next bloqueia escrita de cookies em Server Components. O middleware cuida disso.
        }
      },
    },
  });
}
