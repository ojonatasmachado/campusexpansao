/** Resolve marcadores de vocabulário apenas na exibição dos fatos da História. */
export function tituloDoFato(titulo: string, ct: (texto: string) => string): string {
  return ct(titulo);
}
