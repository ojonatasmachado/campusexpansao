import { MARCADOR_TERMO, comTermos, type Vocabulario } from "../vocabulario";

/** Os termos da igreja viram argumentos ICU, nunca texto enviado para tradução. */
export function prepareVocabulary(source: string, vocabulary: Vocabulario) {
  const terms: Record<string, string> = {};
  let index = 0;
  const message = source.replace(MARCADOR_TERMO, (marker) => {
    const key = `churchTerm${index++}`;
    terms[key] = comTermos(marker, vocabulary);
    return `{${key}}`;
  });
  return { message, terms };
}
