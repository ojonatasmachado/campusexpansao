/* Plural de verdade nos contadores ("1 vaga", "3 vagas"), nunca "vaga(s)".
   plural(3, "vaga") → "3 vagas" · plural(1, "módulo") → "1 módulo"
   plural(2, "responsabilidade", "responsabilidades") quando o plural não é só +s. */
/** "falta 1 vaga", "faltam 3 vagas" */
export function faltaN(n: number, singular: string, pluralForm?: string): string {
  return `${n === 1 ? "falta" : "faltam"} ${plural(n, singular, pluralForm)}`;
}

export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : pluralForm ?? `${singular}s`}`;
}
