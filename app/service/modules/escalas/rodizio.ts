/* Rodízio da escala (v7 4.14): quem serviu menos vezes no mês e há mais
   tempo vem primeiro. Só fatos (datas e contagem de vezes), sem percentual
   nem pontuação sobre a pessoa (lei 10). */
import { parseISODate, todayISO } from "../../lib/date";
import { sourceText, type Text } from "../../lib/internacional/mensagens";

type Vaga = { event_id: string; person_id: string; status: string };
type Ev = { id: string; eventDate: string };

/** Última data (até hoje) em que cada pessoa esteve confirmada numa escala. */
export function ultimaVezQueServiu(roster: Vaga[], events: Ev[], hoje = todayISO()): Record<string, string> {
  const dia = new Map(events.map((e) => [e.id, e.eventDate]));
  const out: Record<string, string> = {};
  for (const r of roster) {
    if (r.status !== "ok") continue;
    const d = dia.get(r.event_id);
    if (!d || d > hoje) continue;
    if (!out[r.person_id] || d > out[r.person_id]) out[r.person_id] = d;
  }
  return out;
}

/** "serviu há 12 dias · 2 vezes no mês"; "ainda não serviu · 0 vezes no mês". */
export function fraseRodizio(ultima: string | undefined, vezesNoMes: number, hoje = todayISO(), t: Text = sourceText): string {
  let quando = t("ainda não serviu");
  const d = parseISODate(ultima);
  const h = parseISODate(hoje);
  if (d && h) {
    const dias = Math.round((h.getTime() - d.getTime()) / 86400000);
    quando = dias <= 0 ? t("serviu hoje") : dias === 1 ? t("serviu ontem") : dias < 60 ? t("serviu há {dias} dias", { dias: String(dias) }) : t("serviu há {count, plural, =1 {# mês} other {# meses}}", { count: Math.floor(dias / 30) });
  }
  return t("{quando} · {count, plural, =1 {# vez} other {# vezes}} no mês", { quando, count: vezesNoMes });
}

/** Ordem do rodízio: menos vezes no mês, depois quem serviu há mais tempo (nunca serviu primeiro). */
export function compararRodizio(a: { vezes: number; ultima?: string }, b: { vezes: number; ultima?: string }): number {
  if (a.vezes !== b.vezes) return a.vezes - b.vezes;
  /* datas ISO: comparação direta (localeCompare é lento e não muda a ordem) */
  const ua = a.ultima ?? "", ub = b.ultima ?? "";
  return ua < ub ? -1 : ua > ub ? 1 : 0;
}
