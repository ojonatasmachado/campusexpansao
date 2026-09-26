import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Consulta de CEP : mesma API gratuita (BrasilAPI) já usada em
   /api/service/cnpj-lookup, agora pro endereço do membro no cadastro. Sem
   número : só rua, bairro, cidade e estado, que é o que o CEP devolve.
   Não exige login: o link do convite pede o CEP antes de a conta existir, e
   a BrasilAPI já é pública (esta rota só repassa a consulta). */

type BrasilApiCep = {
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

/* limite simples por IP (por instância do servidor): a rota não exige login,
   então não pode virar proxy aberto pra BrasilAPI. Uma pessoa digitando o
   CEP faz 1 ou 2 consultas; 20 por minuto sobra. */
const JANELA_MS = 60_000;
const LIMITE = 20;
const consultas = new Map<string, number[]>();

function passouDoLimite(ip: string): boolean {
  const agora = Date.now();
  const recentes = (consultas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  consultas.set(ip, recentes);
  if (consultas.size > 5000) consultas.clear();
  return recentes.length > LIMITE;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (passouDoLimite(ip)) {
    return NextResponse.json({ valid: false, error: "Muitas consultas de CEP. Espere um minuto e tente de novo." }, { status: 429 });
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
