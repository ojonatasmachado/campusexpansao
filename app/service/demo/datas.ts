import { formatDateBR, parseISODate, somaDias } from "../lib/date";

/** Um domingo sempre futuro. O demo continua útil sem regravar o calendário. */
export function calendarioDemo(hoje: string) {
  const dia = parseISODate(hoje)?.getDay() ?? 0;
  const domingo = somaDias(hoje, (7 - dia) % 7 || 7);
  const base = Date.UTC(2026, 6, 6);
  const deslocar = (valor: string): string => {
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
    const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : valor.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return valor;
    const offset = Math.round((Date.parse(`${iso}T00:00:00Z`) - base) / 86400000);
    const data = somaDias(domingo, offset);
    return br ? formatDateBR(data) : data + valor.slice(10);
  };
  return { hoje, domingo, deslocar };
}
