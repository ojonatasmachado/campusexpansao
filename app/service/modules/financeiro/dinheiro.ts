/* Dinheiro do financeiro: sempre centavos em inteiro. Nada aqui usa
   ponto flutuante para guardar ou somar valor; a divisão por 100 só existe
   como texto (parte inteira e centavos separados). */

const MAX_DIGITOS = 11; // até R$ 999.999.999,99 (o banco aceita até R$ 1 bilhão)

/** 123456 → "1.234,56" (sem o "R$") */
export function centavosTexto(cents: number): string {
  const abs = Math.abs(Math.trunc(cents));
  const inteiro = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${cents < 0 ? "-" : ""}${inteiro},${frac}`;
}

/** 123456 → "R$ 1.234,56"; com sinal, "+ R$ 1.234,56" ou "− R$ 1.234,56" */
export function brl(cents: number, sinal = false): string {
  const t = `R$ ${centavosTexto(Math.abs(cents))}`;
  if (!sinal) return cents < 0 ? `− ${t}` : t;
  if (cents === 0) return t;
  return `${cents > 0 ? "+" : "−"} ${t}`;
}

/** O que a pessoa digitou no campo de valor → centavos. Só dígitos contam:
    "1.234,56" e "123456" viram 123456 (máscara de caixa: os dois últimos são centavos). */
export function digitadoParaCentavos(texto: string): number {
  const d = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITOS);
  return d ? Number(d) : 0;
}

/** Valor para o CSV, no formato que a planilha em português entende: "1234,56" */
export function centavosCsv(cents: number): string {
  return centavosTexto(cents).replace(/\./g, "");
}

export type Forma = "dinheiro" | "pix" | "cartao" | "transferencia" | "boleto";
export const FORMAS: { id: Forma; rotulo: string }[] = [
  { id: "pix", rotulo: "Pix" },
  { id: "dinheiro", rotulo: "Dinheiro" },
  { id: "cartao", rotulo: "Cartão" },
  { id: "transferencia", rotulo: "Transferência" },
  { id: "boleto", rotulo: "Boleto" },
];
export const FORMA_ROTULO: Record<string, string> = Object.fromEntries(FORMAS.map((f) => [f.id, f.rotulo]));

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-10" → "Outubro de 2026" */
export function mesTexto(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const nome = MESES[(m || 1) - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`;
}

/** "2026-10" → "outubro" (meio de frase) */
export function mesNome(mes: string): string {
  return MESES[(Number(mes.split("-")[1]) || 1) - 1];
}

/** "2026-10", +1 → "2026-11" */
export function somaMes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** primeiro e último dia do mês, ISO */
export function limitesDoMes(mes: string): { de: string; ate: string } {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, "0")}` };
}
