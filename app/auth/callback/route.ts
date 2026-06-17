import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/perfil";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirect = safeRedirectPath(url.searchParams.get("redirect"));
  const nextUrl = new URL(redirect, url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return NextResponse.redirect(nextUrl);
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("redirect", redirect);
  loginUrl.searchParams.set("erro", "confirmacao");

  return NextResponse.redirect(loginUrl);
}
