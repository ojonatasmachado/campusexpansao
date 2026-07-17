import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Consulta de CEP : mesma API gratuita (BrasilAPI) já usada em
   /api/service/cnpj-lookup, agora pro endereço do membro no cadastro. Sem
   número : só rua, bairro, cidade e estado, que é o que o CEP devolve. */

type BrasilApiCep = {
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  let body: { cep?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }

  const digits = (body.cep ?? "").replace(/\D/g, "");
  if (digits.length !== 8) {
    return NextResponse.json({ valid: false, error: "CEP precisa ter 8 dígitos." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 404) {
      return NextResponse.json({ valid: false, error: "Não encontramos esse CEP." });
    }
    if (!res.ok) {
      return NextResponse.json({ valid: false, error: "Não conseguimos consultar o CEP agora. Tente de novo em instantes." });
    }

    const data = (await res.json()) as BrasilApiCep;

    return NextResponse.json({
      valid: true,
      street: data.street || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Não conseguimos consultar o CEP agora. Tente de novo em instantes." });
  }
}
