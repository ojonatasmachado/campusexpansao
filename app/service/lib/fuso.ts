/** Datas e horários civis pertencem à igreja. Instantes continuam em UTC.
 * Nunca guardar um fuso corrente global: várias igrejas usam o mesmo servidor. */
export const FUSO_PADRAO = "America/Sao_Paulo";

export function fusoValido(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 100 || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(value)) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true; }
  catch { return false; }
}

export const normalizarFuso = (value: unknown): string => fusoValido(value) ? value : FUSO_PADRAO;

const formatters = new Map<string, Intl.DateTimeFormat>();
export function partesNoFuso(instante: Date, fuso = FUSO_PADRAO) {
  const zone = normalizarFuso(fuso);
  let fmt = formatters.get(zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA-u-ca-iso8601-nu-latn", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    formatters.set(zone, fmt);
  }
  const p = Object.fromEntries(fmt.formatToParts(instante).map((p) => [p.type, p.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}`, segundo: p.second };
}

/** Possíveis instantes de um horário civil. Zero = horário inexistente na
 * mudança de verão; dois = horário repetido. Não normalizar silenciosamente. */
export function instantesNoFuso(data: string, hora: string, fuso = FUSO_PADRAO): Date[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora) || !fusoValido(fuso)) return [];
  const naive = Date.parse(`${data}T${hora}:00Z`);
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 10) !== data) return [];
  const offsets = new Set<number>();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const instant = new Date(naive + hours * 3600000);
    const local = partesNoFuso(instant, fuso);
    offsets.add(Date.parse(`${local.data}T${local.hora}:${local.segundo}Z`) - instant.getTime());
  }
  return [...offsets].map((offset) => new Date(naive - offset))
    .filter((instant) => { const p = partesNoFuso(instant, fuso); return p.data === data && p.hora === hora; })
    .sort((a, b) => a.getTime() - b.getTime());
}
