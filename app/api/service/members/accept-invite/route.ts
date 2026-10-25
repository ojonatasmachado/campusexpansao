import { getTexto } from "../../../../service/lib/internacional/servidor";
import { consultarCep } from "../../../../service/lib/address-lookup-server";
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../../lib/supabase";
import { ensureChurchSlug, findOpenInvite } from "../../../../lib/service-invite";
import { TERMO_MAPA_VERSAO } from "../../../../service/lib/termo-mapa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  t?: string;
  email?: string;
  password?: string;
  cep?: string;
  termoMapa?: string;
  country?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* A pessoa abriu o link do convite e informou e-mail e senha. Cria a
   conta (ou, se o e-mail já tem conta, confere a senha dela: nunca troca a
   senha de uma conta existente), liga a pessoa à ficha de membro e marca o
   convite como usado. Ver app/lib/service-invite.ts e a migração 0045. */
export async function POST(request: Request) {
  const traduzirUi = await getTexto(request);
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: traduzirUi("Envie dados válidos.") }, { status: 400 });
  }

  if (!body || typeof body !== "object") return NextResponse.json({ error: traduzirUi("Envie dados válidos.") }, { status: 400 });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: traduzirUi("Coloque um e-mail válido.") }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: traduzirUi("A senha precisa ter pelo menos 6 caracteres.") }, { status: 400 });

  const country = typeof body.country === "string" ? body.country.trim() : "Brasil";
  const cep = typeof body.cep === "string" ? body.cep.trim() : "";
  const brasil = /^(brasil|brazil|br)$/i.test(country);
  if (country.length < 2 || country.length > 80) return NextResponse.json({ error: traduzirUi("Informe um país válido.") }, { status: 400 });
  if (brasil && !/^\d{5}-?\d{3}$/.test(cep)) return NextResponse.json({ error: traduzirUi("Coloque o CEP com 8 números.") }, { status: 400 });
  if (cep.length > 32) return NextResponse.json({ error: traduzirUi("Use até 32 caracteres no código postal.") }, { status: 400 });
  if (!brasil && (typeof body.city !== "string" || !body.city.trim())) return NextResponse.json({ error: traduzirUi("Informe a cidade onde você mora.") }, { status: 400 });
  const endereco: Record<string, string | null> = { country: brasil ? "Brasil" : country, postal_code: cep ? (brasil ? cep.replace(/\D/g, "") : cep) : null };
  for (const [key, value] of Object.entries({ street: body.street, neighborhood: body.neighborhood, city: body.city, state: body.state })) {
    endereco[key] = typeof value === "string" && value.trim() ? value.trim().slice(0, 300) : null;
  }

  const db = supabaseAdmin();
  const invite = await findOpenInvite(db, typeof body.t === "string" ? body.t : "");
  const invalido = () => NextResponse.json({ error: traduzirUi("Este convite não vale mais. Peça um novo link ao líder da sua igreja.") }, { status: 410 });
  if (!invite) return invalido();

  /* reserva o convite antes de tudo, de forma atômica: dois cliques ao mesmo
     tempo não criam duas contas pro mesmo membro. Se algo falhar no meio,
     libera de novo (liberar) pra pessoa tentar outra vez. */
  const { data: claimed } = await db
    .schema("service")
    .from("member_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id");
  if (!claimed?.length) return invalido();
  const liberar = async (res: NextResponse) => {
    await db.schema("service").from("member_invites").update({ used_at: null }).eq("id", invite.id);
    return res;
  };

  /* conta: nova, ou a que já existe com esse e-mail (confere a senha dela) */
  let authUser: User | null = null;
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: invite.member.name, phone: invite.member.phone },
  });
  if (!createError && created.user) {
    authUser = created.user;
  } else {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data: signed, error: signError } = await anon.auth.signInWithPassword({ email, password });
    if (signError || !signed.user) {
      return liberar(NextResponse.json({ error: traduzirUi("Este e-mail já tem uma conta. Use a senha dela, ou informe outro e-mail.") }, { status: 409 }));
    }
    authUser = signed.user;
  }

  if (brasil) {
    try {
      const consulta = await consultarCep(cep.replace(/\D/g, ""), true);
      if (!consulta) return liberar(NextResponse.json({ error: traduzirUi("Não encontramos esse CEP. Confira os números.") }, { status: 400 }));
      Object.assign(endereco, { street: consulta.data.street, neighborhood: consulta.data.neighborhood, city: consulta.data.city, state: consulta.data.state });
    } catch {
      return liberar(NextResponse.json({ error: traduzirUi("Não conseguimos consultar seu CEP agora. Seus dados foram preservados; tente novamente em instantes.") }, { status: 503 }));
    }
  }

  const org = invite.organization_id;
  const svc = db.schema("service");

  /* pessoa (people) ligada à conta nesta igreja */
  let personId: string | null = null;
  const { data: existing } = await svc.from("people").select("id").eq("user_id", authUser.id).eq("organization_id", org).maybeSingle();
  if (existing) {
    personId = existing.id;
  } else if (invite.member.volunteer_id) {
    const { data: linked } = await svc.from("people").update({ user_id: authUser.id, email }).eq("id", invite.member.volunteer_id).is("user_id", null).select("id").maybeSingle();
    personId = linked?.id ?? null;
  }
  if (!personId) {
    const { data: person, error: personError } = await svc.from("people").insert({
      organization_id: org,
      church_id: invite.member.church_id,
      user_id: authUser.id,
      name: invite.member.name,
      phone: invite.member.phone,
      email,
      status: "ativo",
    }).select("id").single();
    if (personError) return liberar(NextResponse.json({ error: traduzirUi("Não foi possível criar seu acesso agora.") }, { status: 500 }));
    personId = person.id;
  }

  /* "Concordo e criar acesso": a tela mostra os 3 pontos do termo do mapa */
  const aceite = body.termoMapa === TERMO_MAPA_VERSAO
    ? { map_consent_at: new Date().toISOString(), map_consent_declined_at: null, map_consent_source: "convite", map_consent_terms: TERMO_MAPA_VERSAO }
    : {};
  const { error: memberError } = await svc.from("members").update({
    volunteer_id: personId,
    email,
    ...endereco,
    ...aceite,

  }).eq("id", invite.member_id);
  if (memberError) return liberar(NextResponse.json({ error: traduzirUi("Não foi possível criar seu acesso agora.") }, { status: 500 }));

  /* quem já tinha papel nesta igreja (ex: líder) mantém o dele */
  const { error: membershipError } = await db.schema("core").from("memberships").upsert(
    { user_id: authUser.id, organization_id: org, role: "membro", status: "active" },
    { onConflict: "user_id,organization_id", ignoreDuplicates: true },
  );
  if (membershipError) return liberar(NextResponse.json({ error: traduzirUi("Não foi possível liberar seu acesso à igreja. Tente novamente.") }, { status: 500 }));
  const { error: activationError } = await db.schema("core").from("memberships").update({ status: "active" }).eq("user_id", authUser.id).eq("organization_id", org).eq("status", "invited");

  if (activationError) return liberar(NextResponse.json({ error: traduzirUi("Não foi possível ativar seu acesso à igreja. Tente novamente.") }, { status: 500 }));

  const slug = await ensureChurchSlug(db, invite.member.church_id);
  return NextResponse.json({ ok: true, email, slug });
}
