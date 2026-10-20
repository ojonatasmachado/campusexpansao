/* Silêncio das 22h às 7h (lei 9), no horário de Brasília (UTC-3, sem horário
   de verão desde 2019). Notificação marcada para dentro do silêncio vai para
   as 7h seguintes. */
const OFFSET_MS = 3 * 3600000;

const horaEmBrasilia = (d: Date) => new Date(d.getTime() - OFFSET_MS).getUTCHours();

export function emSilencio(d: Date = new Date()): boolean {
  const h = horaEmBrasilia(d);
  return h >= 22 || h < 7;
}

/** O mesmo instante, ou as 7h seguintes se cair no silêncio. */
export function foraDoSilencio(d: Date): Date {
  if (!emSilencio(d)) return d;
  const local = new Date(d.getTime() - OFFSET_MS);
  if (local.getUTCHours() >= 22) local.setUTCDate(local.getUTCDate() + 1);
  local.setUTCHours(7, 0, 0, 0);
  return new Date(local.getTime() + OFFSET_MS);
}

/** "amanhã às 9:00", "hoje às 19:30", "em 12/10 às 7:00" (Brasília). */
export function quandoLembra(d: Date, agora: Date = new Date()): string {
  const dia = (x: Date) => new Date(x.getTime() - OFFSET_MS).toISOString().slice(0, 10);
  const l = new Date(d.getTime() - OFFSET_MS);
  const hora = `${l.getUTCHours()}:${String(l.getUTCMinutes()).padStart(2, "0")}`;
  const hoje = dia(agora);
  const amanha = dia(new Date(agora.getTime() + 86400000));
  const [, m, dd] = dia(d).split("-");
  return dia(d) === hoje ? `hoje às ${hora}` : dia(d) === amanha ? `amanhã às ${hora}` : `em ${dd}/${m} às ${hora}`;
}
