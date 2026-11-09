/* Linguagem simples do mapa (crítica de usabilidade, 2026-10-21): nada de
   "penetração" ou "por mil". Uma fonte só para todas as telas. O mapa descreve,
   nunca conclui (mapa/PLANO.md §10): nada de "falta igreja" ou "somos fortes". */

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

/* Presença da igreja em 5 tons (mapa/PLANO.md §10): "1 a cada X moradores".
   Cortes de X do tom mais claro ao mais escuro: tom 1 é mais de 2.000, tom 5 é
   100 ou menos (as pontas da legenda da prancha P1). Sem ninguém da igreja, o mais claro. */
export const CORTES_PRESENCA = [2000, 1000, 400, 100] as const;
export function tomPresenca(x: number | null | undefined): 1 | 2 | 3 | 4 | 5 {
  if (!x) return 1;
  const i = CORTES_PRESENCA.findIndex((c) => x > c);
  return (i === -1 ? 5 : i + 1) as 1 | 2 | 3 | 4 | 5;
}

export const SITUACAO: Record<string, string> = { membro: "Membro", novo: "Novo na igreja" };
