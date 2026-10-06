/* Telefone no Service: um formato só, guardado e exibido como "(11) 98000-1000".
   O banco guarda já formatado (assim a busca por "(11) 98..." e por "98000"
   continuam funcionando). Número que não é brasileiro com DDD (menos de 10
   dígitos, ou mais de 11 sem o 55 na frente) fica como foi digitado: nunca
   jogamos dígito fora. A migração 0054 aplicou a mesma regra no que já existia. */

/** Só os dígitos do número brasileiro: tira +55 / 0 na frente quando sobra DDD + número. */
export function digitosTelefone(valor?: string | null): string {
  let d = (valor ?? "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if ((d.length === 11 || d.length === 12) && d.startsWith("0")) d = d.slice(1);
  return d;
}

/** "51985596465", "51 985294977", "+55 (11) 9 8000-1000" → "(51) 98559-6465". */
export function formatarTelefone(valor?: string | null): string {
  const bruto = (valor ?? "").trim();
  const d = digitosTelefone(bruto);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return bruto;
}

/** Para gravar: formatado, ou null se vazio. */
export function telefoneParaGravar(valor?: string | null): string | null {
  const t = formatarTelefone(valor);
  return t ? t : null;
}

/** Mesmo número? Compara só os dígitos normalizados (vazio nunca é igual). */
export function mesmoTelefone(a?: string | null, b?: string | null): boolean {
  const da = digitosTelefone(a);
  return da.length >= 10 && da === digitosTelefone(b);
}
