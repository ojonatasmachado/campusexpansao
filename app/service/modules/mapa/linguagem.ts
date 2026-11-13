/* Linguagem simples do mapa (crítica de usabilidade, 2026-10-21): nada de
   "penetração" ou "por mil". Uma fonte só para todas as telas. O mapa descreve,
   nunca conclui (mapa/PLANO.md §10): nada de "falta igreja" ou "somos fortes".
   O CSV chama sem tradutor (pt-BR); a tela passa o tradutor. */
import { sourceText, type Text } from "../../lib/internacional/mensagens";

export function milhar(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

/* "1 pessoa da igreja a cada 5.200 moradores" */
export function umACada(x: number | null | undefined, curto = false, t: Text = sourceText): string {
  if (!x) return curto ? t("nenhuma pessoa da igreja") : t("Nenhuma pessoa da igreja aqui ainda");
  return curto ? t("1 a cada {n}", { n: milhar(x) }) : t("1 pessoa da igreja a cada {n} moradores", { n: milhar(x) });
}

/* "4 vezes menos que a cidade" / "2 vezes mais" */
export function frenteCidade(vezes: number | null | undefined, t: Text = sourceText): string {
  if (!vezes) return "";
  if (vezes >= 1.2) return t("{n} vezes menos que a cidade", { n: vezes.toFixed(1).replace(".0", "").replace(".", ",") });
  if (vezes <= 0.8) return t("{n} vezes mais que a cidade", { n: (1 / vezes).toFixed(1).replace(".0", "").replace(".", ",") });
  return t("parecido com a cidade");
}

/* pessoas na região: -1 vem do servidor para 1 ou 2 ("menos de 3") */
export function pessoasNaRegiao(n: number, t: Text = sourceText): string {
  if (n < 0) return t("menos de 3");
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
/** Situação na tela; o CSV segue com SITUACAO. */
export function situacaoNaTela(situacao: string, t: Text = sourceText): string {
  if (situacao === "membro") return t("Membro");
  if (situacao === "novo") return t("Novo na igreja");
  return situacao;
}
