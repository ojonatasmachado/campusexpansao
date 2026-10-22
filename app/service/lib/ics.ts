import { FUSO_PADRAO, instantesNoFuso } from "./fuso";
import { isCivilDate } from "./date";

/* "Adicionar ao calendário": arquivo .ics gerado no navegador (v7 4.5).
   Horário da igreja convertido em UTC para o calendário do aparelho. */

const pad = (n: number) => String(n).padStart(2, "0");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export type EventoIcs = { id: string; fuso?: string; titulo: string; data: string; hora?: string | null; duracaoMin?: number; local?: string | null; descricao?: string | null };

export function textoIcs(e: EventoIcs): string {
  if (!isCivilDate(e.data)) throw new Error("Confira a data do evento.");
  const [a, m, d] = e.data.slice(0, 10).split("-").map(Number);
  const hm = (e.hora ?? "").match(/^(\d{1,2})[:h](\d{2})/);
  const agora = new Date();
  const stamp = `${agora.getUTCFullYear()}${pad(agora.getUTCMonth() + 1)}${pad(agora.getUTCDate())}T${pad(agora.getUTCHours())}${pad(agora.getUTCMinutes())}00Z`;
  const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CE.X//Service//PT", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${e.id}@service`, `DTSTAMP:${stamp}`];
  if (hm) {
    const candidatos = instantesNoFuso(e.data, `${hm[1].padStart(2, "0")}:${hm[2]}`, e.fuso ?? FUSO_PADRAO);
    if (candidatos.length !== 1) throw new Error("O horário coincide com uma mudança de fuso. Peça à liderança para conferir o horário do evento.");
    const ini = candidatos[0];
    const fim = new Date(ini.getTime() + (e.duracaoMin ?? 120) * 60000);
    const f = (t: Date) => t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    linhas.push(`DTSTART:${f(ini)}`, `DTEND:${f(fim)}`);
  } else {
    const prox = new Date(Date.UTC(a, m - 1, d + 1));
    linhas.push(`DTSTART;VALUE=DATE:${a}${pad(m)}${pad(d)}`, `DTEND;VALUE=DATE:${prox.getUTCFullYear()}${pad(prox.getUTCMonth() + 1)}${pad(prox.getUTCDate())}`);
  }
  linhas.push(`SUMMARY:${esc(e.titulo)}`);
  if (e.local) linhas.push(`LOCATION:${esc(e.local)}`);
  if (e.descricao) linhas.push(`DESCRIPTION:${esc(e.descricao)}`);
  linhas.push("END:VEVENT", "END:VCALENDAR");
  return linhas.join("\r\n");
}

export function baixarIcs(e: EventoIcs) {
  const blob = new Blob([textoIcs(e)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "evento"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
