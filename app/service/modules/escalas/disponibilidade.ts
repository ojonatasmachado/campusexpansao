/* Contrato de people.availability: chaves semanais legadas e ausências por data.
   Compartilhado pela Agenda e pelas regras de escala. Datas são dias civis. */
import { isCivilDate, parseISODate, somaDias } from "../../lib/date";
import { sourceText, type Text } from "../../lib/internacional/mensagens";

export type PeriodoAusencia = "dia" | "manha" | "tarde" | "noite";
export type Ausencia = { chave: string; data: string; periodo: PeriodoAusencia; timeId: string | null };
export const PERIODOS_AUSENCIA = [
  { v: "dia", l: "Dia inteiro" }, { v: "manha", l: "Manhã" },
  { v: "tarde", l: "Tarde" }, { v: "noite", l: "Noite" },
] as const;

/** Opções de período na tela; o valor gravado não muda. */
export function periodosAusencia(t: Text = sourceText): { v: PeriodoAusencia; l: string }[] {
  return [{ v: "dia", l: t("Dia inteiro") }, { v: "manha", l: t("Manhã") }, { v: "tarde", l: t("Tarde") }, { v: "noite", l: t("Noite") }];
}

export function periodoDaHora(hora: string | null | undefined): Exclude<PeriodoAusencia, "dia"> | null {
  const partes = hora?.match(/^(\d{1,2})[:h]([0-5]\d)(?::[0-5]\d)?$/);
  if (!partes || +partes[1] > 23 || +partes[2] > 59) return null;
  const h = +partes[1];
  return h < 12 ? "manha" : h < 18 ? "tarde" : "noite";
}

export function chavesAusencia(de: string, ate: string, periodo: PeriodoAusencia, timeId: string | null): string[] {
  const fim = ate || de;
  if (!isCivilDate(de) || !isCivilDate(fim)) throw new Error("Escolha uma data válida.");
  if (fim < de) throw new Error("A data final deve ser igual ou posterior à inicial.");
  if (fim > somaDias(de, 30)) throw new Error("Avise no máximo 31 dias por vez.");
  const chaves: string[] = [];
  for (let data = de; data <= fim; data = somaDias(data, 1)) {
    chaves.push(`d:${data}${periodo !== "dia" || timeId ? `:${periodo}` : ""}${timeId ? `:${timeId}` : ""}`);
  }
  return chaves;
}

export function ausenciasFuturas(availability: Record<string, boolean>, hoje: string): Ausencia[] {
  return Object.entries(availability).flatMap(([chave, valor]): Ausencia[] => {
    const partes = chave.match(/^d:(\d{4}-\d{2}-\d{2})(?::(dia|manha|tarde|noite))?(?::([^:]+))?$/);
    if (valor !== false || !partes || !isCivilDate(partes[1]) || partes[1] < hoje) return [];
    return [{ chave, data: partes[1], periodo: (partes[2] ?? "dia") as PeriodoAusencia, timeId: partes[3] ?? null }];
  }).sort((a, b) => a.chave.localeCompare(b.chave));
}

export function ausenciaPorExtenso(de: string, ate: string, periodo: PeriodoAusencia, time: string | null, locale = "pt-BR"): string {
  const formato = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  const data = (v: string) => formato.format(parseISODate(v)!);
  const quando = ate && ate !== de ? `de ${data(de)} até ${data(ate)}` : `em ${data(de)}`;
  const turno = { dia: "o dia inteiro", manha: "de manhã", tarde: "à tarde", noite: "à noite" }[periodo];
  return `${quando}, ${turno}, ${time ? `só no time ${time}` : "em todos os times"}`;
}
