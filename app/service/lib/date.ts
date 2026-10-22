import { FUSO_PADRAO, partesNoFuso } from "./fuso";

/* Formatação de data pro padrão brasileiro (DD/MM/AAAA), usado em toda
   exibição de data no Service. As datas continuam guardadas/editadas em
   ISO (YYYY-MM-DD, o mesmo formato do campo de data nativo) : só a
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

/** Data civil completa, sem aceitar normalização como 31 de fevereiro. */
export function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISODate(value);
  return !!parsed && toISODate(parsed) === value;
}

/** Hoje, "AAAA-MM-DD", no fuso informado (Brasília por padrão). Vale igual no navegador e
 *  no servidor (que roda em UTC na Vercel). */
export function todayISO(fuso = FUSO_PADRAO, instante = new Date()): string {
  return partesNoFuso(instante, fuso).data;
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

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora da igreja (igual no
 *  servidor e no navegador, sem diferença na hidratação). */
export function saudacao(fuso = FUSO_PADRAO, instante = new Date()): string {
  const h = Number(partesNoFuso(instante, fuso).hora.slice(0, 2));
  return h >= 5 && h < 12 ? "Bom dia" : h >= 12 && h < 18 ? "Boa tarde" : "Boa noite";
}

/** Hora de agora no fuso informado, "HH:MM" (igual no servidor e no navegador). */
export function horaAgoraBR(fuso = FUSO_PADRAO, instante = new Date()): string {
  return partesNoFuso(instante, fuso).hora;
}

/** O evento ainda vai começar? Dia depois de hoje, ou hoje com a hora de início
 *  ainda por vir (sem hora, vale o dia inteiro). Tudo no fuso informado. */
export function aindaVaiAcontecer(eventDate?: string | null, time?: string | null, fuso = FUSO_PADRAO, instante = new Date()): boolean {
  const dia = (eventDate ?? "").slice(0, 10);
  if (!dia) return false;
  const hoje = todayISO(fuso, instante);
  if (dia !== hoje) return dia > hoje;
  const hora = (time ?? "").slice(0, 5);
  return !/^\d{2}:\d{2}$/.test(hora) || hora >= horaAgoraBR(fuso, instante);
}

/** Dias de calendário no fuso informado entre o instante e hoje: 0 = hoje, 1 = ontem. */
function diaNoFuso(instante: string, fuso = FUSO_PADRAO): string {
  const t = new Date(instante);
  if (Number.isNaN(t.getTime())) return "";
  return partesNoFuso(t, fuso).data;
}

/** Instante ("2026-10-03T01:00:00Z") → dia no fuso informado, "02/10/2026". */
export function dataPublicacao(instante?: string | null, fuso = FUSO_PADRAO): string {
  return instante ? formatDateBR(diaNoFuso(instante, fuso)) : "";
}

function diasAtras(instante: string, fuso = FUSO_PADRAO): number | null {
  const a = parseISODate(diaNoFuso(instante, fuso));
  const b = parseISODate(todayISO(fuso));
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Quando foi publicado, sempre calculado da data (nunca de um texto salvo),
 *  em minúsculas: "hoje", "ontem", "há 3 dias"; depois de uma semana, "28/09/2026". */
export function quandoPublicado(instante?: string | null, fuso = FUSO_PADRAO): string {
  if (!instante) return "";
  const n = diasAtras(instante, fuso);
  if (n === null) return "";
  if (n <= 0) return "hoje";
  if (n === 1) return "ontem";
  if (n < 7) return `há ${n} dias`;
  return dataPublicacao(instante, fuso);
}

/** Mais recente primeiro, pela data de publicação. Não altera a lista original. */
export function porPublicacao<T extends { created_at?: string | null }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

/** Público do aviso, numa forma só: "para todos" (minúsculo) ou "para Louvor" (nome como foi cadastrado). */
export function paraPublico(audience?: string | null): string {
  const a = (audience ?? "").trim();
  if (!a || a.toLowerCase() === "todos") return "para todos";
  return `para ${a}`;
}

/** "2026-10-04" + 3 → "2026-10-07" (dias de calendário). */
export function somaDias(iso: string, n: number): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Hora da última fala numa lista de conversas: hoje "14:32", "ontem",
 *  na semana o dia ("seg"), depois "03/10". Fuso da igreja. */
export function quandoMensagem(instante?: string | null, fuso = FUSO_PADRAO): string {
  if (!instante) return "";
  const t = new Date(instante);
  if (Number.isNaN(t.getTime())) return "";
  const dia = diaNoFuso(instante, fuso);
  const hoje = todayISO(fuso);
  if (dia === hoje) return partesNoFuso(t, fuso).hora;
  if (dia === somaDias(hoje, -1)) return "ontem";
  if (dia > somaDias(hoje, -7)) return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][parseISODate(dia)!.getDay()];
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}
