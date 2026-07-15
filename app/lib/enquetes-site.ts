"use server";
import { createClient } from "./supabase-server";

/* Avaliação de Experiência do site de materiais. Mesmo desenho do Service
   (app/service/lib/enquetes.ts), schema `cex` em vez de `service`, sem
   conceito de organização: tudo amarrado em auth.uid(). Ver HANDOFF
   Avaliação de Experiência + migration 0032/0034_cex_enquetes.sql. */

export type TipoPergunta = "nota" | "texto" | "emoji" | "multipla" | "simnao";

export type PerguntaView = {
  id: string;
  ordem: number;
  tipo: TipoPergunta;
  texto: string;
  escala: 5 | 10 | null;
  opcoes: string[] | null;
};

export type EnqueteElegivelView = {
  id: string;
  nome: string;
  perguntas: PerguntaView[];
};

type EnqueteDbRow = {
  id: string;
  nome: string;
  status: string;
  segmentacao_modo: "todos" | "estante";
  segmentacao_valores: string[];
  disparo_modo: "livre" | "periodica" | "posdownload" | "campanha";
  ativo_como_livre: boolean;
  intervalo_dias: number | null;
  emitida_em: string | null;
};

type PerguntaDbRow = {
  id: string;
  enquete_id: string;
  ordem: number;
  tipo: TipoPergunta;
  texto: string;
  escala: 5 | 10 | null;
  opcoes: string[] | null;
};

function elegivelPorSegmentacao(e: EnqueteDbRow, ctx: { estantesCompradas: string[] }): boolean {
  if (e.segmentacao_modo === "todos") return true;
  if (e.segmentacao_modo === "estante") return e.segmentacao_valores.some((v) => ctx.estantesCompradas.includes(v));
  return false;
}

// "Por estante" = comprou (compras liberadas), não "acessou". Junta com
// materiais só pra pegar a estante de cada compra — cex.material_acessos é
// outra coisa, só alimenta o disparo pós-acesso (ver abaixo).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function estantesCompradasDoUsuario(supabase: any, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("compras")
    .select("materiais(estante)")
    .eq("user_id", userId)
    .eq("status", "Liberado");
  if (error) { console.error("estantesCompradasDoUsuario: falhou", error); return []; }
  const linhas = (data ?? []) as { materiais: { estante: string } | { estante: string }[] | null }[];
  const estantes = linhas.flatMap((row) => {
    const m = row.materiais;
    if (!m) return [];
    return Array.isArray(m) ? m.map((x) => x.estante) : [m.estante];
  });
  return Array.from(new Set(estantes.filter(Boolean)));
}

export async function getEnqueteElegivelSite(): Promise<EnqueteElegivelView | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: enquetesData, error: enquetesError }, { data: respondidasData, error: respondidasError }, { data: acessosData }, estantesCompradas] = await Promise.all([
    supabase.from("enquetes").select("id,nome,status,segmentacao_modo,segmentacao_valores,disparo_modo,ativo_como_livre,intervalo_dias,emitida_em").eq("status", "ativa"),
    supabase.from("respostas").select("enquete_id").eq("user_id", user.id),
    supabase.from("material_acessos").select("id").eq("user_id", user.id).limit(1),
    estantesCompradasDoUsuario(supabase, user.id),
  ]);
  if (enquetesError || respondidasError) {
    console.error("getEnqueteElegivelSite: falhou ao ler enquetes/respostas", enquetesError ?? respondidasError);
    return null;
  }

  // unique(enquete_id,user_id) em cex.respostas: uma vez respondida, não
  // aparece de novo (mesma régua do Service, ver app/service/lib/enquetes.ts).
  const jaRespondidas = new Set((respondidasData ?? []).map((r) => (r as { enquete_id: string }).enquete_id));
  const temAcessoAMaterial = ((acessosData ?? []) as unknown[]).length > 0;

  const elegiveis = ((enquetesData ?? []) as EnqueteDbRow[]).filter(
    (e) => !jaRespondidas.has(e.id) && elegivelPorSegmentacao(e, { estantesCompradas }),
  );

  let vencedora: EnqueteDbRow | null = null;
  let vencedoraPrioridade = 99;
  for (const e of elegiveis) {
    if (e.disparo_modo === "campanha") {
      if (e.emitida_em && vencedoraPrioridade > 1) { vencedora = e; vencedoraPrioridade = 1; }
    } else if (e.disparo_modo === "posdownload") {
      if (temAcessoAMaterial && vencedoraPrioridade > 2) { vencedora = e; vencedoraPrioridade = 2; }
    } else if (e.disparo_modo === "periodica") {
      if (vencedoraPrioridade > 3) { vencedora = e; vencedoraPrioridade = 3; }
    }
  }
  if (!vencedora) vencedora = elegiveis.find((e) => e.disparo_modo === "livre" && e.ativo_como_livre) ?? null;
  if (!vencedora) return null;

  const { data: perguntasData, error: perguntasError } = await supabase
    .from("perguntas")
    .select("id,enquete_id,ordem,tipo,texto,escala,opcoes")
    .eq("enquete_id", vencedora.id)
    .order("ordem", { ascending: true });
  if (perguntasError) {
    console.error("getEnqueteElegivelSite: falhou ao ler perguntas", perguntasError);
    return null;
  }

  return {
    id: vencedora.id,
    nome: vencedora.nome,
    perguntas: ((perguntasData ?? []) as PerguntaDbRow[]).map((p) => ({ id: p.id, ordem: p.ordem, tipo: p.tipo, texto: p.texto, escala: p.escala, opcoes: p.opcoes })),
  };
}

export async function enviarRespostaSite(enqueteId: string, respostas: { perguntaId: string; valor: string }[]): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para responder." };

  const [{ data: perfilData }, estantesCompradas] = await Promise.all([
    supabase.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle(),
    estantesCompradasDoUsuario(supabase, user.id),
  ]);

  const { data: novaResposta, error: respostaError } = await supabase
    .from("respostas")
    .insert({
      enquete_id: enqueteId,
      user_id: user.id,
      papel: (perfilData as { role?: string } | null)?.role ?? "",
      estantes_compradas: estantesCompradas,
      data: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (respostaError || !novaResposta) return { ok: false, error: respostaError?.message ?? "Não foi possível enviar sua resposta." };

  const itens = respostas.map((r) => ({ resposta_id: novaResposta.id as string, pergunta_id: r.perguntaId, valor: r.valor }));
  const { error: itensError } = await supabase.from("respostas_perguntas").insert(itens);
  if (itensError) return { ok: false, error: itensError.message };

  await supabase.from("enquete_visto").upsert({ enquete_id: enqueteId, user_id: user.id, visto_em: new Date().toISOString() }, { onConflict: "enquete_id,user_id" });
  return { ok: true };
}

export async function registrarAcessoMaterial(materialId: string, estanteKey: string | null): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("material_acessos").insert({ user_id: user.id, material_id: materialId, estante_key: estanteKey });
  if (error) console.error("registrarAcessoMaterial: falhou", error);
}
