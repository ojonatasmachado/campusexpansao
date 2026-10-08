/* "Adicionar ao calendário": arquivo .ics gerado no navegador (v7 4.5).
   Horário de Brasília com TZID, para o calendário do aparelho converter. */

const pad = (n: number) => String(n).padStart(2, "0");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export type EventoIcs = { id: string; titulo: string; data: string; hora?: string | null; duracaoMin?: number; local?: string | null; descricao?: string | null };

export function textoIcs(e: EventoIcs): string {
  const [a, m, d] = e.data.slice(0, 10).split("-").map(Number);
  const hm = (e.hora ?? "").match(/^(\d{1,2})[:h](\d{2})/);
  const agora = new Date();
  const stamp = `${agora.getUTCFullYear()}${pad(agora.getUTCMonth() + 1)}${pad(agora.getUTCDate())}T${pad(agora.getUTCHours())}${pad(agora.getUTCMinutes())}00Z`;
  const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CE.X//Service//PT", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${e.id}@service`, `DTSTAMP:${stamp}`];
  if (hm) {
    const ini = new Date(Date.UTC(a, m - 1, d, Number(hm[1]), Number(hm[2])));
    const fim = new Date(ini.getTime() + (e.duracaoMin ?? 120) * 60000);
    const f = (t: Date) => `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
    linhas.push(`DTSTART;TZID=America/Sao_Paulo:${f(ini)}`, `DTEND;TZID=America/Sao_Paulo:${f(fim)}`);
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
