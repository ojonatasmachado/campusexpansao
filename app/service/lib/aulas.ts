/* Próxima aula de um curso no app do membro (v7 2.1). Uma função só, usada
   pelo cartão do curso, pelo "Seu próximo passo" do Início e pelo resumo da
   Caminhada: nenhum "Continuar" sem destino. */

export type AulaModulo = { id: string; course_id: string; sort_order: number };
export type AulaLinha = {
  id: string;
  module_id: string;
  name: string;
  sort_order?: number | null;
  kind?: string | null;
  link?: string | null;
  conteudo?: string | null;
};

export type ProximaAula<L extends AulaLinha = AulaLinha> = {
  aula: L;
  /* posição da aula no curso, começando em 1 */
  n: number;
  total: number;
  /* o que o app consegue abrir: link (vídeo/ao vivo) ou texto lido no app */
  abrir: "link" | "texto" | null;
  /* presença confirmada só pelo QR que o professor mostra na aula */
  porQr: boolean;
};

/* aulas do curso na ordem do editor: módulo, depois aula */
export function aulasDoCurso<L extends AulaLinha>(courseId: string, modulos: AulaModulo[], aulas: L[]): L[] {
  const ordem = new Map(
    modulos.filter((m) => m.course_id === courseId).map((m) => [m.id, m.sort_order] as const),
  );
  return aulas
    .filter((l) => ordem.has(l.module_id))
    .sort((a, b) => (ordem.get(a.module_id)! - ordem.get(b.module_id)!) || ((a.sort_order ?? 0) - (b.sort_order ?? 0)));
}

/* a aula seguinte às já concluídas (done_count conta as aulas feitas, em ordem) */
export function proximaAula<L extends AulaLinha>(courseId: string, feitas: number, modulos: AulaModulo[], aulas: L[]): ProximaAula<L> | null {
  const lista = aulasDoCurso(courseId, modulos, aulas);
  if (!lista.length || feitas >= lista.length) return null;
  const aula = lista[Math.max(0, feitas)];
  const porQr = aula.kind === "presencial" || aula.kind === "ao_vivo";
  const temTexto = !!textoDaAula(aula.conteudo);
  const abrir = aula.link && /^https?:\/\//i.test(aula.link.trim()) && aula.kind !== "texto" ? "link" : temTexto ? "texto" : null;
  return { aula, n: Math.max(0, feitas) + 1, total: lista.length, abrir, porQr };
}

/* o conteúdo vem do editor em HTML; no app vira texto simples (sem HTML
   do líder rodando na tela do membro) */
export function textoDaAula(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "· ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const INSTRUCAO_QR = "A presença é pelo QR da aula: no dia, abra a câmera do celular e aponte para o código que o professor mostra.";
