/* Linha abaixo da saudação (v7 4.19): o mais relevante de hoje, no fuso de
   Brasília. App: serve hoje, culto hoje, grupo hoje, aula hoje; sem nada, a
   data. Painel: a semana e o próximo culto com o que falta na escala. */
import { parseISODate, somaDias, todayISO, weekdayFromISO } from "./date";
import { plural } from "./plural";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "Terça, 6 de outubro" */
export function dataPorExtenso(iso: string): string {
  const d = parseISODate(iso);
  return d ? `${weekdayFromISO(iso)}, ${d.getDate()} de ${MESES[d.getMonth()]}` : "";
}

/** O dia da semana escrito pela igreja ("Quarta-feira", "qua") cai em `iso`? */
export function mesmoDiaDaSemana(textoDia: string | null | undefined, iso: string): boolean {
  const t = semAcento(textoDia ?? "").trim();
  return t.length >= 3 && semAcento(weekdayFromISO(iso)).startsWith(t.slice(0, 3));
}

export type ContextoMembro = {
  serve?: { hora?: string | null; chegar?: string | null } | null;
  culto?: { nome: string; hora?: string | null } | null;
  grupo?: { nome: string; hora?: string | null } | null;
  aula?: { nome: string; hora?: string | null } | null;
};

export function linhaDoMembro(c: ContextoMembro, hoje = todayISO()): string {
  const as = (h?: string | null) => (h ? ` às ${h}` : "");
  if (c.serve) return `Você serve hoje${as(c.serve.hora)}${c.serve.chegar ? ` · chegar ${c.serve.chegar}` : ""}`;
  if (c.culto) return `Hoje: ${c.culto.nome}${as(c.culto.hora)}`;
  if (c.grupo) return `Hoje: ${c.grupo.nome}${as(c.grupo.hora)}`;
  if (c.aula) return `Hoje: aula ${c.aula.nome}${as(c.aula.hora)}`;
  return dataPorExtenso(hoje);
}

/** "Semana de 5 a 11 de outubro" (segunda a domingo); "de 28 de setembro a 4 de outubro" quando vira o mês. */
export function semanaDe(hoje = todayISO()): string {
  const d = parseISODate(hoje);
  if (!d) return "";
  const seg = somaDias(hoje, -((d.getDay() + 6) % 7));
  const dom = somaDias(seg, 6);
  const a = parseISODate(seg)!, b = parseISODate(dom)!;
  return a.getMonth() === b.getMonth()
    ? `Semana de ${a.getDate()} a ${b.getDate()} de ${MESES[b.getMonth()]}`
    : `Semana de ${a.getDate()} de ${MESES[a.getMonth()]} a ${b.getDate()} de ${MESES[b.getMonth()]}`;
}

/** "hoje", "amanhã", "em 2 dias" */
export function quandoSera(iso: string, hoje = todayISO()): string {
  const a = parseISODate(hoje), b = parseISODate(iso);
  if (!a || !b) return "";
  const n = Math.round((b.getTime() - a.getTime()) / 86400000);
  return n <= 0 ? "hoje" : n === 1 ? "amanhã" : `em ${plural(n, "dia")}`;
}

/** "Culto de quarta em 2 dias · faltam 6 vagas" */
export function linhaDoPainel(proximo: { nome: string; data: string; faltam: number } | null, hoje = todayISO()): string | null {
  if (!proximo) return null;
  return `${proximo.nome} ${quandoSera(proximo.data, hoje)} · ${proximo.faltam ? `faltam ${plural(proximo.faltam, "vaga")}` : "escala completa"}`;
}
