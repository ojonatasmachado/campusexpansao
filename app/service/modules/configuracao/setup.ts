/* Estado e contas da configuração guiada (v7 4.12). Guardado em
   service.churches.settings.setup = { fase, feitas, pulou, concluido }. */
import { plural } from "../../lib/plural";
import type { RascunhoEncontro } from "./ativacao";

export type SetupEstado = { fase: 1 | 2 | 3; feitas: number[]; pulou?: boolean; concluido?: boolean; primeiroEventoId?: string; rascunho?: RascunhoEncontro };
export const SETUP_INICIAL: SetupEstado = { fase: 1, feitas: [] };

/** A configuração guiada ocupa o lugar do tour, inclusive após criar time e encontro. */
export function ativacaoSubstituiTour(e: Partial<SetupEstado> | undefined, semTimes: boolean, semEventos: boolean): boolean {
  return !!(e?.primeiroEventoId || e?.rascunho || (!e?.concluido && (semTimes || semEventos || (e?.fase ?? 1) > 1 || (e?.feitas?.length ?? 0) > 0)));
}

/* tempo estimado de cada fase (ponto de partida do manifesto; ajustar depois de testar com 5 igrejas) */
export const FASES = [
  { n: 1, t: "Sua igreja", s: "Dados, logo e cor", min: 3 },
  { n: 2, t: "Primeiro encontro", s: "Nome, data, horário e local", min: 3 },
  { n: 3, t: "Pessoas", s: "Acesso ao app e próximos responsáveis", min: 3 },
] as const;

export function minutosQueFaltam(e: SetupEstado): number {
  return FASES.filter((f) => !e.feitas.includes(f.n)).reduce((s, f) => s + f.min, 0);
}

/** "Sua igreja: fase 2 de 3 · cerca de 10 minutos" */
export function linhaDoSetup(e: SetupEstado): string {
  return `Sua igreja: fase ${e.fase} de 3 · cerca de ${plural(minutosQueFaltam(e), "minuto")}`;
}

export type ModeloTime = { id: string; nome: string; icone: string; funcoes: { nome: string; vagas: number }[] };
export const MODELOS_TIMES: ModeloTime[] = [
  { id: "louvor", nome: "Louvor", icone: "louvor", funcoes: [{ nome: "Vocal", vagas: 2 }, { nome: "Violão ou guitarra", vagas: 1 }, { nome: "Teclado", vagas: 1 }, { nome: "Baixo", vagas: 1 }, { nome: "Bateria", vagas: 1 }] },
  { id: "recepcao", nome: "Recepção", icone: "recepcao", funcoes: [{ nome: "Porta", vagas: 2 }, { nome: "Boas-vindas", vagas: 1 }] },
  { id: "kids", nome: "Kids", icone: "kids", funcoes: [{ nome: "Professor", vagas: 2 }, { nome: "Auxiliar", vagas: 1 }] },
  { id: "midia", nome: "Mídia", icone: "midia", funcoes: [{ nome: "Projeção", vagas: 1 }, { nome: "Som", vagas: 1 }, { nome: "Transmissão", vagas: 1 }] },
];
export const vagasDoModelo = (m: ModeloTime) => m.funcoes.reduce((s, f) => s + f.vagas, 0);
