/* Fichas legadas sem país seguem a entrada brasileira existente. */
export function enderecoNoBrasil(country?: string | null): boolean {
  return !country?.trim() || /^(brasil|brazil|br)$/i.test(country.trim());
}
export function regiaoInformada(d: { country?: string | null; postalCode?: string | null; city?: string | null }): boolean {
  return enderecoNoBrasil(d.country) ? /^\d{5}-?\d{3}$/.test(d.postalCode?.trim() ?? "") : !!d.city?.trim();
}
