import type { Leitura } from "./dados";

/* Linguagem simples do mapa (crítica de usabilidade, 2026-10-21): nada de
   "penetração" ou "por mil". Uma fonte só para todas as telas. */

export const LEITURA: Record<Leitura, string> = { falta: "Falta igreja", forte: "Somos fortes", media: "Na média da cidade" };
export const LEITURA_BAIRRO: Record<Leitura, string> = { falta: "Bairro onde falta igreja", forte: "Bairro onde somos fortes", media: "Bairro na média da cidade" };

export function milhar(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

/* "1 pessoa da igreja a cada 5.200 moradores" */
export function umACada(x: number | null | undefined, curto = false): string {
  if (!x) return curto ? "nenhuma pessoa da igreja" : "Nenhuma pessoa da igreja aqui ainda";
  return curto ? `1 a cada ${milhar(x)}` : `1 pessoa da igreja a cada ${milhar(x)} moradores`;
}

/* "4 vezes menos que a cidade" / "2 vezes mais" */
export function frenteCidade(vezes: number | null | undefined): string {
  if (!vezes) return "";
  if (vezes >= 1.2) return `${vezes.toFixed(1).replace(".0", "").replace(".", ",")} vezes menos que a cidade`;
  if (vezes <= 0.8) return `${(1 / vezes).toFixed(1).replace(".0", "").replace(".", ",")} vezes mais que a cidade`;
  return "parecido com a cidade";
}

/* pessoas na região: -1 vem do servidor para 1 ou 2 ("menos de 3") */
export function pessoasNaRegiao(n: number): string {
  if (n < 0) return "menos de 3";
  return milhar(n);
}

export const SITUACAO: Record<string, string> = { membro: "Membro", novo: "Novo na igreja" };
