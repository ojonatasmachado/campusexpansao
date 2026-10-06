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

/* Datas "AAAA-MM-DD" são dias do calendário, não instantes: sempre lidas e
   escritas no horário LOCAL. new Date("2026-10-04") é meia-noite em UTC,
   que no Brasil ainda é o dia anterior; toISOString() faz o mesmo erro no
   sentido contrário depois das 21h. */

/** "2026-10-04" → Date local (meia-noite daqui). null se não reconhecer. */
export function parseISODate(value?: string | null): Date | null {
  const m = (value ?? "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "AAAA-MM-DD" no dia local. */
export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Hoje, "AAAA-MM-DD", no horário de Brasília. Vale igual no navegador e
 *  no servidor (que roda em UTC na Vercel). */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** "2026-10-04" → "Domingo". Sempre calculado da data, nunca de um campo salvo à parte. */
export function weekdayFromISO(value?: string | null): string {
  const d = parseISODate(value);
  return d ? DIAS_SEMANA[d.getDay()] : "";
}

/** Junta só as partes preenchidas: joinDot("Domingo", "", "19:00") → "Domingo · 19:00". */
export function joinDot(...parts: Array<string | null | undefined | false>): string {
  return parts.filter((p): p is string => typeof p === "string" && p.trim() !== "").join(" · ");
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora de Brasília (igual no
 *  servidor e no navegador, sem diferença na hidratação). */
export function saudacao(): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  return h >= 5 && h < 12 ? "Bom dia" : h >= 12 && h < 18 ? "Boa tarde" : "Boa noite";
}

/** Hora de agora em Brasília, "HH:MM" (igual no servidor e no navegador). */
export function horaAgoraBR(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).replace(/^24/, "00");
}

/** O evento ainda vai começar? Dia depois de hoje, ou hoje com a hora de início
 *  ainda por vir (sem hora, vale o dia inteiro). Tudo no fuso de Brasília. */
export function aindaVaiAcontecer(eventDate?: string | null, time?: string | null): boolean {
  const dia = (eventDate ?? "").slice(0, 10);
  if (!dia) return false;
  const hoje = todayISO();
  if (dia !== hoje) return dia > hoje;
  const hora = (time ?? "").slice(0, 5);
  return !/^\d{2}:\d{2}$/.test(hora) || hora >= horaAgoraBR();
}
