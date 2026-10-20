/* Estado e contas da configuração guiada (v7 4.12). Guardado em
   service.churches.settings.setup = { fase, feitas, pulou, concluido }. */
import { horaAgoraBR, parseISODate, somaDias, toISODate, todayISO } from "../../lib/date";
import { plural } from "../../lib/plural";

export type SetupEstado = { fase: 1 | 2 | 3; feitas: number[]; pulou?: boolean; concluido?: boolean };
export const SETUP_INICIAL: SetupEstado = { fase: 1, feitas: [] };

/* tempo estimado de cada fase (ponto de partida do manifesto; ajustar depois de testar com 5 igrejas) */
export const FASES = [
  { n: 1, t: "Sua igreja", s: "Dados, logo e cor", min: 3 },
  { n: 2, t: "{Cultos} e times", s: "Horários e times a partir de modelos", min: 5 },
  { n: 3, t: "Pessoas", s: "Líderes convidados e a primeira escala", min: 5 },
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

export type Horario = { id: string; dia: number; hora: string; rotulo: string };
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const HORARIOS: Horario[] = [
  { dia: 0, hora: "09:00" }, { dia: 0, hora: "10:00" }, { dia: 0, hora: "18:00" }, { dia: 0, hora: "19:00" },
  { dia: 3, hora: "19:30" }, { dia: 3, hora: "20:00" }, { dia: 4, hora: "20:00" }, { dia: 6, hora: "19:30" },
].map((h) => ({ ...h, id: `${h.dia}-${h.hora}`, rotulo: `${DIAS[h.dia].charAt(0).toUpperCase()}${DIAS[h.dia].slice(1)} ${h.hora}` }));

export const nomeDoCulto = (h: Horario, termoCulto: string) => `${termoCulto} de ${DIAS[h.dia]}${h.hora < "12:00" && h.dia === 0 ? " de manhã" : ""}`;

/** Datas de hoje até `ate` (inclusive) que caem no dia da semana do horário. */
export function datasDoHorario(h: Horario, ate: string, hoje = todayISO()): string[] {
  const out: string[] = [];
  const d = parseISODate(hoje);
  if (!d || !ate) return out;
  let dia = somaDias(hoje, (h.dia - d.getDay() + 7) % 7);
  /* hoje só entra se o horário ainda não passou */
  if (dia === hoje && h.hora <= horaAgoraBR()) dia = somaDias(dia, 7);
  while (dia <= ate && out.length < 60) { out.push(dia); dia = somaDias(dia, 7); }
  return out;
}

/** 31 de dezembro do ano corrente */
export const fimDoAno = (hoje = todayISO()) => `${hoje.slice(0, 4)}-12-31`;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "Vamos criar 13 cultos de quarta até dezembro, cada um com 8 vagas." */
export function resumoDosCultos(horarios: Horario[], ate: string, vagas: number, termoCultos: string, hoje = todayISO()): string {
  if (!horarios.length) return "";
  const total = horarios.reduce((s, h) => s + datasDoHorario(h, ate, hoje).length, 0);
  const dias = [...new Set(horarios.map((h) => DIAS[h.dia]))];
  const quais = dias.length === 1 ? `de ${dias[0]}` : `de ${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]}`;
  const m = parseISODate(ate);
  const mes = m ? MESES[m.getMonth()] : "";
  return `Vamos criar ${total} ${total === 1 ? termoCultos.replace(/s$/, "") : termoCultos} ${quais} até ${mes}${vagas ? `, cada um com ${plural(vagas, "vaga")}` : ""}.`;
}

export const hojeMais = (dias: number) => toISODate(new Date(Date.now() + dias * 86400000));
