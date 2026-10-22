/* Selo e Etiqueta do Service (BIBLIOTECA.md, pranchas 1 e 6).
   Selo diz o estado, em uma ou duas palavras; não decora. Etiqueta marca um
   papel ou grupo (Louvor, Líder de GC). Por cima das classes que já existem:
   painel .chip + .chip-ok/-wait/-no/-neutral/-open/-draft/-solid, app .m6-st e
   etiqueta .tag. O ícone do estado vem do CSS (cor nunca é o único sinal). */

import type { HTMLAttributes } from "react";

export type SeloTom = "ok" | "pendente" | "cuidado" | "neutro" | "aberto" | "rascunho" | "destaque";
/* lista = painel; toque = app do membro */
export type SeloTamanho = "lista" | "toque";

const PAINEL: Record<SeloTom, string> = {
  ok: "chip-ok", pendente: "chip-wait", cuidado: "chip-no", neutro: "chip-neutral",
  aberto: "chip-open", rascunho: "chip-draft", destaque: "chip-solid",
};
const MEMBRO: Record<SeloTom, string> = {
  ok: "ok", pendente: "warn", cuidado: "danger", neutro: "neutral",
  aberto: "neutral", rascunho: "neutral", destaque: "ok",
};

export function seloClasse({ tom = "neutro", tamanho = "lista" }: { tom?: SeloTom; tamanho?: SeloTamanho }) {
  return tamanho === "toque" ? `m6-st ${MEMBRO[tom]}` : `chip ${PAINEL[tom]}`;
}

/* dados antigos que guardam a classe ("chip-ok") viram tom */
const DA_CLASSE: Record<string, SeloTom> = {
  ...Object.fromEntries(Object.entries(PAINEL).map(([tom, cls]) => [cls, tom as SeloTom])),
  ok: "ok", warn: "pendente", danger: "cuidado", neutral: "neutro",
};
export function tomDaClasse(cls: string | undefined | null, padrao: SeloTom = "neutro"): SeloTom {
  return (cls && DA_CLASSE[cls.trim()]) || padrao;
}

export type SeloProps = HTMLAttributes<HTMLSpanElement> & { tom?: SeloTom; tamanho?: SeloTamanho };

export function Selo({ tom, tamanho, className, ...rest }: SeloProps) {
  const cls = seloClasse({ tom, tamanho });
  return <span {...rest} className={className ? `${cls} ${className}` : cls} />;
}

export function etiquetaClasse({ destaque }: { destaque?: boolean } = {}) {
  return destaque ? "tag lead" : "tag";
}

export function Etiqueta({ destaque, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { destaque?: boolean }) {
  const cls = etiquetaClasse({ destaque });
  return <span {...rest} className={className ? `${cls} ${className}` : cls} />;
}
