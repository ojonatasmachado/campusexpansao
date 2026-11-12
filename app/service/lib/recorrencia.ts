/* O10: datas de um culto ou evento que se repete. Contas puras, sem fuso: as datas são
 * civis (AAAA-MM-DD) e o horário fica no próprio evento. Testado em
 * scripts/check-service-recorrencia.ts. */
import { isCivilDate, parseISODate, somaDias, toISODate } from "./date";
import { plural } from "./plural";

export type Repeticao = "semanal" | "quinzenal" | "mensal";
export const REPETICOES: { id: Repeticao | "nao"; rotulo: string }[] = [
  { id: "nao", rotulo: "Não se repete" },
  { id: "semanal", rotulo: "Toda semana" },
  { id: "quinzenal", rotulo: "A cada 15 dias" },
  { id: "mensal", rotulo: "Todo mês" },
];
/** Teto de encontros criados de uma vez (o mesmo do assistente). */
export const TETO_SERIE = 60;

export const ehRepeticao = (v: unknown): v is Repeticao => v === "semanal" || v === "quinzenal" || v === "mensal";

/** Mesmo dia do mês, `meses` depois; se o dia não existe (31 em abril), o último dia do mês. */
export function somaMeses(data: string, meses: number): string {
  const d = parseISODate(data);
  if (!d) return data;
  const dia = d.getDate();
  const alvo = new Date(d.getFullYear(), d.getMonth() + meses, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimo));
  return toISODate(alvo);
}

/** Todas as datas da série, de `inicio` (incluso) até `ate` (incluso), no máximo TETO_SERIE.
 * No mensal cada data sai do dia de `inicio` (31/01 → 28/02 → 31/03), sem escorregar. */
export function datasDaSerie(inicio: string, regra: Repeticao, ate: string): string[] {
  if (!isCivilDate(inicio) || !isCivilDate(ate) || ate < inicio) return isCivilDate(inicio) ? [inicio] : [];
  const out: string[] = [];
  for (let i = 0; out.length < TETO_SERIE; i++) {
    const data = regra === "mensal" ? somaMeses(inicio, i) : somaDias(inicio, i * (regra === "semanal" ? 7 : 14));
    if (data > ate) break;
    out.push(data);
  }
  return out;
}

/** Diferença em dias entre duas datas civis (b - a). */
export function diasEntre(a: string, b: string): number {
  const da = parseISODate(a), db = parseISODate(b);
  if (!da || !db) return 0;
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000);
}

/** Meses inteiros entre duas datas civis, pelo calendário (31/01 → 28/02 = 1). */
export function mesesEntre(a: string, b: string): number {
  const [aa, am] = a.split("-").map(Number), [ba, bm] = b.split("-").map(Number);
  return (ba - aa) * 12 + (bm - am);
}

function corpoDaSerie(datas: string[], regra: Repeticao, termoEncontros: string): string {
  const rotulo = REPETICOES.find((r) => r.id === regra)?.rotulo.toLowerCase() ?? "";
  const [a, m, d] = datas[datas.length - 1].split("-");
  const fim = `${d}/${m}${a !== datas[0].slice(0, 4) ? `/${a}` : ""}`;
  const teto = datas.length >= TETO_SERIE ? ` (o máximo de uma vez é ${TETO_SERIE})` : "";
  const singular = termoEncontros.replace(/ões$/, "ão").replace(/s$/, "");
  return `${plural(datas.length, singular, termoEncontros)}, ${rotulo}, até ${fim}${teto}`;
}

/** Antes de salvar: "Vai criar 9 encontros, toda semana, até 14/01." */
export function resumoDaSerie(datas: string[], regra: Repeticao, termoEncontros = "encontros"): string {
  return datas.length ? `Vai criar ${corpoDaSerie(datas, regra, termoEncontros)}.` : "";
}

/** Depois de salvar, sem verbo para não errar a concordância do termo da igreja
 * ("reuniões"): "Na agenda: 9 encontros, toda semana, até 14/01." */
export function feitoDaSerie(datas: string[], regra: Repeticao, termoEncontros = "encontros"): string {
  return datas.length ? `Na agenda: ${corpoDaSerie(datas, regra, termoEncontros)}.` : "";
}
