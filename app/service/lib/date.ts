/* Formatação de data pro padrão brasileiro (DD/MM/AAAA), usado em toda
   exibição de data no Service. As datas continuam guardadas/editadas em
   ISO (YYYY-MM-DD, formato nativo de <input type="date">) : só a
   RENDERIZAÇÃO pro usuário passa por aqui. */

/** "2026-07-06" ou "2026-07-06T10:00:00Z" → "06/07/2026". Se não reconhecer
 *  o formato, devolve o valor original (nunca quebra a tela). */
export function formatDateBR(value?: string | null): string {
  if (!value) return "";
  const m = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/** "2026-07-06" → "Dom · 06/07/2026" ou similar, prefixando com o dia da
 *  semana quando `weekday` já vier calculado separadamente (a maioria das
 *  telas do Service já guarda o weekday à parte, então normalmente basta
 *  formatDateBR mesmo). */
export function formatDateTimeBR(date?: string | null, time?: string | null): string {
  const d = formatDateBR(date);
  if (!d) return time ?? "";
  return time ? `${d} · ${time}` : d;
}
