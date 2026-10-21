import type { supabaseAdmin } from "./supabase";
import { consultarCep } from "../service/lib/address-lookup-server";

/* Job de reserva do mapa (docs/service-v7/mapa/PLANO.md, 2.4 e 2.10).
   Quem tem CEP brasileiro e ficou sem ponto (cadastro feito antes da consulta,
   importação de planilha, CEP fora do CNEFE) ganha uma consulta à BrasilAPI;
   o trigger de endereço recalcula o ponto. Poucos CEPs por rodada: o cron
   roda de hora em hora e a BrasilAPI é gratuita. CEP não encontrado espera
   30 dias para nova tentativa. */

const POR_RODADA = 10;
const ESPERA_FALHA_MS = 30 * 24 * 3600 * 1000;
const TABELAS = ["members", "churches", "fellowship_groups"] as const;

type Db = ReturnType<ReturnType<typeof supabaseAdmin>["schema"]>;

export async function geocodificarPendentes(db: Db): Promise<{ consultados: number; recalculados: number }> {
  /* CEPs que falharam há pouco saem já na consulta: senão 300 fichas presas
     num CEP inválido ocupariam a fila para sempre */
  const { data: falhasRecentes } = await db.from("cep_falhas").select("cep").gte("tentado_em", new Date(Date.now() - ESPERA_FALHA_MS).toISOString()).limit(300);
  const excluir = (falhasRecentes ?? []).map((f) => f.cep as string);
  const pendentes = new Set<string>();
  for (const tabela of TABELAS) {
    /* "00000000" nunca existe: deixa o filtro sempre válido, mesmo sem falhas */
    const { data, error } = await db.from(tabela).select("postal_code, country").is("latitude", null).not("postal_code", "is", null)
      .not("postal_code", "in", `(${["00000000", ...excluir].join(",")})`).limit(300);
    if (error) throw error;
    for (const r of data ?? []) {
      const pais = String(r.country ?? "").trim().toLowerCase();
      if (pais && !["brasil", "brazil", "br"].includes(pais)) continue;
      const cep = String(r.postal_code ?? "").replace(/\D/g, "");
      if (/^\d{8}$/.test(cep)) pendentes.add(cep);
    }
  }
  if (!pendentes.size) return { consultados: 0, recalculados: 0 };

  /* já consultado (a BrasilAPI respondeu, com ou sem coordenada) ou falhou há pouco: pula */
  const lista = [...pendentes];
  const { data: jaTem } = await db.from("address_lookups").select("lookup_key, data").eq("kind", "cep").in("lookup_key", lista);
  const { data: falhas } = await db.from("cep_falhas").select("cep").in("cep", lista).gte("tentado_em", new Date(Date.now() - ESPERA_FALHA_MS).toISOString());
  const pular = new Set([...(jaTem ?? []).map((r) => r.lookup_key as string), ...(falhas ?? []).map((r) => r.cep as string)]);
  const fila = lista.filter((cep) => !pular.has(cep)).slice(0, POR_RODADA);

  /* a consulta já tem coordenada, mas o cadastro foi salvo antes dela: só recalcula */
  const achados: string[] = (jaTem ?? []).filter((r) => (r.data as { latitude?: unknown } | null)?.latitude != null).map((r) => r.lookup_key as string);
  for (const cep of fila) {
    try {
      const r = await consultarCep(cep);
      if (r) achados.push(cep);
      else await db.from("cep_falhas").upsert({ cep, tentado_em: new Date().toISOString() });
    } catch {
      /* fora do ar ou resposta ruim: tenta na próxima rodada, sem marcar falha */
    }
  }
  if (!achados.length) return { consultados: fila.length, recalculados: 0 };
  const { data: n, error } = await db.rpc("mapa_reprocessar_ceps", { p_ceps: achados });
  if (error) throw error;
  return { consultados: fila.length, recalculados: Number(n ?? 0) };
}
