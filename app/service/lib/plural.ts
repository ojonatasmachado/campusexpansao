/* Plural de verdade nos contadores ("1 vaga", "3 vagas"), nunca "vaga(s)".
   plural(3, "vaga") → "3 vagas" · plural(1, "módulo") → "1 módulo"
   plural(2, "responsabilidade", "responsabilidades") quando o plural não é só +s. */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : pluralForm ?? `${singular}s`}`;
}
