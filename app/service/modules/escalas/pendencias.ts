/* E3: uma pendência por culto futuro com falta, nos 14 dias civis a partir
   de hoje no fuso da igreja. O detalhamento continua dono do Panorama. */
import { aindaVaiAcontecer, somaDias, todayISO } from "../../lib/date";
import { FUSO_PADRAO } from "../../lib/fuso";
import { plural } from "../../lib/plural";
import { ordenarFila } from "../fila";
import { coberturaPorTime } from "./cobertura";

type Evento = Parameters<typeof coberturaPorTime>[0] & {
  eventDate: string;
  time: string;
  timeZone?: string;
};

export function pendenciasDeCobertura<T extends Evento>(
  eventos: T[],
  vagas: Parameters<typeof coberturaPorTime>[1],
  times: Parameters<typeof coberturaPorTime>[2],
  escopo?: string[] | null,
  fuso = FUSO_PADRAO,
  agora = new Date(),
) {
  const hoje = todayISO(fuso, agora);
  const fim = somaDias(hoje, 14);
  const entradas = eventos
    .filter((e) => e.eventDate >= hoje && e.eventDate < fim
      && aindaVaiAcontecer(e.eventDate, e.time, e.timeZone ?? fuso, agora))
    .sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time) || a.id.localeCompare(b.id))
    .flatMap((evento) => {
      const faltas = coberturaPorTime(evento, vagas, times, escopo)
        .filter((t) => t.preenchidas < t.total);
      if (!faltas.length) return [];
      return [{
        id: `cobertura-${evento.id}`,
        modulo: "escalas",
        tipo: "acao" as const,
        prioridade: 80,
        prazo: evento.eventDate + "T" + (evento.time || "23:59"),
        conteudo: {
          evento,
          resumo: faltas.map((t) => `${plural(t.total - t.preenchidas, "vaga")} em ${t.time}`).join(" · "),
        },
      }];
    });
  return ordenarFila(entradas);
}
