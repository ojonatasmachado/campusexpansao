/* Histórico da pessoa (lei 10): fatos com data, sem pontos, ranking ou
   percentual. Os fatos moram em service.timeline_events; serviu, trocou,
   aula e grupo são gravados por gatilho no banco (0059), os passos da
   {Caminhada} pelo app. Este arquivo só dá nome e ícone a cada tipo. */

export type FatoView = { id: string; member_id: string; event_type: string; title: string; body: string | null; sort_key: number | null; when_label: string | null; created_at: string };

const TIPOS: Record<string, { rotulo: string; icone: string }> = {
  decisao: { rotulo: "Decisão", icone: "decisoes" },
  batismo: { rotulo: "Batismo", icone: "batismos" },
  curso: { rotulo: "Curso", icone: "cursos" },
  aula: { rotulo: "Aula", icone: "cursos" },
  integracao: { rotulo: "{Grupo}", icone: "pessoa" },
  grupo: { rotulo: "{Grupo}", icone: "pessoa" },
  time: { rotulo: "Time", icone: "times" },
  serviu: { rotulo: "Serviu", icone: "times" },
  trocou: { rotulo: "Troca de escala", icone: "escalas" },
  faltou: { rotulo: "Faltou", icone: "escalas" },
  contato_cuidado: { rotulo: "Contato", icone: "coracao" },
};

export function tipoDoFato(tipo: string): { rotulo: string; icone: string } {
  return TIPOS[tipo] ?? { rotulo: "Registro", icone: "historia" };
}

/** Mais recente primeiro (sort_key AAAAMMDD, depois a gravação). */
export function porData<T extends { sort_key: number | null; created_at: string }>(fatos: T[]): T[] {
  return [...fatos].sort((a, b) => (b.sort_key ?? 0) - (a.sort_key ?? 0) || b.created_at.localeCompare(a.created_at));
}

/** "06/10/2026" a partir do que o fato guardou. */
export function quandoFoi(f: { when_label: string | null; created_at: string }): string {
  return f.when_label || new Date(f.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
