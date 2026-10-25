import { getTexto } from "../../../service/lib/internacional/servidor";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../lib/supabase";
import { ensureChurchSlug } from "../../../lib/service-invite";
import { findEntryLink } from "../../../lib/service-entrada";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = { codigo?: string; nome?: string; telefone?: string; email?: string; senha?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Quem abriu o link (ou digitou o código) da igreja cria a conta aqui e vira
   um pedido de entrada (service.entry_requests, 0071). A regra da igreja
   decide o resto: "aprovar" espera a gestão; "direto" ativa no primeiro login
   (service.entrada_minha), quando o e-mail já está confirmado.

   Segurança:
   · código inválido responde antes de criar qualquer conta;
   · a conta é criada pelo cadastro normal do Supabase (respeita a confirmação
     de e-mail do projeto), nunca pelo admin: ninguém nasce confirmado aqui;
   · e-mail que já tem conta só segue com a senha certa dessa conta (nunca
     troca a senha nem liga a pessoa sem provar que é dona);
   · com a confirmação ligada, e-mail existente com senha errada recebe a
     mesma resposta de uma conta nova ("confira seu e-mail"), sem revelar
     que a conta existe;
   · o pedido nunca liga a conta a uma ficha já cadastrada: isso é só a
     gestão, ao aprovar. */
export async function POST(request: Request) {
  const traduzirUi = await getTexto(request);
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: traduzirUi("Envie dados válidos.") }, { status: 400 });
  }

  const nome = (body.nome ?? "").trim().replace(/\s+/g, " ");
  const telefone = (body.telefone ?? "").replace(/\D/g, "");
  const email = (body.email ?? "").trim().toLowerCase();
  const senha = body.senha ?? "";
  if (nome.length < 2 || nome.length > 120 || !nome.includes(" ")) return NextResponse.json({ error: traduzirUi("Coloque seu nome e sobrenome.") }, { status: 400 });
  if (telefone.length < 10 || telefone.length > 13) return NextResponse.json({ error: traduzirUi("Coloque o telefone com DDD.") }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: traduzirUi("Coloque um e-mail válido.") }, { status: 400 });
  if (senha.length < 6 || senha.length > 72) return NextResponse.json({ error: traduzirUi("A senha precisa ter pelo menos 6 caracteres.") }, { status: 400 });

  const db = supabaseAdmin();
  const link = await findEntryLink(db, body.codigo ?? "");
  if (!link) return NextResponse.json({ error: traduzirUi("Este link não vale mais. Peça o novo à liderança da igreja.") }, { status: 410 });

  const slug = await ensureChurchSlug(db, link.churchId);
  const origin = new URL(request.url).origin;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  /* conta: nova pelo cadastro normal, ou a existente com a senha dela */
  let userId: string | null = null;
  let confirmado = false;
  const { data: signed, error: signUpError } = await anon.auth.signUp({
    email,
    password: senha,
    options: { data: { full_name: nome, phone: telefone }, emailRedirectTo: `${origin}${slug ? `/${slug}/entrar` : "/service/login"}` },
  });
  const existe = !!signUpError && /already|registered|exists/i.test(signUpError.message);
  const existeOculto = !signUpError && !!signed.user && (signed.user.identities?.length ?? 0) === 0;
  if (!signUpError && signed.user && !existeOculto) {
    userId = signed.user.id;
    confirmado = !!signed.session || !!signed.user.email_confirmed_at;
  } else if (existe || existeOculto) {
    const { data: login, error: loginError } = await anon.auth.signInWithPassword({ email, password: senha });
    if (loginError || !login.user) {
      /* confirmação ligada: mesma resposta de uma conta nova (não revela a conta) */
      if (existeOculto) return NextResponse.json({ estado: "confirmar", email, slug });
      return NextResponse.json({ error: traduzirUi("Este e-mail já tem conta no Service. Use a senha dela ou recupere a senha em Entrar.") }, { status: 409 });
    }
    userId = login.user.id;
    confirmado = true;
  } else {
    const limite = signUpError && /rate|too many|seconds/i.test(signUpError.message);
    return NextResponse.json(
      { error: limite ? traduzirUi("Muitas tentativas seguidas. Espere um minuto e tente de novo.") : traduzirUi("Não conseguimos criar sua conta agora. Tente de novo.") },
      { status: limite ? 429 : 400 },
    );
  }

  /* já faz parte (ou está com o acesso pausado): não abre pedido */
  const { data: vinculo } = await db.schema("core").from("memberships").select("status").eq("user_id", userId).eq("organization_id", link.organizationId).maybeSingle();
  if (vinculo?.status === "active") return NextResponse.json({ estado: "membro", email, slug });
  if (vinculo?.status === "suspended") return NextResponse.json({ error: traduzirUi("Seu acesso nesta igreja está pausado. Fale com a liderança.") }, { status: 403 });

  const { error: pedidoError } = await db.schema("service").from("entry_requests").insert({
    organization_id: link.organizationId,
    church_id: link.churchId,
    user_id: userId,
    name: nome,
    email,
    phone: telefone,
    auto: link.rule === "direto",
  });
  /* pedido em aberto já existe: vale o que está lá */
  if (pedidoError && !/duplicate|unique/i.test(pedidoError.message)) {
    return NextResponse.json({ error: traduzirUi("Não conseguimos registrar seu pedido agora. Tente de novo.") }, { status: 500 });
  }

  const estado = !confirmado ? "confirmar" : link.rule === "direto" ? "direto" : "pendente";
  return NextResponse.json({ estado, email, slug });
}
