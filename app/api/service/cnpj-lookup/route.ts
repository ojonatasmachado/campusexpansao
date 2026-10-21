import { cnpjValido, normalizarCnpj } from "../../../service/lib/cnpj";
import { consultarCep, guardarConsultaEndereco } from "../../../service/lib/address-lookup-server";
import { enderecoDoCnpj } from "../../../service/lib/geo";
import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BrasilApiCnpj = {
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  let body: { cnpj?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie dados válidos." }, { status: 400 });
  }

  const digits = typeof body?.cnpj === "string" ? normalizarCnpj(body.cnpj) : "";
  if (!cnpjValido(digits)) {
    return NextResponse.json({ valid: false, error: "Esse CNPJ não é válido. Confira os números." }, { status: 200 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 404) {
      return NextResponse.json({ valid: false, error: "Não encontramos esse CNPJ na Receita Federal." });
    }
    if (!res.ok) {
      return NextResponse.json({ valid: false, error: "Não conseguimos consultar a Receita Federal agora. Tente de novo em instantes." });
    }

    const data = (await res.json()) as BrasilApiCnpj & Record<string, unknown>;
    const cep = String(data.cep ?? "").replace(/\D/g, "");
    let postal = null;
    try { postal = (await consultarCep(cep))?.data ?? null; } catch { /* endereço cadastral segue disponível; coordenadas ficam pendentes */ }
    const endereco = enderecoDoCnpj(data, postal);
    await guardarConsultaEndereco("cnpj", digits, endereco, data);
    const active = (data.descricao_situacao_cadastral ?? "").toUpperCase() === "ATIVA";

    if (!active) {
      return NextResponse.json({
        valid: true,
        active: false,
        error: `Esse CNPJ existe, mas está com situação "${data.descricao_situacao_cadastral ?? "desconhecida"}" na Receita Federal, não ativa.`,
      });
    }

    const address = [data.logradouro, data.numero, data.complemento].filter(Boolean).join(", ");

    return NextResponse.json({
      valid: true,
      active: true,
      cnpj: digits,
      razaoSocial: data.razao_social ?? null,
      nomeFantasia: data.nome_fantasia ?? null,
      address: address || null,
      neighborhood: data.bairro ?? null,
      city: data.municipio ?? null,
      state: data.uf ?? null,
      postalCode: data.cep ?? null,
      phone: data.ddd_telefone_1 ?? null,
      geocoded: endereco.latitude !== null,
      latitude: endereco.latitude,
      longitude: endereco.longitude,
      geoSource: endereco.geoSource,
      geoPrecision: endereco.geoPrecision,
      streetNumber: endereco.streetNumber,
      complement: endereco.complement,
      municipalityIbge: endereco.municipalityIbge,
      addressData: endereco,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Não conseguimos consultar a Receita Federal agora. Tente de novo em instantes." });
  }
}
