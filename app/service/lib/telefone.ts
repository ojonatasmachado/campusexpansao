/* Números nacionais legados continuam brasileiros. Um + explícito preserva
   o país escolhido pela pessoa; não inferimos país pelo tamanho. */
function internacional(valor: string): boolean { return valor.trim().startsWith("+"); }

export function digitosTelefone(valor?: string | null): string {
  const bruto = (valor ?? "").trim();
  let d = bruto.replace(/\D/g, "");
  if (internacional(bruto) && !bruto.startsWith("+55")) return d;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if ((d.length === 11 || d.length === 12) && d.startsWith("0")) d = d.slice(1);
  return d;
}

export function telefoneParaWhatsapp(valor?: string | null): string | null {
  const bruto = (valor ?? "").trim();
  if (!/^[+\d\s().-]+$/.test(bruto)) return null;
  if (internacional(bruto)) {
    const d = bruto.replace(/\D/g, "");
    return /^\+[\d\s().-]+$/.test(bruto) && /^[1-9]\d{7,14}$/.test(d) ? d : null;
  }
  const d = digitosTelefone(bruto);
  return /^[1-9]\d{9,10}$/.test(d) ? `55${d}` : null;
}

export function telefoneValido(valor?: string | null): boolean { return telefoneParaWhatsapp(valor) !== null; }

export function formatarTelefone(valor?: string | null): string {
  const bruto = (valor ?? "").trim();
  if (internacional(bruto) && !bruto.startsWith("+55")) return bruto;
  const d = digitosTelefone(bruto);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return bruto;
}

export function telefoneParaGravar(valor?: string | null): string | null { return formatarTelefone(valor) || null; }

export function variacoesTelefone(valor: string): string[] {
  const wa = telefoneParaWhatsapp(valor);
  const nacional = wa?.startsWith("55") ? wa.slice(2) : null;
  return [...new Set([telefoneParaGravar(valor), valor.trim(), wa, wa ? `+${wa}` : null, nacional].filter((v): v is string => !!v))];
}

export function mesmoTelefone(a?: string | null, b?: string | null): boolean {
  const normal = telefoneParaWhatsapp(a);
  return normal !== null && normal === telefoneParaWhatsapp(b);
}
