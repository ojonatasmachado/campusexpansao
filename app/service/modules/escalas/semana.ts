import { coberturaPorTime, vagasFaltando } from "./cobertura";
import { aindaVaiAcontecer, parseISODate, somaDias, todayISO } from "../../lib/date";

export function limitesDaSemana(hoje = todayISO()): { inicio: string; fim: string } {
  const dia = parseISODate(hoje)?.getDay() ?? 1;
  const inicio = somaDias(hoje, -((dia + 6) % 7));
  return { inicio, fim: somaDias(inicio, 6) };
}
export function resumoDaSemana(
  eventos: Array<{ id: string; eventDate: string }>,
  vagas: Array<{ event_id: string; position_id: string; status: string }>,
  funcoes: Array<{ id: string; ministry_id: string }>,
  escopo?: string[] | null,
  hoje = todayISO(),
) {
  const { inicio, fim } = limitesDaSemana(hoje);
  const eventosIds = new Set(eventos.filter((e) => e.eventDate >= inicio && e.eventDate <= fim).map((e) => e.id));
  const funcoesIds = new Set(funcoes.filter((f) => !escopo || escopo.includes(f.ministry_id)).map((f) => f.id));
  const daSemana = vagas.filter((v) => eventosIds.has(v.event_id) && funcoesIds.has(v.position_id));
  return { inicio, fim, total: daSemana.length, confirmadas: daSemana.filter((v) => v.status === "ok").length, taxa: daSemana.length ? Math.round(100 * daSemana.filter((v) => v.status === "ok").length / daSemana.length) : null };
}

type EventoComData = Parameters<typeof coberturaPorTime>[0] & { eventDate: string; time: string };
export function programacaoFuturaDaSemana<T extends EventoComData>(eventos: T[], hoje = todayISO()): T[] {
  const { inicio, fim } = limitesDaSemana(hoje);
  return eventos.filter((e) => e.eventDate >= inicio && e.eventDate <= fim && aindaVaiAcontecer(e.eventDate, e.time));
}
export function vagasDaSemana(eventos: EventoComData[], vagas: Parameters<typeof coberturaPorTime>[1], times: Parameters<typeof coberturaPorTime>[2], escopo?: string[] | null): number {
  return programacaoFuturaDaSemana(eventos).reduce((s, e) => s + vagasFaltando(coberturaPorTime(e, vagas, times, escopo)), 0);
}
