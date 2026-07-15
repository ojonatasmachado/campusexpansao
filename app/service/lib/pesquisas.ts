import type { SupabaseClient } from "@supabase/supabase-js";

/* Pesquisas da PRÓPRIA igreja pra própria congregação (ex.: pulso pós-escala).
   Não confundir com app/service/lib/enquetes.ts (cross-tenant, dono é a CE.X,
   pergunta como está a experiência de usar o Service). Aqui quem cria/edita
   é o master/pastor/líder daquela igreja, em Configurações → Pesquisas — ver
   migration 0035_service_pesquisas.sql. */

export type TipoPergunta = "nota" | "texto" | "emoji" | "multipla" | "simnao";

export type PerguntaPesquisaView = {
  id: string;
  ordem: number;
  tipo: TipoPergunta;
  texto: string;
  obrigatoria: boolean;
  escala: 5 | 10 | null;
  opcoes: string[] | null;
};

export type PesquisaElegivelView = {
  id: string;
  nome: string;
  recorrentePorEscala: boolean;
  /** true = ainda não respondida (deve aparecer em destaque); false = já respondida, mas continua acessível pra rever/atualizar */
  pendente: boolean;
  /** id da resposta já existente, só quando pendente=false (permite fazer update em vez de insert) */
  respostaId: string | null;
  eventoId: string | null;
  perguntas: PerguntaPesquisaView[];
  respostasAnteriores: Record<string, string>;
};

type PesquisaDbRow = {
  id: string;
  nome: string;
  status: string;
  segmentacao_modo: "todos" | "papel" | "time";
  segmentacao_valores: string[];
  disparo_modo: "livre" | "periodica" | "posescala" | "campanha";
  ativo_como_livre: boolean;
  intervalo_dias: number | null;
  recorrente_por_escala: boolean;
  emitida_em: string | null;
};

type PerguntaDbRow = {
  id: string;
  pesquisa_id: string;
  ordem: number;
  tipo: TipoPergunta;
  texto: string;
  obrigatoria: boolean;
  escala: 5 | 10 | null;
  opcoes: string[] | null;
};

type RespostaDbRow = { id: string; pesquisa_id: string; event_id: string | null };

function elegivelPorSegmentacao(p: PesquisaDbRow, ctx: { papel: string; times: string[] }): boolean {
  if (p.segmentacao_modo === "todos") return true;
  if (p.segmentacao_modo === "papel") return p.segmentacao_valores.includes(ctx.papel);
  if (p.segmentacao_modo === "time") return p.segmentacao_valores.some((v) => ctx.times.includes(v));
  return false;
}

async function perguntasDe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  pesquisaId: string,
): Promise<PerguntaPesquisaView[] | null> {
  const { data, error } = await db
    .from("pesquisas_perguntas")
    .select("id,pesquisa_id,ordem,tipo,texto,obrigatoria,escala,opcoes")
    .eq("pesquisa_id", pesquisaId)
    .order("ordem", { ascending: true });
  if (error) { console.error("perguntasDe: falhou", error); return null; }
  return ((data ?? []) as PerguntaDbRow[]).map((p) => ({ id: p.id, ordem: p.ordem, tipo: p.tipo, texto: p.texto, obrigatoria: p.obrigatoria, escala: p.escala, opcoes: p.opcoes }));
}

/* Resolve qual pesquisa (se alguma) mostrar pro voluntário logado, e em que
   estado: pendente (nunca respondida pra essa escala/pesquisa) ou já
   respondida mas ainda acessível pra rever/atualizar quando quiser
   ("disponível quando quiser, caso esteja descontente"). Prioridade entre
   pendentes: campanha > pós-escala > periódica > livre (mesma régua de
   enquetes.ts). Sem pendente nenhuma, cai pro fallback pós-escala (se
   houver escala já servida), sempre acessível. */
export async function resolverPesquisaElegivel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  params: {
    organizationId: string;
    personId: string;
    papel: string;
    times: string[];
    /** escala mais recente já ocorrida (evento no passado) em que a pessoa está confirmada, se houver */
    ultimaEscalaServida: { eventId: string } | null;
  },
): Promise<PesquisaElegivelView | null> {
  const db = supabase.schema("service");
  const [{ data: pesquisasData, error: pesquisasError }, { data: respostasData, error: respostasError }] = await Promise.all([
    db.from("pesquisas").select("id,nome,status,segmentacao_modo,segmentacao_valores,disparo_modo,ativo_como_livre,intervalo_dias,recorrente_por_escala,emitida_em").eq("organization_id", params.organizationId).eq("status", "ativa"),
    db.from("pesquisas_respostas").select("id,pesquisa_id,event_id").eq("person_id", params.personId),
  ]);
  if (pesquisasError || respostasError) {
    console.error("resolverPesquisaElegivel: falhou ao ler pesquisas/respostas", pesquisasError ?? respostasError);
    return null;
  }

  const pesquisas = (pesquisasData ?? []) as PesquisaDbRow[];
  const respostas = (respostasData ?? []) as RespostaDbRow[];
  const respondidaGeral = new Set(respostas.filter((r) => !r.event_id).map((r) => r.pesquisa_id));
  const respondidaPorEvento = new Set(respostas.filter((r) => r.event_id).map((r) => `${r.pesquisa_id}:${r.event_id}`));

  const jaRespondeu = (p: PesquisaDbRow): boolean => {
    if (p.disparo_modo === "posescala" && p.recorrente_por_escala) {
      if (!params.ultimaEscalaServida) return true;
      return respondidaPorEvento.has(`${p.id}:${params.ultimaEscalaServida.eventId}`);
    }
    return respondidaGeral.has(p.id);
  };

  const pendentes = pesquisas.filter((p) => !jaRespondeu(p) && elegivelPorSegmentacao(p, params));

  let vencedora: PesquisaDbRow | null = null;
  let vencedoraPrioridade = 99;
  for (const p of pendentes) {
    if (p.disparo_modo === "campanha") {
      if (p.emitida_em && vencedoraPrioridade > 1) { vencedora = p; vencedoraPrioridade = 1; }
    } else if (p.disparo_modo === "posescala") {
      if (params.ultimaEscalaServida && vencedoraPrioridade > 2) { vencedora = p; vencedoraPrioridade = 2; }
    } else if (p.disparo_modo === "periodica") {
      if (vencedoraPrioridade > 3) { vencedora = p; vencedoraPrioridade = 3; }
    }
  }
  if (!vencedora) vencedora = pendentes.find((p) => p.disparo_modo === "livre" && p.ativo_como_livre) ?? null;

  if (vencedora) {
    const perguntas = await perguntasDe(db, vencedora.id);
    if (!perguntas) return null;
    const eventoId = vencedora.disparo_modo === "posescala" && vencedora.recorrente_por_escala ? (params.ultimaEscalaServida?.eventId ?? null) : null;
    return { id: vencedora.id, nome: vencedora.nome, recorrentePorEscala: vencedora.recorrente_por_escala, pendente: true, respostaId: null, eventoId, perguntas, respostasAnteriores: {} };
  }

  // Nada pendente: fallback pro pulso pós-escala, se ativo e elegível, pra
  // ficar sempre acessível (rever/atualizar a última resposta).
  const posescala = pesquisas.find((p) => p.disparo_modo === "posescala" && elegivelPorSegmentacao(p, params));
  if (!posescala || !params.ultimaEscalaServida) return null;

  const eventoId = posescala.recorrente_por_escala ? params.ultimaEscalaServida.eventId : null;
  const respostaExistente = respostas.find((r) => r.pesquisa_id === posescala.id && (r.event_id ?? null) === eventoId);
  if (!respostaExistente) return null;

  const perguntas = await perguntasDe(db, posescala.id);
  if (!perguntas) return null;

  const { data: itensData, error: itensError } = await db
    .from("pesquisas_respostas_perguntas")
    .select("pergunta_id,valor")
    .eq("resposta_id", respostaExistente.id);
  if (itensError) console.error("resolverPesquisaElegivel: falhou ao ler respostas_perguntas", itensError);
  const respostasAnteriores: Record<string, string> = {};
  for (const item of (itensData ?? []) as { pergunta_id: string; valor: string }[]) respostasAnteriores[item.pergunta_id] = item.valor;

  return { id: posescala.id, nome: posescala.nome, recorrentePorEscala: posescala.recorrente_por_escala, pendente: false, respostaId: respostaExistente.id, eventoId, perguntas, respostasAnteriores };
}
