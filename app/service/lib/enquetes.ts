import type { SupabaseClient } from "@supabase/supabase-js";

/* Resolve qual enquete (se alguma) mostrar agora pro usuário logado no
   Service. Ver HANDOFF Avaliação de Experiência §2: popups nunca empilham
   por contexto, prioridade campanha > pós-escala > periódica > nenhuma. A
   "livre" é a linha de baixo: sempre disponível quando não há nada de
   prioridade maior pendente. Enquetes são cross-tenant (sem organization_id
   na própria enquete — quem cria é o admin central da CE.X), só a resposta
   carrega organization_id. */

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
  segmentacao_modo: "todos" | "papel" | "time";
  segmentacao_valores: string[];
  disparo_modo: "livre" | "periodica" | "posescala" | "campanha";
  ativo_como_livre: boolean;
  intervalo_dias: number | null;
  horas_depois: number | null;
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

// "papel" mistura dois eixos: cargo de verdade (core.memberships.role:
// pastor/lider/vol) e o sentinela 'membro', que não é cargo — é "está
// cadastrado em service.members" (pessoa da congregação, domínio separado
// de quem serve, ver HANDOFF Banco de Dados §4).
function elegivelPorSegmentacao(e: EnqueteDbRow, ctx: { papel: string; times: string[]; ehMembro: boolean }): boolean {
  if (e.segmentacao_modo === "todos") return true;
  if (e.segmentacao_modo === "papel") return e.segmentacao_valores.some((v) => v === ctx.papel || (v === "membro" && ctx.ehMembro));
  if (e.segmentacao_modo === "time") return e.segmentacao_valores.some((v) => ctx.times.includes(v));
  return false;
}

export async function resolverEnqueteElegivel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  params: {
    personId: string;
    papel: string;
    times: string[];
    ehMembro: boolean;
    /** timestamp mais recente em que o usuário confirmou presença numa escala (status='ok'), se houver */
    rosterConfirmadoEm: string | null;
  },
): Promise<EnqueteElegivelView | null> {
  const db = supabase.schema("service");
  const [{ data: enquetesData, error: enquetesError }, { data: respondidasData, error: respondidasError }] = await Promise.all([
    db.from("enquetes").select("id,nome,status,segmentacao_modo,segmentacao_valores,disparo_modo,ativo_como_livre,intervalo_dias,horas_depois,emitida_em").eq("status", "ativa"),
    db.from("respostas").select("enquete_id").eq("person_id", params.personId),
  ]);
  if (enquetesError || respondidasError) {
    console.error("resolverEnqueteElegivel: falhou ao ler enquetes/respostas", enquetesError ?? respondidasError);
    return null;
  }

  // unique(enquete_id,person_id) em service.respostas: uma vez respondida (em
  // qualquer modo, inclusive livre/periódica), a enquete não aparece de novo pra
  // essa pessoa. `enquete_visto` fica só como registro de quando cada uma foi
  // concluída (útil pra auditoria/uma futura enquete recorrente de verdade); a
  // elegibilidade não depende dela.
  const jaRespondidas = new Set((respondidasData ?? []).map((r) => (r as { enquete_id: string }).enquete_id));

  const elegiveis = ((enquetesData ?? []) as EnqueteDbRow[]).filter((e) => !jaRespondidas.has(e.id) && elegivelPorSegmentacao(e, params));

  const agora = Date.now();
  let vencedora: EnqueteDbRow | null = null;
  let vencedoraPrioridade = 99;

  for (const e of elegiveis) {
    if (e.disparo_modo === "campanha") {
      if (e.emitida_em && vencedoraPrioridade > 1) { vencedora = e; vencedoraPrioridade = 1; }
    } else if (e.disparo_modo === "posescala") {
      if (params.rosterConfirmadoEm) {
        const horas = e.horas_depois ?? 3;
        const passou = (agora - new Date(params.rosterConfirmadoEm).getTime()) / 3_600_000 >= horas;
        if (passou && vencedoraPrioridade > 2) { vencedora = e; vencedoraPrioridade = 2; }
      }
    } else if (e.disparo_modo === "periodica") {
      if (vencedoraPrioridade > 3) { vencedora = e; vencedoraPrioridade = 3; }
    }
  }

  if (!vencedora) {
    // Nada de prioridade maior pendente: cai pra "livre", se houver uma ativa e elegível.
    vencedora = elegiveis.find((e) => e.disparo_modo === "livre" && e.ativo_como_livre) ?? null;
  }
  if (!vencedora) return null;

  const { data: perguntasData, error: perguntasError } = await db
    .from("perguntas")
    .select("id,enquete_id,ordem,tipo,texto,escala,opcoes")
    .eq("enquete_id", vencedora.id)
    .order("ordem", { ascending: true });
  if (perguntasError) {
    console.error("resolverEnqueteElegivel: falhou ao ler perguntas", perguntasError);
    return null;
  }

  return {
    id: vencedora.id,
    nome: vencedora.nome,
    perguntas: ((perguntasData ?? []) as PerguntaDbRow[]).map((p) => ({ id: p.id, ordem: p.ordem, tipo: p.tipo, texto: p.texto, escala: p.escala, opcoes: p.opcoes })),
  };
}
