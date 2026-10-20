/* Boletim da semana: junta avisos no ar, agenda e escala num texto para o
   WhatsApp (negrito com *asteriscos*, que o WhatsApp entende). Função pura,
   sem banco: o painel passa o que já carregou. Semana de segunda a domingo. */

import { parseISODate, toISODate } from "../../lib/date";
import { noAr, urgentesPrimeiro, type MuralAviso } from "./estado";
import type { EventView, MinistryView, PersonView, RosterAssignmentView } from "../../ServiceExactApp";

export type Semana = { inicio: string; fim: string };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** A semana (segunda a domingo) que contém o dia. */
export function semanaDe(iso: string): Semana {
  const d = parseISODate(iso) ?? new Date();
  const seg = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const dom = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
  return { inicio: toISODate(seg), fim: toISODate(dom) };
}

/** "19 a 25 de outubro", "27 de outubro a 2 de novembro", "29 de dezembro de 2025 a 4 de janeiro de 2026" */
export function rotuloSemana({ inicio, fim }: Semana): string {
  const a = parseISODate(inicio)!;
  const b = parseISODate(fim)!;
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} de ${MESES[a.getMonth()]} de ${a.getFullYear()} a ${b.getDate()} de ${MESES[b.getMonth()]} de ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} de ${MESES[a.getMonth()]} a ${b.getDate()} de ${MESES[b.getMonth()]}`;
  return `${a.getDate()} a ${b.getDate()} de ${MESES[b.getMonth()]}`;
}

/** "Dom 25/10" */
export function diaCurto(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return "";
  return `${DIA_CURTO[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const hora = (t?: string | null) => (t ?? "").slice(0, 5);
const naSemana = (iso: string | null | undefined, s: Semana) => !!iso && iso.slice(0, 10) >= s.inicio && iso.slice(0, 10) <= s.fim;

/** Avisos para a igreja toda que estão no ar na semana: publicados até o fim
    dela e nos 7 dias antes do início, ou em destaque durante a semana. */
export function avisosDaSemana(avisos: MuralAviso[], s: Semana): MuralAviso[] {
  const desde = toISODate(new Date(parseISODate(s.inicio)!.getTime() - 7 * 86400000));
  return urgentesPrimeiro(avisos.filter((a) => {
    if (!noAr(a)) return false;
    if ((a.audience ?? "todos").trim().toLowerCase() !== "todos") return false;
    const dia = (a.created_at ?? "").slice(0, 10);
    const recente = dia >= desde && dia <= s.fim;
    const emDestaque = !!a.highlight_until && a.highlight_until.slice(0, 10) >= s.inicio && dia <= s.fim;
    return recente || emDestaque;
  }));
}

export function agendaDaSemana(eventos: EventView[], s: Semana): EventView[] {
  return eventos
    .filter((e) => naSemana(e.eventDate, s))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || hora(a.time).localeCompare(hora(b.time)));
}

export type EscalaDoEvento = { evento: EventView; times: Array<{ time: string; pessoas: string[] }> };

/** Quem está escalado (confirmado ou aguardando; quem recusou fica fora), por time. */
export function escalaDaSemana(agenda: EventView[], roster: RosterAssignmentView[], ministries: MinistryView[], people: PersonView[]): EscalaDoEvento[] {
  const posicao = new Map(ministries.flatMap((m) => m.positions.map((p) => [p.id, m.name] as const)));
  const nome = new Map(people.map((p) => [p.id, p.name]));
  return agenda.map((evento) => {
    const porTime = new Map<string, Set<string>>();
    for (const r of roster) {
      if (r.event_id !== evento.id || r.status === "no") continue;
      const time = posicao.get(r.position_id);
      const pessoa = nome.get(r.person_id);
      if (!time || !pessoa) continue;
      porTime.set(time, (porTime.get(time) ?? new Set()).add(pessoa));
    }
    const times = [...porTime.entries()]
      .map(([time, ps]) => ({ time, pessoas: [...ps].sort((a, b) => a.localeCompare(b, "pt-BR")) }))
      .sort((a, b) => a.time.localeCompare(b.time, "pt-BR"));
    return { evento, times };
  }).filter((e) => e.times.length > 0);
}

export type Incluir = { avisos: boolean; agenda: boolean; escala: boolean };

export function montarBoletim({ igreja, semana, avisos, agenda, escala, incluir }: {
  igreja: string; semana: Semana; avisos: MuralAviso[]; agenda: EventView[]; escala: EscalaDoEvento[]; incluir: Incluir;
}): string {
  const partes: string[] = [`*${igreja ? `${igreja} · ` : ""}Semana de ${rotuloSemana(semana)}*`];
  if (incluir.agenda && agenda.length) {
    partes.push(["*Agenda*", ...agenda.map((e) => [diaCurto(e.eventDate), hora(e.time), e.name, e.location].filter(Boolean).join(" · "))].join("\n"));
  }
  if (incluir.avisos && avisos.length) {
    partes.push(`*Avisos*\n${avisos.map((a) => [`${a.urgent ? "*Urgente:* " : ""}${a.title.trim()}`, a.body?.trim()].filter(Boolean).join("\n")).join("\n\n")}`);
  }
  if (incluir.escala && escala.length) {
    partes.push(`*Escala*\n${escala.map(({ evento, times }) => [`${diaCurto(evento.eventDate)} · ${evento.name}`, ...times.map((t) => `${t.time}: ${t.pessoas.join(", ")}`)].join("\n")).join("\n\n")}`);
  }
  return partes.join("\n\n");
}
