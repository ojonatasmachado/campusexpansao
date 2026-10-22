/* Opcao: uma escolha que fica marcada (segmentado, chip de filtro, opção de
   lista, dia do calendário...). BIBLIOTECA.md, linhas Segmentado e Chip.
   Põe a classe da família + " on" quando marcada e anuncia o estado
   (aria-pressed), a não ser que a tela já dê um papel próprio (radio, tab,
   option, menuitemradio) com o seu aria-checked/aria-selected.
   As famílias são as classes que já existem em service-app.css; família nova
   entra nesta lista, nunca direto na tela. */

import { Acao, type AcaoProps } from "./Acao";

/* segmento = botão dentro de <div className="seg"> (sem classe própria) */
export type OpcaoEstilo =
  | "segmento" | "seg-chip" | "opt" | "chip-toggle" | "cand-chip" | "or-chip" | "onde-chip"
  | "tp-opt" | "sel-opt" | "dp-day" | "flag-row" | "acesso-tog" | "quiz-radio" | "ce-prova"
  | "cfg-tab" | "cfg-index-item" | "icon-picker-opt" | "setup-cor" | "setup-modelo" | "m6-row"
  | "pmx-mob-role" | "bib-swatch";

export type OpcaoProps = AcaoProps & { marcada: boolean; estilo?: OpcaoEstilo };

export function Opcao({ marcada, estilo = "segmento", className, role, ...rest }: OpcaoProps) {
  const base = [estilo === "segmento" ? "" : estilo, marcada ? "on" : ""].filter(Boolean).join(" ");
  const cls = [base, className].filter(Boolean).join(" ") || undefined;
  const papelProprio = role && role !== "button";
  return <Acao aria-pressed={papelProprio || "aria-pressed" in rest ? undefined : marcada} {...rest} role={role} className={cls} />;
}
