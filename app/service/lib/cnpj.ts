/* Receita Federal: doze caracteres alfanuméricos + dois DVs numéricos.
   Cada caractere usa ASCII menos 48, preservando os CNPJs numéricos. */
export function normalizarCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
export function cnpjValido(valor: string): boolean {
  const c = normalizarCnpj(valor);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    let soma = 0, peso = 2;
    for (let i = base.length - 1; i >= 0; i--) { soma += (base.charCodeAt(i) - 48) * peso; peso = peso === 9 ? 2 : peso + 1; }
    return soma % 11 < 2 ? 0 : 11 - soma % 11;
  };
  const primeiro = dv(c.slice(0, 12));
  return c.slice(12) === `${primeiro}${dv(c.slice(0, 12) + primeiro)}`;
}
export function formatarCnpj(valor: string): string {
  const d = normalizarCnpj(valor).slice(0, 14);
  return d.replace(/^([A-Z0-9]{2})([A-Z0-9])/, "$1.$2").replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, "$1.$2.$3").replace(/\.([A-Z0-9]{3})([A-Z0-9])/, ".$1/$2").replace(/([A-Z0-9]{4})(\d)/, "$1-$2");
}
