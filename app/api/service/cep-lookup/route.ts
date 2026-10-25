import { getTexto } from "../../../service/lib/internacional/servidor";
import { consultarCep } from "../../../service/lib/address-lookup-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Consulta de CEP : mesma API gratuita (BrasilAPI) já usada em
   /api/service/cnpj-lookup, agora pro endereço do membro no cadastro. Sem
   número : só rua, bairro, cidade e estado, que é o que o CEP devolve.
   Não exige login: o link do convite pede o CEP antes de a conta existir, e
   a BrasilAPI já é pública (esta rota só repassa a consulta). */


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
  const traduzirUi = await getTexto(request);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (passouDoLimite(ip)) {
    return NextResponse.json({ valid: false, error: traduzirUi("Muitas consultas de CEP. Espere um minuto e tente de novo.") }, { status: 429 });
  }

  let body: { cep?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: traduzirUi("Envie dados válidos.") }, { status: 400 });
  }

  const digits = typeof body?.cep === "string" ? body.cep.replace(/\D/g, "") : "";
  if (digits.length !== 8) {
    return NextResponse.json({ valid: false, error: traduzirUi("CEP precisa ter 8 dígitos.") });
  }

  try {
    const lookup = await consultarCep(digits);
    if (!lookup) return NextResponse.json({ valid: false, error: traduzirUi("Não encontramos esse CEP.") });
    return NextResponse.json({ valid: true, ...lookup.data, geocoded: lookup.data.latitude !== null });
  } catch {
    return NextResponse.json({ valid: false, error: traduzirUi("Não conseguimos consultar o CEP agora. Tente de novo em instantes.") });
  }
}
