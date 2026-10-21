/** Valida formato e dígitos verificadores; não consulta identidade na Receita. */
export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (let n = 9; n <= 10; n++) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = soma % 11;
    if (Number(d[n]) !== (resto < 2 ? 0 : 11 - resto)) return false;
  }
  return true;
}
export function formatarCpf(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}
